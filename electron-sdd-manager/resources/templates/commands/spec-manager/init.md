---
description: Initialize a new specification with detailed project description
allowed-tools: Bash, Read, Write, Glob
argument-hint: <project-description>
---

# Spec Initialization (spec-manager)

<background_information>
- **Mission**: Initialize the first phase of spec-driven development by creating directory structure and metadata for a new specification
- **Success Criteria**:
  - Generate appropriate feature name from project description
  - Create unique spec structure without conflicts
  - Initialize spec.json and requirements.md (with project description only)
- **Note**: This is a lightweight command that only creates initial files. Status management is handled by Electron.
</background_information>

<instructions>
## Core Task
Generate a unique feature name from the project description ($ARGUMENTS) and initialize the specification structure.

## Execution Steps
1. **Check Uniqueness**: Verify `.kiro/specs/` for naming conflicts (append number suffix if needed)
2. **Create Directory**: `.kiro/specs/[feature-name]/`
3. **Initialize Files Using Templates**:
   - Read `.kiro/settings/templates/specs/init.json`
   - Read `.kiro/settings/templates/specs/requirements-init.md`
   - Replace placeholders:
     - `{{FEATURE_NAME}}` -> generated feature name
     - `{{TIMESTAMP}}` -> current ISO 8601 timestamp
     - `{{PROJECT_DESCRIPTION}}` -> $ARGUMENTS
   - Write `spec.json` and `requirements.md` to spec directory

## Important Constraints
- DO NOT generate requirements/design/tasks at this stage
- DO NOT include next step guidance or approval workflow messages
- Only create the initial files (spec.json, requirements.md)
- Follow stage-by-stage development principles
- Maintain strict phase separation
</instructions>

## Tool Guidance
- Use **Glob** to check existing spec directories for name uniqueness
- Use **Read** to fetch templates: `init.json` and `requirements-init.md`
- Use **Write** to create spec.json and requirements.md after placeholder replacement
- Perform validation before any file write operation

## Output Description
Provide output in the language specified in `spec.json` with the following structure:

1. **Generated Feature Name**: `feature-name` format with 1-2 sentence rationale
2. **Project Summary**: Brief summary (1 sentence)
3. **Created Files**: Bullet list with full paths

**Format Requirements**:
- Use Markdown headings (##, ###)
- Keep total output concise (under 150 words)
- Use clear, professional language per `spec.json.language`

## Safety & Fallback
- **Ambiguous Feature Name**: If feature name generation is unclear, propose 2-3 options and ask user to select
- **Template Missing**: If template files don't exist in `.kiro/settings/templates/specs/`, report error with specific missing file path
- **Directory Conflict**: If feature name already exists, append numeric suffix (e.g., `feature-name-2`) and notify user
- **Write Failure**: Report error with specific path
