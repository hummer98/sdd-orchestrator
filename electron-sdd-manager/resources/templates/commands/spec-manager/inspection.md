---
description: Comprehensive inspection of implementation against specifications
allowed-tools: Read, Task
argument-hint: <feature-name> [--fix | --autofix]
---

# Spec Inspection (spec-manager)

## Parse Arguments
- Feature name: `$0` (required)
- Options: `$1` (optional: `--fix` or `--autofix`)

## Validate Spec Files Exist

Before invoking Subagent, verify that all required spec files exist:

1. Check if `.kiro/specs/$0/` directory exists
2. Check if the following files exist:
   - `.kiro/specs/$0/spec.json`
   - `.kiro/specs/$0/requirements.md`
   - `.kiro/specs/$0/design.md`
   - `.kiro/specs/$0/tasks.md`

**If any file is missing**:
- Display error message: "Spec files not found for feature '$0'. Required: spec.json, requirements.md, design.md, tasks.md"
- Suggest: "Complete previous phases: `/spec-manager:requirements`, `/spec-manager:design`, `/spec-manager:tasks`"
- Stop execution

## Invoke Subagent

Delegate inspection to spec-inspection-agent:

Use the Task tool to invoke the Subagent with file path patterns:

```
Task(
  subagent_type="spec-inspection-agent",
  description="Comprehensive inspection of implementation against specifications",
  prompt="""
Feature: {$0}
Spec directory: .kiro/specs/{$0}/
Options: {$1 or none}

File patterns to read:
- .kiro/specs/{$0}/*.{json,md}
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
- Logging compliance (see steering/logging.md)
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
- For `--fix`: Review added tasks in tasks.md, then run `/spec-manager:impl {feature}` to fix issues
- For `--autofix`: Fixes are being applied automatically (max 3 cycles)
- Without options: Manually address issues and re-run `/spec-manager:inspection {feature}`

**Report Generated**:
- Inspection report saved to `.kiro/specs/{feature}/inspection-{n}.md`
- Review report for detailed findings and recommendations

**Note**: Run `/spec-manager:inspection` after implementation to ensure spec alignment and quality.
