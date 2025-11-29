---
description: Create comprehensive technical design for a specification
allowed-tools: Read, Write, Glob
argument-hint: <feature-name>
---

# Technical Design Generator (spec-manager)

<background_information>
- **Mission**: Generate technical design document based on requirements and steering context
- **Success Criteria**:
  - Generate comprehensive design.md following template structure
  - Map all requirements to design components
  - Define clear interfaces and data models
- **Note**: This is a pure generation command. Status management is handled by Electron. For full discovery process (research.md, WebSearch/WebFetch), use `/kiro:spec-design` instead.
</background_information>

<instructions>
## Parse Arguments
- Feature name: `$1`

## Validate
Check that requirements have been completed:
- Verify `.kiro/specs/$1/` exists
- Verify `.kiro/specs/$1/requirements.md` exists

If validation fails, inform user to complete requirements phase first.

## Core Task
Generate comprehensive technical design based on requirements.

## Execution Steps

### Step 0: Expand File Patterns
Use Glob tool to expand file patterns and read all files:
- Glob `.kiro/steering/*.md` to get all steering files
- Glob `.kiro/specs/$1/*.{json,md}` to get all spec files
- Read each file from glob results

### Step 1: Load Context
**Read all necessary context**:
- `.kiro/specs/$1/spec.json` - for language setting
- `.kiro/specs/$1/requirements.md` - for requirements
- `.kiro/steering/*.md` - for project context and tech stack
- `.kiro/settings/templates/specs/design.md` - for template structure

### Step 2: Generate Design
- Analyze requirements for architecture patterns
- Define component boundaries and responsibilities
- Create interface contracts for each component
- Map requirements to design elements
- Define data models and flows

### Step 3: Write Output
- Write generated design to `.kiro/specs/$1/design.md`
- Follow template structure
- Include architecture diagrams (Mermaid)
- Include requirements traceability

## Important Constraints
- DO NOT read or update spec.json (except for reading language setting)
- DO NOT include next step guidance or approval workflow messages
- Focus purely on design generation
- Keep design self-contained (don't reference external docs excessively)
</instructions>

## Tool Guidance
- Use **Glob** to find all steering and spec files
- Use **Read** to load templates and context files
- Use **Write** to save generated design.md

## Output Description
Provide output in the language specified in `spec.json`:

1. **Design Summary**: Architecture pattern and component count
2. **Key Components**: List of main components defined

**Format Requirements**:
- Use Markdown headings
- Keep output concise (under 100 words)
- Use clear, professional language per `spec.json.language`

## Safety & Fallback
- **Missing Requirements**: If requirements.md doesn't exist, report error
- **Template Missing**: Report specific missing file path
- **Complex Design**: If design exceeds 1000 lines, suggest simplification
