# Bug Analysis: recent-projects-menu-not-opening

## Summary
メニューバーの「最近のプロジェクト」を選択しても、プロジェクトが開かれない問題。メニューからのIPCイベントがレンダラー側で受信されていないことが原因。

## Root Cause

### Technical Details
- **Location**:
  - メイン: [src/main/menu.ts:33](electron-sdd-manager/src/main/menu.ts#L33) - メッセージ送信
  - 不足: [src/preload/index.ts](electron-sdd-manager/src/preload/index.ts) - リスナー登録メソッド未定義
  - 不足: [src/main/ipc/channels.ts](electron-sdd-manager/src/main/ipc/channels.ts) - チャンネル定数未定義
  - 不足: [src/renderer/App.tsx](electron-sdd-manager/src/renderer/App.tsx) - イベントリスナー未設定
- **Component**: メニュー → IPC通信 → レンダラー
- **Trigger**: ファイル > 最近のプロジェクト から項目を選択

### 問題のコード

**menu.ts:30-35** - メッセージを送信するが...
```typescript
click: () => {
  const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (window) {
    window.webContents.send('menu:open-project', projectPath);  // ← 送信
  }
},
```

**channels.ts** - `MENU_OPEN_PROJECT` が未定義
```typescript
// Menu Events
MENU_FORCE_REINSTALL: 'menu:force-reinstall',
// MENU_OPEN_PROJECT: 'menu:open-project',  ← これが無い！
MENU_ADD_SHELL_PERMISSIONS: 'menu:add-shell-permissions',
```

**preload/index.ts** - `onMenuOpenProject` が未定義
```typescript
// MENU_FORCE_REINSTALL と MENU_ADD_SHELL_PERMISSIONS はある
onMenuForceReinstall: (callback) => { ... },
onMenuAddShellPermissions: (callback) => { ... },
// onMenuOpenProject: (callback) => { ... },  ← これが無い！
```

**App.tsx** - リスナーが未設定
```typescript
// forceReinstall と addShellPermissions のリスナーはある
const cleanupForceReinstall = window.electronAPI.onMenuForceReinstall(() => { ... });
const cleanupAddPermissions = window.electronAPI.onMenuAddShellPermissions(async () => { ... });
// onMenuOpenProject のリスナーが無い！
```

## Impact Assessment
- **Severity**: High
- **Scope**: 最近のプロジェクトを開く機能が完全に動作しない
- **Risk**: ユーザーは毎回プロジェクトディレクトリを手動で選択する必要がある

## Proposed Solution

### Option 1: IPC通信パイプラインを完成させる（推奨）
他のメニューイベント（`MENU_FORCE_REINSTALL`、`MENU_ADD_SHELL_PERMISSIONS`）と同じパターンで実装する。

1. **channels.ts**: `MENU_OPEN_PROJECT: 'menu:open-project'` を追加
2. **preload/index.ts**: `onMenuOpenProject` メソッドを追加
3. **App.tsx**: リスナーを設定し、`selectProject` を呼び出す

- Pros:
  - 既存パターンに準拠
  - 型安全性が維持される
  - テスト可能
- Cons:
  - 3ファイルの変更が必要

### Recommended Approach
Option 1を採用。既存の `onMenuForceReinstall` パターンを踏襲することで、一貫性のあるコードベースを維持する。

## Dependencies
- [useProjectStore](electron-sdd-manager/src/renderer/stores/projectStore.ts) - `selectProject` メソッド

## Testing Strategy
1. アプリを起動し、プロジェクトを開く
2. ファイル > 最近のプロジェクト を確認（履歴に追加されていること）
3. アプリを再起動
4. ファイル > 最近のプロジェクト から項目を選択
5. 選択したプロジェクトが正しく開かれることを確認
