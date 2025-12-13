# Implementation Plan

## Tasks

- [x] 1. SSH URI解析とバリデーション機能
- [x] 1.1 (P) SSH URI形式の解析ロジックを実装
  - `ssh://user@host[:port]/path` 形式を解析してユーザー名、ホスト名、ポート番号、パスを抽出
  - ポート番号が省略された場合はデフォルト値22を設定
  - ホスト名、ユーザー名、パス部分のフォーマットを検証
  - 無効なURI形式に対して詳細なエラー情報を返却
  - URIオブジェクトから文字列形式への逆変換機能
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 1.2 (P) SSH URIパーサーのユニットテスト
  - 各種有効なURI形式のパーステスト
  - ポート省略時のデフォルト値テスト
  - 無効なURI形式に対するエラーハンドリングテスト
  - バリデーションエラーのケース網羅
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. SSH認証サービス
- [x] 2.1 ssh-agent認証、秘密鍵認証、パスワード認証のフォールバックチェーンを実装
  - 認証方式の優先順位管理（agent → privateKey → password）
  - ssh-agentソケットの検出と利用
  - デフォルト秘密鍵パス（~/.ssh/id_rsa, ~/.ssh/id_ed25519等）の自動検索
  - パスフレーズ要求のコールバック
  - パスワード入力のコールバック機能
  - 認証情報をメモリ上でのみ管理し、使用後に即座にクリア
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.5_

- [x] 2.2 認証サービスのユニットテスト
  - 認証方式の優先順位テスト
  - 各認証方式のフォールバックテスト
  - パスフレーズ/パスワード入力コールバックテスト
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. ホストキー検証機能
- [x] 3.1 (P) ホストキーのフィンガープリント計算と`~/.ssh/known_hosts`管理を実装
  - ホストキーのSHA256/MD5フィンガープリント計算
  - known_hostsファイルの読み込みと既知ホストの検証
  - 新規ホストおよびキー変更時の検出
  - 承認済みホストキーのknown_hostsへの保存
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 3.2 (P) ホストキーマネージャーのユニットテスト
  - フィンガープリント計算テスト
  - known_hostsファイルの読み書きテスト
  - 新規ホスト/キー変更検出テスト
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 4. SSH接続サービス
- [x] 4.1 ssh2ライブラリを使用したSSH接続のライフサイクル管理を実装
  - SSH接続の確立（認証サービス、ホストキー検証との連携）
  - 接続状態（disconnected, connecting, authenticating, host-verifying, connected, reconnecting, error）の遷移管理
  - SFTPクライアントの取得機能
  - SSHコマンド実行チャネルの管理
  - 接続状態変更イベントの発行
  - セキュアな暗号化アルゴリズム（AES-256-GCM、ChaCha20-Poly1305等）の優先使用
  - _Requirements: 2.1, 6.1, 9.4_

- [x] 4.2 30秒間隔のkeep-aliveパケット送信と接続維持を実装
  - 定期的なkeep-aliveパケットの送信
  - 接続時間とデータ転送量の追跡
  - _Requirements: 6.2, 6.6_

- [x] 4.3 自動再接続ロジックを実装（最大3回リトライ）
  - 予期しない切断の検出
  - 再接続試行と状態遷移
  - 3回失敗時の手動再接続通知
  - ネットワークエラーの種類（タイムアウト、ホスト不到達、認証失敗等）の識別
  - _Requirements: 6.3, 6.4, 6.7_

- [x] 4.4 手動切断と接続終了処理を実装
  - ユーザー要求による正常切断
  - プロジェクト選択画面への遷移制御
  - _Requirements: 6.5_

- [x] 4.5 SSH接続サービスの統合テスト
  - モックサーバーへの接続テスト
  - 認証フローのテスト
  - 再接続ロジックのテスト
  - 状態遷移のテスト
  - _Requirements: 2.1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 5. FileSystemProvider抽象化
- [x] 5.1 (P) ファイルシステム操作の共通インターフェースを定義
  - readFile、writeFile、readDir、stat、mkdir、rm、exists、watch操作のインターフェース
  - 統一されたエラー型（NOT_FOUND、PERMISSION_DENIED、TIMEOUT、CONNECTION_LOST等）の定義
  - ローカル/リモートを識別するtype属性
  - _Requirements: 3.1, 3.4_

- [x] 5.2 (P) LocalFileSystemProviderを実装
  - Node.js fsモジュールを使用したローカルファイル操作
  - chokidarを使用したファイル変更監視
  - Promise形式での結果返却
  - _Requirements: 3.2, 3.7_

- [x] 5.3 SSHFileSystemProviderを実装
  - SFTPプロトコルを使用したリモートファイル操作
  - SSH接続サービスからのSFTPクライアント取得と利用
  - 操作タイムアウト管理（30秒）
  - 接続断時の自動再接続とリトライ
  - ポーリングベースのリモートファイル監視
  - _Requirements: 3.3, 3.5, 3.6, 3.7_

- [x] 5.4 FileSystemProviderのユニット・統合テスト
  - ローカルプロバイダーの各操作テスト
  - SSHプロバイダーのSFTPファイル操作テスト
  - タイムアウトと再接続テスト
  - ファイル監視テスト
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 6. ProcessProvider抽象化
- [x] 6.1 (P) プロセス実行の共通インターフェースを定義
  - spawn、exec、kill操作のインターフェース
  - 標準出力、標準エラー出力、終了コードの統一形式
  - 環境変数と作業ディレクトリの設定サポート
  - シグナル送信によるプロセス制御
  - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7_

- [x] 6.2 (P) LocalProcessProviderを実装
  - Node.js child_processモジュールを使用したローカルプロセス実行
  - 出力ストリームのリアルタイム転送
  - プロセス終了とシグナル送信
  - _Requirements: 4.2_

- [x] 6.3 SSHProcessProviderを実装
  - SSH execチャネルを使用したリモートコマンド実行
  - 出力ストリームのリアルタイム転送
  - リモートプロセスのPID追跡とプロセス状態監視
  - シグナル送信によるリモートプロセス制御
  - SSH接続サービスとの連携
  - _Requirements: 4.3, 5.4, 5.7_

- [x] 6.4 ProcessProviderのユニット・統合テスト
  - ローカルプロバイダーのテスト
  - SSHプロバイダーのリモートコマンド実行テスト
  - 出力ストリーミングテスト
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 7. Claude Code リモート実行
- [x] 7.1 リモートサーバー上のClaude Code実行機能を実装
  - リモートClaude Codeの存在確認とバージョン検証
  - Claude Codeがインストールされていない場合のエラーガイダンス
  - SSHProcessProviderを使用したリモートエージェント起動
  - リモートエージェントのPID追跡
  - _Requirements: 5.1, 5.3, 5.6, 5.7_

- [x] 7.2 リモートエージェント出力のリアルタイムUI表示を実装
  - 標準出力のストリーミング受信とUI転送
  - 既存のAgentProcess/SpecManagerServiceとの連携
  - _Requirements: 5.2_

- [x] 7.3 リモートエージェントの停止処理を実装
  - SIGTERMシグナルによる正常終了
  - SSH接続断時の中断通知
  - _Requirements: 5.4, 5.5_

- [x] 7.4 リモートエージェント実行の統合テスト
  - リモートClaude Code起動テスト
  - 出力ストリーミングテスト
  - 停止処理テスト
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 8. 接続状態UIとステータス表示
- [x] 8.1 接続状態をUIステータスバーに表示
  - 接続中、切断、再接続中、エラー等の状態表示
  - 接続時間とデータ転送量の表示
  - _Requirements: 6.1, 6.6_

- [x] 8.2 認証プログレスとダイアログを実装
  - 認証試行中のプログレスインジケータ
  - パスワード/パスフレーズ入力ダイアログ
  - ホストキー確認ダイアログ（新規ホスト/キー変更時の警告表示）
  - _Requirements: 2.6, 9.1, 9.2_

- [x] 9. プロジェクト切り替え機能
- [x] 9.1 プロバイダーファクトリによるプロバイダー切り替えを実装
  - プロジェクト種別に応じたFileSystemProvider/ProcessProviderの自動選択
  - ローカル/SSH切り替え時のプロバイダーインスタンス管理
  - _Requirements: 7.1, 7.2_

- [x] 9.2 プロジェクト一覧でのローカル/リモート区別表示を実装
  - アイコンによる視覚的区別
  - SSHリモートプロジェクト接続時のローディング状態表示
  - _Requirements: 7.3, 7.5_

- [x] 9.3 プロジェクト切り替え時のエージェント停止確認を実装
  - 実行中エージェントの検出
  - 停止確認ダイアログの表示
  - _Requirements: 7.4_

- [x] 10. SSH URIプロジェクト入力UI
- [x] 10.1 SSH URI入力ダイアログを実装
  - UIからのリモートプロジェクト追加
  - URI形式のバリデーションとフィードバック
  - _Requirements: 1.3, 1.4_

- [x] 10.2 起動引数からのSSH URI処理を実装
  - コマンドライン引数のSSH URI形式検出
  - 起動時の自動SSH接続開始
  - _Requirements: 1.1_

- [x] 11. 最近使用したリモートプロジェクト
- [x] 11.1 (P) 最近使用したSSHリモートプロジェクトの保存と読み込みを実装
  - electron-storeによるURI情報の永続化
  - 最大10件の履歴管理
  - パスワード/パスフレーズは保存しない
  - _Requirements: 8.1, 8.4, 8.6_

- [x] 11.2 サイドバーへの最近使用したリモートプロジェクト表示を実装
  - アプリ起動時の一覧表示
  - 選択による接続開始
  - 履歴からの削除機能
  - _Requirements: 8.2, 8.3, 8.5_

- [x] 12. エラーハンドリングとロギング
- [x] 12.1 (P) SSH操作のログ出力機能を実装
  - SSH接続とファイル操作のログを開発者ツールに出力
  - エラーコードとメッセージのログ記録
  - デバッグモード時のSSHプロトコルレベル詳細ログ
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 12.2 (P) ログエクスポート機能を実装
  - ユーザーがログファイルをエクスポートできる機能
  - エラーレポートの送信オプション（回復不能エラー時）
  - _Requirements: 10.4, 10.5_

- [x] 13. IPC統合とシステム結合
- [x] 13.1 SSH接続管理用のIPCハンドラを実装
  - handlers.ts へのSSH接続・切断・状態取得ハンドラ追加
  - channels.ts へのチャネル定義追加
  - preload へのAPI公開
  - _Requirements: 1.1, 2.1, 6.1, 7.1, 7.2_

- [x] 13.2 既存のSpecManagerServiceをProvider対応に拡張
  - FileSystemProvider/ProcessProviderを使用するよう既存コードをリファクタリング
  - 既存のローカル動作との後方互換性維持
  - _Requirements: 3.1, 4.1, 5.1_

- [x] 13.3 Zustandストアへの接続状態管理追加
  - connectionStoreの新規作成または既存storeの拡張
  - 接続状態とプロバイダー種別の管理
  - UIコンポーネントへの状態配信
  - _Requirements: 6.1, 7.1, 7.2_

- [x] 14. E2Eテスト
- [x] 14.1 SSH接続からプロジェクト表示までのE2Eテスト
  - SSH URI入力からプロジェクト表示までの完全フロー
  - 認証ダイアログの動作確認
  - 接続状態表示の確認
  - _Requirements: 1.1, 1.4, 2.1, 2.6, 6.1_

- [x] 14.2 リモートエージェント実行のE2Eテスト
  - リモートでのClaude Codeエージェント起動と出力確認
  - エージェント停止の動作確認
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 14.3 接続断→再接続のリカバリーE2Eテスト
  - 接続断のシミュレーション
  - 自動再接続の動作確認
  - 手動再接続フローの確認
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 15. アプリケーション統合
- [x] 15.1 SSHハンドラのメインプロセス登録
  - main/index.tsにregisterSSHHandlers()の呼び出しを追加
  - setupSSHStatusNotifications()の呼び出しを追加
  - _Requirements: 1.1, 2.1, 6.1_

- [x] 15.2 UIコンポーネントのエクスポート設定
  - components/index.tsにSSH関連コンポーネントをエクスポート追加
  - SSHStatusIndicator, SSHConnectDialog, SSHAuthDialog, RecentRemoteProjects, ProjectSwitchConfirmDialog
  - _Requirements: 6.1, 7.3, 8.2_

- [x] 15.3 App.tsxへのUIコンポーネント統合
  - サイドバーにRecentRemoteProjectsを追加
  - ステータスバーにSSHStatusIndicatorを追加
  - SSHConnectDialog, SSHAuthDialog, ProjectSwitchConfirmDialogをダイアログとして追加
  - 状態管理との連携
  - _Requirements: 6.1, 7.3, 7.4, 8.2_

---

## 追加タスク（UIダイアログ完全統合）

- [x] 16. UIダイアログ完全統合
- [x] 16.1 SSHAuthDialogのApp.tsx統合
  - パスワード/パスフレーズ入力ダイアログをApp.tsxに追加
  - connectionStoreとの連携実装（requestAuth, submitAuth, cancelAuth）
  - 認証コールバックフローの接続
  - _Requirements: 2.6_

- [x] 16.2 ProjectSwitchConfirmDialogのApp.tsx統合
  - プロジェクト切り替え確認ダイアログをApp.tsxに追加
  - connectionStoreとの連携実装（requestProjectSwitchConfirm, confirmProjectSwitch, cancelProjectSwitch）
  - エージェント実行中の切り替え確認フロー実装
  - _Requirements: 7.4_

---

## バリデーション結果

**検証日時**: 2025-12-13
**最終更新**: 2025-12-13
**判定**: GO（完全）

| カテゴリ | 状態 |
|---------|------|
| タスク完了 | 16/16 (100%) |
| テスト | SSH関連テスト全パス |
| 要件カバレッジ | 10/10 (100%) |
| 設計整合性 | 12/12コンポーネント実装 |
| UI統合 | 5/5 (100%) |

**備考**: 全UIコンポーネントがApp.tsxに統合完了。connectionStoreにダイアログ制御ロジックを追加。
