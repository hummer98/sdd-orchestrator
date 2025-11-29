---
description: Generate comprehensive requirements for a specification
allowed-tools: Read, Write, Glob
argument-hint: <feature-name>
---

# Requirements Generation (spec-manager)

<background_information>
- **Mission**: Generate EARS-format requirements document based on project description and steering context
- **Success Criteria**:
  - Generate comprehensive requirements.md in EARS format
  - Cover all functional and non-functional requirements from project description
- **Note**: This is a pure generation command. Status management is handled by Electron.
</background_information>

<instructions>
## Parse Arguments
- Feature name: `$1`

## Validate
Check that spec has been initialized:
- Verify `.kiro/specs/$1/` exists
- Verify `.kiro/specs/$1/spec.json` exists
- Verify `.kiro/specs/$1/requirements.md` exists (contains project description)

If validation fails, inform user that spec needs to be initialized first.

## Core Task
Generate comprehensive EARS-format requirements based on the project description in requirements.md.

## Execution Steps

### Step 0: Expand File Patterns
Use Glob tool to expand file patterns and read all files:
- Glob `.kiro/steering/*.md` to get all steering files
- Read each file from glob results

### Step 1: Load Context
**Read all necessary context**:
- `.kiro/specs/$1/spec.json` - for language setting
- `.kiro/specs/$1/requirements.md` - for project description
- `.kiro/steering/*.md` - for project context
- `.kiro/settings/rules/ears-format.md` - for EARS format rules
- `.kiro/settings/templates/specs/requirements.md` - for template structure

### Step 2: Generate Requirements
- Extract project description from current requirements.md
- Apply EARS format rules to generate acceptance criteria
- Create numbered requirements with clear objectives
- Ensure each requirement is testable and verifiable

### Step 3: Write Output
- Write generated requirements to `.kiro/specs/$1/requirements.md`
- Preserve project description section
- Add Introduction section
- Add structured Requirements sections

## Important Constraints
- DO NOT read or update spec.json (except for reading language setting)
- DO NOT include next step guidance or approval workflow messages
- Focus purely on requirements generation
- Follow EARS format strictly
</instructions>

## Tool Guidance
- Use **Glob** to find all steering files
- Use **Read** to load templates, rules, and context files
- Use **Write** to save generated requirements.md

## Output Description
Provide output in the language specified in `spec.json`:

1. **Requirements Summary**: Number of requirements generated
2. **Coverage**: Brief description of areas covered

**Format Requirements**:
- Use Markdown headings
- Keep output concise (under 100 words)
- Use clear, professional language per `spec.json.language`

## Safety & Fallback
- **Missing Spec**: If spec directory doesn't exist, report error
- **Missing Project Description**: If requirements.md has no description, report error
- **Template Missing**: Report specific missing file path
