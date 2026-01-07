# Requirements Document

## Introduction

SDD OrchestratorにDiscord Bot統合機能を追加する。この機能により、ユーザーはDiscord Slash Command（`/sdd <指示>`）経由でClaude Codeへ指示を送信できるようになる。1つのBotで複数プロジェクトをDiscordチャンネル紐付けで管理し、Electronアプリ起動中のみBotが動作する。

## Scope

- **Remote UI対応**: 不要（Desktop版専用機能）
- **Bot Token管理**: アプリ全体で1つ、プロジェクト単位でオーバーライド可能
- **チャンネル紐付け**: 各プロジェクト設定内で管理

---

## Requirements

### Requirement 1: Bot Token設定管理

**Objective:** As a ユーザー, I want Bot Tokenをアプリ設定またはプロジェクト設定で管理できること, so that 柔軟なBot運用ができる

#### Acceptance Criteria

1. The SDD Orchestrator shall アプリ全体設定でDiscord Bot Tokenを保存する機能を提供する
2. Where 環境変数`DISCORD_BOT_TOKEN`が設定されている場合, the SDD Orchestrator shall 環境変数の値をアプリ設定より優先して使用する
3. Where プロジェクト設定にBot Tokenが指定されている場合, the SDD Orchestrator shall プロジェクト設定のTokenをアプリ全体設定より優先して使用する
4. The SDD Orchestrator shall Bot Token設定の優先順位を「環境変数 > プロジェクト設定 > アプリ全体設定」とする
5. If Bot Tokenが未設定の状態でBot起動を試みた場合, the SDD Orchestrator shall エラーメッセージを表示してBot起動を中止する
6. The SDD Orchestrator shall Bot Token入力フィールドをパスワード形式（マスク表示）で提供する

### Requirement 2: Discordチャンネル紐付け設定

**Objective:** As a ユーザー, I want 各プロジェクトにDiscordチャンネルを紐付けできること, so that 複数プロジェクトを1つのBotで管理できる

#### Acceptance Criteria

1. The SDD Orchestrator shall プロジェクト設定画面でDiscordチャンネルID入力フィールドを提供する
2. The SDD Orchestrator shall プロジェクト設定画面で通知チャンネルID入力フィールドを提供する
3. When ユーザーがチャンネルIDを入力した場合, the SDD Orchestrator shall 入力値をプロジェクト設定ファイルに保存する
4. If 同一チャンネルIDが複数プロジェクトに設定されている場合, the SDD Orchestrator shall 警告メッセージを表示する
5. The SDD Orchestrator shall チャンネル紐付け設定をプロジェクトの`.kiro/settings/discord.json`に保存する

### Requirement 3: Discord Bot起動・終了制御

**Objective:** As a ユーザー, I want Electronアプリ経由でDiscord Botを起動・終了できること, so that 必要な時だけBotを稼働させられる

#### Acceptance Criteria

1. The SDD Orchestrator shall メイン画面にDiscord Bot起動/停止トグルボタンを表示する
2. When ユーザーがBot起動ボタンをクリックした場合, the SDD Orchestrator shall Discord Botプロセスを起動する
3. When ユーザーがBot停止ボタンをクリックした場合, the SDD Orchestrator shall Discord Botプロセスを停止する
4. While Discord Botが起動中の場合, the SDD Orchestrator shall Botステータスインジケーターを「オンライン」表示にする
5. While Discord Botが停止中の場合, the SDD Orchestrator shall Botステータスインジケーターを「オフライン」表示にする
6. When Electronアプリが終了する場合, the SDD Orchestrator shall 自動的にDiscord Botプロセスを終了する
7. If Bot起動中にエラーが発生した場合, the SDD Orchestrator shall エラー内容を通知エリアに表示する

### Requirement 4: Botステータス通知

**Objective:** As a ユーザー, I want Botの起動・終了時にDiscordチャンネルへ通知が送信されること, so that Bot稼働状況を把握できる

#### Acceptance Criteria

1. When Discord Botが起動した場合, the SDD Orchestrator shall 通知チャンネルに起動メッセージを送信する
2. When Discord Botが終了する場合, the SDD Orchestrator shall 通知チャンネルに終了メッセージを送信する
3. The SDD Orchestrator shall 起動メッセージにBot名、起動時刻、管理プロジェクト数を含める
4. The SDD Orchestrator shall 終了メッセージにBot名、終了時刻を含める
5. If 通知チャンネルIDが未設定の場合, the SDD Orchestrator shall ステータス通知をスキップする

### Requirement 5: Discord Slash Command受信

**Objective:** As a ユーザー, I want DiscordからSlash Command（/sdd）を送信してClaude Codeを操作できること, so that Discordから開発指示を出せる

#### Acceptance Criteria

1. The SDD Orchestrator shall Discord Slash Command `/sdd` を登録する
2. When `/sdd <指示>` コマンドを受信した場合, the SDD Orchestrator shall 送信元チャンネルIDに紐付けられたプロジェクトを特定する
3. When プロジェクトが特定された場合, the SDD Orchestrator shall そのプロジェクトのClaude Codeプロセスに指示を送信する
4. If 送信元チャンネルIDに紐付けられたプロジェクトが存在しない場合, the SDD Orchestrator shall エラーメッセージをDiscordに返信する
5. If 対象プロジェクトのClaude Codeプロセスが起動していない場合, the SDD Orchestrator shall Claude Codeプロセスを自動起動してから指示を送信する
6. The SDD Orchestrator shall コマンド受信時に「処理中...」の一時応答をDiscordに送信する

### Requirement 6: 応答ストリーミング

**Objective:** As a ユーザー, I want Claude Codeの応答をリアルタイムでDiscordに表示できること, so that 処理進捗を確認できる

#### Acceptance Criteria

1. While Claude Codeが応答を生成している間, the SDD Orchestrator shall 応答内容をストリーミングでDiscordメッセージに反映する
2. The SDD Orchestrator shall ストリーミング更新間隔を1秒以上とする（Discord API制限対応）
3. When 応答が完了した場合, the SDD Orchestrator shall 最終応答をDiscordメッセージとして確定する
4. If 応答が2000文字を超える場合, the SDD Orchestrator shall 複数メッセージに分割して送信する
5. The SDD Orchestrator shall コードブロックを適切にMarkdown形式で表示する

### Requirement 7: AskQuestion対応（Discordボタン）

**Objective:** As a ユーザー, I want Claude Codeからの質問にDiscordボタンで回答できること, so that インタラクティブな操作ができる

#### Acceptance Criteria

1. When Claude CodeがAskQuestionを発行した場合, the SDD Orchestrator shall 質問内容をDiscordメッセージとして送信する
2. The SDD Orchestrator shall AskQuestion応答用のDiscordボタンUIを表示する
3. When ユーザーがボタンをクリックした場合, the SDD Orchestrator shall 選択された回答をClaude Codeに送信する
4. If AskQuestionがテキスト入力を要求している場合, the SDD Orchestrator shall Discordモーダルで入力フォームを表示する
5. The SDD Orchestrator shall ボタンにタイムアウト（5分）を設定する
6. If タイムアウトした場合, the SDD Orchestrator shall ボタンを無効化してタイムアウトメッセージを表示する

### Requirement 8: 詳細ログ折りたたみ表示

**Objective:** As a ユーザー, I want 詳細なログ情報を折りたたみ表示で確認できること, so that 重要な情報だけを素早く確認できる

#### Acceptance Criteria

1. When Claude Codeがツール実行ログを出力した場合, the SDD Orchestrator shall ログ詳細をDiscordの折りたたみ形式（spoiler）で送信する
2. The SDD Orchestrator shall 折りたたみ部分のタイトルにツール名と実行結果サマリーを表示する
3. The SDD Orchestrator shall 主要な応答テキストは折りたたまずに表示する
4. If ログ内容が1000文字を超える場合, the SDD Orchestrator shall 折りたたみ内でも省略表示してファイル添付を提案する

### Requirement 9: エラーハンドリングと復旧

**Objective:** As a ユーザー, I want Bot障害時に適切なエラー通知と自動復旧が行われること, so that 安定した運用ができる

#### Acceptance Criteria

1. If Discord API接続が切断された場合, the SDD Orchestrator shall 自動的に再接続を試みる
2. The SDD Orchestrator shall 再接続試行を最大5回まで指数バックオフで実行する
3. If 再接続に5回失敗した場合, the SDD Orchestrator shall Botを停止してエラー通知を表示する
4. When Bot接続エラーが発生した場合, the SDD Orchestrator shall エラー内容をアプリログに記録する
5. If Claude Codeプロセスがクラッシュした場合, the SDD Orchestrator shall Discordにエラーメッセージを送信する

### Requirement 10: セキュリティ

**Objective:** As a ユーザー, I want Bot Tokenや通信が安全に保護されること, so that セキュリティリスクを低減できる

#### Acceptance Criteria

1. The SDD Orchestrator shall Bot Tokenを暗号化してローカルストレージに保存する
2. The SDD Orchestrator shall Bot Tokenをログ出力時にマスクする
3. The SDD Orchestrator shall Discord APIとの通信にHTTPSを使用する
4. If 不正なチャンネルからコマンドを受信した場合, the SDD Orchestrator shall コマンドを無視してログに記録する
