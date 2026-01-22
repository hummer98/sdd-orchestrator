# Implementation Plan

## Tasks

- [x] 1. WorktreeServiceにBug用コミット状態チェックを追加
- [x] 1.1 checkUncommittedBugChangesメソッドを実装する
  - Bugディレクトリのgit statusを取得し、untracked/committed-clean/committed-dirtyを判定
  - 既存のcheckUncommittedSpecChangesと同じロジックを適用
  - `.kiro/bugs/{bugName}/`パスに対してgit status --porcelainを実行
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Method: checkUncommittedBugChanges_
  - _Verify: Grep "checkUncommittedBugChanges" in worktreeService.ts_

- [x] 2. ConvertBugWorktreeServiceの実装
- [x] 2.1 (P) BugCommitStatus型とConvertBugError型を定義する
  - BugCommitStatus: 'untracked' | 'committed-clean' | 'committed-dirty'
  - ConvertBugError: 判別共用体型で全エラーケースを網羅
  - ConvertBugResult<T>: Result型パターン
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4_
  - _Method: BugCommitStatus, ConvertBugError, ConvertBugResult_
  - _Verify: Grep "type BugCommitStatus|type ConvertBugError" in convertBugWorktreeService.ts_

- [x] 2.2 getBugStatusメソッドを実装する
  - WorktreeService.checkUncommittedBugChangesを呼び出し
  - hasChanges=false → committed-clean
  - hasChanges=true && 全てuntracked → untracked
  - hasChanges=true && committed変更あり → committed-dirty
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Method: getBugStatus, checkUncommittedBugChanges_
  - _Verify: Grep "getBugStatus" in convertBugWorktreeService.ts_

- [x] 2.3 canConvertメソッドを実装する
  - mainブランチ確認（isOnMainBranch）
  - Bug存在確認（bug.json読み込み）
  - 既存worktreeモード確認（worktreeフィールドの有無）
  - コミット状態確認（getBugStatus → committed-dirtyならエラー）
  - _Requirements: 1.2, 1.3, 1.4, 5.1_
  - _Method: canConvert, getBugStatus, isOnMainBranch_
  - _Verify: Grep "canConvert" in convertBugWorktreeService.ts_

- [x] 2.4 convertToWorktreeメソッドの前半を実装する（worktree作成まで）
  - canConvertによる事前検証
  - ブランチ作成（bugfix/{bugName}）
  - worktree作成（.kiro/worktrees/bugs/{bugName}）
  - 失敗時のロールバック処理（ブランチ削除）
  - _Requirements: 5.1, 5.2_
  - _Method: convertToWorktree, createBugWorktree_
  - _Verify: Grep "convertToWorktree" in convertBugWorktreeService.ts_

- [x] 2.5 convertToWorktreeメソッドの後半を実装する（ファイル処理）
  - untracked時: ファイルコピー → メイン側削除
  - committed-clean時: worktree内Bug存在確認
  - コピー失敗時のロールバック処理（worktree削除、メイン側保持）
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 5.3_
  - _Method: convertToWorktree_
  - _Verify: Grep "fs.cp|fs.rm|BUG_NOT_IN_WORKTREE" in convertBugWorktreeService.ts_

- [x] 2.6 シンボリックリンク作成とbug.json更新を実装する
  - WorktreeService.createSymlinksForWorktreeを呼び出し（logs/runtime）
  - bug.jsonにworktreeフィールドを追加
  - シンボリックリンク作成失敗時のエラーハンドリング
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.4_
  - _Method: createSymlinksForWorktree, addWorktreeField_
  - _Verify: Grep "createSymlinksForWorktree|SYMLINK_CREATE_FAILED" in convertBugWorktreeService.ts_

- [x] 3. IPCハンドラの統合
- [x] 3.0 (P) copyBugToWorktreeの呼び出し元を確認する
  - `grep -r "copyBugToWorktree" --include="*.ts"`で呼び出し元を検索
  - bugWorktreeHandlers.ts以外の呼び出し元がないことを確認
  - 確認結果を記録（他の呼び出し元があれば対応方針を検討）
  - _Requirements: 2.1, 2.2_
  - _Verify: No other callers found outside bugWorktreeHandlers.ts_

- [x] 3.1 bugWorktreeHandlersをConvertBugWorktreeServiceに置き換える
  - handleBugWorktreeCreateをConvertBugWorktreeService.convertToWorktree呼び出しに変更
  - 既存のcopyBugToWorktree呼び出しを削除
  - エラーレスポンスの形式をConvertBugErrorに基づいて更新
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_
  - _Method: handleBugWorktreeCreate, ConvertBugWorktreeService.convertToWorktree_
  - _Verify: Grep "ConvertBugWorktreeService" in bugWorktreeHandlers.ts_

- [x] 4. ユニットテストの実装
- [x] 4.1 (P) ConvertBugWorktreeServiceのユニットテストを作成する
  - getBugStatus: 各コミット状態の判定テスト
  - canConvert: mainブランチ、既存worktree、コミット状態の各バリデーション
  - convertToWorktree: 正常系（untracked、committed-clean）、エラー系のテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4_

- [x] 4.2 (P) WorktreeService.checkUncommittedBugChangesのユニットテストを作成する
  - git status出力のパース検証
  - 各ファイル状態（`??`, `A `, `M `, `D `等）の判定
  - _Requirements: 1.1_

- [x] 5. Integration Testsの実装
- [x] 5.1 (P) Bug worktree変換のIntegration Testを作成する
  - untracked Bugの変換フロー（コピー→削除→シンボリックリンク→bug.json更新）
  - committed-clean Bugの変換フロー（スキップ→検証→シンボリックリンク→bug.json更新）
  - committed-dirty Bugのエラー処理（エラーメッセージにファイルリスト含む）
  - 各種エラー時のロールバック動作（worktree削除、ブランチ削除）
  - _Requirements: 1.1-1.4, 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | git status --porcelainでコミット状態判定 | 1.1, 2.2, 3.1, 4.1, 4.2 | Feature |
| 1.2 | untracked状態で変換許可 | 1.1, 2.2, 2.3, 3.1, 4.1 | Feature |
| 1.3 | committed-clean状態で変換許可 | 1.1, 2.2, 2.3, 3.1, 4.1 | Feature |
| 1.4 | committed-dirty状態でエラー | 1.1, 2.2, 2.3, 3.1, 4.1 | Feature |
| 2.1 | untrackedでworktreeにコピー | 2.5, 3.1, 4.1 | Feature |
| 2.2 | コピー成功後メイン側削除 | 2.5, 3.1, 4.1 | Feature |
| 2.3 | コピー失敗時ロールバック | 2.5, 3.1, 4.1 | Feature |
| 3.1 | committed-cleanでコピースキップ | 2.5, 3.1, 4.1 | Feature |
| 3.2 | worktree作成で自動含有前提 | 2.5, 3.1, 4.1 | Feature |
| 3.3 | worktree内Bug存在確認 | 2.5, 3.1, 4.1 | Feature |
| 3.4 | Bug不在時エラー | 2.5, 3.1, 4.1 | Feature |
| 4.1 | logsシンボリックリンク作成 | 2.6, 3.1 | Feature |
| 4.2 | runtimeシンボリックリンク作成 | 2.6, 3.1 | Feature |
| 4.3 | ターゲットディレクトリ存在確認・作成 | 2.6, 3.1 | Feature |
| 4.4 | 既存ディレクトリ削除後シンボリックリンク作成 | 2.6, 3.1 | Feature |
| 5.1 | ブランチ作成失敗エラー | 2.3, 2.4, 3.1, 4.1 | Feature |
| 5.2 | worktree作成失敗時ブランチ削除 | 2.4, 3.1, 4.1 | Feature |
| 5.3 | ファイルコピー失敗時ロールバック | 2.5, 3.1, 4.1 | Feature |
| 5.4 | シンボリックリンク作成失敗エラー | 2.6, 3.1, 4.1 | Feature |
