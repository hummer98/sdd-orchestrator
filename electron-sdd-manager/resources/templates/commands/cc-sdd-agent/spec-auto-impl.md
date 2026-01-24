---
name: kiro:spec-auto-impl
description: Execute all pending spec tasks autonomously with parallel batch execution
allowed-tools: Read, Edit, Task, Glob
argument-hint: <feature-name>
---

# Autonomous Parallel Implementation Executor

## Overview

This command executes all pending implementation tasks for a spec autonomously, using parallel batch execution. It parses tasks.md, groups tasks by (P) markers, and executes each group in parallel using the Task tool to invoke spec-tdd-impl-agent subagents.

**Key Design Decision (DD-002)**: Parent agent (this command) is responsible for updating tasks.md. Subagents do NOT update tasks.md directly to avoid file conflicts.

## Parse Arguments

- Feature name: `$1`

## Validate

### Check Prerequisites

1. Verify `.kiro/specs/$1/` exists
2. Verify `.kiro/specs/$1/tasks.md` exists
3. Read `.kiro/specs/$1/spec.json` and check `approvals.tasks.approved === true`

If validation fails:
- Missing spec directory: "Spec not found. Run `/kiro:spec-init` first."
- Missing tasks.md: "Tasks not generated. Run `/kiro:spec-tasks` first."
- Tasks not approved: "Tasks not approved. Approve tasks before implementation."

## Task Grouping Logic

### Parse tasks.md

1. Read `.kiro/specs/$1/tasks.md`
2. Extract all tasks with format `- [ ] N.N description`
3. Identify (P) markers indicating parallel-safe tasks
4. Group tasks:
   - Tasks with (P) marker in the same group level can run in parallel
   - Tasks without (P) marker run sequentially (group of 1)
   - Respect group boundaries (Phase N: sections)

### Example Grouping

```markdown
### Phase 1: Setup
- [ ] 1.1 (P) Create file A   -> Group 0: [1.1, 1.2] (parallel)
- [ ] 1.2 (P) Create file B

### Phase 2: Integration
- [ ] 2.1 Integrate A and B   -> Group 1: [2.1] (sequential)

### Phase 3: Testing
- [ ] 3.1 (P) Test module A   -> Group 2: [3.1, 3.2, 3.3] (parallel)
- [ ] 3.2 (P) Test module B
- [ ] 3.3 (P) Test module C
```

## Batch Execution Loop

Execute batches until all tasks complete:

```
for each group (batch) in order:
    1. Get pending (unchecked) tasks in this group
    2. If no pending tasks, skip to next group
    3. Invoke Task tool for each pending task (parallel)
    4. Wait for all Task tool calls to complete
    5. Collect completion reports from subagents
    6. Update tasks.md with completed tasks (bulk update)
    7. Continue to next group
```

## Invoke Subagents (Parallel)

For each pending task in the current batch, invoke spec-tdd-impl-agent:

**CRITICAL**: Include explicit instruction that subagent must NOT update tasks.md.

```
Task(
  subagent_type="spec-tdd-impl-agent",
  description="Execute TDD implementation for task {task.id}",
  prompt="""
Feature: $1
Spec directory: .kiro/specs/$1/
Target tasks: {task.id}

File patterns to read:
- .kiro/specs/$1/*.{json,md}
- .kiro/steering/*.md

TDD Mode: strict (test-first)

IMPORTANT CONSTRAINTS:
- Execute ONLY task {task.id}
- Do NOT update tasks.md (parent agent handles this)
- Report completion status at the end:
  - Task ID: {task.id}
  - Status: completed | failed
  - Error: (if failed) error message
"""
)
```

## Collect Results and Update tasks.md

After all subagents in a batch complete:

1. Parse each subagent's completion report:
   - Extract task ID and status
   - Record any errors

2. Update tasks.md for completed tasks:
   - Change `- [ ] {task.id}` to `- [x] {task.id}` for completed tasks
   - Keep `- [ ]` for failed tasks

3. If any task failed:
   - Stop execution
   - Report which tasks succeeded and which failed
   - Suggest user to investigate and retry

## Error Handling

### Partial Completion (GAP-T1)

If some tasks in a batch fail:
1. Mark successful tasks as completed in tasks.md
2. Keep failed tasks unchecked
3. Stop batch execution
4. Report detailed status to user
5. User can re-run command to continue from failed tasks

### Subagent Timeout

If a subagent doesn't respond:
- Treat as failed task
- Continue with other tasks in batch
- Report timeout in final summary

## Output Format

### During Execution

```
[Batch 1/3] Executing 3 parallel tasks: 1.1, 1.2, 1.3
  - Task 1.1: Completed
  - Task 1.2: Completed
  - Task 1.3: Completed
[Batch 1/3] Complete. Updating tasks.md...

[Batch 2/3] Executing 1 sequential task: 2.1
  - Task 2.1: Completed
[Batch 2/3] Complete. Updating tasks.md...

[Batch 3/3] Executing 2 parallel tasks: 3.1, 3.2
  - Task 3.1: Completed
  - Task 3.2: Failed - Test compilation error
[Batch 3/3] Partial completion. Updating tasks.md...
```

### Final Summary

```
## Execution Summary

- Total batches: 3
- Completed tasks: 5 (1.1, 1.2, 1.3, 2.1, 3.1)
- Failed tasks: 1 (3.2)
- Remaining tasks: 1

### Failed Task Details
- Task 3.2: Test compilation error in myTest.test.ts

### Next Steps
1. Investigate failed task 3.2
2. Fix the issue
3. Re-run `/kiro:spec-auto-impl $1` to continue
```

## Usage Examples

**Execute all pending tasks with parallel batching**:
```
/kiro:spec-auto-impl my-feature
```

**Before Starting**:
- Ensure tasks are approved in spec.json
- Clear conversation history for clean context
