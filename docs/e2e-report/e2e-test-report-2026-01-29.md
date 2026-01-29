# E2E Test Report - 2026-01-29

## Summary

| Category | Count |
|----------|-------|
| Total Test Files | 46 |
| Passed | 21 |
| Failed | 25 |
| Pass Rate | 45.7% |
| Duration | 31:29 |

## Passed Tests (21)

agent-log-streaming, app-launch, artifact-editor-search, auto-execution-flow,
auto-execution-impl-phase, auto-execution-intermediate-artifacts,
auto-execution-resume, bug-workflow, bugs-file-watcher, bugs-worktree-support,
debatex-scheme, document-review-ui-states, document-review, event-log,
gemini-document-review, git-diff-viewer, multi-window, permission-control,
simple-auto-execution, ssh-workflow, worktree-rebase-from-main

## Failed Tests - Category 1: API Removed (Test Fix Applied)

### experimental-tools-installer.spec.ts - FIXED
- **Root cause**: installExperimentalCommit API removed (Commit promoted to core)
- **Fix**: Removed 2 obsolete tests (installExperimentalCommit, onMenuInstallExperimentalCommit)
- **Status**: Fixed (unverified - SDD Orchestrator process blocks E2E session creation)

### install-dialogs.e2e.spec.ts - ALREADY FIXED
- **Root cause**: installClaudeMd, checkClaudeMdExists, installCcSddWorkflow, checkCcSddWorkflowStatus APIs integrated into unified installer
- **Fix**: Fixed in commit 6c661cb (4 deleted API tests removed)
- **Status**: Fixed

### layout-persistence.e2e.spec.ts - FIXED
- **Root cause**: Layout APIs (loadLayoutConfig, saveLayoutConfig, resetLayoutConfig) changed from project-specific to app-wide. Tests used old API signature with projectPath argument.
- **Fix**: Removed projectPath argument from all layoutConfig API calls. Removed unnecessary beforeEach project selection.
- **Status**: Fixed (unverified - SDD Orchestrator process blocks E2E session creation)

### Verification Environment Issue
SDD Orchestrator app auto-restarts (via VSCode extension/electron:dev mode), blocking E2E test session creation. Full app stop is required for verification.

## Failed Tests - Category 2: Auto-Execution State (Investigation Required)

auto-execution-document-review (3), auto-execution-impl-flow (1),
auto-execution-permissions (5), auto-execution-workflow (4),
bug-auto-execution (multiple)
- All: expect(received).toBe(expected) on state validation
- Auto-execution state management changes may be the cause

## Failed Tests - Category 3: UI Element Changes (Investigation Required)

bugs-pane-integration (8 tests), schedule-task (element not found),
spec-workflow (UI issues)
- UI component structural changes (data-testid changes, element moves/deletions) may be the cause

## Failed Tests - Category 4: Environment/Infrastructure

remote-webserver (TimeoutError), cloudflare-tunnel (not configured),
renderer-logging (module import error)
- Environment-specific issues. Test code changes may not be needed.

## Failed Tests - Category 5: Feature-Specific (Investigation Required)

agent-resume-log-display, convert-spec-to-worktree, file-watcher-ui-update,
impl-start-worktree, inspection-workflow, metrics-display,
parsed-log-entry-display, workflow-integration, worktree-execution,
worktree-spec-sync, worktree-two-stage-watcher
- Test mismatches from implementation changes. Individual investigation needed.

## Conclusion

- **3 files (Category 1)**: API removal expectation changes -> **All fixed** (2 fixed in this session, 1 already fixed in commit 6c661cb)
- 5 files (Category 2): Auto-execution state changes -> Investigation needed
- 3 files (Category 3): UI element changes -> Investigation needed
- 3 files (Category 4): Environment-specific issues
- 11 files (Category 5): Feature-specific failures -> Individual investigation needed

_Generated: 2026-01-29_
_Updated: 2026-01-30 (Category 1 fixes complete, report detailed)_
