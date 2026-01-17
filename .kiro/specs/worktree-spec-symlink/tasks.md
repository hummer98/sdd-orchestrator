# Implementation Plan

## Tasks

- [x] 1. handleImplStartWithWorktreeから自動コミット処理を削除
  - worktree作成フローから`checkUncommittedSpecChanges()`呼び出しを削除する
  - worktree作成フローから`commitSpecChanges()`呼び出しを削除する
  - worktree作成時にspec変更が未コミットでも処理が継続されることを確認する
  - 関数自体は将来利用のためコードベースに残す
  - _Requirements: 1.1, 1.2, 1.3, 4.3_

- [x] 2. createSymlinksForWorktreeを修正してspec全体のシンボリックリンクを作成
  - 既存の`.kiro/specs/{feature}/logs/`単体のsymlink作成処理を削除する
  - worktree側に`.kiro/specs/{feature}/`ディレクトリが存在する場合は削除する
  - `.kiro/specs/{feature}/`全体をメイン側へのシンボリックリンクとして作成する
  - `.kiro/logs/`と`.kiro/runtime/`のsymlink作成は変更しない（既存維持）
  - worktree作成後、specディレクトリがsymlinkになっていることを確認する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1_

- [x] 3. prepareWorktreeForMerge関数を新規追加
  - WorktreeServiceに`prepareWorktreeForMerge(featureName)`関数を追加する
  - worktree側のspec symlinkを削除する処理を実装する
  - symlink削除後に`git reset .kiro/specs/{feature}/`を実行する
  - git reset後に`git checkout .kiro/specs/{feature}/`を実行してHEAD状態を復元する
  - 各処理の結果をログ出力し、エラー時は適切なResultを返す
  - _Requirements: 3.2, 3.3, 3.4, 4.2_

- [x] 4. spec-mergeコマンドにprepareWorktreeForMerge呼び出しを追加
  - spec-mergeコマンドでメインプロジェクト確認を維持する（既存実装）
  - マージ実行前にprepareWorktreeForMergeを呼び出す処理を追加する
  - worktree側にspec変更がない状態でマージが実行されることを確認する
  - コンフリクトなしでマージが完了することを検証する
  - _Requirements: 3.1, 3.5_

- [x] 5. 統合テストとエンドツーエンド検証
  - worktree作成からspec-mergeまでの一連のフローをテストする
  - worktree側でtasks.mdを編集し、メイン側のElectronアプリで変更が検知されることを確認する
  - spec-merge実行後にコンフリクトが発生しないことを確認する
  - エラーケース（symlink作成失敗、git reset失敗）の動作を検証する
  - _Requirements: 1.1, 2.1, 3.5_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | worktree作成時に自動コミットしない | 1 | Feature |
| 1.2 | checkUncommittedSpecChanges()呼び出し削除 | 1 | Feature |
| 1.3 | commitSpecChanges()呼び出し削除 | 1 | Feature |
| 2.1 | worktree作成時にspec全体のsymlink作成 | 2 | Feature |
| 2.2 | worktree側にspecディレクトリ存在時は削除 | 2 | Feature |
| 2.3 | .kiro/logs/と.kiro/runtime/のsymlink維持 | 2 | Feature |
| 2.4 | .kiro/specs/{feature}/logs/のsymlink削除 | 2 | Feature |
| 3.1 | spec-merge時にメインプロジェクト確認 | 4 | Feature |
| 3.2 | マージ前にsymlink削除 | 3 | Feature |
| 3.3 | symlink削除後にgit reset実行 | 3 | Feature |
| 3.4 | git reset後にgit checkout実行 | 3 | Feature |
| 3.5 | worktree側にspec変更がない状態でマージ | 4, 5 | Feature |
| 4.1 | createSymlinksForWorktree()修正 | 2 | Feature |
| 4.2 | prepareWorktreeForMerge()新規追加 | 3 | Feature |
| 4.3 | commitSpecChanges()等は残す | 1 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1, 2, 3), not container tasks
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
