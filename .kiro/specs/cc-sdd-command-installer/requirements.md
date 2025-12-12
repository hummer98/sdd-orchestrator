# Requirements Document

## Introduction

本機能は、SDD ManagerのElectronアプリケーションにおいて、cc-sdd（Claude Code Spec-Driven Development）コマンドセットを外部プロジェクトにインストールする機能を提供する。既存のBugWorkflowInstallerと同様の構造で、ツールメニューから「cc-sddコマンドセットをインストール...」を選択することで、14種類のkiroコマンド、2種類のdocument-reviewコマンド（spec-manager参照形式）、および関連テンプレートをターゲットプロジェクトにコピーし、CLAUDE.mdをセマンティック統合する。

## Requirements

### Requirement 1: spec-managerテンプレートへのdocument-reviewコマンド追加

**Objective:** As a 開発者, I want spec-managerテンプレートフォルダにdocument-review関連コマンドが含まれている, so that spec-managerワークフローでもドキュメントレビュー機能を使用できる

#### Acceptance Criteria
1. The CcSddWorkflowInstaller shall spec-managerテンプレートフォルダに`document-review.md`を含める
2. The CcSddWorkflowInstaller shall spec-managerテンプレートフォルダに`document-review-reply.md`を含める
3. When spec-managerテンプレートをコピーする際, the CcSddWorkflowInstaller shall コマンド参照を`/kiro:*`から`/spec-manager:*`形式に変換する
4. The spec-managerテンプレート shall コマンド参照の変換後も機能的に同等であること

### Requirement 2: kiroテンプレートフォルダの作成

**Objective:** As a 開発者, I want kiro専用のテンプレートフォルダが存在する, so that 14種類のcc-sddコマンドを一括管理できる

#### Acceptance Criteria
1. The CcSddWorkflowInstaller shall kiroテンプレートフォルダに以下のSpecワークフローコマンドを含める: `spec-init`, `spec-requirements`, `spec-design`, `spec-tasks`, `spec-impl`, `spec-status`, `spec-quick`
2. The CcSddWorkflowInstaller shall kiroテンプレートフォルダに以下のバリデーションコマンドを含める: `validate-gap`, `validate-design`, `validate-impl`
3. The CcSddWorkflowInstaller shall kiroテンプレートフォルダに以下のドキュメントコマンドを含める: `document-review`, `document-review-reply`
4. The CcSddWorkflowInstaller shall kiroテンプレートフォルダに以下のステアリングコマンドを含める: `steering`, `steering-custom`
5. The kiroテンプレートフォルダ shall 合計14ファイルを含むこと

### Requirement 3: CcSddWorkflowInstallerサービスの実装

**Objective:** As a 開発者, I want BugWorkflowInstallerと同様の構造を持つCcSddWorkflowInstallerサービス, so that コマンドとテンプレートを一貫した方法でインストールできる

#### Acceptance Criteria
1. The CcSddWorkflowInstaller shall テンプレートディレクトリを引数として初期化できること
2. When `installCommands`メソッドが呼ばれた際, the CcSddWorkflowInstaller shall 14個のkiroコマンドをターゲットプロジェクトの`.claude/commands/kiro/`にコピーする
3. When ファイルが既に存在し`force`オプションがfalseの場合, the CcSddWorkflowInstaller shall 既存ファイルをスキップしてスキップリストに追加する
4. When ファイルが既に存在し`force`オプションがtrueの場合, the CcSddWorkflowInstaller shall ファイルを上書きして上書きリストに追加する
5. If テンプレートファイルが見つからない場合, then the CcSddWorkflowInstaller shall `TEMPLATE_NOT_FOUND`エラーを返す
6. If ファイル書き込みに失敗した場合, then the CcSddWorkflowInstaller shall 適切なエラータイプ（`WRITE_ERROR`または`PERMISSION_DENIED`）を返す
7. The CcSddWorkflowInstaller shall `installAll`メソッドでコマンド、テンプレート、CLAUDE.md更新を一括実行できること
8. The CcSddWorkflowInstaller shall `checkInstallStatus`メソッドでインストール状況を確認できること

### Requirement 4: CLAUDE.mdセマンティック統合

**Objective:** As a 開発者, I want 既存のCLAUDE.mdとテンプレートをセマンティックに統合できる, so that ユーザーのカスタマイズを保持しながら新機能を追加できる

#### Acceptance Criteria
1. When CLAUDE.mdが存在しない場合, the CcSddWorkflowInstaller shall テンプレートからCLAUDE.mdを新規作成する
2. When CLAUDE.mdが既に存在する場合, the CcSddWorkflowInstaller shall `claude -p`コマンドを使用してセマンティック統合を実行する
3. The CcSddWorkflowInstaller shall `claude -p`コマンドの実行に環境変数PATHを使用する
4. The CcSddWorkflowInstaller shall `claude -p`コマンドのタイムアウトを60秒に設定する
5. If `claude -p`コマンドが失敗した場合, then the CcSddWorkflowInstaller shall `MERGE_ERROR`を返す
6. If `claude -p`コマンドがタイムアウトした場合, then the CcSddWorkflowInstaller shall タイムアウトエラーを返す
7. The セマンティック統合 shall ユーザーのカスタマイズ内容を保持すること
8. The セマンティック統合 shall テンプレートの新しいセクションを追加すること

### Requirement 5: メニュー統合

**Objective:** As a ユーザー, I want ツールメニューからcc-sddコマンドセットをインストールできる, so that GUIから簡単にコマンドセットを導入できる

#### Acceptance Criteria
1. The Application Menu shall 「ツール」メニュー配下に「cc-sddコマンドセットをインストール...」項目を含むこと
2. When メニュー項目が選択された際, the Application shall インストール確認ダイアログを表示する
3. When インストールが完了した際, the Application shall インストール結果サマリーを表示する
4. If インストールに失敗した場合, then the Application shall エラーメッセージを表示する
5. While プロジェクトが選択されていない間, the メニュー項目 shall 無効化されること

### Requirement 6: インストール結果とステータス管理

**Objective:** As a 開発者, I want インストール結果とステータスを適切に管理できる, so that インストール状況を把握し問題をトラブルシュートできる

#### Acceptance Criteria
1. The CcSddWorkflowInstaller shall インストール結果として`installed`（新規）、`skipped`（スキップ）、`overwritten`（上書き）のリストを返す
2. The CcSddWorkflowInstaller shall CLAUDE.md更新結果として`created`、`merged`、`skipped`のステータスを返す
3. The `checkInstallStatus`メソッド shall 各コマンドのインストール有無を返す
4. The `checkInstallStatus`メソッド shall CLAUDE.mdの存在有無とcc-sddセクションの有無を返す
5. When ステータスチェックが実行された際, the CcSddWorkflowInstaller shall ファイルシステムの実際の状態を反映した結果を返す

### Requirement 7: 既存コマンドとの互換性

**Objective:** As a 開発者, I want 既存のBugWorkflowInstallerおよびCommandInstallerServiceとの互換性を維持する, so that 既存機能を壊さずに新機能を追加できる

#### Acceptance Criteria
1. The CcSddWorkflowInstaller shall BugWorkflowInstallerと同じインターフェース構造（InstallOptions, InstallResult, InstallError）を使用する
2. The CcSddWorkflowInstaller shall 既存のBugWorkflowInstallerと並行して動作すること
3. The CcSddWorkflowInstaller shall 既存のCommandInstallerServiceの機能に影響を与えないこと
4. When 両方のインストーラーが同一プロジェクトに実行された場合, the インストーラー shall 互いのファイルを上書きしないこと
