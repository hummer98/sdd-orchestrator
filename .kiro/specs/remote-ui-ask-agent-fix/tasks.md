# Implementation Plan

## Tasks

### WebSocketApiClient 修正・拡張

- [x] 1. WebSocketApiClient の Ask Agent API 修正・追加
- [x] 1.1 (P) executeAskProject メソッドのメッセージタイプを修正する
  - メッセージタイプを `EXECUTE_ASK_PROJECT` から `ASK_PROJECT` に変更
  - payload に `projectPath` と `prompt` を含める構造を維持
  - `projectPath` は `getProjectPath()` から取得することを確認
  - `ASK_PROJECT_STARTED` レスポンスで `AgentInfo` を含む成功結果を返す
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Method: wrapRequest, ASK_PROJECT_
  - _Verify: Grep "ASK_PROJECT" in WebSocketApiClient.ts_

- [x] 1.2 (P) executeAskSpec メソッドを新規追加する
  - `executeAskSpec(specId: string, featureName: string, prompt: string)` メソッドを追加
  - メッセージタイプ `ASK_SPEC` を送信
  - payload に `specId`、`featureName`、`prompt` を含める
  - `ASK_SPEC_STARTED` レスポンスで `AgentInfo` を含む成功結果を返す
  - 既存の `executeAskProject` パターンに準拠した実装
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: wrapRequest, ASK_SPEC_
  - _Verify: Grep "ASK_SPEC" in WebSocketApiClient.ts_

### ApiClient インターフェース更新

- [x] 2. ApiClient インターフェースに executeAskSpec を追加する
  - `executeAskSpec(specId: string, featureName: string, prompt: string): Promise<Result<AgentInfo, ApiError>>` シグネチャを追加
  - 戻り値の型は `Result<AgentInfo, ApiError>`
  - オプショナルメソッドとして定義（`executeAskSpec?`）
  - _Requirements: 4.1, 4.2_
  - _Verify: Grep "executeAskSpec" in types.ts_

### SpecDetailPage UI 追加

- [x] 3. SpecDetailPage に Spec Ask 機能を追加する
- [x] 3.1 Spec Ask ボタンを Agent 一覧ヘッダに追加する
  - Agent 一覧ヘッダセクションに Spec Ask ボタンを配置
  - `MessageSquare` アイコンを使用
  - 紫色スタイル（`text-purple-600`）を適用
  - Desktop 版の AgentsTabView の実装パターンに準拠
  - _Requirements: 3.1, 3.2_

- [x] 3.2 AskAgentDialog の統合と実行処理を実装する
  - `AskAgentDialog` を `agentType="spec"` で表示
  - ダイアログに現在の Spec 名を `specName` prop として渡す
  - ダイアログのコールバックで `WebSocketApiClient.executeAskSpec` を呼び出す
  - ダイアログ表示状態の管理（useState）
  - 依存: タスク 3.1 完了後
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 3.3 Agent 起動成功時の処理を実装する
  - 成功時に新しい Agent を Agent Store に追加
  - 追加した Agent を自動選択
  - ダイアログを閉じる
  - 依存: タスク 3.2 完了後
  - _Requirements: 3.6, 3.7_

- [x] 3.4 エラーハンドリングを実装する
  - エラー発生時に適切なエラー通知を表示
  - 既存の通知パターン（toast または alert）に準拠
  - 依存: タスク 3.2 完了後
  - _Requirements: 3.8_

### テスト

- [x] 4. Unit テストの追加・修正
- [x] 4.1 (P) executeAskProject の修正に対するテストを更新する
  - メッセージタイプが `ASK_PROJECT` であることを検証
  - payload に `projectPath` と `prompt` が含まれることを検証
  - 成功・失敗ケースのテスト
  - _Requirements: 5.1_
  - _Verify: Grep "ASK_PROJECT" in WebSocketApiClient.test.ts_

- [x] 4.2 (P) executeAskSpec の新規テストを追加する
  - メッセージタイプが `ASK_SPEC` であることを検証
  - payload に `specId`、`featureName`、`prompt` が含まれることを検証
  - 成功・失敗ケースのテスト
  - _Requirements: 5.2_
  - _Verify: Grep "executeAskSpec" in WebSocketApiClient.test.ts_

- [x] 4.3 (P) SpecDetailPage の Spec Ask 機能テストを追加する
  - Spec Ask ボタンが表示されることを検証
  - ボタンクリックで AskAgentDialog が開くことを検証
  - ダイアログの props が正しく渡されることを検証
  - _Requirements: 5.3_
  - _Verify: Grep "Spec Ask" in SpecDetailPage.test.tsx_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | executeAskProject は ASK_PROJECT を送信 | 1.1 | Feature |
| 1.2 | payload に projectPath と prompt を含む | 1.1 | Feature |
| 1.3 | projectPath は getProjectPath() から取得 | 1.1 | Feature |
| 1.4 | ASK_PROJECT_STARTED で AgentInfo を返す | 1.1 | Feature |
| 2.1 | executeAskSpec メソッドを追加 | 1.2 | Feature |
| 2.2 | ASK_SPEC を送信 | 1.2 | Feature |
| 2.3 | payload に specId, featureName, prompt を含む | 1.2 | Feature |
| 2.4 | ASK_SPEC_STARTED で AgentInfo を返す | 1.2 | Feature |
| 3.1 | SpecDetailPage に Spec Ask ボタン表示 | 3.1 | Feature |
| 3.2 | MessageSquare アイコン、紫色スタイル | 3.1 | Feature |
| 3.3 | AskAgentDialog を agentType="spec" で表示 | 3.2 | Feature |
| 3.4 | specName prop を渡す | 3.2 | Feature |
| 3.5 | executeAskSpec を呼び出し | 3.2 | Feature |
| 3.6 | Agent Store に追加、自動選択 | 3.3 | Feature |
| 3.7 | 成功時ダイアログを閉じる | 3.3 | Feature |
| 3.8 | エラー時適切な通知 | 3.4 | Feature |
| 4.1 | ApiClient に executeAskSpec シグネチャ追加 | 2 | Infrastructure |
| 4.2 | Result<AgentInfo, ApiError> を返す | 2 | Infrastructure |
| 5.1 | executeAskProject の Unit テスト | 4.1 | Testing |
| 5.2 | executeAskSpec の Unit テスト | 4.2 | Testing |
| 5.3 | SpecDetailPage Spec Ask ボタンのテスト | 4.3 | Testing |
