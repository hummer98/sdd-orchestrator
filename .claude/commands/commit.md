---
description: 現在のセッション中の変更を適切な粒度でコミット
allowed-tools: Bash(git *), Read(CLAUDE.md)
---

# Commit Command

現在のセッション中で行われた変更を適切な粒度で、適切なコメントを付けてコミットします。

**重要**: 現在のセッションで変更したファイルのみをコミット対象とします。他のセッションや別の作業で変更されたファイルは含めません。

## Instructions

以下の手順で実行してください:

### 1. 変更内容の確認

```bash
git status
git diff
```

変更の性質を分析（feature/fix/refactor/docs/test/chore等）

**現在のセッションで変更したファイルの特定**:
- 現在のセッションで明示的に編集したファイルのみを対象とする
- 他のセッションやバックグラウンドで変更されたファイルは除外する
- ユーザーが現在のタスクで意図的に変更したファイルを優先する

### 2. 進行中のSpecとブランチの確認

- `@CLAUDE.md` の "Active Specifications" から進行中の spec を特定
- 現在のブランチ名を確認: `git branch --show-current`
- 進行中の spec の feature名とブランチ名を比較

### 3. ブランチ判定

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

### 7. 結果の確認

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
- **現在のセッションで変更したファイルのみをコミット対象とする**
- 他のセッションや別の作業で変更されたファイルは含めない
- ユーザーが現在のタスクで意図的に変更したファイルを優先する

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
