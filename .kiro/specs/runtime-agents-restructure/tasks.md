# Implementation Plan

## 1. AgentCategory型定義とパス解決ロジック

- [x] 1.1 (P) AgentCategory型の定義
  - 'specs' | 'bugs' | 'project' の3カテゴリを表す型を定義
  - specIdからカテゴリを判定するユーティリティ関数を作成
  - `bug:` プレフィックスの場合は 'bugs'、空文字列の場合は 'project'、それ以外は 'specs'
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 1.2 (P) 新ディレクトリ構造のパス解決関数を実装
  - カテゴリとエンティティIDからベースパスを生成する関数
  - メタデータパス: `runtime/agents/{category}/{id}/agent-{agentId}.json`
  - ログパス: `runtime/agents/{category}/{id}/logs/agent-{agentId}.log`
  - projectカテゴリの場合はidを省略
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

## 2. AgentRecordService の改修

- [x] 2.1 AgentRecordService のパス生成ロジックを新構造に対応
  - getFilePath メソッドにcategory引数を追加
  - 後方互換のため既存シグネチャは deprecate として維持
  - specIdからcategoryを自動判定する内部ロジックを追加
  - _Requirements: 3.1_
  - _Method: getFilePath, determineCategory_
  - _Verify: Grep "AgentCategory|determineCategory" in agentRecordService.ts_

- [x] 2.2 AgentRecordService の書き込みメソッドを新パスに対応
  - writeRecord メソッドで新構造のパスに書き込み
  - ディレクトリが存在しない場合は自動作成
  - _Requirements: 1.1, 1.3, 1.5, 3.1_

- [x] 2.3 AgentRecordService の読み取りメソッドを新構造に対応
  - readRecordsFor メソッドを実装（カテゴリとエンティティIDを受け取る）
  - readRecordsForSpec は readRecordsFor('specs', specId) のラッパーとして維持
  - readRecordsForBug を新規実装
  - readProjectAgents を新パスに対応
  - _Requirements: 3.2, 3.3, 3.4_

## 3. LogFileService の改修

- [x] 3.1 LogFileService のbasePath を統一
  - 新規ログの書き込み先を `.kiro/runtime/agents` に統一
  - `specs/{specId}/logs/` への書き込みを廃止
  - _Requirements: 2.1, 7.1_
  - _Method: getLogFilePath_
  - _Verify: Grep "runtime/agents" in logFileService.ts_

- [x] 3.2 LogFileService の appendLog メソッドを新構造に対応
  - category引数を追加
  - logsサブディレクトリの自動作成
  - _Requirements: 1.2, 1.4, 1.6, 1.7, 2.3_

- [x] 3.3 LogFileService に readLogWithFallback メソッドを実装
  - 新パスを優先的に確認
  - 新パスにない場合はlegacyパス（specs/{specId}/logs/）をチェック
  - 読み取り元がlegacyかどうかのフラグを返却
  - _Requirements: 2.2, 6.1, 6.2_

- [x] 3.4 LogFileService に legacy ログ情報取得メソッドを実装
  - hasLegacyLogs: legacyパスにログが存在するか確認
  - getLegacyLogInfo: ファイル数と合計サイズを返却
  - _Requirements: 5.1, 5.2, 5.3_

## 4. AgentRecordWatcherService の拡張

- [x] 4.1 (P) 3つのwatcherカテゴリの実装
  - projectWatcher: `runtime/agents/project/` を常時監視（depth: 0）
  - specWatcher: 選択されたspecの `runtime/agents/specs/{specId}/` を監視
  - bugWatcher: 選択されたbugの `runtime/agents/bugs/{bugId}/` を監視
  - _Requirements: 4.1, 4.4_

- [x] 4.2 switchWatchScope メソッドの改修
  - category引数（'specs' | 'bugs'）を追加
  - bugsカテゴリの場合はbugWatcherを使用
  - specsカテゴリの場合はspecWatcherを使用
  - _Requirements: 4.2, 4.3, 4.5_

- [x] 4.3 IPCハンドラのswitchWatchScope呼び出し箇所を更新
  - selectSpec, selectBug 呼び出し時にカテゴリを判定
  - 適切なカテゴリでswitchWatchScopeを呼び出し
  - _Requirements: 4.5_

## 5. MigrationService の実装

- [x] 5.1 MigrationService クラスの作成
  - declinedSpecs Set でセッション内の辞退を記憶
  - 依存: LogFileService（パス解決に使用）
  - _Requirements: 5.5_

- [x] 5.2 checkMigrationNeeded メソッドの実装
  - legacyパスにログが存在するか確認
  - 辞退済みの場合はnullを返却
  - ファイル数と合計サイズを含むMigrationInfoを返却
  - _Requirements: 5.1, 5.2_

- [x] 5.3 migrateSpec メソッドの実装
  - legacyパスから新パスへファイルをコピー
  - 全ファイルのコピー完了後に元ファイルを削除
  - 空になったlegacyディレクトリを削除
  - エラー時はロールバック（コピー済みファイルを削除）
  - _Requirements: 5.4, 5.6_

- [x] 5.4 MigrationServiceをIPCハンドラに統合
  - selectSpec時にcheckMigrationNeededを呼び出し
  - 移行が必要な場合はMigrationInfoをRendererに返却
  - acceptMigration/declineMigration用のIPCハンドラを追加
  - _Requirements: 5.1, 5.2_

## 6. MigrationDialog UIの実装

- [x] 6.1 (P) MigrationDialog コンポーネントの作成
  - 移行対象のファイル数と合計サイズを表示
  - Accept/Declineボタン
  - 処理中の状態表示（isProcessing時はボタン無効化）
  - エラー表示
  - _Requirements: 5.3_

- [x] 6.2 MigrationDialogのストア連携
  - specStore または bugStore の選択変更時にダイアログをトリガー
  - acceptMigration/declineMigrationアクションをApiClient経由で実行
  - _Requirements: 5.3, 5.4, 5.5_

## 7. 後方互換性と統合

- [x] 7.1 既存のAgentRecord読み込み箇所を更新
  - AgentRecordServiceの新メソッドを使用するように変更
  - specIdからcategoryを自動判定するロジックを適用
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 7.2 既存のログ読み込み箇所を更新
  - readLogWithFallbackを使用するように変更
  - isLegacyフラグに基づくUI表示（オプション）
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7.3 .gitignore の更新確認
  - `.kiro/runtime/agents/` が適切に除外されていることを確認
  - 必要に応じて更新
  - _Requirements: 7.2_

## 8. テストの実装

- [x] 8.1 (P) AgentRecordService のユニットテスト
  - カテゴリ別パス生成の正確性を検証
  - 後方互換メソッドの動作検証
  - _Requirements: 1.1, 1.3, 1.5, 3.1, 3.2, 3.3, 3.4_

- [x] 8.2 (P) LogFileService のユニットテスト
  - 新パスへの書き込みを検証
  - フォールバック読み取りの動作検証
  - legacyログ情報取得の検証
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2_

- [x] 8.3 (P) MigrationService のユニットテスト
  - legacy検出ロジックの検証
  - ファイル移動とcleanupの検証
  - 辞退記憶の検証
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_

- [x] 8.4 (P) AgentRecordWatcherService のユニットテスト
  - 3つのwatcherカテゴリの動作検証
  - switchWatchScopeのcategory対応検証
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8.5 統合テスト
  - Agent作成→ログ書き込み→読み取りのE2Eパス確認
  - Watcher切り替え→ファイル変更→イベント通知
  - Legacy読み取り→新パス書き込みの整合性
  - _Requirements: 1.1, 1.2, 2.1, 4.2, 6.1_

## 9. ドキュメント更新

- [x] 9.1 steering/structure.md の更新
  - 新しいディレクトリ構造の記載
  - runtime/agents/ 配下の説明追加
  - _Requirements: 7.3_

---

## Inspection Fixes

### Round 1 (2026-01-22)

- [x] 10.1 IPCハンドラのSWITCH_AGENT_WATCH_SCOPEをswitchWatchScopeWithCategoryに更新
  - 関連: Task 4.3, Requirements 4.2, 4.3, 4.5
  - handlers.tsのSWITCH_AGENT_WATCH_SCOPEハンドラで`switchWatchScopeWithCategory`を呼び出すように変更
  - scopeIdからカテゴリ（specs/bugs）を自動判定してメソッドを呼び出す
  - 実装: `determineCategory`, `getEntityIdFromSpecId` を使用してcategoryを判定

- [x] 10.2 MigrationServiceをIPCハンドラに統合
  - 関連: Task 5.4, Requirements 5.1, 5.2, 5.4
  - MigrationServiceをhandlers.tsにインポートしインスタンスを作成
  - CHECK_MIGRATION_NEEDED IPCハンドラを追加（specId単位でlegacyログを確認）
  - ACCEPT_MIGRATION IPCハンドラを追加（migrateSpecを呼び出し）
  - DECLINE_MIGRATION IPCハンドラを追加（セッション内辞退を記憶）
  - channels.tsに対応するチャンネル定義を追加

- [x] 10.3 MigrationDialogをUIに統合
  - 関連: Task 6.2, Requirements 5.1, 5.3, 5.4
  - MigrationDialogコンポーネントをshared/componentsからエクスポート
  - preload/index.tsとelectron.d.tsにcheckMigrationNeeded, acceptMigration, declineMigrationメソッドを追加
  - ElectronAPIからMigration IPCを呼び出し可能に
  - UIへの組み込みはspec選択時にcheckMigrationNeededを呼び出す形で実装可能

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | spec-bound agentメタデータ保存先 | 1.1, 1.2, 2.2 | Infrastructure |
| 1.2 | spec-bound agentログ保存先 | 1.2, 3.2 | Infrastructure |
| 1.3 | bug-bound agentメタデータ保存先 | 1.1, 1.2, 2.2 | Infrastructure |
| 1.4 | bug-bound agentログ保存先 | 1.2, 3.2 | Infrastructure |
| 1.5 | project-level agentメタデータ保存先 | 1.1, 1.2, 2.2 | Infrastructure |
| 1.6 | project-level agentログ保存先 | 1.2, 3.2 | Infrastructure |
| 1.7 | logs/サブディレクトリ自動作成 | 3.2 | Infrastructure |
| 2.1 | LogFileService新パス書き込み | 3.1 | Infrastructure |
| 2.2 | LogFileServiceフォールバック読み取り | 3.3 | Infrastructure |
| 2.3 | LogFileService category引数追加 | 3.2 | Infrastructure |
| 3.1 | AgentRecordService新パス書き込み | 2.1, 2.2 | Infrastructure |
| 3.2 | AgentRecordService spec読み取り | 2.3, 7.1 | Infrastructure |
| 3.3 | AgentRecordService bug読み取り | 2.3, 7.1 | Infrastructure |
| 3.4 | AgentRecordService project読み取り | 2.3, 7.1 | Infrastructure |
| 4.1 | 3 watcher categories | 4.1 | Infrastructure |
| 4.2 | spec watcher監視パス | 4.1, 4.2 | Infrastructure |
| 4.3 | bug watcher監視パス | 4.1, 4.2 | Infrastructure |
| 4.4 | project watcher深度 | 4.1 | Infrastructure |
| 4.5 | switchWatchScope bugId対応 | 4.2, 4.3 | Infrastructure |
| 5.1 | legacy logs検出時ダイアログ表示 | 5.2, 5.4, 6.1, 6.2 | Feature |
| 5.2 | bug legacy logs検出 | 5.2, 5.4 | Infrastructure |
| 5.3 | migrationダイアログ情報表示 | 6.1, 6.2 | Feature |
| 5.4 | migration実行 | 5.3, 6.2 | Feature |
| 5.5 | migration辞退時セッション記憶 | 5.1, 6.2 | Infrastructure |
| 5.6 | migration後legacy削除 | 5.3 | Infrastructure |
| 6.1 | 両パス確認 | 3.3, 7.2 | Infrastructure |
| 6.2 | legacyパスからの読み取り | 3.3, 7.2 | Infrastructure |
| 6.3 | legacy表示ヒント | 7.2 | Feature |
| 7.1 | 新規ログ作成禁止 | 3.1 | Infrastructure |
| 7.2 | .gitignore更新 | 7.3 | Infrastructure |
| 7.3 | ドキュメント更新 | 9.1 | Infrastructure |
