# Debugging Guide

このドキュメントはデバッグ・動作確認時に参照する詳細情報を含みます。
通常の開発時には不要なコンテキストであり、`debug` agentから参照されます。

## MCP経由でのログ参照

Electron MCPツールでは`mcp__electron__read_electron_logs`が利用可能だが、これはシステム全体のElectronプロセスログを取得するため、アプリ固有のログは取得できない。

### アプリ固有のmainプロセスログを参照する方法

```bash
# mainプロセスログを直接参照
Read tool: /Users/yamamoto/git/sdd-orchestrator/logs/electron-dev.log

# 特定のIPCハンドラーの動作確認
tail -20 logs/electron-dev.log | grep -E "(CHECK_AGENT|DELETE_AGENT)"
```

### MCP経由で利用可能なログ関連ツール

| ツール | 用途 |
|--------|------|
| `mcp__electron__read_electron_logs` | Electronシステムログ（consoleログのみ実用的） |
| `mcp__electron__send_command_to_electron` | `console.log`経由でrendererログ取得 |
| `Read` tool | mainプロセスログファイル直接参照（推奨） |

## MCP経由でのUI操作

メニューバーからのダイアログ操作はMCPでは直接トリガーできない。代わりにIPCを直接呼び出すか、rendererのJavaScript経由で操作する。

### 推奨アプローチ

```javascript
// MCP send_command_to_electron で IPC直接呼び出し
// 例: agentフォルダ存在確認
command: "eval"
args: { "code": "window.electronAPI.checkAgentFolderExists('/path/to/project')" }

// 例: agentフォルダ削除
command: "eval"
args: { "code": "window.electronAPI.deleteAgentFolder('/path/to/project')" }
```

### メニュー操作が必要な場合

- ダイアログを開くボタンをクリック: `click_by_text` または `click_by_selector`
- ページ構造を確認: `get_page_structure` または `debug_elements`

### 制限事項

- メニューバー（File, Edit等）のクリックはMCPでは不可
- ダイアログ内のボタン操作は可能

## Troubleshooting

### ELECTRON_RUN_AS_NODE問題

**症状**: Electronアプリ起動時に`TypeError: Cannot read properties of undefined (reading 'whenReady')`エラーが発生

**原因**: Claude CodeなどのElectronベースIDEから実行すると、`ELECTRON_RUN_AS_NODE`環境変数が設定され、ElectronがNode.jsモードで動作してしまう。この状態では`require("electron")`がAPIオブジェクトではなくパス文字列を返す。

**解決策**: `scripts/electron-app.sh`で`unset ELECTRON_RUN_AS_NODE`を実行してから起動する（既に対応済み）。

**参考**: [GitHub Issue #8200](https://github.com/electron/electron/issues/8200), [Stack Overflow](https://stackoverflow.com/questions/45274548/node-js-require-returns-a-string-instead-of-module-object)

## ログ表示コマンド詳細

| コマンド                  | 説明                                              |
| ------------------------- | ------------------------------------------------- |
| `task logs:agent`         | Agent出力を人間が読みやすい形式で表示（最新50件） |
| `task logs:agent:verbose` | Agent出力を詳細表示（ツール入力含む）             |
| `task logs:agent:all`     | 全てのAgent出力を表示                             |
| `task logs:main`          | メインプロセスログを表示                          |

オプション: `-n 100`（行数指定）、`-v`（詳細）、`-a`（全て）

## テスト時のプロジェクト指定

E2Eテストや動作確認時は、以下のディレクトリを起動時引数で指定する：

```bash
# 起動時にプロジェクトパスを指定（推奨）
task electron:start PROJECT=/Users/yamamoto/git/sdd-orchestrator

# フォアグラウンドで起動する場合
task electron:dev PROJECT=/Users/yamamoto/git/sdd-orchestrator

# または npm run dev で直接指定
cd electron-sdd-manager && npm run dev -- /Users/yamamoto/git/sdd-manager
```

これにより、アプリ起動時に自動的にプロジェクトが選択された状態になる。
