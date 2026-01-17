# Implementation Plan

## Task 1: WorktreeServiceパス生成ロジック変更

- [x] 1.1 getWorktreePathメソッドの修正
  - Spec用worktreeのパス生成を`.kiro/worktrees/specs/{featureName}`形式に変更
  - 相対パスと絶対パスの両方を正しく返却することを確認
  - 既存のテストを更新して新しいパス形式を検証
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 1.2 (P) getBugWorktreePathメソッドの修正
  - Bug用worktreeのパス生成を`.kiro/worktrees/bugs/{bugName}`形式に変更
  - 相対パスと絶対パスの両方を正しく返却することを確認
  - 既存のテストを更新して新しいパス形式を検証
  - _Requirements: 1.2, 1.3, 4.2_

## Task 2: セキュリティバリデーション更新

- [x] 2.1 resolveWorktreePathメソッドのセキュリティ検証変更
  - 検証基準を「親ディレクトリ内」から「プロジェクトディレクトリ内」に変更
  - プロジェクト外を指すパスでエラーを返却
  - `..`を含む相対パスでもプロジェクト内に解決される場合は許可
  - エラーメッセージを適切に更新
  - 正常系・異常系の両方をテストで検証
  - _Requirements: 3.1, 3.2, 3.3_

## Task 3: .gitignore設定

- [x] 3.1 (P) .gitignoreへのworktreeディレクトリ除外設定追加
  - `.kiro/worktrees/`エントリを.gitignoreに追加
  - 既存の.kiro/関連設定との整合性を確認
  - _Requirements: 2.1, 2.2_

## Task 4: ドキュメント・スキル更新

- [x] 4.1 (P) skill-reference.mdのworktreeパス記述更新
  - **Spec用およびBug用の両方の**worktree配置パスを`.kiro/worktrees/`形式に更新
  - Spec用worktreeパス（`.kiro/worktrees/specs/{feature}`）を追記（現行はBug用のみ記載）
  - Bug用worktreeパス（`.kiro/worktrees/bugs/{bug}`）を更新
  - bug.jsonのworktree.pathフィールド例を新パス形式（`.kiro/worktrees/bugs/{bug-name}`）に更新
  - _Requirements: 5.1_

- [x] 4.2 (P) git-worktree-support仕様書のパス記述更新
  - design.md内の`../{project}-worktrees/`記述を`.kiro/worktrees/specs/`に更新
  - 更新対象セクション:
    - Supporting References（パス形式説明）
    - Data Models / Logical Data Model
    - WorktreeInfo.pathのコメント
  - grep等で`../{project}-worktrees`を検索し、漏れなく全箇所を更新
  - _Requirements: 5.2_

- [x] 4.3 (P) bugs-worktree-support仕様書のパス記述更新
  - design.md内の`../{project}-worktrees/bugs/`記述を`.kiro/worktrees/bugs/`に更新
  - 更新対象セクション:
    - BugWorktreeConfig型定義のpathフィールドコメント
    - Data Models / Logical Data Model
    - パス形式説明箇所
  - grep等で`../{project}-worktrees`を検索し、漏れなく全箇所を更新
  - _Requirements: 5.3_

## Task 5: 統合動作検証

- [x] 5.1 worktree作成・削除フローの統合テスト
  - Spec用worktree作成（createWorktree）が新パスで動作することを確認
  - Bug用worktree作成（createBugWorktree）が新パスで動作することを確認
  - Spec用worktree削除（removeWorktree）が新パスで動作することを確認
  - Bug用worktree削除（removeBugWorktree）が新パスで動作することを確認
  - spec.json/bug.jsonに正しい相対パスが保存されることを確認
  - ブランチ命名規則（feature/{name}、bugfix/{name}）が維持されることを確認
  - _Requirements: 1.4, 4.3, 4.4, 4.5, 4.6_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Spec用worktreeを`.kiro/worktrees/specs/{feature}/`に配置 | 1.1 | Feature |
| 1.2 | Bug用worktreeを`.kiro/worktrees/bugs/{bug}/`に配置 | 1.2 | Feature |
| 1.3 | spec.json/bug.jsonに相対パス格納 | 1.1, 1.2 | Feature |
| 1.4 | ブランチ命名規則維持 | 5.1 | Feature |
| 2.1 | `.gitignore`に`.kiro/worktrees/`追加 | 3.1 | Feature |
| 2.2 | worktree内ファイルがgit statusに表示されない | 3.1 | Feature |
| 3.1 | パスがプロジェクトディレクトリ内であることを検証 | 2.1 | Feature |
| 3.2 | プロジェクト外パスでエラー | 2.1 | Feature |
| 3.3 | `..`含む相対パスでもプロジェクト内なら許可 | 2.1 | Feature |
| 4.1 | getWorktreePath戻り値変更 | 1.1 | Feature |
| 4.2 | getBugWorktreePath戻り値変更 | 1.2 | Feature |
| 4.3 | createWorktree新パス使用 | 5.1 | Feature |
| 4.4 | createBugWorktree新パス使用 | 5.1 | Feature |
| 4.5 | removeWorktree新パス使用 | 5.1 | Feature |
| 4.6 | removeBugWorktree新パス使用 | 5.1 | Feature |
| 5.1 | skill-reference.mdパス記述更新 | 4.1 | Feature |
| 5.2 | git-worktree-support仕様書更新 | 4.2 | Feature |
| 5.3 | bugs-worktree-support仕様書更新 | 4.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
