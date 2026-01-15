# Implementation Plan

## Task Format Template

Use whichever pattern fits the work breakdown:

### Major task only
- [ ] {{NUMBER}}. {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}} *(Include details only when needed. If the task stands alone, omit bullet items.)*
  - _Requirements: {{REQUIREMENT_IDS}}_

### Major + Sub-task structure
- [ ] {{MAJOR_NUMBER}}. {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{SUB_PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{DETAIL_ITEM_2}}
  - _Requirements: {{REQUIREMENT_IDS}}_ *(IDs only; do not add descriptions or parentheses.)*

> **Parallel marker**: Append ` (P)` only to tasks that can be executed in parallel. Omit the marker when running in `--sequential` mode.
>
> **Optional test coverage**: When a sub-task is deferrable test work tied to acceptance criteria, mark the checkbox as `- [ ]*` and explain the referenced requirements in the detail bullets.

## Entry Point Connection (MANDATORY)

Every task set MUST include tasks that connect new code to application entry points.

### Required final tasks
- [ ] N. Entry Point Connection
- [ ] N.1 Wire new functionality to entry point (UI/IPC/API)
  - Connect {{NEW_SERVICE/COMPONENT}} to {{ENTRY_POINT}}
  - Register handler/render component/expose endpoint
  - _Requirements: {{RELATED_IDS}}_
- [ ] N.2 Verify user reachability
  - User can access new feature via {{UI_PATH/COMMAND/API}}
  - End-to-end flow validation
  - _Requirements: {{RELATED_IDS}}_

> **CRITICAL**: Code that is only called from tests is considered orphaned. Every new service/handler/component MUST have a task connecting it to an entry point.
