# Bug Fix: spec-agent-migration-dialog-not-shown

## Summary
SpecDetailコンポーネントにMigrationDialogの統合処理を追加し、Spec選択時にlegacyログのマイグレーションが必要な場合にダイアログが表示されるようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| electron-sdd-manager/src/renderer/components/SpecDetail.tsx | MigrationDialogのimport、状態管理、useEffectによるcheckMigrationNeeded呼び出し、ダイアログレンダリングを追加 |

### Code Changes

#### 1. Import文の追加

```diff
+import { useState, useEffect } from 'react';
+import { useSpecStore, useProjectStore } from '../stores';
+import { MigrationDialog } from '@shared/components/migration';
```

#### 2. MigrationDialog状態管理の追加

```diff
 export function SpecDetail() {
   const { selectedSpec, specDetail, isLoading } = useSpecStore();
+  const { currentProject: projectPath } = useProjectStore();
+
+  // runtime-agents-restructure: Task 10.3 - MigrationDialog state management
+  const [migrationDialogState, setMigrationDialogState] = useState<{
+    isOpen: boolean;
+    specId: string;
+    fileCount: number;
+    totalSize: number;
+    isProcessing: boolean;
+    error?: string;
+  } | null>(null);
```

#### 3. useEffectによるマイグレーションチェック処理

```diff
+  // runtime-agents-restructure: Task 10.3 - Check migration on spec selection
+  useEffect(() => {
+    if (!selectedSpec || !projectPath) {
+      return;
+    }
+
+    const checkMigration = async () => {
+      try {
+        const migrationInfo = await window.electronAPI.checkMigrationNeeded(projectPath, selectedSpec);
+        if (migrationInfo) {
+          setMigrationDialogState({
+            isOpen: true,
+            specId: migrationInfo.specId,
+            fileCount: migrationInfo.fileCount,
+            totalSize: migrationInfo.totalSize,
+            isProcessing: false,
+          });
+        }
+      } catch (error) {
+        console.error('Failed to check migration:', error);
+      }
+    };
+
+    void checkMigration();
+  }, [selectedSpec, projectPath]);
```

#### 4. マイグレーションハンドラの追加

```diff
+  // runtime-agents-restructure: Task 10.3 - Migration handlers
+  const handleAcceptMigration = async (specId: string) => {
+    if (!projectPath || !migrationDialogState) return;
+
+    setMigrationDialogState({ ...migrationDialogState, isProcessing: true, error: undefined });
+
+    try {
+      const result = await window.electronAPI.acceptMigration(projectPath, specId);
+      if (result.ok) {
+        // Close dialog on success
+        setMigrationDialogState(null);
+      } else {
+        setMigrationDialogState({ ...migrationDialogState, isProcessing: false, error: result.error });
+      }
+    } catch (error) {
+      setMigrationDialogState({
+        ...migrationDialogState,
+        isProcessing: false,
+        error: error instanceof Error ? error.message : 'Migration failed',
+      });
+    }
+  };
+
+  const handleDeclineMigration = async (specId: string) => {
+    if (!projectPath) return;
+
+    try {
+      await window.electronAPI.declineMigration(projectPath, specId);
+      setMigrationDialogState(null);
+    } catch (error) {
+      console.error('Failed to decline migration:', error);
+    }
+  };
+
+  const handleCloseMigration = () => {
+    setMigrationDialogState(null);
+  };
```

#### 5. MigrationDialogコンポーネントのレンダリング

```diff
   return (
+    <>
+      {/* runtime-agents-restructure: Task 10.3 - MigrationDialog */}
+      {migrationDialogState && (
+        <MigrationDialog
+          isOpen={migrationDialogState.isOpen}
+          specId={migrationDialogState.specId}
+          fileCount={migrationDialogState.fileCount}
+          totalSize={migrationDialogState.totalSize}
+          isProcessing={migrationDialogState.isProcessing}
+          error={migrationDialogState.error}
+          onAccept={handleAcceptMigration}
+          onDecline={handleDeclineMigration}
+          onClose={handleCloseMigration}
+        />
+      )}
+
       <div className="p-6 space-y-6">
         {/* Implementation Ready Badge */}
         ...
       </div>
+    </>
   );
 }
```

## Implementation Notes

### 設計判断
- **Spec選択時のチェック**: useEffectを使用して、Spec選択時（selectedSpecまたはprojectPath変更時）に自動的にcheckMigrationNeededを呼び出す設計
- **状態管理**: MigrationDialogの状態（isOpen, specId, fileCount, totalSize, isProcessing, error）をローカルstateで管理
- **エラーハンドリング**: マイグレーション失敗時はエラーメッセージをダイアログ上に表示し、ダイアログは開いたまま維持

### 既存の実装との統合
- MigrationDialogコンポーネント、MigrationService、IPCハンドラは既に実装済み
- SpecDetailコンポーネントにUI統合処理を追加することで、runtime-agents-restructure機能のTask 10.3を完了

### Requirements対応
- **Requirement 5.1**: Spec選択時にlegacyログの存在を自動チェック
- **Requirement 5.3**: MigrationDialogをUIに統合
- **Requirement 5.4**: ダイアログでマイグレーションの承認/拒否を実行

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
SpecDetail.tsxを以前のコミットに戻すことで、MigrationDialog統合機能を無効化できる。

## Related Commits
- (This commit will be created after fix completion)
