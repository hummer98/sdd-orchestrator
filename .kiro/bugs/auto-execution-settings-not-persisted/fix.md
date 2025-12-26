# Bug Fix: auto-execution-settings-not-persisted

## Summary
UIから変更した自動実行設定をspec.jsonに即時保存する処理を追加。これにより、Spec切り替え時も設定が保持される。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [workflowStore.ts](electron-sdd-manager/src/renderer/stores/workflowStore.ts) | `persistSettingsToSpec()`ヘルパー関数を追加し、3つのトグルアクションでspec.jsonへの保存を実行 |

### Code Changes

#### 1. ヘルパー関数の追加（行27-57）
```diff
+ import type { SpecAutoExecutionState } from '../types';
+
+ // ============================================================
+ // Bug Fix: auto-execution-settings-not-persisted
+ // Helper function to persist settings to spec.json
+ // ============================================================
+
+ /**
+  * Persist current workflow settings to spec.json
+  * Called after each setting change to ensure spec-scoped persistence
+  */
+ async function persistSettingsToSpec(): Promise<void> {
+   // Dynamic import to avoid circular dependency
+   const { useSpecStore } = await import('./specStore');
+   const specStore = useSpecStore.getState();
+   const specDetail = specStore.specDetail;
+
+   if (!specDetail) {
+     // No spec selected, skip persistence
+     return;
+   }
+
+   // Get current state from workflowStore
+   const workflowState = useWorkflowStore.getState();
+
+   // Build the autoExecution state object
+   const autoExecutionState: SpecAutoExecutionState = {
+     enabled: true,
+     permissions: { ...workflowState.autoExecutionPermissions },
+     documentReviewFlag: workflowState.documentReviewOptions.autoExecutionFlag,
+     validationOptions: { ...workflowState.validationOptions },
+   };
+
+   try {
+     await window.electronAPI.updateSpecJson(specDetail.metadata.path, {
+       autoExecution: autoExecutionState,
+     });
+     console.log('[workflowStore] Settings persisted to spec.json');
+   } catch (error) {
+     console.error('[workflowStore] Failed to persist settings to spec.json:', error);
+   }
+ }
```

#### 2. toggleAutoPermission（行271-282）
```diff
  toggleAutoPermission: (phase: WorkflowPhase) => {
    set((state) => ({
      autoExecutionPermissions: {
        ...state.autoExecutionPermissions,
        [phase]: !state.autoExecutionPermissions[phase],
      },
    }));
+   // Persist to spec.json after state update
+   persistSettingsToSpec();
  },
```

#### 3. toggleValidationOption（行284-295）
```diff
  toggleValidationOption: (type: ValidationType) => {
    set((state) => ({
      validationOptions: {
        ...state.validationOptions,
        [type]: !state.validationOptions[type],
      },
    }));
+   // Persist to spec.json after state update
+   persistSettingsToSpec();
  },
```

#### 4. setDocumentReviewAutoExecutionFlag（行338-350）
```diff
  setDocumentReviewAutoExecutionFlag: (flag: DocumentReviewAutoExecutionFlag) => {
    set((state) => ({
      documentReviewOptions: {
        ...state.documentReviewOptions,
        autoExecutionFlag: flag,
      },
    }));
+   // Persist to spec.json after state update
+   persistSettingsToSpec();
  },
```

## Implementation Notes

### 設計選択
- **即時保存**: 設定変更時に即座にspec.jsonへ保存（Option 1を採用）
- **Dynamic import**: specStoreとの循環依存を避けるために動的インポートを使用
- **Fire-and-forget**: 保存は非同期だが、UIはブロックしない（エラーはログに記録）

### データフロー（修正後）
```
UI変更 → workflowStore（メモリ）→ spec.json保存 ✅
Spec選択 → spec.jsonから復帰 → workflowStore同期 ✅
```

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `persistSettingsToSpec()`関数を削除
2. 各トグルアクションから`persistSettingsToSpec()`呼び出しを削除
3. `import type { SpecAutoExecutionState }`を削除

## Related Commits
- *修正完了後にコミット予定*

## Test Results
- workflowStore.test.ts: 45 passed
- AutoExecutionService.test.ts: 全テストパス
