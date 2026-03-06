---
description: Implement a fix for a GitHub Issue based on analysis
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: <issue-number>
---

# Issue Fix Implementation

<background_information>
- **Mission**: Implement a targeted fix based on the Issue analysis
- **Success Criteria**:
  - Fix addresses the root cause identified in analysis
  - Changes are minimal and focused
  - Tests pass with no regressions
  - Fix summary is posted as an Issue comment
- **Workflow Position**: Triage -> Analyze -> **Fix** -> Verify
</background_information>

<environment_context>
**Current Working Directory**: The directory where this command is executed
**CRITICAL**: All file operations MUST be performed relative to the current working directory.

- Source files: All paths are relative to current directory
- Script location: `.kiro/scripts/gh-issue.sh`
</environment_context>

<instructions>
## Core Task
Implement a fix for the GitHub Issue specified by `$0` (issue number).

## Parse Arguments
- Issue number: `$0` (required)

## Execution Steps

### 1. Load Issue Context
Fetch the Issue body and all comments (including analysis summary) using `gh-issue.sh`:

```bash
bash .kiro/scripts/gh-issue.sh read $0
```

Read the output carefully. Look for the analysis summary in the comments to understand the root cause and proposed fix.

### 2. Implement Fix
Based on the analysis:
- Apply the recommended fix
- Keep changes minimal and targeted
- Follow existing code patterns and conventions
- Write tests for the fix if applicable

### 3. Run Tests
Execute relevant tests to verify the fix:
- Ensure no regressions
- Verify the fix addresses the root cause

### 4. Post Fix Summary to Issue
Post the fix results as an Issue comment:

```bash
bash .kiro/scripts/gh-issue.sh comment $0 "## Fix Summary

**Changes Made**:
- <file1>: <description>
- <file2>: <description>

**Test Results**: <pass/fail summary>

---
_Fixed by SDD Orchestrator_"
```

## Fix Guidelines
- **Minimum Viable Fix**: Only change what is necessary
- **No Scope Creep**: Do not refactor unrelated code
- **Follow Patterns**: Match existing code style
- **Test First**: If tests exist, verify they fail before fixing
</instructions>

## Tool Guidance
- Use **Bash** to run `gh-issue.sh` for Issue context and comment posting
- Use **Read** to examine source files
- Use **Edit** to apply targeted code changes
- Use **Bash** to run tests
- Use **Grep** to search for related patterns

## Output Description
Provide output with the following structure:

1. **Fix Summary**: One-line description of what was fixed
2. **Changes Made**: List of modified files with brief descriptions
3. **Test Results**: Pass/fail status
4. **Next Step**: `/kiro:issue-verify $0`

## Safety & Fallback
- **No Analysis Found**: If no analysis comment exists on the Issue, suggest running `/kiro:issue-analyze $0` first
- **Test Failures**: Document failures and investigate before proceeding
- **Auth Error**: Suggest checking `GITHUB_TOKEN` or running `gh auth login`
