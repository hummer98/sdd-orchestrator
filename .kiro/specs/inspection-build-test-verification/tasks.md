# Implementation Plan

## Task Format

このドキュメントはspec-inspectionエージェントにBuild & Test Verification機能を追加するための実装タスクを定義します。

**凡例**:
- `(P)` = 並行実行可能なタスク（他のタスクと同時に実施可能）

---

- [ ] 1. steering/tech.mdへのVerification Commandsセクション追加
- [ ] 1.1 (P) tech.mdテンプレートにVerification Commandsセクションを追加
  - テンプレートファイル（`resources/templates/steering/tech.md`）にVerification Commandsセクションを追加
  - Markdownテーブル形式でカテゴリ（build, typecheck, lint, test, e2e, all）とコマンドを定義
  - デフォルト値として`task verify:*`コマンドを設定
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 1.2 (P) 既存のtech.mdにVerification Commandsセクションを追加
  - `.kiro/steering/tech.md`にVerification Commandsセクションを追加
  - プロジェクトの実際のverifyコマンド（`task verify:*`）を設定
  - _Requirements: 1.3, 1.4_

- [ ] 2. verify:*タスク雛形テンプレートの作成
- [ ] 2.1 (P) verify:*タスクテンプレートファイルを作成
  - `resources/templates/taskfile/verify-tasks.yml`を新規作成
  - verify:build, verify:typecheck, verify:lint, verify:test, verify:e2e, verify:allタスクを定義
  - 各タスクにpreconditions（package.json存在確認）を設定
  - verify:allは他のverify:*タスクを順次実行
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. TaskfileInstallerServiceの実装
- [ ] 3.1 TaskfileInstallerServiceの基本実装
  - `electron-sdd-manager/src/main/services/taskfileInstallerService.ts`を新規作成
  - `installVerifyTasks`メソッドを実装（package.json解析、適切なコマンド設定）
  - `checkVerifyTasks`メソッドを実装（task CLI存在確認、Taskfile.yml確認、verify:*タスク定義確認）
  - Result型によるエラーハンドリング
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 3.2 TaskfileInstallerServiceのユニットテスト
  - 新規Taskfile.yml作成シナリオのテスト
  - 既存Taskfile.ymlへのマージシナリオのテスト
  - 既存タスク保持（上書きしない）の検証
  - エラーケース（パーミッション、不正YAML）のテスト
  - _Requirements: 5.3, 5.4_

- [ ] 4. IPCハンドラとメニュー統合
- [ ] 4.1 verify:*タスクインストール用IPCハンドラを追加
  - `channels.ts`に`INSTALL_VERIFY_TASKS`チャンネルを追加
  - `handlers.ts`にインストールハンドラを実装
  - 確認ダイアログ表示後にインストール実行
  - 完了通知を返却
  - _Requirements: 5.1, 5.5, 5.6_

- [ ] 4.2 メニュー項目を追加
  - 「ツール」メニューに「verify:*タスクをインストール」項目を追加
  - プロジェクト未選択時は無効化
  - クリック時にIPCハンドラを呼び出し
  - _Requirements: 2.5, 5.1_

- [ ] 5. ProjectCheckerの拡張
- [ ] 5.1 checkVerificationEnvironmentメソッドを追加
  - `projectChecker.ts`に検証環境確認メソッドを追加
  - taskコマンドの存在確認（`which task`実行）
  - Taskfile.ymlの存在確認
  - verify:*タスクの定義状況確認
  - VerificationEnvironmentCheck型で結果を返却
  - _Requirements: 4.1, 4.2, 4.3, 4.6_

- [ ] 5.2 ProjectCheckerのユニットテスト
  - task有り/無しパターンのテスト
  - Taskfile.yml有り/無しパターンのテスト
  - verify:*タスク定義状況のテスト
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Renderer側の検証環境表示
- [ ] 6.1 projectStoreに検証環境状態を追加
  - `verificationCheck`状態を追加
  - `checkVerificationEnvironment`アクションを追加
  - プロジェクト選択時に自動更新
  - _Requirements: 4.6_

- [ ] 6.2 ProjectValidationPanelに検証環境警告を追加
  - taskコマンド未インストール時の警告とインストール案内表示
  - verify:*タスク未定義時の雛形インストール提案表示
  - 問題がある場合のみ表示（ノイズ削減）
  - _Requirements: 4.4, 4.5_

- [ ] 7. spec-inspectionエージェントの拡張
- [ ] 7.1 Build & Test Verificationカテゴリを追加
  - spec-inspectionエージェント定義に新カテゴリを追加
  - steering/tech.mdからVerification Commands設定を読み取るロジックを追加
  - Markdownテーブルのパース処理を実装
  - _Requirements: 1.1, 1.2, 1.4, 3.1_

- [ ] 7.2 検証コマンド実行ロジックを実装
  - task verify:*コマンドの実行ロジック
  - 各検証項目（build, typecheck, lint, test, e2e）の実行
  - PASS/FAIL/SKIP/ERRORステータスの判定
  - 進捗ログ出力
  - _Requirements: 3.2, 3.3, 3.5_

- [ ] 7.3 フォールバック実行戦略を実装
  - taskコマンド未存在時のpackage.jsonスクリプト解析
  - npm/yarn/pnpmの検出と優先順位付け
  - 各検証カテゴリに対応するスクリプト名の探索（build, typecheck, type-check, lint, test, test:e2e等）
  - フォールバックモードのフラグ設定
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 7.4 検査レポートにBuild & Test Verificationセクションを追加
  - inspection-{n}.mdのレポート生成ロジックを拡張
  - ステータスサマリーテーブル（Category, Status, Command, Duration, Details）を出力
  - FAIL時のエラー詳細を折りたたみ形式で出力
  - 実行コマンドと検証時間を記録
  - 全体ステータス（PASSED/FAILED）と失敗カテゴリ一覧を出力
  - _Requirements: 3.4, 3.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 8. 統合テストとE2Eテスト
- [ ] 8.1 IPCハンドラの統合テスト
  - verify:*タスクインストールフローの統合テスト
  - 検証環境確認の統合テスト
  - _Requirements: 5.1, 5.6_

- [ ] 8.2 (P) ProjectValidationPanelのE2Eテスト
  - 検証環境警告の表示確認
  - インストール提案ボタンの動作確認
  - _Requirements: 4.4, 4.5_

- [ ] 8.3 (P) メニューからのverify:*タスクインストールE2Eテスト
  - メニュー項目の存在確認
  - インストール実行とTaskfile.yml更新確認
  - _Requirements: 2.5, 5.1, 5.6_
