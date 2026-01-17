---
name: investigation-mode
description: >
  システム調査・デバッグ支援モード。
  「調査して」「問題を特定して」「ログを確認して」「デバッグして」
  「エラーの原因は？」「なぜ動かない？」などのキーワードで自動検出。
user-invocable: true
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

### Electronアプリ

| ログ種別 | 場所 | 確認方法 |
|----------|------|----------|
| Mainプロセス | `logs/electron-dev.log` | `task electron:logs` |
| Rendererコンソール | DevTools Console | MCP経由で取得可能 |
| Agentログ | `.kiro/logs/` | `task logs:agent` |

### 一般的なログ確認コマンド

```bash
# Electronアプリのログ（リアルタイム）
task electron:logs

# 最新のAgentログ
ls -la .kiro/logs/

# エラーのみ抽出
grep -i "error\|fail\|exception" logs/electron-dev.log
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

### Electronアプリが起動しない

1. `task electron:status` で状態確認
2. `task electron:stop` で強制停止
3. `task electron:start` で再起動
4. ログを確認: `task electron:logs`

### E2Eテストが失敗する

1. アプリが起動しているか確認
2. `task electron:test:e2e` の出力を確認
3. スクリーンショット/ログを確認

### IPCが動作しない

1. チャンネル名が一致しているか確認
2. preloadでexposeされているか確認
3. mainプロセスでハンドラーが登録されているか確認

---

## 詳細情報

- 操作手順: `.kiro/steering/operations.md`
- トラブルシューティング: `.kiro/steering/debugging.md`
- シンボル対応表: `.kiro/steering/symbol-semantic-map.md`
