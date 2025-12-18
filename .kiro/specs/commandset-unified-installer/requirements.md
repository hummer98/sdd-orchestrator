# Requirements Document

## Project Description (Input)
現在のまでの議論を実装

## Introduction

本機能は、SDD Managerにおいて複数のコマンドセットインストーラー（cc-sddワークフロー、Bugワークフロー、spec-managerコマンド）を統一的なインターフェースで管理・インストールするための統合インストーラー機能を提供する。現在、`CcSddWorkflowInstaller`と`BugWorkflowInstaller`が個別に存在しているが、これらを統一的に扱い、将来的な拡張性を確保したアーキテクチャを実現する。

## Requirements

### Requirement 1: 統合インストーラーインターフェース

**Objective:** 開発者として、複数のコマンドセットを統一的なインターフェースで管理したい。これにより、新しいコマンドセットの追加が容易になり、保守性が向上する。

#### Acceptance Criteria
1. The UnifiedCommandsetInstaller shall 複数のコマンドセットインストーラーを集約する統一インターフェースを提供すること
2. The UnifiedCommandsetInstaller shall cc-sddワークフロー、Bugワークフロー、spec-managerコマンドセットをサポートすること
3. When ユーザーがインストール対象のコマンドセットを指定した場合, the UnifiedCommandsetInstaller shall 指定されたコマンドセットのインストールを実行する
4. The UnifiedCommandsetInstaller shall `InstallOptions`インターフェース（force, dryRunオプション）をサポートすること
5. The UnifiedCommandsetInstaller shall 各コマンドセットの個別インストーラー（CcSddWorkflowInstaller, BugWorkflowInstaller等）をラップして利用すること
6. The UnifiedCommandsetInstaller shall インストール結果を統一的な`UnifiedInstallResult`型で返却すること

### Requirement 2: コマンドセット定義とメタデータ

**Objective:** アーキテクトとして、コマンドセットを拡張可能な方法で定義したい。これにより、新しいワークフローや機能を追加する際の変更コストを最小化できる。

#### Acceptance Criteria
1. The CommandsetDefinition shall コマンドセット名、説明、カテゴリ（workflow/utility）、含まれるファイルリストをメタデータとして持つこと
2. The CommandsetDefinition shall 依存関係（他のコマンドセットへの依存）を定義できること
3. The CommandsetDefinition shall インストール先パス（commands, agents, settings）の構造を定義すること
4. When 新しいコマンドセットを追加する場合, the UnifiedCommandsetInstaller shall CommandsetDefinitionを追加するだけで対応できること
5. The UnifiedCommandsetInstaller shall コマンドセット定義をJSON形式で管理し、実行時に読み込むこと
6. The CommandsetDefinition shall バージョン情報を含み、将来のアップグレード機能に備えること

### Requirement 3: 一括インストール機能

**Objective:** ユーザーとして、必要なコマンドセットをまとめてインストールしたい。これにより、新規プロジェクトのセットアップが効率化される。

#### Acceptance Criteria
1. When ユーザーが`installAll`メソッドを実行した場合, the UnifiedCommandsetInstaller shall 全ての利用可能なコマンドセットをインストールする
2. When ユーザーが特定のコマンドセットグループ（例: "full-sdd", "lightweight"）を指定した場合, the UnifiedCommandsetInstaller shall そのグループに含まれるコマンドセットをインストールする
3. While 一括インストール実行中, the UnifiedCommandsetInstaller shall 進行状況（何%完了、現在処理中のコマンドセット）をコールバックで通知する
4. If いずれかのコマンドセットのインストールが失敗した場合, then the UnifiedCommandsetInstaller shall 失敗したコマンドセットをスキップして継続し、最終結果で失敗情報を返す
5. The UnifiedCommandsetInstaller shall インストール順序を依存関係に基づいて自動的に決定すること
6. The UnifiedCommandsetInstaller shall `dryRun`オプションでインストールのシミュレーションを実行できること

### Requirement 4: インストール状況の一元管理

**Objective:** ユーザーとして、全てのコマンドセットのインストール状況を一箇所で確認したい。これにより、プロジェクトのセットアップ状態を把握しやすくなる。

#### Acceptance Criteria
1. When ユーザーが`checkAllInstallStatus`メソッドを実行した場合, the UnifiedCommandsetInstaller shall 全てのコマンドセットのインストール状況を返す
2. The インストール状況 shall コマンドセットごとに、インストール済みファイル数、不足ファイル数、CLAUDE.md統合状況を含むこと
3. The UnifiedCommandsetInstaller shall インストール完全性スコア（0-100%）を計算して返すこと
4. When コマンドセットが部分的にインストールされている場合, the UnifiedCommandsetInstaller shall 不足しているコンポーネントのリストを明示する
5. The UnifiedCommandsetInstaller shall プロジェクトに必要な最小限のコマンドセットが揃っているかを判定する`isMinimalSetupComplete`メソッドを提供すること

### Requirement 5: CLAUDE.md統合の統一処理

**Objective:** 開発者として、複数のコマンドセットのCLAUDE.md更新を統一的に処理したい。これにより、CLAUDE.mdの一貫性が保たれ、重複や競合を避けられる。

#### Acceptance Criteria
1. When 複数のコマンドセットが同時にインストールされる場合, the UnifiedCommandsetInstaller shall CLAUDE.mdへの統合を一度だけ実行すること
2. The UnifiedCommandsetInstaller shall 各コマンドセットのCLAUDE.mdセクションを適切な位置に配置すること（Feature Development → Bug Fix → その他の順序）
3. If CLAUDE.mdに既に同一のセクションが存在する場合, then the UnifiedCommandsetInstaller shall そのセクションを更新せずスキップする
4. The UnifiedCommandsetInstaller shall `claude -p`コマンドによるセマンティック統合を優先的に使用すること
5. If `claude -p`コマンドが利用できない場合, then the UnifiedCommandsetInstaller shall フォールバック処理として単純なテキストマージを実行する
6. The UnifiedCommandsetInstaller shall CLAUDE.md更新の詳細ログ（追加されたセクション、スキップされたセクション）を返すこと

### Requirement 6: 設定ファイルの統合管理

**Objective:** 開発者として、コマンドセットに関連する設定ファイル（.kiro/settings/配下）を統合的に管理したい。これにより、設定の一貫性と完全性が保証される。

#### Acceptance Criteria
1. When 複数のコマンドセットがインストールされる場合, the UnifiedCommandsetInstaller shall 重複する設定ファイルを検出して適切に処理する
2. If 複数のコマンドセットが同一の設定ファイルを含む場合, then the UnifiedCommandsetInstaller shall より新しいバージョンまたはより完全な設定ファイルを優先する
3. The UnifiedCommandsetInstaller shall 設定ファイルのマージ戦略（overwrite/merge/skip）をファイルタイプごとに定義すること
4. The UnifiedCommandsetInstaller shall rules/、templates/specs/、templates/bugs/の各ディレクトリに必要な全ファイルが揃っていることを検証すること
5. When 設定ファイルの競合が検出された場合, the UnifiedCommandsetInstaller shall ユーザーに競合内容を通知し、選択を求めること（Phase 2対応: インタラクティブモード）

### Requirement 7: パーミッション管理の統合

**Objective:** 開発者として、コマンドセットに必要なClaude Codeパーミッションを自動的に設定したい。これにより、インストール後すぐにコマンドセットが動作する環境が整う。

#### Acceptance Criteria
1. When コマンドセットがインストールされる場合, the UnifiedCommandsetInstaller shall そのコマンドセットが必要とするパーミッションをsettings.local.jsonに追加する
2. The UnifiedCommandsetInstaller shall パーミッションの重複を検出して自動的に除外すること
3. The UnifiedCommandsetInstaller shall `REQUIRED_PERMISSIONS`定数で定義されたパーミッションリストを統合的に管理すること
4. If settings.local.jsonが存在しない場合, then the UnifiedCommandsetInstaller shall 新規にファイルを作成してパーミッションを設定する
5. If パーミッション追加に失敗した場合, then the UnifiedCommandsetInstaller shall エラーをログに記録するが、インストール全体は失敗させない（警告扱い）

### Requirement 8: インストールプロファイル機能

**Objective:** ユーザーとして、使用目的に応じたコマンドセットの組み合わせ（プロファイル）を選択したい。これにより、初心者でも適切なセットアップを簡単に実行できる。

#### Acceptance Criteria
1. The UnifiedCommandsetInstaller shall 事前定義されたプロファイル（"cc-sdd", "cc-sdd-agent", "spec-manager"）を提供すること
2. When ユーザーが"cc-sdd"プロファイルを選択した場合, the UnifiedCommandsetInstaller shall cc-sddコマンド + bug + document-reviewをインストールする
3. When ユーザーが"cc-sdd-agent"プロファイルを選択した場合, the UnifiedCommandsetInstaller shall cc-sdd-agentコマンド + bug + document-review + エージェントをインストールする
4. When ユーザーが"spec-manager"プロファイルを選択した場合, the UnifiedCommandsetInstaller shall spec-managerコマンド + bug + document-reviewをインストールする
5. The UnifiedCommandsetInstaller shall 各プロファイルに共通でbug, document-reviewコマンドセットを含めること
6. The UnifiedCommandsetInstaller shall カスタムプロファイルの定義をサポートし、JSON形式でプロファイルを保存・読み込みできること

### Requirement 9: ロールバック機能

**Objective:** ユーザーとして、インストールに問題があった場合に元の状態に戻したい。これにより、安全にコマンドセットの導入を試すことができる。

#### Acceptance Criteria
1. When インストールが開始される場合, the UnifiedCommandsetInstaller shall 変更されるファイルのバックアップを作成する
2. When ユーザーが`rollback`メソッドを実行した場合, the UnifiedCommandsetInstaller shall 最後のインストール操作で変更されたファイルを元に戻す
3. The UnifiedCommandsetInstaller shall ロールバック可能な操作履歴を`.kiro/.install-history.json`に保存すること
4. If ロールバック中にエラーが発生した場合, then the UnifiedCommandsetInstaller shall 復元できなかったファイルのリストをユーザーに通知する
5. The UnifiedCommandsetInstaller shall ロールバック履歴を最大10件まで保持すること
6. The UnifiedCommandsetInstaller shall CLAUDE.mdのロールバックもサポートすること（バックアップからの復元）

### Requirement 10: UIとの統合

**Objective:** ユーザーとして、Electron GUIからコマンドセットインストーラーを簡単に操作したい。これにより、コマンドライン操作に不慣れなユーザーでも利用できる。

#### Acceptance Criteria
1. The ElectronアプリのToolsメニュー shall 「コマンドセットをインストール...」メニュー項目を含むこと
2. When メニュー項目が選択された場合, the Electronアプリ shall インストールプロファイル選択ダイアログを表示する
3. The インストールダイアログ shall 各プロファイルの説明と含まれるコマンドセットのリストを表示すること
4. When インストールが実行される場合, the Electronアプリ shall 進行状況バー（プログレスバー）を表示する
5. When インストールが完了した場合, the Electronアプリ shall インストール結果サマリー（成功/スキップ/失敗の件数）をダイアログで表示する
6. If エラーが発生した場合, then the Electronアプリ shall エラー詳細とロールバックオプションを提示する
7. While プロジェクトが選択されていない間, the メニュー項目 shall 無効化されること

### Requirement 11: インストール後の検証

**Objective:** 開発者として、インストールが正しく完了したことを自動的に検証したい。これにより、インストール後すぐにコマンドが使用可能であることを保証できる。

#### Acceptance Criteria
1. When インストールが完了した場合, the UnifiedCommandsetInstaller shall 全てのコマンドファイルの存在を検証する
2. When インストールが完了した場合, the UnifiedCommandsetInstaller shall 全てのエージェントファイルの存在を検証する
3. When インストールが完了した場合, the UnifiedCommandsetInstaller shall 全ての設定ファイルの存在を検証する
4. The UnifiedCommandsetInstaller shall 各ファイルの基本的な構造（Markdownフォーマット、必須セクション）を検証すること
5. If 検証に失敗したファイルが存在する場合, then the UnifiedCommandsetInstaller shall 検証エラーレポートを生成し、不完全なインストールとして通知する
6. The UnifiedCommandsetInstaller shall CLAUDE.mdに必要なセクションが全て含まれていることを検証すること

### Requirement 12: 既存インストーラーとの共存

**Objective:** アーキテクトとして、既存のCcSddWorkflowInstallerとBugWorkflowInstallerと共存できるようにしたい。これにより、段階的な移行が可能になる。

#### Acceptance Criteria
1. The UnifiedCommandsetInstaller shall 既存のCcSddWorkflowInstallerとBugWorkflowInstallerをラップして内部で利用すること
2. The UnifiedCommandsetInstaller shall 既存のインストーラーの公開インターフェース（InstallOptions, InstallResult等）と互換性を保つこと
3. When 既存のインストーラーAPIが使用される場合, the UnifiedCommandsetInstaller shall 同等の動作を保証すること
4. The UnifiedCommandsetInstaller shall 既存インストーラーが生成するファイルと競合しないこと
5. The プロジェクト shall 既存のCcSddWorkflowInstallerとBugWorkflowInstallerを使用しているコードを段階的に移行できること

### Requirement 13: ログとデバッグ情報

**Objective:** 開発者として、インストールプロセスの詳細なログを取得したい。これにより、問題発生時の原因特定が容易になる。

#### Acceptance Criteria
1. The UnifiedCommandsetInstaller shall インストール操作の全てのステップを構造化ログとして出力すること
2. The UnifiedCommandsetInstaller shall ログレベル（DEBUG, INFO, WARN, ERROR）を設定可能にすること
3. When エラーが発生した場合, the UnifiedCommandsetInstaller shall スタックトレースと関連するコンテキスト情報（ファイルパス、実行中のステップ）を含むこと
4. The UnifiedCommandsetInstaller shall ログをファイル（`.kiro/.install.log`）に保存すること
5. The UnifiedCommandsetInstaller shall インストール統計（処理時間、ファイル数、成功率）をログに記録すること
6. When デバッグモードが有効な場合, the UnifiedCommandsetInstaller shall より詳細な内部状態（各インストーラーの戻り値、ファイルシステム操作の詳細）をログに出力すること

### Requirement 14: アップデート機能

**Implementation Phase**: Phase 2 (Future)

**Objective:** ユーザーとして、既にインストールされているコマンドセットを最新版に更新したい。これにより、新機能や改善を簡単に取り込める。本要件は初回リリースではスケルトン実装とし、Phase 2で完全実装する。

#### Acceptance Criteria
1. When ユーザーが`updateAll`メソッドを実行した場合, the UnifiedCommandsetInstaller shall 全てのインストール済みコマンドセットを最新版に更新する
2. The UnifiedCommandsetInstaller shall 各コマンドファイルのバージョンを検出し、更新が必要かを判定すること
3. When 更新が利用可能な場合, the UnifiedCommandsetInstaller shall 変更内容のサマリー（追加されたコマンド、変更されたテンプレート）を表示する
4. The UnifiedCommandsetInstaller shall 更新前に自動的にバックアップを作成すること
5. If ユーザーがカスタマイズしたファイルが検出された場合, then the UnifiedCommandsetInstaller shall マージ方法（上書き/保持/マニュアルマージ）をユーザーに確認する
6. The UnifiedCommandsetInstaller shall 更新後に検証を実行し、全てのコマンドが正常に動作することを確認すること
