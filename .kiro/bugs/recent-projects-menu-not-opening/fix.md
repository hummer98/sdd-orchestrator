# Bug Fix: recent-projects-menu-not-opening

## Summary
メニューの「最近のプロジェクト」から項目を選択した際にプロジェクトが開かれない問題を修正。IPC通信パイプラインの欠落部分を補完した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/ipc/channels.ts` | `MENU_OPEN_PROJECT` チャンネル定数を追加 |
| `electron-sdd-manager/src/preload/index.ts` | `onMenuOpenProject` リスナー登録メソッドを追加 |
| `electron-sdd-manager/src/main/menu.ts` | ハードコードされた文字列をチャンネル定数に置換 |
| `electron-sdd-manager/src/renderer/App.tsx` | `onMenuOpenProject` イベントリスナーを設定 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | `onMenuOpenProject` の型定義を追加 |

### Code Changes

**channels.ts** - チャンネル定数追加
```diff
  // Menu Events
  MENU_FORCE_REINSTALL: 'menu:force-reinstall',
+ MENU_OPEN_PROJECT: 'menu:open-project',
```

**preload/index.ts** - リスナー登録メソッド追加
```diff
+ // Menu Events - Open Project (from Recent Projects menu)
+ onMenuOpenProject: (callback: (projectPath: string) => void): (() => void) => {
+   const handler = (_event: Electron.IpcRendererEvent, projectPath: string) => {
+     callback(projectPath);
+   };
+   ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_PROJECT, handler);
+
+   // Return cleanup function
+   return () => {
+     ipcRenderer.removeListener(IPC_CHANNELS.MENU_OPEN_PROJECT, handler);
+   };
+ },
```

**menu.ts** - チャンネル定数使用
```diff
- window.webContents.send('menu:open-project', projectPath);
+ window.webContents.send(IPC_CHANNELS.MENU_OPEN_PROJECT, projectPath);
```

**App.tsx** - イベントリスナー設定
```diff
- const { forceReinstallAll, addShellPermissions } = useProjectStore();
+ const { forceReinstallAll, addShellPermissions, selectProject } = useProjectStore();

+ const cleanupOpenProject = window.electronAPI.onMenuOpenProject(async (projectPath: string) => {
+   console.log(`[App] Opening project from menu: ${projectPath}`);
+   await selectProject(projectPath);
+   await loadSpecs(projectPath);
+ });

  return () => {
    menuListenersSetup.current = false;
    cleanupForceReinstall();
    cleanupAddPermissions();
+   cleanupOpenProject();
  };
```

**electron.d.ts** - 型定義追加
```diff
  // Menu Events
  onMenuForceReinstall(callback: () => void): () => void;
  onMenuAddShellPermissions(callback: () => void): () => void;
+ onMenuOpenProject(callback: (projectPath: string) => void): () => void;
```

## Implementation Notes
- 既存の `onMenuForceReinstall` / `onMenuAddShellPermissions` パターンに準拠
- `selectProject` と `loadSpecs` を呼び出してプロジェクトを完全に読み込む
- 型安全性を維持するため `electron.d.ts` も更新

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. 各ファイルの変更を `git checkout` で元に戻す
2. または、以下の追加部分を削除:
   - `MENU_OPEN_PROJECT` 定数
   - `onMenuOpenProject` メソッド
   - App.tsx内のリスナー設定

## Related Commits
- *コミット前*
