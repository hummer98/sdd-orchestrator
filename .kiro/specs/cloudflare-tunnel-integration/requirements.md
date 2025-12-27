# Requirements Document

## Introduction

リモートWebサーバー起動時にCloudflare Tunnelへ接続するオプションを追加し、LAN外からもアクセス可能にする機能。Named Tunnelを使用し、Cloudflare Tunnel TokenはアプリN設定画面または環境変数で設定する。アクセス認証にはアプリ生成のトークン（短め、永続化、明示的リフレッシュ）を使用し、QRコードにURL+トークンを埋め込む。サーバー開始時に「Cloudflareに公開」オプションを選択可能にし、この設定も永続化する。Tunnel選択時にcloudflaredバイナリの存在確認を行い、なければインストール案内ダイアログを表示する。LAN内・Tunnel経由どちらからもアクセス可能とし、トークン不一致時は接続拒否する。UIはQRコード+URLコピーボタン。

## Requirements

### Requirement 1: Cloudflare Tunnel接続オプション

**Objective:** As a ユーザー, I want リモートWebサーバー起動時にCloudflare Tunnelへの接続を選択できること, so that LAN外からもリモートUIにアクセスできる。

#### Acceptance Criteria

1. When ユーザーがリモートWebサーバーを開始する際に「Cloudflareに公開」オプションを有効にした場合, the Remote Access Service shall Cloudflare Tunnelへの接続を開始する
2. While Cloudflare Tunnelが接続中, the Remote Access Service shall LAN内アクセス（既存）とTunnel経由アクセスの両方を許可する
3. When Cloudflare Tunnel接続が確立した場合, the Remote Access Service shall Tunnel経由のパブリックURLをUIに表示する
4. When Cloudflare Tunnel接続に失敗した場合, the Remote Access Service shall エラーメッセージを表示し、LAN内アクセスは継続して利用可能とする
5. When ユーザーがリモートWebサーバーを停止した場合, the Remote Access Service shall Cloudflare Tunnel接続も同時に終了する

### Requirement 2: Cloudflare Tunnel Token設定

**Objective:** As a ユーザー, I want Cloudflare Tunnel Tokenをアプリ設定画面または環境変数で設定できること, so that Named Tunnelを使用してセキュアに接続できる。

#### Acceptance Criteria

1. The Settings Panel shall Cloudflare Tunnel Token入力フィールドを提供する
2. When ユーザーがTunnel Tokenを設定画面で入力した場合, the SDD Orchestrator shall そのTokenをアプリ設定として永続化する
3. When Tunnel Tokenが設定画面で設定されていない場合, the Remote Access Service shall 環境変数`CLOUDFLARE_TUNNEL_TOKEN`からTokenを読み取る
4. If Tunnel Tokenが設定画面にも環境変数にも存在しない場合, then the Remote Access Service shall Tunnel接続オプションを無効化し、設定が必要である旨を表示する
5. The SDD Orchestrator shall Tunnel Tokenをセキュアに保存する（平文でログ出力しない）

### Requirement 3: アクセストークン認証

**Objective:** As a ユーザー, I want アプリが生成するアクセストークンで認証すること, so that 不正なアクセスを防止できる。

#### Acceptance Criteria

1. When リモートWebサーバーが開始された場合, the Remote Access Service shall 短めのアクセストークン（8-12文字程度）を自動生成する
2. The Remote Access Service shall 生成したアクセストークンをアプリ設定として永続化する
3. When ユーザーが「トークンをリフレッシュ」ボタンをクリックした場合, the Remote Access Service shall 新しいアクセストークンを生成し、既存のトークンを無効化する
4. When クライアントがアクセストークンなしまたは不一致のトークンで接続を試みた場合, the Remote Access Service shall その接続を拒否する
5. While 有効なアクセストークンで接続中, the Remote Access Service shall その接続を維持し、リモートUI操作を許可する

### Requirement 4: cloudflaredバイナリ管理

**Objective:** As a ユーザー, I want cloudflaredバイナリが存在しない場合にインストール案内を受けること, so that Cloudflare Tunnel機能を利用可能にできる。

#### Acceptance Criteria

1. When ユーザーが「Cloudflareに公開」オプションを有効にしようとした場合, the Remote Access Service shall cloudflaredバイナリの存在を確認する
2. If cloudflaredバイナリが存在しない場合, then the SDD Orchestrator shall インストール案内ダイアログを表示する
3. The インストール案内ダイアログ shall インストール方法（Homebrew、公式ダウンロード等）のリンクを提供する
4. When cloudflaredバイナリが存在する場合, the Remote Access Service shall そのバイナリを使用してTunnel接続を実行する
5. The SDD Orchestrator shall cloudflaredバイナリのパスをカスタマイズ可能にする（オプション）

### Requirement 5: 接続設定の永続化

**Objective:** As a ユーザー, I want 「Cloudflareに公開」設定を永続化すること, so that 次回起動時に同じ設定でサーバーを開始できる。

#### Acceptance Criteria

1. When ユーザーが「Cloudflareに公開」オプションを変更した場合, the SDD Orchestrator shall その設定をアプリ設定として保存する
2. When リモートWebサーバー設定UIが表示された場合, the SDD Orchestrator shall 保存済みの「Cloudflareに公開」設定を復元して表示する
3. The SDD Orchestrator shall アクセストークンを永続化し、アプリ再起動後も同じトークンを使用可能にする
4. When ユーザーが設定をリセットした場合, the SDD Orchestrator shall Cloudflare関連の設定（Tunnel Token除く）をデフォルト値に戻す

### Requirement 6: 接続情報UI

**Objective:** As a ユーザー, I want 接続URLとQRコードを確認してクリップボードにコピーできること, so that 他のデバイスから簡単にアクセスできる。

#### Acceptance Criteria

1. When リモートWebサーバーが起動中, the Remote Access Panel shall 接続URL（LAN内URL、Tunnel URL）を表示する
2. When Cloudflare Tunnelが有効な場合, the Remote Access Panel shall Tunnel URLとアクセストークンを埋め込んだQRコードを表示する
3. When ユーザーがURLコピーボタンをクリックした場合, the Remote Access Panel shall 対応するURLをクリップボードにコピーする
4. When ユーザーがQRコードをクリックまたはタップした場合, the Remote Access Panel shall QRコードを拡大表示する（オプション）
5. The QRコード shall URL+アクセストークンをクエリパラメータ形式で埋め込む（例: `https://tunnel-url?token=xxx`）

### Requirement 7: デュアルアクセス対応

**Objective:** As a ユーザー, I want LAN内とTunnel経由の両方からアクセスできること, so that 状況に応じて最適なアクセス方法を選択できる。

#### Acceptance Criteria

1. While Cloudflare Tunnelが有効, the Remote Access Service shall LAN内アクセス用のローカルサーバーを継続して動作させる
2. While Cloudflare Tunnelが有効, the Remote Access Service shall Tunnel経由のパブリックアクセスを同時に受け付ける
3. The Remote Access Service shall LAN内接続とTunnel経由接続の両方でアクセストークン認証を適用する
4. When 同一クライアントがLAN内とTunnel経由で同時に接続した場合, the Remote Access Service shall 両方の接続を個別に管理する
