# Implementation Plan

> **Note**: タスク名の`(P)`マーカーは「タスクグループ内で並列実行可能」を示す。(P)が付いたタスクは同一グループ内の他の(P)タスクと並列に実装可能。(P)なしのタスクはグループ内で順序依存がある。

## Task 1. WindowManager拡張（基盤）

- [x] 1.1 PerWindowServicesにMetricsServiceとAutoExecutionCoordinatorを追加し、ウィンドウごとのサービスインスタンスをフル管理する
  - 既存PerWindowServices型定義にMetricsServiceとAutoExecutionCoordinatorのフィールドを追加
  - createWindowServices内で両サービスのインスタンスを生成し、ウィンドウ別に保持
  - handleWindowClose時に両サービスの停止処理を追加（既存のWatcher停止に並列）
  - _Requirements: 1.5, 3.3, 3.6_
  - _Method: PerWindowServices, createWindowServices, handleWindowClose_
  - _Verify: Grep "MetricsService|AutoExecutionCoordinator" in windowManager.ts_

- [x] 1.2 webContentsToWindowIdマッピングとコンテキスト解決メソッドを実装する
  - `webContentsToWindowId: Map<number, number>`を追加し、createWindow時にwebContents.id→windowIdのマッピングを登録
  - `getWindowIdByWebContents(webContentsId)`: webContents IDからwindowIdを返すO(1)ルックアップメソッド
  - `getWindowContext(windowId)`: PerWindowContext（windowId、projectPath、servicesの三点セット）を返すメソッド
  - handleWindowClose時にwebContentsToWindowIdからエントリを削除
  - _Requirements: 1.2, 1.3, 1.4, 3.2, 3.3_
  - _Method: getWindowIdByWebContents, getWindowContext, webContentsToWindowId_
  - _Verify: Grep "getWindowContext|getWindowIdByWebContents|webContentsToWindowId" in windowManager.ts_

- [x] 1.3 IPCHandler保持・管理機能を追加する
  - `ipcHandler`フィールドとgetter/setterを追加し、WindowManagerがIPCHandlerインスタンスのSSOTとなる
  - createWindow内でIPCHandler存在時に`attachWindow`を呼び出す
  - handleWindowClose内で`detachWindow`を呼び出し（Subscriptionの自動クリーンアップを委譲）
  - _Requirements: 1.1, 1.5, 4.5_
  - _Method: getIPCHandler, setIPCHandler, attachWindow, detachWindow_
  - _Verify: Grep "attachWindow|detachWindow|ipcHandler" in windowManager.ts_

- [x] 1.4 パス正規化にシンボリックリンク解決を追加する
  - 既存の末尾スラッシュ除去に加え、`fs.realpathSync`によるシンボリックリンク解決を追加
  - エラー時（パスが存在しない場合）は末尾スラッシュ除去のみで継続
  - _Requirements: 5.3_
  - _Method: normalizePath_
  - _Verify: Grep "realpathSync|normalizePath" in windowManager.ts_

- [x] 1.5 WindowManager拡張のユニットテスト
  - getWindowContext: 登録済みウィンドウのコンテキスト取得、未登録ウィンドウでnull返却
  - getWindowIdByWebContents: webContents IDからのwindowId解決、削除後のnull返却
  - IPCHandler連携: createWindow時のattachWindow呼び出し、handleWindowClose時のdetachWindow呼び出し
  - PerWindowServices拡充: MetricsService・AutoExecutionCoordinator含むサービス作成・クリーンアップ
  - normalizePath: シンボリックリンク解決、末尾スラッシュ除去、存在しないパスのフォールバック
  - 既存26件のテストが全てパスすることを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.2, 5.3_

## Task 2. WindowContextFactory + tRPCハンドラ統合

- [x] 2.1 (P) createWindowContextFactoryを実装し、tRPCリクエストごとにウィンドウ別コンテキストを生成する
  - WindowManagerとsharedServicesを受け取り、`createContext({ event })`関数を返すファクトリ
  - `event.sender`から`BrowserWindow.fromWebContents`でウィンドウを特定
  - 特定されたウィンドウのPerWindowContext内のprojectPathとservicesをContextServicesに注入
  - ウィンドウ未特定時はフォーカスウィンドウにフォールバックし、ログ出力
  - `getCurrentProjectPath()`がリクエスト元ウィンドウのprojectPathを返すようにする
  - `getSpecManagerService()`がリクエスト元ウィンドウのSpecManagerServiceインスタンスを返すようにする
  - **per-windowプロパティのクロージャバインディング**: ContextServicesの`selectProject`等のper-windowプロパティは、WindowContextFactory内でwindowIdバインド済みクロージャとして生成する（例: `selectProject: (path) => selectProject(path, windowId)`）。これによりRouter側のコード変更は不要となる
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: createWindowContextFactory, BrowserWindow.fromWebContents_
  - _Verify: Grep "createWindowContextFactory|fromWebContents" in src/main/trpc/_

- [x] 2.2 (P) handler.tsを書き換え、IPCHandler Singletonパターンに移行する
  - 既存の`setupTRPCHandler(window, serviceOverrides?)`を`initializeTRPCHandler(windowManager, sharedServices)`に変更
  - `createIPCHandler`はアプリ起動時に1回のみ呼び出し、IPCHandlerインスタンスをWindowManagerに保持
  - `createContext`にcreateWindowContextFactoryの返却関数を使用
  - 初回呼び出し時のみIPCHandler生成、2回目以降は既存IPCHandlerにattachWindow
  - _Requirements: 3.1_
  - _Method: initializeTRPCHandler, createIPCHandler_
  - _Verify: Grep "initializeTRPCHandler|createIPCHandler" in handler.ts_

- [x] 2.3 (P) context.tsのContextServicesをウィンドウ別対応に更新する
  - ContextServicesインターフェースに`windowId`フィールドを追加
  - `getCurrentProjectPath`の実装をウィンドウコンテキストから取得するように変更
  - `getSpecManagerService`の実装をウィンドウ別サービスから取得するように変更
  - 共有サービス（FileService、BugService等）は引き続きsharedServicesから取得
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: ContextServices_
  - _Verify: Grep "windowId" in context.ts_

- [x] 2.4 (P) WindowContextFactoryとtRPCハンドラのユニットテスト
  - createWindowContextFactory: 異なるevent.senderから異なるprojectPathのコンテキストが生成されることを検証
  - ウィンドウ未特定時: フォーカスウィンドウにフォールバックすることを検証
  - per-windowサービス注入: ContextServices内のgetterがウィンドウ別の値を返すことを検証
  - initializeTRPCHandler: createIPCHandlerが1回のみ呼ばれることを検証
  - _Requirements: 3.1, 3.2, 3.3_

## Task 3. projectState.ts互換レイヤー

- [x] 3.1 (P) グローバル変数のgetter/setterをWindowManagerのフォーカスウィンドウ状態に委譲する
  - `getCurrentProjectPath()`をWindowManager.getFocusedWindowId() → getWindowProject()への委譲に変更
  - `getSpecManagerService()`をWindowManager.getFocusedWindowId() → getWindowServices().specManagerServiceへの委譲に変更
  - `getAutoExecutionCoordinator()`、`getMetricsService()`も同様に委譲
  - setter関数は廃止予定としつつ、移行期間中はフォーカスウィンドウへの設定として動作
  - WindowManagerが未初期化の場合（テスト環境等）のnullフォールバック
  - _Requirements: 3.4_
  - _Method: getCurrentProjectPath, getSpecManagerService, getAutoExecutionCoordinator, getMetricsService_
  - _Verify: Grep "WindowManager|getFocusedWindowId" in projectState.ts_

- [x] 3.2 (P) projectState互換レイヤーのユニットテスト
  - WindowManagerにフォーカスウィンドウが存在する場合: そのウィンドウのprojectPathを返す
  - フォーカスウィンドウが存在しない場合: nullを返す
  - WindowManager未初期化時: nullを返す（テスト環境対応）
  - 複数ウィンドウ存在時: フォーカス切り替えに追従することを検証
  - _Requirements: 3.4_

## Task 4. EventBusウィンドウ別ルーティング基盤

- [x] 4.1 (P) EventBusイベント型にprojectPathメタデータを追加する
  - イベントペイロードの共通型に`projectPath?: string`フィールドを追加
  - プロジェクトスコープイベント（SPECS_CHANGED、BUGS_CHANGED、AGENT系等22イベント）のペイロードにprojectPathを含む型定義
  - アプリスコープイベント（REMOTE_SERVER系、SCHEDULE系等14イベント）はprojectPath不要
  - _Requirements: 4.1_
  - _Method: EventBus, EVENT_NAMES_

- [x] 4.2 (P) イベントカテゴリ分類定数とフィルタヘルパー関数を作成する
  - プロジェクトスコープとアプリスコープのイベント名を定数として分類
  - `isProjectScopedEvent(eventName)`: イベントがプロジェクトスコープかを判定するヘルパー
  - `shouldDeliverEvent(eventProjectPath, windowProjectPath, eventName)`: イベント配信判定のヘルパー
  - _Requirements: 4.3, 4.4_
  - _Method: isProjectScopedEvent, shouldDeliverEvent_
  - _Verify: Grep "isProjectScopedEvent|shouldDeliverEvent" in src/main/trpc/_

- [x] 4.3 (P) events.tsの各Subscriptionにウィンドウ別フィルタリングを実装する
  - 各observable内で`ctx.services.getCurrentProjectPath()`を取得してフィルタ用projectPathを確定
  - プロジェクトスコープイベント受信時、イベントのprojectPathとウィンドウのprojectPathを比較し、一致する場合のみ`observer.next()`
  - アプリスコープイベントは無条件で全Subscriptionに配信
  - projectPathがnullのイベント（移行期間の安全策）は全ウィンドウに配信しログ出力
  - _Requirements: 4.2, 4.3, 4.4_
  - _Method: shouldDeliverEvent, getCurrentProjectPath_
  - _Verify: Grep "shouldDeliverEvent|projectPath" in events.ts_

- [x] 4.4 (P) EventBusフィルタリングのユニットテスト
  - プロジェクトスコープイベント: 同一projectPathのウィンドウにのみ配信される
  - プロジェクトスコープイベント: 異なるprojectPathのウィンドウには配信されない
  - アプリスコープイベント: 全ウィンドウに配信される
  - projectPathがnullのイベント: 全ウィンドウに配信される（安全策）
  - _Requirements: 4.2, 4.3, 4.4_

## Task 5. メニューフォーカス追従

- [x] 5.1 (P) menu.tsのウィンドウ管理をWindowManager経由に変更する
  - 「新しいウィンドウ」メニュー項目をWindowManager.createWindow()経由に変更
  - 「最近使ったプロジェクト」選択時、プロジェクト未選択のウィンドウがあればそこで開き、なければ新規ウィンドウ作成
  - グローバル`currentProjectPathForMenu`をWindowManager.onWindowFocusコールバック経由で更新
  - _Requirements: 6.3, 6.4_
  - _Method: WindowManager.createWindow, onWindowFocus, setMenuProjectPath_
  - _Verify: Grep "WindowManager|createWindow" in menu.ts_

- [x] 5.2 (P) フォーカスウィンドウのメニューコンテキスト追従を実装する
  - WindowManager.onWindowFocusコールバック内で`setMenuProjectPath(projectPath)`を呼び出し
  - プロジェクト未選択ウィンドウがフォーカスされた場合、プロジェクト固有メニュー項目を無効化（setMenuProjectPath(null)）
  - _Requirements: 6.1, 6.2_
  - _Method: onWindowFocus, setMenuProjectPath_
  - _Verify: Grep "onWindowFocus|setMenuProjectPath" in menu.ts_

## Task 6. projectSetup・Watcherのウィンドウ別化

- [x] 6.1 selectProjectにwindowIdパラメータを追加し、ウィンドウ別のサービス初期化に対応する
  - `selectProject(projectPath, windowId?)`にシグネチャ変更（windowId省略時はフォーカスウィンドウ）
  - WindowManager.setWindowProject(windowId, path)で重複チェックとプロジェクト紐づけを実行
  - ウィンドウ別のSpecManagerService、各Watcher、MetricsService、AutoExecutionCoordinatorを初期化
  - 重複検出時はDUPLICATE_PROJECTエラーを返却し、既存ウィンドウをフォーカス
  - _Requirements: 3.5, 5.1_
  - _Method: selectProject, setWindowProject, createWindowServices_
  - _Verify: Grep "windowId" in projectSetup.ts_

- [x] 6.2 watcherUtils.tsのWatcher生成をウィンドウ別に対応する
  - グローバルWatcher変数をWindowManager経由のper-windowサービスに移行
  - Watcher生成時にwindowIdを受け取り、WindowManagerのPerWindowServicesに格納
  - handleWindowClose時にWatcher停止が実行されることを確認（Task 1.1で実装済みの仕組みを活用）
  - _Requirements: 1.5, 3.5_
  - _Method: createWindowServices, PerWindowServices_
  - _Verify: Grep "windowId|PerWindowServices" in watcherUtils.ts_

- [x] 6.3 イベント発火箇所にprojectPathメタデータを付与する
  - watcherUtils.ts: SPECS_CHANGED、BUGS_CHANGED、AGENT_RECORD_CHANGEDのemitにprojectPath追加（3件）
  - projectSetup.ts `registerEventCallbacks()`: Agent系イベント5件（AGENT_OUTPUT、AGENT_STATUS_CHANGE、AGENT_LOG、AGENT_EXIT_ERROR、AGENT_START_ERROR）のemitにprojectPath追加
  - projectSetup.ts `registerAutoExecutionEvents()`: Auto-Execution系イベント5件のemitにprojectPath追加
  - projectSetup.ts `registerBugAutoExecutionEvents()`: Bug Auto-Execution系イベント4件のemitにprojectPath追加
  - projectFileUtils.ts: PROJECT_FILE_CHANGEDのemitにprojectPath追加（1件）
  - **emit実態が存在しないイベントの対応**:
    - METRICS_UPDATED: プロダクションコードにemit箇所が存在しない（MetricsServiceはメトリクス記録のみ）。MetricsService更新時にEventBus emitを追加するか、チェックリストからスキップするかを判断
    - BUG_AUTO_EXECUTION_EXECUTE_PHASE: プロダクションコードにemit箇所が存在しない（テストコードのみ）。BugAutoExecutionCoordinatorに該当フェーズのemitを追加するか、チェックリストからスキップするかを判断
    - GIT_CHANGES_DETECTED: WebSocket broadcast経由（webSocketHandler.ts）で発火されており、EventBus.emitではない。tRPC Subscriptionでも使用する場合はEventBus emitの追加が必要。不要ならチェックリストからスキップ
  - **プロジェクトスコープ全22イベントのチェックリスト**:
    - [x] AGENT_OUTPUT
    - [x] AGENT_STATUS_CHANGE
    - [x] AGENT_LOG
    - [x] AGENT_START_ERROR
    - [x] AGENT_EXIT_ERROR
    - [x] AGENT_RECORD_CHANGED
    - [x] SPECS_CHANGED
    - [x] BUGS_CHANGED
    - [x] AUTO_EXECUTION_STATUS_CHANGED
    - [x] AUTO_EXECUTION_PHASE_STARTED
    - [x] AUTO_EXECUTION_PHASE_COMPLETED
    - [x] AUTO_EXECUTION_ERROR
    - [x] AUTO_EXECUTION_COMPLETED
    - [x] BUG_AUTO_EXECUTION_STATUS_CHANGED
    - [x] BUG_AUTO_EXECUTION_PHASE_STARTED
    - [x] BUG_AUTO_EXECUTION_PHASE_COMPLETED
    - [x] BUG_AUTO_EXECUTION_ERROR
    - [x] BUG_AUTO_EXECUTION_COMPLETED
    - [x] BUG_AUTO_EXECUTION_EXECUTE_PHASE (emit箇所なし - スキップ)
    - [x] GIT_CHANGES_DETECTED (WebSocket経由 - EventBus emitなし - スキップ)
    - [x] PROJECT_FILE_CHANGED
    - [x] METRICS_UPDATED (emit箇所なし - スキップ)
  - _Requirements: 4.1_
  - _Method: eventBus.emit_
  - _Verify: Grep "projectPath" in watcherUtils.ts projectSetup.ts projectFileUtils.ts_

- [x] 6.4 productionServices.tsのウィンドウ別サービス分離を実施する
  - プロジェクト固有サービス（SpecManagerService、各Watcher、MetricsService、AutoExecutionCoordinator）をContextFactory側で注入するフローに分離
  - 共有サービス（FileService、BugService、ConfigStore等）は引き続きsharedServicesとして一括提供
  - `getCurrentProjectPath`参照箇所が互換レイヤー経由（Task 3）で動作することを確認
  - **`BrowserWindow.getAllWindows()[0]`直接参照の修正**: projectSetup.ts内のAuto-Execution関連コード（Bug Auto-Execution、Spec Auto-Execution）で`BrowserWindow.getAllWindows()[0]`を使用している箇所を特定し、WindowManager経由でウィンドウを取得するように変更（互換レイヤーではカバーできないBrowserWindow API直接参照）
  - _Requirements: 3.5, 3.6_
  - _Method: productionServices, createWindowContextFactory_
  - _Verify: Grep "getCurrentProjectPath|sharedServices" in productionServices.ts; Grep "getAllWindows" in src/ (結果0件を確認)_

## Task 7. 起動フロー統合・windowFactory廃止

- [x] 7.1 index.tsの起動フロー（app.whenReady）をWindowManager経由に変更する
  - `app.whenReady()`内で`windowFactory.createWindow()`の代わりにWindowManagerインスタンスを作成し、`WindowManager.createWindow()`を呼び出す
  - `initializeTRPCHandler(windowManager, sharedServices)`で最初のウィンドウにIPCHandlerを設定
  - WindowManagerインスタンスをモジュールスコープに保持し、他のハンドラからアクセス可能にする
  - _Requirements: 2.2_
  - _Method: WindowManager.createWindow, initializeTRPCHandler_
  - _Verify: Grep "WindowManager" in index.ts_

- [x] 7.2 app.on('activate')とsecond-instanceハンドラをWindowManager経由に変更する
  - `app.on('activate')`: WindowManager.getAllWindowIds()でウィンドウ存在確認、0件の場合にcreateWindow()
  - `app.on('second-instance')`: `--project`引数解析後、WindowManager.getWindowByProject()で既存ウィンドウチェック、存在すればrestoreAndFocus()、なければ新規ウィンドウ作成
  - _Requirements: 2.3, 2.4, 5.4_
  - _Method: getAllWindowIds, getWindowByProject, restoreAndFocus_
  - _Verify: Grep "WindowManager|getWindowByProject|restoreAndFocus" in index.ts_

- [x] 7.3 `windowFactory.ts`を物理削除し、全参照箇所をWindowManager APIに更新する
  - `windowFactory.ts`を削除
  - `getMainWindow()`の参照箇所（index.ts、menu.ts等）をWindowManager APIに移行
  - `createWindow`のインポートをWindowManager.createWindowに変更
  - `setupTRPCHandler`の呼び出し箇所を`initializeTRPCHandler`に変更
  - 全インポートパスの更新とコンパイルエラーの解消
  - _Requirements: 2.1_
  - _Method: WindowManager.createWindow_
  - _Verify: Grep "windowFactory" in src/ (結果0件を確認)_

## Task 8. ウィンドウ状態永続化・復元の統合

- [x] 8.1 (P) appLifecycle.tsにウィンドウ状態保存を追加する
  - `cleanupOnQuit`（または`app.on('before-quit')`）でWindowManager.saveAllWindowStates()を呼び出し
  - 全ウィンドウの位置、サイズ、最大化/最小化状態、プロジェクトパスをConfigStoreに永続化
  - _Requirements: 7.1_
  - _Method: saveAllWindowStates, ConfigStore.setMultiWindowStates_
  - _Verify: Grep "saveAllWindowStates" in appLifecycle.ts_

- [x] 8.2 (P) 起動フローにウィンドウ状態復元を統合する
  - app.whenReady内でWindowManager.restoreWindows()を呼び出し、前回のウィンドウ状態を復元
  - 復元対象プロジェクトディレクトリが存在しない場合はスキップしログ記録
  - 初回起動時または保存済み状態がない場合はデフォルトウィンドウを1つ開く
  - マルチディスプレイ環境で前回のディスプレイが存在しない場合はプライマリディスプレイに配置
  - _Requirements: 7.2, 7.3, 7.4, 7.5_
  - _Method: restoreWindows, validateDisplayBounds, ConfigStore.getMultiWindowStates_
  - _Verify: Grep "restoreWindows" in index.ts_

## Task 9. 統合テスト

- [x] 9.1 (P) tRPCコンテキスト分離の統合テスト
  - 2つの異なるウィンドウから同一tRPCプロシージャ（getCurrentProjectPath等）を呼び出し、それぞれのプロジェクトパスが返されることを検証
  - Mock `BrowserWindow.fromWebContents`で異なるevent.senderをシミュレート
  - `waitFor`パターンでコンテキスト生成完了を確認（固定sleepは使用しない）
  - テスト用ヘルパー`createTestContextWithWindow(windowId)`を作成する（既存`createTestContext(overrides)`をwindowId対応に拡張）
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3_
  - _Integration Point: Design.md "Test 1: tRPCコンテキスト分離"_

- [x] 9.2 (P) EventBusフィルタリングの統合テスト
  - ウィンドウAのプロジェクトAに対してSPECS_CHANGEDイベントを発火し、ウィンドウAのSubscriptionには配信されウィンドウBには配信されないことを検証
  - アプリスコープイベント（REMOTE_SERVER_STATUS_CHANGED等）は両ウィンドウに配信されることを検証
  - イベント発火後にtickを待ち、observerの呼び出し回数をアサート
  - _Requirements: 4.2, 4.3, 4.4_
  - _Integration Point: Design.md "Test 2: EventBusフィルタリング"_

- [x] 9.3 (P) プロジェクト選択→サービスライフサイクルの統合テスト
  - selectProject(path, windowId)呼び出し後にPerWindowServicesが生成されていることを検証
  - closeWindow後にWatcherが停止し、Map からエントリが削除されていることを検証
  - 重複プロジェクト選択時にDUPLICATE_PROJECTエラーが返却されることを検証
  - _Requirements: 1.5, 3.5, 3.6, 5.1_
  - _Integration Point: Design.md "Test 3: プロジェクト選択とサービスライフサイクル"_

## Task 10. E2Eテスト

- [x] 10.1 (P) 複数ウィンドウの同時作成と独立プロジェクト操作のE2Eテスト
  - Cmd+Shift+Nまたはメニューから新しいウィンドウを作成
  - 各ウィンドウで異なるプロジェクトを開き、それぞれのプロジェクト名がタイトルに表示されることを確認
  - 各ウィンドウのSpec一覧が独立していることを確認
  - _Requirements: 8.1_

- [x] 10.2 (P) 重複プロジェクトオープン防止のE2Eテスト
  - ウィンドウAでプロジェクトAを開いた後、ウィンドウBでプロジェクトAを選択
  - ウィンドウBではプロジェクトが開かれず、ウィンドウAがフォーカスされることを確認
  - 最小化されたウィンドウAが復元されてフォーカスされることを確認
  - _Requirements: 8.2_

- [x] 10.3 (P) 各ウィンドウでのtRPC操作がウィンドウ別に正しく動作することのE2Eテスト
  - ウィンドウAでSpec一覧取得、ウィンドウBでSpec一覧取得し、各ウィンドウのプロジェクト固有のデータが返されることを確認
  - ウィンドウAのプロジェクトのSpec変更イベントがウィンドウBに影響しないことを確認
  - _Requirements: 8.3_

- [x] 10.4 (P) ウィンドウクローズ時のリソース解放のE2Eテスト
  - プロジェクトを開いたウィンドウを閉じた後、ファイルウォッチャーが停止していることを確認
  - 閉じたウィンドウのプロジェクトを別のウィンドウで再度開けることを確認（重複ロックが解放されている）
  - _Requirements: 8.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 新しいウィンドウ作成（Cmd+Shift+N） | 1.3, 5.1, 7.1 | Implementation, Feature |
| 1.2 | tRPCコンテキスト紐づけ | 1.2, 2.1 | Implementation |
| 1.3 | リクエスト元ウィンドウのコンテキスト実行 | 1.2, 2.1, 9.1 | Implementation, Integration Test |
| 1.4 | プロジェクトコンテキスト独立性 | 1.2, 2.1, 9.1 | Implementation, Integration Test |
| 1.5 | ウィンドウクローズ時リソース解放 | 1.1, 1.3, 6.2, 9.3 | Implementation, Integration Test |
| 1.6 | 最後のウィンドウクローズ時の動作 | 7.1 | Wiring |
| 2.1 | windowFactory廃止、WindowManager管理 | 7.3 | Cleanup |
| 2.2 | 起動フローでWindowManager使用 | 7.1 | Wiring |
| 2.3 | activate でWindowManager使用 | 7.2 | Wiring |
| 2.4 | second-instanceでWindowManager使用 | 7.2 | Wiring |
| 2.5 | ウィンドウタイトル表示 | 6.1 | Feature |
| 3.1 | ウィンドウ別コンテキストファクトリ | 2.1, 2.2, 2.3 | Implementation |
| 3.2 | getCurrentProjectPathのウィンドウ別化 | 1.2, 2.1, 9.1 | Implementation, Integration Test |
| 3.3 | getSpecManagerServiceのウィンドウ別化 | 1.1, 2.1, 2.3, 9.1 | Implementation, Integration Test |
| 3.4 | グローバル変数のウィンドウ別化 | 3.1 | Implementation |
| 3.5 | selectProjectのウィンドウ別化 | 6.1, 6.2, 9.3 | Implementation, Integration Test |
| 3.6 | ウィンドウクローズ時コンテキストクリーンアップ | 1.1, 6.4, 9.3 | Implementation, Integration Test |
| 4.1 | EventBusイベントにprojectPathメタデータ | 4.1, 6.3 | Implementation |
| 4.2 | Subscriptionフィルタリング | 4.3, 9.2 | Implementation, Integration Test |
| 4.3 | ウィンドウ別イベント配信 | 4.2, 4.3, 9.2 | Implementation, Integration Test |
| 4.4 | アプリ全体イベントのブロードキャスト | 4.2, 4.3, 9.2 | Implementation, Integration Test |
| 4.5 | ウィンドウクローズ時Subscription解除 | 1.3 | Implementation |
| 5.1 | 重複プロジェクトの既存ウィンドウフォーカス | 6.1, 9.3 | Feature, Integration Test |
| 5.2 | 最小化ウィンドウの復元フォーカス | 1.5 | Test（既存実装の検証） |
| 5.3 | パス正規化後の重複チェック | 1.4 | Implementation |
| 5.4 | CLI/second-instanceでの重複チェック | 7.2 | Wiring |
| 6.1 | フォーカスウィンドウのメニューコンテキスト更新 | 5.2 | Feature |
| 6.2 | 未選択ウィンドウのメニュー無効化 | 5.2 | Feature |
| 6.3 | 最近のプロジェクトのメニュー操作 | 5.1 | Feature |
| 6.4 | 新しいウィンドウメニュー | 5.1 | Feature |
| 7.1 | ウィンドウ状態永続化 | 8.1 | Implementation |
| 7.2 | ウィンドウ状態復元 | 8.2 | Implementation |
| 7.3 | 存在しないプロジェクトのスキップ | 8.2 | Implementation |
| 7.4 | 初回起動時デフォルトウィンドウ | 8.2 | Implementation |
| 7.5 | マルチディスプレイ対応 | 8.2 | Implementation |
| 8.1 | マルチウィンドウE2E | 10.1 | E2E Test |
| 8.2 | 重複オープンE2E | 10.2 | E2E Test |
| 8.3 | ウィンドウ別tRPC操作E2E | 10.3 | E2E Test |
| 8.4 | リソース解放E2E | 10.4 | E2E Test |
