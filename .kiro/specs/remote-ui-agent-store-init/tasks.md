# Implementation Plan

## Tasks

- [x] 1. Remote UI通知システムの実装
- [x] 1.1 (P) RemoteNotificationStoreの作成
  - Remote UI専用のZustand通知ストアを作成
  - success/error/warning/info通知タイプをサポート
  - 通知の自動消去機能（duration指定）
  - 最大表示数の制限機能
  - _Requirements: 4.1_
  - _Method: RemoteNotificationStore, remoteNotify_
  - _Verify: Grep "remoteNotify|RemoteNotificationStore" in remote-ui/stores/_

- [x] 1.2 (P) ToastContainerコンポーネントの作成
  - RemoteNotificationStoreから通知を購読して表示
  - 各通知タイプに応じたスタイリング
  - アニメーション付きのトースト表示・消去
  - Remote UI App.tsxへの組み込み
  - _Requirements: 4.1_
  - _Method: ToastContainer_
  - _Verify: Grep "ToastContainer" in remote-ui/_

- [x] 2. AgentStore初期化Hookの実装
- [x] 2.1 useAgentStoreInit Hookの作成
  - アプリマウント時に`useSharedAgentStore.loadAgents(apiClient)`を呼び出し
  - WebSocket `AGENT_STATUS`イベントを購読してStore更新を行う
  - クリーンアップ時にイベント購読を解除
  - isLoading状態とerror状態の管理
  - refreshAgents関数を提供してリトライ可能に
  - エラー発生時にremoteNotify.error()を呼び出し
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 4.1_
  - _Method: useAgentStoreInit, loadAgents, onAgentStatusChange_
  - _Verify: Grep "useAgentStoreInit|loadAgents|onAgentStatusChange" in remote-ui/hooks/_

- [x] 3. Pull to Refreshコンポーネントの実装（Mobile版）
- [x] 3.1 MobilePullToRefreshコンポーネントの作成
  - childrenをラップするコンテナコンポーネント
  - タッチイベントでPull to Refresh操作を検出
  - onRefreshコールバックを呼び出し
  - isRefreshing状態でリフレッシュインジケーターを表示
  - useDeviceTypeでモバイルデバイスのみで有効化
  - _Requirements: 4.2, 5.4_
  - _Method: MobilePullToRefresh_
  - _Verify: Grep "MobilePullToRefresh" in remote-ui/components/_

- [x] 4. RefreshButtonコンポーネントの実装（Desktop版）
- [x] 4.1 (P) RefreshButtonコンポーネントの作成
  - Lucide ReactのRefreshCwアイコンを使用
  - クリック時にonRefreshコールバックを呼び出し
  - isLoading状態でスピナーを表示しボタンを無効化
  - オプショナルなlabel表示をサポート
  - _Requirements: 4.3, 6.5_
  - _Method: RefreshButton, RefreshCw_
  - _Verify: Grep "RefreshButton|RefreshCw" in remote-ui/components/_

- [x] 5. MobileAppContent/DesktopAppContentへのAgentStore初期化統合
- [x] 5.1 MobileAppContentにuseAgentStoreInit統合
  - useAgentStoreInit(apiClient)を呼び出し
  - 既存のMobileAppContentマウント処理に追加
  - 2.1の完了に依存
  - _Requirements: 1.1_
  - _Method: useAgentStoreInit_
  - _Verify: Grep "useAgentStoreInit" in remote-ui/App.tsx_

- [x] 5.2 DesktopAppContentにuseAgentStoreInit統合
  - useAgentStoreInit(apiClient)を呼び出し
  - 既存のDesktopAppContentマウント処理に追加
  - 2.1の完了に依存
  - _Requirements: 1.2_
  - _Method: useAgentStoreInit_
  - _Verify: Grep "useAgentStoreInit" in remote-ui/App.tsx_

- [x] 6. AgentsTabViewの更新
- [x] 6.1 ローディング状態とエラー表示の追加
  - useSharedAgentStoreからisLoading/error状態を取得
  - ロード中にスピナーを表示
  - Agent一覧が空の場合に「プロジェクトエージェントなし」メッセージを表示
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6.2 Mobile版：MobilePullToRefreshでラップ
  - AgentsTabViewコンテンツをMobilePullToRefreshでラップ
  - onRefreshでrefreshAgentsを呼び出し
  - isRefreshingでリフレッシュインジケーターを表示
  - 3.1, 5.1の完了に依存
  - _Requirements: 5.1_
  - _Method: MobilePullToRefresh_
  - _Verify: Grep "MobilePullToRefresh" in remote-ui/components/AgentsTabView.tsx_

- [x] 6.3 Desktop版：RefreshButtonを追加
  - Agent一覧セクションのヘッダー右端にRefreshButtonを配置
  - onRefreshでrefreshAgentsを呼び出し
  - isLoadingでボタンをローディング状態に
  - 4.1, 5.2の完了に依存
  - _Requirements: 6.1, 6.4_
  - _Method: RefreshButton_
  - _Verify: Grep "RefreshButton" in remote-ui/components/AgentsTabView.tsx_

- [x] 7. SpecDetailPageの更新
- [x] 7.1 ローディング状態とエラー表示の追加
  - useSharedAgentStoreからisLoading/error状態を取得
  - Agent表示エリアでロード中にスピナーを表示
  - _Requirements: 2.1, 2.2_

- [x] 7.2 Mobile版：MobilePullToRefreshでラップ
  - SpecDetailPageのAgentセクションをMobilePullToRefreshでラップ
  - onRefreshでrefreshAgentsを呼び出し
  - _Requirements: 5.2_
  - _Method: MobilePullToRefresh_
  - _Verify: Grep "MobilePullToRefresh" in remote-ui/components/SpecDetailPage.tsx_

- [x] 7.3 Desktop版：RefreshButtonを追加
  - Agent表示エリアにRefreshButtonを配置
  - onRefreshでrefreshAgentsを呼び出し
  - _Requirements: 6.2, 6.4_
  - _Method: RefreshButton_
  - _Verify: Grep "RefreshButton" in remote-ui/components/SpecDetailPage.tsx_

- [x] 8. BugDetailPageの更新
- [x] 8.1 ローディング状態とエラー表示の追加
  - useSharedAgentStoreからisLoading/error状態を取得
  - Agent表示エリアでロード中にスピナーを表示
  - _Requirements: 2.1, 2.2_

- [x] 8.2 Mobile版：MobilePullToRefreshでラップ
  - BugDetailPageのAgentセクションをMobilePullToRefreshでラップ
  - onRefreshでrefreshAgentsを呼び出し
  - _Requirements: 5.3_
  - _Method: MobilePullToRefresh_
  - _Verify: Grep "MobilePullToRefresh" in remote-ui/components/BugDetailPage.tsx_

- [x] 8.3 Desktop版：RefreshButtonを追加
  - Agent表示エリアにRefreshButtonを配置
  - onRefreshでrefreshAgentsを呼び出し
  - _Requirements: 6.3, 6.4_
  - _Method: RefreshButton_
  - _Verify: Grep "RefreshButton" in remote-ui/components/BugDetailPage.tsx_

- [x] 9. ユニットテストの実装
- [x] 9.1 (P) useAgentStoreInitのユニットテスト
  - 初期化成功ケース：loadAgents呼び出し確認
  - 初期化失敗ケース：error状態設定、notify.error呼び出し確認
  - WebSocketイベント購読・解除の確認
  - refreshAgents関数の動作確認
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 4.1_

- [x] 9.2 (P) MobilePullToRefreshのユニットテスト
  - Pull操作検出の確認
  - onRefreshコールバック呼び出し確認
  - isRefreshing状態でインジケーター表示確認
  - _Requirements: 5.4_

- [x] 9.3 (P) RefreshButtonのユニットテスト
  - クリックイベントでonRefresh呼び出し確認
  - isLoading状態でスピナー表示・ボタン無効化確認
  - _Requirements: 6.5_

- [x] 9.4 (P) remoteNotifyのユニットテスト
  - 各種通知メソッド（success/error/warning/info）の動作確認
  - 通知の自動消去機能の確認
  - _Requirements: 4.1_

- [x] 10. 統合テストの実装
- [x] 10.1 MobileAppContent初期化の統合テスト
  - マウント時にAgentStore初期化が行われることを確認
  - API成功時：Store.isLoading遷移、Store.agents設定
  - API失敗時：notify.error呼び出し確認
  - _Requirements: 1.1, 1.3, 4.1_
  - _Integration Point: Design.md "初期化フロー"_

- [x] 10.2 DesktopAppContent初期化の統合テスト
  - マウント時にAgentStore初期化が行われることを確認
  - API成功時：Store.isLoading遷移、Store.agents設定
  - API失敗時：notify.error呼び出し確認
  - _Requirements: 1.2, 1.3, 4.1_
  - _Integration Point: Design.md "初期化フロー"_

- [x] 10.3 WebSocketイベント受信の統合テスト
  - AGENT_STATUSイベント受信時のStore更新確認
  - Agent開始時のAgent一覧追加確認
  - Agent終了時のAgent一覧削除/状態更新確認
  - waitForパターンで状態遷移を監視（固定sleepは使用しない）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Integration Point: Design.md "リアルタイム更新フロー"_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | MobileAppContentマウント時にloadAgents呼び出し | 2.1, 5.1, 10.1 | Feature |
| 1.2 | DesktopAppContentマウント時にloadAgents呼び出し | 2.1, 5.2, 10.2 | Feature |
| 1.3 | Agent一覧ロード完了時にagentStoreへ格納 | 2.1, 10.1, 10.2 | Feature |
| 2.1 | ロード中にスピナー表示 | 6.1, 7.1, 8.1 | Feature |
| 2.2 | ロード完了時にAgent一覧表示 | 6.1, 7.1, 8.1 | Feature |
| 2.3 | Agent一覧が空の場合にメッセージ表示 | 6.1 | Feature |
| 3.1 | AGENT_STATUSイベント受信時にagentStore更新 | 2.1, 10.3 | Feature |
| 3.2 | agentStore更新時にUI自動更新 | 10.3 | Feature |
| 3.3 | 新しいAgent開始時にAgent一覧に追加 | 10.3 | Feature |
| 3.4 | Agent終了時にAgent一覧から削除/状態更新 | 2.1, 10.3 | Feature |
| 4.1 | 取得失敗時にnotify.error()でトースト表示 | 1.1, 1.2, 2.1, 9.4, 10.1, 10.2 | Feature |
| 4.2 | Mobile版でPull to Refresh時にAgent一覧再取得 | 3.1 | Feature |
| 4.3 | Desktop版でリフレッシュボタンクリック時に再取得 | 4.1 | Feature |
| 5.1 | AgentsTabViewでPull to Refresh操作 | 6.2 | Feature |
| 5.2 | SpecDetailPageでPull to Refresh操作 | 7.2 | Feature |
| 5.3 | BugDetailPageでPull to Refresh操作 | 8.2 | Feature |
| 5.4 | Pull to Refresh中にリフレッシュインジケーター表示 | 3.1, 9.2 | Feature |
| 6.1 | AgentsTabViewにリフレッシュボタン表示（Desktop） | 6.3 | Feature |
| 6.2 | SpecDetailPageにリフレッシュボタン表示（Desktop） | 7.3 | Feature |
| 6.3 | BugDetailPageにリフレッシュボタン表示（Desktop） | 8.3 | Feature |
| 6.4 | リフレッシュボタンクリック時に再取得 | 6.3, 7.3, 8.3 | Feature |
| 6.5 | リフレッシュ中にボタンをローディング状態表示 | 4.1, 9.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 6.1), not container tasks (e.g., 6)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
