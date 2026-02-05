# E2E Test Report - markdown-mermaid-preview

## Summary
- **Date**: 2026-02-05T05:16:44Z
- **Scope**: Full Mode E2E
- **Result**: FAIL
- **Mode**: Full
- **Report Number**: 6 (Final autofix attempt)

## Test Plan
### User Journeys Verified
| Journey ID | Description | Decision |
|------------|-------------|----------|
| UJ-001 | ArtifactEditorでMermaid図を含むdesign.mdを開き、プレビューモードに切り替える | Execute |
| UJ-002 | 編集モードでMermaidコードを変更し、プレビューモードで確認する | Execute |
| UJ-003 | 不正なMermaid構文を入力し、プレビューを確認する | Execute |
| UJ-004 | 複数のMermaidブロックを含むドキュメントをプレビューする | Defer |
| UJ-005 | Remote UI版ArtifactEditorでMermaid図をプレビューする | Execute |

### Scope Decisions
- Execute: 4 (existing tests used)
- Create: 0 (no new tests)
- Defer: 1 (skipped per Verification Contract)

## Executed Tests
| Test File | Journey | Status | Duration | Failure Type |
|-----------|---------|--------|----------|--------------|
| mermaid-preview.e2e.spec.ts | - (before hook) | FAIL | 1.3s | Critical |
| mermaid-preview.e2e.spec.ts | UJ-001 | SKIP | - | - |
| mermaid-preview.e2e.spec.ts | UJ-002 | SKIP | - | - |
| mermaid-preview.e2e.spec.ts | UJ-003 | SKIP | - | - |
| mermaid-preview.e2e.spec.ts | UJ-005 | SKIP | - | - |
| mermaid-preview.e2e.spec.ts | Security | SKIP | - | - |

## Previous Autofix Cycles

This is the 6th autofix cycle. All previous fixes have been applied:

| Cycle | Fix Applied | Result |
|-------|-------------|--------|
| 1 | Added `testId="artifact-editor"` to ArtifactEditor in CenterPaneContainer.tsx | Still failed |
| 2 | Added `waitForCondition` for artifact-editor and design-tab in UJ-001 test | Still failed |
| 3 | Added `waitForSpecDetailReady(SPEC_NAME, 15000)` call in before hook | Still failed |
| 4 | Modified `selectSpecViaStore()` helper to call `loadSpecDetail(specId)` after `selectSpec()` | Still failed |
| 5 | Confirmed loadSpecDetail fix - identified underlying issue: specs array is empty | Still failed |
| 6 | `selectSpecViaStore` now waits for `specStore.specs` to be populated (15s timeout) | Still failed |

## Failure Analysis
### Critical: before all hook

- **Failure Type**: Critical (blocks all User Journey tests)
- **Location**: `mermaid-preview.e2e.spec.ts:218`
- **Error**: `expect(received).toBe(expected) // Expected: true, Received: false`
- **Root Cause**: `specStore.specs` array remains empty after project selection, even with 15 second wait

#### Failure Sequence

1. `selectProjectViaStore(FIXTURE_PROJECT_PATH)` - **SUCCESS** (lastSelectResult.success = true)
2. `waitForProjectUIReady(10000)` - **SUCCESS** (docs-tabs visible)
3. `selectSpecViaStore` waits for specs - **TIMEOUT** after 15 seconds (30 iterations x 500ms)
4. `selectSpecViaStore` find spec - **FAIL** (specs array is empty)
5. Test assertion fails: `expect(specSelected).toBe(true)`

#### Key Insight

The spec loading mechanism is NOT triggered when project is selected via `store.selectProject()`. The UI `docs-tabs` appear (indicating project is loaded), but `specStore.specs` array stays empty.

This suggests spec scanning requires a trigger that is missing in the E2E store-based project selection flow.

#### Possible Causes

1. Spec scanning may be triggered by React `useEffect` hooks in UI components that don't run when using direct store manipulation
2. The IPC handler for `selectProject` may not call the spec scanning function
3. There may be a subscription mechanism that is not properly initialized in E2E context

## Evidence
### Console Logs
```
[E2E] specs-array-loaded TIMEOUT after 30 iterations. Final state: isAutoExecuting=false, status=idle, phase=null
[E2E] Timeout waiting for specs to load
[E2E] selectSpecViaStore - Spec mermaid-feature not found: id: mermaid-feature Available:
```

### Environment Check
- Electron stopped: Yes
- Port 9222 available: Yes
- Build complete: Yes
- Lock acquired: Yes

### Fixture Verification
- Fixture path: `/Users/yamamoto/git/sdd-orchestrator/.kiro/worktrees/specs/markdown-mermaid-preview/electron-sdd-manager/e2e-wdio/fixtures/mermaid-test/`
- Spec exists: `.kiro/specs/mermaid-feature/spec.json`
- Design file exists: `.kiro/specs/mermaid-feature/design.md`
- Project config exists: `.kiro/sdd-orchestrator.json`

## Suggested Fixes for Next Cycle

| Priority | Location | Change |
|----------|----------|--------|
| 1 | `mermaid-preview.e2e.spec.ts` before hook | Explicitly call `specStore.refreshSpecs()` after project selection |
| 2 | `auto-execution.helpers.ts` - `selectProjectViaStore` | Trigger spec refresh after successful project selection |
| 3 | Application code - `projectStore.selectProject` | Ensure spec scanning is triggered when project is selected programmatically |

### Recommended Implementation (Priority 1)

In the `before all` hook of `mermaid-preview.e2e.spec.ts`, add explicit spec refresh:

```typescript
before(async () => {
  await browser.pause(1000);

  // Select fixture project
  const selected = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
  expect(selected).toBe(true);

  // Wait for project UI to be ready
  await waitForProjectUIReady(10000);

  // CRITICAL FIX: Explicitly refresh specs after project selection
  await browser.executeAsync(async (done) => {
    const stores = (window as any).__STORES__;
    if (stores?.spec?.getState()?.refreshSpecs) {
      await stores.spec.getState().refreshSpecs();
    }
    done();
  });

  // Now select the spec
  const specSelected = await selectSpecViaStore(SPEC_NAME);
  expect(specSelected).toBe(true);

  // Wait for spec detail to be loaded
  const specDetailReady = await waitForSpecDetailReady(SPEC_NAME, 15000);
  expect(specDetailReady).toBe(true);

  await browser.pause(500);
});
```

## Coverage Analysis
### User Journey Coverage
- UJ-001: NOT VERIFIED (test setup failure)
- UJ-002: NOT VERIFIED (test setup failure)
- UJ-003: NOT VERIFIED (test setup failure)
- UJ-005: NOT VERIFIED (test setup failure)

### Integration Points NOT Tested
- Mermaid diagram SVG rendering
- Real-time preview update
- Error handling for invalid syntax
- Remote UI Mermaid rendering
- Security settings (contextIsolation, nodeIntegration)
- Application stability during Mermaid operations

## Conclusion

After 6 autofix cycles, the E2E test continues to fail at the `before all` hook due to `specStore.specs` array not being populated after project selection. The root cause is that the spec scanning/loading mechanism is not triggered when project is selected programmatically via store action.

**Recommended Action**: Add explicit `specStore.refreshSpecs()` call in the test setup after project selection.
