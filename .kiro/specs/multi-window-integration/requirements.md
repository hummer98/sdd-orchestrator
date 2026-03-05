# Requirements: マルチウィンドウ統合

## Decision Log

### Spec方針
- **Discussion**: 既存 `multi-window-support` spec（implementation-complete）の統合作業として進めるか、新規specとして再設計するか
- **Conclusion**: 新規specとして再設計する
- **Rationale**: 既存specの実装時からtRPC完全移行が完了し、アーキテクチャが大幅に変化している。現在のコードベース（tRPC Context DI、EventBus、productionServices.ts）に最適化した設計が必要

### スコープ
- **Discussion**: 6つの統合ポイント（WindowManager統合、プロジェクト状態分離、tRPCコンテキスト分離、EventBusフィルタ、メニュー追従、E2Eテスト）のどこまで対応するか
- **Conclusion**: フル対応（全6ポイント）
- **Rationale**: 部分的な統合では「新しいウィンドウ」メニューの使用時にプロジェクト状態の不整合が発生し、ユーザーに被害が及ぶ。一貫した動作を保証するため全ポイントを対応する

### Remote UI対応
- **Discussion**: Remote UI（Web版）のマルチウィンドウ対応を含めるか
- **Conclusion**: 実装対象外、設計上の拡張性のみ考慮
- **Rationale**: Remote UIは単一セッション前提で動作しており、現状で問題はない。ただし設計上、将来Remote UIが複数プロジェクトセッションに対応できるアーキテクチャにする

### 既存WindowManagerコード
- **Discussion**: 既存の `windowManager.ts`（ユニットテスト26件全パス）を活用するか再設計するか
- **Conclusion**: 拡張する（研究フェーズで再評価後に決定）
- **Rationale**: 研究フェーズで既存WindowManagerを分析した結果、基本機能（Map管理、重複チェック、状態永続化、マルチディスプレイ対応）が十分に実装されており、「再設計」ではなく「拡張」が適切と判断。追加すべきはIPCHandler保持・連携、webContentsToWindowIdマップ、PerWindowServicesの拡充（MetricsService、AutoExecutionCoordinator）、getWindowContext()メソッドの4点

### tRPCコンテキスト分離方式
- **Discussion**: ウィンドウ別コンテキストの分離方式として、(A) `createIPCHandler`のwindows配列に複数ウィンドウ登録、(B) ウィンドウごとにIPCHandler生成、のどちらか
- **Conclusion**: 設計フェーズで`electron-trpc`の挙動を調査して決定
- **Rationale**: electron-trpcの内部実装（`event.sender`からのウィンドウ特定能力）に依存する技術的判断のため

## Introduction

SDD Orchestratorのマルチウィンドウ機能を、現在のtRPCベースアーキテクチャに統合する。既存の`windowFactory.ts`（単一ウィンドウ）を廃止し、複数のBrowserWindowが独立したプロジェクトコンテキストで動作するアーキテクチャに移行する。各ウィンドウは独立したプロジェクト状態を持ち、tRPCプロシージャはリクエスト元ウィンドウのコンテキストで実行される。

## Requirements

### Requirement 1: ウィンドウごとのプロジェクト分離

**Objective:** ユーザーとして、複数のウィンドウで異なるプロジェクトを同時に開いて独立して操作したい。それにより、プロジェクト切り替えなしで並行作業できる。

#### Acceptance Criteria

1. When ユーザーが「新しいウィンドウ」（`Cmd+Shift+N`）を実行した場合, the system shall 新しいBrowserWindowを作成しプロジェクト選択画面を表示する
2. When ウィンドウでプロジェクトが選択された場合, the system shall そのウィンドウのtRPCコンテキストを選択されたプロジェクトに紐づける
3. The system shall 各ウィンドウのtRPCプロシージャ（`getCurrentProjectPath`、`getSpecManagerService`等）をリクエスト元ウィンドウのプロジェクトコンテキストで実行する
4. While ウィンドウAでプロジェクトAが開かれている状態で, when ウィンドウBでプロジェクトBを選択した場合, the system shall ウィンドウAのプロジェクトコンテキストに影響を与えない
5. When ウィンドウが閉じられた場合, the system shall そのウィンドウに紐づくファイルウォッチャー（SpecsWatcher、BugsWatcher、AgentRecordWatcher）を停止しリソースを解放する
6. While 複数のウィンドウが開いている状態で, when 最後のウィンドウが閉じられた場合, the system shall macOSではメニューバーのみ残しアプリを継続、他OSではアプリを終了する

### Requirement 2: windowFactory廃止とWindowManager統合

**Objective:** 開発者として、単一ウィンドウ前提の`windowFactory.ts`を廃止し、複数ウィンドウを一元管理するWindowManagerを導入したい。それにより、ウィンドウ管理のSSOTが確立される。

#### Acceptance Criteria

1. The system shall `windowFactory.ts`のグローバル`mainWindow`変数を廃止し、WindowManagerが全ウィンドウをMap構造で管理する
2. The system shall `index.ts`のアプリ起動フロー（`app.whenReady`）でWindowManager経由でウィンドウを作成する
3. When `app.on('activate')`が発火した場合, the system shall WindowManagerにウィンドウ存在確認を委譲し、必要に応じて新規ウィンドウを作成する
4. When `app.on('second-instance')`が発火した場合, the system shall WindowManager経由で適切なウィンドウをフォーカスし、`--project`引数があれば該当プロジェクトのウィンドウを特定・フォーカスする
5. The system shall 各ウィンドウのタイトルに「SDD Orchestrator - {プロジェクト名}」を表示する（未選択時は「SDD Orchestrator」のみ）

### Requirement 3: tRPCコンテキストのウィンドウ別化

**Objective:** ユーザーとして、どのウィンドウからtRPC操作（Spec一覧取得、Agent起動等）を実行しても、そのウィンドウのプロジェクトに対して正しく操作が実行されてほしい。それにより、意図しないプロジェクトへの操作を防止できる。

#### Acceptance Criteria

1. The system shall `setupTRPCHandler`でウィンドウごとに独立したコンテキストファクトリを登録する
2. The system shall tRPCコンテキスト内の`getCurrentProjectPath()`がリクエスト元ウィンドウのプロジェクトパスを返すようにする
3. The system shall tRPCコンテキスト内の`getSpecManagerService()`がリクエスト元ウィンドウのSpecManagerServiceインスタンスを返すようにする
4. The system shall `projectState.ts`のグローバル変数（`let currentProjectPath`）をウィンドウ別ストレージに置換する
5. The system shall `selectProject()`呼び出し時、該当ウィンドウのサービスインスタンスのみを初期化・更新する（他ウィンドウに影響しない）
6. If ウィンドウが閉じられた場合, then the system shall そのウィンドウのコンテキスト・サービスインスタンスをクリーンアップする

### Requirement 4: EventBusのウィンドウ別ルーティング

**Objective:** ユーザーとして、あるプロジェクトのSpec変更やAgent出力が、そのプロジェクトを開いているウィンドウにのみ通知されてほしい。それにより、無関係なウィンドウへの通知による混乱を防止できる。

#### Acceptance Criteria

1. The system shall EventBusイベント発火時にプロジェクトパス（またはウィンドウID）をメタデータとして含める
2. The system shall tRPC Subscriptionが受信したイベントを、リスナーのウィンドウコンテキストに基づいてフィルタリングする
3. While ウィンドウAがプロジェクトAを開いている状態で, when プロジェクトBのSpec変更イベントが発火された場合, the system shall ウィンドウAにそのイベントを配信しない
4. The system shall アプリケーション全体に影響するイベント（設定変更、Remote UIステータス等）はすべてのウィンドウにブロードキャストする
5. When ウィンドウが閉じられた場合, the system shall そのウィンドウのSubscriptionリスナーを自動的に解除する

### Requirement 5: 重複オープン防止

**Objective:** ユーザーとして、同じプロジェクトを誤って複数のウィンドウで開くことを防止したい。それにより、データの不整合や混乱を避けられる。

#### Acceptance Criteria

1. When ユーザーが既に別のウィンドウで開かれているプロジェクトを選択した場合, the system shall 新しいウィンドウを開かず、既存のウィンドウをフォーカスする
2. When 既存のウィンドウが最小化されている状態で重複オープンが試みられた場合, the system shall そのウィンドウを復元してからフォーカスする
3. The system shall プロジェクトパスの正規化（末尾スラッシュ除去、シンボリックリンク解決）を行った上で重複チェックを実行する
4. When コマンドライン引数（`--project`）またはsecond-instanceイベントで既に開いているプロジェクトが指定された場合, the system shall 既存のウィンドウをフォーカスする

### Requirement 6: メニューのフォーカスウィンドウ追従

**Objective:** ユーザーとして、メニューバーの操作がフォーカス中のウィンドウのプロジェクトに対して実行されてほしい。それにより、意図しないプロジェクトへの操作を防止できる。

#### Acceptance Criteria

1. When ウィンドウがフォーカスを受け取った場合, the system shall メニューバーのコンテキストをそのウィンドウのプロジェクトに更新する
2. While プロジェクトが開かれていないウィンドウがフォーカスされている状態で, the system shall プロジェクト固有のメニュー項目を無効化する
3. When メニューから「最近使ったプロジェクト」を選択した場合, the system shall フォーカス中のウィンドウでそのプロジェクトを開く（未選択ウィンドウがある場合）、または新しいウィンドウを作成する
4. The system shall 「新しいウィンドウ」メニューをWindowManager経由で実行する

### Requirement 7: ウィンドウ状態の永続化と復元

**Objective:** ユーザーとして、アプリ再起動時に前回のウィンドウ配置と開いていたプロジェクトが復元されてほしい。それにより、作業環境を毎回再構築する手間を省ける。

#### Acceptance Criteria

1. When アプリケーションが終了する場合, the system shall 全ウィンドウの状態（位置、サイズ、開いているプロジェクトパス、最大化/最小化状態）をConfigStoreに永続化する
2. When アプリケーションが起動した場合, the system shall 前回終了時のウィンドウ状態を復元する
3. If 復元対象のプロジェクトディレクトリが存在しない場合, the system shall そのウィンドウをスキップし、ログに記録する
4. While 初回起動または保存された状態が存在しない場合, the system shall デフォルトのウィンドウサイズと位置で1つのウィンドウを開く
5. When マルチディスプレイ環境で前回のディスプレイが存在しない場合, the system shall プライマリディスプレイにウィンドウを配置する

### Requirement 8: E2Eテストによるマルチウィンドウ検証

**Objective:** 開発者として、マルチウィンドウ機能がE2Eテストで検証されている状態を維持したい。それにより、回帰バグを防止できる。

#### Acceptance Criteria

1. The system shall 複数ウィンドウの同時作成と独立したプロジェクト操作のE2Eテストを提供する
2. The system shall 重複プロジェクトオープン試行時の既存ウィンドウフォーカス動作のE2Eテストを提供する
3. The system shall 各ウィンドウでのtRPC操作（Spec一覧取得等）がウィンドウ別に正しく動作することのE2Eテストを提供する
4. The system shall ウィンドウクローズ時のリソース解放（ウォッチャー停止）のE2Eテストを提供する

## Out of Scope

- **Remote UIのマルチセッション対応**: Remote UIは現状の単一プロジェクトモードを維持する（将来specで対応）
- **ウィンドウ間のデータ共有・同期**: 各ウィンドウは完全に独立したプロジェクトコンテキスト
- **タブ型マルチプロジェクト**: 単一ウィンドウ内での複数プロジェクト切り替え
- **ウィンドウのドッキング・スナップ**: OS標準機能に委譲
- **既存 `multi-window-support` specの更新**: 旧specは参照のみ、本specが正式な要件定義

## Open Questions

1. **electron-trpcの`createIPCHandler`のマルチウィンドウ対応**: `windows`配列に複数ウィンドウを登録した場合のコンテキスト分離挙動（設計フェーズで調査）
   - **解決済み**: electron-trpc 0.7.1のソースコード調査により、Singleton IPCHandler + `attachWindow()`/`detachWindow()`パターンを採用（DD-001参照）
2. **パフォーマンス影響**: 10ウィンドウ同時オープン時のメモリ消費とEventBusフィルタリングオーバーヘッド（設計フェーズで検討）
   - **解決済み**: 研究フェーズのリスク分析により、実用上3-5ウィンドウ程度を想定。各サービスのメモリフットプリントは小さく（Watcherのchokidarインスタンスが最大）、プロジェクトディレクトリごとに必要なためウィンドウ別管理は妥当。パフォーマンス問題が発生した場合は実装後に対応
3. **旧WindowManager/ConfigStore拡張コードの扱い**: 再設計後のコードとの共存・削除判断（実装フェーズで決定）
   - **解決済み**: 研究フェーズで既存WindowManagerの拡張アプローチを採用。既存コードは削除せず、tRPC Context DIとの統合機能を追加拡張する（Decision Log「既存WindowManagerコード」参照）
