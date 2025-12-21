# Requirements Document

## Introduction

本ドキュメントは、HMR（Hot Module Replacement）時にファイル監視が停止してもフロントエンドから検出できない問題を解決するための要件を定義する。現在の問題として、HMR時のIPCリスナー喪失によりファイル変更イベントが届かなくなること、レンダラーからwatcherの実際の状態を確認するAPIがないこと、watcherエラー時にisWatching stateが更新されないことがある。

本機能では、Watcher状態確認API（GET_WATCHER_STATUS）の追加、HMR対応のuseWatcherHealthCheck hookの作成、エラー時のプッシュ通知機能の追加を実装する。

## Requirements

### Requirement 1: Watcher状態確認API

**Objective:** 開発者として、レンダラープロセスからwatcherの実際の状態を確認したい。これにより、HMR後もwatcherが正常に動作しているかを検証できる。

#### Acceptance Criteria

1. When レンダラープロセスがGET_WATCHER_STATUS IPCを呼び出す, the Watcher Service shall 現在のwatcher状態（isWatching, watchedPath, lastEventTime）を返却する
2. When watcherがアクティブな状態でGET_WATCHER_STATUS IPCを呼び出す, the Watcher Service shall isWatchingをtrueとして返却する
3. When watcherが停止している状態でGET_WATCHER_STATUS IPCを呼び出す, the Watcher Service shall isWatchingをfalseとして返却する
4. The Watcher Service shall GET_WATCHER_STATUS IPCをchannels.tsに型安全に定義する
5. The Watcher Service shall GET_WATCHER_STATUSのレスポンス型をtypes/に定義する

### Requirement 2: HMR対応ヘルスチェックHook

**Objective:** 開発者として、HMR発生後も自動的にwatcherの状態を監視したい。これにより、IPCリスナー喪失を検出し、ユーザーに通知できる。

#### Acceptance Criteria

1. When useWatcherHealthCheck hookがマウントされる, the Hook shall 定期的にGET_WATCHER_STATUS IPCを呼び出してwatcher状態を確認する
2. When HMRが発生する, the Hook shall HMR後も継続してヘルスチェックを実行する
3. When ヘルスチェックでwatcherが停止していることを検出する, the Hook shall isHealthyをfalseに設定する
4. When ヘルスチェックでwatcherが正常に動作していることを確認する, the Hook shall isHealthyをtrueに設定する
5. The useWatcherHealthCheck Hook shall ヘルスチェック間隔を設定可能なオプションとして提供する（デフォルト: 5秒、最小: 100ms）
6. While useWatcherHealthCheck hookがアクティブ, the Hook shall 最後のヘルスチェック時刻を追跡する

### Requirement 3: Watcherエラー時のプッシュ通知

**Objective:** ユーザーとして、watcherでエラーが発生した際にプッシュ通知を受け取りたい。これにより、ファイル監視の問題を即座に認識できる。

#### Acceptance Criteria

1. When watcherでエラーが発生する, the Watcher Service shall WATCHER_ERROR IPCイベントをレンダラープロセスに送信する
2. When レンダラープロセスがWATCHER_ERRORイベントを受信する, the Notification Service shall エラーメッセージを含む通知を表示する
3. When watcherが予期せず停止する, the Watcher Service shall WATCHER_STOPPED IPCイベントをレンダラープロセスに送信する
4. The Watcher Service shall WATCHER_ERRORおよびWATCHER_STOPPED IPCチャンネルをchannels.tsに型安全に定義する
5. The Notification Service shall エラー通知にwatcherの再起動オプションを含める

### Requirement 4: isWatching状態の自動同期

**Objective:** 開発者として、watcherの状態変化がフロントエンドのisWatching stateに自動的に反映されることを望む。これにより、UIが常に正確な状態を表示できる。

#### Acceptance Criteria

1. When watcherが起動する, the Watcher Service shall WATCHER_STARTED IPCイベントをレンダラープロセスに送信する
2. When watcherが停止する, the Watcher Service shall WATCHER_STOPPED IPCイベントをレンダラープロセスに送信する
3. When レンダラープロセスがWATCHER_STARTEDイベントを受信する, the projectStore shall isWatchingをtrueに更新する
4. When レンダラープロセスがWATCHER_STOPPEDイベントを受信する, the projectStore shall isWatchingをfalseに更新する
5. When watcherでエラーが発生してwatcherが停止する, the projectStore shall isWatchingをfalseに更新する
6. The projectStore shall HMR後もIPCイベントリスナーを再登録するメカニズムを持つ

### Requirement 5: デバッグ・診断機能

**Objective:** 開発者として、watcher状態の問題を診断するためのデバッグ情報にアクセスしたい。これにより、トラブルシューティングを効率的に行える。

#### Acceptance Criteria

1. The Watcher Service shall watcherの状態変化履歴をログに記録する
2. When GET_WATCHER_STATUS IPCを呼び出す, the Watcher Service shall 最後のエラー情報（存在する場合）を含める
3. The useWatcherHealthCheck Hook shall デバッグモードでヘルスチェック結果をコンソールに出力するオプションを提供する
4. When HMRが発生する, the Hook shall HMR検出をログに記録する
