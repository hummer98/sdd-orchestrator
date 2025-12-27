# Cloudflare Tunnel設定ガイド

このガイドでは、SDD OrchestratorでCloudflare Tunnel機能を設定し、LAN外からリモートアクセスする方法を説明します。

## 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [cloudflaredのインストール](#cloudflaredのインストール)
4. [Cloudflare Tunnelの作成](#cloudflare-tunnelの作成)
5. [SDD Orchestratorでの設定](#sdd-orchestratorでの設定)
6. [リモートサーバーの起動](#リモートサーバーの起動)
7. [接続方法](#接続方法)
8. [トラブルシューティング](#トラブルシューティング)

## 概要

Cloudflare Tunnelを使用すると、ポートフォワーディングやファイアウォール設定なしで、インターネット経由でSDD Orchestratorのリモートアクセス機能を利用できます。

### 仕組み

```
スマートフォン → Cloudflare Edge → cloudflared → SDD Orchestrator
                                         ↑
                                    暗号化接続
```

- **cloudflared**: ローカルで動作するCloudflareのデーモン
- **Cloudflare Edge**: Cloudflareのグローバルネットワーク
- **Named Tunnel**: 固定URLを持つセキュアなトンネル

### 主な特徴

- ポートフォワーディング不要
- ファイアウォール設定変更不要
- アクセストークンによる認証
- LAN内アクセスとの併用可能

## 前提条件

- Cloudflareアカウント（無料プランで利用可能）
- Cloudflareに追加済みのドメイン（Tunnelの作成に必要）
- macOS、Windows、またはLinux

## cloudflaredのインストール

### macOS

```bash
# Homebrew（推奨）
brew install cloudflared

# MacPorts
sudo port install cloudflared
```

### Windows

[公式ダウンロードページ](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)からインストーラーをダウンロードしてください。

### Linux

```bash
# Debian/Ubuntu
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# RHEL/CentOS
curl -L --output cloudflared.rpm https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
sudo rpm -i cloudflared.rpm
```

### インストールの確認

```bash
cloudflared --version
```

バージョン情報が表示されれば、インストール成功です。

## Cloudflare Tunnelの作成

### 1. Cloudflareにログイン

```bash
cloudflared tunnel login
```

ブラウザが開き、Cloudflareへのログインが求められます。認証後、証明書が自動的にダウンロードされます。

### 2. Tunnelの作成

```bash
cloudflared tunnel create sdd-orchestrator
```

実行すると、以下のような出力が表示されます：

```
Created tunnel sdd-orchestrator with id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. Tunnel Tokenの取得

```bash
cloudflared tunnel token sdd-orchestrator
```

表示された長いトークン文字列をコピーしてください。これがSDD Orchestratorで設定するTunnel Tokenです。

> **注意**: Tunnel Tokenは機密情報です。安全に保管してください。

## SDD Orchestratorでの設定

### 設定画面からの設定

1. SDD Orchestratorを起動
2. 左下の歯車アイコンをクリックして設定パネルを開く
3. 「Cloudflare」セクションを見つける
4. 「Tunnel Token」フィールドに取得したトークンを貼り付け
5. 「保存」をクリック

### 環境変数での設定（オプション）

アプリ設定の代わりに環境変数を使用することもできます：

```bash
export CLOUDFLARE_TUNNEL_TOKEN="your-tunnel-token-here"
```

> **優先順位**: 環境変数が設定されている場合、アプリ設定より環境変数が優先されます。

## リモートサーバーの起動

1. SDD Orchestratorで「Remote Access」パネルを開く
2. 「Cloudflareに公開」チェックボックスをオンにする
3. 「サーバー開始」ボタンをクリック

### 起動時の表示

起動に成功すると、以下の情報が表示されます：

- **LAN URL**: `http://192.168.x.x:xxxx` （LAN内からのアクセス用）
- **Tunnel URL**: `https://xxxxx.cfargotunnel.com` （インターネット経由のアクセス用）
- **QRコード**: アクセストークン埋め込み済み

## 接続方法

### スマートフォンから

1. 表示されたQRコードをスマートフォンのカメラでスキャン
2. ブラウザでリモートUIが開く
3. アクセストークンは自動的に認証される

### PCブラウザから

1. Tunnel URLをコピー
2. ブラウザでURLを開く
3. アクセストークンの入力を求められた場合は、表示されているトークンを入力

### アクセストークンについて

- アクセストークンは10文字の英数字
- QRコードにはトークンが埋め込まれているため、スキャン時は入力不要
- セキュリティのため、トークンは定期的にリフレッシュすることを推奨
- 「トークンをリフレッシュ」ボタンで新しいトークンを生成可能

## トラブルシューティング

### cloudflaredが見つからない

**症状**: 「Cloudflareに公開」を選択すると「cloudflaredが見つかりません」と表示される

**対処法**:
1. cloudflaredがインストールされているか確認
   ```bash
   which cloudflared
   ```
2. PATHが通っているか確認
3. アプリを再起動して再試行

### Tunnel接続に失敗する

**症状**: サーバー起動後、Tunnel URLが表示されず「接続失敗」となる

**対処法**:
1. Tunnel Tokenが正しく設定されているか確認
2. インターネット接続を確認
3. cloudflaredのバージョンを最新に更新
   ```bash
   brew upgrade cloudflared  # Homebrewの場合
   ```
4. Cloudflareダッシュボードでトンネルのステータスを確認

### トークン認証エラー

**症状**: 接続時に「Unauthorized」エラーが表示される

**対処法**:
1. アクセストークンが正しいか確認
2. トークンをリフレッシュして再試行
3. QRコードを再スキャン

### 接続が不安定

**症状**: 接続が頻繁に切断される

**対処法**:
1. ネットワーク接続を確認
2. cloudflaredプロセスが正常に動作しているか確認
   ```bash
   ps aux | grep cloudflared
   ```
3. アプリを再起動してサーバーを再開始

### Tunnel Tokenを忘れた

**対処法**:
```bash
cloudflared tunnel token <トンネル名>
```

トンネル名を忘れた場合：
```bash
cloudflared tunnel list
```

## セキュリティに関する注意

- **Tunnel Tokenの管理**: Tunnel Tokenは機密情報として扱い、他者と共有しないでください
- **アクセストークンの定期更新**: セキュリティを高めるため、定期的にアクセストークンをリフレッシュしてください
- **信頼できるネットワークからの接続**: 公共Wi-Fiなど信頼性の低いネットワークからの接続には注意してください
- **使用後の停止**: リモートアクセスが不要な場合は、サーバーを停止することを推奨します

## 関連リンク

- [Cloudflare Tunnel公式ドキュメント](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [cloudflaredダウンロードページ](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
- [Cloudflare Zero Trust](https://www.cloudflare.com/products/zero-trust/)
