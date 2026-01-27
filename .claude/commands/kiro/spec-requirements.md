---
description: Generate comprehensive requirements for a specification
allowed-tools: Read, Task
argument-hint: <feature-name>
---

# Requirements Generation

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

## Parse Arguments
- Feature name: `$1`

## Validate
Check that spec has been initialized:
- Verify `.kiro/specs/$1/` exists
- Verify `.kiro/specs/$1/spec.json` exists

If validation fails, inform user to run `/kiro:spec-init` first.

## Invoke Subagent

Delegate requirements generation to spec-requirements-agent:

Use the Task tool to invoke the Subagent with file path patterns:

```
Task(
  subagent_type="spec-requirements-agent",
  description="Generate EARS requirements",
  prompt="""
Feature: $1
Spec directory: .kiro/specs/$1/

File patterns to read:
- .kiro/specs/$1/spec.json
- .kiro/specs/$1/requirements.md
- .kiro/steering/*.md
- .kiro/settings/rules/ears-format.md
- .kiro/settings/templates/specs/requirements.md

Mode: generate
"""
)
```

## Display Result

Show Subagent summary to user, then provide next step guidance:

### Next Phase: Design Generation

**If Requirements Approved**:
- Review generated requirements at `.kiro/specs/$1/requirements.md`
- **Optional Gap Analysis** (for existing codebases):
  - Run `/kiro:validate-gap $1` to analyze implementation gap with current code
  - Identifies existing components, integration points, and implementation strategy
  - Recommended for brownfield projects; skip for greenfield
- Then `/kiro:spec-design $1 [-y]` to proceed to design phase

**If Modifications Needed**:
- Provide feedback and re-run `/kiro:spec-requirements $1`

**Note**: Approval is mandatory before proceeding to design phase.
