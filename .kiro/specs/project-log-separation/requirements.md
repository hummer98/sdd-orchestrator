# Requirements Document

## Introduction

本ドキュメントは「プロジェクト毎ログ分割」機能の要件を定義する。

現在、SDD Orchestratorのメインプロセスログは単一の `main.log` ファイルに集約されている。複数プロジェクトを同時に扱う場合、どのプロジェクトに関連するログかを識別することが困難であり、デバッグ効率が低下する。本機能では、メインプロセスログをプロジェクト単位で分割し、各プロジェクトに関連するログを個別ファイルに記録することで、デバッグ体験を向上させる。

## Requirements

### Requirement 1: プロジェクト別ログファイルの作成

**Objective:** As a 開発者, I want プロジェクト毎に独立したログファイルを持つこと, so that 特定プロジェクトに関連するログを素早く特定できる

#### Acceptance Criteria

1. When ユーザーがプロジェクトを開く, the Logger shall そのプロジェクト専用のログファイルを作成または開く
2. When ユーザーがプロジェクトを切り替える, the Logger shall 新しいプロジェクトのログファイルへ出力先を変更する
3. The Logger shall プロジェクトパスをキーとして一意のログファイル名を生成する
4. While プロジェクトが開かれている, the Logger shall そのプロジェクトに関連する全てのログエントリをプロジェクト専用ログファイルに記録する

### Requirement 2: ログファイルの格納場所

**Objective:** As a 開発者, I want ログファイルがプロジェクト内に格納されること, so that プロジェクトのコンテキストでログを参照できる

#### Acceptance Criteria

1. The Logger shall プロジェクトログファイルを `{projectPath}/.kiro/logs/` ディレクトリに格納する
2. When ログディレクトリが存在しない, the Logger shall 自動的にディレクトリを作成する
3. The Logger shall 本番環境と開発環境で同一のログパス規則を適用する

### Requirement 3: グローバルログの維持

**Objective:** As a 開発者, I want プロジェクトに紐付かないアプリケーション全体のログも記録されること, so that アプリ起動・終了などグローバルイベントを追跡できる

#### Acceptance Criteria

1. The Logger shall プロジェクトに紐付かないログを従来の `main.log` ファイルに記録し続ける
2. While プロジェクトが選択されていない, the Logger shall 全てのログをグローバルログファイルに記録する
3. When アプリケーションが起動する, the Logger shall 起動ログをグローバルログファイルに記録する
4. When アプリケーションが終了する, the Logger shall 終了ログをグローバルログファイルに記録する

### Requirement 4: ログエントリへのプロジェクトコンテキスト付与

**Objective:** As a 開発者, I want 各ログエントリにプロジェクト識別子が含まれること, so that ログを横断検索した際にプロジェクトを特定できる

#### Acceptance Criteria

1. While プロジェクトが開かれている, the Logger shall 各ログエントリにプロジェクトパスまたは識別子を含める
2. The Logger shall ログフォーマットに `[projectId]` フィールドを追加する
3. When グローバルログに記録する, the Logger shall プロジェクト識別子を `[global]` として記録する

### Requirement 5: ログファイルのライフサイクル管理

**Objective:** As a 開発者, I want ログファイルが適切に管理されること, so that ディスク容量が無駄に消費されない

#### Acceptance Criteria

1. The Logger shall プロジェクトログファイルを日付単位でローテーションする
2. When ログファイルサイズが10MBを超える, the Logger shall 新しいログファイルを作成する
3. The Logger shall 30日以上経過した古いログファイルを自動削除する
4. If ログファイルの作成に失敗する, the Logger shall エラーをコンソールに出力し、グローバルログへのフォールバックを試みる

### Requirement 6: UIからのログアクセス

**Objective:** As a ユーザー, I want GUIから現在のプロジェクトログを参照できること, so that 外部ツールを使わずにデバッグ情報を確認できる

#### Acceptance Criteria

1. When ユーザーがログ表示操作を行う, the SDD Orchestrator shall 現在のプロジェクトのログファイルパスを表示する
2. Where プロジェクトログ機能が有効, the SDD Orchestrator shall ログファイルをシステムのファイルブラウザで開くオプションを提供する
3. The SDD Orchestrator shall ログディレクトリパスをIPCを通じてレンダラープロセスに公開する
4. The SDD Orchestrator shall preload APIの型定義（ElectronAPI）に`getProjectLogPath`と`openLogInBrowser`を追加する

### Requirement 7: ログローテーション機能の統合

**Objective:** As a 開発者, I want ログローテーション機能がProjectLoggerに統合されていること, so that ログファイルが自動的に管理される

#### Acceptance Criteria

1. The ProjectLogger shall LogRotationManagerを初期化時にインスタンス化する
2. When ログを書き込む, the ProjectLogger shall LogRotationManagerを使用してローテーションチェックを行う
3. When ローテーションが必要, the ProjectLogger shall ストリームを再作成する
4. The ProjectLogger shall 古いログファイルの自動削除をLogRotationManagerに委譲する

