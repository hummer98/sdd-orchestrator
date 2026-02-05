# Implementation Plan

## タスク概要

merge-spec.sh と merge-bug.sh に責務を統合し、update-*-for-deploy.sh を削除することで、マージワークフローのタイミング問題を解決する。

---

## Tasks

- [x] 1. merge-spec.sh の責務統合
- [x] 1.1 (P) merge-spec.sh にブランチ名先行読み取りと spec.json 更新処理を追加する
  - worktree 内の spec.json から `worktree.branch` を変数に保存（JSON 更新前）
  - 現在ブランチが main/master/dev 以外の場合は exit 2 で終了（checkout は行わない）
  - jq で spec.json を更新: `del(.worktree)`, `.phase = "deploy-complete"`, `.updated_at` を現在 UTC タイムスタンプに設定
  - worktree 内で `git add && git commit` を実行
  - 既存のマージ・クリーンアップロジックは維持
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - _Method: jq, git add, git commit_
  - _Verify: Grep "del\(.worktree\)|phase.*deploy-complete|git add|git commit" in merge-spec.sh_

- [x] 1.2 (P) merge-spec.sh のエラーハンドリングを統一する
  - jq 未インストール時: exit 2 + インストール手順（brew install jq / apt install jq）
  - spec.json 不在時: exit 2 + 期待されるパス出力
  - worktree.branch 不在時: exit 2 + エラー原因出力
  - 非標準ブランチ時: exit 2 + 現在ブランチ名出力
  - マージコンフリクト時: exit 1、クリーンアップなし
  - worktree/ブランチ削除失敗時: 警告出力のみで処理継続
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - _Method: echo, exit codes_
  - _Verify: Grep "exit 1|exit 2|Warning:" in merge-spec.sh_

- [x] 2. merge-bug.sh の新規作成
- [x] 2.1 (P) merge-bug.sh を新規作成し、merge-spec.sh と同一パターンで実装する
  - worktree パス規則: `.kiro/worktrees/bugs/{bug-name}/`
  - bug.json パス: `.kiro/worktrees/bugs/{bug-name}/.kiro/bugs/{bug-name}/bug.json`
  - ブランチ名を先行読み取り、bug.json 更新（`del(.worktree)`, `updated_at` 更新のみ、phase フィールドなし）
  - 現在ブランチチェック、worktree 内コミット、squash merge、クリーンアップ
  - exit code: 0（成功）, 1（コンフリクト）, 2（前提条件エラー）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - _Method: jq, git add, git commit, git merge --squash, git worktree remove, git branch -D_
  - _Verify: Grep "del\(.worktree\)|updated_at|git merge --squash" in merge-bug.sh_

- [x] 2.2 (P) merge-bug.sh のエラーハンドリングを実装する
  - merge-spec.sh と同一のエラー処理パターン
  - exit code 2: jq 不在、bug.json 不在、worktree.branch 不在、非標準ブランチ
  - exit code 1: マージコンフリクト
  - 警告のみ: クリーンアップ失敗
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - _Method: echo, exit codes_
  - _Verify: Grep "exit 1|exit 2|Warning:" in merge-bug.sh_

- [x] 3. 不要スクリプトの削除
- [x] 3.1 (P) `.kiro/scripts/update-spec-for-deploy.sh` を物理削除する
  - ファイルを削除
  - _Requirements: 3.1_

- [x] 3.2 (P) `.kiro/scripts/update-bug-for-deploy.sh` を物理削除する
  - ファイルを削除
  - _Requirements: 3.2_

- [x] 4. コマンドプロンプトの更新
- [x] 4.1 (P) spec-merge.md の Step 2.3 を削除し、Step 3 を簡素化する
  - Step 2.3 の `update-spec-for-deploy.sh` 呼び出しを完全に削除
  - Step 3 で merge-spec.sh のみを呼び出す形に変更
  - exit code に応じたエラーハンドリングは維持
  - _Requirements: 4.1, 4.2, 4.3_
  - _Verify: Grep "update-spec-for-deploy.sh" in spec-merge.md should return no results_

- [x] 4.2 (P) bug-merge.md の Step 2.3 を削除し、Step 3 で merge-bug.sh を呼び出すように変更する
  - Step 2.3 の `update-bug-for-deploy.sh` 呼び出しを完全に削除
  - Step 3 で `git merge --squash` 直接呼び出しから `merge-bug.sh` 呼び出しに変更
  - Step 5 のクリーンアップは merge-bug.sh が担当するため簡素化
  - exit code に応じたエラーハンドリングを追加
  - _Requirements: 5.1, 5.2, 5.3_
  - _Verify: Grep "update-bug-for-deploy.sh" in bug-merge.md should return no results_

- [x] 5. テンプレート版の同期更新
- [x] 5.1 (P) テンプレート版 merge-spec.sh を更新する
  - `electron-sdd-manager/resources/templates/scripts/merge-spec.sh` を `.kiro/scripts/merge-spec.sh` と同期
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 5.2 (P) テンプレート版 merge-bug.sh を新規作成する
  - `electron-sdd-manager/resources/templates/scripts/merge-bug.sh` を `.kiro/scripts/merge-bug.sh` と同期
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 5.3 (P) テンプレート版 `update-spec-for-deploy.sh` を物理削除する
  - `electron-sdd-manager/resources/templates/scripts/update-spec-for-deploy.sh` を削除
  - _Requirements: 3.1_

- [x] 5.4 (P) テンプレート版 `update-bug-for-deploy.sh` を物理削除する
  - `electron-sdd-manager/resources/templates/scripts/update-bug-for-deploy.sh` を削除
  - _Requirements: 3.2_

- [x] 6. ccSddWorkflowInstaller の更新
- [x] 6.1 HELPER_SCRIPTS リストとテストを更新する
  - `update-spec-for-deploy.sh` と `update-bug-for-deploy.sh` をリストから削除
  - `merge-spec.sh` をリストに追加（テンプレートは既存だがリストに未含）
  - `merge-bug.sh` をリストに追加（テンプレートは Task 5.2 で新規作成）
  - `ccSddWorkflowInstaller.test.ts` を更新: テストで使用するスクリプト名を `merge-spec.sh` と `merge-bug.sh` に変更
  - 依存: Task 5 完了後に実施（テンプレートが存在する必要がある）
  - _Requirements: 1.1, 2.1, 3.1, 3.2_
  - _Verify: Grep "HELPER_SCRIPTS" in ccSddWorkflowInstaller.ts_
  - _Verify: Grep "merge-spec.sh|merge-bug.sh" in ccSddWorkflowInstaller.test.ts_

- [x] 7. 検証
- [x] 7.1 ビルドと型チェックを実行する
  - `cd electron-sdd-manager && npm run build && npm run typecheck`
  - _Requirements: 1.1, 2.1, 6.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | worktree.branch を正しいパスで読み取る | 1.1 | Feature |
| 1.2 | main/master/dev 以外で exit 2 | 1.1, 1.2 | Feature |
| 1.3 | worktree 内で spec.json 更新 | 1.1 | Feature |
| 1.4 | worktree 内で変更をコミット | 1.1 | Feature |
| 1.5 | jj squash / git merge --squash | 1.1 | Feature |
| 1.6 | main 側でコミット | 1.1 | Feature |
| 1.7 | worktree 削除 | 1.1 | Feature |
| 1.8 | feature ブランチ削除 | 1.1 | Feature |
| 2.1 | bug.json から worktree.branch 読み取り | 2.1 | Feature |
| 2.2 | main/master/dev 以外で exit 2 | 2.1, 2.2 | Feature |
| 2.3 | bug.json 更新 | 2.1 | Feature |
| 2.4 | worktree 内でコミット | 2.1 | Feature |
| 2.5 | jj squash / git merge --squash | 2.1 | Feature |
| 2.6 | main 側でコミット | 2.1 | Feature |
| 2.7 | worktree 削除 | 2.1 | Feature |
| 2.8 | bugfix ブランチ削除 | 2.1 | Feature |
| 3.1 | update-spec-for-deploy.sh 削除 | 3.1, 5.3 | Cleanup |
| 3.2 | update-bug-for-deploy.sh 削除 | 3.2, 5.4 | Cleanup |
| 4.1 | update-spec-for-deploy.sh 呼び出し削除 | 4.1 | Wiring |
| 4.2 | merge-spec.sh のみ呼び出し | 4.1 | Wiring |
| 4.3 | エラーハンドリング（spec-merge.md） | 4.1 | Wiring |
| 5.1 | update-bug-for-deploy.sh 呼び出し削除 | 4.2 | Wiring |
| 5.2 | merge-bug.sh 呼び出し | 4.2 | Wiring |
| 5.3 | エラーハンドリング（bug-merge.md） | 4.2 | Wiring |
| 6.1 | jq 未インストール時のエラー | 1.2, 2.2 | Feature |
| 6.2 | JSON ファイル不在時のエラー | 1.2, 2.2 | Feature |
| 6.3 | worktree.branch 不在時のエラー | 1.2, 2.2 | Feature |
| 6.4 | 非標準ブランチ時のエラー | 1.2, 2.2 | Feature |
| 6.5 | マージコンフリクト時 | 1.2, 2.2 | Feature |
| 6.6 | worktree 削除失敗時 | 1.2, 2.2 | Feature |
| 6.7 | ブランチ削除失敗時 | 1.2, 2.2 | Feature |
