# Implementation Plan: MCP Server Integration

## Task Overview

MCPサーバー機能をSDD Orchestratorに統合し、Claude Code等のMCPクライアントから直接Spec/Bug操作を可能にする。

---

## Tasks

- [x] 1. MCP依存追加とConfigStore拡張
- [x] 1.1 (P) MCP SDK依存パッケージの追加
  - @modelcontextprotocol/sdk をdevDependenciesに追加
  - package.jsonの更新とnpm install実行
  - _Requirements: 1.1_

- [x] 1.2 (P) ConfigStoreにMCP設定フィールドを追加
  - mcpServer設定（enabled, port）の追加
  - デフォルト値設定（enabled: true, port: 3001）
  - 既存のgetMcpSettings/setMcpSettings APIの追加
  - _Requirements: 5.3, 6.1_
  - _Method: ConfigStore_
  - _Verify: Grep "mcpServer|getMcpSettings|setMcpSettings" in configStore.ts_

- [x] 2. MCPサーバーコア実装
- [x] 2.1 McpServerService基盤実装
  - HTTP/SSEサーバーの起動・停止・状態管理
  - MCP SDKを使用したプロトコルハンドシェイク処理
  - ポート競合検出と適切なエラー返却
  - サーバー状態変更通知の購読機能
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_
  - _Method: MCP SDK McpServer, Express_
  - _Verify: Grep "McpServer|start|stop|getStatus" in mcpServerService.ts_

- [x] 2.2 McpToolRegistry実装
  - ツール登録・検索・実行管理
  - パラメータバリデーション（Zod）
  - プロジェクト未選択時の共通エラー処理
  - ハンドラへの実行委譲
  - _Requirements: 1.4_
  - _Method: McpToolRegistry, zod_
  - _Verify: Grep "McpToolRegistry|executeTool|getTools" in mcpToolRegistry.ts_

- [x] 3. プロジェクトスコープツール実装（project_*）
- [x] 3.1 (P) project_get_info ツール実装
  - プロジェクトパス、名前、各ディレクトリの存在有無を返す
  - 既存ファイルシステムAPIを活用
  - _Requirements: 2.1_
  - _Method: ProjectToolHandlers_
  - _Verify: Grep "project_get_info|getInfo" in projectToolHandlers.ts_

- [x] 3.2 (P) project_list_specs / project_list_bugs ツール実装
  - specManagerService.readSpecsを再利用してSpec一覧取得
  - bugService.readBugsを再利用してBug一覧取得
  - filterパラメータによる絞り込み機能
  - _Requirements: 2.2, 2.3, 2.4, 2.5_
  - _Method: ProjectToolHandlers, specManagerService, bugService_
  - _Verify: Grep "project_list_specs|project_list_bugs|listSpecs|listBugs" in projectToolHandlers.ts_

- [x] 3.3 (P) project_list_agents ツール実装
  - agentRegistry.getRunningAgentsを再利用してAgent一覧取得
  - _Requirements: 2.6_
  - _Method: ProjectToolHandlers, agentRegistry_
  - _Verify: Grep "project_list_agents|listAgents" in projectToolHandlers.ts_

- [x] 4. Specスコープツール実装（spec_*）
- [x] 4.1 spec_get / spec_get_artifact ツール実装
  - specManagerServiceを再利用してSpec詳細取得
  - fileService.readArtifactを再利用してアーティファクト取得
  - ARTIFACT_TYPES定義（requirements, design, tasks, inspection, document-review, reply）
  - 存在しない場合の適切なエラー返却
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Method: SpecToolHandlers, specManagerService, fileService_
  - _Verify: Grep "spec_get|spec_get_artifact|getArtifact|ARTIFACT_TYPES" in specToolHandlers.ts_

- [x] 4.2 spec_create / spec_approve ツール実装
  - specManagerService.createSpecを再利用してSpec作成
  - specManagerService.updateApprovalを再利用して承認
  - 重複作成時のエラーハンドリング
  - 全フェーズ（requirements, design, tasks）の承認サポート
  - _Requirements: 3.6, 3.7, 3.8, 3.9_
  - _Method: SpecToolHandlers, specManagerService_
  - _Verify: Grep "spec_create|spec_approve|createSpec|updateApproval" in specToolHandlers.ts_

- [x] 4.3 spec_start_execution / spec_stop_execution / spec_get_execution_status ツール実装
  - autoExecutionCoordinatorを再利用して自動実行制御
  - 実行状態の取得
  - _Requirements: 3.10, 3.11, 3.12_
  - _Method: SpecToolHandlers, autoExecutionCoordinator_
  - _Verify: Grep "spec_start_execution|spec_stop_execution|startExecution|stopExecution" in specToolHandlers.ts_

- [x] 4.4 spec_agent_stop / spec_agent_get_logs ツール実装
  - agentRegistry.stopAgentを再利用してAgent停止
  - logFileServiceを再利用してAgentログ取得
  - _Requirements: 3.13, 3.14_
  - _Method: SpecToolHandlers, agentRegistry, logFileService_
  - _Verify: Grep "spec_agent_stop|spec_agent_get_logs|stopAgent|getAgentLogs" in specToolHandlers.ts_

- [x] 5. Bugスコープツール実装（bug_*）
- [x] 5.1 bug_get / bug_get_artifact ツール実装
  - bugService.readBugDetailを再利用してBug詳細取得
  - fileService.readArtifactを再利用してアーティファクト取得
  - BUG_ARTIFACT_TYPES定義（bug, analysis, fix, verify）
  - 存在しない場合の適切なエラー返却
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Method: BugToolHandlers, bugService, fileService_
  - _Verify: Grep "bug_get|bug_get_artifact|BUG_ARTIFACT_TYPES" in bugToolHandlers.ts_

- [x] 5.2 bug_create / bug_update_phase ツール実装
  - bugServiceを再利用してBug作成
  - bugWorkflowServiceを再利用してフェーズ更新
  - 重複作成時のエラーハンドリング
  - _Requirements: 4.6, 4.7, 4.8_
  - _Method: BugToolHandlers, bugService, bugWorkflowService_
  - _Verify: Grep "bug_create|bug_update_phase|createBug|updatePhase" in bugToolHandlers.ts_

- [x] 5.3 bug_start_execution / bug_stop_execution / bug_get_execution_status ツール実装
  - bugAutoExecutionCoordinatorを再利用して自動実行制御
  - 実行状態の取得
  - _Requirements: 4.9, 4.10, 4.11_
  - _Method: BugToolHandlers, bugAutoExecutionCoordinator_
  - _Verify: Grep "bug_start_execution|bug_stop_execution|bugAutoExecutionCoordinator" in bugToolHandlers.ts_

- [x] 5.4 bug_agent_stop / bug_agent_get_logs ツール実装
  - agentRegistry.stopAgentを再利用してAgent停止
  - logFileServiceを再利用してAgentログ取得
  - _Requirements: 4.12, 4.13_
  - _Method: BugToolHandlers, agentRegistry, logFileService_
  - _Verify: Grep "bug_agent_stop|bug_agent_get_logs" in bugToolHandlers.ts_

- [x] 6. IPC連携とアプリ起動統合
- [x] 6.1 MCP関連IPCチャンネル定義
  - channels.tsにMCP関連チャンネル追加（mcp:start, mcp:stop, mcp:get-status, mcp:get-settings, mcp:set-enabled, mcp:set-port）
  - _Requirements: 6.3, 6.4, 6.5_
  - _Method: channels.ts_
  - _Verify: Grep "mcp:start|mcp:stop|mcp:get-status" in channels.ts_

- [x] 6.2 McpIpcHandlers実装
  - MCP関連IPCハンドラの実装
  - McpServerServiceとConfigStoreへの委譲
  - handlers.tsへの登録
  - _Requirements: 6.3, 6.4, 6.5_
  - _Method: McpIpcHandlers, handlers.ts_
  - _Verify: Grep "McpIpcHandlers|registerMcpHandlers" in mcpHandlers.ts_

- [x] 6.3 preload APIにMCP関連メソッド追加
  - preload/index.tsにMCP API追加
  - Renderer向けのmcpオブジェクト公開
  - _Requirements: 6.3, 6.4_
  - _Method: preload/index.ts_
  - _Verify: Grep "mcp:|mcpServer" in index.ts_

- [x] 6.4 アプリ起動時のMCPサーバー自動起動
  - index.tsにMCP自動起動ロジック追加
  - ConfigStoreからMCP設定読み取り
  - 有効な場合のみMcpServerService.start()を呼び出し
  - _Requirements: 6.1_
  - _Method: index.ts, McpServerService_
  - _Verify: Grep "mcpServerService|getMcpSettings" in index.ts_

- [x] 7. Renderer UI実装
- [x] 7.1 mcpStore実装（shared/stores）
  - MCPサーバー状態のRenderer側キャッシュ
  - isRunning, port, url状態管理
  - setStatus アクション
  - _Requirements: 6.9_
  - _Method: mcpStore, zustand_
  - _Verify: Grep "mcpStore|isRunning|setStatus" in mcpStore.ts_

- [x] 7.2 McpSettingsPanel実装
  - MCP有効/無効トグル
  - ポート番号設定
  - `claude mcp add`コマンド生成・コピー機能
  - プロジェクトパス含む完全なコマンド表示
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - _Method: McpSettingsPanel, electronAPI_
  - _Verify: Grep "McpSettingsPanel|claude mcp add|copyCommand" in McpSettingsPanel.tsx_

- [x] 7.3 McpStatusIndicator実装
  - MCPサーバー稼働状態アイコン表示
  - クリックでMCP設定ダイアログを開く（Desktop版のみ）
  - Remote UIではステータス表示のみ
  - PlatformProviderを活用したプラットフォーム判定
  - _Requirements: 6.9, 6.10_
  - _Method: McpStatusIndicator, PlatformProvider_
  - _Verify: Grep "McpStatusIndicator|PlatformProvider|isRunning" in McpStatusIndicator.tsx_

- [x] 7.4 RemoteAccessDialogにMcpSettingsPanelを統合
  - 既存のRemoteAccessDialogにMCPセクションを追加
  - CloudflareSettingsPanelと同様のUI/UXパターン
  - _Requirements: 6.2_
  - _Method: RemoteAccessDialog.tsx_
  - _Verify: Grep "McpSettingsPanel" in RemoteAccessDialog.tsx_

- [x] 7.5 HeaderにMcpStatusIndicatorを配置
  - 既存のSSHStatusIndicatorと同様の配置
  - App.tsxまたはHeader.tsxでの統合
  - _Requirements: 6.9_
  - _Method: App.tsx or Header.tsx_
  - _Verify: Grep "McpStatusIndicator" in App.tsx or Header.tsx_

- [x] 8. 結合テストと検証
- [x] 8.1 MCPサーバー起動・停止の動作検証
  - アプリ起動時の自動起動確認
  - 設定UIからの有効/無効切り替え確認
  - Remote UIとの同時起動確認
  - _Requirements: 1.1, 5.1, 6.1_

- [x] 8.2 MCPツール呼び出しの動作検証
  - project_*ツールの正常系確認
  - spec_*ツールの正常系確認
  - bug_*ツールの正常系確認
  - プロジェクト未選択時のエラー確認
  - _Requirements: 1.4, 2.1, 2.2, 2.4, 2.6, 3.1, 3.3, 4.1_

- [x] 8.3 ビルド・型チェック実行
  - `npm run build && npm run typecheck` の成功確認
  - 型エラーの解消
  - _Requirements: All_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | MCPサーバーがHTTP/SSE接続を受け付ける | 1.1, 2.1, 8.1 | Infrastructure, Feature |
| 1.2 | MCPハンドシェイク完了 | 2.1 | Feature |
| 1.3 | プロトコルバージョン互換性検証 | 2.1 | Feature |
| 1.4 | プロジェクト未選択時のエラー | 2.2, 8.2 | Feature |
| 2.1 | project_get_info | 3.1, 8.2 | Feature |
| 2.2 | project_list_specs | 3.2, 8.2 | Feature |
| 2.3 | project_list_specs filter | 3.2 | Feature |
| 2.4 | project_list_bugs | 3.2, 8.2 | Feature |
| 2.5 | project_list_bugs filter | 3.2 | Feature |
| 2.6 | project_list_agents | 3.3, 8.2 | Feature |
| 3.1 | spec_get | 4.1, 8.2 | Feature |
| 3.2 | spec_get存在しない場合エラー | 4.1 | Feature |
| 3.3 | spec_get_artifact | 4.1, 8.2 | Feature |
| 3.4 | artifact種類サポート | 4.1 | Feature |
| 3.5 | artifact存在しない場合エラー | 4.1 | Feature |
| 3.6 | spec_create | 4.2 | Feature |
| 3.7 | spec_create重複エラー | 4.2 | Feature |
| 3.8 | spec_approve | 4.2 | Feature |
| 3.9 | 全フェーズ承認サポート | 4.2 | Feature |
| 3.10 | spec_start_execution | 4.3 | Feature |
| 3.11 | spec_stop_execution | 4.3 | Feature |
| 3.12 | spec_get_execution_status | 4.3 | Feature |
| 3.13 | spec_agent_stop | 4.4 | Feature |
| 3.14 | spec_agent_get_logs | 4.4 | Feature |
| 4.1 | bug_get | 5.1, 8.2 | Feature |
| 4.2 | bug_get存在しない場合エラー | 5.1 | Feature |
| 4.3 | bug_get_artifact | 5.1 | Feature |
| 4.4 | bug artifact種類サポート | 5.1 | Feature |
| 4.5 | bug artifact存在しない場合エラー | 5.1 | Feature |
| 4.6 | bug_create | 5.2 | Feature |
| 4.7 | bug_create重複エラー | 5.2 | Feature |
| 4.8 | bug_update_phase | 5.2 | Feature |
| 4.9 | bug_start_execution | 5.3 | Feature |
| 4.10 | bug_stop_execution | 5.3 | Feature |
| 4.11 | bug_get_execution_status | 5.3 | Feature |
| 4.12 | bug_agent_stop | 5.4 | Feature |
| 4.13 | bug_agent_get_logs | 5.4 | Feature |
| 5.1 | MCPとRemote UI同時起動 | 2.1, 8.1 | Feature |
| 5.2 | 同一ポートエラー | 2.1 | Feature |
| 5.3 | MCPポート独立設定 | 1.2 | Infrastructure |
| 6.1 | アプリ起動時のMCP自動起動 | 1.2, 6.4, 8.1 | Feature |
| 6.2 | 設定画面MCPセクション | 7.2, 7.4 | Feature |
| 6.3 | MCPサーバー無効化 | 6.1, 6.2, 6.3, 7.2 | Feature |
| 6.4 | MCPサーバー有効化 | 6.1, 6.2, 6.3, 7.2 | Feature |
| 6.5 | ポート番号設定変更 | 6.1, 6.2, 7.2 | Feature |
| 6.6 | claude mcp addコマンド表示 | 7.2 | Feature |
| 6.7 | コマンドにプロジェクトパス含む | 7.2 | Feature |
| 6.8 | コピーボタン | 7.2 | Feature |
| 6.9 | ステータスインジケータ | 7.1, 7.3, 7.5 | Feature |
| 6.10 | Remote UIでのステータス表示のみ | 7.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
