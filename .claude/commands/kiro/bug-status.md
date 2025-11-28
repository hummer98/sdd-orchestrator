---
description: Show bug fix progress and workflow status
allowed-tools: Read, Glob
argument-hint: [bug-name]
---

# Bug Status

<background_information>
- **Mission**: Display the current status of bug fix workflow
- **Success Criteria**:
  - Show clear progress through workflow phases
  - Indicate next required action
  - List all tracked bugs if no specific bug specified
</background_information>

<instructions>
## Core Task
Display the status of bug fix workflow for specified bug or all bugs.

## Parse Arguments
- Bug name: `$1` (optional)

## Execution Logic

### If bug name provided (`$1` present):
1. Read `.kiro/bugs/$1/` directory contents
2. Check existence of each workflow file:
   - `report.md` → Reported
   - `analysis.md` → Analyzed
   - `fix.md` → Fixed
   - `verification.md` → Verified
3. Determine current phase and next action

### If no bug name (`$1` empty):
1. List all directories in `.kiro/bugs/`
2. For each bug, determine status based on existing files
3. Display summary table of all bugs

## Status Determination
| Files Present | Status | Next Action |
|--------------|--------|-------------|
| None | Not Started | `/kiro:bug-create` |
| report.md | Reported | `/kiro:bug-analyze` |
| report.md + analysis.md | Analyzed | `/kiro:bug-fix` |
| report.md + analysis.md + fix.md | Fixed | `/kiro:bug-verify` |
| All 4 files | Resolved | Ready for commit/close |
</instructions>

## Tool Guidance
- Use **Glob** to list bug directories and files
- Use **Read** to check file contents if needed for detailed status

## Output Description

### Single Bug Status
```
## Bug: {bug-name}

**Status**: {Reported | Analyzed | Fixed | Verified}

### Workflow Progress
- [x] Report    → report.md
- [x] Analysis  → analysis.md
- [ ] Fix       → fix.md
- [ ] Verify    → verification.md

### Next Step
`/kiro:bug-fix {bug-name}`
```

### All Bugs Summary
```
## Bug Fix Status Overview

| Bug Name | Status | Next Action |
|----------|--------|-------------|
| bug-1 | Analyzed | `/kiro:bug-fix bug-1` |
| bug-2 | Verified | Ready to close |
| bug-3 | Reported | `/kiro:bug-analyze bug-3` |

Total: 3 bugs tracked
- Resolved: 1
- In Progress: 2
```

**Format Requirements**:
- Use checkboxes for workflow progress
- Use tables for multi-bug summary
- Show clear next action command

## Safety & Fallback
- **No Bugs**: If `.kiro/bugs/` is empty or doesn't exist, inform user and suggest `/kiro:bug-create`
- **Bug Not Found**: If specified bug doesn't exist, list available bugs
