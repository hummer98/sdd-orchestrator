---
description: Generate neutral judgment and response to review issues
allowed-tools: Read, Write, Edit, Glob, Grep
argument-hint: <feature-name> [review-number] [--autofix | --fix]
---

# Document Review Reply

Evaluate each item from document-review with a neutral perspective and generate response judgments.

**Important**: Do not blindly accept review issues. Verify by actually checking existing code and make evidence-based judgments.

**Output Language**: Follow the language configuration in CLAUDE.md.

## Parse Arguments

- Feature name: `$1` (required)
- Review number: `$2` (optional, defaults to latest)
- Mode flags (optional):
  - `--autofix`: Generate reply AND apply modifications automatically
  - `--fix`: Apply modifications based on existing reply file (no new review)

## Validate

1. Verify `.kiro/specs/$1/` exists
2. If `$2` specified:
   - Verify `.kiro/specs/$1/document-review-$2.md` exists
3. If `$2` not specified:
   - Find latest `document-review-*.md` by number
   - Report which review is being addressed
4. If `--fix` flag:
   - Verify `.kiro/specs/$1/document-review-{n}-reply.md` exists
   - If not exists, inform user and abort

If validation fails, inform user.

## Mode: `--fix` (Apply fixes only)

When `--fix` flag is present:

1. Read existing `document-review-{n}-reply.md`
2. Parse the "Files to Modify" section and "Action Items" from each issue
3. Apply ONLY the items marked as "Fix Required" ✅
4. Update spec.json `documentReview.roundDetails[n-1]` with the following schema:
   ```json
   {
     "roundNumber": n,           // Required: round number (1-indexed)
     "status": "reply_complete", // Required: "incomplete" | "review_complete" | "reply_complete"
     "fixApplied": true,         // Set to true when fixes are applied
     "fixRequired": <number>,    // Fix Required count (preserve from reply generation)
     "needsDiscussion": <number> // Needs Discussion count (preserve from reply generation)
   }
   ```
   **IMPORTANT**: Always use `roundNumber` (not `round`). This is the official schema.
5. **Append "Applied Fixes" section** to `document-review-{n}-reply.md` (see format below)
6. Report changes made

**Do NOT**:
- Re-evaluate issues
- Generate new reply content
- Modify items marked as "No Fix Needed" or "Needs Discussion"

Skip to **Output Summary** section after applying fixes.

---

## Mode: Default (Generate reply only) or `--autofix` (Generate + Apply)

### Collect Documents

#### Target Review

- `.kiro/specs/$1/document-review-{n}.md` - The review to respond to

#### Reference Documents

- `.kiro/specs/$1/requirements.md`
- `.kiro/specs/$1/design.md`
- `.kiro/specs/$1/tasks.md`

#### Existing Code (as needed)

- Grep/Read relevant source files referenced in review issues
- Verify actual implementation details before making judgments

### Judgment Framework

For each issue in the review, apply the following evaluation criteria:

#### Judgment Categories

| Judgment              | Meaning                                    | Condition                                            |
| --------------------- | ------------------------------------------ | ---------------------------------------------------- |
| **Fix Required** ✅   | Review issue is correct, action needed     | Problem confirmed by checking existing code          |
| **No Fix Needed** ❌  | Review issue is incorrect or excessive     | No problem found, or matches design intent           |
| **Needs Discussion** ⚠️ | Additional information required to decide | Trade-offs exist, cannot determine                   |

#### Evaluation Process

For each Critical/Warning issue:

1. **Understand the Issue**: Grasp what the review is flagging as problematic
2. **Check Existing Code**: Actually read the relevant source files
3. **Document Evidence**:
   - Fix Required → Specify what needs to be fixed
   - No Fix Needed → Prove why current state is correct with code references
4. **Action Items**: If fixing, document the changes needed

#### Critical Review Principles

- **AI feedback ≠ Truth**: Reviews can have misrecognitions or excessive flags
- **Code is Truth**: If existing code works correctly, prioritize implementation over spec
- **Avoid Over-correction**: If no problem exists, clearly judge "No Fix Needed"
- **Show Evidence**: Always include code references or reasoning with judgments

### Generate Reply

Output file: `.kiro/specs/$1/document-review-{n}-reply.md`

#### Reply Structure

```markdown
# Response to Document Review #{n}

**Feature**: {feature-name}
**Review Date**: {original review date}
**Reply Date**: {YYYY-MM-DD}

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | X      | X            | X             | X                |
| Warning  | X      | X            | X             | X                |
| Info     | X      | X            | X             | X                |

---

## Response to Critical Issues

### C{n}: {issue title}

**Issue**: {summary of the review issue}

**Judgment**: {**Fix Required** ✅ | **No Fix Needed** ❌ | **Needs Discussion** ⚠️}

**Evidence**:
{For No Fix Needed: code snippet or logic explanation proving current implementation is correct}
{For Fix Required: confirmation of the issue with affected code}

**Action Items** (if Fix Required):

- {specific changes to be made}
- {affected files}

---

## Response to Warnings

### W{n}: {issue title}

**Issue**: {summary}

**Judgment**: {judgment}

**Evidence**: {evidence}

**Action Items** (if applicable): {changes}

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I{n} | {summary} | No Fix Needed | {brief reason} |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| {file} | {changes} |

---

## Conclusion

{Summary of decisions made}

{Remaining blockers or next steps}
```

### After Reply Generation

#### Update spec.json based on Fix Required count:

**IMPORTANT**: After generating the reply, you MUST update spec.json:

1. Count total "Fix Required" and "Needs Discussion" items from the Response Summary table
2. Update spec.json `documentReview.roundDetails[n-1]`:
   ```json
   {
     "roundNumber": n,           // Required: round number (1-indexed)
     "status": "reply_complete", // Required: "incomplete" | "review_complete" | "reply_complete"
     "fixRequired": <number>,    // Fix Required count from Response Summary
     "needsDiscussion": <number> // Needs Discussion count from Response Summary
   }
   ```
   **IMPORTANT**: Always use `roundNumber` (not `round`). This is the official schema.
3. **If Fix Required total is 0 AND Needs Discussion total is 0** (all issues resolved):
   - Set `documentReview.status = "approved"` in spec.json
   - This signals the document review phase is complete
4. **If Fix Required total is 0 AND Needs Discussion total > 0**:
   - Do NOT set `documentReview.status = "approved"`
   - This indicates human intervention is required for discussion items

#### If `--autofix` flag is present AND modifications are needed:

1. Apply the modifications to spec documents (requirements.md, design.md, tasks.md)
2. Update spec.json `documentReview.roundDetails[n-1].fixApplied = true`
3. **Append "Applied Fixes" section** to the reply document (see format below)

#### If no flag is present (default):

1. **Do NOT modify** any spec documents
2. Only generate the reply document (`document-review-{n}-reply.md`)
3. List all recommended changes in the "Files to Modify" section
4. Inform user they can run with `--fix` to apply changes

#### If all issues resolved (no "Fix Required" items):

- Indicate spec is ready for implementation
- Suggest running `/kiro:spec-impl $1`

#### If issues require discussion:

- List items marked as Needs Discussion
- Suggest what additional information is needed

---

## Applied Fixes Section Format

When `--fix` or `--autofix` applies modifications, append the following section to the end of `document-review-{n}-reply.md`:

```markdown
---

## Applied Fixes

**Applied Date**: {YYYY-MM-DD}
**Applied By**: {--fix | --autofix}

### Summary

| File | Changes Applied |
| ---- | --------------- |
| {file} | {brief description of changes} |

### Details

#### {file1}

**Issue(s) Addressed**: C{n}, W{n}, ...

**Changes**:
- {specific change 1}
- {specific change 2}

**Diff Summary**:
```diff
- {old content}
+ {new content}
```

#### {file2}

...

---

_Fixes applied by document-review-reply command._
```

**Important**:
- Include actual diff snippets showing what was changed
- Reference which issue(s) each change addresses
- Keep descriptions concise but specific

---

## Output Summary

Display to user:

1. Reply file location (if generated)
2. Summary counts (Fix Required / No Fix Needed / Needs Discussion)
3. Mode status:
   - Default: "Reply generated (fixes not applied)"
   - `--autofix`: "Reply generated and fixes applied"
   - `--fix`: "Fixes applied from existing reply"
4. Files modified (if `--autofix` or `--fix` was used) or files that would be modified (if default mode)
5. Next step recommendation:
   - If default mode and modifications are needed: suggest running with `--fix`
   - If all done: suggest `/kiro:spec-impl $1`
