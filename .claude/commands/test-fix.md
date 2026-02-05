---
description: テスト実行と失敗時の自動解析・修正
allowed-tools: Bash, Read, Edit, Glob, Grep, AskUserQuestion
---

# Test Fix Command

ユニットテストを実行し、失敗時は解析・修正を行います。期待値の変更であれば自動修正、バグや仕様変更の可能性がある場合はユーザーに報告します。

## Usage

```
/test-fix [test-pattern] [options]
```

### Arguments

- `test-pattern` (optional): 特定のテストファイルやパターン（例: `agentStore.test.ts`）
- `--analyze-only`: 修正せずに解析のみ実行
- `--report`: 失敗時にレポートを `.kiro/test-reports/` に出力
- `--all`: 全テスト実行（デフォルト）

### Examples

```
/test-fix                           # 全テスト実行
/test-fix agentStore.test.ts        # 特定ファイルのみ
/test-fix --analyze-only            # 解析のみ（修正しない）
/test-fix --report                  # 失敗時にレポート出力
```

## Instructions

以下の手順で実行してください。

### 0. ドキュメント読み込み（必須）

以下のドキュメントを読み込み、プロジェクトのテスト・ログ規約を把握する:

- `.kiro/steering/tech.md` - テスト実行コマンド、技術スタック
- `.kiro/steering/debugging.md` - ログ保存場所、解析方法
- `.kiro/steering/logging.md` - ログフォーマット、レベル定義
- `.kiro/steering/verification-commands.md` - 検証コマンド一覧

### 1. テスト実行

```bash
cd electron-sdd-manager && npm run test:run
```

**パターン指定時**:
```bash
cd electron-sdd-manager && npm run test:run -- --testNamePattern="<pattern>"
# または
cd electron-sdd-manager && npm run test:run -- <file-path>
```

### 2. 結果解析

テスト結果を解析し、以下のいずれかに分類する:

| 失敗パターン | 判定 | アクション |
|-------------|------|-----------|
| スナップショット不一致 | 期待値変更 | 自動更新（`-u`オプション） |
| 出力値の形式変更（プロパティ順序、フォーマット等） | 期待値変更 | expect文を修正 |
| 新規プロパティ追加による不一致 | 期待値変更 | expect文を修正 |
| ロジックエラー（計算結果が間違い等） | バグ | ユーザー報告 |
| 型エラー | 実装バグ | ユーザー報告 |
| テスト自体の誤り | テストバグ | ユーザー確認後修正 |
| 不明 | 判断不能 | ユーザーに確認 |

### 3. 失敗原因の詳細調査（必須）

失敗したテストについて、**すべての調査項目を実施**してから判定を行う:

#### 3.1 テストコード解析

```bash
# 失敗したテストファイルを読み込む
Read: {test-file-path}
```

確認項目:
- テストの意図（何を検証しているか）
- 期待値の根拠（なぜその値を期待しているか）
- セットアップ/モックの内容

#### 3.2 実装コード解析

```bash
# テスト対象の実装ファイルを特定して読み込む
Grep: "function {functionName}" または "class {className}"
Read: {implementation-file-path}
```

確認項目:
- 現在の実装ロジック
- 戻り値の決定ロジック
- エラーハンドリング

#### 3.3 変更履歴の確認（重要）

```bash
# 最近の変更を確認
git diff HEAD~5 -- {implementation-file-path}
git diff HEAD~5 -- {test-file-path}
git log --oneline -10 -- {implementation-file-path}
```

確認項目:
- いつ、どのような変更が入ったか
- 変更の意図（コミットメッセージ）
- 変更と失敗の関連性

#### 3.4 依存関係の確認

```bash
# インポート先・モック対象の変更確認
Grep: "import.*from.*{module}"
```

確認項目:
- 依存モジュールの変更有無
- 型定義の変更有無
- モックの整合性

#### 3.5 調査結果の整理

各失敗テストについて、以下の形式で調査結果を整理:

```
### 調査結果: {テスト名}

**テストの意図**: {何を検証しているか}

**期待値**: {expected}
**実際の値**: {actual}

**実装コードの確認**:
- ファイル: {path}:{line}
- 関連ロジック: {該当コードの要約}

**変更履歴**:
- 最新コミット: {hash} - {message}
- 変更内容: {差分の要約}

**原因の推測**:
- {原因の説明}

**分類**: 期待値変更 / バグ / テストバグ / 不明
```

### 4. 判定と対応

#### 期待値変更の場合（自動修正）

`--analyze-only` でない場合、以下を実行:

**スナップショット更新**:
```bash
cd electron-sdd-manager && npm run test:run -- -u
```

**expect文の修正**:
- 新しい期待値でテストファイルを編集
- 変更理由をコメントで記載（任意）

#### バグの可能性がある場合

ユーザーに以下を報告:
- 失敗したテスト名
- 期待値と実際の値
- 推測される原因
- 修正案（あれば）

```
## テスト失敗報告

**テスト**: `should return correct value`
**ファイル**: `src/services/calculator.test.ts:42`

**期待値**: 100
**実際の値**: 99

**推測原因**: `calculateTotal`関数の丸め処理に問題がある可能性

**確認事項**: これは仕様変更でしょうか、それともバグでしょうか？
```

#### 判断不能の場合

AskUserQuestion ツールを使用してユーザーに確認:
- 失敗の詳細を提示
- 選択肢を提供（期待値変更 / バグ修正 / スキップ）

### 5. テスト不足の検出

テスト実行後、以下を確認してテスト追加を提案:

1. **テストファイル存在確認**:
   - 変更されたソースファイル（`git diff --name-only`）に対応するテストファイルがあるか
   - 例: `src/services/foo.ts` → `src/services/foo.test.ts`

2. **カバレッジ不足の検出**:
   - 新規追加された関数/クラスにテストがあるか
   - エラーハンドリングパス（catch句、エラー分岐）がテストされているか
   - エッジケース（境界値、空配列、null、undefined等）のテストがあるか

3. **提案フォーマット**:
```
## テスト追加提案

以下のテストが不足している可能性があります:

1. **ファイル**: `src/services/newService.ts`
   - 対応するテストファイルが存在しません
   - 提案: `src/services/newService.test.ts` を作成

2. **関数**: `handleError` in `src/utils/errorHandler.ts`
   - エラーケースのテストがありません
   - 提案: 例外発生時の動作をテスト

追加しますか？
```

### 6. 結果報告

最終的な結果をサマリーで報告:

```
## テスト結果サマリー

- **実行**: 42 tests
- **成功**: 40 tests
- **失敗**: 2 tests
  - 自動修正: 1 (期待値変更)
  - ユーザー確認待ち: 1 (バグの可能性)
- **テスト追加提案**: 2 件
```

### 7. レポート出力（--report オプション時）

`--report` オプションが指定されており、かつ**テスト失敗がある場合**のみ、レポートファイルを生成する。

#### 出力先

```
.kiro/test-reports/test-report-{YYYYMMDD-HHMMSS}.md
```

#### レポートフォーマット

```markdown
# Unit Test Report - {timestamp}

## Summary

| 項目 | 値 |
|------|-----|
| 実行日時 | {YYYY-MM-DD HH:MM:SS UTC} |
| テスト総数 | {total} |
| 成功 | {passed} |
| 失敗 | {failed} |
| 結果 | FAIL |

## 失敗テスト一覧

| テスト名 | ファイル | 分類 | ステータス |
|----------|----------|------|-----------|
| should return correct value | calculator.test.ts:42 | バグ | 要確認 |
| should format date | utils.test.ts:15 | 期待値変更 | 自動修正済 |

## 詳細分析

### ❌ should return correct value

**ファイル**: `src/services/calculator.test.ts:42`

**期待値**:
```
100
```

**実際の値**:
```
99
```

**実装コード調査**:
- 対象ファイル: `src/services/calculator.ts:28`
- 関数: `calculateTotal`
- 関連ロジック: 合計計算時の丸め処理

**変更履歴**:
```
abc1234 - fix: 計算精度の改善 (2日前)
def5678 - feat: 新しい計算ロジック追加 (5日前)
```

**原因の推測**:
丸め処理で `Math.floor` を使用しているが、`Math.round` が適切な可能性

**分類**: バグの可能性（要ユーザー確認）

---

### ✅ should format date (自動修正済)

**ファイル**: `src/utils/date.test.ts:15`

**変更内容**: フォーマット出力の期待値を更新

**理由**: 日付フォーマットの仕様変更に伴う期待値の更新

---

## 対応状況

- [x] 期待値変更: 1件（自動修正済）
- [ ] バグの可能性: 1件（要確認）

## 次のアクション

1. `should return correct value` の失敗について、仕様変更かバグかを確認
2. バグの場合は `calculateTotal` 関数の丸め処理を修正
```

#### 出力時の注意

- **全テスト成功時**: レポートは生成しない（ノイズ回避）
- **ディレクトリ作成**: `.kiro/test-reports/` が存在しない場合は作成
- **上書き禁止**: 既存ファイルは上書きしない（タイムスタンプで一意化）

## Notes

- `--analyze-only` 指定時は修正を行わず、解析結果のみ報告
- `--report` 指定時は失敗がある場合のみ `.kiro/test-reports/` にレポート出力
- スナップショット更新は明らかに意図的な変更の場合のみ自動実行
- 判断に迷う場合は必ずユーザーに確認
- テスト追加提案は強制ではなく、参考情報として提示
