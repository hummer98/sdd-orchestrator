---
description: Verify bug resolution and document test results
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: [bug-name]
---

# Bug Verification

<background_information>
- **Mission**: Verify that the bug fix resolves the issue without regressions
- **Success Criteria**:
  - Bug is no longer reproducible
  - All tests pass
  - No side effects observed
- **Workflow Position**: Report → Analyze → Fix → **Verify**
</background_information>

<instructions>
## Core Task
Verify the bug fix and document verification results.

## Parse Arguments
- Bug name: `$1` (optional - if not provided, detect from conversation context)

## Auto-Detection Logic
**If no arguments** (`$1` empty):
- Check conversation history for recent `/kiro:bug-fix` commands
- OR scan `.kiro/bugs/*/fix.md` for recently modified files

## Execution Steps
1. **Validate Prerequisites**:
   - Verify `.kiro/bugs/$1/fix.md` exists
   - Read the fix documentation
2. **Verify Fix**:
   - Attempt to reproduce the original bug using steps from report.md
   - Confirm bug is no longer reproducible
3. **Run Tests**:
   - Execute full test suite (or relevant subset)
   - Check for regressions
4. **Check Side Effects**:
   - Verify related functionality still works
   - Review any areas that might be affected
5. **Document Verification**:
   - Read `.kiro/settings/templates/bugs/verification.md`
   - Replace `{{BUG_NAME}}` placeholder
   - Fill in verification results:
     - Reproduction test results
     - Test suite results
     - Side effect check results
   - Write `verification.md` to bug directory

## Verification Checklist
- [ ] Original bug no longer reproducible
- [ ] All existing tests pass
- [ ] No new test failures
- [ ] Related features still work correctly
- [ ] No unintended side effects
</instructions>

## Tool Guidance
- Use **Read** to examine fix.md and report.md
- Use **Bash** to run tests and verify behavior
- Use **Grep** to check for any remaining issues
- Use **Write** to create verification.md

## Output Description
Provide output with the following structure:

1. **Verification Status**: PASSED / FAILED / PARTIAL
2. **Reproduction Test**: Results of trying to reproduce the bug
3. **Test Results**: Summary of test suite execution
4. **Side Effects**: Any observed side effects (none expected)
5. **Conclusion**:
   - If PASSED: Bug is resolved, ready for commit
   - If FAILED: What needs to be addressed, suggest `/kiro:bug-fix` again

**Format Requirements**:
- Use clear status indicators (✅ / ❌)
- Include test output if relevant
- Keep documentation focused on results

## Safety & Fallback
- **Fix Missing**: If fix.md doesn't exist, suggest running `/kiro:bug-fix` first
- **Test Failures**: Document specific failures and recommend re-analysis
- **Partial Success**: Document what works and what doesn't, suggest next steps
