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
If NOGO judgment AND --fix option:
1. Generate fix tasks for each Critical/Major issue
2. Append to tasks.md with new task numbers
3. Report: "Fix tasks added to tasks.md. Run `/kiro:spec-impl {feature}` to apply fixes."

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
