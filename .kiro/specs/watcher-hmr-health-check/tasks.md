# Implementation Plan

## Task Overview

本ドキュメントは、Watcher HMR Health Check機能の実装タスクを定義する。HMR時のIPCリスナー喪失問題を解決し、watcher状態の可視性と信頼性を提供する。

---

## Tasks

- [ ] 1. Watcher状態型とIPCチャンネル定義
- [ ] 1.1 (P) 共有型定義を作成する
  - WatcherStatus, WatcherError型をtypes/に定義
  - WatcherStatusResult, WatcherStartedEvent, WatcherStoppedEvent, WatcherErrorEvent型を定義
  - readonly属性で不変性を保証
  - _Requirements: 1.5, 5.2_

- [ ] 1.2 (P) IPCチャンネルを定義する
  - GET_WATCHER_STATUS, WATCHER_STARTED, WATCHER_STOPPED, WATCHER_ERRORチャンネルをchannels.tsに追加
  - 型安全なチャンネル名定義
  - _Requirements: 1.4, 3.4_

- [ ] 2. WatcherService拡張
- [ ] 2.1 SpecsWatcherServiceにヘルスチェック機能を追加する
  - getStatus()メソッドでisWatching, watchedPath, lastEventTime, lastErrorを返却
  - onError()コールバックでchokidarエラーを通知
  - onStatusChange()コールバックで起動/停止イベントを通知
  - 状態変化をloggerで記録
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.3, 4.1, 4.2, 5.1_

- [ ] 2.2 BugsWatcherServiceにヘルスチェック機能を追加する
  - SpecsWatcherServiceと同様のgetStatus(), onError(), onStatusChange()を実装
  - 同一インターフェースで一貫性を保つ
  - 2.1の実装パターンに従う
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.3, 4.1, 4.2, 5.1_

- [ ] 3. IPCハンドラとpreload拡張
- [ ] 3.1 GET_WATCHER_STATUS IPCハンドラを実装する
  - handlers.tsにGET_WATCHER_STATUS invokeハンドラを追加
  - specs/bugs両方のwatcher状態をWatcherStatusResultとして返却
  - watcher未初期化時のデフォルト状態を定義
  - _Requirements: 1.1_

- [ ] 3.2 Watcherイベント転送機能を実装する
  - watcherのonError/onStatusChangeコールバックをIPCイベントとして転送
  - BrowserWindow.webContents.send()でレンダラーに通知
  - ウィンドウ破棄後のエラーハンドリング
  - _Requirements: 3.1, 3.3, 4.1, 4.2_

- [ ] 3.3 preloadにWatcher APIを公開する
  - getWatcherStatus()でinvoke呼び出しを提供
  - onWatcherStarted(), onWatcherStopped(), onWatcherError()イベントリスナーを提供
  - リスナー解除関数を返却するパターンで実装
  - _Requirements: 1.4, 3.4_

- [ ] 4. useWatcherHealthCheck Hook実装
- [ ] 4.1 ヘルスチェックHookのコア機能を実装する
  - 定期的にGET_WATCHER_STATUS IPCを呼び出して状態確認
  - isSpecsHealthy, isBugsHealthy状態を管理
  - lastCheckedAt, lastError状態を追跡
  - intervalオプションでチェック間隔を設定可能に（デフォルト5秒、最小100ms）
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

- [ ] 4.2 HMR対応とアクション機能を実装する
  - HMR発生後もインターバルを継続するためのクリーンアップ処理
  - checkNow()で即座にヘルスチェックを実行
  - pause()/resume()でヘルスチェックを一時停止/再開
  - HMR検出をログに記録（debugオプション時）
  - _Requirements: 2.2, 5.4_

- [ ] 4.3 デバッグモードを実装する
  - debugオプションでヘルスチェック結果をコンソールに出力
  - エラー発生時の詳細情報を含める
  - _Requirements: 5.3_

- [ ] 5. Store拡張とイベントリスナー統合
- [ ] 5.1 specStoreにWatcherイベントリスナーを追加する
  - setupWatcherEventListeners()でWATCHER_STARTED/STOPPEDイベントを購読
  - イベント受信時にisWatchingを更新
  - watcherError状態を追加してエラー情報を保持
  - リスナー解除関数を返却
  - _Requirements: 4.3, 4.4, 4.5_

- [ ] 5.2 bugStoreにWatcherイベントリスナーを追加する
  - specStoreと同様のパターンでイベントリスナーを実装
  - 5.1の実装パターンに従う
  - _Requirements: 4.3, 4.4, 4.5_

- [ ] 5.3 HMR後のリスナー再登録機構を実装する
  - import.meta.hot API（Vite HMR）を使用してHMRを検出（型定義: vite/client）
  - HMR発生時にIPCイベントリスナーを再登録
  - 古いリスナーをクリーンアップ
  - _Requirements: 4.6_

- [ ] 6. エラー通知と再起動オプション
- [ ] 6.1 Watcherエラー通知を実装する
  - WATCHER_ERRORイベント受信時にnotificationStoreで通知表示
  - エラーメッセージとwatcher種別を含める
  - _Requirements: 3.2_

- [ ] 6.2 再起動オプション付き通知を実装する
  - 通知にwatcher再起動アクションを含める
  - 再起動アクションクリック時にwatcherを再起動
  - _Requirements: 3.5_

- [ ] 7. 統合とテスト
- [ ] 7.1 全コンポーネントを統合する
  - useWatcherHealthCheckをApp.tsx内でマウント（useRefで二重実行防止、既存イベントリスナーパターンに準拠）
  - Store初期化時にsetupWatcherEventListeners()を呼び出し
  - 通知表示コンポーネントとの連携確認
  - _Requirements: 1.1, 2.1, 3.2, 4.3, 4.4_

- [ ] 7.2 ユニットテストを作成する
  - SpecsWatcherService.getStatus()の正常/停止/エラー状態テスト
  - BugsWatcherService.getStatus()の正常/停止/エラー状態テスト
  - onError/onStatusChangeコールバック呼び出しテスト（両Service）
  - useWatcherHealthCheckのインターバル/状態更新/HMR対応テスト
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

- [ ] 7.3 統合テストを作成する
  - GET_WATCHER_STATUS IPC経由での状態取得テスト（specs/bugs両方）
  - WATCHER_ERRORイベント伝播テスト（main -> preload -> renderer、specs/bugs両方）
  - specStore/bugStoreのイベント受信・isWatching更新テスト
  - BugsWatcherServiceのイベント伝播テスト
  - _Requirements: 1.1, 3.1, 3.3, 4.3, 4.4, 4.5_

---

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 2.1, 2.2, 3.1, 7.1, 7.3 |
| 1.2 | 2.1, 2.2, 7.2 |
| 1.3 | 2.1, 2.2, 7.2 |
| 1.4 | 1.2, 3.3 |
| 1.5 | 1.1 |
| 2.1 | 4.1, 7.1, 7.2, 7.3 |
| 2.2 | 4.2, 7.2 |
| 2.3 | 4.1, 7.2 |
| 2.4 | 4.1, 7.2 |
| 2.5 | 4.1 |
| 2.6 | 4.1 |
| 3.1 | 2.1, 2.2, 3.2, 7.3 |
| 3.2 | 6.1, 7.1 |
| 3.3 | 2.1, 2.2, 3.2, 7.3 |
| 3.4 | 1.2, 3.3 |
| 3.5 | 6.2 |
| 4.1 | 2.1, 2.2, 3.2 |
| 4.2 | 2.1, 2.2, 3.2 |
| 4.3 | 5.1, 5.2, 7.1, 7.3 |
| 4.4 | 5.1, 5.2, 7.1, 7.3 |
| 4.5 | 5.1, 5.2, 7.3 |
| 4.6 | 5.3 |
| 5.1 | 2.1, 2.2 |
| 5.2 | 1.1 |
| 5.3 | 4.3 |
| 5.4 | 4.2 |
