# Bug Fix: auto-execution-flag-cross-spec-contamination

## Summary
Spec Aで自動実行フラグ（document-review等）をオフにすると、他のSpec（Spec B, C...）のUI上でもオフに見える問題を修正。根本原因であった**不要なworkflowStoreへの同期コード**を削除し、spec.jsonをSingle Source of Truth (SSOT)とする設計を完全に実現。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts` | Spec選択時のworkflowStore同期コード（Line 219-245）を削除 |
| `electron-sdd-manager/src/renderer/stores/workflowStore.ts` | `persistSettingsToSpec()` 関数（Line 35-68）を削除、`toggleAutoPermission`内の呼び出しを削除 |

### Code Changes

#### 1. specDetailStore.ts (Line 205-247)

```diff
       const specDetail: SpecDetail = {
         metadata: spec,
         specJson,
         artifacts: {
           requirements,
           design,
           tasks,
           research,
           inspection,
         },
         taskProgress,
         parallelTaskInfo,
       };

-      // Bug fix: spec-json-to-workflowstore-sync-missing
-      // Sync autoExecution settings from spec.json to workflowStore
-      // This ensures UI reflects the spec-scoped settings when switching specs
-      if (specJson.autoExecution) {
-        const t4 = performance.now();
-        const { useWorkflowStore } = await import('../workflowStore');
-        timings['importWorkflowStore'] = performance.now() - t4;
-        const wf = useWorkflowStore.getState();
-        if (specJson.autoExecution.permissions) {
-          wf.setAutoExecutionPermissions(specJson.autoExecution.permissions);
-        }
-        // document-review-phase Task 7.1: documentReviewFlag removed - use permissions['document-review'] instead
-        // Migration: if old documentReviewFlag exists, convert to permissions['document-review']
-        const oldDocReviewFlag = (specJson.autoExecution as any).documentReviewFlag;
-        if (oldDocReviewFlag && !specJson.autoExecution.permissions?.['document-review']) {
-          // Old format: 'run' -> true, 'pause' -> false
-          const docReviewPermission = oldDocReviewFlag === 'run';
-          wf.setAutoExecutionPermissions({
-            ...wf.autoExecutionPermissions,
-            'document-review': docReviewPermission,
-          });
-        }
-        console.log('[specDetailStore] Synced autoExecution settings to workflowStore:', {
-          spec: spec.name,
-          permissions: specJson.autoExecution.permissions,
-        });
-      }
+      // Bug fix: auto-execution-flag-cross-spec-contamination
+      // Removed workflowStore sync code - spec.json is now the Single Source of Truth
+      // UI reads directly from spec.json via useElectronWorkflowState hook

       timings['total'] = performance.now() - startTotal;
```

#### 2. workflowStore.ts - persistSettingsToSpec() 削除 (Line 23-68)

```diff
-// ============================================================
-// Bug Fix: auto-execution-settings-not-persisted
-// Helper function to persist settings to spec.json
-// ============================================================
-
-/**
- * Persist current workflow settings to spec.json
- * Called after each setting change to ensure spec-scoped persistence
- * inspection-permission-unification Task 4.3: Removed inspectionFlag from persistence
- * document-review-phase Task 6.2: Removed documentReviewFlag from persistence
- * Requirements: 3.6, 6.1, 6.2
- */
-async function persistSettingsToSpec(): Promise<void> {
-  // Dynamic import to avoid circular dependency
-  const { useSpecStore } = await import('./specStore');
-  const specStore = useSpecStore.getState();
-  const specDetail = specStore.specDetail;
-
-  if (!specDetail) {
-    // No spec selected, skip persistence
-    return;
-  }
-
-  // Get current state from workflowStore
-  const workflowState = useWorkflowStore.getState();
-
-  // Build the autoExecution state object
-  // document-review-phase: documentReviewFlag removed - use permissions['document-review']
-  // inspection-permission-unification: inspectionFlag removed - use permissions.inspection
-  const autoExecutionState: SpecAutoExecutionState = {
-    enabled: true, // Enable when user explicitly changes settings
-    permissions: { ...workflowState.autoExecutionPermissions },
-    // documentReviewFlag removed - use permissions['document-review'] instead
-    // inspectionFlag removed - inspection permission is now handled via permissions.inspection
-  };
-
-  try {
-    // spec-path-ssot-refactor: Use spec.name instead of spec.path
-    await window.electronAPI.updateSpecJson(specDetail.metadata.name, {
-      autoExecution: autoExecutionState,
-    });
-    console.log('[workflowStore] Settings persisted to spec.json');
-  } catch (error) {
-    console.error('[workflowStore] Failed to persist settings to spec.json:', error);
-  }
-}
+// ============================================================
+// Bug Fix: auto-execution-flag-cross-spec-contamination
+// Removed persistSettingsToSpec() function
+// spec.json is now the Single Source of Truth for auto-execution settings
+// Settings are persisted directly via useElectronWorkflowState hook
+// ============================================================
```

#### 3. workflowStore.ts - toggleAutoPermission 修正 (Line 333-344)

```diff
       // Task 2.1: Auto Execution Permissions
-      // Bug Fix: auto-execution-settings-not-persisted - persist to spec.json
+      // Bug Fix: auto-execution-flag-cross-spec-contamination
+      // Removed persistSettingsToSpec() call - workflowStore now only manages global defaults
+      // Spec-scoped settings are persisted via useElectronWorkflowState hook
       toggleAutoPermission: (phase: WorkflowPhase) => {
         set((state) => ({
           autoExecutionPermissions: {
             ...state.autoExecutionPermissions,
             [phase]: !state.autoExecutionPermissions[phase],
           },
         }));
-        // Persist to spec.json after state update
-        persistSettingsToSpec();
       },
```

## Implementation Notes

### 設計原則の遵守
- **SSOT (Single Source of Truth)**: spec.json が自動実行設定の唯一の情報源として機能
- **関心の分離**:
  - workflowStore: グローバルデフォルト設定のみを保持
  - spec.json: Spec個別の自動実行設定を保持
- **DRY (Don't Repeat Yourself)**: 状態の二重管理を排除

### 影響範囲
- **UIレイヤー**: `useElectronWorkflowState` hook が既に spec.json から直接読み取っているため、UI側の変更は不要
- **状態管理**: workflowStore は本来の役割（グローバルデフォルト）のみに専念
- **Spec切り替え**: 各Specの自動実行設定が独立して管理され、クロスSpec汚染が解消

### 修正の根拠
auto-execution-ssot リファクタリング（spec-json-to-workflowstore-sync-missing修正）で導入された同期コードが、実際には設計意図に反してクロスSpec汚染を引き起こしていた。本修正により、元の設計意図（spec.json = SSOT）を完全に実現。

## Breaking Changes
- [x] No breaking changes

既存の動作を変更するものではなく、バグ修正により本来の設計通りの動作を実現。

## Rollback Plan
本修正をrevertする場合は、以下のコミットをrevertする：
```bash
git revert <commit-hash>
```

ただし、revertによりクロスSpec汚染のバグが再発するため、推奨しない。

## Related Commits
- 実装コミット: (次のコミットで追加予定)
