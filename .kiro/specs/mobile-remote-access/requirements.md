# Requirements Document

## Introduction
本仕様書は、SDD Manager（Electron版）にHTTP/WebSocketサーバー機能を組み込み、スマートフォンブラウザからリモートでSDD Orchestratorの進捗確認とワークフロー操作を可能にする機能の要件を定義する。

LAN内運用を前提とし、認証不要でシンプルな操作性を重視する。モバイルUIは静的HTML + Tailwind CDN + Vanilla JSで実装し、ビルドプロセス不要とする。

## Requirements

### Requirement 1: サーバー起動・停止制御
**Objective:** ユーザーとして、Electronアプリ内からHTTP/WebSocketサーバーの起動・停止を制御したい。外出先からのアクセスを必要な時だけ有効化できるようにするため。

#### Acceptance Criteria
1. When ユーザーがサーバー有効化チェックボックスをONにした時, the Remote Access Server shall デフォルトポート8765でHTTP/WebSocketサーバーを起動する
2. When ユーザーがサーバー有効化チェックボックスをOFFにした時, the Remote Access Server shall サーバーを停止し全てのWebSocket接続を切断する
3. If デフォルトポート8765が使用中の場合, the Remote Access Server shall 次に利用可能なポート（8766, 8767...）を自動的に選択して起動する
4. When サーバーが正常に起動した時, the Remote Access Server shall 接続用URL（http://[IPアドレス]:[ポート]）を表示する
5. When サーバーが正常に起動した時, the Remote Access Server shall 接続用URLをエンコードしたQRコードを表示する
6. The Remote Access Server shall サーバーの起動状態（起動中/停止中）を視覚的に表示する

### Requirement 2: 複数Electronインスタンス対応
**Objective:** 開発者として、複数のElectronアプリを同時起動した状態でもサーバー機能を利用したい。複数プロジェクトを並行して作業できるようにするため。

#### Acceptance Criteria
1. When 複数のElectronアプリが同時にサーバーを有効化した時, the Remote Access Server shall 各インスタンスに異なるポートを割り当てて起動する
2. The Remote Access Server shall 各インスタンスが使用中のポート番号を明示的に表示する
3. If ポート8765から8775までの全てが使用中の場合, the Remote Access Server shall エラーメッセージを表示しサーバー起動を中止する

### Requirement 3: プロジェクト・Spec状態の取得
**Objective:** ユーザーとして、スマートフォンから現在のプロジェクトとSpec一覧の状態を確認したい。デスクから離れていても進捗を把握できるようにするため。

#### Acceptance Criteria
1. When モバイルクライアントが接続した時, the Remote Access Server shall 現在選択中のプロジェクトパスを返す
2. When モバイルクライアントがSpec一覧を要求した時, the Remote Access Server shall 全Specの名前・フェーズ・承認状態を含むリストを返す
3. When ElectronアプリでプロジェクトまたはSpec状態が変更された時, the Remote Access Server shall WebSocket経由で接続中の全クライアントに変更を通知する

### Requirement 4: リアルタイムログ表示
**Objective:** ユーザーとして、AIエージェントの実行ログをリアルタイムでスマートフォンから確認したい。ワークフロー実行中の詳細な進捗を把握するため。

#### Acceptance Criteria
1. When AIエージェントがログを出力した時, the Remote Access Server shall WebSocket経由で接続中の全クライアントにログメッセージを配信する
2. When モバイルクライアントが新規接続した時, the Remote Access Server shall 直近のログ履歴（最大100件）を送信する
3. The Mobile UI shall ログメッセージをリアルタイムで自動スクロール表示する
4. When ユーザーがログエリアを手動スクロールした時, the Mobile UI shall 自動スクロールを一時停止する
5. The Mobile UI shall ログの種類（info/warning/error/agent出力）を視覚的に区別して表示する

### Requirement 5: ワークフロー操作
**Objective:** ユーザーとして、スマートフォンからSDDワークフローの全操作を実行したい。デスクから離れていてもワークフローを制御できるようにするため。

#### Acceptance Criteria
1. When ユーザーがRequirements生成ボタンをタップした時, the Remote Access Server shall 選択中のSpecに対してRequirementsフェーズを開始する
2. When ユーザーがDesign生成ボタンをタップした時, the Remote Access Server shall 選択中のSpecに対してDesignフェーズを開始する
3. When ユーザーがTasks生成ボタンをタップした時, the Remote Access Server shall 選択中のSpecに対してTasksフェーズを開始する
4. When ユーザーがImplementation開始ボタンをタップした時, the Remote Access Server shall 選択中のSpecに対してImplementationフェーズを開始する
5. When ユーザーが停止ボタンをタップした時, the Remote Access Server shall 実行中のワークフローを停止する
6. When ユーザーが再開ボタンをタップした時, the Remote Access Server shall 停止中のワークフローを再開する
7. While ワークフローが実行中の間, the Mobile UI shall 実行中であることを示すインジケーターを表示する
8. If ワークフロー操作が失敗した場合, the Remote Access Server shall エラーメッセージをクライアントに返す

### Requirement 6: Spec選択
**Objective:** ユーザーとして、スマートフォンから操作対象のSpecを選択したい。複数のSpecがある場合に適切なものを選んで操作できるようにするため。

#### Acceptance Criteria
1. The Mobile UI shall プロジェクト内の全Specをリスト形式で表示する
2. When ユーザーがSpecをタップした時, the Mobile UI shall そのSpecを選択状態にしワークフロー操作パネルを表示する
3. The Mobile UI shall 各Specの現在のフェーズと承認状態をバッジで表示する
4. When Specの状態が変更された時, the Mobile UI shall リストの表示をリアルタイムで更新する

### Requirement 7: モバイルUI実装
**Objective:** ユーザーとして、スマートフォンで快適に操作できるUIを利用したい。タッチ操作に最適化された使いやすいインターフェースで作業効率を上げるため。

#### Acceptance Criteria
1. The Mobile UI shall 静的HTML + Tailwind CDN + Vanilla JSで実装する（ビルドプロセス不要）
2. The Mobile UI shall レスポンシブデザインでスマートフォン画面サイズに最適化する
3. The Mobile UI shall タッチ操作に適したボタンサイズ（最小44x44px）を使用する
4. The Mobile UI shall ダークモードとライトモードの両方をサポートする
5. The Mobile UI shall システムのカラースキーム設定に従って自動的にテーマを切り替える
6. The Mobile UI shall 操作結果のフィードバック（成功/失敗）をトースト通知で表示する

### Requirement 8: 接続管理
**Objective:** ユーザーとして、モバイルからの接続状態を把握したい。通信状況を確認し問題発生時に対処できるようにするため。

#### Acceptance Criteria
1. When WebSocket接続が切断された時, the Mobile UI shall 「接続が切断されました」メッセージを表示する
2. When WebSocket接続が切断された時, the Mobile UI shall 自動再接続を試みる（最大5回、指数バックオフ）
3. While 再接続を試行中の間, the Mobile UI shall 「再接続中...」インジケーターを表示する
4. If 再接続が全て失敗した場合, the Mobile UI shall 手動再接続ボタンを表示する
5. The Remote Access Server shall 現在接続中のクライアント数をElectronアプリ側に表示する

### Requirement 9: セキュリティ考慮
**Objective:** 開発者として、LAN内運用において最低限のセキュリティを確保したい。意図しないアクセスを防止するため。

#### Acceptance Criteria
1. The Remote Access Server shall ローカルネットワーク（プライベートIPアドレス範囲）からの接続のみを受け付ける
2. The Remote Access Server shall 全てのAPI通信にCORS設定を適用する
3. The Remote Access Server shall リクエストレート制限（1クライアントあたり100リクエスト/分）を適用する
4. If レート制限を超過した場合, the Remote Access Server shall 429 Too Many Requestsを返す
