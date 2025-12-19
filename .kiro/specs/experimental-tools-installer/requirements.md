# Requirements Document

## Project Description (Input)
Electron SDD Managerの「ツール」メニューに、実験的なslash commands/agentsをプロジェクトにインストールする機能を追加する。具体的には、(1) Planコマンド(.claude/commands/plan.md)のインストール、(2) Debugエージェント(.claude/agents/debug.md + CLAUDE.mdへのセマンティックマージ)のインストール、(3) Commitコマンド(.claude/commands/commit.md)のインストールの3つのメニュー項目を追加する。また、プロジェクト情報を収集して.kiro/steering/debugging.mdを生成する/kiro:steering-debugコマンドを新規追加する。テンプレートファイルはelectron-sdd-manager/resources/templates/配下にバンドルし、メニューには「(実験的)」を表記、既存ファイルがある場合は警告ダイアログを表示する。

## Introduction

本仕様は、Electron SDD Managerの「ツール」メニューに実験的なslash commands/agentsのインストール機能を追加するものである。開発者がプロジェクトに対して、Planコマンド、Debugエージェント、Commitコマンドといった追加ツールを簡単に導入できるようにする。これらのツールは正式サポート外の実験的機能として提供され、ユーザーが明示的に認識できるようメニュー表示に「(実験的)」を含める。

## Requirements

### Requirement 1: ツールメニュー構成
**Objective:** As a 開発者, I want 実験的ツールのインストールメニューをツールメニューから利用できるようにしたい, so that 追加ツールを簡単にプロジェクトに導入できる

#### Acceptance Criteria
1. The SDD Manager shall 「ツール」メニューに3つの実験的ツールインストール項目を表示する
2. The SDD Manager shall 各メニュー項目に「(実験的)」の表記を含める
3. When プロジェクトが開かれていない状態で実験的ツールメニューがクリックされた場合, the SDD Manager shall メニュー項目を無効化または適切なエラーメッセージを表示する

### Requirement 2: Planコマンドのインストール
**Objective:** As a 開発者, I want Planコマンドをプロジェクトにインストールしたい, so that spec-initの前段階でプランニングを行える

#### Acceptance Criteria
1. When 「Planコマンドをインストール (実験的)」メニューが選択された場合, the SDD Manager shall バンドルされたテンプレートから `.claude/commands/plan.md` をプロジェクトにコピーする
2. If インストール先に `.claude/commands/plan.md` が既に存在する場合, the SDD Manager shall 上書き確認の警告ダイアログを表示する
3. When ユーザーが警告ダイアログで「キャンセル」を選択した場合, the SDD Manager shall インストール処理を中止する
4. When インストールが完了した場合, the SDD Manager shall 成功メッセージを表示する

### Requirement 3: Debugエージェントのインストール
**Objective:** As a 開発者, I want Debugエージェントをプロジェクトにインストールしたい, so that デバッグ専用のサブエージェントを利用できる

#### Acceptance Criteria
1. When 「Debugエージェントをインストール (実験的)」メニューが選択された場合, the SDD Manager shall バンドルされたテンプレートから `.claude/agents/debug.md` をプロジェクトにコピーする
2. When `.claude/agents/debug.md` のコピーが完了した場合, the SDD Manager shall Claude CLI経由でCLAUDE.mdにデバッグセクションをセマンティックマージする
3. If インストール先に `.claude/agents/debug.md` が既に存在する場合, the SDD Manager shall 上書き確認の警告ダイアログを表示する
4. The SDD Manager shall セマンティックマージ用のプロンプトにテンプレート内容を埋め込んでClaude CLIに渡す
5. If CLAUDE.mdが存在しない場合, the SDD Manager shall Claude CLIに新規作成を委任する
6. When インストールが完了した場合, the SDD Manager shall 成功メッセージを表示する

### Requirement 4: Commitコマンドのインストール
**Objective:** As a 開発者, I want Commitコマンドをプロジェクトにインストールしたい, so that コミット操作を効率化できる

#### Acceptance Criteria
1. When 「Commitコマンドをインストール (実験的)」メニューが選択された場合, the SDD Manager shall バンドルされたテンプレートから `.claude/commands/commit.md` をプロジェクトにコピーする
2. If インストール先に `.claude/commands/commit.md` が既に存在する場合, the SDD Manager shall 上書き確認の警告ダイアログを表示する
3. When ユーザーが警告ダイアログで「キャンセル」を選択した場合, the SDD Manager shall インストール処理を中止する
4. When インストールが完了した場合, the SDD Manager shall 成功メッセージを表示する

### Requirement 5: テンプレートのバンドル
**Objective:** As a 開発者, I want インストール用テンプレートがアプリにバンドルされていてほしい, so that オフライン環境でもツールをインストールできる

#### Acceptance Criteria
1. The SDD Manager shall `electron-sdd-manager/resources/templates/` 配下に以下の構成でテンプレートをバンドルする: `commands/plan.md`, `commands/commit.md`, `agents/debug.md`, `claude-md-snippets/debug-section.md`
2. The SDD Manager shall ビルド時にテンプレートファイルをアプリケーションリソースとして含める
3. The SDD Manager shall 実行時にバンドルされたテンプレートファイルにアクセスできる

### Requirement 6: steering-debugコマンドの追加
**Objective:** As a 開発者, I want /kiro:steering-debugコマンドでデバッグ用steeringファイルを生成したい, so that Debugエージェントに必要なプロジェクト情報を自動収集できる

#### Acceptance Criteria
1. The steering-debug command shall `/kiro:steering-debug` スラッシュコマンドとして `.claude/commands/kiro/` に配置される
2. When `/kiro:steering-debug` が実行された場合, the steering-debug command shall プロジェクトの起動方法、MCP設定、E2Eコマンドラインツール、ログ参照方法、トラブルシューティングノウハウを収集する
3. When 情報収集が完了した場合, the steering-debug command shall `.kiro/steering/debugging.md` を生成する
4. When 情報収集後に不明点がある場合, the steering-debug command shall ユーザーに質問する
5. If `.kiro/steering/debugging.md` が既に存在する場合, the steering-debug command shall 上書き確認を行う

### Requirement 7: エラーハンドリング
**Objective:** As a 開発者, I want インストール失敗時に適切なエラーメッセージを受け取りたい, so that 問題を特定し対処できる

#### Acceptance Criteria
1. If テンプレートファイルの読み込みに失敗した場合, the SDD Manager shall エラー詳細を含むエラーダイアログを表示する
2. If ファイルのコピーに失敗した場合, the SDD Manager shall エラー詳細を含むエラーダイアログを表示する
3. If Claude CLIの呼び出しに失敗した場合, the SDD Manager shall エラー詳細を含むエラーダイアログを表示する
4. If ディレクトリ `.claude/commands/` または `.claude/agents/` が存在しない場合, the SDD Manager shall 必要なディレクトリを自動作成する
