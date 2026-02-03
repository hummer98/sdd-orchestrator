# Implementation Plan

## 1. EngineCommandResolverServiceの作成

- [x] 1.1 EngineCommandResolverServiceを実装する
  - `engineId`からLLM CLIのコマンドパスを解決するサービスを作成
  - `'claude'`の場合は`ClaudePathResolverService`に委譲してパスを取得
  - 将来のエンジン追加に対応できる`switch`文による拡張ポイントを設ける
  - `E2E_MOCK_CLAUDE_COMMAND`環境変数のサポートは`ClaudePathResolverService`経由で維持
  - Singletonパターンで実装し、`getEngineCommandResolverService()`でインスタンス取得
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: ClaudePathResolverService.getClaudePath, getEngineCommandResolverService_
  - _Verify: Grep "EngineCommandResolverService" in engineCommandResolverService.ts_

## 2. SpecManagerServiceのstartAgent API変更

- [x] 2.1 StartAgentOptionsから`command`パラメータを削除する
  - `StartAgentOptions`型から`command: string`フィールドを削除
  - `engineId?: LLMEngineId`はオプショナルのまま維持（デフォルト`'claude'`）
  - _Requirements: 1.1, 1.2_
  - _Method: StartAgentOptions_
  - _Verify: Grep "command:" NOT in StartAgentOptions definition_

- [x] 2.2 startAgent内部でEngineCommandResolverServiceを使用する
  - `startAgent`メソッド内で`EngineCommandResolverService.resolveCommand()`を呼び出し
  - `isClaudeCommand`チェックを`engineId === 'claude'`に変更
  - `getClaudeCommand()`の直接呼び出しを削除
  - _Requirements: 1.3, 1.4, 3.2_
  - _Method: EngineCommandResolverService.resolveCommand, engineId_
  - _Verify: Grep "resolveCommand" in specManagerService.ts_

## 3. IPCハンドラーの更新

- [x] 3.1 (P) handlers.tsの`command`パラメータを`engineId`に変更する
  - `EXECUTE_PROJECT_COMMAND`, `STEERING_VERIFICATION`, `GENERATE_RELEASE`, `BUG_WORKFLOW`の各ハンドラーを更新
  - `command: 'claude'`を`engineId: 'claude'`に置換
  - _Requirements: 3.1, 3.3_
  - _Verify: Grep "engineId:" in handlers.ts_

- [x] 3.2 (P) agentHandlers.tsのSTART_AGENTハンドラーを更新する
  - `command`パラメータの受け取りを削除
  - `engineId`パラメータを使用するよう変更
  - _Requirements: 3.1_
  - _Verify: Grep "engineId" in agentHandlers.ts_

- [x] 3.3 (P) bugHandlers.tsの`command`パラメータを`engineId`に変更する
  - バグワークフロー関連のハンドラーを更新
  - `command: 'claude'`を`engineId: 'claude'`に置換
  - _Requirements: 3.1, 3.3_
  - _Verify: Grep "engineId:" in bugHandlers.ts_

- [x] 3.4 (P) specHandlers.tsを`engineId`方式に更新する
  - Spec実行関連のハンドラーを更新
  - 内部でサービス層に`engineId`を渡すよう変更
  - _Requirements: 3.1_
  - _Verify: Grep "engineId" in specHandlers.ts_

- [x] 3.5 (P) installHandlers.tsの`command`パラメータを`engineId`に変更する
  - インストール関連のハンドラーを更新
  - `command: 'claude'`を`engineId: 'claude'`に置換
  - _Requirements: 3.1, 3.3_
  - _Verify: Grep "engineId:" in installHandlers.ts_

- [x] 3.6 (P) remoteAccessHandlers.tsの`command`パラメータを`engineId`に変更する
  - `WorkflowController`のエージェント起動処理を更新
  - `command: 'claude'`を`engineId: 'claude'`に置換
  - _Requirements: 3.1, 3.3, 7.2_
  - _Verify: Grep "engineId:" in remoteAccessHandlers.ts_

- [x] 3.7 (P) scheduleTaskHandlers.tsの`command`パラメータを`engineId`に変更する
  - スケジュール実行関連のハンドラーを更新
  - `command: 'claude'`を`engineId: 'claude'`に置換
  - _Requirements: 3.1, 3.3_
  - _Verify: Grep "engineId:" in scheduleTaskHandlers.ts_

## 4. IPC/Preload APIの更新

- [x] 4.1 preload/index.tsのstartAgent APIを更新する
  - `startAgent`関数の`command`パラメータを削除
  - `engineId`パラメータを追加（オプショナル、デフォルト`'claude'`）
  - _Requirements: 4.1, 4.2_
  - _Verify: Grep "engineId" in preload/index.ts_

- [x] 4.2 (P) electron.d.tsの型定義を更新する
  - `startAgent`のシグネチャから`command`を削除
  - `engineId?: LLMEngineId`を追加
  - _Requirements: 4.3_
  - _Verify: Grep "engineId" in electron.d.ts_

- [x] 4.3 (P) IpcApiClientのstartAgentメソッドを更新する
  - `'claude'`リテラルの使用箇所を`engineId`パラメータに変更
  - `command`パラメータを削除
  - _Requirements: 4.4_
  - _Verify: Grep "engineId" in IpcApiClient.ts_

- [x] 4.4 (P) WebSocketApiClientのstartAgentメソッドを更新する
  - WebSocketApiClientはstartAgentメソッドを直接持たない（WorkflowController経由）
  - WebSocket経由のリクエストは既に`engineId`方式で送信
  - _Requirements: 4.4, 7.1, 7.3_
  - _Verify: Grep "engineId" in WebSocketApiClient.ts_

## 5. フロントエンドの更新

- [x] 5.1 agentStoreAdapter.tsのstartAgentメソッドを更新する
  - `command`パラメータを`engineId`に変更
  - デフォルト値を使用するよう調整
  - _Requirements: 5.1, 5.4_
  - _Verify: Grep "engineId" in agentStoreAdapter.ts_

- [x] 5.2 (P) BugWorkflowView.tsxのstartAgent呼び出しを更新する
  - `electronAPI.startAgent`の呼び出しから`command`パラメータを削除
  - 必要に応じて`engineId`を指定（省略可能な場合は省略）
  - _Requirements: 5.2, 5.3_
  - _Verify: Grep "startAgent" in BugWorkflowView.tsx_

- [x] 5.3 (P) その他のフロントエンドからのstartAgent呼び出しを更新する
  - コードベース全体をスキャンして`startAgent`の呼び出し箇所を特定
  - すべての呼び出しを`engineId`方式に更新（agentStore.ts, BugActionButtons.tsx）
  - _Requirements: 5.3_
  - _Verify: Grep "startAgent" in src/renderer_

## 6. Remote UI対応

- [x] 6.1 webSocketHandler.tsのエージェント起動処理を更新する
  - webSocketHandler.tsはstartAgentを直接呼ばない（WorkflowController経由）
  - WorkflowControllerは既に`engineId`方式に更新済み（remoteAccessHandlers.ts）
  - _Requirements: 7.1_
  - _Method: startAgent, engineId_
  - _Verify: Grep "engineId" in webSocketHandler.ts_

## 7. テストの更新

- [x] 7.1 EngineCommandResolverServiceのユニットテストを追加する
  - `'claude'`でClaudePathResolverServiceに委譲されることを検証
  - `E2E_MOCK_CLAUDE_COMMAND`環境変数が正しく適用されることを検証
  - 未知の`engineId`が渡された場合の処理を検証
  - _Requirements: 6.2_
  - _Verify: Grep "EngineCommandResolverService" in *.test.ts_

- [x] 7.2 (P) 既存テストの`command: 'claude'`を`engineId: 'claude'`に更新する
  - テストファイル全体をスキャンして`command: 'claude'`を特定
  - AgentInfo/AgentRecordフィールドとしての`command`は維持（結果データのため）
  - startAgent入力パラメータとしての`command`を`engineId`に置換（agentStore.test.ts, agentStoreAdapter.test.ts）
  - _Requirements: 6.1_
  - _Verify: Grep "engineId: 'claude'" in *.test.ts_

- [x] 7.3 (P) startAgent内部でのコマンド解決をテストするケースを追加する
  - `EngineCommandResolverService`のテストで`engineId`が正しく解決されることを検証
  - specManagerService.test.tsの既存テストは`engineId: 'claude'`を使用するよう既に更新済み
  - _Requirements: 6.3_
  - _Verify: Grep "resolveCommand" in specManagerService.test.ts_

## 8. クリーンアップ

- [x] 8.1 不要になった`command`パラメータの残存箇所を物理削除する
  - 全コードベースをスキャンして`command: 'claude'`の残存を確認
  - startAgent入力の`command`パラメータはすべて`engineId`に置換済み
  - AgentInfo/AgentRecord内の`command`フィールドは結果データのため維持
  - レジストリ定義（llmEngineRegistry.ts, reviewEngineRegistry.ts）は設定として維持
  - _Requirements: 3.2_
  - _Verify: startAgentへの入力として"command: 'claude'"は存在しない_

- [x] 8.2 getClaudeCommand export維持を確認する
  - `agentProcess.ts`の`getClaudeCommand`エクスポートは後方互換性のため維持
  - 内部使用箇所は`EngineCommandResolverService`経由に移行済み
  - agentHandlers.tsからのimportを削除（不要になったため）
  - _Requirements: 1.4_

## 9. 最終検証

- [x] 9.1 ビルドと型チェックを実行する
  - `npm run build && npm run typecheck`を実行
  - エラーがないことを確認（両方成功）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3_

- [x] 9.2 E2Eテストでモックコマンドが正しく適用されることを検証する
  - `E2E_MOCK_CLAUDE_COMMAND`環境変数が設定された状態でE2Eテストを実行
  - モックコマンドがエージェント起動に使用されることを確認
  - _Requirements: 6.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `startAgent`引数から`command`削除、`engineId`追加 | 2.1 | Infrastructure |
| 1.2 | `engineId`デフォルト値`'claude'` | 2.1 | Infrastructure |
| 1.3 | `startAgent`内部でコマンドパス解決 | 2.2 | Feature |
| 1.4 | `ClaudePathResolverService`活用 | 1.1, 2.2, 8.2 | Feature |
| 2.1 | `EngineCommandResolverService`作成 | 1.1 | Feature |
| 2.2 | `'claude'`のみサポート | 1.1 | Feature |
| 2.3 | 他エンジン拡張ポイント | 1.1 | Feature |
| 2.4 | E2E環境変数サポート | 1.1 | Feature |
| 3.1 | 全ハンドラーを`engineId`方式に移行 | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7 | Feature |
| 3.2 | `specManagerService.ts`内部解決統一 | 2.2, 8.1 | Feature |
| 3.3 | ハードコード置換 | 3.1, 3.3, 3.5, 3.6, 3.7 | Feature |
| 4.1 | `electronAPI.startAgent`シグネチャ更新 | 4.1 | Integration |
| 4.2 | `preload/index.ts`のAPI定義更新 | 4.1 | Integration |
| 4.3 | `electron.d.ts`の型定義更新 | 4.2 | Integration |
| 4.4 | `IpcApiClient`および`WebSocketApiClient`のAPI更新 | 4.3, 4.4 | Integration |
| 5.1 | `agentStoreAdapter.ts`の`startAgent`メソッド更新 | 5.1 | Integration |
| 5.2 | `BugWorkflowView.tsx`の呼び出し更新 | 5.2 | Integration |
| 5.3 | その他フロントエンドからの呼び出し更新 | 5.3 | Integration |
| 5.4 | `engineId`デフォルト値使用 | 5.1 | Integration |
| 6.1 | 既存テストの`command`を`engineId`に更新 | 7.2 | Testing |
| 6.2 | `EngineCommandResolverService`のユニットテスト | 7.1 | Testing |
| 6.3 | `startAgent`内部コマンド解決テスト | 7.3 | Testing |
| 6.4 | E2Eテストでモックコマンド検証 | 9.2 | Testing |
| 7.1 | `webSocketHandler.ts`更新 | 6.1, 4.4 | Feature |
| 7.2 | `remoteAccessHandlers.ts`の`WorkflowController`更新 | 3.6 | Feature |
| 7.3 | WebSocket経由で`engineId`受け取り | 4.4, 6.1 | Feature |
