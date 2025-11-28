---
description: Implement targeted solution for an analyzed bug
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: [bug-name]
---

# Bug Fix Implementation

<background_information>
- **Mission**: Implement a targeted fix based on the analysis
- **Success Criteria**:
  - Fix addresses the root cause identified in analysis
  - Changes are minimal and focused
  - No unnecessary refactoring or feature additions
- **Workflow Position**: Report → Analyze → **Fix** → Verify
</background_information>

<instructions>
## Core Task
Implement the bug fix based on analysis in `.kiro/bugs/$1/analysis.md`.

## Parse Arguments
- Bug name: `$1` (optional - if not provided, detect from conversation context)

## Auto-Detection Logic
**If no arguments** (`$1` empty):
- Check conversation history for recent `/kiro:bug-analyze` commands
- OR scan `.kiro/bugs/*/analysis.md` for recently modified files

## Execution Steps
1. **Validate Prerequisites**:
   - Verify `.kiro/bugs/$1/analysis.md` exists
   - Read analysis to understand the proposed solution
2. **Implement Fix**:
   - Apply the recommended fix from analysis
   - Keep changes minimal and targeted
   - Follow existing code patterns and conventions
3. **Run Tests** (if applicable):
   - Execute relevant test suite
   - Ensure no regressions
4. **Document Fix**:
   - Read `.kiro/settings/templates/bugs/fix.md`
   - Replace `{{BUG_NAME}}` placeholder
   - Document all changes made:
     - Files modified
     - Code changes (diff format)
     - Implementation notes
   - Write `fix.md` to bug directory

## Fix Guidelines
- **Minimum Viable Fix**: Only change what's necessary
- **No Scope Creep**: Don't refactor unrelated code
- **Follow Patterns**: Match existing code style
- **Test First**: If tests exist, verify they fail before fixing
</instructions>

## Tool Guidance
- Use **Read** to examine analysis and source files
- Use **Edit** to apply targeted code changes
- Use **Bash** to run tests
- Use **Write** to create fix.md documentation

## Output Description
Provide output with the following structure:

1. **Fix Summary**: One-line description of what was fixed
2. **Changes Made**: List of modified files with brief descriptions
3. **Code Changes**: Key diff snippets
4. **Test Results**: Pass/fail status if tests were run
5. **Next Step**: Command block showing `/kiro:bug-verify`

**Format Requirements**:
- Use Markdown headings
- Use diff code blocks for changes
- Keep documentation concise but complete

## Safety & Fallback
- **Analysis Missing**: If analysis.md doesn't exist, suggest running `/kiro:bug-analyze` first
- **Test Failures**: Document failures and investigate before proceeding
- **Unclear Solution**: If analysis doesn't provide clear direction, ask for clarification
