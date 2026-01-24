# Implementation Plan

## Tasks

- [x] 1. ApiClient抽象化層の拡張
- [x] 1.1 (P) ApiClientインタフェースにBug監視メソッドを追加する
  - switchAgentWatchScope(specId: string)メソッドを追加
  - startBugsWatcher()メソッドを追加
  - stopBugsWatcher()メソッドを追加
  - onBugsChanged(listener)メソッドを追加（購読解除関数を返す）
  - BugsChangeEvent型を定義
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Method: ApiClient, BugsChangeEvent_
  - _Verify: Grep "switchAgentWatchScope|startBugsWatcher|stopBugsWatcher|onBugsChanged" in types.ts_

- [x] 1.2 (P) IpcApiClientにBug監視メソッドを実装する
  - window.electronAPIへの委譲でswitchAgentWatchScopeを実装
  - startBugsWatcher/stopBugsWatcherをIPC経由で実装
  - onBugsChangedでIPCイベントリスナーを設定
  - _Requirements: 4.5, 4.7_
  - _Method: IpcApiClient, window.electronAPI_
  - _Verify: Grep "switchAgentWatchScope|startBugsWatcher" in IpcApiClient.ts_

- [x] 1.3 (P) WebSocketApiClientにBug監視メソッドを実装する
  - WebSocketメッセージハンドラ経由でswitchAgentWatchScopeを実装
  - startBugsWatcher/stopBugsWatcherをWebSocket経由で実装
  - onBugsChangedでWebSocketイベントを購読
  - WebSocket側の全件更新形式をBugsChangeEvent形式に変換するロジックを実装
  - _Requirements: 4.6, 4.7_
  - _Method: WebSocketApiClient, detectBugsChanges_
  - _Verify: Grep "detectBugsChanges|onBugsChanged" in WebSocketApiClient.ts_

- [x] 2. useSharedBugStoreの拡張
- [x] 2.1 useSharedBugStoreにbugDetail管理機能を追加する
  - bugDetail状態を追加
  - selectBug(apiClient, bugId)でbugDetail取得とキャッシュを実装
  - selectBug呼び出し時にswitchAgentWatchScopeを呼び出す
  - clearSelectedBug()メソッドを追加
  - refreshBugDetail(apiClient)メソッドを追加
  - 依存: 1.1完了後（ApiClientインタフェースが必要）
  - _Requirements: 3.1, 3.2, 3.8_
  - _Method: selectBug, clearSelectedBug, refreshBugDetail_
  - _Verify: Grep "selectBug|bugDetail|switchAgentWatchScope" in shared/stores/bugStore.ts_

- [x] 2.2 useSharedBugStoreに差分更新機能を追加する
  - handleBugsChanged(apiClient, event)メソッドを実装
  - addイベントでbugs配列に新規bugを追加
  - changeイベントでmetadata更新、選択中なら詳細も再取得
  - unlink/unlinkDirイベントでbugs配列から削除、選択中なら選択解除
  - 依存: 2.1完了後（selectBugとclearSelectedBugが必要）
  - _Requirements: 3.3, 3.4, 3.5, 3.6_
  - _Method: handleBugsChanged_
  - _Verify: Grep "handleBugsChanged" in shared/stores/bugStore.ts_

- [x] 2.3 useSharedBugStoreにファイル監視機能を追加する
  - isWatching状態を追加
  - startWatching(apiClient)でファイル監視開始とonBugsChanged購読を実装
  - stopWatching(apiClient)でファイル監視停止と購読解除を実装
  - 依存: 2.2完了後（handleBugsChangedが必要）
  - _Requirements: 3.7_
  - _Method: startWatching, stopWatching, isWatching_
  - _Verify: Grep "startWatching|stopWatching|isWatching" in shared/stores/bugStore.ts_

- [x] 3. 共有UIコンポーネントとロジックフックの作成
- [x] 3.1 (P) useBugListLogicフックを作成する
  - updatedAt降順ソートロジックを実装
  - Phase別フィルタリング（all/reported/analyzed/fixed/verified/deployed）を実装
  - テキスト検索フィルタリング（名前部分一致）を実装
  - フィルター状態のsetter（setPhaseFilter, setSearchQuery）を実装
  - filteredBugsを返却
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Method: useBugListLogic_
  - _Verify: Grep "useBugListLogic" in shared/hooks/useBugListLogic.ts_

- [x] 3.2 BugListContainerコンポーネントを作成する
  - BugListItemを使用してBug一覧を表示
  - isLoading時にSpinnerを表示
  - error時にエラーメッセージを表示
  - bugs空配列時に空状態メッセージを表示
  - showPhaseFilter時にPhaseフィルタードロップダウンを表示
  - showSearch時にテキスト検索入力を表示
  - Bug選択時にonSelectBugコールバックを呼び出し
  - getRunningAgentCount提供時に各Bugのエージェント数を表示
  - deviceTypeでレスポンシブレイアウトを切り替え
  - 依存: 3.1完了後（useBugListLogicの利用パターン確認）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  - _Method: BugListContainer, BugPhaseFilter, BUG_PHASE_FILTER_OPTIONS_
  - _Verify: Grep "BugListContainer" in shared/components/bug/BugListContainer.tsx_

- [x] 4. Electron版BugListの移行
- [x] 4.1 BugListコンポーネントをBugListContainer使用に改修する
  - 内部でBugListContainerを使用
  - useSharedBugStoreから状態を取得
  - useAgentStoreからgetRunningAgentCountを取得して連携
  - Bug選択時にshared storeとwatchScopeを更新
  - 後方互換性を維持（既存のprops、usage patternを変更しない）
  - 依存: 2.3, 3.2完了後（shared storeとコンテナが必要）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Method: BugList, useSharedBugStore, useAgentStore_
  - _Verify: Grep "BugListContainer|useSharedBugStore" in renderer/components/BugList.tsx_

- [x] 5. Remote UI版BugsViewの移行
- [x] 5.1 BugsViewコンポーネントをBugListContainer使用に改修する
  - 内部でBugListContainerを使用
  - useSharedBugStoreから状態を取得（ローカルstateを削除）
  - Phaseフィルター機能を追加（showPhaseFilter=true）
  - Agent数表示機能を追加（getRunningAgentCount連携）
  - レスポンシブレイアウト対応を維持（deviceType props）
  - CreateBugDialog連携を維持
  - 依存: 2.3, 3.2完了後（shared storeとコンテナが必要）
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - _Method: BugsView, useSharedBugStore, BugListContainer_
  - _Verify: Grep "BugListContainer|useSharedBugStore|showPhaseFilter" in remote-ui/views/BugsView.tsx_

- [x] 6. renderer/bugStore廃止
- [x] 6.1 renderer/bugStoreの参照をuseSharedBugStoreに更新する
  - renderer/App.tsxのbugStore参照を更新
  - renderer/components/BugPane.tsxのbugStore参照を更新
  - renderer/components/BugWorkflowView.tsxのbugStore参照を更新
  - renderer/components/CreateBugDialog.tsxのbugStore参照を更新
  - renderer/stores/projectStore.tsのbugStore参照を更新
  - renderer/stores/index.tsからbugStoreエクスポートを削除
  - 依存: 4.1完了後（BugListの移行完了後）
  - _Requirements: 7.1, 7.3_
  - _Method: useSharedBugStore_
  - _Verify: Grep "renderer/stores/bugStore" returns 0 results_

- [x] 6.2 renderer/bugStoreファイルを物理削除する
  - renderer/stores/bugStore.tsを削除
  - renderer/stores/bugStore.test.ts（存在する場合）を削除
  - 依存: 6.1完了後（全参照削除後）
  - _Requirements: 7.2, 7.4_

- [x] 7. テストの作成
- [x] 7.1 (P) useBugListLogicのユニットテストを作成する
  - updatedAt降順ソートのテスト
  - Phase別フィルターのテスト（各phase、all含む）
  - テキスト検索フィルターのテスト
  - フィルター組み合わせのテスト
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 7.2 (P) useSharedBugStore拡張部分のユニットテストを作成する
  - selectBug正常系・エラー系のテスト
  - handleBugsChangedの各イベントタイプのテスト
  - startWatching/stopWatchingのテスト
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 7.3 (P) BugListContainerのコンポーネントテストを作成する
  - ローディング・エラー・空状態表示のテスト
  - フィルター・検索UI表示/非表示のテスト
  - Bug選択コールバックのテスト
  - レスポンシブ対応のテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

---

## Inspection Fixes

### Round 2 (2026-01-24)

- [x] 8.1 BugsViewをuseSharedBugStoreを使用するよう修正する
  - ローカルstate（useState(bugs), useState(isLoading), useState(error)）を削除
  - useSharedBugStoreをインポートして使用
  - loadBugs/selectBugをapiClient経由で呼び出し
  - onBugsUpdatedイベント購読をuseSharedBugStore.startWatchingに移行
  - 関連: Task 5.1, Requirement 6.2
  - _Requirements: 6.2_
  - _Method: useSharedBugStore_
  - _Verify: BugsView.tsx内でuseState(bugs)が存在しないこと_

- [x] 8.2 BugsViewにPhaseフィルター機能を追加する
  - useBugListLogicでenablePhaseFilter=trueを設定
  - showPhaseFilter={true}をBugListContainerに渡す
  - phaseFilter、onPhaseFilterChangeをBugListContainerに連携
  - 関連: Task 5.1, Requirement 6.3
  - _Requirements: 6.3_
  - _Method: showPhaseFilter, phaseFilter, onPhaseFilterChange_
  - _Verify: BugsView.tsx内でshowPhaseFilter={true}が存在すること_

- [x] 8.3 BugsViewにAgent数表示機能を追加する
  - sharedAgentStore（useSharedAgentStore）をインポート
  - getRunningAgentCount関数を定義（bug:${bugName}形式でエージェント取得）
  - BugListContainerにgetRunningAgentCountを渡す
  - 関連: Task 5.1, Requirement 6.4
  - _Requirements: 6.4_
  - _Method: useSharedAgentStore, getRunningAgentCount_
  - _Verify: BugsView.tsx内でgetRunningAgentCountが存在すること_

- [x] 8.4 BugsView.test.tsxをuseSharedBugStore使用に更新する
  - テストでuseSharedBugStoreをモック
  - PhaseフィルターのE2Eテストを追加
  - Agent数表示のテストを追加
  - 関連: Task 7.3, Requirements 6.2, 6.3, 6.4
  - _Requirements: 6.2, 6.3, 6.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | BugListItem使用リスト表示 | 3.2 | Feature |
| 1.2 | ローディング表示 | 3.2 | Feature |
| 1.3 | エラー表示 | 3.2 | Feature |
| 1.4 | 空状態表示 | 3.2 | Feature |
| 1.5 | Phaseフィルター表示 | 3.2 | Feature |
| 1.6 | テキスト検索表示 | 3.2 | Feature |
| 1.7 | Bug選択コールバック | 3.2 | Feature |
| 1.8 | Agent数表示 | 3.2 | Feature |
| 1.9 | レスポンシブ対応 | 3.2 | Feature |
| 2.1 | updatedAtソート | 3.1 | Infrastructure |
| 2.2 | テキスト検索フィルター | 3.1 | Infrastructure |
| 2.3 | Phaseフィルター | 3.1 | Infrastructure |
| 2.4 | allフィルター | 3.1 | Infrastructure |
| 2.5 | フィルター状態setter | 3.1 | Infrastructure |
| 2.6 | filteredBugs返却 | 3.1 | Infrastructure |
| 3.1 | bugDetail状態管理 | 2.1 | Infrastructure |
| 3.2 | selectBug詳細取得 | 2.1 | Infrastructure |
| 3.3 | handleBugsChanged差分更新 | 2.2 | Infrastructure |
| 3.4 | add イベント処理 | 2.2 | Infrastructure |
| 3.5 | change イベント処理 | 2.2 | Infrastructure |
| 3.6 | unlink/unlinkDir イベント処理 | 2.2 | Infrastructure |
| 3.7 | startWatching/stopWatching | 2.3 | Infrastructure |
| 3.8 | switchAgentWatchScope呼び出し | 2.1 | Infrastructure |
| 4.1 | switchAgentWatchScopeメソッド | 1.1 | Infrastructure |
| 4.2 | startBugsWatcherメソッド | 1.1 | Infrastructure |
| 4.3 | stopBugsWatcherメソッド | 1.1 | Infrastructure |
| 4.4 | onBugsChangedメソッド | 1.1 | Infrastructure |
| 4.5 | IpcApiClient委譲 | 1.2 | Infrastructure |
| 4.6 | WebSocketApiClient委譲 | 1.3 | Infrastructure |
| 4.7 | イベント形式正規化 | 1.2, 1.3 | Infrastructure |
| 5.1 | BugListContainer内部使用 | 4.1 | Feature |
| 5.2 | useSharedBugStore使用 | 4.1 | Feature |
| 5.3 | getRunningAgentCount連携 | 4.1 | Feature |
| 5.4 | 選択時store・watchScope更新 | 4.1 | Feature |
| 5.5 | 後方互換性維持 | 4.1 | Feature |
| 6.1 | BugListContainer内部使用 | 5.1 | Feature |
| 6.2 | useSharedBugStore使用 | 5.1 | Feature |
| 6.3 | Phaseフィルター追加 | 5.1 | Feature |
| 6.4 | Agent数表示追加 | 5.1 | Feature |
| 6.5 | レスポンシブ維持 | 5.1 | Feature |
| 6.6 | CreateBugDialog連携維持 | 5.1 | Feature |
| 7.1 | renderer/bugStoreインポート削除 | 6.1 | Infrastructure |
| 7.2 | bugStoreファイル削除 | 6.2 | Infrastructure |
| 7.3 | useSharedBugStore参照更新 | 6.1 | Infrastructure |
| 7.4 | 既存機能維持 | 6.2, 7.1, 7.2, 7.3 | Feature |
