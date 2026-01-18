# Implementation Plan

## Task Format Template

Use whichever pattern fits the work breakdown:

### Major task only
- [ ] {{NUMBER}}. {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}} *(Include details only when needed. If the task stands alone, omit bullet items.)*
  - _Requirements: {{REQUIREMENT_IDS}}_
  - _Method: {{METHOD_KEYWORDS}}_ *(Optional: function/class names that MUST be used)*
  - _Verify: {{VERIFY_PATTERN}}_ *(Optional: Grep pattern to confirm implementation)*

### Major + Sub-task structure
- [ ] {{MAJOR_NUMBER}}. {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{SUB_PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{DETAIL_ITEM_2}}
  - _Requirements: {{REQUIREMENT_IDS}}_ *(IDs only; do not add descriptions or parentheses.)*
  - _Method: {{METHOD_KEYWORDS}}_ *(Optional: e.g., "executeProjectAgent, startAgent")*
  - _Verify: {{VERIFY_PATTERN}}_ *(Optional: e.g., 'Grep "executeProjectAgent" in channels.ts')*

> **Parallel marker**: Append ` (P)` only to tasks that can be executed in parallel. Omit the marker when running in `--sequential` mode.
>
> **Optional test coverage**: When a sub-task is deferrable test work tied to acceptance criteria, mark the checkbox as `- [ ]*` and explain the referenced requirements in the detail bullets.
>
> **Method verification fields** (for inspection traceability):
> - `_Method:_` - Lists function/class/pattern names that MUST be used in implementation. Extracted from design.md.
> - `_Verify:_` - Grep pattern for spec-inspection to confirm the method was actually used.
> - These fields enable TaskChecker to detect implementation method mismatches as Critical issues.
