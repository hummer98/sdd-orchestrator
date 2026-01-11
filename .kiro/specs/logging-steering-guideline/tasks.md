# Implementation Plan

- [x] 1. ロギングガイドラインファイルの作成
- [x] 1.1 (P) `.kiro/steering/logging.md`を作成する
  - ログレベル対応（debug/info/warning/error）の定義を記載
  - ログフォーマット（日時、ログレベル、内容）のガイドラインを記載
  - ログ場所のsteering/CLAUDE.md言及指針を記載
  - 過剰なログ実装の回避指針を記載
  - 開発/本番でのログ出力先分離の推奨を記載
  - ログレベル指定手段（CLI/環境変数/設定ファイル）の推奨を記載
  - 調査に必要な変数のログ出力の推奨を記載
  - 推奨ログフォーマット例を含める
  - 構造化ログ（JSON lines）の選択肢を併記
  - 言語/フレームワーク非依存の観点のみとする
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. debugging.mdへのデバッグ原則追加
- [x] 2.1 (P) `.kiro/steering/debugging.md`に「デバッグの原則」セクションを追加する
  - 「ログファースト原則」として「推測ではなくログを確認する」を明記
  - エラー発生時は必ずログを参照してから調査を開始する指針を記載
  - `.kiro/steering/logging.md`への参照を含める
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3. インストーラー配布用テンプレートの作成
- [x] 3.1 (P) `electron-sdd-manager/resources/templates/settings/templates/steering/logging.md`を作成する
  - 内容は`.kiro/steering/logging.md`と同一
  - _Requirements: 2.1, 2.2_

- [x] 3.2 (P) `electron-sdd-manager/resources/templates/settings/templates/steering/debugging.md`を作成する
  - 内容は`.kiro/steering/debugging.md`と同一
  - _Requirements: 6.4_

- [x] 4. settingsテンプレートへのsteering追加（Task 3.1/3.2で完了）
- [x] 4.1 Task 3.1/3.2で`templates/settings/templates/steering/`にlogging.mdとdebugging.mdを配置済み
  - プロジェクトバリデーションで参照されるテンプレート
  - _Requirements: 7.4_

- [x] 5. CLAUDE.mdへのlogging.md説明追加
- [x] 5.1 (P) `electron-sdd-manager/resources/templates/CLAUDE.md`のSteering Configurationセクションにlogging.md説明を追加する
  - `**logging.md**: ロギング設計/実装の観点・ガイドライン`の行を追加
  - 既存のsteering説明と同じフォーマットで記載
  - _Requirements: 3.1, 3.2_

- [x] 6. document-reviewへのLogging観点追加
- [x] 6.1 `.claude/commands/kiro/document-review.md`の「Technical Considerations」セクションに「Logging (see steering/logging.md)」を追加する
  - 既存の項目リストに追加
  - _Requirements: 4.1_
  - NOTE: .claude/への書き込み許可がないためテンプレート更新のみ実施。インストーラー経由で反映される

- [x] 6.2 (P) `electron-sdd-manager/resources/templates/commands/document-review/document-review.md`にLogging観点を追加する
  - 「Technical Considerations」セクションに追加
  - _Requirements: 4.2_

- [x] 6.3 (P) `electron-sdd-manager/resources/templates/commands/spec-manager/document-review.md`にLogging観点を追加する
  - 「Technical Considerations」セクションに追加
  - _Requirements: 4.2_

- [x] 7. spec-inspectionへのLoggingChecker追加
- [x] 7.1 `.claude/agents/kiro/spec-inspection.md`にLoggingCheckerカテゴリを追加する
  - 必須観点（ログレベル対応、ログフォーマット、ログ場所言及、過剰ログ回避）の検証を定義
  - 推奨観点（ログ出力先分離、ログレベル指定、調査用変数）の検証を定義
  - 必須観点違反はCritical/Major、推奨観点違反はMinor/Infoとして報告
  - steering/logging.mdを参照して検証する旨を明記
  - _Requirements: 5.1, 5.2, 5.3_
  - NOTE: .claude/への書き込み許可がないためテンプレート更新のみ実施。インストーラー経由で反映される

- [x] 7.2 (P) `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md`にLoggingCheckerを追加する
  - 7.1と同様の内容
  - _Requirements: 5.4_

- [x] 7.3 (P) `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md`にLoggingCheckerを追加する
  - 7.1と同様の内容
  - _Requirements: 5.4_

- [x] 7.4 (P) `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-inspection.md`にLoggingCheckerを追加する
  - 7.1と同様の内容
  - _Requirements: 5.4_

- [x] 7.5 (P) `electron-sdd-manager/resources/templates/commands/spec-manager/inspection.md`にLoggingCheckerを追加する
  - 7.1と同様の内容
  - _Requirements: 5.4_

- [x] 7.6 (P) `electron-sdd-manager/resources/templates/commands/kiro/spec-inspection.md`にLoggingCheckerを追加する
  - 7.1と同様の内容
  - _Requirements: 5.4_

- [x] 8. プロジェクトバリデーションへのsteering追加
- [x] 8.1 `electron-sdd-manager/src/main/services/projectChecker.ts`の`REQUIRED_SETTINGS`に`templates/steering/logging.md`と`templates/steering/debugging.md`を追加する
  - 既存の配列に2項目を追加
  - テストファイル`projectChecker.test.ts`にテストケースを追加
  - checkSettings()の既存ロジックで自動的にバリデーション対象となる
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. コマンドセットインストーラーのsteering配布設定
- [x] 9.1 `CC_SDD_SETTINGS`に`templates/steering/logging.md`と`templates/steering/debugging.md`を追加する
  - `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.ts`の`CC_SDD_SETTINGS`配列に追加
  - テストファイル`ccSddWorkflowInstaller.test.ts`にテストケースを追加
  - `installSettings()`により自動的に`.kiro/settings/templates/steering/`へコピーされる
  - _Requirements: 2.3_

- [x] 10. セマンティックマージによるCLAUDE.md反映確認
- [x] 10.1 コマンドセットインストール時にCLAUDE.mdのlogging.md説明が既存プロジェクトにマージされることを確認する
  - セマンティックマージの実装: `ccSddWorkflowInstaller.ts`の`updateClaudeMd()`および`mergeClaudeMdWithClaude()`
  - Task 5でCLAUDE.mdテンプレートを更新済み
  - 既存プロジェクトのCLAUDE.mdにlogging.md説明がマージされることを確認（既存機能で対応）
  - _Requirements: 3.3_
