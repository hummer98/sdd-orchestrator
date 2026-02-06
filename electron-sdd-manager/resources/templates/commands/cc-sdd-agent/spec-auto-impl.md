---
name: kiro:spec-auto-impl
description: Execute all pending spec tasks autonomously with parallel batch execution
allowed-tools: Read, Edit, Task, Glob
argument-hint: <feature-name>
---

# Autonomous Parallel Implementation Executor

<environment_context>
**Current Working Directory**: The directory where this command is executed
**CRITICAL**: All file operations MUST be performed relative to the current working directory.

- Spec directory: `.kiro/specs/$1/` (relative to current directory)
- Source files: All paths are relative to current directory
- DO NOT navigate to parent directories or git root
- DO NOT use absolute paths from git root

**Worktree Awareness**:
If you are in a worktree (check `spec.json` for `worktree` field):
- All spec files are in `$PWD/.kiro/specs/`
- All source files are in the worktree, not the main repository
- Stay within the worktree boundaries
</environment_context>

## Overview

This command executes all pending implementation tasks for a spec autonomously, using parallel batch execution. It parses tasks.md, groups tasks by (P) markers, and executes each group in parallel using the Task tool to invoke `spec-auto-impl-worker-agent` subagents.

**Key Design Decisions**:
- **DD-002**: Parent agent (this command) is responsible for updating tasks.md and spec.json. Subagents do NOT update these files directly to avoid file conflicts.
- **DD-003**: Maximum concurrency is capped at `MAX_CONCURRENCY = 3`. Parallel batches with more tasks are split into chunks.

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
- [ ] 3.1 (P) Test module A   -> Group 2: [3.1, 3.2, 3.3] (parallel, chunked)
- [ ] 3.2 (P) Test module B
- [ ] 3.3 (P) Test module C
```

## Concurrency Control

**MAX_CONCURRENCY = 3**

When a parallel group has more than 3 tasks, split into chunks:

```
Group with 7 (P) tasks: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7]
  -> Chunk 1: [1.1, 1.2, 1.3] (parallel, wait for all)
  -> Chunk 2: [1.4, 1.5, 1.6] (parallel, wait for all)
  -> Chunk 3: [1.7]           (single)
```

Each chunk is treated as a mini-batch: invoke, wait, collect, then proceed to next chunk.

## Batch Execution Loop

Execute batches until all tasks complete or a failure occurs:

```
for each group (batch) in order:
    1. Get pending (unchecked) tasks in this group
    2. If no pending tasks, skip to next group
    3. Split tasks into chunks of MAX_CONCURRENCY (3)
    4. For each chunk:
       a. Invoke Task tool for each task in chunk (parallel)
       b. Wait for ALL Task tool calls in chunk to complete
       c. Collect completion reports from subagents
    5. Update tasks.md with all completed tasks in this group (bulk update)
    6. If any task in this group failed:
       - Stop execution (do not proceed to next group)
       - Report status to user
    7. Continue to next group
```

## Invoke Subagents (Parallel)

For each pending task in the current chunk, invoke `spec-auto-impl-worker-agent`:

```
Task(
  subagent_type="spec-auto-impl-worker-agent",
  description="Impl task {task.id}: {task.short_description}",
  prompt="""
Feature: $1
Spec directory: .kiro/specs/$1/
Target task: {task.id}

File patterns to read:
- .kiro/specs/$1/*.{json,md}
- .kiro/steering/*.md

TDD Mode: strict (test-first)

Execute ONLY task {task.id}. Return TASK_REPORT at the end.
"""
)
```

**Note**: The `spec-auto-impl-worker-agent` is specifically designed for this workflow — it will NOT update tasks.md or spec.json, and returns a structured TASK_REPORT.

## Collect Results and Update tasks.md

After all subagents in a group complete:

1. Parse each subagent's TASK_REPORT:
   - Extract task_id and status
   - Record files_modified and any errors

2. Update tasks.md for completed tasks:
   - Change `- [ ] {task.id}` to `- [x] {task.id}` for completed tasks
   - Keep `- [ ]` for failed tasks

3. If any task failed:
   - Mark successful tasks as completed in tasks.md first
   - Stop execution (do not proceed to next group)
   - Report which tasks succeeded and which failed
   - Suggest user to investigate and retry

## Error Handling

### Strategy: Complete-then-Stop

Error handling follows a two-level strategy:

**Within a group (batch/chunk)**: Always wait for ALL subagents to finish, even if some fail. This avoids wasting work from subagents that are already running.

**Between groups**: If any task in the previous group failed, STOP. Do not proceed to the next group, since later groups may depend on earlier work.

### Partial Completion

If some tasks in a group fail:
1. Mark successful tasks as completed in tasks.md
2. Keep failed tasks unchecked
3. Stop execution after this group
4. Report detailed status to user
5. User can re-run command to continue from failed tasks

### Subagent Timeout

If a subagent doesn't return a TASK_REPORT:
- Treat as failed task (status: failed, error: "No TASK_REPORT returned")
- Other subagents in the same chunk are NOT affected
- Follow the same complete-then-stop strategy

## Update spec.json on Completion

After ALL tasks are completed successfully (no failures):

1. Read `.kiro/specs/$1/spec.json`
2. Update:
   - `status`: `"implementation_complete"`
   - `updated_at`: current UTC timestamp (use `date -u +"%Y-%m-%dT%H:%M:%SZ"`)
3. Write updated spec.json

If execution stopped due to failures, do NOT update spec.json status.

## Output Format

### During Execution

```
[Group 1/3] Executing 2 parallel tasks: 1.1, 1.2
  - Task 1.1: Completed
  - Task 1.2: Completed
[Group 1/3] Complete. Updating tasks.md...

[Group 2/3] Executing 1 sequential task: 2.1
  - Task 2.1: Completed
[Group 2/3] Complete. Updating tasks.md...

[Group 3/3] Executing 3 parallel tasks (chunk 1/2): 3.1, 3.2, 3.3
  - Task 3.1: Completed
  - Task 3.2: Failed - Test compilation error
  - Task 3.3: Completed
[Group 3/3] Partial completion. Updating tasks.md...
Stopping: 1 failed task(s) in group 3.
```

### Final Summary

```
## Execution Summary

- Total groups: 3
- Groups completed: 2 (full), 1 (partial)
- Completed tasks: 5 (1.1, 1.2, 2.1, 3.1, 3.3)
- Failed tasks: 1 (3.2)
- Remaining tasks: 0 unchecked

### Failed Task Details
- Task 3.2: Test compilation error in myTest.test.ts

### Next Steps
1. Investigate failed task 3.2
2. Fix the issue manually or with `/kiro:spec-impl $1 3.2`
3. Re-run `/kiro:spec-auto-impl $1` to continue remaining tasks
```

## Usage Examples

**Execute all pending tasks with parallel batching**:
```
/kiro:spec-auto-impl my-feature
```

**Before Starting**:
- Ensure tasks are approved in spec.json
- Clear conversation history for clean context
