# E2E Test Report - project-docs-viewer (Run 2)

## Summary
- **Date**: 2026-02-05T20:04:40Z
- **Scope**: Full Mode E2E (re-run after autofix)
- **Result**: FAIL
- **Mode**: Full
- **Duration**: 10.4s (terminated early due to hook failure)
- **Test File**: `electron-sdd-manager/e2e-wdio/project-docs-viewer.e2e.spec.ts`

## Test Plan
### User Journeys Verified
| Journey ID | Description | Decision | Status |
|------------|-------------|----------|--------|
| UJ-001 | Project選択 -> Projectタブ -> Docsセクション確認 | Use (existing) | FAIL |
| UJ-002 | Docsセクション -> フォルダクリック -> 展開/折りたたみ | Use (existing) | FAIL |
| UJ-003 | Docsセクション -> .mdファイル選択 -> エディタ表示 | Use (existing) | FAIL |
| UJ-004 | Docsセクション -> .pdfファイル選択 -> iframe表示 | Use (existing) | FAIL |
| UJ-005 | タブ切替(Spec->Project) -> 選択/展開状態復元 | Use (existing) | FAIL |

### Scope Decisions
- Use (existing tests): 5
- Create (new tests): 0
- Defer (skipped): 0

## Executed Tests
| Test File | Journey | Status | Duration | Failure Type |
|-----------|---------|--------|----------|--------------|
| project-docs-viewer.e2e.spec.ts (before all) | ALL | FAIL | 10.4s | Critical |

**Note**: All 27 individual test cases were blocked by a `before all` hook failure. No individual tests executed.

### Blocked Test Suites
| Suite | Journey | Tests Blocked | Failure Type |
|-------|---------|---------------|--------------|
| UJ-001: Docs section display after project selection | UJ-001 | 6 | Critical |
| UJ-002: Folder expand/collapse functionality | UJ-002 | 5 | Critical |
| UJ-003: Markdown file selection and display | UJ-003 | 3 | Critical |
| UJ-004: PDF file selection and display | UJ-004 | 4 | Critical |
| UJ-004b: HTML file selection and display | - | 4 | Warning |
| UJ-005: State restoration after tab switching | UJ-005 | 4 | Critical |
| Security and Stability | - | 3 | Warning |

## Failure Analysis

### Root Cause: `before all` Hook Failure

**Error Message**:
```
element ("[data-testid="tab-project"]") still not clickable after 10000ms
```

**Location**: Top-level `describe('Project Docs Viewer E2E')` > `before` hook

**Call Stack**:
1. `selectProjectViaStore(FIXTURE_PROJECT_PATH)` -- succeeded
2. `waitForProjectUIReady(15000)` -- succeeded (resolved)
3. `navigateToProjectTab()` -- FAILED
   - `$('[data-testid="tab-project"]')` -- element found in DOM
   - `waitForClickable({ timeout: 10000 })` -- timed out
   - `isElementClickable` returned `false`

**Analysis**:
The Project tab element exists in the DOM but is not interactable. WebdriverIO's `isElementClickable` check verifies that an element is visible, has non-zero dimensions, and is not covered by other elements. The `false` result indicates one of:

1. **Overlay/Dialog**: An overlay or dialog may be covering the tab after project selection
2. **CSS Layout**: The tab may have `display: none`, `visibility: hidden`, or zero dimensions due to CSS issues
3. **Z-index**: Another element may be stacked above the tab
4. **Timing**: `waitForProjectUIReady` resolved but the tab was not yet in a clickable state

### Comparison with Previous Run (e2e-report-1)

| Metric | Run 1 | Run 2 | Delta |
|--------|-------|-------|-------|
| Total Tests | 29 | 27 | -2 |
| Passed | 17 | 0 | -17 |
| Failed | 12 | 27 | +15 |
| Critical | 9 | 5 | -4 (but all journeys blocked) |
| Duration | 3m 18.4s | 10.4s | -3m 8s |

**Regression**: Run 2 shows complete regression. In Run 1, the same `tab-project` interactability issue affected individual tests but was not a blocking hook failure. In Run 2, the error occurs in the top-level `before all` hook, which prevents all tests from executing.

**Key Difference**: Run 1 had the Electron app already running (`electronStopped: false`), while Run 2 had a clean environment. This difference in startup state may affect the timing and rendering behavior of the app.

## Evidence
### Hook Failure
- **Screenshot**: None captured (hook failure occurs before screenshot setup)
- **Console**: WebdriverIO log shows `isElementClickable` returned `false` for `tab-project`
- **DOM State**: Element `[data-testid="tab-project"]` exists but computed style `display: flex` and clickability check fails

### WebdriverIO Log Excerpt
```
[0-0] RESULT flex            (CSS display property = flex)
[0-0] RESULT true            (checkVisibility = true)
[0-0] RESULT false           (isElementClickable = false)
```

The element has `display: flex` and passes visibility checks, but fails the clickability check. This strongly suggests the element is covered by another element (overlapping element or dialog).

## Coverage Analysis
### User Journey Coverage
| Journey | Status | Verification |
|---------|--------|-------------|
| UJ-001 | NOT VERIFIED | Blocked by hook failure |
| UJ-002 | NOT VERIFIED | Blocked by hook failure |
| UJ-003 | NOT VERIFIED | Blocked by hook failure |
| UJ-004 | NOT VERIFIED | Blocked by hook failure |
| UJ-005 | NOT VERIFIED | Blocked by hook failure |

### Recommended Actions
1. **Investigate tab-project clickability**: Add debug logging or screenshot capture in the `before all` hook before `navigateToProjectTab()` to identify what element is covering the tab
2. **Add retry logic**: Consider adding retry with scroll-into-view or force-click as a fallback in `navigateToProjectTab()`
3. **Check for overlays**: Verify no dialog, tooltip, or notification overlay appears after project selection that might block the tab
4. **Consider environment timing**: The clean-start environment (vs. already-running app in Run 1) may require longer wait times for UI rendering

## Environment
- **Electron stopped before test**: Yes
- **Port 9222**: Available
- **Build**: Complete (dist/ exists)
- **Lock file**: Acquired and released cleanly
- **Platform**: darwin (macOS)
- **Chrome**: 134.0.6998.205
