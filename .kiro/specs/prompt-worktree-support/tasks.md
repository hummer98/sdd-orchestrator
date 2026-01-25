# Implementation Plan

## Task 1. Worktree作成スクリプトの実装

- [x] 1.1 (P) create-spec-worktree.sh を実装
  - `feature/<feature-name>`ブランチを作成するスクリプトを作成
  - `.kiro/worktrees/specs/<feature-name>`にworktreeを作成
  - 引数チェック（引数なしで使用方法を出力、終了コード1）
  - 既存ブランチチェック（`git rev-parse --verify`）
  - 既存worktreeディレクトリチェック
  - 成功時は成功メッセージと終了コード0、エラー時はエラーメッセージと終了コード1
  - `git worktree add -b feature/<feature-name> .kiro/worktrees/specs/<feature-name>`を使用
  - _Requirements: 1.1, 1.2, 1.5, 1.6_
  - _Method: git worktree add, git rev-parse_
  - _Verify: Grep "git worktree add" in create-spec-worktree.sh_

- [x] 1.2 (P) create-bug-worktree.sh を実装
  - `bugfix/<bug-name>`ブランチを作成するスクリプトを作成
  - `.kiro/worktrees/bugs/<bug-name>`にworktreeを作成
  - 引数チェック、既存ブランチ/worktreeチェック（create-spec-worktree.shと同様のロジック）
  - 成功/エラー時の終了コードとメッセージ出力
  - `git worktree add -b bugfix/<bug-name> .kiro/worktrees/bugs/<bug-name>`を使用
  - _Requirements: 1.3, 1.4, 1.5, 1.6_
  - _Method: git worktree add, git rev-parse_
  - _Verify: Grep "git worktree add" in create-bug-worktree.sh_

## Task 2. spec-plan.mdのworktree対応

- [x] 2.1 (P) cc-sdd/spec-plan.md に--worktreeフラグ対応を追加
  - Phase 1にフラグ解析処理を追加（$ARGUMENTSから`--worktree`を検出）
  - Phase 4に条件分岐を追加（worktreeモード時はスクリプト実行）
  - `.kiro/scripts/create-spec-worktree.sh <feature-name>`の呼び出しを追加
  - スクリプト失敗時のエラーハンドリング（エラー表示とSpec作成中止）
  - spec.jsonにworktreeフィールド追加（enabled: true, path, branch, created_at）
  - worktreeモード時のスペックディレクトリパスを`.kiro/worktrees/specs/{feature-name}/.kiro/specs/{feature-name}/`に変更
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Bash call to create-spec-worktree.sh_
  - _Verify: Grep "create-spec-worktree.sh" in spec-plan.md_

- [x] 2.2 (P) cc-sdd-agent/spec-plan.md に--worktreeフラグ対応を追加
  - cc-sdd/spec-plan.mdと同様の変更を適用
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Bash call to create-spec-worktree.sh_
  - _Verify: Grep "create-spec-worktree.sh" in spec-plan.md_

- [x] 2.3 (P) spec-manager/spec-plan.md に--worktreeフラグ対応を追加
  - cc-sdd/spec-plan.mdと同様の変更を適用
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Bash call to create-spec-worktree.sh_
  - _Verify: Grep "create-spec-worktree.sh" in spec-plan.md_

## Task 3. bug-create.mdのworktree対応

- [x] 3.1 bug/bug-create.md に--worktreeフラグ対応を追加
  - Parse Argumentsセクションに`--worktree`フラグ検出を追加
  - Execution Stepsにworktreeモード処理を追加（bug名確定後にスクリプト実行）
  - `.kiro/scripts/create-bug-worktree.sh <bug-name>`の呼び出しを追加
  - スクリプト失敗時のエラーハンドリング（エラー表示とBug作成中止）
  - bug.jsonにworktreeフィールド追加（enabled: true, path, branch, created_at）
  - worktreeモード時のバグディレクトリパスを`.kiro/worktrees/bugs/{bug-name}/.kiro/bugs/{bug-name}/`に変更
  - 依存: Task 1.2（create-bug-worktree.shが必要）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Method: Bash call to create-bug-worktree.sh_
  - _Verify: Grep "create-bug-worktree.sh" in bug-create.md_

## Task 4. テンプレートスクリプトの配置

- [x] 4.1 (P) スクリプトをtemplates/scripts/に配置
  - Task 1で作成したスクリプトを`electron-sdd-manager/resources/templates/scripts/`にコピー
  - create-spec-worktree.sh と create-bug-worktree.sh が配置されていることを確認
  - 依存: Task 1.1, 1.2（スクリプト実装完了が必要）
  - _Requirements: 4.1, 4.2_
  - _Verify: Glob "templates/scripts/create-*-worktree.sh"_

- [x] 4.2 HELPER_SCRIPTS定数に新スクリプトを追加
  - `ccSddWorkflowInstaller.ts`の`HELPER_SCRIPTS`配列に追加
  - `'create-spec-worktree.sh'`と`'create-bug-worktree.sh'`を追加
  - _Requirements: 4.3_
  - _Method: HELPER_SCRIPTS array update_
  - _Verify: Grep "create-spec-worktree.sh|create-bug-worktree.sh" in ccSddWorkflowInstaller.ts_

## Task 5. 動作検証

- [x] 5.1 スクリプト単体テスト
  - create-spec-worktree.shの引数なしエラー出力確認
  - create-spec-worktree.shの正常動作確認（worktree作成、ブランチ作成）
  - create-bug-worktree.shの引数なしエラー出力確認
  - create-bug-worktree.shの正常動作確認（worktree作成、ブランチ作成）
  - 既存ブランチ/worktree検知エラー確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 5.2 インストーラー動作確認
  - installScriptsメソッドがcreate-spec-worktree.shとcreate-bug-worktree.shをインストールすることを確認
  - テストプロジェクトへのインストール後、`.kiro/scripts/`に実行権限付きでスクリプトが存在することを確認
  - _Requirements: 4.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | create-spec-worktree.shが存在しfeature-name引数を受け取る | 1.1 | Feature |
| 1.2 | スクリプト実行でブランチ/worktree作成、終了コード0 | 1.1 | Feature |
| 1.3 | create-bug-worktree.shが存在しbug-name引数を受け取る | 1.2 | Feature |
| 1.4 | スクリプト実行でブランチ/worktree作成、終了コード0 | 1.2 | Feature |
| 1.5 | 既存ブランチ/worktree時にエラーメッセージと終了コード1 | 1.1, 1.2 | Feature |
| 1.6 | 引数不足時に使用方法と終了コード1 | 1.1, 1.2 | Feature |
| 2.1 | spec-plan.mdが--worktreeフラグを検出 | 2.1, 2.2, 2.3 | Feature |
| 2.2 | --worktree時にスクリプト実行、spec.jsonにworktreeフィールド追加 | 2.1, 2.2, 2.3 | Feature |
| 2.3 | --worktreeなしで従来通り動作 | 2.1, 2.2, 2.3 | Feature |
| 2.4 | スクリプト失敗時にエラー表示、Spec作成中止 | 2.1, 2.2, 2.3 | Feature |
| 3.1 | bug-create.mdが--worktreeフラグを検出 | 3.1 | Feature |
| 3.2 | --worktree時にスクリプト実行、bug.jsonにworktreeフィールド追加 | 3.1 | Feature |
| 3.3 | --worktreeなしで従来通り動作 | 3.1 | Feature |
| 3.4 | スクリプト失敗時にエラー表示、Bug作成中止 | 3.1 | Feature |
| 4.1 | templates/scripts/create-spec-worktree.shが存在 | 4.1 | Infrastructure |
| 4.2 | templates/scripts/create-bug-worktree.shが存在 | 4.1 | Infrastructure |
| 4.3 | インストール処理がscripts/ディレクトリを対象に含む | 4.2 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
