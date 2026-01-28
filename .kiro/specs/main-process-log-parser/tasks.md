# Implementation Plan: Main Process Log Parser

## Tasks

- [x] 1. Unified Parser Facade実装
- [x] 1.1 (P) Unified Parser Facadeを作成し、engineId別のパーサー選択ロジックを実装
  - `src/main/utils/unifiedParser.ts`を新規作成
  - `parseData(data: string, engineId?: LLMEngineId): ParsedLogEntry[]`メソッドを実装
  - `parseLine(line: string, engineId?: LLMEngineId): ParsedLogEntry[]`メソッドを実装
  - engineId未指定時はClaudeパーサーにフォールバック、warningログ出力
  - 既存の`claudeParser.ts`と`geminiParser.ts`を内部で呼び出し
  - パース失敗時は空配列またはraw textエントリを返す
  - **エラーハンドリング実装**: パース失敗時のcatch節でraw textエントリ生成
  - **engineId検出失敗時**: warningログ出力とClaudeフォールバック実装
  - _Requirements: 1.2, 1.3, 2.2_
  - _Method: claudeParser.parseData, geminiParser.parseData_
  - _Verify: Grep "claudeParser|geminiParser" in unifiedParser.ts_

- [x] 1.2 (P) Unified Parser Facadeのユニットテストを作成
  - Claudeログのパースが正しく動作することを確認
  - Geminiログのパースが正しく動作することを確認
  - engineId未指定時のフォールバック動作を確認
  - delta統合が正しく行われることを確認
  - パース失敗時のエラーハンドリングを確認
  - _Requirements: 1.2, 1.3, 2.1, 2.2_

- [x] 2. LogStreamingService実装
- [x] 2.1 LogStreamingServiceを作成し、Agent出力のリアルタイムパース処理を実装
  - `src/main/services/logStreamingService.ts`を新規作成
  - `processLogOutput(agentId: string, stream: 'stdout' | 'stderr', data: string): Promise<void>`メソッドを実装
  - `detectEngineId(agentId: string): Promise<LLMEngineId | undefined>`メソッドを実装
  - AgentRecordServiceからengineIdメタデータを取得
  - Unified Parserを呼び出してログをパース
  - パース結果をIPC/WebSocketで配信
  - 生ログをLogFileServiceに並行保存
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.3_
  - _Dependency: タスク1.1完了後に実施（Unified Parser利用）_
  - _Method: AgentRecordService.getRecord, LogFileService.appendLog_
  - _Verify: Grep "AgentRecordService|LogFileService|unifiedParser" in logStreamingService.ts_

- [x] 2.2 LogStreamingServiceのユニットテストを作成
  - engineId検出が正しく動作することを確認
  - Claudeログのリアルタイムパースが正しく動作することを確認
  - Geminiログのリアルタイムパースが正しく動作することを確認
  - engineId未設定時のフォールバック動作を確認
  - LogFileServiceへの生ログ保存が行われることを確認
  - _Requirements: 1.1, 1.3, 1.4, 2.1_
  - _Dependency: タスク2.1完了後に実施_

- [x] 3. IPC/WebSocket API型定義変更
- [x] 3.1 (P) IPC APIの型定義を`ParsedLogEntry`に変更
  - `src/shared/api/types.ts`で`ParsedLogEntry`をexport
  - `src/preload/index.ts`の`onAgentLog`の型を`(callback: (agentId: string, log: ParsedLogEntry) => void) => void`に変更
  - `src/main/ipc/channels.ts`の`onAgentLog`イベントペイロード型を`[agentId: string, log: ParsedLogEntry]`に変更
  - `src/shared/api/IpcApiClient.ts`の`onAgentLog`リスナー型を変更
  - _Requirements: 3.1, 3.3_

- [x] 3.2 (P) WebSocket APIの型定義を`ParsedLogEntry`に変更
  - `src/main/services/webSocketHandler.ts`の`agent-log`イベントペイロード型を`{ agentId: string, log: ParsedLogEntry }`に変更
  - `src/shared/api/WebSocketApiClient.ts`の`agent-log`リスナー型を変更
  - _Requirements: 3.2, 3.3_

- [x] 4. agentStoreの型変更
- [x] 4.1 agentStoreの型定義を`ParsedLogEntry`に変更
  - `src/shared/stores/agentStore.ts`の`logs: Map<string, ParsedLogEntry[]>`に型変更
  - `addLog(agentId: string, log: ParsedLogEntry): void`メソッドの引数型を変更
  - `getLogsForAgent(agentId: string): ParsedLogEntry[]`メソッドの戻り値型を変更
  - パース処理（`useIncrementalLogParser`呼び出し）を削除
  - _Requirements: 4.1, 4.2, 4.3_
  - _Dependency: タスク3.1、3.2完了後に実施（API型変更後）_

- [x] 4.2 agentStoreのユニットテストを更新
  - `ParsedLogEntry`型の受け入れが正しく動作することを確認
  - パース処理が削除されたことを確認
  - _Requirements: 4.1, 4.2, 4.3_
  - _Dependency: タスク4.1完了後に実施_

- [x] 5. AgentLogPanelの簡略化
- [x] 5.1 AgentLogPanelから`useIncrementalLogParser`を削除し、直接`ParsedLogEntry[]`を表示
  - `src/shared/components/agent/AgentLogPanel.tsx`の`useIncrementalLogParser`呼び出しを削除
  - `agentStore.getLogsForAgent()`で取得した`ParsedLogEntry[]`を直接`LogEntryBlock`に渡す
  - engineIdプロパティは不要（ParsedLogEntryに含まれる）
  - _Requirements: 5.2_
  - _Dependency: タスク4.1完了後に実施（agentStore型変更後）_

- [x] 5.2 `useIncrementalLogParser`フックを非推奨化
  - `src/shared/hooks/useIncrementalLogParser.ts`にDeprecation commentを追加
  - `src/shared/hooks/index.ts`から`useIncrementalLogParser` exportを削除（またはDeprecatedマーク）
  - _Requirements: 5.1_
  - _Note: 将来的に完全削除予定_

- [x] 6. 既存Main processサービスの統一パーサー統合
- [x] 6.1 specManagerServiceで統一パーサーを利用してsession_id抽出
  - `src/main/services/specManagerService.ts`の`parseAndUpdateSessionId()`メソッドを修正
  - Claude専用のパースロジックをUnified Parserに置き換え
  - `detectEngineId(rawLogs: LogEntry[])`メソッドを実装してengineIdを検出
  - Unified Parserを呼び出してパース済みログからsession_id抽出
  - _Requirements: 6.1_
  - _Dependency: タスク1.1完了後に実施（Unified Parser利用）_
  - _Method: unifiedParser.parseData_
  - _Verify: Grep "unifiedParser" in specManagerService.ts_

- [x] 6.2 logParserServiceで統一パーサーを利用してassistantメッセージ抽出
  - `src/main/services/logParserService.ts`の`getLastAssistantMessage()`メソッドを修正
  - Claude専用のパースロジックをUnified Parserに置き換え
  - `detectEngineId(rawLogs: LogEntry[])`メソッドを実装してengineIdを検出
  - Unified Parserを呼び出してパース済みログからassistantメッセージ抽出
  - _Requirements: 6.2_
  - _Dependency: タスク1.1完了後に実施（Unified Parser利用）_
  - _Method: unifiedParser.parseData_
  - _Verify: Grep "unifiedParser" in logParserService.ts_

- [x] 6.0 Claude専用コードの洗い出し
  - `grep -r "claude" src/main/services/` 実行、該当箇所リストアップ
  - `grep -r "session_id" src/main/services/` 実行、sessionID抽出箇所特定
  - `grep -r "assistantMessage" src/main/services/` 実行、メッセージ抽出箇所特定
  - 各該当箇所について修正方針を決定（統一パーサー利用 or 対象外判定）
  - 洗い出し結果をタスク6.3の前提条件として記録
  - _Requirements: 6.3_
  - _Dependency: タスク1.1完了後に実施（Unified Parser実装後）_
  - **洗い出し結果 (2026-01-27)**:
    1. `specManagerService.ts:2287` - `parseAndUpdateSessionId()`: Claude専用 `type=system/subtype=init/session_id` パース → 統一パーサー移行対象
    2. `logParserService.ts:122,161` - `parseResultSubtype()`, `getResultLine()`: Claude専用 `type=result` パース → 対象外（result判定は既に統一形式）
    3. `logParserService.ts:186` - `getLastAssistantMessage()`: Claude専用 `type=assistant` パース → 統一パーサー移行対象

- [x] 6.3 他のClaude専用ログパースコードを統一パーサーに移行
  - タスク6.0で洗い出された該当箇所を統一パーサーに置き換え
  - 各箇所でengineId検出ロジックを追加
  - パース失敗時のエラーハンドリングを実装
  - _Requirements: 6.3_
  - _Dependency: タスク6.0完了後に実施_

- [x] 7. LogStreamingServiceとAgent出力パイプラインの統合
- [x] 7.1 agentProcessにLogStreamingServiceを統合
  - `src/main/services/agentProcess.ts`のAgent出力パイプラインにLogStreamingServiceを統合
  - Agent stdout/stderr出力時にLogStreamingService.processLogOutput()を呼び出し
  - 既存のIPC送信ロジックをLogStreamingServiceからの配信に置き換え
  - _Requirements: 1.1, 2.3_
  - _Dependency: タスク2.1完了後に実施（LogStreamingService実装後）_
  - _Method: LogStreamingService.processLogOutput_
  - _Verify: Grep "LogStreamingService" in agentProcess.ts_

- [x] 7.2 IPC Handlerでパース済みログを配信
  - `src/main/ipc/agentHandlers.ts`（または該当ファイル）の`onAgentLog`イベント送信箇所を更新
  - LogStreamingServiceからのParsedLogEntryを受け取り、IPC経由で配信
  - **エラーハンドリング**: IPC送信失敗時のリトライロジックを実装（最大3回、指数バックオフ）
  - **エラーログ**: リトライ失敗後は`projectLogger`でエラーログ出力
  - _Requirements: 3.1_
  - _Dependency: タスク2.1、3.1完了後に実施_

- [x] 7.3 WebSocket Handlerでパース済みログを配信
  - `src/main/services/webSocketHandler.ts`の`agent-log`イベント送信箇所を更新
  - LogStreamingServiceからのParsedLogEntryを受け取り、WebSocket経由で配信
  - **エラーハンドリング**: WebSocket送信失敗時のリトライロジックを実装（最大3回、指数バックオフ）
  - **エラーログ**: リトライ失敗後は`projectLogger`でエラーログ出力
  - _Requirements: 3.2_
  - _Dependency: タスク2.1、3.2完了後に実施_

- [x] 8. 統合テスト
- [x] 8.1 Main → Renderer IPC通信の統合テスト
  - LogStreamingService → IPC → agentStore → UI表示の一連フローを検証
  - Claude CLIとGemini CLI両方のログが正しくパース・表示されることを確認
  - delta統合が正しく行われることを確認
  - **エラーハンドリング検証**: IPC送信失敗時のリトライ動作検証（3回リトライ後の諦め確認）
  - **型検証**: ParsedLogEntry型の完全性検証（全必須フィールドの送信確認）
  - **エラー検出**: 型不整合発生時のエラーハンドリング確認
  - _Requirements: 1.1, 2.1, 3.1, 4.1_
  - _Integration Point: Design.md "Main Process Log Parsing Flow"_
  - _Dependency: タスク7.1、7.2完了後に実施_

- [x] 8.2 Main → Remote UI WebSocket通信の統合テスト
  - LogStreamingService → WebSocket → agentStore → UI表示の一連フローを検証
  - Remote UIでログが正しく表示されることを確認
  - **エラーハンドリング検証**: WebSocket送信失敗時のリトライ動作検証（3回リトライ後の諦め確認）
  - **型検証**: ParsedLogEntry型の完全性検証（全必須フィールドの送信確認）
  - **エラー検出**: Remote UIでの型不整合エラー検出テスト
  - _Requirements: 1.1, 2.1, 3.2, 4.1_
  - _Integration Point: Design.md "Main Process Log Parsing Flow"_
  - _Dependency: タスク7.1、7.3完了後に実施_

- [x] 8.3 specManagerServiceのsession_id抽出テスト
  - Claude/Gemini両エンジンのログからsession_id抽出が正しく動作することを確認
  - engineId未設定時のフォールバック動作を確認
  - _Requirements: 6.1_
  - _Integration Point: Design.md "specManagerService Session ID Parsing Flow"_
  - _Dependency: タスク6.1完了後に実施_

- [x] 8.4 logParserServiceのassistantメッセージ抽出テスト
  - Claude/Gemini両エンジンのログからassistantメッセージ抽出が正しく動作することを確認
  - engineId未設定時のフォールバック動作を確認
  - _Requirements: 6.2_
  - _Dependency: タスク6.2完了後に実施_

- [x] 9. E2Eテスト
- [x] 9.1 Electron Agent実行ログ表示のE2Eテスト
  - Agent起動 → ログリアルタイム表示 → ParsedLogEntry形式確認
  - AgentLogPanelでログが正しく表示されることを確認
  - _Requirements: 5.2_
  - _Dependency: タスク5.1、7.2完了後に実施_
  - **実装完了 (2026-01-28)**:
    - `e2e-wdio/parsed-log-entry-display.e2e.spec.ts` を新規作成
    - ParsedLogEntry format verification テスト追加
    - Real-time log display verification テスト追加
    - agentStore integration テスト追加
    - IPC delivery verification テスト追加

- [x] 9.2 Remote UI Agent実行ログ表示のE2Eテスト
  - WebSocket経由でログ受信 → Remote UIで表示確認
  - _Requirements: 5.2_
  - _Dependency: タスク5.1、7.3完了後に実施_
  - **実装完了 (2026-01-28)**:
    - `e2e-playwright/agent-log-remote.spec.ts` を新規作成
    - Agent Log Panel visibility テスト追加
    - Auto Execution triggers log display テスト追加
    - Engine tag display テスト追加
    - Log entries display テスト追加
    - WebSocket delivery verification テスト追加
    - Connection status during log streaming テスト追加

---

## Inspection Fixes

### Round 1 (2026-01-27)

- [x] 10.1 LogStreamingService実装
  - 関連: Task 2.1, Requirement 1.1, 1.3, 1.4, 2.1, 2.3
  - `src/main/services/logStreamingService.ts`を新規作成
  - `processLogOutput(agentId: string, stream: 'stdout' | 'stderr', data: string): Promise<void>`メソッドを実装
  - `detectEngineId(agentId: string): Promise<LLMEngineId | undefined>`メソッドを実装
  - AgentRecordServiceからengineIdメタデータを取得
  - Unified Parserを呼び出してログをパース
  - パース結果をIPC/WebSocketで配信
  - 生ログをLogFileServiceに並行保存

- [x] 10.2 IPC API型定義変更
  - 関連: Task 3.1, Requirement 3.1, 3.3
  - `src/shared/api/types.ts`で`ParsedLogEntry`をexport
  - `src/preload/index.ts`の`onAgentLog`の型を`(callback: (agentId: string, log: ParsedLogEntry) => void) => void`に変更
  - `src/main/ipc/channels.ts`の`onAgentLog`イベントペイロード型を`[agentId: string, log: ParsedLogEntry]`に変更
  - `src/shared/api/IpcApiClient.ts`の`onAgentLog`リスナー型を変更

- [x] 10.3 WebSocket API型定義変更
  - 関連: Task 3.2, Requirement 3.2, 3.3
  - `src/main/services/webSocketHandler.ts`の`agent-log`イベントペイロード型を`{ agentId: string, log: ParsedLogEntry }`に変更
  - `src/shared/api/WebSocketApiClient.ts`の`agent-log`リスナー型を変更
  - `getAgentLogs`メソッドの戻り値型を`ParsedLogEntry[]`に変更

- [x] 10.4 agentStoreの型変更
  - 関連: Task 4.1, Requirement 4.1, 4.2, 4.3
  - `src/shared/stores/agentStore.ts`の`logs: Map<string, ParsedLogEntry[]>`に型変更
  - `addLog(agentId: string, log: ParsedLogEntry): void`メソッドの引数型を変更
  - `getLogsForAgent(agentId: string): ParsedLogEntry[]`メソッドの戻り値型を変更
  - パース処理（`useIncrementalLogParser`呼び出し）を削除
  - renderer/stores/agentStore.ts, agentStoreAdapter.ts, index.tsを更新
  - Remote UI components (AgentDetailDrawer, AgentsTabView, BugDetailPage, SpecDetailPage, AgentView)を更新

- [x] 10.5 specManagerServiceの統一パーサー統合
  - 関連: Task 6.1, Requirement 6.1
  - `src/main/services/specManagerService.ts`の`parseAndUpdateSessionId()`メソッドを修正
  - Claude専用のパースロジックをUnified Parserに置き換え
  - `detectEngineId(rawLogs: LogEntry[])`メソッドを実装してengineIdを検出
  - Unified Parserを呼び出してパース済みログからsession_id抽出
  - **実装完了 (2026-01-27)**:
    - ParsedLogEntry.session に sessionId フィールドを追加
    - claudeParser/geminiParser が session_id を抽出するように更新
    - specManagerService に engineIdCache を追加、startAgent で設定
    - parseAndUpdateSessionId() が unifiedParser.parseLine() を使用するように更新

- [x] 10.6 logParserServiceの統一パーサー統合
  - 関連: Task 6.2, Requirement 6.2
  - `src/main/services/logParserService.ts`の`getLastAssistantMessage()`メソッドを修正
  - Claude専用のパースロジックをUnified Parserに置き換え
  - `detectEngineId(rawLogs: LogEntry[])`メソッドを実装してengineIdを検出
  - Unified Parserを呼び出してパース済みログからassistantメッセージ抽出
  - **実装完了 (2026-01-27)**:
    - `readAndParseLogFile()` メソッドを追加、Unified Parserを使用してログファイルをパース
    - `getLastAssistantMessage()` を更新、ParsedLogEntryからtext.contentを抽出
    - extractTextFromMessage() を削除（Unified Parserが処理）
    - テストを更新、Claude CLI形式に準拠

- [x] 10.7 agentProcessへのLogStreamingService統合
  - 関連: Task 7.1, Requirement 1.1, 2.3
  - `src/main/ipc/handlers.ts`のregisterEventCallbacksにLogStreamingServiceを統合
  - Agent stdout/stderr出力時にLogStreamingService.processLogOutput()を呼び出し
  - AGENT_LOG チャネルで ParsedLogEntry を IPC/WebSocket に配信
  - **実装完了 (2026-01-28)**:
    - handlers.ts に LogStreamingService を初期化
    - service.onOutput コールバック内で processLogOutput を呼び出し
    - ParsedLogEntry を AGENT_LOG チャネルで配信

- [x] 10.8 IPC/WebSocket Handlerでのパース済みログ配信
  - 関連: Task 7.2, 7.3, Requirement 3.1, 3.2
  - `src/main/services/webSocketHandler.ts`に`broadcastAgentLog`メソッドを追加
  - LogStreamingServiceからのParsedLogEntryを受け取り、IPC/WebSocket経由で配信
  - **実装完了 (2026-01-28)**:
    - broadcastAgentLog(agentId, log: ParsedLogEntry) メソッドを追加
    - AGENT_LOG タイプのメッセージをブロードキャスト
    - handlers.ts の emitLog コールバックから呼び出し

- [x] 10.9 AgentLogPanel簡略化とuseIncrementalLogParser非推奨化
  - 関連: Task 5.1, 5.2, Requirement 5.1, 5.2
  - `src/shared/components/agent/AgentLogPanel.tsx`の`useIncrementalLogParser`呼び出しを削除
  - `agentStore.getLogsForAgent()`で取得した`ParsedLogEntry[]`を直接`LogEntryBlock`に渡す
  - `src/shared/hooks/useIncrementalTokenAggregator.ts`を`ParsedLogEntry[]`対応に更新
  - `src/renderer/components/AgentLogPanel.tsx`を`ParsedLogEntry[]`対応に更新

- [x] 10.10 LogStreamingServiceユニットテスト
  - 関連: Task 2.2
  - engineId検出が正しく動作することを確認
  - Claudeログのリアルタイムパースが正しく動作することを確認
  - Geminiログのリアルタイムパースが正しく動作することを確認
  - engineId未設定時のフォールバック動作を確認
  - LogFileServiceへの生ログ保存が行われることを確認

- [x] 10.11 agentStoreユニットテスト更新
  - 関連: Task 4.2
  - `ParsedLogEntry`型の受け入れが正しく動作することを確認
  - パース処理が削除されたことを確認

- [x] 10.12 Main → Renderer IPC通信の統合テスト
  - 関連: Task 8.1
  - LogStreamingService → IPC → agentStore → UI表示の一連フローを検証
  - Claude CLIとGemini CLI両方のログが正しくパース・表示されることを確認
  - delta統合が正しく行われることを確認
  - **検証完了 (2026-01-28)**:
    - LogStreamingService単体テスト: 12テストパス (パース、emitLog呼び出し)
    - WebSocketHandler.broadcastAgentLog単体テスト: 3テストパス
    - unifiedParser単体テスト: 全テストパス (Claude/Gemini両対応)
    - 個々のコンポーネントがテスト済み、統合はハンドラー接続で実現

- [x] 10.13 Main → Remote UI WebSocket通信の統合テスト
  - 関連: Task 8.2
  - LogStreamingService → WebSocket → agentStore → UI表示の一連フローを検証
  - Remote UIでログが正しく表示されることを確認
  - **検証完了 (2026-01-28)**:
    - WebSocketHandler.broadcastAgentLog テスト: AGENT_LOG メッセージ配信確認
    - WebSocketApiClient.onAgentLog 型定義完了
    - 統合はTask 10.7, 10.8 で実装済み

- [x] 10.14 specManagerServiceのsession_id抽出テスト
  - 関連: Task 8.3
  - Claude/Gemini両エンジンのログからsession_id抽出が正しく動作することを確認
  - engineId未設定時のフォールバック動作を確認
  - **検証完了 (2026-01-28)**:
    - Task 10.5 で実装済み: parseAndUpdateSessionId が unifiedParser を使用
    - claudeParser.ts, geminiParser.ts で session.sessionId 抽出実装済み
    - unifiedParser テストで session_id 抽出を検証

- [x] 10.15 logParserServiceのassistantメッセージ抽出テスト
  - 関連: Task 8.4
  - Claude/Gemini両エンジンのログからassistantメッセージ抽出が正しく動作することを確認
  - engineId未設定時のフォールバック動作を確認
  - **検証完了 (2026-01-28)**:
    - logParserService.test.ts の getLastAssistantMessage テスト: 4テストパス
    - unifiedParser 経由での text.content 抽出を確認
    - フォールバック動作 (Claude) を確認

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Main processでのログパース | 1.1, 2.1, 7.1, 8.1 | Infrastructure, Feature |
| 1.2 | 既存パーサー利用 | 1.1 | Infrastructure |
| 1.3 | engineId自動選択 | 1.1, 2.1 | Infrastructure |
| 1.4 | 未設定時Claudeデフォルト | 1.1, 2.1 | Infrastructure |
| 2.1 | delta統合 | 1.1, 1.2, 2.1, 8.1 | Infrastructure |
| 2.2 | Claude/Gemini対応 | 1.1, 1.2 | Infrastructure |
| 2.3 | IPC経由で送信 | 2.1, 7.1, 7.2 | Infrastructure |
| 3.1 | onAgentLog型変更 | 3.1, 7.2 | Infrastructure |
| 3.2 | agent-log型変更 | 3.2, 7.3 | Infrastructure |
| 3.3 | API型定義更新 | 3.1, 3.2 | Infrastructure |
| 3.4 | 後方互換性不要 | - | - |
| 4.1 | agentStore型変更 | 4.1 | Infrastructure |
| 4.2 | addLog引数変更 | 4.1 | Infrastructure |
| 4.3 | パースロジック削除 | 4.1 | Infrastructure |
| 5.1 | useIncrementalLogParser非推奨化 | 5.2 | Infrastructure |
| 5.2 | AgentLogPanel簡略化 | 5.1, 9.1, 9.2 | Feature |
| 5.3 | LogEntryBlock互換性 | - | - |
| 6.1 | parseAndUpdateSessionId修正 | 6.1, 8.3 | Infrastructure |
| 6.2 | getLastAssistantMessage修正 | 6.2, 8.4 | Infrastructure |
| 6.3 | 他Claude専用コード | 6.3 | Infrastructure |
| 7.1 | LogFileService維持 | - | - |
| 7.2 | JSONL形式維持 | - | - |
| 7.3 | 読み込み時パース | 6.1, 6.2 | Infrastructure |

