# Implementation Plan

## 概要

WebSocket経由のコマンド実行を汎用化し、`EXECUTE_PROJECT_COMMAND`（Project-level）と`EXECUTE_SPEC_COMMAND`（Spec-level）の2チャネルに統合する。既存の個別ハンドラ（`ASK_PROJECT`, `ASK_SPEC`, `CREATE_SPEC`, `CREATE_BUG`, `EXECUTE_SPEC_PLAN`）を全て削除する。

---

## タスク一覧

### 1. WorkflowControllerインターフェース拡張

- [x] 1.1 (P) WorkflowControllerに汎用コマンドメソッドを追加
  - `executeProjectCommand(command, title)` メソッドを追加
  - `executeSpecCommand(specId, featureName, command, title)` メソッドを追加
  - 既存の個別メソッド（`executeAskProject`, `executeAskSpec`）を削除（`createSpec`, `createBug`, `executeSpecPlan` は維持）
  - `specManagerService.startAgent()` に委譲する実装を `remoteAccessHandlers.ts` に追加
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Method: startAgent_
  - _Verify: Grep "executeProjectCommand|executeSpecCommand" in remoteAccessHandlers.ts_

### 2. WebSocketHandler 汎用ハンドラ追加

- [x] 2.1 (P) EXECUTE_PROJECT_COMMAND ハンドラ実装
  - `routeMessage` に `EXECUTE_PROJECT_COMMAND` case を追加
  - `handleExecuteProjectCommand` メソッドを新規作成
  - ペイロードバリデーション（`command`, `title` 必須）
  - 失敗時に `INVALID_PAYLOAD` エラーを返却
  - 成功時に `EXECUTE_PROJECT_COMMAND_STARTED` レスポンスを返却
  - エージェント起動失敗時に `ERROR` レスポンスを返却
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Method: handleExecuteProjectCommand, validatePayload_
  - _Verify: Grep "EXECUTE_PROJECT_COMMAND" in webSocketHandler.ts_

- [x] 2.2 (P) EXECUTE_SPEC_COMMAND ハンドラ実装
  - `routeMessage` に `EXECUTE_SPEC_COMMAND` case を追加
  - `handleExecuteSpecCommand` メソッドを新規作成
  - ペイロードバリデーション（`specId`, `featureName`, `command`, `title` 必須）
  - 失敗時に `INVALID_PAYLOAD` エラーを返却
  - 成功時に `EXECUTE_SPEC_COMMAND_STARTED` レスポンスを返却
  - エージェント起動失敗時に `ERROR` レスポンスを返却
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Method: handleExecuteSpecCommand, validatePayload_
  - _Verify: Grep "EXECUTE_SPEC_COMMAND" in webSocketHandler.ts_

### 3. 個別WebSocketハンドラ削除

- [x] 3.1 個別ハンドラのcase文とメソッドを削除
  - `routeMessage` から `ASK_PROJECT`, `ASK_SPEC` のcase文を削除（`CREATE_SPEC`, `CREATE_BUG`, `EXECUTE_SPEC_PLAN` は維持）
  - `handleAskProject`, `handleAskSpec` メソッドを削除（`handleCreateSpec`, `handleCreateBug`, `handleExecuteSpecPlan` は維持）
  - タスク2.1, 2.2の完了後に実施
  - _Requirements: 4.1, 4.2_
  - _Verify: Grep -v "handleAskProject|handleAskSpec" in webSocketHandler.ts (case文除去確認)_

- [x] 3.2 削除されたハンドラ関連テストを削除
  - `webSocketHandler.test.ts` から個別ハンドラのテストケースを削除
  - _Requirements: 4.3_

### 4. WebSocketApiClient 更新

- [x] 4.1 (P) executeProjectCommand のスタブを実装に置換
  - 既存の `NOT_IMPLEMENTED` スタブを実際の `EXECUTE_PROJECT_COMMAND` WebSocketリクエストに置換
  - _Requirements: 5.1_
  - _Method: sendMessage, EXECUTE_PROJECT_COMMAND_
  - _Verify: Grep "EXECUTE_PROJECT_COMMAND" in WebSocketApiClient.ts_

- [x] 4.2 (P) executeSpecCommand メソッドを追加
  - `EXECUTE_SPEC_COMMAND` WebSocketリクエストを送信する実装
  - _Requirements: 5.2_
  - _Method: sendMessage, EXECUTE_SPEC_COMMAND_
  - _Verify: Grep "executeSpecCommand" in WebSocketApiClient.ts_

- [x] 4.3 executeAskProject と executeAskSpec を削除
  - `WebSocketApiClient` から両メソッドを削除
  - タスク4.1, 4.2, 5.1完了後に実施
  - _Requirements: 5.3_

### 5. ApiClient インターフェース更新

- [x] 5.1 types.ts の ApiClient インターフェースを更新
  - `executeAskProject?` と `executeAskSpec?` を削除
  - `executeSpecCommand` メソッドを追加
  - _Requirements: 5.4, 5.5_
  - _Verify: Grep "executeSpecCommand" in types.ts_

### 6. IpcApiClient の整合性確保

- [x] 6.1 (P) IpcApiClient に executeSpecCommand を追加
  - 既存の `EXECUTE_PROJECT_COMMAND` IPCチャネルを活用
  - specId と featureName をコマンド文字列に含める方式で実装
  - _Requirements: 7.1, 7.2_
  - _Method: EXECUTE_PROJECT_COMMAND_
  - _Verify: Grep "executeSpecCommand" in IpcApiClient.ts_

### 7. Remote UI 呼び出し側更新

- [x] 7.1 Project Ask の呼び出しを更新
  - `executeProjectCommand('/kiro:project-ask "${prompt}"', 'project-ask')` を使用
  - _Requirements: 6.1_

- [x] 7.2 Spec Ask の呼び出しを更新
  - `executeSpecCommand(specId, featureName, '/kiro:spec-ask "${prompt}"', 'spec-ask')` を使用
  - _Requirements: 6.2_

- [x] 7.3 Spec 作成の呼び出し（変更不要）
  - 既存の `executeSpecPlan(description, useWorktree)` APIを維持
  - _Requirements: 6.3_
  - _Note: 現在の実装が正しく動作しているため変更不要_

- [x] 7.4 Bug 作成の呼び出し（変更不要）
  - 既存の `createBug(name, description)` APIを維持
  - _Requirements: 6.4_
  - _Note: 現在の実装が正しく動作しているため変更不要_

- [x] 7.5 Spec Plan 実行の呼び出し（変更不要）
  - 既存の `executeSpecPlan(description, useWorktree)` APIを維持（7.3と同一）
  - _Requirements: 6.5_

### 8. ユニットテスト追加

- [x] 8.1 (P) handleExecuteProjectCommand のテスト
  - 正常系: コマンド実行成功時に `EXECUTE_PROJECT_COMMAND_STARTED` を返却
  - 異常系: `command` または `title` 未指定時に `INVALID_PAYLOAD` を返却
  - 異常系: WorkflowController 未設定時のエラーハンドリング
  - 異常系: エージェント起動失敗時に `ERROR` を返却
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 8.2 (P) handleExecuteSpecCommand のテスト
  - 正常系: コマンド実行成功時に `EXECUTE_SPEC_COMMAND_STARTED` を返却
  - 異常系: 必須フィールド不足時に `INVALID_PAYLOAD` を返却
  - 異常系: エージェント起動失敗時に `ERROR` を返却
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 8.3 (P) WorkflowController.executeProjectCommand のテスト
  - `specManagerService.startAgent()` が正しいパラメータで呼ばれることを検証
  - _Requirements: 3.4_

- [x] 8.4 (P) WorkflowController.executeSpecCommand のテスト
  - `specId` と `featureName` が正しく伝播されることを検証
  - _Requirements: 3.4_

- [x] 8.5 (P) WebSocketApiClient.executeProjectCommand のテスト
  - リクエスト送信とレスポンス処理を検証
  - _Requirements: 5.1_

- [x] 8.6 (P) WebSocketApiClient.executeSpecCommand のテスト
  - リクエスト送信とレスポンス処理を検証
  - _Requirements: 5.2_

### 9. 統合テスト

- [x] 9.1 Remote UI から Project-level コマンド実行の E2E テスト
  - `EXECUTE_PROJECT_COMMAND` 送信 → エージェント起動 → レスポンス受信の全フロー検証
  - _Requirements: 1.1, 1.4_

- [x] 9.2 Remote UI から Spec-level コマンド実行の E2E テスト
  - `EXECUTE_SPEC_COMMAND` 送信 → 指定 Spec コンテキストでエージェント起動 → レスポンス受信の全フロー検証
  - _Requirements: 2.1, 2.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | EXECUTE_PROJECT_COMMAND送信時にstartAgent呼び出し | 2.1, 9.1 | Feature |
| 1.2 | command/titleをargs/phaseに渡す | 2.1 | Feature |
| 1.3 | command/title未指定時にINVALID_PAYLOAD | 2.1, 8.1 | Feature |
| 1.4 | 成功時にEXECUTE_PROJECT_COMMAND_STARTEDを返却 | 2.1, 8.1, 9.1 | Feature |
| 1.5 | 失敗時にERRORを返却 | 2.1, 8.1 | Feature |
| 2.1 | EXECUTE_SPEC_COMMAND送信時にstartAgent呼び出し | 2.2, 9.2 | Feature |
| 2.2 | specId/featureName/command/titleを渡す | 2.2 | Feature |
| 2.3 | 必須フィールド未指定時にINVALID_PAYLOAD | 2.2, 8.2 | Feature |
| 2.4 | 成功時にEXECUTE_SPEC_COMMAND_STARTEDを返却 | 2.2, 8.2, 9.2 | Feature |
| 2.5 | 失敗時にERRORを返却 | 2.2, 8.2 | Feature |
| 3.1 | WorkflowController.executeProjectCommand定義 | 1.1 | Infrastructure |
| 3.2 | WorkflowController.executeSpecCommand定義 | 1.1 | Infrastructure |
| 3.3 | 個別メソッド削除 | 1.1 | Cleanup |
| 3.4 | createWorkflowController実装更新 | 1.1, 8.3, 8.4 | Feature |
| 4.1 | 個別メッセージタイプcase文削除 | 3.1 | Cleanup |
| 4.2 | 個別ハンドラメソッド削除 | 3.1 | Cleanup |
| 4.3 | 関連テスト削除 | 3.2 | Cleanup |
| 5.1 | WebSocketApiClient.executeProjectCommand実装 | 4.1, 8.5 | Feature |
| 5.2 | WebSocketApiClient.executeSpecCommand追加 | 4.2, 8.6 | Feature |
| 5.3 | executeAskProject/executeAskSpec削除 | 4.3 | Cleanup |
| 5.4 | ApiClient interface更新（削除） | 5.1 | Cleanup |
| 5.5 | ApiClient.executeSpecCommand追加 | 5.1 | Feature |
| 6.1 | Project Ask呼び出し更新 | 7.1 | Feature |
| 6.2 | Spec Ask呼び出し更新 | 7.2 | Feature |
| 6.3 | Spec作成呼び出し（既存API維持） | 7.3 | No Change |
| 6.4 | Bug作成呼び出し（既存API維持） | 7.4 | No Change |
| 6.5 | Spec Plan呼び出し（既存API維持） | 7.5 | No Change |
| 7.1 | IpcApiClient.executeSpecCommand実装 | 6.1 | Feature |
| 7.2 | IPC経由でエージェント起動 | 6.1 | Feature |
