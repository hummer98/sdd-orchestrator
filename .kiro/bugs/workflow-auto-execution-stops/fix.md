# Bug Fix: workflow-auto-execution-stops

## Summary
自動実行でDesign完了後にTasksフェーズに進まない問題を修正。`validatePreconditions`内でspecStoreのキャッシュではなく、直接spec.jsonを読むように変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [AutoExecutionService.ts](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts) | `validatePreconditions`でspec.jsonを直接読むように変更 |
| [AutoExecutionService.test.ts](electron-sdd-manager/src/renderer/services/AutoExecutionService.test.ts) | `readSpecJson`モックを追加し、テストを更新 |

### Code Changes

#### AutoExecutionService.ts
```diff
  async validatePreconditions(phase: WorkflowPhase): Promise<PreconditionResult> {
    const specStore = useSpecStore.getState();
    const agentStore = useAgentStore.getState();

    // Check specDetail availability
-   if (!specStore.specDetail || !specStore.specDetail.specJson) {
+   if (!specStore.specDetail) {
      return {
        valid: false,
        requiresApproval: false,
        waitingForAgent: false,
        missingSpec: true,
-       error: 'specDetail or specJson is not available',
+       error: 'specDetail is not available',
      };
    }

    const specDetail = specStore.specDetail;
-   const specJson = specDetail.specJson;
+
+   // Read spec.json directly to get the latest state (avoid stale cache)
+   const specJson = await window.electronAPI.readSpecJson(specDetail.metadata.path);
```

#### AutoExecutionService.test.ts
```diff
  const mockElectronAPI = {
    executePhase: vi.fn(),
    executeValidation: vi.fn(),
    updateApproval: vi.fn(),
+   readSpecJson: vi.fn(),
  };
```

各validatePreconditionsテストで`mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson)`を追加。

## Implementation Notes
- specStoreのキャッシュは非同期で更新されるため、Agentの完了検知直後は古い状態を参照する可能性があった
- `validatePreconditions`はフェーズ遷移時のみ呼ばれる（頻度が低い）ため、毎回ファイルI/Oを行ってもパフォーマンスへの影響は最小限
- 既存のIPC API `window.electronAPI.readSpecJson`を使用しているため、新たなAPI追加は不要

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `validatePreconditions`内の`window.electronAPI.readSpecJson`呼び出しを元の`specDetail.specJson`参照に戻す
2. テストから`mockElectronAPI.readSpecJson`のモック設定を削除

## Test Results
```
 ✓ src/renderer/services/AutoExecutionService.test.ts (23 tests) 6ms
 Test Files  1 passed (1)
      Tests  23 passed (23)
```

## Related Commits
- *To be committed*
