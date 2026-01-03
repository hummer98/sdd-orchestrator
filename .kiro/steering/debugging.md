# Debugging Guide

このドキュメントはデバッグ・動作確認時に参照する詳細情報を含みます。
通常の開発時には不要なコンテキストであり、`debug` agentから参照されます。

## ログ保存場所

### 環境別ログパス

| ログ種別 | 開発環境 | 本番環境 (macOS) |
|----------|----------|------------------|
| グローバルログ | `electron-sdd-manager/logs/main.log` | `~/Library/Logs/SDD Orchestrator/main.log` |
| **E2Eテストログ** | `electron-sdd-manager/logs/main-e2e.log` | `~/Library/Logs/SDD Orchestrator/main-e2e.log` |
| **プロジェクトログ** | `{projectPath}/.kiro/logs/main.log` | 同左（プロジェクト内） |
| アプリ設定 | electron-store デフォルト | `~/Library/Application Support/sdd-orchestrator/config.json` |
| エージェント実行ログ | `.kiro/specs/{specId}/logs/{agentId}.log` | 同左（プロジェクト内） |
| SSH接続ログ | メモリ内バッファ（最大1000エントリ） | 同左 |

**E2Eテストログの分離**: `--e2e-test` フラグで起動されたインスタンスは `main-e2e.log` に出力されるため、通常のアプリインスタンスのログと混在しない。

### プロジェクト別ログ（project-log-separation機能）

プロジェクトを開くと、そのプロジェクト専用のログファイルが作成される。

- **保存場所**: `{projectPath}/.kiro/logs/main.log`
- **グローバルログとの二重書き込み**: プロジェクト関連のログはプロジェクトログとグローバルログの両方に記録
- **ローテーション**: 10MBまたは日付変更でローテーション（`main.YYYY-MM-DD.N.log`）
- **自動削除**: 30日経過したログファイルは自動削除

#### UIからのアクセス

```typescript
// プロジェクトログパスを取得
const logPath = await window.electronAPI.getProjectLogPath();

// ログディレクトリをファイルブラウザで開く
await window.electronAPI.openLogInBrowser();
```

### ログフォーマット

- **形式**: `[ISO8601タイムスタンプ] [LEVEL] [projectId] message data`
- **projectId**: プロジェクト選択時はプロジェクトパス、未選択時は `global`
- **ログレベル**: DEBUG, INFO, WARN, ERROR
- **エージェントログ**: JSONL形式（JSON Lines）

### 本番環境でのログ確認

```bash
# グローバルログファイルを確認
cat ~/Library/Logs/SDD\ Orchestrator/main.log

# リアルタイムで監視
tail -f ~/Library/Logs/SDD\ Orchestrator/main.log

# エラーのみ抽出
grep "\[ERROR\]" ~/Library/Logs/SDD\ Orchestrator/main.log

# 最新100行を確認
tail -100 ~/Library/Logs/SDD\ Orchestrator/main.log

# プロジェクトログを確認（プロジェクトパスを指定）
cat /path/to/project/.kiro/logs/main.log

# 特定プロジェクトのログをリアルタイム監視
tail -f /path/to/project/.kiro/logs/main.log
```

### E2Eテスト時のログ確認

E2Eテストは `--e2e-test` フラグ付きでパッケージ済みアプリを起動するため、専用のログファイルに出力される。

```bash
# E2Eテストログをリアルタイム監視（テスト実行中に別ターミナルで）
tail -f ~/Library/Logs/SDD\ Orchestrator/main-e2e.log

# 最新200行を確認
tail -200 ~/Library/Logs/SDD\ Orchestrator/main-e2e.log

# エラーのみ抽出
grep "\[ERROR\]" ~/Library/Logs/SDD\ Orchestrator/main-e2e.log

# AutoExecution関連のログを確認
grep -E "(AutoExecution|ALREADY_EXECUTING)" ~/Library/Logs/SDD\ Orchestrator/main-e2e.log

# テスト実行前にログをクリア（任意）
: > ~/Library/Logs/SDD\ Orchestrator/main-e2e.log
```

### ログ実装詳細

- **ロガー実装**: ProjectLogger（カスタム実装、electron-log未使用）
- **ソース**:
  - [projectLogger.ts](electron-sdd-manager/src/main/services/projectLogger.ts) - プロジェクト対応ロガー
  - [logRotationManager.ts](electron-sdd-manager/src/main/services/logRotationManager.ts) - ローテーション管理
  - [logger.ts](electron-sdd-manager/src/main/services/logger.ts) - 旧ロガー（互換性維持）
- **本番判定**: `app.isPackaged` でパッケージ版かを判定
- **ログローテーション**: 10MB/日付単位でローテーション、30日保持

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

| ツール                                    | 用途                                          |
| ----------------------------------------- | --------------------------------------------- |
| `mcp__electron__read_electron_logs`       | Electronシステムログ（consoleログのみ実用的） |
| `mcp__electron__send_command_to_electron` | `console.log`経由でrendererログ取得           |
| `Read` tool                               | mainプロセスログファイル直接参照（推奨）      |

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
cd electron-sdd-manager && npm run dev -- /Users/yamamoto/git/sdd-orchestrator
```

これにより、アプリ起動時に自動的にプロジェクトが選択された状態になる。

## 正常系の操作手順

MCP経由でのUI操作、プロジェクト選択、Remote UI起動などの正常系手順は `.kiro/steering/operations.md` を参照。
