# Research & Design Decisions: マルチウィンドウ統合

## Summary

- **Feature**: `multi-window-integration`
- **Discovery Scope**: Complex Integration（既存アーキテクチャの大規模リファクタリング + 外部ライブラリ調査）
- **Key Findings**:
  - electron-trpc 0.7.1は`createContext({ event })`で`event.sender`（IpcMainEvent）にアクセス可能であり、`BrowserWindow.fromWebContents(event.sender)`でウィンドウ特定が可能
  - `createIPCHandler`は`attachWindow()`/`detachWindow()`メソッドを提供し、動的なウィンドウ追加・削除をサポート
  - 既存`WindowManager`クラスは基本機能が実装済みだが、tRPC Context DIとは未統合

## Research Log

### electron-trpc マルチウィンドウ対応の技術調査

- **Context**: Requirements Open Question 1: `createIPCHandler`のマルチウィンドウ対応、特にコンテキスト分離挙動
- **Sources Consulted**:
  - electron-trpc GitHubリポジトリ（https://github.com/jsonnull/electron-trpc）
  - electron-trpc 0.7.1 ソースコード（`node_modules/electron-trpc/src/main/`）
  - electron-trpc ドキュメント（https://electron-trpc.dev/getting-started/）
- **Findings**:
  - `createIPCHandler`は内部で`ipcMain.on(ELECTRON_TRPC_CHANNEL, ...)`を呼ぶため、**複数回呼び出すとリスナーが重複する**。アプリケーション全体で1回のみ呼び出す必要がある
  - `IPCHandler`クラスは`attachWindow(win)`と`detachWindow(win, webContentsId?)`メソッドを公開している
  - `detachWindow`は内部で`#cleanUpSubscriptions`を呼び、該当ウィンドウの全Subscriptionを`unsubscribe()`する
  - `webContents.on('destroyed')`で自動的に`detachWindow`が呼ばれる
  - `createContext`に渡される`opts`の型は`{ event: IpcMainInvokeEvent }`（実際のコードでは`IpcMainEvent`型のevent）
  - `event.sender`はWebContentsインスタンスであり、`BrowserWindow.fromWebContents(event.sender)`でBrowserWindowを取得可能
  - `event.sender.id`でwebContents IDを取得可能
- **Implications**:
  - IPCHandlerインスタンスをWindowManagerが保持し、新しいウィンドウ作成時に`attachWindow`を呼ぶアーキテクチャが最適
  - `createContext`内でウィンドウ特定→WindowManagerからper-window状態取得→ContextServicesに注入、のフローが実現可能
  - ウィンドウクローズ時のSubscriptionクリーンアップはelectron-trpc側で自動処理されるため、追加実装不要

### 既存WindowManager実装の分析

- **Context**: Requirements Decision Log: 既存WindowManagerコードを活用するか再設計するか（結論: 再設計）
- **Sources Consulted**: `src/main/services/windowManager.ts`、`src/main/services/windowManager.test.ts`
- **Findings**:
  - 既存WindowManagerは以下の機能を実装済み:
    - `windowStates: Map<number, WindowState>` -- ウィンドウ状態管理
    - `projectWindowMap: Map<string, number>` -- プロジェクト→ウィンドウIDのO(1)ルックアップ
    - `windowServices: Map<number, PerWindowServices>` -- ウィンドウ別サービスインスタンス
    - `createWindow()` -- BrowserWindow作成とイベントハンドラ設定
    - `setWindowProject()` -- 重複チェック付きプロジェクト紐づけ
    - `saveAllWindowStates()` / `restoreWindows()` -- 状態永続化・復元
    - `validateDisplayBounds()` -- マルチディスプレイ対応
  - 既存のPerWindowServicesは`SpecManagerService`, `SpecsWatcherService`, `AgentRecordWatcherService`, `BugsWatcherService`を含む
  - **欠落している機能**:
    - tRPC IPCHandlerとの統合（attachWindow/detachWindow）
    - webContents ID → windowIdのマッピング
    - MetricsService、AutoExecutionCoordinatorのper-window管理
    - projectState.tsグローバル変数との統合
- **Implications**:
  - 「再設計」ではなく、既存WindowManagerの**拡張**が適切。基本機能（Map管理、重複チェック、状態永続化）は十分に実装されている
  - 追加すべきは: (1) IPCHandler保持と連携、(2) webContentsToWindowIdマップ、(3) PerWindowServicesの拡充、(4) getWindowContext()メソッド

### グローバル状態の影響範囲分析

- **Context**: projectState.tsのグローバル変数をウィンドウ別に移行する影響範囲
- **Sources Consulted**: Grep検索で`getCurrentProjectPath`、`getSpecManagerService`等の参照箇所を調査
- **Findings**:
  - `getCurrentProjectPath`の参照箇所:
    - `productionServices.ts` -- 17箇所（クロージャ内での遅延評価）
    - `projectSetup.ts` -- 8箇所
    - `watcherUtils.ts` -- 3箇所（コールバック引数として渡される）
    - `handler.ts` -- 1箇所（tRPCコンテキスト注入）
    - `context.ts` -- 型定義のみ
  - `getSpecManagerService`の参照箇所:
    - `productionServices.ts` -- 1箇所
    - `projectSetup.ts` -- 5箇所（Auto-Execution内）
  - Auto-ExecutionコーディネータはtRPC外で動作し、`BrowserWindow.getAllWindows()[0]`でウィンドウを取得している
- **Implications**:
  - productionServices.ts内のクロージャは`getCurrentProjectPath()`を遅延評価するため、互換レイヤー（フォーカスウィンドウ委譲）で動作する
  - tRPCプロシージャ内のアクセスはContextFactory経由でウィンドウ別に解決される
  - Auto-Execution内の`BrowserWindow.getAllWindows()[0]`はWindowManager.getFocusedWindowId()に置換が必要

### EventBusイベントの分類

- **Context**: どのイベントがプロジェクトスコープで、どのイベントがアプリスコープか
- **Sources Consulted**: `src/main/trpc/services/eventBus.ts`（EVENT_NAMES定数）、`src/main/trpc/routers/events.ts`
- **Findings**:
  - 全36イベントの分類:
    - **プロジェクトスコープ（22イベント）**: Agent系6、Spec/Bug変更2、AutoExecution系5、BugAutoExecution系6、File系2、Metrics系1
    - **アプリスコープ（14イベント）**: Server/Tunnel系3、Schedule系1、MCP系1、SSH系1、Menu系8
  - 現在のイベントペイロードにprojectPathメタデータは含まれていない
  - emit側でprojectPathを付与する変更が必要な箇所:
    - `watcherUtils.ts` (SPECS_CHANGED, BUGS_CHANGED, AGENT_RECORD_CHANGED)
    - `projectSetup.ts` (Auto-Execution EventBus bridge全般)
    - `projectFileUtils.ts` (PROJECT_FILE_CHANGED)
    - `GitFileWatcherService` (GIT_CHANGES_DETECTED)
- **Implications**:
  - イベント発火側でprojectPathを追加する作業量は中程度（約10ファイル）
  - Subscription側のフィルタリングはevents.tsの各observable内で3-5行の追加
  - アプリスコープイベントはフィルタリング不要のため、変更なし

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| IPCHandler per Window | ウィンドウごとにcreateIPCHandler呼び出し | シンプルな分離 | ipcMain.onリスナー重複、メッセージ二重処理 | **却下** |
| Singleton IPCHandler + attachWindow | 1つのIPCHandlerに全ウィンドウを登録 | リスナー重複なし、electron-trpc推奨パターン | IPCHandlerインスタンスの管理が必要 | **採用** (DD-001) |
| Client-side windowId injection | Renderer側でwindowIdをリクエストヘッダに付与 | Main側変更最小 | Renderer/shared層の変更、Remote UIへの影響 | **却下** |
| Global state with focus tracking | グローバル状態を維持し、フォーカスウィンドウの追跡のみ | 実装コスト最小 | 非フォーカスウィンドウへのSubscription配信が不正確 | **却下** |

## Design Decisions

### Decision: IPCHandler管理方式

- **Context**: electron-trpcの`createIPCHandler`を複数ウィンドウで使用する方法
- **Alternatives Considered**:
  1. ウィンドウごとにcreateIPCHandler -- ipcMain.onの重複でメッセージ二重処理
  2. Singleton IPCHandler + attachWindow -- electron-trpcの設計意図に沿う
- **Selected Approach**: Singleton IPCHandler。WindowManagerがIPCHandlerインスタンスを保持し、createWindow時にattachWindow、handleWindowClose時にdetachWindow
- **Rationale (Why)**:
  - electron-trpcのソースコードで`ipcMain.on`がコンストラクタ内で1回呼ばれることを確認
  - `attachWindow`は`#attachSubscriptionCleanupHandlers`のみ実行し、IPC登録は重複しない
  - `detachWindow`はSubscriptionの自動クリーンアップを提供
- **Trade-offs**: IPCHandlerインスタンスの管理が必要だが、WindowManagerに自然に統合可能
- **Follow-up**: electron-trpcの将来バージョンで`createIPCHandler`の戻り値型が変わる可能性がある（現在はIPCHandlerクラスインスタンス）

### Decision: ウィンドウ特定方式

- **Context**: tRPCプロシージャ実行時のリクエスト元ウィンドウ特定
- **Alternatives Considered**:
  1. event.sender.idからBrowserWindow.fromWebContents -- Renderer側変更不要
  2. Client-side windowId injection -- 全リクエストにwindowId付与
  3. Session-based identification -- WebContentsセッションIDで特定
- **Selected Approach**: event.sender.idからBrowserWindow.fromWebContents
- **Rationale (Why)**:
  - electron-trpc 0.7.1のコード確認で`createContext({ event })`の`event`が`IpcMainEvent`型であり、`event.sender`にアクセス可能であることを確認
  - Renderer側のコード変更が不要（ipcLinkの変更なし）
  - `BrowserWindow.fromWebContents`はElectron APIの安定した機能
- **Trade-offs**: ウィンドウが破棄された後のevent処理でnullが返る可能性がある（デフォルトコンテキストにフォールバック）
- **Follow-up**: パフォーマンス測定: `BrowserWindow.fromWebContents`のコストが高い場合、`webContentsToWindowId`マップでキャッシュ

### Decision: グローバル状態の移行戦略

- **Context**: projectState.tsの6つのグローバル変数（currentProjectPath, specManagerService, autoExecutionCoordinator, metricsService, initialProjectPath, initialSelectResult）の移行方式
- **Alternatives Considered**:
  1. 全箇所をwindowId対応に即座に移行 -- 変更範囲70ファイル以上
  2. 互換レイヤーで段階的移行 -- tRPCコンテキスト内は新方式、それ以外はフォーカスウィンドウ委譲
  3. グローバル状態を維持 -- マルチウィンドウの目的が達成できない
- **Selected Approach**: 互換レイヤーで段階的移行
- **Rationale (Why)**:
  - tRPCプロシージャ内のアクセスはContextFactoryが自動的にウィンドウ別に解決
  - productionServices.ts内のクロージャは遅延評価のため、互換レイヤー（フォーカスウィンドウ）で正しく動作
  - Auto-ExecutionやRemote Access等のtRPC外コンポーネントは、1つずつWindowManager対応に移行可能
- **Trade-offs**: 移行期間中、tRPC外からのグローバル関数呼び出しはフォーカスウィンドウの状態を返す（非フォーカスウィンドウのAuto-Executionは正しく動作しない可能性）
- **Follow-up**: 移行完了後にprojectState.tsの互換レイヤーを削除し、全箇所をWindowManager直接参照に統一

### Decision: EventBusフィルタリングの実装位置

- **Context**: イベントのウィンドウ別フィルタリングをEventBus側で行うかSubscription側で行うか
- **Alternatives Considered**:
  1. EventBus側でウィンドウ別チャネルに分割 -- EventBusがウィンドウ概念を知る必要あり
  2. Subscription（events router）側でフィルタ -- EventBusはシンプルなブロードキャスト維持
  3. Middleware層でフィルタ -- tRPCミドルウェアはSubscriptionに対応していない
- **Selected Approach**: Subscription側でフィルタ
- **Rationale (Why)**:
  - 関心の分離: EventBusはイベント配信、フィルタリングはSubscription利用者の責務
  - テスト容易性: Subscriptionのフィルタロジックを単独でテスト可能
  - Remote UIのWebSocketハンドラも同様のフィルタが必要だが、別レイヤーで独立実装可能
- **Trade-offs**: 全Subscription（約20個）にフィルタロジックを追加する必要がある。共通化ヘルパー関数で軽減
- **Follow-up**: フィルタロジックの共通化ヘルパー（`createFilteredSubscription`）を検討

## Risks & Mitigations

- **Risk 1: Auto-Executionのマルチウィンドウ対応** -- Auto-Executionは`BrowserWindow.getAllWindows()[0]`を使用しており、複数ウィンドウ時に正しいウィンドウでAgentを起動できない可能性がある
  - **Mitigation**: Auto-Executionコーディネータにウィンドウ別のスコープを導入。PerWindowServicesにAutoExecutionCoordinatorを含め、各ウィンドウのプロジェクトに紐づくAuto-Executionのみを管理
- **Risk 2: Remote UIとの整合性** -- Remote UIはWebSocket経由で単一プロジェクトセッション前提で動作している
  - **Mitigation**: 本specのスコープ外（Non-Goals）。設計上、WebSocketハンドラにprojectPathフィルタを追加可能なアーキテクチャにしておく
- **Risk 3: メモリ消費** -- 10ウィンドウ同時オープン時、各ウィンドウがSpecManagerService等のサービスインスタンスを保持
  - **Mitigation**: 実用上3-5ウィンドウ程度を想定。各サービスのメモリフットプリントは小さい（Watcherのchokidarインスタンスが最大だが、プロジェクトディレクトリごとに必要なためウィンドウ別は妥当）
- **Risk 4: 既存テストとの互換性** -- WindowManagerの26件のユニットテストが既存実装前提
  - **Mitigation**: 拡張は追加メソッドのみのため、既存テストは変更なしでパスするはず。新メソッド用のテストを追加

## References

- [electron-trpc GitHub](https://github.com/jsonnull/electron-trpc) -- createIPCHandler、attachWindow/detachWindow API
- [electron-trpc Documentation](https://electron-trpc.dev/getting-started/) -- 基本的な使用法
- [Electron BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window) -- fromWebContents、ウィンドウ管理
- [electron-trpc source: createIPCHandler.ts](node_modules/electron-trpc/src/main/createIPCHandler.ts) -- IPCHandler内部実装の詳細（v0.7.1）
- [electron-trpc source: handleIPCMessage.ts](node_modules/electron-trpc/src/main/handleIPCMessage.ts) -- createContextへのevent渡しの確認
- [electron-trpc source: types.ts](node_modules/electron-trpc/src/main/types.ts) -- CreateContextOptions型定義
