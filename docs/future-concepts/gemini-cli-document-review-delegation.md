# Gemini CLI による document-review タスク代行の検討

## 概要

`/kiro:document-review` タスクを Gemini CLI で代行する可能性について調査した結果をまとめる。

## 調査結果サマリー

| 観点 | Claude Code | Gemini CLI | 評価 |
|------|-------------|------------|------|
| Skill相当機能 | `/skill` コマンド | Custom Commands (TOML) | ✅ 同等機能あり |
| stream-json出力 | `--output-format stream-json` | `--output-format stream-json` | ✅ 同等機能あり |
| Resume機能 | `Task` tool + `resume` param | `--resume` + session ID/index | ⚠️ 制限付きで可能 |

**総合評価**: 技術的には代行可能だが、いくつかの制限事項を考慮する必要がある。

---

## 詳細調査

### 1. Skill相当の機能: Custom Commands

Gemini CLI は TOML 形式の **Custom Commands** を提供しており、Claude Code の Skill と同等の機能を実現できる。

#### ディレクトリ構成

```
~/.gemini/commands/           # グローバルコマンド
<project>/.gemini/commands/   # プロジェクトローカルコマンド
```

#### コマンドの命名規則

- `document-review.toml` → `/document-review`
- `kiro/document-review.toml` → `/kiro:document-review`

#### TOML フォーマット例

```toml
# .gemini/commands/kiro/document-review.toml
description = "Review spec documents for consistency, gaps, and alignment with steering"

prompt = '''
# Spec Document Review

Review specification documents for consistency, identify contradictions, gaps, and ambiguities.

## Target Feature

{{args}}

## Instructions

1. Collect documents from `.kiro/specs/{{args}}/`
2. Collect steering documents from `.kiro/steering/`
3. Conduct review following the analysis framework
4. Generate report to `.kiro/specs/{{args}}/document-review-{n}.md`

@{.kiro/specs/{{args}}/requirements.md}
@{.kiro/specs/{{args}}/design.md}
@{.kiro/specs/{{args}}/tasks.md}
'''
```

#### 高度な機能

| 機能 | 構文 | 説明 |
|------|------|------|
| 引数注入 | `{{args}}` | ユーザー入力をプロンプトに展開 |
| ファイル内容注入 | `@{path/to/file}` | ファイル内容をプロンプトに埋め込み |
| シェルコマンド実行 | `!{command}` | コマンド出力をプロンプトに埋め込み |

**参考**: [Custom Commands | Gemini CLI](https://geminicli.com/docs/cli/custom-commands/)

---

### 2. stream-json 出力形式

Gemini CLI は `--output-format stream-json` をサポートしており、Claude Code と同等のストリーミング JSON 出力が可能。

#### 使用方法

```bash
gemini --output-format stream-json --prompt "What is machine learning?"
```

#### イベントタイプ

| イベント | 説明 |
|----------|------|
| `init` | セッション初期化 |
| `message` | AIからのメッセージ |
| `tool_use` | ツール呼び出し |
| `tool_result` | ツール実行結果 |
| `error` | エラー発生 |
| `result` | 最終結果 |

#### 出力形式

JSONL (Newline-Delimited JSON) 形式で出力されるため、行ごとにパース可能。

```bash
gemini --output-format stream-json -p "Analyze code" | while read -r line; do
  echo "$line" | jq -r '.type'
done
```

**参考**: [Headless mode | Gemini CLI](https://geminicli.com/docs/cli/headless/)

---

### 3. Resume 機能

Gemini CLI はセッション管理機能を持ち、会話の再開が可能。ただし、ヘッドレスモードでの Resume には制限がある。

#### セッション保存

- 自動保存: すべてのセッションが自動的に保存される
- 保存先: `~/.gemini/tmp/<project_hash>/chats/`
- プロジェクト固有: プロジェクトごとに分離

#### Resume 方法

```bash
# 最新セッションを再開
gemini --resume

# インデックスで指定
gemini --resume 1

# UUID で指定
gemini --resume a1b2c3d4-e5f6-7890-abcd-ef1234567890

# 追加プロンプトと共に再開 (v0.20.0+)
gemini --resume latest --prompt "続きの質問"
```

#### セッションリスト取得

```bash
gemini --list-sessions
```

#### 制限事項

1. **v0.18.4 以前の問題** (2025年11月報告、解決済み)
   - `--resume` と stdin/位置引数の併用が不可
   - `--prompt` フラグでのみ動作
   - v0.20.0 nightly で修正済み

2. **ヘッドレスモードでの制約**
   - インタラクティブな `/resume` コマンドは使用不可
   - コマンドラインフラグのみで制御

**参考**:
- [Session Management | Gemini CLI](https://geminicli.com/docs/cli/session-management/)
- [Issue #14180](https://github.com/google-gemini/gemini-cli/issues/14180)

---

## 実装案

### 案1: 単発実行 (推奨)

document-review は1回の実行で完結するタスクのため、Resume 機能は不要。

```bash
gemini \
  --output-format stream-json \
  --yolo \
  --prompt "/kiro:document-review feature-name" \
  > review-output.jsonl
```

#### メリット
- シンプルな実装
- Resume の制限事項を回避
- 結果のパースが容易

### 案2: マルチターン実行 (高度なユースケース)

Review → Reply → Fix の連続タスクを同一セッションで実行。

```bash
# Step 1: Review 実行
SESSION_ID=$(gemini --output-format json \
  -p "/kiro:document-review feature-name" \
  | jq -r '.sessionId')

# Step 2: Reply 実行 (セッション継続)
gemini --resume "$SESSION_ID" \
  --output-format stream-json \
  --prompt "/kiro:document-review-reply feature-name"
```

#### 考慮事項
- セッションIDの取得方法が未確定
- v0.20.0 以降のバージョンが必要

---

## Claude Code との機能比較

| 機能 | Claude Code | Gemini CLI | 備考 |
|------|-------------|------------|------|
| コンテキストファイル | `CLAUDE.md` | `GEMINI.md` | 階層的読み込み対応 |
| カスタムコマンド | `.claude/commands/*.md` | `.gemini/commands/*.toml` | 形式が異なる |
| MCP サポート | ✅ | ✅ | 同等 |
| ファイル操作ツール | Read, Write, Edit | read_file, write_file | 同等 |
| 自動承認モード | (なし) | `--yolo` | Gemini のみ |
| Token キャッシュ | ✅ | ✅ | コスト削減 |
| 無料枠 | 有料のみ | 60 req/min, 1000 req/day | Gemini が有利 |

---

## 移行時の考慮事項

### 必要な作業

1. **コマンドファイルの変換**
   - `.claude/commands/kiro/*.md` → `.gemini/commands/kiro/*.toml`
   - Markdown から TOML への構文変換

2. **プロンプトの調整**
   - `@{file}` 構文でのファイル注入
   - `{{args}}` 構文での引数処理

3. **出力パーサーの実装**
   - JSONL パーサーの実装
   - イベントタイプに応じた処理

### 潜在的リスク

1. **モデルの違い**
   - Gemini 2.5 Pro と Claude の応答品質差
   - 特にコード分析・レビュータスクでの精度

2. **ツール実行の違い**
   - Gemini の `--yolo` モードは確認なし実行
   - セキュリティ上の考慮が必要

3. **コンテキスト管理**
   - `GEMINI.md` の階層的読み込みルールが異なる可能性

---

## 結論

### 技術的実現性: ✅ 可能

Gemini CLI は document-review タスクの代行に必要な機能をすべて備えている:

- Custom Commands による Skill 相当の機能
- `--output-format stream-json` によるストリーミング出力
- セッション管理による Resume 機能

### 推奨アプローチ

1. **短期**: 単発実行モードでの実装を優先
2. **中期**: 出力品質の検証と調整
3. **長期**: マルチターン実行の検討

### 次のステップ

1. `.gemini/commands/kiro/document-review.toml` の作成
2. テストプロジェクトでの動作検証
3. 出力品質の比較評価 (Claude vs Gemini)

---

## 参考リンク

- [Gemini CLI Documentation](https://geminicli.com/docs/)
- [Custom Commands](https://geminicli.com/docs/cli/custom-commands/)
- [Headless Mode](https://geminicli.com/docs/cli/headless/)
- [Session Management](https://geminicli.com/docs/cli/session-management/)
- [GitHub: google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
