---
description: Comprehensive inspection of implementation against specifications
allowed-tools: Read, Task
argument-hint: <feature-name> [--fix | --autofix]
---

# Spec Inspection

## Parse Arguments
- Feature name: `$1` (required)
- Options: `$2` (optional: `--fix` or `--autofix`)

## Validate Spec Files Exist

Before invoking Subagent, verify that all required spec files exist:

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

## Invoke Subagent

Delegate inspection to spec-inspection-agent:

Use the Task tool to invoke the Subagent with file path patterns:

```
Task(
  subagent_type="spec-inspection-agent",
  description="Comprehensive inspection of implementation against specifications",
  prompt="""
Feature: {$1}
Spec directory: .kiro/specs/{$1}/
Options: {$2 or none}

File patterns to read:
- .kiro/specs/{$1}/*.{json,md}
- .kiro/steering/*.md
- CLAUDE.md

Inspection scope:
- Requirements compliance
- Design alignment
- Task completion
- Steering consistency
- Design Principles adherence
- Dead code detection
- Integration verification
"""
)
```

## Display Result

Show Subagent summary to user, then provide next step guidance:

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

**Note**: Run `/kiro:spec-inspection` after implementation to ensure spec alignment and quality.
