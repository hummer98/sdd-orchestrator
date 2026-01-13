---
description: 現在のセッション中の変更を適切な粒度でコミット
allowed-tools: Bash(git *), Read, Glob
---

# Commit Command

現在のセッション中で行われた変更を適切な粒度で、適切なコメントを付けてコミットします。

## Usage

```
/commit [target] [options]
```

### Arguments

- `target` (optional): コミット対象を特定する名前
  - **Spec feature 名**: `.kiro/specs/{feature}/tasks.md` を参照してコミット対象ファイルを特定
  - **Bug 名**: `.kiro/bugs/{bug-name}/` 内のファイルを対象に含める
  - **省略時**: 現在のセッションで変更したファイルのみを対象

### Options

- `--check-branch`: ブランチチェックを有効化
  - feature名とブランチ名の不一致時にユーザーに選択を促す
  - **省略時（デフォルト）**: ブランチチェックをスキップし、カレントブランチに直接コミット

### Examples

```
/commit                           # カレントブランチに変更をコミット（質問なし）
/commit my-feature                # カレントブランチにmy-feature specの変更をコミット
/commit my-feature --check-branch # ブランチチェック付きでコミット
/commit fix-login-bug             # fix-login-bug のバグ修正をコミット
```

## Instructions

以下の手順で実行してください:

### 0. 引数の解析とコミット対象の特定

**オプションの解析**:
- `--check-branch` が指定されている場合: ブランチチェックを有効化（ステップ2, 3を実行）
- `--check-branch` が指定されていない場合: ブランチチェックをスキップ（ステップ2, 3を省略し、カレントブランチに直接コミット）

**引数がある場合**:
1. Spec として存在するか確認: `.kiro/specs/$1/tasks.md`
2. Bug として存在するか確認: `.kiro/bugs/$1/`
3. 見つかった場合、そのコンテキストに基づいてコミット対象を特定

**Spec の場合**:
- `.kiro/specs/{feature}/tasks.md` を読み込み
- タスクに関連するファイルパターンを抽出
- 関連する実装ファイル、テストファイル、ドキュメントを対象に含める
- **Specドキュメント自体も含める**: `.kiro/specs/{feature}/` ディレクトリ内の全ファイル（requirements.md, design.md, tasks.md, planning.md 等）
- **コミット成功後、spec.jsonのphaseを更新**: `phase: 'deploy-complete'` に設定（デプロイ完了を記録）

**Bug の場合**:
- `.kiro/bugs/{bug-name}/` 内のファイル（report.md, analysis.md, fix.md, verification.md）
- analysis.md の "Related Files" セクションから関連ファイルを抽出
- fix.md の "Files Modified" セクションから変更ファイルを抽出

**引数がない場合**:
- 現在のセッションで変更したファイルのみを対象とする
- 他のセッションやバックグラウンドで変更されたファイルは除外する

### 1. 変更内容の確認

```bash
git status
git diff
```

変更の性質を分析（feature/fix/refactor/docs/test/chore等）

**コミット対象ファイルの特定**:
- 引数で指定されたコンテキストに基づくファイル、または
- 現在のセッションで明示的に編集したファイルのみを対象とする
- 他のセッションやバックグラウンドで変更されたファイルは除外する
- ユーザーが現在のタスクで意図的に変更したファイルを優先する

### 2. 進行中のSpecとブランチの確認（--check-branch 指定時のみ）

> **注意**: `--check-branch` オプションが指定されていない場合、このステップはスキップされます。

- `@CLAUDE.md` の "Active Specifications" から進行中の spec を特定
- 現在のブランチ名を確認: `git branch --show-current`
- 進行中の spec の feature名とブランチ名を比較

### 3. ブランチ判定（--check-branch 指定時のみ）

> **注意**: `--check-branch` オプションが指定されていない場合、このステップはスキップされ、カレントブランチに直接コミットします。

**feature名とブランチ名が一致する場合**: そのままコミット処理へ

**feature名とブランチ名が異なる場合**: ユーザーに選択を促す

```
進行中のSpec: [feature-name]
現在のブランチ: [current-branch]

以下から選択してください:
1. 新しいブランチ feature/[feature-name] を作成してコミット
2. 現在のブランチ [current-branch] にそのままコミット
```

### 4. コミット粒度の決定

変更内容を論理的な単位にグループ化:

- 異なる機能の実装
- バグ修正と機能追加の分離
- テストコードと実装コードの分離（必要に応じて）
- ドキュメント更新の分離（必要に応じて）

**原則**: 1つのコミットは1つの論理的変更を表す

### 5. コミットメッセージの作成

**フォーマット**: `<type>: <subject>`

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント
- `test`: テスト追加・修正
- `chore`: ビルド、ツール設定等
- `style`: コードスタイル
- `perf`: パフォーマンス改善

**Subject**: 変更内容を簡潔に説明（日本語OK）

必要に応じて本文を追加（詳細な説明、理由、影響範囲等）

### 6. コミット実行

```bash
# 現在のセッションで変更したファイルのみをステージング
git add [current-session-files]

# コミットメッセージと共にコミット
git commit -m "type: subject"

# 複数のコミットが必要な場合、順次実行
```

**ファイル選択の注意点**:
- 現在のセッションで明示的に変更したファイルのみをステージングする
- 他のセッションやバックグラウンドで変更されたファイルは含めない
- ユーザーが現在のタスクで意図的に変更したファイルを優先する

### 7. Spec の場合: phase を deploy-complete に更新

**Spec 引数が指定されていた場合のみ**:

コミット成功後、`.kiro/specs/{feature}/spec.json` の `phase` を `deploy-complete` に更新する。

```bash
# spec.json を読み込み、phase を更新
# jq がある場合:
jq '.phase = "deploy-complete" | .updated_at = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))' \
  .kiro/specs/{feature}/spec.json > tmp.json && mv tmp.json .kiro/specs/{feature}/spec.json

# jq がない場合は、sed または手動で更新
```

**注意**: この更新もコミットに含める（別コミットまたは amend）

### 8. 結果の確認

```bash
git log --oneline -n [コミット数]
git status
```

## Examples

### Example 1: Single Feature Implementation
```
変更内容:
- webapp/src/components/NewFeature.tsx (新規)
- webapp/src/components/NewFeature.test.tsx (新規)

コミット:
feat: NewFeature コンポーネントの追加
```

### Example 2: Multiple Logical Changes
```
変更内容:
- webapp/src/hooks/useData.ts (バグ修正)
- webapp/src/components/Dashboard.tsx (リファクタリング)
- docs/api.md (ドキュメント更新)

コミット:
1. fix: useData フックのメモリリーク修正
2. refactor: Dashboard コンポーネントのロジック整理
3. docs: API ドキュメントの更新
```

### Example 3: Feature with Tests
```
変更内容:
- webapp/src/services/newService.ts (新規)
- webapp/src/services/newService.test.ts (新規)

コミット:
feat: 新サービスの実装とテスト追加
```

## Notes

- 複数の論理的変更がある場合、必ず分割してコミット
- WIP (Work In Progress) 状態でコミットする場合は `wip:` プレフィックスを使用
- ブランチ作成時は `feature/[feature-name]` の命名規則を使用
- コミット前に必ずテストが通ることを確認（`npm test`）
- `.env` や credential ファイルがステージングされていないか必ず確認
- **引数がある場合**: 指定されたSpec/Bugに関連するファイルをコミット対象とする
- **引数がない場合**: 現在のセッションで変更したファイルのみをコミット対象とする
- 他のセッションや別の作業で変更されたファイルは含めない
- ユーザーが現在のタスクで意図的に変更したファイルを優先する

## Target-based Commit Examples

### Example 4: Spec-based Commit
```
/commit my-new-feature

1. .kiro/specs/my-new-feature/tasks.md を読み込み
2. タスクに記載されたファイルパスを抽出
3. .kiro/specs/my-new-feature/ 内のドキュメントも対象に含める
4. git status と照合してコミット対象を決定
5. コミットメッセージに feature 名を含める
6. コミット成功後、spec.json の phase を deploy-complete に更新

変更内容:
- .kiro/specs/my-new-feature/requirements.md
- .kiro/specs/my-new-feature/design.md
- .kiro/specs/my-new-feature/tasks.md
- .kiro/specs/my-new-feature/spec.json (phase: deploy-complete)
- src/features/myNewFeature.ts
- src/features/myNewFeature.test.ts

コミット:
feat(my-new-feature): 機能実装と仕様ドキュメント追加
```

### Example 5: Bug-based Commit
```
/commit fix-login-error

1. .kiro/bugs/fix-login-error/ の存在を確認
2. analysis.md, fix.md から関連ファイルを抽出
3. バグ修正に関連するファイルをコミット

コミット:
fix(fix-login-error): ログインエラーの修正
```

## Branch Naming Convention

- Feature: `feature/[feature-name]`
- Bugfix: `fix/[issue-description]`
- Refactor: `refactor/[scope]`
- Docs: `docs/[topic]`

## Good Commit Message Examples

- `feat: ミニ地図表示機能の追加`
- `fix: TTS順序保証の実装`
- `refactor: AppContext のスケジューリング処理を整理`
- `test: useMessageQueue の統合テスト追加`
- `docs: デプロイワークフローの更新`

## Bad Commit Message Examples

- `update files` (何を更新したか不明)
- `fix bug` (どのバグか不明)
- `wip` (作業内容が不明)
