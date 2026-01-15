# Implementation Plan

## Tasks

- [x] 1. bug.json型定義とテンプレート作成
- [x] 1.1 (P) BugJson型とBugWorktreeConfig型を定義する
  - バグのメタデータ（bug_name, created_at, updated_at）を表現する型を作成
  - worktreeオプショナルフィールドの型を定義（path, branch, created_at）
  - isBugWorktreeMode判定関数を実装
  - 既存のWorktreeConfig型との整合性を確保
  - BugMetadata型にオプショナルなworktreeフィールドを追加（UI表示用、BugJsonからマッピング）
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 (P) bug.jsonテンプレートファイルを作成する
  - `.kiro/settings/templates/bugs/bug.json`にテンプレートを配置
  - bug_name, created_at, updated_atのプレースホルダーを含める
  - _Requirements: 6.1, 6.2_

- [x] 2. BugService拡張（bug.json CRUD操作）
- [x] 2.1 bug.jsonの作成・読み取り機能を実装する
  - createBugJson: テンプレートを基にbug.jsonを生成
  - readBugJson: bug.jsonの読み取り（存在しない場合はnull）
  - updateBugJsonTimestamp: updated_at更新
  - 既存のreadBugDetail, readBugsメソッドとの統合
  - _Requirements: 1.1, 2.1, 2.2, 2.4, 2.5_

- [x] 2.2 worktreeフィールド操作機能を実装する
  - addWorktreeField: bug.jsonにworktree設定を追加
  - removeWorktreeField: bug.jsonからworktreeフィールドを削除
  - 相対パス形式（mainプロジェクトルート基準）での保存
  - _Requirements: 2.3, 3.5, 3.7, 4.7_

- [x] 2.3 Agent起動時のcwd設定機能を実装する
  - getAgentCwd: worktreeモード時はworktree.path、それ以外はprojectPath
  - 複数Agent起動時も同じworktreeパスを返す
  - _Requirements: 11.1, 11.2_

- [x] 3. WorktreeService拡張（Bugs用worktree操作）
- [x] 3.1 Bugs専用のworktreeパス生成機能を実装する
  - getBugWorktreePath: `../{project}-worktrees/bugs/{bug-name}`形式のパス生成
  - 相対パスと絶対パスの両方を返す
  - _Requirements: 3.3, 3.7_

- [x] 3.2 Bugs用worktree作成機能を実装する
  - createBugWorktree: worktreeとbugfix/ブランチの作成
  - mainブランチ確認（isOnMainBranch既存再利用）
  - `git branch bugfix/{bug-name}` + `git worktree add`の実行
  - 作成失敗時のロールバック（ブランチ削除）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [x] 3.3 Bugs用worktree削除機能を実装する
  - removeBugWorktree: worktreeとブランチの削除
  - `git worktree remove` + `git branch -d`の実行
  - _Requirements: 4.6_

- [x] 4. bug-*スキル拡張（bug.json対応）
- [x] 4.1 (P) bug-createスキルをbug.json対応に修正する
  - bug.jsonをテンプレートから新規作成
  - 既存のreport.md作成処理と統合
  - _Requirements: 2.1, 6.2_

- [x] 4.2 (P) bug-analyze/bug-verifyスキルをbug.json対応に修正する
  - updated_atタイムスタンプを更新
  - _Requirements: 2.2, 2.4_

- [x] 4.3 bug-fixスキルをworktree対応に修正する
  - worktree使用時のフローを追加（mainブランチ確認、worktree作成）
  - bug.jsonへのworktreeフィールド追加
  - worktree未使用時は通常動作を維持
  - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_

- [x] 4.4 (P) bug-statusスキルをbug.json対応に修正する
  - bug.jsonからworktree状態を読み取り表示
  - worktreeモードのインジケーター出力
  - _Requirements: 2.5_

- [x] 5. bug-mergeスキル新設
- [x] 5.1 bug-mergeスキルのコア機能を実装する
  - `/kiro:bug-merge {bug-name}`コマンドを提供
  - mainブランチ確認処理
  - `git checkout main` + `git merge --squash bugfix/{bug-name}` + `git commit`
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.2 bug-mergeのコンフリクト解決機能を実装する
  - AIによる自動解決の試行（最大7回）
  - 解決成功時: `git add` + `git commit`
  - 解決失敗時: ユーザーへの報告と手動解決案内
  - _Requirements: 4.4, 4.5_

- [x] 5.3 bug-mergeのクリーンアップ機能を実装する
  - worktree削除（WorktreeService.removeBugWorktree呼び出し）
  - bug.jsonからworktreeフィールド削除
  - 成功メッセージの表示
  - _Requirements: 4.6, 4.7, 4.8_

- [x] 6. コマンドセット更新
- [x] 6.1 コマンドセットインストーラーにbug-mergeを追加する
  - bug-mergeスキルを他のbug-*スキルと同じ場所に配置
  - インストーラーのファイルリストにbug-merge.mdを追加
  - _Requirements: 5.1, 5.2_

- [x] 7. IPC Handler拡張
- [x] 7.1 Bugs worktree関連のIPCチャンネルを追加する
  - `bug:worktree:create`: worktree作成（BugService/WorktreeService連携）
  - `bug:worktree:remove`: worktree削除
  - NOT_ON_MAIN_BRANCH, GIT_ERRORエラーハンドリング
  - _Requirements: 3.1, 3.3, 8.5_

- [x] 7.2 設定関連のIPCチャンネルを追加する
  - `settings:bugs-worktree-default:get`: デフォルト設定取得
  - `settings:bugs-worktree-default:set`: デフォルト設定保存
  - _Requirements: 9.1, 9.2_

- [x] 8. configStore拡張（設定永続化）
- [x] 8.1 Bugs worktreeデフォルト設定を追加する
  - getBugsWorktreeDefault: 設定値取得（デフォルトfalse）
  - setBugsWorktreeDefault: 設定値保存
  - electron-store永続化
  - _Requirements: 9.2, 9.3, 9.4_

- [x] 9. Menu Manager拡張
- [x] 9.1 ツールメニューにworktreeデフォルト設定トグルを追加する
  - 「Bugs: Worktreeをデフォルトで使用」チェックボックス項目
  - 配置: ツールメニュー内、コマンドセットインストールの下
  - configStoreとの双方向同期
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 10. bugStore拡張（UI状態管理）
- [x] 10.1 worktree使用フラグをbugStoreに追加する
  - useWorktree: オンメモリで保持するチェックボックス状態
  - setUseWorktree: 状態更新アクション
  - プロジェクト設定デフォルト値での初期化
  - _Requirements: 8.4_

- [x] 11. CreateBugDialog拡張
- [x] 11.1 worktreeチェックボックスをCreateBugDialogに追加する
  - チェックボックス配置: 説明フィールドの下、アクションボタンの上
  - ラベル: 「Worktreeを使用」
  - projectStore経由でデフォルト値を取得し初期化
  - 値変更時にbugStoreのuseWorktreeを更新
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 12. BugWorkflowView拡張
- [x] 12.1 worktreeチェックボックスをBugWorkflowViewに追加する
  - チェックボックス配置: ワークフローフェーズ表示の上部
  - bugStoreのuseWorktree状態と連携
  - _Requirements: 8.2_

- [x] 12.2 bug-fix実行時のworktree作成判定を実装する
  - チェックボックス値に基づいてworktree作成を決定
  - IPC `bug:worktree:create`呼び出し
  - mainブランチ外エラーのハンドリングとUI表示
  - _Requirements: 8.5, 3.2, 3.6_

- [x] 12.3 Deployボタンの条件分岐を実装する
  - BUG_PHASE_COMMANDS定数は変更せず、BugWorkflowViewのDeploy実行時に動的にコマンドを切り替える
  - bug.jsonのworktreeフィールド有無で判定
  - worktreeあり: `/kiro:bug-merge {bug-name}` 実行
  - worktreeなし: `/commit {bug-name}` 実行（BUG_PHASE_COMMANDSのデフォルト値）
  - _Requirements: 4.1_

- [x] 13. BugListItem拡張（worktreeインジケーター）
- [x] 13.1 バグ一覧でのworktreeインジケーターを実装する
  - bug.jsonからworktree状態を判定
  - worktreeフィールド存在時にGitBranchアイコン表示
  - SpecListItemのworktreeバッジと一貫したデザイン
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 14. BugsWatcherService拡張
- [x] 14.1 worktreeモード時の監視パス切り替えを実装する
  - bug.jsonのworktree.pathを監視パス解決に使用
  - SpecsWatcherServiceのパターンを踏襲
  - _Requirements: 3.7_

- [x] 15. skill-reference.md更新
- [x] 15.1 (P) skill-reference.mdにbug.json管理とbug-merge説明を追加する
  - 既存の「bug.jsonは存在しない」記述を更新し、bug.json導入を反映
  - bug-*セクションにbug.json管理の記述を追加
  - bug-mergeスキルの説明を追加
  - worktree関連のフィールドと状態遷移を記述
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 16. ユニットテスト
- [x] 16.1 (P) BugJson型とヘルパー関数のテストを作成する
  - BugJson型バリデーションテスト
  - isBugWorktreeMode関数テスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 16.2 (P) WorktreeService Bugs拡張のテストを作成する
  - getBugWorktreePath: パス生成テスト
  - createBugWorktree: git worktree addのモックテスト
  - removeBugWorktree: git worktree removeのモックテスト
  - _Requirements: 3.1, 3.3, 3.4, 4.6_

- [x] 16.3 (P) BugService拡張のテストを作成する
  - createBugJson, readBugJson, updateBugJsonTimestamp
  - addWorktreeField, removeWorktreeField
  - getAgentCwd
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.1, 11.2_

- [x] 17. 統合テスト
- [x] 17.1 (P) bug-fix開始からworktree作成までのフローテストを作成する
  - mainブランチ確認 → worktree作成 → bug.json更新の一連フロー
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 17.2 (P) bug-merge実行からworktree削除までのフローテストを作成する
  - マージ → worktree削除 → bug.json更新の一連フロー
  - _Requirements: 4.3, 4.6, 4.7, 4.8_

- [x] 17.3 (P) configStore bugsWorktreeDefault永続化テストを作成する
  - 設定の保存と読み込みの一貫性確認
  - _Requirements: 9.2, 9.3_

- [x] 18. E2Eテスト
- [x] 18.1 (P) CreateBugDialogのworktreeチェックボックス操作テストを作成する
  - チェックボックスの表示確認
  - チェック状態の切り替え確認
  - デフォルト値での初期化確認
  - _Requirements: 8.1, 8.3_

- [x] 18.2 (P) BugWorkflowViewでのbug-fix（worktree）実行テストを作成する
  - worktreeチェックボックスの表示・操作確認
  - worktree使用時のbug-fix開始フロー確認
  - mainブランチ外エラーの表示確認
  - _Requirements: 8.2, 8.5, 3.2_

- [x] 18.3 (P) Deployボタン押下でbug-merge実行テストを作成する
  - worktreeモード時にbug-mergeが実行されることを確認
  - 非worktreeモード時にcommitが実行されることを確認
  - _Requirements: 4.1_

- [x] 18.4 (P) バグ一覧でのworktreeインジケーター表示テストを作成する
  - worktreeフィールドが存在するバグにインジケーターが表示されることを確認
  - worktreeフィールドがないバグにはインジケーターが表示されないことを確認
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 18.5 (P) ツールメニューでworktreeデフォルト設定変更テストを作成する
  - トグルの表示確認
  - トグル切り替え後の永続化確認
  - 新規バグ作成時にデフォルト値が反映されることを確認
  - _Requirements: 9.1, 9.2, 9.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | bug-create時にbug.json作成 | 1.1, 2.1, 4.1, 16.1, 16.3 | Infrastructure, Feature |
| 1.2 | bug.json基本構造 | 1.1, 1.2, 16.1 | Infrastructure |
| 1.3 | worktreeフィールド追加 | 1.1, 16.1 | Infrastructure |
| 1.4 | worktreeフィールドでモード判定 | 1.1, 16.1 | Infrastructure |
| 2.1 | bug-createでbug.json新規作成 | 2.1, 4.1 | Feature |
| 2.2 | bug-analyzeでupdated_at更新 | 2.1, 4.2, 16.3 | Feature |
| 2.3 | bug-fixでworktreeフィールド追加 | 2.2, 4.3, 16.3 | Feature |
| 2.4 | bug-verifyでupdated_at更新 | 2.1, 4.2, 16.3 | Feature |
| 2.5 | bug-statusでworktree状態表示 | 2.1, 4.4, 16.3 | Feature |
| 3.1 | mainブランチ確認 | 3.2, 4.3, 17.1 | Feature |
| 3.2 | mainブランチ外エラー | 3.2, 12.2, 17.1, 18.2 | Feature |
| 3.3 | worktree作成 | 3.1, 3.2, 4.3, 7.1, 16.2, 17.1 | Feature |
| 3.4 | ブランチ命名規則 | 3.2, 4.3, 16.2, 17.1 | Feature |
| 3.5 | bug.jsonにworktreeフィールド追加 | 2.2, 4.3, 16.3, 17.1 | Feature |
| 3.6 | worktree作成失敗時エラー | 3.2, 12.2 | Feature |
| 3.7 | 相対パス保存 | 2.2, 3.1, 14.1 | Infrastructure |
| 3.8 | worktree未使用時の通常動作 | 4.3 | Feature |
| 4.1 | bug-mergeコマンド提供 | 5.1, 12.3, 18.3 | Feature |
| 4.2 | mainブランチ確認 | 5.1 | Feature |
| 4.3 | worktreeブランチマージ | 5.1, 17.2 | Feature |
| 4.4 | コンフリクト自動解決試行 | 5.2 | Feature |
| 4.5 | 自動解決失敗時報告 | 5.2 | Feature |
| 4.6 | worktree削除 | 3.3, 5.3, 16.2, 17.2 | Feature |
| 4.7 | bug.jsonからworktreeフィールド削除 | 2.2, 5.3, 17.2 | Feature |
| 4.8 | 成功メッセージ表示 | 5.3, 17.2 | Feature |
| 5.1 | コマンドセットにbug-merge含める | 6.1 | Infrastructure |
| 5.2 | 同じ場所に配置 | 6.1 | Infrastructure |
| 6.1 | bug.jsonテンプレート提供 | 1.2 | Infrastructure |
| 6.2 | テンプレートからbug.json生成 | 1.2, 4.1 | Infrastructure |
| 7.1 | skill-reference.mdにbug.json管理記述 | 15.1 | Infrastructure |
| 7.2 | skill-reference.mdにbug-merge説明 | 15.1 | Infrastructure |
| 7.3 | skill-reference.mdにworktree状態遷移記述 | 15.1 | Infrastructure |
| 8.1 | バグ新規作成ダイアログにチェックボックス | 11.1, 18.1 | Feature |
| 8.2 | ワークフローエリアにチェックボックス | 12.1, 18.2 | Feature |
| 8.3 | デフォルト値で初期化 | 11.1, 18.1 | Feature |
| 8.4 | 値をオンメモリ保持 | 10.1, 11.1 | Feature |
| 8.5 | bug-fix開始時にworktree決定 | 7.1, 12.2, 18.2 | Feature |
| 9.1 | ツールメニューにトグル表示 | 7.2, 9.1, 18.5 | Feature |
| 9.2 | 設定永続化 | 7.2, 8.1, 9.1, 17.3, 18.5 | Feature |
| 9.3 | デフォルト値OFF | 8.1, 9.1, 17.3 | Infrastructure |
| 9.4 | 新規バグ作成時にデフォルト値使用 | 8.1, 18.5 | Feature |
| 10.1 | バグ一覧でworktree状態判定 | 13.1, 18.4 | Feature |
| 10.2 | worktreeフィールド存在時インジケーター表示 | 13.1, 18.4 | Feature |
| 10.3 | Specと一貫したデザイン | 13.1, 18.4 | Feature |
| 11.1 | Agent起動時にworktree.pathをpwd設定 | 2.3, 16.3 | Feature |
| 11.2 | 複数Agent起動時に同じworktreeパス | 2.3, 16.3 | Feature |
