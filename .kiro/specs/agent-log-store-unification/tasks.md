# Implementation Plan: Agent Log Store Unification

## Tasks

- [x] 1. SharedAgentStoreに初回ログ読み込みメソッドを実装
- [x] 1.1 (P) ensureLogsLoadedメソッドをshared/stores/agentStore.tsに追加
  - ApiClientを引数として受け取り、getAgentLogsを呼び出す
  - Running状態のAgentで既存ログがある場合はスキップ
  - ID基準での重複排除ロジックを実装（ファイルログとリアルタイムログのマージ）
  - _Requirements: 1.1, 1.2, 1.3_
  - _Contracts: SharedAgentActions.ensureLogsLoaded_

- [x] 1.2 (P) ensureLogsLoadedのユニットテストを作成
  - ログなしの場合にAPIを呼び出すことを検証
  - Running Agentで既存ログがある場合にAPIをスキップすることを検証
  - 重複排除が正しく動作することを検証
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. リアルタイムログ購読hookを実装
- [x] 2.1 useAgentLogSubscription hookをshared/hooks/に作成
  - apiClient.onAgentLog()を購読し、store.addLog()を呼び出す
  - unmount時のクリーンアップ関数を実装
  - apiClientがnullの場合は何もしない（接続待ち状態）
  - _Requirements: 2.1, 2.2_
  - _Contracts: useAgentLogSubscription Service Interface_

- [x] 2.2 (P) useAgentLogSubscriptionのユニットテストを作成
  - onAgentLog購読が設定されることを検証
  - ログ受信時にaddLogが呼び出されることを検証
  - unmount時にcleanupが呼び出されることを検証
  - _Requirements: 2.1, 2.2_

- [x] 3. UI層の統合 - Remote UI版
- [x] 3.1 Remote UI App.tsxにuseAgentLogSubscriptionを追加
  - アプリケーション初期化時にリアルタイムログ購読を開始
  - _Requirements: 2.3_
  - _Method: useAgentLogSubscription_

- [x] 3.2 Remote UI AgentLogPage.tsxでensureLogsLoadedを呼び出す
  - Agent選択時に初回ログ読み込みを実行
  - 共通ストアからログを取得して表示
  - _Requirements: 3.1, 3.3_
  - _Method: ensureLogsLoaded_

- [x] 4. UI層の統合 - Electron版
- [x] 4.1 Electron版renderer/stores/agentStore.tsからensureLogsLoadedを削除
  - 共通版への委譲に変更（後方互換性維持のため薄いラッパーとして残す）
  - _Requirements: 1.4_
  - _Method: 共通ensureLogsLoadedを呼び出すラッパー_

- [x] 4.2 Electron版agentStoreAdapter.tsからloadAgentLogsメソッドを削除
  - loadAgentLogs関連コードを物理削除
  - _Requirements: 1.5_

- [x] 4.3 Electron版agentStoreAdapter.tsからonAgentLogリスナーを削除
  - setupAgentEventListenersからログ購読処理を削除
  - 共通hookへ移行するため不要になる
  - _Requirements: 2.4_

- [x] 4.4 Electron版上位コンポーネントにuseAgentLogSubscriptionを追加
  - renderer/App.tsx または適切な上位コンポーネントで共通hookを使用
  - _Requirements: 2.4_
  - _Method: useAgentLogSubscription_

- [x] 4.5 Electron版AgentLogPanel.tsxの呼び出し先を変更
  - 共通ensureLogsLoadedを使用するよう変更
  - _Requirements: 3.2_
  - _Method: 共通ensureLogsLoaded_

- [x] 5. Remote UI useAgentStoreInit.tsからログ購読ロジックを削除
- [x] 5.1 useAgentStoreInit.tsからonAgentLogリスナーを削除
  - ログ購読処理を削除（共通hookに移行済み）
  - _Requirements: 2.3_

- [x] 6. 統合テストと動作確認
- [x] 6.1 (P) Remote UI ログ読み込み統合テストを作成
  - Agent選択時にensureLogsLoadedが呼び出されることを検証
  - リアルタイムログが表示に反映されることを検証
  - _Requirements: 4.3_
  - _Integration Point: Design.md "初回ログ読み込みフロー", "リアルタイムログ購読フロー"_

- [x] 6.2 既存テストの修正と確認
  - Electron版関連テストが共通版を使用するよう更新
  - 全テストが通過することを確認
  - _Requirements: 4.1_

- [x] 6.3 動作確認（手動確認が必要）
  - Electron版でAgentログが正しく表示されることを確認
  - Remote UI版（Desktop/Mobile）でAgentログが正しく表示されることを確認
  - 既存ログとリアルタイムログのマージが正しく動作することを確認
  - _Requirements: 4.2, 4.3, 3.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ensureLogsLoadedをshared/stores/agentStore.tsに追加 | 1.1 | Feature |
| 1.2 | apiClient.getAgentLogs呼び出し | 1.1 | Feature |
| 1.3 | 重複排除ロジック | 1.1 | Feature |
| 1.4 | Electron版からensureLogsLoaded削除 | 4.1 | Integration |
| 1.5 | Electron版agentStoreAdapterからloadAgentLogs削除 | 4.2 | Cleanup |
| 2.1 | useAgentLogSubscription hook作成 | 2.1 | Feature |
| 2.2 | hookでonAgentLog購読とaddLog呼び出し | 2.1 | Feature |
| 2.3 | Remote UI useAgentStoreInit.tsからログ購読削除 | 3.1, 5.1 | Integration |
| 2.4 | Electron版agentStoreAdapterからログ購読削除 | 4.3, 4.4 | Cleanup/Integration |
| 3.1 | Remote UI AgentLogPageでensureLogsLoaded呼び出し | 3.2 | Feature |
| 3.2 | Electron版AgentLogPanelで共通ensureLogsLoaded使用 | 4.5 | Integration |
| 3.3 | 両環境でログのマージ表示 | 3.2, 6.3 | Feature |
| 4.1 | 既存テスト通過 | 6.2 | Validation |
| 4.2 | Electron版動作維持 | 6.3 | Validation |
| 4.3 | Remote UI版動作 | 6.1, 6.3 | Validation |
