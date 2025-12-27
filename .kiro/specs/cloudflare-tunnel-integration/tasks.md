# Implementation Plan

## Task 1: Cloudflare設定永続化サービスの実装

- [x] 1.1 (P) CloudflareConfigStoreサービスを作成
  - electron-storeを使用してCloudflare関連設定を永続化するサービスを実装
  - Tunnel Token、アクセストークン、公開設定、cloudflaredパスの保存・取得機能
  - Tunnel Token取得時は環境変数`CLOUDFLARE_TUNNEL_TOKEN`を優先
  - トークンをログ出力時にマスクする仕組みを実装
  - 設定リセット機能（Tunnel Token以外）を実装
  - _Requirements: 2.2, 2.3, 2.5, 3.2, 4.5, 5.1, 5.3, 5.4_

- [x] 1.2 (P) CloudflareConfigStore用のIPCハンドラを追加
  - 設定取得・保存用のIPCチャンネルを定義
  - `cloudflare:get-tunnel-token`, `cloudflare:set-tunnel-token`
  - `cloudflare:get-settings`, `cloudflare:set-settings`
  - preloadスクリプトにAPIを公開
  - _Requirements: 2.1, 2.2, 2.3, 5.1_

## Task 2: アクセストークンサービスの実装

- [x] 2.1 (P) AccessTokenServiceを作成
  - crypto.randomBytesを使用して10文字の英数字トークンを生成
  - トークンのtiming-safe比較による検証機能
  - トークンリフレッシュ機能（新トークン生成、旧トークン無効化）
  - CloudflareConfigStoreと連携してトークンを永続化
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.2 トークン操作用のIPCハンドラを追加
  - `cloudflare:refresh-access-token`チャンネルを実装
  - 初回起動時のトークン自動生成ロジック
  - _Requirements: 3.1, 3.3_

## Task 3: cloudflaredバイナリ検出サービスの実装

- [x] 3.1 (P) CloudflaredBinaryCheckerサービスを作成
  - カスタムパス、`which cloudflared`、共通パス（`/usr/local/bin`, `/opt/homebrew/bin`）の順に検索
  - バイナリの実行可能性確認
  - プラットフォーム別のインストール手順情報を提供
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.2 バイナリ確認用のIPCハンドラを追加
  - `cloudflare:check-binary`チャンネルを実装
  - インストール手順情報（Homebrew、MacPorts、ダウンロードURL）を返却
  - _Requirements: 4.1, 4.2, 4.3_

## Task 4: Cloudflare Tunnel管理サービスの実装

- [x] 4.1 CloudflareTunnelManagerサービスを作成
  - cloudflaredプロセスのspawn管理（起動・停止）
  - stdoutからTunnel URLをパースする正規表現処理
  - プロセス状態の監視とイベント通知
  - 単一プロセス制約の強制（複数Tunnel防止）
  - Task 1.1, 3.1 への依存あり
  - _Requirements: 1.1, 1.4, 1.5, 4.4_

- [x] 4.2 Tunnelエラーハンドリングの実装
  - バイナリ不在、トークン不正、接続失敗、プロセスクラッシュの各エラー処理
  - プロセスクラッシュ時の自動再接続試行（最大3回）
  - エラー状態のステータス通知
  - _Requirements: 1.4_

## Task 5: WebSocketハンドラへのトークン認証追加

- [x] 5.1 WebSocketHandlerにトークン認証機能を追加
  - 接続リクエストからクエリパラメータでトークンを抽出
  - AccessTokenServiceを使用したトークン検証
  - トークン不一致時は4001 Unauthorizedで接続拒否
  - Tunnel経由・LAN内両方の接続でトークン認証を適用
  - Task 2.1 への依存あり
  - _Requirements: 3.4, 3.5, 7.3, 7.4_

## Task 6: RemoteAccessServerへのTunnel統合

- [x] 6.1 RemoteAccessServerにCloudflare Tunnel機能を統合
  - サーバー起動時にCloudflare公開オプションを処理
  - CloudflareTunnelManagerと連携してTunnel接続を管理
  - LAN内サーバーとTunnel経由アクセスの同時動作
  - サーバー停止時のTunnel自動終了
  - Task 4.1 への依存あり
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 7.1, 7.2_

- [x] 6.2 ServerStartResultを拡張
  - tunnelUrl、tunnelQrCodeDataUrl、accessTokenを追加
  - QRコード生成時にURL+トークンをクエリパラメータ形式で埋め込み
  - _Requirements: 1.3, 6.5_

## Task 7: Renderer側の状態管理拡張

- [x] 7.1 remoteAccessStoreにCloudflare Tunnel状態を追加
  - publishToCloudflare、tunnelUrl、tunnelStatus、accessToken等の新規状態フィールド
  - showInstallCloudflaredDialogフラグ
  - 設定のlocalStorage永続化
  - _Requirements: 5.2, 6.1, 6.2_

- [x] 7.2 新規アクション関数を追加
  - setPublishToCloudflare、refreshAccessToken、dismissInstallDialog
  - IPC経由でのメインプロセス連携
  - _Requirements: 3.3, 5.1, 6.3_

## Task 8: 設定パネルへのCloudflare設定UI追加

- [x] 8.1 (P) SettingsPanelにCloudflare Tunnel Token入力セクションを追加
  - トークン入力フィールド（マスク表示対応）
  - 保存ボタンとフィードバック表示
  - 環境変数設定時の案内メッセージ
  - _Requirements: 2.1, 2.4_

## Task 9: RemoteAccessPanelへのCloudflare機能追加

- [x] 9.1 「Cloudflareに公開」チェックボックスを追加
  - チェック状態の永続化と復元
  - Tunnel Token未設定時の無効化表示
  - cloudflaredバイナリ不在時のバリデーションチェック
  - _Requirements: 1.1, 2.4, 4.1, 5.1, 5.2_

- [x] 9.2 Tunnel URL表示とコピー機能を追加
  - Tunnel接続中にTunnel URLを表示
  - URLコピーボタンの実装
  - Tunnel接続状態（connecting/connected/error）の表示
  - _Requirements: 1.3, 6.1, 6.3_

- [x] 9.3 QRコード表示機能を拡張
  - Tunnel URL+アクセストークン埋め込みQRコードの生成と表示
  - QRコード拡大表示機能（オプション）
  - _Requirements: 6.2, 6.4, 6.5_

- [x] 9.4 アクセストークンリフレッシュ機能を追加
  - リフレッシュボタンの実装
  - リフレッシュ後のQRコード自動更新
  - _Requirements: 3.3_

## Task 10: インストール案内ダイアログの実装

- [x] 10.1 (P) InstallCloudflaredDialogコンポーネントを作成
  - モーダルダイアログとして実装
  - プラットフォーム別インストール手順（Homebrew、MacPorts、公式ダウンロード）の表示
  - 各インストール方法へのリンク
  - ダイアログ閉じるボタン
  - _Requirements: 4.2, 4.3_

## Task 11: ユニットテストの実装

- [x] 11.1 (P) CloudflareConfigStoreのテスト
  - 設定の保存・取得テスト
  - 環境変数優先ロジックのテスト
  - リセット機能のテスト
  - _Requirements: 2.2, 2.3, 5.1, 5.4_

- [x] 11.2 (P) AccessTokenServiceのテスト
  - トークン生成の一意性テスト
  - timing-safe比較のテスト
  - リフレッシュ動作のテスト
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 11.3 (P) CloudflaredBinaryCheckerのテスト
  - パス検索ロジックのテスト
  - バイナリ不在時の動作テスト
  - _Requirements: 4.1, 4.2_

- [x] 11.4 CloudflareTunnelManagerのテスト
  - プロセスspawn/killのモックテスト
  - Tunnel URLパースロジックのテスト
  - エラーハンドリングのテスト
  - Task 4.1, 4.2 への依存あり
  - _Requirements: 1.1, 1.4, 1.5_

- [x] 11.5 WebSocketHandler認証のテスト
  - トークン認証成功・失敗のテスト
  - 接続拒否動作のテスト
  - Task 5.1 への依存あり
  - _Requirements: 3.4, 7.3_

## Task 12: 統合テストの実装

- [x] 12.1 RemoteAccessServer + Tunnel統合テスト
  - サーバー起動時のTunnel接続フロー
  - サーバー停止時のTunnel切断フロー
  - エラー時のフォールバック動作
  - Task 6.1 への依存あり
  - _Requirements: 1.1, 1.4, 1.5, 7.1, 7.2_

- [x] 12.2 IPC + ConfigStore統合テスト
  - 設定の永続化と読み込みフロー
  - Renderer-Main間の通信テスト
  - Task 1.1, 1.2 への依存あり
  - _Requirements: 2.2, 5.1, 5.3_

## Task 13: E2Eテストの実装

- [x] 13.1 Tunnel無効時のサーバー起動テスト
  - LAN URLのみ表示されることを確認
  - Tunnel関連UIが非表示であることを確認
  - _Requirements: 6.1, 7.1_

- [x] 13.2 バイナリ不在時のインストールダイアログテスト
  - 「Cloudflareに公開」選択時にダイアログが表示されることを確認
  - インストール手順リンクが機能することを確認
  - _Requirements: 4.2, 4.3_

- [x] 13.3 Tunnel有効時の接続フローテスト（cloudflaredモック使用）
  - 両URL（LAN、Tunnel）が表示されることを確認
  - QRコードにトークンが埋め込まれていることを確認
  - トークンリフレッシュでQRコードが更新されることを確認
  - _Requirements: 1.1, 1.3, 6.2, 6.5_

## Task 14: ドキュメント更新

- [x] 14.1 README.mdへのCloudflare Tunnel機能説明の追加
  - 機能概要の追加
  - 前提条件（cloudflaredインストール）の記載
  - 基本的な使用方法の説明
  - _Requirements: 関連ドキュメント_

- [x] 14.2 ユーザーガイドの更新
  - Cloudflare Tunnel設定手順の追加
  - Tunnel Token取得・設定方法の説明
  - トラブルシューティング情報の追加
  - _Requirements: 関連ドキュメント_

## Task 15: インスペクション指摘事項の修正

### 15.1 UIコンポーネントの統合

- [x] 15.1.1 CloudflareSettingsPanelの統合
  - CloudflareSettingsPanelコンポーネントをRemoteAccessDialogにインポート
  - RemoteAccessDialog内のCloudflare Tunnel設定セクションとして表示
  - 既存のRemoteAccessPanelとの整合性を確保
  - _Requirements: 2.1, 2.4_
  - _Inspection: Major Issue #1 - デッドコード解消_

- [x] 15.1.2 InstallCloudflaredDialogの統合
  - InstallCloudflaredDialogをRemoteAccessDialogにインポート
  - remoteAccessStoreのshowInstallCloudflaredDialogフラグで表示制御
  - cloudflaredバイナリ不在時にダイアログを表示
  - _Requirements: 4.2, 4.3_
  - _Inspection: Major Issue #2 - デッドコード解消_

### 15.2 TODO残存箇所の実装完了

- [x] 15.2.1 RemoteAccessServerのTunnel統合完了
  - remoteAccessServer.ts:206-208のTODOコメントを解消
  - CloudflareTunnelManagerとの統合ロジックを実装
  - publishToCloudflareオプション有効時のTunnel接続を実装
  - _Requirements: 1.1, 1.2, 7.1_
  - _Inspection: Major Issue #3 - TODO解消_

- [x] 15.2.2 refreshAccessTokenのQRコード更新実装
  - preload/index.ts:483-485のTODOコメントを解消
  - トークンリフレッシュ時に新しいQRコードDataURLを取得
  - 更新されたQRコードをレンダラープロセスに返却
  - _Requirements: 3.3, 6.5_
  - _Inspection: Major Issue #4 - TODO解消_

### 15.3 修正後の検証

- [x] 15.3.1 ユニットテストの実行
  - 修正した機能のテストが全てパスすることを確認
  - `npm run test` でテストスイート全体を実行（2820 passed）

- [x] 15.3.2 E2Eテストの実行
  - Cloudflare Tunnel関連のE2Eテストを実行
  - UI統合が正しく動作することを確認
