---
description: Create a new bug report with structured format
allowed-tools: Bash, Read, Write, Glob
argument-hint: <bug-name> "<description>"
---

# Bug Report Creation

<background_information>
- **Mission**: Initialize a lightweight bug tracking workflow for quick issue resolution
- **Success Criteria**:
  - Generate appropriate bug name from description
  - Create unique bug directory without conflicts
  - Provide clear path to next phase (analysis)
- **Workflow**: Report → Analyze → Fix → Verify (streamlined for quick resolution)
</background_information>

<instructions>
## Core Task
Create a new bug report from the provided bug name and description ($ARGUMENTS).

## Parse Arguments
- Bug name: First argument (e.g., `issue-name`)
- Description: Second argument in quotes (e.g., `"Description of the bug"`)

## Execution Steps
1. **Check Uniqueness**: Verify `.kiro/bugs/` for naming conflicts (append number suffix if needed)
2. **Create Directory**: `.kiro/bugs/[bug-name]/`
3. **Initialize Files Using Templates**:
   - Read `.kiro/settings/templates/bugs/report.md`
   - Replace placeholders:
     - `{{BUG_NAME}}` → bug name
     - `{{BUG_DESCRIPTION}}` → description from arguments
     - `{{TIMESTAMP}}` → current ISO 8601 timestamp
   - Write `report.md` to bug directory

## Important Constraints
- DO NOT perform analysis or fix at this stage
- Keep the process lightweight and fast
- This is NOT spec-driven development - no requirements/design/tasks phases
- Focus on quick documentation for rapid resolution
</instructions>

## Tool Guidance
- Use **Glob** to check existing bug directories for name uniqueness
- Use **Read** to fetch template: `report.md`
- Use **Write** to create report.md after placeholder replacement
- Use **Bash** to create directory if needed

## Output Description
Provide output in the language specified in steering documents with the following structure:

1. **Bug Name**: `bug-name` format
2. **Summary**: Brief summary of the reported issue (1-2 sentences)
3. **Created Files**: Bullet list with full paths
4. **Next Step**: Command block showing `/kiro:bug-analyze`
5. **Workflow Overview**: Brief reminder of the bug fix workflow

**Format Requirements**:
- Use Markdown headings (##, ###)
- Wrap commands in code blocks
- Keep total output concise (under 150 words)

## Safety & Fallback
- **Missing Arguments**: If bug name or description not provided, ask user to provide both
- **Template Missing**: If template files don't exist, report error with specific missing file path
- **Directory Conflict**: If bug name already exists, append numeric suffix and notify user
