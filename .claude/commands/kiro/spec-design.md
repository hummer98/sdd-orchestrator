---
description: Create comprehensive technical design for a specification
allowed-tools: Read, Task
argument-hint: <feature-name> [-y]
---

# Technical Design Generator

## Parse Arguments
- Feature name: `$1`
- Auto-approve flag: `$2` (optional, "-y")

## Validate
Check that requirements have been completed:
- Verify `.kiro/specs/$1/` exists
- Verify `.kiro/specs/$1/requirements.md` exists

If validation fails, inform user to complete requirements phase first.

## Invoke Subagent

Delegate design generation to spec-design-agent:

Use the Task tool to invoke the Subagent with file path patterns:

```
Task(
  subagent_type="spec-design-agent",
  description="Generate technical design and update research log",
  prompt="""
Feature: $1
Spec directory: .kiro/specs/$1/
Auto-approve: {true if $2 == "-y", else false}

File patterns to read:
- .kiro/specs/$1/*.{json,md}
- .kiro/steering/*.md
- .kiro/settings/rules/design-*.md
- .kiro/settings/templates/specs/design.md
- .kiro/settings/templates/specs/research.md

Discovery: auto-detect based on requirements
Mode: {generate or merge based on design.md existence}
Language: respect spec.json language for design.md/research.md outputs

CRITICAL: Generate "Design Decisions" section documenting WHY each major architectural choice was made, including alternatives considered and trade-offs.

CRITICAL: Generate "Integration & Deprecation Strategy" (結合・廃止戦略) section:
- List existing files that require modification (wiring points) to integrate new functionality
- List existing files that must be deleted (cleanup) as part of this change
- For refactoring tasks, explicitly state whether "file X will be replaced by Y" or "file Z will be created in parallel"
- If no files need modification or deletion, explicitly state "No existing files affected"

CRITICAL: Generate "Integration Test Strategy" section if design includes cross-boundary communication (IPC, events, store synchronization):
- **Components**: List modules involved in integration
- **Data Flow**: Describe the flow to be tested
- **Mock Boundaries**: Explicitly define where to mock vs. real implementation (e.g., "Mock IPC transport, use real Store")
- **Verification Points**: Specific state changes or events to assert
- **Robustness Strategy**: Explicitly state how to handle async timing to avoid flaky tests (e.g., "Use `waitFor` patterns instead of fixed sleeps", "Monitor state transitions")
- **Prerequisites**: Identify if any new test infrastructure or helpers are needed before writing these tests
"""
)
```

## Display Result

Show Subagent summary to user, then provide next step guidance:

### Next Phase: Task Generation

**If Design Approved**:
- Review generated design at `.kiro/specs/$1/design.md`
- **Optional**: Run `/kiro:validate-design $1` for interactive quality review
- Then `/kiro:spec-tasks $1 -y` to generate implementation tasks

**If Modifications Needed**:
- Provide feedback and re-run `/kiro:spec-design $1`
- Existing design used as reference (merge mode)

**Note**: Design approval is mandatory before proceeding to task generation.