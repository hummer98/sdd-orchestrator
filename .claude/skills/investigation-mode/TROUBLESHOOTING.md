# トラブルシューティング

## Electronアプリ

### ELECTRON_RUN_AS_NODE問題

**症状**: Electronアプリ起動時に`TypeError: Cannot read properties of undefined (reading 'whenReady')`エラーが発生

**原因**: Claude CodeなどのElectronベースIDEから実行すると、`ELECTRON_RUN_AS_NODE`環境変数が設定され、ElectronがNode.jsモードで動作してしまう。

**解決策**: `scripts/electron-app.sh`で`unset ELECTRON_RUN_AS_NODE`を実行してから起動する（既に対応済み）。

**参考**: [GitHub Issue #8200](https://github.com/electron/electron/issues/8200)

### アプリが起動しない

1. `task electron:status` で状態確認
2. `task electron:stop` で強制停止
3. `task electron:start` で再起動
4. ログを確認: `task electron:logs`

### ビルドエラー

確認項目：
- Node.jsバージョン
- 依存関係のインストール: `npm install`
- TypeScriptコンパイル: `npm run build`

## E2Eテスト

### テストが失敗する

1. アプリがビルドされているか確認: `task electron:build`
2. `task electron:test:e2e` の出力を確認
3. E2Eログを確認: `~/Library/Logs/sdd-orchestrator/main-e2e.log`

### E2Eテストログの分離

`--e2e-test` フラグで起動されたインスタンスは `main-e2e.log` に出力されるため、通常のアプリインスタンスのログと混在しない。

## IPC通信

### IPCが動作しない

1. チャンネル名が一致しているか確認
2. preloadでexposeされているか確認
3. mainプロセスでハンドラーが登録されているか確認

### IPC関連ファイル

- `electron-sdd-manager/src/preload/index.ts` - API定義
- `electron-sdd-manager/src/main/ipc/` - ハンドラー実装

## MCP経由のUI操作

### メニュー操作の制限

メニューバー（File, Edit等）のクリックはMCPでは不可。代わりにIPC直接呼び出しを使用：

```javascript
// MCP send_command_to_electron で IPC直接呼び出し
command: "eval"
args: { "code": "window.electronAPI.selectProject('/path/to/project')" }
```

### Promise操作の注意

MCPの`eval`コマンドは同期的な戻り値のみを正しく返す。Promiseを返すAPIは特別な対応が必要：

```javascript
// ステップ1: Promiseを解決して変数に保存
command: "eval"
args: { "code": "window.electronAPI.getRemoteServerStatus().then(r => { window.__result = r; })" }

// ステップ2: 変数を読み取る
command: "eval"
args: { "code": "window.__result" }
```

## テスト時のプロジェクト指定

E2Eテストや動作確認時は、以下のディレクトリを起動時引数で指定：

```bash
# 起動時にプロジェクトパスを指定（推奨）
task electron:start PROJECT=/Users/yamamoto/git/sdd-orchestrator

# フォアグラウンドで起動する場合
task electron:dev PROJECT=/Users/yamamoto/git/sdd-orchestrator
```

## 正常系の操作手順

MCP経由でのUI操作、プロジェクト選択、Remote UI起動などの正常系手順は `.kiro/steering/operations.md` を参照。
