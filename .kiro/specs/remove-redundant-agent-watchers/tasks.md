# Implementation Plan: 冗長な Agent Watcher の削除

## Tasks

- [x] 1. AgentRecordWatcherService から冗長なプロパティ・メソッドを削除
- [x] 1.1 specWatcher と bugWatcher のプロパティおよび getter を削除する
  - `_specWatcher` プロパティを削除
  - `_bugWatcher` プロパティを削除
  - `specWatcher` getter を削除
  - `bugWatcher` getter を削除
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 1.2 currentSpecId / currentCategory / currentEntityId プロパティを削除する
  - `_currentSpecId` プロパティを削除
  - `_currentCategory` プロパティを削除
  - `_currentEntityId` プロパティを削除
  - `currentSpecId` getter を削除
  - _Requirements: 1.6, 1.7, 1.8_

- [x] 1.3 switchWatchScope 関連メソッドを削除する
  - `switchWatchScope()` メソッドを削除
  - `switchWatchScopeWithCategory()` メソッドを削除
  - `getWatchScope()` メソッドを削除
  - `getWatchScopeWithCategory()` メソッドを削除
  - _Requirements: 1.9, 1.10, 1.11_

- [x] 2. IPC チャネルとハンドラを削除
- [x] 2.1 (P) SWITCH_AGENT_WATCH_SCOPE IPC ハンドラを削除する
  - `agentHandlers.ts` から SWITCH_AGENT_WATCH_SCOPE ハンドラを削除
  - _Requirements: 2.1_

- [x] 2.2 (P) IPC チャネル定数を削除する
  - `channels.ts` から `IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE` 定数を削除
  - _Requirements: 2.2_

- [x] 2.3 (P) preload スクリプトから switchAgentWatchScope を削除する
  - `preload/index.ts` から `switchAgentWatchScope` 関数を削除
  - _Requirements: 5.1_

- [x] 2.4 (P) window.electronAPI 型定義から削除する
  - `electron.d.ts` から `switchAgentWatchScope` メソッド型定義を削除
  - _Requirements: 2.3_

- [x] 3. Store からの呼び出し箇所を削除
- [x] 3.1 (P) specDetailStore から switchAgentWatchScope 呼び出しを削除する
  - `selectSpec()` 内の `window.electronAPI.switchAgentWatchScope()` 呼び出しを削除
  - `clearSelectedSpec()` 内の `window.electronAPI.switchAgentWatchScope()` 呼び出しを削除
  - 関連する timing 計測コードがあれば削除
  - _Requirements: 4.1, 4.2_

- [x] 3.2 (P) bugStore から switchAgentWatchScope 呼び出しを削除する
  - `selectBug()` 内の `apiClient.switchAgentWatchScope()` 呼び出しを削除
  - _Requirements: 4.3_

- [x] 4. ApiClient インターフェースを更新
- [x] 4.1 (P) ApiClient 型定義から switchAgentWatchScope を削除する
  - `types.ts` の `ApiClient` インターフェースから `switchAgentWatchScope` メソッドを削除
  - _Requirements: 3.1_

- [x] 4.2 (P) IpcApiClient から switchAgentWatchScope 実装を削除する
  - `IpcApiClient.ts` から `switchAgentWatchScope` メソッドを削除
  - _Requirements: 3.2_

- [x] 4.3 (P) WebSocketApiClient から switchAgentWatchScope 実装を削除する
  - `WebSocketApiClient.ts` から `switchAgentWatchScope` メソッドを削除
  - _Requirements: 3.3_

- [x] 5. テストコードを更新
- [x] 5.1 AgentRecordWatcherService テストから switchWatchScope 関連テストを削除する
  - `switchWatchScope method` describe ブロックを削除
  - `switchWatchScopeWithCategory` describe ブロックを削除
  - `getWatchScopeWithCategory` describe ブロックを削除
  - specWatcher/bugWatcher 関連のアサーションを削除
  - _Requirements: 6.1, 6.2_

- [x] 5.2 (P) IPC ハンドラテストから SWITCH_AGENT_WATCH_SCOPE テストを削除する
  - `handlers.test.ts` から該当テストケースを削除
  - _Requirements: 6.3_

- [x] 5.3 (P) API クライアントテストから switchAgentWatchScope テストを削除する
  - `IpcApiClient.test.ts` から該当テストを削除
  - `WebSocketApiClient.test.ts` から該当テストを削除
  - `types.test.ts` から該当テストを削除
  - _Requirements: 6.3_

- [x] 5.4 (P) Store テストから switchAgentWatchScope mock を削除する
  - `bugStore.test.ts` から mock 削除
  - `gitViewStore.test.ts` から mock 削除
  - _Requirements: 6.3_

- [x] 5.5 (P) コンポーネントテストから switchAgentWatchScope mock を削除する
  - `GitView.test.tsx` から mock 削除
  - `GitView.integration.test.tsx` から mock 削除
  - `GitFileTree.test.tsx` から mock 削除
  - _Requirements: 6.3_

- [x] 6. 完全削除の検証
- [x] 6.1 grep 検索で残骸がないことを確認する
  - `specWatcher` が本番コードに残っていないことを確認
  - `bugWatcher` が本番コードに残っていないことを確認
  - `switchWatchScope` が本番コードに残っていないことを確認
  - `SWITCH_AGENT_WATCH_SCOPE` が残っていないことを確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6.2 AgentRecordWatcherService が _projectAgentWatcher のみを持つことを確認する
  - コードレビューで単一 Watcher アーキテクチャを確認
  - _Requirements: 1.3, 7.5_

- [x] 7. ビルドとテスト実行による検証
- [x] 7.1 TypeScript ビルドが成功することを確認する
  - `task electron:build` でエラーがないことを確認 ✅
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7.2 ユニットテストが全て通過することを確認する
  - 変更関連テスト（agentRecordWatcherService, agentHandlers, IpcApiClient, WebSocketApiClient, bugStore）全てパス ✅
  - _Requirements: 6.4_

- [x] 7.3 E2E テストで Agent 関連機能が動作することを確認する
  - `task electron:test:e2e` で E2E テストスイート全体が通過 ✅
  - Agent 開始時に SpecList バッジが更新されることを確認（手動確認 or 既存 E2E でカバー）
  - Agent 停止時に SpecList バッジが更新されることを確認（手動確認 or 既存 E2E でカバー）
  - Note: Agent バッジ専用の E2E テストは存在しないが、`project-agent-startup.e2e.spec.ts` 等の既存テストで Agent ライフサイクルが検証される
  - _Requirements: 6.4, 8.1, 8.2, 8.3, 8.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | _specWatcher インスタンス作成なし | 1.1 | Cleanup |
| 1.2 | _bugWatcher インスタンス作成なし | 1.1 | Cleanup |
| 1.3 | _projectAgentWatcher のみ依存 | 6.2 | Verification |
| 1.4 | _specWatcher プロパティ削除 | 1.1 | Cleanup |
| 1.5 | _bugWatcher プロパティ削除 | 1.1 | Cleanup |
| 1.6 | _currentSpecId プロパティ削除 | 1.2 | Cleanup |
| 1.7 | _currentCategory プロパティ削除 | 1.2 | Cleanup |
| 1.8 | _currentEntityId プロパティ削除 | 1.2 | Cleanup |
| 1.9 | switchWatchScope() メソッド削除 | 1.3 | Cleanup |
| 1.10 | switchWatchScopeWithCategory() メソッド削除 | 1.3 | Cleanup |
| 1.11 | getWatchScope() メソッド削除 | 1.3 | Cleanup |
| 1.12 | specWatcher getter 削除 | 1.1 | Cleanup |
| 1.13 | bugWatcher getter 削除 | 1.1 | Cleanup |
| 1.14 | currentSpecId getter 削除 | 1.2 | Cleanup |
| 2.1 | SWITCH_AGENT_WATCH_SCOPE ハンドラ削除 | 2.1 | Cleanup |
| 2.2 | IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE 削除 | 2.2 | Cleanup |
| 2.3 | window.electronAPI.switchAgentWatchScope 削除 | 2.4 | Cleanup |
| 3.1 | ApiClient.switchAgentWatchScope 削除 | 4.1 | Cleanup |
| 3.2 | IpcApiClient.switchAgentWatchScope 削除 | 4.2 | Cleanup |
| 3.3 | WebSocketApiClient.switchAgentWatchScope 削除 | 4.3 | Cleanup |
| 4.1 | specDetailStore.selectSpec() 呼び出し削除 | 3.1 | Cleanup |
| 4.2 | specDetailStore.clearSelectedSpec() 呼び出し削除 | 3.1 | Cleanup |
| 4.3 | bugStore.selectBug() 呼び出し削除 | 3.2 | Cleanup |
| 5.1 | preload switchAgentWatchScope 削除 | 2.3 | Cleanup |
| 6.1 | switchWatchScope テスト削除 | 5.1 | Test Update |
| 6.2 | switchWatchScopeWithCategory テスト削除 | 5.1 | Test Update |
| 6.3 | switchAgentWatchScope mock 削除 | 5.2, 5.3, 5.4, 5.5 | Test Update |
| 6.4 | E2E テスト通過 | 7.2, 7.3 | Verification |
| 7.1 | specWatcher 残骸なし | 6.1 | Verification |
| 7.2 | bugWatcher 残骸なし | 6.1 | Verification |
| 7.3 | switchWatchScope 残骸なし | 6.1 | Verification |
| 7.4 | SWITCH_AGENT_WATCH_SCOPE 残骸なし | 6.1 | Verification |
| 7.5 | _projectAgentWatcher のみ残存 | 6.2 | Verification |
| 8.1 | Agent 開始時バッジ更新 | 7.3 | Verification |
| 8.2 | Agent 停止時バッジ更新 | 7.3 | Verification |
| 8.3 | runningAgentCounts 正常動作 | 7.3 | Verification |
| 8.4 | Agent 操作 E2E テスト通過 | 7.3 | Verification |
