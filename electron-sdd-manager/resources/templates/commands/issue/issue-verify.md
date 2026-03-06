---
description: Verify the fix for a GitHub Issue
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: <issue-number>
---

# Issue Verification

<background_information>
- **Mission**: Verify that the fix resolves the Issue without regressions
- **Success Criteria**:
  - The original issue is no longer reproducible
  - All tests pass
  - No side effects observed
  - Verification results are posted as an Issue comment
- **Workflow Position**: Triage -> Analyze -> Fix -> **Verify**
</background_information>

<environment_context>
**Current Working Directory**: The directory where this command is executed
**CRITICAL**: All file operations MUST be performed relative to the current working directory.

- Source files: All paths are relative to current directory
- Script location: `.kiro/scripts/gh-issue.sh`
</environment_context>

<instructions>
## Core Task
Verify the fix for the GitHub Issue specified by `$0` (issue number).

## Parse Arguments
- Issue number: `$0` (required)

## Execution Steps

### 1. Load Issue Context
Fetch the Issue body and all comments (including analysis and fix summaries) using `gh-issue.sh`:

```bash
bash .kiro/scripts/gh-issue.sh read $0
```

Read the output carefully. Review the fix summary in the comments to understand what was changed.

### 2. Verify Fix
- Attempt to reproduce the original issue using information from the Issue description
- Confirm the issue is no longer reproducible
- Review the code changes for correctness

### 3. Run Tests
Execute the full test suite (or relevant subset):
- Check for regressions
- Verify new tests pass if any were added

### 4. Check Side Effects
- Verify related functionality still works
- Review any areas that might be affected by the changes

### 5. Post Verification Results to Issue
Post the verification results as an Issue comment:

```bash
bash .kiro/scripts/gh-issue.sh comment $0 "## Verification Results

**Status**: PASSED / FAILED

**Reproduction Test**: <result>
**Test Suite**: <pass/fail summary>
**Side Effects**: None observed

---
_Verified by SDD Orchestrator_"
```

## Verification Checklist
- [ ] Original issue no longer reproducible
- [ ] All existing tests pass
- [ ] No new test failures
- [ ] Related features still work correctly
- [ ] No unintended side effects
</instructions>

## Tool Guidance
- Use **Bash** to run `gh-issue.sh` for Issue context and comment posting
- Use **Bash** to run tests
- Use **Read** to review source files and changes
- Use **Grep** to check for any remaining issues

## Output Description
Provide output with the following structure:

1. **Verification Status**: PASSED / FAILED / PARTIAL
2. **Reproduction Test**: Results of trying to reproduce the issue
3. **Test Results**: Summary of test suite execution
4. **Side Effects**: Any observed side effects
5. **Conclusion**:
   - If PASSED: Ready for PR creation or commit
   - If FAILED: What needs to be addressed, suggest `/kiro:issue-fix $0` again

## Safety & Fallback
- **No Fix Found**: If no fix comment exists on the Issue, suggest running `/kiro:issue-fix $0` first
- **Test Failures**: Document specific failures and recommend re-analysis
- **Auth Error**: Suggest checking `GITHUB_TOKEN` or running `gh auth login`
