---
description: Comprehensive inspection of implementation against specifications
allowed-tools: Bash, Glob, Grep, Read, LS, Write
argument-hint: <feature-name> [--fix | --autofix]
---

# Spec Inspection

<background_information>
- **Mission**: Perform comprehensive inspection validating implementation against requirements, design, tasks, steering, and design principles
- **Success Criteria**:
  - All requirements traceable to implementation
  - Design alignment verified
  - All tasks marked complete and verified
  - Steering consistency confirmed
  - Design Principles (DRY, SSOT, KISS, YAGNI) adherence checked
  - Dead code detected and reported
  - Integration verified
  - GO/NOGO judgment rendered with actionable findings
</background_information>

<instructions>
## Parse Arguments
- Feature name: `$1` (required)
- Options: `$2` (optional: `--fix` or `--autofix`)

## Core Task
Execute comprehensive inspection across all categories with GO/NOGO judgment.

## Execution Steps

### 1. Load Context

**Read all necessary context**:
- `.kiro/specs/$1/spec.json` - metadata and approvals
- `.kiro/specs/$1/requirements.md` - EARS requirements
- `.kiro/specs/$1/design.md` - architecture and design
- `.kiro/specs/$1/tasks.md` - implementation tasks
- **Entire `.kiro/steering/` directory** - project memory
- `CLAUDE.md` - Design Principles

### 2. Execute Inspection Categories

#### 2.1 Requirements Compliance
For each requirement in requirements.md:
- Use Grep to search implementation for evidence of coverage
- Verify functional requirements are implemented
- Verify non-functional requirements are addressed
- Flag uncovered requirements as Critical

#### 2.2 Design Alignment
For each component/interface in design.md:
- Verify component exists in implementation
- Verify interfaces match specification
- Verify data flow matches design
- Flag deviations as Major

#### 2.3 Task Completion
For each task in tasks.md:
- Verify checkbox is `[x]` (completed)
- Verify implementation exists for task deliverables
- Verify tests exist and pass (if applicable)
- Flag incomplete tasks as Critical

#### 2.4 Steering Consistency
Compare implementation against steering documents:
- Verify product.md guidelines followed
- Verify tech.md stack and patterns used
- Verify structure.md file organization followed
- Flag inconsistencies as Major

#### 2.5 Design Principles
Check adherence to CLAUDE.md Design Principles:
- **DRY**: Detect code duplication
- **SSOT**: Verify single source of truth for data/state
- **KISS**: Flag over-engineered solutions
- **YAGNI**: Flag unused/premature features
- Flag violations as Minor to Major depending on scope

#### 2.6 Dead Code Detection
For new components/services created:
- Use Grep to verify they are imported and used
- Check that components are rendered/called
- Verify exports are consumed
- Flag orphaned code as Major

#### 2.7 Integration Verification
Verify all components work together:
- Check entry points connect to new code
- Verify data flows end-to-end
- Run integration tests if available
- Flag integration gaps as Critical

### 3. Render GO/NOGO Judgment

**Severity Levels**:
- **Critical**: Blocks release, must fix immediately
- **Major**: Should fix before release
- **Minor**: Can fix in future iteration
- **Info**: Suggestions for improvement

**Judgment Logic**:
- **GO**: No Critical issues AND no more than 2 Major issues
- **NOGO**: Any Critical issue OR more than 2 Major issues

### 4. Generate Report

Create inspection report at `.kiro/specs/$1/inspection-{n}.md` with:
- Summary (Date, Judgment, Inspector)
- Findings by Category (tables with Requirement/Status/Severity/Details)
- Statistics (Total checks, Passed %, Critical/Major/Minor/Info counts)
- Recommended Actions (priority order)
- Next Steps

### 5. Handle Options

#### --fix Mode
If NOGO judgment AND --fix option:
1. Generate fix tasks for each Critical/Major issue
2. Append to tasks.md with new task numbers
3. Report: "Fix tasks added to tasks.md. Run `/kiro:spec-impl {feature}` to apply fixes."

#### --autofix Mode
If NOGO judgment AND --autofix option:
1. Apply automatic fixes for resolvable issues
2. Re-run inspection (max 3 cycles)
3. If still NOGO after 3 cycles, stop and report remaining issues

### 6. Update spec.json

If GO judgment, update spec.json with inspection status:
```json
{
  "inspection": {
    "status": "passed",
    "date": "YYYY-MM-DD",
    "report": "inspection-{n}.md"
  }
}
```
</instructions>

## Important Constraints
- **Semantic verification**: Use LLM understanding, not just static analysis
- **Comprehensive coverage**: Check ALL categories, not just some
- **Actionable findings**: Every issue must have a clear fix path
- **Non-destructive**: --fix only adds tasks, --autofix only modifies clearly safe changes

## Tool Guidance
- **Read context first**: Load all specs and steering before inspection
- **Grep for traceability**: Search codebase for requirement/design evidence
- **Glob for structure**: Find relevant implementation files
- **Bash for tests**: Run test commands to verify functionality
- **Write for reports**: Save inspection report and update spec.json

## Output Description

Provide output in the language specified in spec.json with:

1. **Judgment**: GO or NOGO with brief rationale
2. **Summary**: Key findings by category (counts by severity)
3. **Critical Issues**: List of blocking issues (if any)
4. **Report Location**: Path to full inspection report
5. **Next Steps**: Clear guidance based on judgment and options

## Safety & Fallback

### Error Scenarios
- **Missing Spec Files**: Stop with error, suggest completing previous phases
- **No Implementation Found**: Report as Critical finding
- **Test Framework Unknown**: Skip test validation with warning
- **--autofix Loop**: Stop after 3 cycles regardless of outcome

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

**Note**: Run `/kiro:spec-inspection` after implementation to ensure spec alignment and quality.
