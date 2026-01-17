---
description: Comprehensive inspection of implementation against specifications
allowed-tools: Read, Bash, Grep, Glob, Write
argument-hint: <feature-name> [--fix | --autofix]
---

# Spec Inspection (Direct Execution)

## Parse Arguments
- Feature name: `$1` (required)
- Options: `$2` (optional: `--fix` or `--autofix`)

## Validate Spec Files Exist

Before executing inspection, verify that all required spec files exist:

1. Check if `.kiro/specs/$1/` directory exists
2. Check if the following files exist:
   - `.kiro/specs/$1/spec.json`
   - `.kiro/specs/$1/requirements.md`
   - `.kiro/specs/$1/design.md`
   - `.kiro/specs/$1/tasks.md`

**If any file is missing**:
- Display error message: "Spec files not found for feature '$1'. Required: spec.json, requirements.md, design.md, tasks.md"
- Suggest: "Complete previous phases: `/kiro:spec-requirements`, `/kiro:spec-design`, `/kiro:spec-tasks`"
- Stop execution

## Branch by Option

**If `--fix` option is specified**: Jump to [--fix Mode](#--fix-mode) section directly (skip inspection execution)

**Otherwise**: Continue with Load Context and execute inspection

## Load Context

**Read all necessary context**:
- `.kiro/specs/{feature}/spec.json` - metadata and approvals
- `.kiro/specs/{feature}/requirements.md` - EARS requirements
- `.kiro/specs/{feature}/design.md` - architecture and design
- `.kiro/specs/{feature}/tasks.md` - implementation tasks
- **Entire `.kiro/steering/` directory** - project memory (use Glob to find all files)
- `CLAUDE.md` - Design Principles

## Execute Inspection Categories

### Requirements Compliance
For each requirement in requirements.md:
- Use Grep to search implementation for evidence of coverage
- Verify functional requirements are implemented
- Verify non-functional requirements are addressed
- Flag uncovered requirements as Critical

### Design Alignment
For each component/interface in design.md:
- Verify component exists in implementation
- Verify interfaces match specification
- Verify data flow matches design
- Flag deviations as Major

### Task Completion
For each task in tasks.md:
- Verify checkbox is `[x]` (completed)
- Verify implementation exists for task deliverables
- Verify tests exist and pass (if applicable)
- Flag incomplete tasks as Critical

### Steering Consistency
Compare implementation against steering documents:
- Verify product.md guidelines followed
- Verify tech.md stack and patterns used
- Verify structure.md file organization followed
- Flag inconsistencies as Major

### Design Principles
Check adherence to CLAUDE.md Design Principles:
- **DRY**: Detect code duplication
- **SSOT**: Verify single source of truth for data/state
- **KISS**: Flag over-engineered solutions
- **YAGNI**: Flag unused/premature features
- Flag violations as Minor to Major depending on scope

### Dead Code Detection
For new components/services created:
- Use Grep to verify they are imported and used
- Check that components are rendered/called
- Verify exports are consumed
- Flag orphaned code as Major

### Integration Verification
Verify all components work together:
- Check entry points connect to new code
- Verify data flows end-to-end
- Run integration tests if available
- Flag integration gaps as Critical

### Logging Compliance
Check adherence to steering/logging.md guidelines:
- **Required (Critical/Major violations)**:
  - Log level support (debug/info/warning/error)
  - Log format (timestamp, level, content)
  - Log location mention in steering/debugging.md or CLAUDE.md
  - Excessive log avoidance (no verbose logging in loops)
- **Recommended (Minor/Info violations)**:
  - Dev/prod log separation
  - Log level specification method (CLI/env/config)
  - Investigation variables in error logs

## Render GO/NOGO Judgment

**Severity Levels**:
- **Critical**: Blocks release, must fix immediately
- **Major**: Should fix before release
- **Minor**: Can fix in future iteration
- **Info**: Suggestions for improvement

**Judgment Logic**:
- **GO**: No Critical issues AND no more than 2 Major issues
- **NOGO**: Any Critical issue OR more than 2 Major issues

## Generate Report

Create inspection report at `.kiro/specs/{feature}/inspection-{n}.md`:

```markdown
# Inspection Report - {feature}

## Summary
- **Date**: {timestamp}
- **Judgment**: GO / NOGO
- **Inspector**: spec-inspection (cc-sdd)

## Findings by Category

### Requirements Compliance
| Requirement | Summary | Status | Severity | Details |
|-------------|---------|--------|----------|---------|
| REQ-001 | ... | PASS/FAIL | Critical/Major/Minor | ... |

### Design Alignment
...

### Task Completion
...

### Steering Consistency
...

### Design Principles
...

### Dead Code Detection
...

### Integration Verification
...

### Logging Compliance
...

## Statistics
- Total checks: N
- Passed: N (%)
- Critical: N
- Major: N
- Minor: N
- Info: N

## Recommended Actions
1. [Priority order list of fixes]

## Next Steps
- For GO: Ready for deployment
- For NOGO: Address Critical/Major issues and re-run inspection
```

## Handle Options

### --fix Mode

**Purpose**: Generate fix tasks based on an **existing** inspection report (does NOT run inspection)

**Execution**:

#### Step 1: Find and Validate Inspection Report
1. Find the latest inspection report: `.kiro/specs/{feature}/inspection-{n}.md` (highest n)
2. If no inspection report exists:
   - Display error: "No inspection report found. Run `/kiro:spec-inspection {feature}` first."
   - Stop execution
3. Read the inspection report and extract Critical/Major issues
4. If the report shows GO judgment:
   - Display: "Latest inspection passed (GO). No fixes needed."
   - Stop execution

#### Step 2: Determine Task Numbering
Read tasks.md and determine the next task group number:
1. Parse all existing task IDs using pattern `/^- \[.\] (\d+)\.(\d+)/gm`
2. Extract the integer part (N) from each N.M format task ID
3. Find the maximum N value among all existing tasks
4. New fix tasks will use (max_N + 1) as their group number
5. If no tasks found, start from group number 1

**Example**: If existing tasks are 1.1, 1.2, 2.1, 2.2, 3.1, the next fix task group is 4 (max=3, so N+1=4)

#### Step 3: Determine Section Insertion Position
1. Check if `## Appendix` section exists in tasks.md
2. Check if `## Inspection Fixes` section already exists
3. Determine insertion position:
   - If `## Inspection Fixes` exists: append to it
   - If `## Appendix` exists but no `## Inspection Fixes`: insert `## Inspection Fixes` before `## Appendix`
   - Otherwise: append after `---` separator at end of file

#### Step 4: Generate Fix Tasks with Sequential Numbering
Generate fix tasks for each Critical/Major issue:
1. Create `## Inspection Fixes` section header (if new)
2. Create `### Round {n} (YYYY-MM-DD)` subsection with current date in ISO 8601 format
3. For each fix task:
   - Use sequential task ID: `{group}.{sequence}` (e.g., 7.1, 7.2, 7.3)
   - Add related information: `- 関連: Task X.Y, Requirement Z.Z`
   - Include clear description of the fix

**Fix Task Format**:
```markdown
## Inspection Fixes

### Round 1 (2026-01-17)

- [ ] 7.1 Fix Task 1 の説明
  - 関連: Task 2.3, Requirement 1.2
  - 修正内容の詳細

- [ ] 7.2 Fix Task 2 の説明
  - 関連: Task 4.1, Requirement 3.1
```

**IMPORTANT**: Do NOT use `FIX-N` format. Always use sequential `N.M` format (e.g., 7.1, 7.2).

#### Step 5: Update spec.json
After adding fix tasks, update spec.json to add `fixedAt` timestamp to the latest round:
1. Read spec.json
2. Find the latest round in `inspection.rounds`
3. Add `fixedAt: "{current ISO 8601 timestamp}"` to that round
4. Write spec.json

**Verification**: After writing, confirm spec.json contains `fixedAt` in the latest round.

#### Step 6: Report Completion
Report: "Fix tasks added to tasks.md. Run `/kiro:spec-impl {feature}` to apply fixes."

### --autofix Mode
If NOGO judgment AND --autofix option:
1. Apply automatic fixes for resolvable issues (formatting, simple code changes)
2. Re-run inspection (max 3 cycles)
3. If still NOGO after 3 cycles, stop and report remaining issues
4. Report progress after each cycle

## Update spec.json

**Always update spec.json** after inspection (both GO and NOGO) using the InspectionState structure:

```json
{
  "inspection": {
    "rounds": [
      {
        "number": 1,
        "result": "go",
        "inspectedAt": "2025-12-25T12:00:00Z"
      }
    ]
  }
}
```

**Field definitions**:
- `rounds`: array of inspection round results:
  - `number`: 1-indexed round number
  - `result`: `"go"` | `"nogo"` - inspection result
  - `inspectedAt`: ISO 8601 timestamp of inspection completion
  - `fixedAt`: ISO 8601 timestamp (optional) - set by spec-impl after --inspection-fix

**Update Logic**:
1. Read existing `inspection.rounds` from spec.json (or initialize as empty array if missing)
2. Append new round to `rounds` array with:
   - `number`: current length of rounds + 1
   - `result`: `"go"` or `"nogo"` based on judgment
   - `inspectedAt`: current ISO 8601 timestamp

## Display Result

Show inspection summary to user, then provide next step guidance:

### Next Steps Guidance

**If GO Judgment**:
- Implementation validated and ready
- Proceed to deployment or next feature
- spec.json has been updated with inspection status

**If NOGO Judgment**:
- Address issues listed in priority order (Critical > Major > Minor)
- For `--fix`: Review added tasks in tasks.md, then run `/kiro:spec-impl {feature}` to fix issues
- For `--autofix`: Fixes are being applied automatically (max 3 cycles)
- Without options: Manually address issues and re-run `/kiro:spec-inspection {feature}`

**Report Generated**:
- Inspection report saved to `.kiro/specs/{feature}/inspection-{n}.md`
- Review report for detailed findings and recommendations

## Important Constraints
- **Semantic verification**: Use LLM understanding, not just static analysis
- **Comprehensive coverage**: Check ALL categories, not just some
- **Actionable findings**: Every issue must have a clear fix path
- **Non-destructive**: --fix only adds tasks, --autofix only modifies clearly safe changes
- **Traceability**: Link findings back to specific spec sections

think hard
