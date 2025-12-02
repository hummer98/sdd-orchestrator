---
description: Investigate root cause of a reported bug
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: [bug-name]
---

# Bug Analysis

<background_information>
- **Mission**: Investigate and document the root cause of a reported bug
- **Success Criteria**:
  - Identify the root cause of the bug
  - Document affected files and components
  - Propose solution options
- **Workflow Position**: Report → **Analyze** → Fix → Verify
</background_information>

<instructions>
## Core Task
Analyze the bug specified by $ARGUMENTS (or auto-detect from context) and document findings.

## Parse Arguments
- Bug name: `$1` (optional - if not provided, detect from conversation context or list available bugs)

## Auto-Detection Logic
**If no arguments** (`$1` empty):
- Check conversation history for recent `/kiro:bug-create` commands
- OR list available bugs in `.kiro/bugs/` and ask user to select

## Execution Steps
1. **Validate**: Verify `.kiro/bugs/$1/report.md` exists
2. **Read Report**: Understand the bug description and context
3. **Investigate**:
   - Search codebase for related files using Grep/Glob
   - Read relevant source files
   - Identify root cause location
4. **Document Analysis**:
   - Read `.kiro/settings/templates/bugs/analysis.md`
   - Replace `{{BUG_NAME}}` placeholder
   - Fill in analysis findings:
     - Root cause with file/line references
     - Impact assessment
     - Proposed solution(s)
   - Write `analysis.md` to bug directory

## Analysis Guidelines
- Focus on identifying the **root cause**, not just symptoms
- Document the **minimum viable fix** - avoid over-engineering
- Consider **side effects** of potential fixes
- Reference specific **file paths and line numbers**
</instructions>

## Tool Guidance
- Use **Glob** to find related files by pattern
- Use **Grep** to search for relevant code patterns
- Use **Read** to examine source files and templates
- Use **Write** to create analysis.md

## Output Description
Provide output with the following structure:

1. **Bug Summary**: One-line description
2. **Root Cause**: Clear explanation with file:line references
3. **Impact**: Severity and scope assessment
4. **Proposed Fix**: Recommended solution approach
5. **Next Step**: Command block showing `/kiro:bug-fix`

**Format Requirements**:
- Use Markdown headings
- Include code snippets where relevant
- Keep analysis focused and actionable
- Reference specific file locations

## Safety & Fallback
- **Bug Not Found**: If bug directory doesn't exist, list available bugs or suggest `/kiro:bug-create`
- **Report Missing**: If report.md doesn't exist, indicate incomplete bug record
- **Cannot Reproduce**: Document reproduction attempts and ask for more information
