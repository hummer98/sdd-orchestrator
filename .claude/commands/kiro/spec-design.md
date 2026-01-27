---
description: Create comprehensive technical design for a specification
allowed-tools: Read, Task
argument-hint: <feature-name> [-y]
---

# Technical Design Generator

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

CRITICAL - Design Document Conciseness (prevent bloat):
- PROHIBITED: Do NOT include Implementation Examples or sample code in Service Interface sections
- Interface Definition Only: Service Interface sections must contain ONLY type definitions (TypeScript interfaces, function signatures, preconditions/postconditions/invariants)
- Implementation details belong in research.md: Move detailed implementation guidance, code examples, and operational procedures to research.md
- Component Detail Levels:
  - Full Detail Block: ONLY for components introducing new architectural boundaries (e.g., new service layers, external integrations, persistence)
  - Summary Row + Brief Note: For simple presentation components, utility functions, and straightforward integrations
  - Rule of Thumb: If a component's implementation is obvious from its interface, use summary-only format
- Visual Communication: Mermaid diagrams carry structural detail; text explanations limited to 3-5 bullet points of key decisions per diagram; do NOT narrate the diagram step-by-step

CRITICAL: Generate "Design Decisions" section documenting WHY each major architectural choice was made, including alternatives considered and trade-offs.

CRITICAL: Generate "Integration & Deprecation Strategy" (結合・廃止戦略) section:
- List existing files that require modification (wiring points) to integrate new functionality
- List existing files that must be deleted (cleanup) as part of this change
- For refactoring tasks, explicitly state whether "file X will be replaced by Y" or "file Z will be created in parallel"
- If no files need modification or deletion, explicitly state "No existing files affected"

CRITICAL: Generate "Interface Changes & Impact Analysis" (インターフェース変更と影響分析) section:
- If any existing method signature or API interface is modified (e.g., adding parameters), explicitly list ALL existing call sites (Callers) that need updates.
- Explicitly state if a parameter is optional or required, and how existing callers should handle it.
- **Rule**: For every "Callee" modification, there must be corresponding "Caller" update tasks.

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