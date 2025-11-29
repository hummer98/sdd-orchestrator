---
description: Generate implementation tasks for a specification
allowed-tools: Read, Write, Glob
argument-hint: <feature-name> [--sequential]
---

# Implementation Tasks Generator (spec-manager)

<background_information>
- **Mission**: Generate implementation tasks based on design document
- **Success Criteria**:
  - Generate comprehensive tasks.md with checkboxes
  - Map all requirements to implementation tasks
  - Identify parallel-capable tasks (unless --sequential)
- **Note**: This is a pure generation command. Status management is handled by Electron.
</background_information>

<instructions>
## Parse Arguments
- Feature name: `$1`
- Sequential mode flag: `$2` (optional, "--sequential")

## Validate
Check that design has been completed:
- Verify `.kiro/specs/$1/` exists
- Verify `.kiro/specs/$1/design.md` exists

If validation fails, inform user to complete design phase first.

## Core Task
Generate implementation tasks from design document.

## Execution Steps

### Step 0: Expand File Patterns
Use Glob tool to expand file patterns and read all files:
- Glob `.kiro/steering/*.md` to get all steering files
- Glob `.kiro/specs/$1/*.{json,md}` to get all spec files
- Read each file from glob results

### Step 1: Load Context
**Read all necessary context**:
- `.kiro/specs/$1/spec.json` - for language setting
- `.kiro/specs/$1/requirements.md` - for requirements mapping
- `.kiro/specs/$1/design.md` - for component and interface details
- `.kiro/steering/*.md` - for project context
- `.kiro/settings/rules/tasks-generation.md` - for task generation rules
- `.kiro/settings/rules/tasks-parallel-analysis.md` - for parallel analysis (skip if --sequential)
- `.kiro/settings/templates/specs/tasks.md` - for template structure

### Step 2: Generate Tasks
- Break down design components into implementation tasks
- Apply task generation rules
- Create 2-level hierarchy (major tasks + sub-tasks)
- Map each task to requirement IDs
- Mark parallel-capable tasks with (P) (unless --sequential)
- Ensure all requirements are covered

### Step 3: Write Output
- Write generated tasks to `.kiro/specs/$1/tasks.md`
- Use checkbox format `- [ ]` for all tasks
- Include requirements mapping in detail bullets

## Important Constraints
- DO NOT read or update spec.json (except for reading language setting)
- DO NOT include next step guidance or approval workflow messages
- Focus purely on task generation
- Maximum 2 levels of task hierarchy
- All requirements must be covered
</instructions>

## Tool Guidance
- Use **Glob** to find all steering and spec files
- Use **Read** to load templates, rules, and context files
- Use **Write** to save generated tasks.md

## Output Description
Provide output in the language specified in `spec.json`:

1. **Tasks Summary**: Number of major tasks and sub-tasks
2. **Requirements Coverage**: Confirmation of coverage

**Format Requirements**:
- Use Markdown headings
- Keep output concise (under 100 words)
- Use clear, professional language per `spec.json.language`

## Safety & Fallback
- **Missing Design**: If design.md doesn't exist, report error
- **Template Missing**: Report specific missing file path
- **Requirements Gap**: If any requirement is not covered, report which ones
