# E2E Test Report - markdown-mermaid-preview

## Summary
- **Date**: 2026-02-05T05:08:53Z
- **Scope**: Full Mode E2E
- **Result**: FAIL
- **Mode**: Full
- **Autofix Cycle**: 3 (Final)

## Test Plan
### User Journeys Verified
| Journey ID | Description | Decision |
|------------|-------------|----------|
| UJ-001 | ArtifactEditorでMermaid図を含むdesign.mdを開き、プレビューでSVGレンダリングを確認 | Execute (existing test) |
| UJ-002 | 編集モードでMermaidコードを変更し、プレビューで反映を確認 | Execute (existing test) |
| UJ-003 | 不正なMermaid構文入力時のエラー表示を確認 | Execute (existing test) |
| UJ-004 | 複数のMermaidブロックを含むドキュメントをプレビューする | Defer (covered by UJ-001) |
| UJ-005 | Remote UI版ArtifactEditorでのMermaidプレビュー動作確認 | Execute (existing test) |

### Scope Decisions
- Execute: 4 (existing tests used)
- Create: 0 (no new tests needed)
- Defer: 1 (covered by other tests)

## Autofix History
| Cycle | Fix Applied | Outcome |
|-------|-------------|---------|
| 1 | Added testId='artifact-editor' to ArtifactEditor | 4 UJ-001 tests still failing |
| 2 | Added waitForCondition for artifact-editor and design-tab | 9/13 passed, 4 UJ-001 still failing |
| 3 | Added waitForSpecDetailReady(SPEC_NAME, 15000) in before hook | Before hook failure (regression) |

## Executed Tests
| Test File | Status | Duration | Notes |
|-----------|--------|----------|-------|
| mermaid-preview.e2e.spec.ts | FAIL | 16.5s | Before hook failure |

### Test Results by Suite
| Test Suite | Test Name | Status | Failure Type |
|------------|-----------|--------|--------------|
| Before Hook | "before all" hook | FAIL | Critical |
| UJ-001 | should display ArtifactEditor with design tab | SKIP | - |
| UJ-001 | should render Mermaid diagrams as SVG | SKIP | - |
| UJ-001 | should render multiple Mermaid diagrams | SKIP | - |
| UJ-001 | should not affect non-Mermaid code blocks | SKIP | - |
| UJ-002 | should update preview when Mermaid code is changed | SKIP | - |
| UJ-003 | should display error message for invalid syntax | SKIP | - |
| UJ-005 | should connect to Remote UI | SKIP | - |
| UJ-005 | should display Spec list in Remote UI | SKIP | - |
| UJ-005 | should select spec and display ArtifactEditor | SKIP | - |
| UJ-005 | should render Mermaid diagrams in Remote UI preview | SKIP | - |
| Security | should have contextIsolation enabled | SKIP | - |
| Security | should have nodeIntegration disabled | SKIP | - |
| Security | should not crash during Mermaid rendering | SKIP | - |

## Failure Analysis

### Critical: Before Hook Failure
- **Failure Type**: Critical (blocks all tests)
- **Error**: `waitForSpecDetailReady timed out - specStore.specDetail remains null after 15s`
- **Location**: `mermaid-preview.e2e.spec.ts:222` (expect(specDetailReady).toBe(true))

### Root Cause Analysis

**Primary Issue**: `selectSpecViaStore()` does not trigger `specStore.loadSpecDetail()` - it only sets `selectedSpec`

**Failure Pattern**:
- `waitForSpecDetailReady` waits for `specDetail !== null`
- But `selectSpec()` alone does not populate `specDetail`
- `isDetailLoading` remains `false` throughout, indicating no loading was initiated

**Observations**:
1. selectProjectViaStore succeeded (project loaded)
2. waitForProjectUIReady succeeded after 3.6s (docs-tabs visible)
3. selectSpecViaStore succeeded (spec found in list and selected)
4. waitForSpecDetailReady timed out after 73 iterations (15s)
5. isDetailLoading remained false - no loading was initiated

**Key Insight**:
The `selectSpecViaStore` helper calls `specStore.selectSpec(spec)` which only updates `selectedSpec` state. In the UI, a useEffect in a component triggers `loadSpecDetail()` when `selectedSpec` changes, but direct store manipulation in E2E tests bypasses this UI-triggered loading.

### Hypotheses
| ID | Description | Likelihood | Evidence |
|----|-------------|------------|----------|
| H1 | selectSpec() only updates selectedSpec, does not trigger loadSpecDetail() | High | isDetailLoading=false throughout test |
| H2 | UI useEffect triggers loadSpecDetail, but store-only selection bypasses this | High | E2E manipulates store directly |

## Evidence

### Console Logs
```
[E2E] Project UI ready after 3600ms
[E2E] spec-detail-ready-mermaid-feature iteration 4: isAutoExecuting=false, status=idle, phase=null
[E2E] spec-detail-ready-mermaid-feature iteration 8: isAutoExecuting=false, status=idle, phase=null
[E2E] spec-detail-ready-mermaid-feature TIMEOUT after 73 iterations. Final state: isAutoExecuting=false, status=idle, phase=null
```

### Regression Note
Cycle 3 fix added `expect(specDetailReady).toBe(true)` assertion which now causes the before hook to fail early. In Cycle 2, this assertion was not present, allowing tests to continue even though spec detail was not loaded - this is why some tests passed in Cycle 2 (they happened to work without proper spec detail loading).

## Suggested Fix

Modify `selectSpecViaStore` helper to explicitly call `specStore.loadSpecDetail(specName)` after `selectSpec()`:

```typescript
export async function selectSpecViaStore(specId: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (id: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.spec?.getState) {
          const specStore = stores.spec.getState();
          const spec = specStore.specs.find((s: any) => s.name === id);
          if (spec) {
            specStore.selectSpec(spec);
            // ADD: Explicitly load spec detail
            await specStore.loadSpecDetail(id);
            done(true);
          } else {
            done(false);
          }
        } else {
          done(false);
        }
      } catch (e) {
        done(false);
      }
    }, specId).then(resolve);
  });
}
```

Alternatively, call `loadSpecDetail` directly in the test before hook after `selectSpecViaStore`.

## Coverage Analysis

### User Journey Coverage
| Journey | Status | Notes |
|---------|--------|-------|
| UJ-001 | Not Verified | All tests skipped due to setup failure |
| UJ-002 | Not Verified | Test skipped |
| UJ-003 | Not Verified | Test skipped |
| UJ-004 | Deferred | Covered by UJ-001 per plan |
| UJ-005 | Not Verified | All tests skipped |

### Technical Debt
The E2E helper pattern of direct store manipulation may not trigger all UI side effects. Consider:
1. Adding explicit `loadSpecDetail` calls to helpers
2. Using the `standardE2ESetup` helper which may address this
3. Documenting the difference between store manipulation and UI interaction

## Statistics
| Metric | Value |
|--------|-------|
| Total Tests | 14 |
| Passed | 0 |
| Failed | 1 |
| Skipped | 13 |
| Critical Failures | 1 |
| Warnings | 0 |
| Duration | 16.5s |

## Conclusion

This is the **final autofix cycle** (max 3 cycles reached). The E2E tests fail in the before hook due to a fundamental issue with how `selectSpecViaStore` works - it does not trigger spec detail loading.

**Recommendation**: This requires a manual fix to the E2E helper infrastructure before the tests can be properly executed. The fix should ensure `loadSpecDetail()` is called after spec selection.
