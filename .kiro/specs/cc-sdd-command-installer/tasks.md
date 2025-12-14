# Implementation Plan

## Tasks

- [x] 1. kiroテンプレートフォルダの準備
- [x] 1.1 (P) Specワークフローコマンドテンプレートを作成
  - 7種類のSpecワークフローコマンド（spec-init, spec-requirements, spec-design, spec-tasks, spec-impl, spec-status, spec-quick）を`resources/templates/commands/kiro/`に配置
  - 既存の`.claude/commands/kiro/`からコマンドファイルをコピーし、リソースディレクトリに配置
  - _Requirements: 2.1_

- [x] 1.2 (P) バリデーションコマンドテンプレートを作成
  - 3種類のバリデーションコマンド（validate-gap, validate-design, validate-impl）をkiroテンプレートフォルダに追加
  - _Requirements: 2.2_

- [x] 1.3 (P) ドキュメントコマンドテンプレートを作成
  - 2種類のドキュメントコマンド（document-review, document-review-reply）をkiroテンプレートフォルダに追加
  - _Requirements: 2.3_

- [x] 1.4 (P) ステアリングコマンドテンプレートを作成
  - 2種類のステアリングコマンド（steering, steering-custom）をkiroテンプレートフォルダに追加
  - 全14ファイルが揃っていることを確認
  - _Requirements: 2.4, 2.5_

- [x] 1.5 (P) エージェントテンプレートを作成
  - 9種類のエージェント定義ファイルを`resources/templates/agents/kiro/`に配置
  - エージェント: spec-design, spec-impl, spec-requirements, spec-tasks, steering, steering-custom, validate-design, validate-gap, validate-impl
  - 既存の`.claude/agents/kiro/`からエージェントファイルをコピーし、リソースディレクトリに配置
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2. spec-managerテンプレートへのdocument-reviewコマンド追加
- [x] 2.1 spec-manager用document-reviewコマンドを作成
  - kiroテンプレートのdocument-review.mdをベースにspec-manager用バージョンを作成
  - コマンド参照を`/kiro:*`形式から`/spec-manager:*`形式に変換
  - document-review-reply.mdも同様に変換
  - 変換後も機能的に同等であることを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. CLAUDE.mdテンプレートの準備
- [x] 3.1 cc-sddワークフロー用CLAUDE.mdテンプレートを作成
  - `resources/templates/CLAUDE.md`にcc-sddワークフローセクションを含むテンプレートを配置
  - 新規プロジェクトへのインストール時に使用される基本テンプレート
  - _Requirements: 4.1_

- [x] 4. CcSddWorkflowInstallerサービスの実装
- [x] 4.1 CcSddWorkflowInstallerクラスの基本構造を実装
  - コンストラクタでテンプレートディレクトリを受け取る
  - CC_SDD_COMMANDS定数（14種類のコマンド名リスト）を定義
  - CC_SDD_AGENTS定数（9種類のエージェント名リスト）を定義
  - InstallOptions、InstallResult、InstallError型定義を実装
  - _Requirements: 3.1, 7.1_

- [x] 4.2 installCommandsメソッドを実装
  - 14個のkiroコマンドをターゲットプロジェクトの`.claude/commands/kiro/`にコピーする機能
  - 既存ファイルが存在しforce=falseの場合はスキップしてスキップリストに追加
  - force=trueの場合は上書きして上書きリストに追加
  - テンプレートファイルが見つからない場合はTEMPLATE_NOT_FOUNDエラーを返却
  - 書き込み失敗時はWRITE_ERRORまたはPERMISSION_DENIEDエラーを返却
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4.2.1 installAgentsメソッドを実装
  - 9個のkiroエージェントをターゲットプロジェクトの`.claude/agents/kiro/`にコピーする機能
  - 既存ファイルが存在しforce=falseの場合はスキップしてスキップリストに追加
  - force=trueの場合は上書きして上書きリストに追加
  - テンプレートファイルが見つからない場合はTEMPLATE_NOT_FOUNDエラーを返却
  - 書き込み失敗時はWRITE_ERRORまたはPERMISSION_DENIEDエラーを返却
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4.3 updateClaudeMdメソッドを実装
  - CLAUDE.mdが存在しない場合はテンプレートから新規作成
  - CLAUDE.mdが存在する場合は`claude --print`コマンドでセマンティック統合を実行
  - 環境変数PATHを使用してclaudeコマンドを実行
  - タイムアウトを60秒に設定
  - コマンド失敗時はMERGE_ERRORを返却
  - タイムアウト時はTIMEOUT_ERRORを返却
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 4.4 installAllメソッドを実装
  - installCommands、installAgents、updateClaudeMdを順次実行
  - コマンドインストール結果、エージェントインストール結果、CLAUDE.md更新結果をCcSddWorkflowInstallResultとして返却
  - _Requirements: 3.7_

- [x] 4.5 checkInstallStatusメソッドを実装
  - 各コマンドのインストール有無を確認してinstalled/missingリストを返却
  - 各エージェントのインストール有無を確認してinstalled/missingリストを返却
  - CLAUDE.mdの存在有無を確認
  - CLAUDE.md内のcc-sddセクションの有無を確認
  - ファイルシステムの実際の状態を反映した結果を返却
  - _Requirements: 3.8, 6.3, 6.4, 6.5_

- [x] 5. インストール結果とステータス管理
- [x] 5.1 インストール結果の型定義と戻り値を整備
  - InstallResultにinstalled、skipped、overwrittenリストを含める
  - ClaudeMdUpdateResultにcreated、merged、skippedステータスを含める
  - CcSddWorkflowInstallResultにcommands、agents、claudeMdを含める
  - CcSddWorkflowInstallStatusにcommands、agents、claudeMdのステータスを含める
  - _Requirements: 6.1, 6.2_

- [x] 6. IPCチャネルとハンドラの実装
- [x] 6.1 IPCチャネル定義を追加
  - MENU_INSTALL_CC_SDD_WORKFLOW、CHECK_CC_SDD_WORKFLOW_STATUS、INSTALL_CC_SDD_WORKFLOWチャネルを定義
  - preload/index.ts に IPC API を追加（checkCcSddWorkflowStatus, installCcSddWorkflow, onMenuInstallCcSddWorkflow）
  - electron.d.ts に対応する型定義を追加
  - _Requirements: 5.1_

- [x] 6.2 IPCハンドラを実装
  - CcSddWorkflowInstallerサービスを呼び出すハンドラを追加
  - インストールリクエストの受信とレスポンス送信を処理
  - ステータスチェックリクエストの処理
  - _Requirements: 5.1, 5.2_

- [x] 7. メニュー統合
- [x] 7.1 ツールメニューにエントリを追加
  - 「cc-sddコマンドセットをインストール...」メニュー項目を追加
  - プロジェクト未選択時はメニュー項目を無効化
  - クリック時にMENU_INSTALL_CC_SDD_WORKFLOWイベントを送信
  - _Requirements: 5.1, 5.5_

- [x] 7.2 レンダラープロセスでのダイアログ処理を実装
  - インストール確認ダイアログの表示
  - インストール完了後の結果サマリー表示
  - エラー発生時のエラーメッセージ表示
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 8. 既存コマンドとの互換性確認
- [x] 8.1 BugWorkflowInstallerとの互換性を確認
  - 同じインターフェース構造（InstallOptions, InstallResult, InstallError）を使用していることを確認
  - 両方のインストーラーが同一プロジェクトに実行された場合、互いのファイルを上書きしないことを確認
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 8.2 CommandInstallerServiceとの互換性を確認
  - 既存のCommandInstallerServiceの機能に影響を与えないことを確認
  - 別々のコマンドセット（kiro vs spec-manager）を独立して管理
  - _Requirements: 7.3_

- [x] 9. テスト実装
- [x] 9.1 (P) CcSddWorkflowInstallerのユニットテストを作成
  - installCommandsの正常系・エラー系テスト
  - installAgentsの正常系・エラー系テスト
  - updateClaudeMdの新規作成・セマンティック統合・エラー系テスト
  - checkInstallStatusの各種状態テスト（コマンド、エージェント、CLAUDE.md）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.2 並行動作テストを作成
  - BugWorkflowInstallerとCcSddWorkflowInstallerの並行実行テスト
  - 互いのファイルに影響しないことを確認するテスト
  - _Requirements: 7.2, 7.3, 7.4_
