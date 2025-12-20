# Bug Fix: permission-warning-fix-button

## Summary
パーミッション不足の警告エリアに「パーミッションを追加」ボタンを追加。ボタン押下でパーミッションを自動追加し、警告が消える機能を実装。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/ProjectSelector.tsx` | `PermissionsCheckSection`にFixボタンを追加 |
| `electron-sdd-manager/src/renderer/stores/projectStore.ts` | `fixPermissions`アクションと`permissionsFixLoading`状態を追加 |

### Code Changes

#### ProjectSelector.tsx - PermissionsCheckSectionの拡張

```diff
 interface PermissionsCheckSectionProps {
   check: {
     allPresent: boolean;
     missing: readonly string[];
     present: readonly string[];
   };
+  loading: boolean;
+  onFix: () => void;
 }

-function PermissionsCheckSection({ check }: PermissionsCheckSectionProps) {
+function PermissionsCheckSection({ check, loading, onFix }: PermissionsCheckSectionProps) {
```

#### ProjectSelector.tsx - ボタンの追加

```diff
         {check.missing.map((permission) => (
           <div key={permission}>{permission}</div>
         ))}
       </div>
-      <div className="text-xs text-gray-600 dark:text-gray-400 pl-6">
-        CC-SDD WORKFLOWをインストールすると、必要なパーミッションが自動的に追加されます。
-      </div>
+      <button
+        onClick={onFix}
+        disabled={loading}
+        className={clsx(...)}
+        aria-label="パーミッションを追加"
+      >
+        {loading ? (
+          <><Loader2 className="w-3 h-3 animate-spin" />追加中...</>
+        ) : (
+          <><Download className="w-3 h-3" />パーミッションを追加</>
+        )}
+      </button>
```

#### projectStore.ts - 状態とアクションの追加

```diff
 interface ProjectState {
   // ...
   permissionsCheck: PermissionsCheckResult | null;
+  permissionsFixLoading: boolean;
 }

 interface ProjectActions {
   // ...
   addShellPermissions: () => Promise<AddPermissionsResult | null>;
+  fixPermissions: () => Promise<void>;
 }

+  /**
+   * Fix missing permissions by adding them and refreshing the check
+   */
+  fixPermissions: async () => {
+    const { currentProject } = get();
+    if (!currentProject) return;
+
+    set({ permissionsFixLoading: true });
+
+    try {
+      await window.electronAPI.addShellPermissions(currentProject);
+      const permissionsCheck = await window.electronAPI.checkRequiredPermissions(currentProject);
+      set({ permissionsCheck, permissionsFixLoading: false });
+    } catch (error) {
+      console.error('[projectStore] Failed to fix permissions:', error);
+      set({ permissionsFixLoading: false });
+    }
+  },
```

## Implementation Notes
- 既存の`addShellPermissions` IPC呼び出しを活用
- `SpecManagerFilesSection`と同様のボタンUIパターンを採用
- ボタン押下後に自動的にパーミッションチェックを再実行し、警告を消す

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `PermissionsCheckSection`を元のpropsに戻す
2. `projectStore`から`permissionsFixLoading`と`fixPermissions`を削除
3. `ProjectSelector`から`permissionsFixLoading`と`fixPermissions`の取得を削除

## Test Results
- TypeScriptコンパイル: 成功
- projectStore.test.ts: 11テスト全て成功
