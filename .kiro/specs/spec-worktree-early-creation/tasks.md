# Implementation Plan

## Task 1. CLI spec-initへの--worktreeフラグ実装
- [x] 1.1 (P) spec-initコマンドに--worktreeフラグ解析を追加
  - コマンド引数から--worktreeフラグを検出するロジックを実装
  - main/masterブランチでの実行を検証し、異なるブランチではエラーメッセージを表示
  - ブランチ/worktreeが既に存在する場合の適切なエラーハンドリング
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 1.2 (P) worktree作成とcwd変更処理の実装
  - `.kiro/worktrees/specs/{feature-name}`にworktreeを作成
  - `feature/{feature-name}`ブランチを作成
  - worktree作成後にcwdをworktreeディレクトリに変更
  - spec.jsonにworktreeフィールド（enabled, path, branch, created_at）を記録
  - **ロールバック処理**: worktree作成失敗時は作成済みブランチを削除（`git branch -d feature/{feature-name}`）
  - _Requirements: 1.1, 2.1, 8.1_

## Task 2. CLI spec-planへの--worktreeフラグ実装
- [x] 2.1 (P) spec-planコマンドに--worktreeフラグ解析を追加
  - コマンド引数から--worktreeフラグを検出するロジックを実装
  - main/masterブランチでの実行を検証
  - feature名確定後にworktree作成を実行するタイミング制御
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 2.2 worktree作成とspec.json記録処理
  - feature名確定後にworktreeを作成（spec.json書き込み直前のタイミング）
  - spec.jsonにworktreeフィールドを記録
  - worktree作成後にcwdをworktreeに変更
  - --worktreeなしの場合はworktreeフィールドを含めない
  - **ロールバック処理**: worktree作成失敗時は作成済みブランチを削除
  - **対話中断時の保証**: worktree作成はPhase 4（Spec Directory Creation）の最終ステップで実行し、中断時に孤立リソースが残らない設計
  - _Requirements: 1.2, 2.1, 2.2, 8.1_

## Task 3. spec.json worktreeフィールドの型定義とバリデーション
- [x] 3.1 (P) 既存WorktreeConfig型との互換性確認
  - renderer/types/worktree.tsのWorktreeConfig型を確認
  - spec.jsonのworktreeフィールドとして使用可能か検証
  - 必要に応じて型定義の調整
  - _Requirements: 2.3_

## Task 4. Electron UI Spec作成ダイアログの拡張
- [x] 4.1 (P) CreateSpecDialogにworktreeモードスライドスイッチを追加
  - スライドスイッチUIコンポーネントを追加（デフォルトOFF）
  - 明確な日本語ラベル「Worktreeモードで作成」を表示
  - worktreeMode状態のローカルstate管理を実装
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 4.2 IPCハンドラにworktreeModeパラメータを追加
  - executeSpecInit/executeSpecPlanのパラメータにworktreeModeを追加
  - IPC型定義（channels.ts）を更新
  - worktreeMode=trueの場合、WorktreeServiceでworktree作成
  - Claudeプロセス起動時にcwdをworktreePathに設定
  - _Requirements: 3.2, 8.2, 8.4_
  - _Method: executeSpecInit, executeSpecPlan_

## Task 5. SpecsWatcherServiceの監視対象拡張
- [x] 5.1 (P) .kiro/worktrees/specs/ディレクトリの監視追加
  - chokidar.watchに`.kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/`パスを追加（二重監視回避）
  - プロジェクトロード時に監視を開始
  - ディレクトリ不存在時はエラーなしでスキップ
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.2 worktree内spec変更イベントの処理
  - extractSpecId()をworktrees/specsパスに対応
  - worktree内のspec変更で通常specと同等のイベントを発火
  - spec.json、requirements.md、design.md、tasks.mdの変更を検知
  - _Requirements: 4.4_

## Task 6. symlink関連コードの完全削除
- [x] 6.1 (P) createSymlinksForWorktree()からspec symlink削除
  - WorktreeServiceのspec symlink作成ロジック（L646-L688相当）を削除
  - logs/runtimeのsymlink作成は維持
  - _Requirements: 5.1_
  - _Verify: Grep "createSymlink.*spec" in WorktreeService.ts should return 0 matches_

- [x] 6.2 (P) prepareWorktreeForMerge()の削除
  - WorktreeServiceのprepareWorktreeForMerge()メソッド（L740-L778相当）を削除
  - このメソッドを呼び出している箇所を修正
  - _Requirements: 5.2_

- [x] 6.3 spec symlink関連テストの削除
  - WorktreeService.test.tsからspec symlink関連のテストケースを削除
  - prepareWorktreeForMerge関連のテストを削除
  - _Requirements: 5.3, 5.4_

## Task 7. impl時worktreeモード選択UIの削除
- [x] 7.1 (P) ImplPhasePanelからworktreeチェックボックス削除
  - worktreeModeSelectedプロパティを削除
  - getButtonLabel()からworktreeモード分岐を削除
  - ボタンスタイリングからworktreeモード分岐を削除
  - WorktreeModeCheckboxのimportを削除
  - _Requirements: 6.1_

- [x] 7.2 (P) WorktreeModeCheckboxコンポーネントの削除
  - `shared/components/workflow/WorktreeModeCheckbox.tsx`を削除
  - `shared/components/workflow/WorktreeModeCheckbox.test.tsx`を削除
  - index.tsからexportを削除
  - _Requirements: 6.2_

- [x] 7.3 startImplPhaseからworktree作成ロジックを削除
  - isWorktreeModeEnabledAndNeedsCreation()の呼び出しを削除
  - impl開始時のworktree作成ロジック（L154-L249相当）を削除
  - spec.json.worktree.enabledからモード判定するように変更
  - hasExistingWorktree()でworktree存在を判定
  - _Requirements: 6.3, 6.4, 8.3_

## Task 8. spec-mergeの簡素化
- [x] 8.1 (P) symlink cleanup処理の削除
  - spec-merge.mdからprepareWorktreeForMerge相当のStep 1.5を削除
  - symlink削除処理を実行しないように変更
  - git reset/checkout処理を実行しないように変更
  - _Requirements: 7.1, 7.2_

- [x] 8.2 既存マージロジックの維持確認
  - worktreeブランチからmainへのマージ処理を維持
  - worktree削除とbranch削除処理を維持
  - spec.jsonからworktreeフィールドを削除する処理を維持
  - _Requirements: 7.3, 7.4, 7.5_

## Task 9. cwd設定の一貫性確保
- [x] 9.1 spec-requirements/design/tasks実行時のcwd設定
  - SpecManagerService.startAgent()でspecIdがあれば全グループでworktreeCwd自動解決
  - worktreeモードの場合、Claudeプロセスのcwdをworktreeに設定
  - 通常モードの場合は現行通りのcwd設定
  - _Requirements: 8.2, 8.4_
  - _Method: executeProjectAgent, startAgent_

## Task 10. 統合テスト
- [x] 10.1 spec-init --worktreeのCLI統合テスト
  - CLIからworktree作成とspec.json記録を検証
  - main/master以外でのエラー表示を検証
  - _Requirements: 1.1, 1.3, 1.4, 2.1_

- [x] 10.2 spec-plan --worktreeのCLI統合テスト
  - 対話後のworktree作成とspec.json記録を検証
  - _Requirements: 1.2, 2.1_

- [x] 10.3 UIからのworktreeモードspec作成テスト
  - CreateSpecDialogのスライドスイッチ操作を検証
  - IPC経由でのworktree作成を検証
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10.4 簡素化されたspec-mergeテスト
  - symlink処理なしでマージ完了を検証
  - worktree削除とbranch削除を検証
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10.5 SpecsWatcher複数パス監視テスト
  - .kiro/specs/と.kiro/worktrees/specs/の両方で変更検知を検証
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | spec-init --worktreeでworktree作成 | 1.1, 1.2, 10.1 | Feature |
| 1.2 | spec-plan --worktreeでworktree作成 | 2.1, 2.2, 10.2 | Feature |
| 1.3 | main/master以外でエラー表示 | 1.1, 2.1, 10.1 | Feature |
| 1.4 | worktree/branch既存時エラー表示 | 1.1, 2.1, 10.1 | Feature |
| 2.1 | spec.jsonにworktreeフィールド記録 | 1.2, 2.2, 10.1, 10.2 | Feature |
| 2.2 | --worktreeなし時はフィールドなし | 2.2 | Feature |
| 2.3 | WorktreeConfig型互換性 | 3.1 | Infrastructure |
| 3.1 | ダイアログにスライドスイッチ追加 | 4.1, 10.3 | Feature |
| 3.2 | スイッチONでworktreeモード | 4.2, 10.3 | Feature |
| 3.3 | スイッチOFFで通常モード（デフォルト） | 4.1, 10.3 | Feature |
| 3.4 | 明確なラベル表示 | 4.1, 10.3 | Feature |
| 4.1 | .kiro/worktrees/specs/監視追加 | 5.1, 10.5 | Feature |
| 4.2 | プロジェクトロード時に監視開始 | 5.1, 10.5 | Feature |
| 4.3 | ディレクトリ不在時のエラー回避 | 5.1, 10.5 | Feature |
| 4.4 | worktree spec変更で同等イベント発火 | 5.2, 10.5 | Feature |
| 5.1 | createSymlinksForWorktree()からspec symlink削除 | 6.1 | Infrastructure |
| 5.2 | prepareWorktreeForMerge()からsymlink/reset/checkout削除 | 6.2 | Infrastructure |
| 5.3 | spec symlink関連テスト削除 | 6.3 | Infrastructure |
| 5.4 | worktree-spec-symlink実装完全削除 | 6.3 | Infrastructure |
| 6.1 | ImplPhasePanelからworktreeチェックボックス削除 | 7.1 | Infrastructure |
| 6.2 | WorktreeModeCheckboxコンポーネント削除/非推奨化 | 7.2 | Infrastructure |
| 6.3 | impl開始ハンドラからworktreeパラメータ削除 | 7.3 | Feature |
| 6.4 | spec.json.worktree.enabledから実行モード判定 | 7.3 | Feature |
| 7.1 | symlink削除処理を実行しない | 8.1, 10.4 | Feature |
| 7.2 | git reset/checkout処理を実行しない | 8.1, 10.4 | Feature |
| 7.3 | 既存マージロジックを使用 | 8.2, 10.4 | Feature |
| 7.4 | worktree削除とbranch削除 | 8.2, 10.4 | Feature |
| 7.5 | spec.jsonからworktreeフィールド削除 | 8.2, 10.4 | Feature |
| 8.1 | spec-init/plan後のcwdをworktreeに設定 | 1.2, 2.2 | Feature |
| 8.2 | spec-requirements/design/tasks実行時のcwd設定 | 4.2, 9.1 | Feature |
| 8.3 | spec-impl実行時のcwd設定 | 7.3 | Feature |
| 8.4 | spec.json.worktree.pathからcwd判定 | 4.2, 9.1 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
