# Bug Fix: inspection-auto-execution-toggle

## Summary
InspectionPanelの自動実行フラグ変更をworkflowStore経由で行うように修正し、file watcherとの競合を解消。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/workflowStore.ts` | `inspectionAutoExecutionFlag`状態とsetterを追加、`persistSettingsToSpec()`にInspection設定保存を追加 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | `handleInspectionAutoExecutionFlagChange`を削除、`workflowStore.setInspectionAutoExecutionFlag`を直接使用 |
| `electron-sdd-manager/src/renderer/types/index.ts` | `SpecAutoExecutionState`型に`inspectionFlag`フィールドを追加 |

### Code Changes

#### workflowStore.ts - 状態とメソッド追加
```diff
+ import type { InspectionAutoExecutionFlag } from '../types/inspection';

  // Build the autoExecution state object
+ // Bug fix: inspection-auto-execution-toggle - include inspectionFlag
  const autoExecutionState: SpecAutoExecutionState = {
    enabled: true,
    permissions: { ...workflowState.autoExecutionPermissions },
    documentReviewFlag: workflowState.documentReviewOptions.autoExecutionFlag,
    validationOptions: { ...workflowState.validationOptions },
+   inspectionFlag: workflowState.inspectionAutoExecutionFlag,
  };

+ // Bug fix: inspection-auto-execution-toggle - initial state
+ inspectionAutoExecutionFlag: 'pause' as InspectionAutoExecutionFlag,

+ // Bug fix: inspection-auto-execution-toggle
+ setInspectionAutoExecutionFlag: (flag: InspectionAutoExecutionFlag) => {
+   set({ inspectionAutoExecutionFlag: flag });
+   persistSettingsToSpec();
+ },
```

#### WorkflowView.tsx - ハンドラ削除とprops変更
```diff
- const { specDetail, isLoading, selectedSpec, specManagerExecution, clearSpecManagerError, refreshSpecs } = useSpecStore();
+ const { specDetail, isLoading, selectedSpec, specManagerExecution, clearSpecManagerError } = useSpecStore();

- const handleInspectionAutoExecutionFlagChange = useCallback(async (flag: 'run' | 'pause' | 'skip') => {
-   if (!specDetail) return;
-   try {
-     await window.electronAPI.setInspectionAutoExecutionFlag(specDetail.metadata.path, flag);
-     refreshSpecs();
-   } catch (error) {
-     notify.error(...);
-   }
- }, [specDetail, refreshSpecs]);

  <InspectionPanel
-   autoExecutionFlag={workflowStore.autoExecutionPermissions.inspection ? 'run' : 'pause'}
+   autoExecutionFlag={workflowStore.inspectionAutoExecutionFlag}
-   onAutoExecutionFlagChange={handleInspectionAutoExecutionFlagChange}
+   onAutoExecutionFlagChange={workflowStore.setInspectionAutoExecutionFlag}
  />
```

#### types/index.ts - 型定義追加
```diff
+ /** Inspection自動実行フラグ */
+ export type InspectionAutoExecutionFlag = 'run' | 'pause' | 'skip';

  export interface SpecAutoExecutionState {
    ...
+   /** Inspection自動実行フラグ (Bug fix: inspection-auto-execution-toggle) */
+   inspectionFlag?: InspectionAutoExecutionFlag;
  }
```

## Implementation Notes
- DocumentReviewPanelと同じアーキテクチャパターンを採用
- Zustand storeで状態を管理し、`persistSettingsToSpec()`でspec.jsonに非同期保存
- file watcherがspec.json変更を検知してUIを更新
- IPC直接呼び出し + `refreshSpecs()`パターンを廃止

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. workflowStoreから`inspectionAutoExecutionFlag`と`setInspectionAutoExecutionFlag`を削除
2. WorkflowViewに`handleInspectionAutoExecutionFlagChange`を復元
3. InspectionPanelのpropsを元に戻す

## Related Commits
- *To be added after commit*
