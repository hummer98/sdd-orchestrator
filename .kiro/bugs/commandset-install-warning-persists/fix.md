# Bug Fix: commandset-install-warning-persists

## Summary
コマンドセットインストール完了後に `checkSpecManagerFiles` を呼び出すことで、UI状態を即座に更新するよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [electron-sdd-manager/src/renderer/App.tsx](electron-sdd-manager/src/renderer/App.tsx) | `checkSpecManagerFiles` をストアから取得し、インストール成功後に呼び出し |

### Code Changes

**1. useProjectStore から checkSpecManagerFiles を追加取得 (68行目)**
```diff
- const { currentProject, kiroValidation, loadInitialProject, loadRecentProjects, selectProject } = useProjectStore();
+ const { currentProject, kiroValidation, loadInitialProject, loadRecentProjects, selectProject, checkSpecManagerFiles } = useProjectStore();
```

**2. onInstall ハンドラーで checkSpecManagerFiles を呼び出し (702-703行目)**
```diff
  const { summary } = result.value;
  console.log(`[App] Commandset installed successfully:`, summary);

+ // Refresh spec-manager files check to update UI (bug fix: commandset-install-warning-persists)
+ await checkSpecManagerFiles(currentProject);

  // Return summary for the dialog to display
  return {
    totalInstalled: summary.totalInstalled,
    totalSkipped: summary.totalSkipped,
    totalFailed: summary.totalFailed,
  };
```

## Implementation Notes
- `checkSpecManagerFiles` は既存の `projectStore` のメソッドを再利用
- IPC呼び出し (`window.electronAPI.checkSpecManagerFiles`) で最新の状態を取得
- 結果は `specManagerCheck` 状態に保存され、`ProjectValidationPanel` が自動更新

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `App.tsx` の68行目から `checkSpecManagerFiles` を削除
2. 702-703行目の `await checkSpecManagerFiles(currentProject);` とコメントを削除

## Test Results
- CommandsetInstallDialog tests: 36/36 passed
- TypeScript type check: passed
