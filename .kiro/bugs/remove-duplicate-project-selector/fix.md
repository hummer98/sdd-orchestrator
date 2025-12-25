# Bug Fix: remove-duplicate-project-selector

## Summary
`ProjectSelector`コンポーネントを`ProjectValidationPanel`にリネームし、重複していたプロジェクト選択UI（選択ボタン、パス表示）を削除。バリデーション表示機能のみを維持。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `components/ProjectValidationPanel.tsx` | 新規作成。選択UIを削除し、バリデーション表示のみに特化 |
| `components/index.ts` | エクスポート名を`ProjectValidationPanel`に変更 |
| `App.tsx` | インポート・使用箇所を`ProjectValidationPanel`に変更 |
| `components/ProjectValidationPanel.test.tsx` | 新規作成。テストを更新 |

### Files Deleted
| File | Reason |
|------|--------|
| `components/ProjectSelector.tsx` | リネームにより不要 |
| `components/ProjectSelector.specManager.test.tsx` | リネームにより不要 |

### Code Changes

#### ProjectValidationPanel.tsx（主要変更部分）

```diff
- export function ProjectSelector() {
+ export function ProjectValidationPanel() {
    const {
-     currentProject,
      kiroValidation,
-     isLoading,
-     selectProject,
      // spec-manager extensions
      specManagerCheck,
      ...
    } = useProjectStore();
-   const { loadSpecs } = useSpecStore();
-
-   const handleSelectProject = async () => {
-     const path = await window.electronAPI.showOpenDialog();
-     if (path) {
-       await selectProject(path);
-       await loadSpecs(path);
-     }
-   };

+   // Check if there's anything to display
+   const hasKiroIssues = kiroValidation && !(kiroValidation.exists && ...);
+   const hasSpecManagerIssues = specManagerCheck && !specManagerCheck.allPresent;
+   const hasPermissionIssues = permissionsCheck && !permissionsCheck.allPresent;
+
+   // If nothing to display, render nothing
+   if (!hasKiroIssues && !hasSpecManagerIssues && !hasPermissionIssues) {
+     return null;
+   }

    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
-       <div className="flex items-center gap-2 mb-2">
-         <FolderOpen className="w-5 h-5 text-gray-500" />
-         <h2 className="font-semibold text-gray-700 dark:text-gray-300">
-           プロジェクト
-         </h2>
-       </div>
-
-       <button onClick={handleSelectProject} ...>
-         {/* プロジェクト選択ボタン */}
-       </button>
-
-       {currentProject && (
-         <div className="mt-2 text-xs text-gray-500 truncate">
-           {currentProject}
-         </div>
-       )}
-
        {/* バリデーション表示は維持 */}
        ...
```

#### index.ts

```diff
- export { ProjectSelector } from './ProjectSelector';
+ export { ProjectValidationPanel } from './ProjectValidationPanel';
```

#### App.tsx

```diff
- ProjectSelector,
+ ProjectValidationPanel,

- {/* 1. ProjectSelector (プロジェクト選択とパーミッションチェック) */}
- <ProjectSelector />
+ {/* 1. ProjectValidationPanel (バリデーション表示のみ、問題がある場合に表示) */}
+ <ProjectValidationPanel />
```

## Implementation Notes
- コンポーネントは問題がない場合は`null`を返し、何もレンダリングしない（ノイズ削減）
- 不要になったimport（`FolderOpen`、`useSpecStore`）を削除
- `handleSelectProject`関数と関連state参照を削除
- バリデーション表示、spec-managerファイルチェック、パーミッションチェックの機能は維持

## Breaking Changes
- [x] Breaking changes (documented below)

**破壊的変更**:
- `ProjectSelector`コンポーネントは削除され、`ProjectValidationPanel`に置き換えられた
- 外部からProjectSelectorをインポートしているコードがあれば修正が必要

## Rollback Plan
1. `ProjectValidationPanel.tsx`を削除
2. `ProjectSelector.tsx`を復元（gitから）
3. `index.ts`のエクスポートを元に戻す
4. `App.tsx`のインポート・使用箇所を元に戻す

```bash
git checkout HEAD -- electron-sdd-manager/src/renderer/components/ProjectSelector.tsx
git checkout HEAD -- electron-sdd-manager/src/renderer/components/ProjectSelector.specManager.test.tsx
```

## Test Results
```
✓ src/renderer/components/ProjectValidationPanel.test.tsx (17 tests) 68ms

Test Files  1 passed (1)
     Tests  17 passed (17)
```

## Related Commits
- *To be added after commit*
