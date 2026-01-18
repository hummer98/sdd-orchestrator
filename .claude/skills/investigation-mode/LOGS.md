# ログファイル詳細

## 環境別ログパス

| ログ種別 | 開発環境 | 本番環境 (macOS) |
|----------|----------|------------------|
| グローバルログ | `electron-sdd-manager/logs/main.log` | `~/Library/Logs/sdd-orchestrator/main.log` |
| E2Eテストログ | `electron-sdd-manager/logs/main-e2e.log` | `~/Library/Logs/sdd-orchestrator/main-e2e.log` |
| プロジェクトログ | `{projectPath}/.kiro/logs/main.log` | 同左（プロジェクト内） |
| アプリ設定 | electron-store デフォルト | `~/Library/Application Support/sdd-orchestrator/config.json` |
| エージェント実行ログ | `.kiro/specs/{specId}/logs/{agentId}.log` | 同左（プロジェクト内） |
| SSH接続ログ | メモリ内バッファ（最大1000エントリ） | 同左 |

## ログフォーマット

- **形式**: `[ISO8601タイムスタンプ] [LEVEL] [projectId] [source] message data`
- **projectId**: プロジェクト選択時はプロジェクトパス、未選択時は `global`
- **source**: `main`（メインプロセス）または `renderer`（レンダラープロセス）
- **ログレベル**: DEBUG, INFO, WARN, ERROR
- **エージェントログ**: JSONL形式（JSON Lines）

### ログ出力例

```
[2026-01-07T10:15:32.456Z] [ERROR] [/Users/yamamoto/git/myproject] [renderer] フェーズの実行に失敗しました {"specId":"feature-auth"}
[2026-01-07T10:15:32.512Z] [ERROR] [/Users/yamamoto/git/myproject] [main] executePhase failed {"error":{"type":"SPAWN_ERROR"}}
```

## プロジェクト別ログ

プロジェクトを開くと、そのプロジェクト専用のログファイルが作成される。

- **保存場所**: `{projectPath}/.kiro/logs/main.log`
- **グローバルログとの二重書き込み**: プロジェクト関連のログはプロジェクトログとグローバルログの両方に記録
- **ローテーション**: 10MBまたは日付変更でローテーション（`main.YYYY-MM-DD.N.log`）
- **自動削除**: 30日経過したログファイルは自動削除

## ログ確認コマンド

### 本番環境

```bash
# グローバルログファイルを確認
cat ~/Library/Logs/sdd-orchestrator/main.log

# リアルタイムで監視
tail -f ~/Library/Logs/sdd-orchestrator/main.log

# エラーのみ抽出
grep "\[ERROR\]" ~/Library/Logs/sdd-orchestrator/main.log

# rendererエラーのみ抽出
grep "\[renderer\].*\[ERROR\]" ~/Library/Logs/sdd-orchestrator/main.log

# プロジェクトログをリアルタイム監視
tail -f /path/to/project/.kiro/logs/main.log
```

### E2Eテスト

```bash
# E2Eテストログをリアルタイム監視
tail -f ~/Library/Logs/sdd-orchestrator/main-e2e.log

# エラーのみ抽出
grep "\[ERROR\]" ~/Library/Logs/sdd-orchestrator/main-e2e.log

# AutoExecution関連のログを確認
grep -E "(AutoExecution|ALREADY_EXECUTING)" ~/Library/Logs/sdd-orchestrator/main-e2e.log

# テスト実行前にログをクリア（任意）
: > ~/Library/Logs/sdd-orchestrator/main-e2e.log
```

### task コマンド

| コマンド | 説明 |
|----------|------|
| `task logs:agent` | Agent出力を人間が読みやすい形式で表示（最新50件） |
| `task logs:agent:verbose` | Agent出力を詳細表示（ツール入力含む） |
| `task logs:agent:all` | 全てのAgent出力を表示 |
| `task logs:main` | メインプロセスログを表示 |

## Rendererログ調査

ユーザーから「エラートーストが出た」との報告があった場合：

```bash
# rendererからのエラーを抽出
grep "\[renderer\]" /path/to/project/.kiro/logs/main.log | grep "\[ERROR\]"

# 特定specのログを抽出
grep "specId.*feature-name" /path/to/project/.kiro/logs/main.log

# 特定bugのログを抽出
grep "bugName.*bug-name" /path/to/project/.kiro/logs/main.log

# main/renderer両方のエラーを時系列で確認
grep "\[ERROR\]" /path/to/project/.kiro/logs/main.log | tail -50
```

## MCP経由でのログ参照

| ツール | 用途 |
|--------|------|
| `mcp__electron__read_electron_logs` | Electronシステムログ（consoleログのみ実用的） |
| `mcp__electron__send_command_to_electron` | `console.log`経由でrendererログ取得 |
| `Read` tool | mainプロセスログファイル直接参照（推奨） |

## ログ実装詳細

- **ロガー実装**: ProjectLogger（カスタム実装、electron-log未使用）
- **ソース**:
  - `electron-sdd-manager/src/main/services/projectLogger.ts` - プロジェクト対応ロガー
  - `electron-sdd-manager/src/main/services/logRotationManager.ts` - ローテーション管理
- **本番判定**: `app.isPackaged` でパッケージ版かを判定
- **ログローテーション**: 10MB/日付単位でローテーション、30日保持
