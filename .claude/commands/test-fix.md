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
- `--all`: 全テスト実行（デフォルト）

### Examples

```
/test-fix                           # 全テスト実行
/test-fix agentStore.test.ts        # 特定ファイルのみ
/test-fix --analyze-only            # 解析のみ（修正しない）
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

### 3. 失敗原因の特定

失敗したテストについて、以下を調査:

1. **テストコードを読む**: 何をテストしているか理解
2. **実装コードを読む**: テスト対象の現在の動作を確認
3. **git diff を確認**: 最近の変更内容を把握
4. **ログを確認**: `debugging.md`記載の場所からログを取得

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

## Notes

- `--analyze-only` 指定時は修正を行わず、解析結果のみ報告
- スナップショット更新は明らかに意図的な変更の場合のみ自動実行
- 判断に迷う場合は必ずユーザーに確認
- テスト追加提案は強制ではなく、参考情報として提示
