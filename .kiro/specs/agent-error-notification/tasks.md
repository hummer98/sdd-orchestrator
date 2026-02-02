# Implementation Plan

## Task Overview

ロガー統合とAgent起動エラー通知機能の実装タスク。全5要件（17受け入れ基準）をカバー。

---

## Tasks

- [x] 1. 型定義とエラーメッセージの実装
- [x] 1.1 (P) AgentStartError型を定義する
  - エラー種別を表す列挙型（COMMAND_NOT_FOUND, AUTH_REQUIRED, API_KEY_MISSING, SPAWN_ERROR, UNKNOWN_ERROR）
  - エラー詳細を持つインターフェース（type, message, details）
  - detailsにはexitCode, stderr, commandをオプショナルで含む
  - _Requirements: 2.6_

- [x] 1.2 (P) 日本語エラーメッセージマップを実装する
  - 各エラー種別に対応する日本語メッセージを静的定義
  - SPAWN_ERROR、UNKNOWN_ERRORは動的メッセージ（{message}置換）をサポート
  - getAgentStartErrorMessage関数でメッセージ取得
  - _Requirements: 3.4_

- [x] 2. IPCチャンネルの追加
- [x] 2.1 AGENT_START_ERRORチャンネルを追加する
  - channels.tsに新規チャンネル定義
  - ペイロード型定義（agentId, specId, AgentStartError）
  - _Requirements: 3.2_

- [x] 3. エラー分類サービスの実装
- [x] 3.1 AgentStartErrorClassifierサービスを実装する
  - classifySpawnError: Node.js Errorからエラー種別を判定（ENOENT→COMMAND_NOT_FOUND）
  - classifyExitError: 即時exit時のstderrからエラー種別を判定
  - "not logged in"パターン→AUTH_REQUIRED
  - "API key"パターン→API_KEY_MISSING
  - 未分類→UNKNOWN_ERROR
  - パターンマッチは大文字小文字を無視
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Method: classifySpawnError, classifyExitError_
  - _Verify: Grep "classifySpawnError|classifyExitError" in agentStartErrorClassifier.ts_

- [x] 4. ロガー統合
- [x] 4.1 logger.tsの全参照をprojectLoggerに置換する
  - specManagerService.ts、agentProcess.tsを優先で変更
  - その他logger.tsをimportしているファイルを一括置換
  - import元を`projectLogger`に変更
  - _Requirements: 1.2, 1.3, 1.5_
  - _Method: projectLogger_
  - _Verify: Grep "from.*logger" should return 0 results (except projectLogger itself)_

- [x] 4.2 logger.tsを物理削除する
  - main/services/logger.tsを削除
  - ビルドエラーがないことを確認
  - _Requirements: 1.1_

- [x] 5. specManagerServiceのエラー検出機能追加
- [x] 5.1 spawn errorハンドリングを実装する
  - agentProcess.tsのspawn error eventをキャッチ
  - AgentStartErrorClassifier.classifySpawnErrorでエラー分類
  - onAgentStartErrorコールバックを呼び出し
  - _Requirements: 2.1, 2.2_
  - _Method: classifySpawnError_

- [x] 5.2 即時exitハンドリングを実装する
  - 起動直後（5秒以内）のexit eventを検出（即時exitしきい値: 5000ms）
  - stderrバッファを収集し、AgentStartErrorClassifier.classifyExitErrorで分類
  - onAgentStartErrorコールバックを呼び出し
  - _Requirements: 2.2, 2.3, 2.4, 2.5_
  - _Method: classifyExitError_

- [x] 5.3 エラーログ出力を実装する
  - projectLogger.errorでagentId, specId, error type, message, command, exitCode, stderrを出力
  - グローバルログとプロジェクトログ両方に出力されることを確認
  - _Requirements: 4.1, 4.2_
  - _Method: projectLogger.error_

- [x] 6. IPCハンドラのエラー通知実装
- [x] 6.1 onAgentStartErrorコールバックをhandlers.tsに登録する
  - specManagerServiceにonAgentStartErrorコールバックを設定
  - エラー発生時にAGENT_START_ERRORチャンネルでBroadcast
  - AGENT_STATUS_CHANGE(failed)の直後に送信
  - _Requirements: 3.1, 5.1, 5.2_

- [x] 7. Renderer側のエラー通知表示
- [x] 7.1 IpcApiClientにonAgentStartErrorリスナーを追加する
  - AGENT_START_ERRORチャンネルのリスナーメソッド
  - コールバックでagentId, specId, AgentStartErrorを受け取る
  - _Requirements: 3.3_

- [x] 7.2 main.tsxでエラーリスナーを登録しToast表示する
  - アプリ初期化時にonAgentStartErrorを登録
  - getAgentStartErrorMessageで日本語メッセージ取得
  - notificationStore.notify.errorでToast表示
  - auto-dismiss 8秒（notify.errorのデフォルト動作）
  - _Requirements: 3.3, 3.5, 5.3_
  - _Method: notify.error, getAgentStartErrorMessage_

- [x] 8. 単体テスト
- [x] 8.1 (P) AgentStartErrorClassifierの単体テストを実装する
  - ENOENT→COMMAND_NOT_FOUND分類テスト
  - "not logged in"含むstderr→AUTH_REQUIRED分類テスト
  - "API key"含むstderr→API_KEY_MISSING分類テスト
  - 未知エラー→UNKNOWN_ERROR分類テスト
  - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [x] 8.2 (P) getAgentStartErrorMessageの単体テストを実装する
  - 各エラー種別に対応するメッセージ取得テスト
  - 動的メッセージ置換テスト
  - _Requirements: 3.4_

- [x] 9. 統合テスト
- [x] 9.1 spawn error時のIPC通知統合テストを実装する
  - Mock child_process.spawnでENOENTを発生
  - AGENT_STATUS_CHANGE(failed)とAGENT_START_ERRORが両方送信されることを検証
  - Renderer側でnotificationStore.notifications配列にエラーが追加されることを検証
  - _Requirements: 5.1, 5.2_
  - _Integration Point: Design.md "Agent Start Error Flow", "Integration Test Strategy"_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | logger.ts削除後もコンパイルエラーなし | 4.2 | Infrastructure |
| 1.2 | specManagerServiceのログがglobal+projectに出力 | 4.1 | Infrastructure |
| 1.3 | agentProcessのログがglobal+projectに出力 | 4.1 | Infrastructure |
| 1.4 | プロジェクト未選択時はglobalログのみ | - | 既存動作（変更不要） |
| 1.5 | 全ファイルのimport更新 | 4.1 | Infrastructure |
| 2.1 | ENOENT検出→COMMAND_NOT_FOUND分類 | 3.1, 5.1, 8.1 | Feature |
| 2.2 | 即時exit時のcode/stderr取得 | 3.1, 5.1, 5.2 | Feature |
| 2.3 | "not logged in"検出→AUTH_REQUIRED | 3.1, 5.2, 8.1 | Feature |
| 2.4 | "API key"検出→API_KEY_MISSING | 3.1, 5.2, 8.1 | Feature |
| 2.5 | 未分類エラー→UNKNOWN_ERROR | 3.1, 5.2, 8.1 | Feature |
| 2.6 | AgentStartError型定義 | 1.1 | Infrastructure |
| 3.1 | エラー情報をIPCで送信 | 6.1 | Feature |
| 3.2 | AGENT_START_ERRORチャンネル | 2.1 | Infrastructure |
| 3.3 | RendererでToast表示 | 7.1, 7.2 | Feature |
| 3.4 | 日本語ローカライズ | 1.2, 8.2 | Feature |
| 3.5 | 8秒auto-dismiss | 7.2 | Feature |
| 4.1 | ERRORレベルで詳細ログ出力 | 5.3 | Feature |
| 4.2 | global+projectログ両方に出力 | 5.3 | Feature |
| 5.1 | statusCallbacksでfailed通知 | 6.1, 9.1 | Feature |
| 5.2 | AGENT_START_ERROR追加通知 | 6.1, 9.1 | Feature |
| 5.3 | Rendererで両通知ハンドリング | 7.2 | Feature |
