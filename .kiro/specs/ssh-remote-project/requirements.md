# Requirements Document

## Introduction

本要件書は、SDD Managerにおける「SSHリモートプロジェクト」機能を定義する。この機能により、ユーザーはSSH経由でリモートサーバー上のプロジェクトに接続し、ローカルプロジェクトと同様にSpec-Driven Developmentワークフローを実行できるようになる。FileSystemProviderとProcessProviderの抽象化レイヤーを導入することで、ローカル/SSH両環境に透過的に対応する。

## Requirements

### Requirement 1: SSH URI形式でのプロジェクト指定

**Objective:** ユーザーとして、SSH URI形式でリモートプロジェクトを指定したい。これによりコマンドラインやUIから統一的な方法でリモートプロジェクトにアクセスできる。

#### Acceptance Criteria

1. When アプリケーションが `ssh://user@host[:port]/path` 形式の起動引数を受け取った場合, the SDD Manager shall SSHリモートプロジェクトとして接続処理を開始する
2. When SSH URIにポート番号が省略されている場合, the SDD Manager shall デフォルトポート22を使用して接続する
3. If 無効なSSH URI形式が指定された場合, then the SDD Manager shall 適切なエラーメッセージを表示し、接続処理を中止する
4. When ユーザーがUIからリモートプロジェクトを追加する場合, the SDD Manager shall SSH URI入力ダイアログを表示する
5. The SDD Manager shall SSH URIのホスト名、ユーザー名、パス部分のバリデーションを実行する

### Requirement 2: SSH認証

**Objective:** ユーザーとして、複数の認証方式（ssh-agent、鍵ファイル、パスワード）でSSH接続を行いたい。これにより既存のSSH設定を活用でき、柔軟な認証が可能になる。

#### Acceptance Criteria

1. When SSH接続を開始する場合, the SDD Manager shall まずssh-agentからの認証を試行する
2. If ssh-agent認証が利用できないまたは失敗した場合, then the SDD Manager shall 秘密鍵ファイルによる認証を試行する
3. If 秘密鍵認証が失敗した場合, then the SDD Manager shall パスワード入力ダイアログを表示し、パスワード認証を試行する
4. When 秘密鍵ファイルがパスフレーズで保護されている場合, the SDD Manager shall パスフレーズ入力ダイアログを表示する
5. If すべての認証方式が失敗した場合, then the SDD Manager shall 認証エラーメッセージを表示し、接続を中止する
6. The SDD Manager shall 認証試行中にプログレスインジケータを表示する

### Requirement 3: FileSystemProvider抽象化レイヤー

**Objective:** 開発者として、ファイルシステム操作をローカル/SSH両環境で透過的に行いたい。これにより既存コードの大幅な変更なしにリモート対応が可能になる。

#### Acceptance Criteria

1. The FileSystemProvider shall 以下の操作をインターフェースとして提供する: readFile, writeFile, readDir, stat, mkdir, rm, exists, watch
2. When ローカルプロジェクトが選択されている場合, the LocalFileSystemProvider shall Node.jsのfsモジュールを使用してファイル操作を実行する
3. When SSHリモートプロジェクトが選択されている場合, the SSHFileSystemProvider shall SFTPプロトコルを使用してファイル操作を実行する
4. The FileSystemProvider shall 操作結果を統一された形式（Promise）で返す
5. If ファイル操作中にSSH接続が切断された場合, then the SSHFileSystemProvider shall 自動再接続を試行し、操作をリトライする
6. If ファイル操作がタイムアウトした場合, then the FileSystemProvider shall タイムアウトエラーを返す
7. The FileSystemProvider shall ファイル変更監視（watch）機能をローカル/リモート両環境で提供する

### Requirement 4: ProcessProvider抽象化レイヤー

**Objective:** 開発者として、プロセス実行をローカル/SSH両環境で透過的に行いたい。これによりClaude Codeの実行がリモート環境でも同様に動作する。

#### Acceptance Criteria

1. The ProcessProvider shall 以下の操作をインターフェースとして提供する: spawn, exec, kill
2. When ローカルプロジェクトでプロセスを実行する場合, the LocalProcessProvider shall Node.jsのchild_processモジュールを使用する
3. When SSHリモートプロジェクトでプロセスを実行する場合, the SSHProcessProvider shall SSHコマンド実行チャネルを使用する
4. The ProcessProvider shall 標準出力、標準エラー出力、終了コードを統一された形式で返す
5. When プロセスを強制終了する場合, the ProcessProvider shall ローカル/リモート両環境でシグナル送信をサポートする
6. The ProcessProvider shall 環境変数の設定をサポートする
7. The ProcessProvider shall 作業ディレクトリの指定をサポートする

### Requirement 5: Claude Code リモート実行

**Objective:** ユーザーとして、リモートサーバー上でClaude Codeエージェントを実行したい。これによりローカルと同じSDDワークフローをリモートプロジェクトに対して実行できる。

#### Acceptance Criteria

1. When SSHリモートプロジェクトでエージェントを起動する場合, the SDD Manager shall リモートサーバー上のClaude Codeを実行する
2. The SDD Manager shall リモートClaude Codeの標準出力をリアルタイムでUIに表示する
3. If リモートサーバーにClaude Codeがインストールされていない場合, then the SDD Manager shall エラーメッセージを表示し、インストールを促す
4. When エージェントを停止する場合, the SDD Manager shall リモートプロセスにSIGTERMを送信して正常終了させる
5. If SSH接続が切断された場合, then the SDD Manager shall エージェント実行中断として扱い、ユーザーに通知する
6. When リモートエージェントを起動する場合, the SDD Manager shall リモートサーバー上のClaude Codeのバージョンを確認する
7. The SDD Manager shall リモートエージェントのPIDを追跡し、プロセス状態を監視する

### Requirement 6: 接続状態管理

**Objective:** ユーザーとして、SSH接続の状態を把握し、必要に応じて再接続したい。これにより安定したリモート操作体験が得られる。

#### Acceptance Criteria

1. The SDD Manager shall SSH接続状態（接続中、切断、再接続中、エラー）をUIステータスバーに表示する
2. While SSHリモートプロジェクトが選択されている場合, the SDD Manager shall 30秒間隔でkeep-aliveパケットを送信して接続を維持する
3. If SSH接続が予期せず切断された場合, then the SDD Manager shall 自動再接続を試行する
4. When 自動再接続が3回連続で失敗した場合, the SDD Manager shall ユーザーに手動再接続を促す通知を表示する
5. When ユーザーが手動で切断を要求した場合, the SDD Manager shall SSH接続を正常に終了し、プロジェクト選択画面に戻る
6. The SDD Manager shall 接続時間とデータ転送量を接続情報として表示する
7. If ネットワークエラーが発生した場合, then the SDD Manager shall エラーの種類（タイムアウト、ホスト不到達、認証失敗等）を明確に表示する

### Requirement 7: プロジェクト切り替え

**Objective:** ユーザーとして、ローカルプロジェクトとリモートプロジェクトをシームレスに切り替えたい。これにより複数環境での作業が効率化される。

#### Acceptance Criteria

1. When ユーザーがプロジェクト一覧からローカルプロジェクトを選択した場合, the SDD Manager shall LocalFileSystemProviderとLocalProcessProviderに切り替える
2. When ユーザーがプロジェクト一覧からSSHリモートプロジェクトを選択した場合, the SDD Manager shall SSHFileSystemProviderとSSHProcessProviderに切り替える
3. The SDD Manager shall プロジェクト一覧でローカル/リモートをアイコンで視覚的に区別して表示する
4. When プロジェクトを切り替える場合, the SDD Manager shall 前のプロジェクトで実行中のエージェントを停止するか確認ダイアログを表示する
5. When SSHリモートプロジェクトに切り替える場合, the SDD Manager shall 接続が完了するまでローディング状態を表示する

### Requirement 8: 最近使用したリモートプロジェクト

**Objective:** ユーザーとして、以前接続したリモートプロジェクトに素早く再接続したい。これにより繰り返しのURI入力を省略できる。

#### Acceptance Criteria

1. The SDD Manager shall 最近使用したSSHリモートプロジェクトのURI情報をローカルに保存する
2. When アプリケーションを起動した場合, the SDD Manager shall 最近使用したリモートプロジェクト一覧をサイドバーに表示する
3. When ユーザーが最近使用したリモートプロジェクトを選択した場合, the SDD Manager shall 保存されたURI情報を使用して接続を開始する
4. The SDD Manager shall パスワードや秘密鍵のパスフレーズをローカルに保存しない
5. When ユーザーが最近使用したプロジェクトを削除した場合, the SDD Manager shall そのプロジェクトを履歴から削除する
6. The SDD Manager shall 最近使用したプロジェクトを最大10件まで保存する

### Requirement 9: セキュリティ

**Objective:** ユーザーとして、SSH接続時のセキュリティを確保したい。これにより安全にリモートプロジェクトを操作できる。

#### Acceptance Criteria

1. When 初めてのホストに接続する場合, the SDD Manager shall ホストキーのフィンガープリントを表示し、ユーザーに確認を求める
2. If ホストキーが変更された場合, then the SDD Manager shall 警告ダイアログを表示し、続行するか選択させる
3. The SDD Manager shall 承認済みホストキーを `~/.ssh/known_hosts` に保存する
4. The SDD Manager shall SSH接続にセキュアな暗号化アルゴリズム（AES-256-GCM、ChaCha20-Poly1305等）を使用する
5. The SDD Manager shall 認証情報をメモリ上で安全に管理し、使用後は即座にクリアする

### Requirement 10: エラーハンドリングとログ

**Objective:** 開発者として、SSH接続やリモート操作のトラブルシューティングを行いたい。これにより問題の特定と解決が容易になる。

#### Acceptance Criteria

1. The SDD Manager shall SSH接続とファイル操作のログを開発者ツールに出力する
2. If SSH操作でエラーが発生した場合, then the SDD Manager shall エラーコードとメッセージをログに記録する
3. When デバッグモードが有効な場合, the SDD Manager shall SSHプロトコルレベルの詳細ログを出力する
4. The SDD Manager shall ユーザーがログをエクスポートできる機能を提供する
5. If 回復不能なエラーが発生した場合, then the SDD Manager shall エラーレポートの送信オプションを表示する
