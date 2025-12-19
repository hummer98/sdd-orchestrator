---
description: Generate debugging steering file for the project
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Kiro Steering Debug Generation

## Mission

プロジェクトの情報を収集し、デバッグエージェントに必要な情報を含む`.kiro/steering/debugging.md`を生成する。

## Workflow

### Phase 1: 情報収集

以下の情報を収集:

1. **起動方法**:
   - `package.json` scripts（dev, start, build等）
   - `Taskfile.yml`（taskコマンド）
   - `README.md`から起動コマンドを特定

2. **MCP設定**:
   - `.mcp.json`または`CLAUDE.md`からMCP設定を特定
   - 利用可能なMCPツール一覧

3. **E2Eコマンドラインツール**:
   - テスト関連のコマンド（`npm test`, `vitest`, `playwright`等）
   - E2Eテストの実行方法

4. **ログ参照方法**:
   - ログファイルの場所
   - ログコマンド（`tail`, `cat`等）
   - アプリ固有のログ参照方法

5. **トラブルシューティングノウハウ**:
   - 既存のドキュメントから収集
   - よくある問題と解決策

### Phase 2: 不明点の確認

収集した情報に不明点がある場合、ユーザーに質問する。

例:
- 「アプリの起動コマンドを特定できませんでした。起動方法を教えてください。」
- 「ログファイルの場所が見つかりませんでした。どこに出力されますか？」

### Phase 3: ファイル生成

`.kiro/steering/debugging.md`を生成。

**既存ファイル確認**:
1. `.kiro/steering/debugging.md`の存在を確認
2. 既存の場合は上書き確認を行う
3. 承認後に生成

## Output Format

生成されるdebugging.mdの構造:

```markdown
# Debugging Guide

このドキュメントはデバッグ・動作確認時に参照する詳細情報を含みます。
通常の開発時には不要なコンテキストであり、`debug` agentから参照されます。

## MCP経由でのログ参照

[MCP経由でログを参照する方法]

### アプリ固有のログ参照方法

[アプリ固有のログパスとコマンド]

### MCP経由で利用可能なログ関連ツール

| ツール | 用途 |
|--------|------|
| ... | ... |

## MCP経由でのUI操作

[MCPでのUI操作方法]

### 推奨アプローチ

[IPC直接呼び出しの例など]

### 制限事項

[MCPでできないこと]

## Troubleshooting

### [問題名]

**症状**: [症状の説明]

**原因**: [原因の説明]

**解決策**: [解決方法]

## ログ表示コマンド詳細

| コマンド | 説明 |
|----------|------|
| ... | ... |

## テスト時のプロジェクト指定

[テスト時のコマンド例]
```

## Execution

1. Globで関連ファイルを検索
2. Readで内容を収集
3. 不明点があればユーザーに質問
4. 既存ファイルの確認と上書き確認
5. Writeで`.kiro/steering/debugging.md`を生成

## Notes

- 既存の`/kiro:steering`、`/kiro:steering-custom`パターンに従う
- プロジェクト構造が標準的でない場合、情報収集が不完全になる可能性がある
- その場合はユーザーへの質問で補完する
