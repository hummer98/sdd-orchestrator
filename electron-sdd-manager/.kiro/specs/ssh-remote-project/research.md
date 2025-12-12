# Research & Design Decisions

## Summary
- **Feature**: ssh-remote-project
- **Discovery Scope**: Complex Integration (新規の抽象化レイヤー導入とSSHプロトコル統合)
- **Key Findings**:
  - ssh2ライブラリがNode.js/ElectronでのSSH接続における事実上の標準
  - SFTPプロトコルはネイティブなファイル監視機能を持たないため、ポーリングベースの監視が必要
  - Provider Pattern (Strategy Pattern) による抽象化がローカル/リモート透過性の実現に最適

## Research Log

### SSH2ライブラリの選定
- **Context**: Node.js/ElectronでSSH接続とSFTP操作を実現するためのライブラリ調査
- **Sources Consulted**:
  - [ssh2 - npm](https://www.npmjs.com/package/ssh2)
  - [GitHub - mscdex/ssh2](https://github.com/mscdex/ssh2)
  - [ssh2-sftp-client - npm](https://www.npmjs.com/package/ssh2-sftp-client)
- **Findings**:
  - `ssh2`: 純粋JavaScriptで実装されたSSH2クライアント/サーバーモジュール
  - 現在のバージョン: 1.16.x系、Node.js 20+をサポート
  - OpenSSH 8.7に対してテスト済み
  - TypeScript型定義は `@types/ssh2` で提供
  - `ssh2-sftp-client`: ssh2のPromiseベースラッパー、v12.0.1が安定版
- **Implications**:
  - ssh2を直接使用し、型安全なラッパーを自前で実装
  - ssh2-sftp-clientはシンプルなユースケース向けだが、今回はより低レベルの制御が必要

### SSH認証方式の調査
- **Context**: 要件2で定義された複数の認証方式（ssh-agent、秘密鍵、パスワード）の実装方法
- **Sources Consulted**:
  - [SSH2 API Documentation](https://github.com/mscdex/ssh2)
  - [electron-ssh2](https://www.npmjs.com/package/electron-ssh2)
  - [GitHub Issues #869](https://github.com/mscdex/ssh2/issues/869)
- **Findings**:
  - ssh2の接続設定パラメータ:
    - `agent`: ssh-agentのUNIXソケットパス（Windowsでは'pageant'またはcygwinソケットパス）
    - `privateKey`: 秘密鍵のBuffer/文字列
    - `passphrase`: 秘密鍵のパスフレーズ
    - `password`: パスワード認証用
  - ssh2は `createAgent()` ヘルパー関数を提供:
    - Windows + 'pageant' → PageantAgent
    - 非Windowsパイプ → CygwinAgent
    - その他 → OpenSSHAgent
  - 認証順序は設定可能（authHandler）
- **Implications**:
  - 認証フォールバックチェーンを実装: agent → privateKey → password
  - `~/.ssh/config` の読み込みにはssh-configパーサーが別途必要

### ホストキー検証の実装
- **Context**: 要件9のセキュリティ要件を満たすためのホストキー検証機構
- **Sources Consulted**:
  - [GitHub Issues #1268](https://github.com/mscdex/ssh2/issues/1268)
  - [Stack Overflow - ssh fingerprint](https://stackoverflow.com/questions/65184683/using-ssh-fingerprint-in-ssh2-sftp-client)
- **Findings**:
  - `hostHash`: ホストキーのハッシュアルゴリズム（sha256, md5等）
  - `hostVerifier`: `(key, callback?) => boolean | Promise<boolean>`
    - keyはhostHash設定時はハッシュ文字列、未設定時はraw Buffer
    - 非同期検証ではPromise解決前に接続が確立される既知の問題あり
  - デフォルトではホストキーは自動承認される（セキュリティリスク）
- **Implications**:
  - hostVerifierを必須実装
  - known_hostsの読み書き機能を実装
  - 初回接続時のユーザー確認ダイアログが必要

### リモートファイル監視の課題
- **Context**: 要件3.7のファイル変更監視機能の実現可能性調査
- **Sources Consulted**:
  - [ssh2-sftp-client API](https://github.com/theophilusx/ssh2-sftp-client)
  - SFTP Protocol Specification
- **Findings**:
  - **SFTPプロトコルはinotify相当の機能を持たない**
  - ssh2-sftp-clientの `list()` メソッドでディレクトリ一覧を取得可能
  - 各ファイルのattrsにmtime（修正時刻）が含まれる
  - リアルタイム監視には外部ツール（inotifywait over SSH）が必要
- **Implications**:
  - ポーリングベースの監視を実装（30秒間隔程度）
  - mtimeの比較による変更検出
  - ローカルとリモートで監視の応答性に差が出ることをユーザーに明示

### Electron固有の考慮事項
- **Context**: ElectronアプリケーションでのSSH接続実装における注意点
- **Sources Consulted**:
  - [electron-ssh2](https://github.com/iSept/electron-ssh2)
  - [Stack Overflow - ssh2 in Electron](https://stackoverflow.com/questions/40646733)
- **Findings**:
  - Electronのrendererプロセスはネットワーク機能に直接アクセスできない
  - ssh2は**mainプロセスで実行する必要がある**
  - nodeIntegration: falseの設定下でもmainプロセス経由で安全に動作
  - electron-ssh2は古いプロジェクトで非推奨
- **Implications**:
  - すべてのSSH操作はmainプロセスの新しいサービスで実装
  - IPCを通じてrendererと通信
  - 既存のサービスパターン（agentProcess.ts等）に倣う

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Provider Pattern (Strategy) | FileSystemProvider/ProcessProviderインターフェースを定義し、Local/SSH実装を切り替え | 既存コードへの影響最小、テスト容易、拡張性高い | 抽象化層のオーバーヘッド、初期実装コスト | **選択** - steering原則に合致 |
| Adapter Pattern | 既存のFileService/AgentProcessをラップしてSSH対応 | 既存コードの再利用 | 密結合、テスト困難 | 却下 |
| Dependency Injection | 実行時にプロバイダを注入 | 柔軟性が高い | 設定が複雑、型安全性の課題 | 部分採用 |

## Design Decisions

### Decision: Provider Pattern による抽象化レイヤー導入

- **Context**: 要件3, 4で定義されたFileSystemProviderとProcessProviderの抽象化
- **Alternatives Considered**:
  1. 既存のFileServiceを直接拡張 - 既存コードへの影響大
  2. 新規のRemoteFileServiceを作成 - 呼び出し側での分岐が必要
  3. Provider Patternで抽象化 - インターフェースベースで透過的に切り替え
- **Selected Approach**: Provider Pattern
  - `FileSystemProvider` インターフェースを定義
  - `LocalFileSystemProvider` と `SSHFileSystemProvider` を実装
  - `ProcessProvider` インターフェースを定義
  - `LocalProcessProvider` と `SSHProcessProvider` を実装
  - プロジェクト選択時にProviderを切り替え
- **Rationale**:
  - 既存コードへの変更を最小限に抑える
  - 単体テストでモック実装が容易
  - 将来的な拡張（他のリモートプロトコル対応等）が容易
- **Trade-offs**:
  - 抽象化層の追加によるコード量増加
  - すべてのファイル操作がProvider経由になるため、若干のパフォーマンスオーバーヘッド
- **Follow-up**: 既存のFileServiceをLocalFileSystemProviderに移行

### Decision: ssh2ライブラリの直接使用

- **Context**: SSH接続とSFTP操作のライブラリ選定
- **Alternatives Considered**:
  1. ssh2-sftp-client - 高レベルラッパー、シンプルだが制御が限定的
  2. ssh2直接使用 - 低レベル、柔軟だが実装コスト高
  3. node-ssh - ssh2のラッパー、TypeScript対応だがメンテナンス状況不明
- **Selected Approach**: ssh2直接使用
  - より細かい制御が可能（認証フォールバック、ホストキー検証）
  - TypeScript型定義を `@types/ssh2` で使用
  - 自前でPromiseラッパーを実装
- **Rationale**:
  - 認証フォールバックの細かい制御が必要
  - ホストキー検証のカスタマイズが必要
  - 接続状態管理の完全な制御が必要
- **Trade-offs**:
  - 初期実装コストが高い
  - エラーハンドリングを自前で実装する必要がある
- **Follow-up**: ssh2のラッパーサービス（SSHConnectionService）を設計

### Decision: ポーリングベースのリモートファイル監視

- **Context**: リモートディレクトリのファイル変更検出
- **Alternatives Considered**:
  1. リアルタイム監視（SSH経由でinotifywait実行）- サーバー依存性高、複雑
  2. ポーリング監視（定期的なSFTP readdir）- シンプル、遅延あり
  3. 監視なし - ユーザー体験低下
- **Selected Approach**: ポーリングベースの監視
  - 30秒間隔でSFTP readdirを実行
  - mtimeの比較で変更を検出
  - 変更検出時にイベントを発火
- **Rationale**:
  - SFTPプロトコルの制約上、他に実現可能な方法がない
  - サーバー環境に依存しない
  - 実装がシンプル
- **Trade-offs**:
  - 最大30秒の遅延
  - ポーリングによるネットワークオーバーヘッド
  - ローカルと比較して応答性が低下
- **Follow-up**: ポーリング間隔を設定可能にする

### Decision: SSH URI形式の採用

- **Context**: リモートプロジェクトの識別方法
- **Alternatives Considered**:
  1. 独自形式（JSON設定ファイル）- 解析は容易だが標準的でない
  2. SSH URI形式 `ssh://user@host:port/path` - 標準的、直感的
  3. SCP形式 `user@host:path` - 広く使われるがポート指定が難しい
- **Selected Approach**: SSH URI形式
  - `ssh://user@host[:port]/path` 形式
  - デフォルトポート22
  - 絶対パスのみサポート
- **Rationale**:
  - URI標準に準拠
  - コマンドライン引数として自然
  - 将来的な拡張が容易（クエリパラメータ等）
- **Trade-offs**:
  - URIパーサーの実装が必要
  - ユーザーが形式を覚える必要がある
- **Follow-up**: SSH URIパーサーユーティリティを実装

## Risks & Mitigations

- **ネットワーク不安定性** - 自動再接続機能とキープアライブを実装。3回連続失敗で手動再接続を促す
- **セキュリティリスク（ホストキー変更）** - 警告ダイアログとknown_hosts更新オプションを提供
- **パフォーマンス低下（リモート操作）** - 非同期操作とローディング状態の明示、キャッシュ検討
- **認証失敗時のUX** - 段階的なフォールバックと明確なエラーメッセージ
- **リモートClaude Codeの互換性** - バージョンチェックと互換性警告を実装

## References

- [ssh2 - GitHub](https://github.com/mscdex/ssh2) - 主要SSH2ライブラリ
- [ssh2-sftp-client - npm](https://www.npmjs.com/package/ssh2-sftp-client) - SFTPクライアント参考実装
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) - Electron セキュリティガイドライン
- [SSH URI Scheme](https://tools.ietf.org/html/draft-ietf-secsh-scp-sftp-ssh-uri-04) - SSH URI仕様ドラフト
