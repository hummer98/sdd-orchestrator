---
name: investigation-mode
description: >
  システム調査・デバッグ支援モード。
  「調査して」「問題を特定して」「ログを確認して」「デバッグして」
  「エラーの原因は？」「なぜ動かない？」などのキーワードで自動検出。
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash
---

# Investigation Mode - システム調査・デバッグ支援

このSkillはシステム調査・デバッグ時に自動的に調査方法をガイドします。

## 調査の優先順位

1. **ログ確認を最優先**
2. **サービス状態の確認**
3. **設定・環境変数の確認**
4. **コード調査**

---

## ログファイルの位置

詳細: [LOGS.md](LOGS.md)

### クイックリファレンス

| ログ種別 | 開発環境 | 本番環境 (macOS) |
|----------|----------|------------------|
| グローバルログ | `electron-sdd-manager/logs/main.log` | `~/Library/Logs/sdd-orchestrator/main.log` |
| E2Eテストログ | `electron-sdd-manager/logs/main-e2e.log` | `~/Library/Logs/sdd-orchestrator/main-e2e.log` |
| プロジェクトログ | `{projectPath}/.kiro/logs/main.log` | 同左 |
| エージェント実行ログ | `.kiro/specs/{specId}/logs/{agentId}.log` | 同左 |

### よく使うコマンド

```bash
# エラーログを抽出
grep "\[ERROR\]" ~/Library/Logs/sdd-orchestrator/main.log | tail -50

# リアルタイム監視
tail -f ~/Library/Logs/sdd-orchestrator/main.log

# task コマンドでログ表示
task logs:main
task logs:agent
```

---

## サービス状態の確認

### Electronアプリ

```bash
# 状態確認
task electron:status

# プロセス確認
ps aux | grep -i electron
```

### MCP経由の確認

```
mcp__electron__get_electron_window_info
mcp__electron__read_electron_logs
```

---

## 設定・環境変数の確認

### 確認すべき項目

- `.env` ファイルの存在と内容
- `package.json` のスクリプト定義
- TypeScript/ESLint設定
- Electron Builder設定

### よくある問題

| 問題 | 確認項目 |
|------|----------|
| 起動しない | `ELECTRON_RUN_AS_NODE` 環境変数 |
| ビルドエラー | Node.jsバージョン、依存関係 |
| IPCエラー | チャンネル名の一致、ハンドラー登録 |

---

## コード調査

### 調査パターン

1. **エラーメッセージから逆引き**
   ```bash
   grep -r "エラーメッセージ" src/
   ```

2. **関連ファイルの特定**
   ```bash
   # ファイル名で検索
   find . -name "*keyword*" -type f

   # シンボルで検索
   grep -r "functionName\|ClassName" src/
   ```

3. **呼び出し元の追跡**
   - IDE のFind Usages機能
   - `grep -r "import.*from.*module"` パターン

---

## トラブルシューティング

詳細: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Electronアプリが起動しない

1. `task electron:status` で状態確認
2. `task electron:stop` で強制停止
3. `task electron:start` で再起動
4. ログを確認: `task electron:logs`

### E2Eテストが失敗する

1. アプリがビルドされているか確認: `task electron:build`
2. `task electron:test:e2e` の出力を確認
3. E2Eログを確認: `~/Library/Logs/sdd-orchestrator/main-e2e.log`

### IPCが動作しない

1. チャンネル名が一致しているか確認
2. preloadでexposeされているか確認
3. mainプロセスでハンドラーが登録されているか確認

---

## 詳細情報

- 操作手順: `.kiro/steering/operations.md`
- 詳細なログ情報: [LOGS.md](LOGS.md)
- 詳細なトラブルシューティング: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
