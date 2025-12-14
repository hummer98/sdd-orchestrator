# Requirements Document

## Introduction

本ドキュメントは、SDD ManagerアプリケーションへのDeepCode統合機能の要件を定義する。DeepCodeは代替AIエージェントプロバイダーとして、既存のspec-impl（Claude Code）と並行して利用可能とする。グローバルインストール方式を採用し、プロジェクト単位でコンテキストを分離することで、複数プロジェクトでの再利用性を確保する。

## Requirements

### Requirement 1: 実行プロバイダー選択UI

**Objective:** 開発者として、Specワークフロー実行時にDeepCodeまたはspec-impl（Claude Code）を選択できるようにしたい。これにより、プロジェクトや作業内容に応じて最適なAIエージェントを使い分けられる。

#### Acceptance Criteria

1. When ユーザーがSpecワークフローの右ペインを表示した時, the SDD Manager shall implエリア内にセグメントボタン（プロバイダー選択UI）を表示する
2. The SDD Manager shall 以下の3つのプロバイダーを選択肢として提供する: `local-claude`, `ssh-claude`, `local-deepcode`
3. When ユーザーがセグメントボタンでプロバイダーを選択した時, the SDD Manager shall 選択状態を永続化し、次回起動時に復元する
4. The SDD Manager shall デフォルトプロバイダーとして `local-claude` を選択する

### Requirement 2: DeepCodeインストール機能

**Objective:** 開発者として、ツールメニューからDeepCodeの環境構築を実行できるようにしたい。これにより、初回セットアップを簡単に行える。

#### Acceptance Criteria

1. The SDD Manager shall ツールメニューに「DeepCodeのインストール」項目を表示する
2. When ユーザーが「DeepCodeのインストール」を選択した時, the SDD Manager shall Claude Codeをサブプロセスとして起動し、DeepCodeのインストールスクリプトを実行する
3. The SDD Manager shall DeepCodeをグローバルディレクトリ（`~/.deepcode/`）にインストールする
4. While インストール処理が実行中の間, the SDD Manager shall 進捗状況をユーザーに表示する
5. When インストールが正常に完了した時, the SDD Manager shall 成功メッセージを表示する
6. If インストール中にエラーが発生した場合, the SDD Manager shall エラー内容と対処方法を表示する

### Requirement 3: DeepCode実行時エラーハンドリング

**Objective:** 開発者として、DeepCodeが未インストールの状態で実行しようとした際に、適切な案内を受けたい。これにより、問題の解決方法が明確になる。

#### Acceptance Criteria

1. When DeepCodeプロバイダーが選択された状態で実行を開始した時 and DeepCodeがインストールされていない場合, the SDD Manager shall 「ツールメニューからDeepCodeをインストールしてください」というエラーメッセージを表示する
2. The SDD Manager shall エラーメッセージ内にツールメニューへの導線（ボタンまたはリンク）を含める
3. If DeepCode実行中にランタイムエラーが発生した場合, the SDD Manager shall エラーログを表示し、再インストールを提案する

### Requirement 4: プロジェクトコンテキスト分離

**Objective:** 開発者として、複数プロジェクトでDeepCodeを使用する際に、各プロジェクトのコンテキストが分離されることを保証したい。これにより、異なるプロジェクト間での干渉を防げる。

#### Acceptance Criteria

1. When DeepCodeプロバイダーで実行を開始した時, the SDD Manager shall 現在のプロジェクトパスを引数としてDeepCodeプロセスに渡す
2. The SDD Manager shall DeepCodeプロセスが対象プロジェクトのディレクトリでのみ操作を行うことを保証する
3. The SDD Manager shall 各プロジェクトのDeepCode実行ログを個別に管理する

### Requirement 5: プロバイダー統一命名規則

**Objective:** 開発者として、一貫した命名規則でプロバイダーを識別できるようにしたい。これにより、設定やログの管理が容易になる。

#### Acceptance Criteria

1. The SDD Manager shall 以下のプロバイダー識別子を使用する:
   - `local-claude`: ローカルで実行するClaude Code
   - `ssh-claude`: SSH経由で実行するClaude Code
   - `local-deepcode`: ローカルで実行するDeepCode
2. The SDD Manager shall プロバイダー識別子をログ出力、設定ファイル、UI表示で一貫して使用する
3. Where 新しいプロバイダーが追加される場合, the SDD Manager shall `{実行環境}-{エージェント名}` の命名パターンに従う
