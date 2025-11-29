---
description: Execute spec tasks using TDD methodology
allowed-tools: Read, Write, Edit, Glob, Bash
argument-hint: <feature-name> [task-numbers]
---

# Implementation Task Executor (spec-manager)

<background_information>
- **Mission**: Execute implementation tasks using Test-Driven Development methodology
- **Success Criteria**:
  - All tests written before implementation code
  - Code passes all tests with no regressions
  - Tasks marked as completed in tasks.md
  - Implementation aligns with design and requirements
- **Note**: This is a pure implementation command. Status management is handled by Electron.
</background_information>

<instructions>
## Parse Arguments
- Feature name: `$1`
- Task numbers: `$2` (optional)
  - Format: "1.1" (single task) or "1,2,3" (multiple tasks)
  - If not provided: Execute all pending tasks

## Validate
Check that tasks have been generated:
- Verify `.kiro/specs/$1/` exists
- Verify `.kiro/specs/$1/tasks.md` exists

If validation fails, inform user to complete tasks generation first.

## Core Task
Execute implementation tasks using TDD.

## Execution Steps

### Step 0: Expand File Patterns
Use Glob tool to expand file patterns and read all files:
- Glob `.kiro/steering/*.md` to get all steering files
- Glob `.kiro/specs/$1/*.{json,md}` to get all spec files
- Read each file from glob results

### Step 1: Load Context
**Read all necessary context**:
- `.kiro/specs/$1/spec.json` - for language setting
- `.kiro/specs/$1/requirements.md` - for requirements
- `.kiro/specs/$1/design.md` - for design specifications
- `.kiro/specs/$1/tasks.md` - for task details
- `.kiro/steering/*.md` - for project context

### Step 2: Select Tasks
**Determine which tasks to execute**:
- If task numbers provided: Execute specified task numbers (e.g., "1.1" or "1,2,3")
- Otherwise: Execute all pending tasks (unchecked `- [ ]` in tasks.md)

### Step 3: Execute with TDD
For each selected task, follow Kent Beck's TDD cycle:

1. **RED - Write Failing Test**:
   - Write test for the next small piece of functionality
   - Test should fail (code doesn't exist yet)
   - Use descriptive test names

2. **GREEN - Write Minimal Code**:
   - Implement simplest solution to make test pass
   - Focus only on making THIS test pass
   - Avoid over-engineering

3. **REFACTOR - Clean Up**:
   - Improve code structure and readability
   - Remove duplication
   - Apply design patterns where appropriate
   - Ensure all tests still pass after refactoring

4. **VERIFY - Validate Quality**:
   - All tests pass (new and existing)
   - No regressions in existing functionality
   - Code coverage maintained or improved

5. **MARK COMPLETE**:
   - Update checkbox from `- [ ]` to `- [x]` in tasks.md

## Important Constraints
- DO NOT read or update spec.json
- DO NOT include next step guidance or approval workflow messages
- TDD is mandatory: tests MUST be written before implementation code
- Implement only what the specific task requires
- All new code must have tests
- Existing tests must continue to pass
- Implementation must follow design.md specifications
</instructions>

## Tool Guidance
- Use **Glob** to find all steering and spec files
- Use **Read** to load context files
- Use **Write** to create new files
- Use **Edit** to modify existing files
- Use **Bash** for running tests and commands

## Output Description
Provide output in the language specified in `spec.json`:

1. **Tasks Executed**: Task numbers and test results
2. **Status**: Completed tasks marked in tasks.md, remaining tasks count

**Format Requirements**:
- Use Markdown headings
- Keep output concise (under 150 words)
- Use clear, professional language per `spec.json.language`

## Safety & Fallback
- **Missing Tasks**: If tasks.md doesn't exist, report error
- **Test Failures**: Stop implementation and fix failing tests before continuing
- **Design Mismatch**: If implementation conflicts with design, report discrepancy
