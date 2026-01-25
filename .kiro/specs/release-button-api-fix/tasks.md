# Implementation Plan

## Task 1: IPC層の新規チャンネル定義と旧チャンネル削除

- [x] 1.1 (P) プロジェクトコマンド実行用の新しいIPCチャンネルを追加
  - `EXECUTE_PROJECT_COMMAND`チャンネルを`channels.ts`に追加
  - `EXECUTE_ASK_PROJECT`チャンネルを削除
  - _Requirements: 1.1, 4.1_
  - _Method: IPC_CHANNELS_
  - _Verify: Grep "EXECUTE_PROJECT_COMMAND" in channels.ts_

## Task 2: Preload APIの更新

- [x] 2.1 (P) プロジェクトコマンド実行APIをRendererに公開
  - `executeProjectCommand(projectPath, command, title)`メソッドを追加
  - `executeAskProject`メソッドを削除
  - 戻り値として`AgentInfo`を返却
  - _Requirements: 1.1, 4.3_
  - _Method: executeProjectCommand, ipcRenderer.invoke_
  - _Verify: Grep "executeProjectCommand" in preload/index.ts_

## Task 3: 型定義の更新

- [x] 3.1 (P) Renderer用のelectronAPI型定義を更新
  - `executeProjectCommand`の型定義を追加
  - `executeAskProject`の型定義を削除
  - _Requirements: 1.1, 4.2_
  - _Method: ElectronAPI interface_
  - _Verify: Grep "executeProjectCommand.*projectPath.*command.*title" in electron.d.ts_

## Task 4: IPCハンドラの実装

- [x] 4.1 `EXECUTE_PROJECT_COMMAND`ハンドラを実装
  - `projectPath`, `command`, `title`パラメータのバリデーション
  - `command`をラップせずそのまま`args`として渡す
  - `title`を`phase`として設定（Agent表示名として使用）
  - エラー時は適切なメッセージをthrow
  - 既存の`EXECUTE_ASK_PROJECT`ハンドラを削除
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.4_
  - _Method: ipcMain.handle, startAgent, getSpecManagerService_
  - _Verify: Grep "EXECUTE_PROJECT_COMMAND" in handlers.ts_

## Task 5: API抽象化層の更新

- [x] 5.1 (P) ApiClient型定義に新メソッドを追加
  - `executeProjectCommand`メソッドをApiClient interfaceに追加
  - `executeAskProject`メソッドを削除
  - _Requirements: 1.1, 4.2_

- [x] 5.2 IpcApiClientに新メソッドを実装
  - `executeProjectCommand`を実装してIPC呼び出し
  - `executeAskProject`を削除
  - タスク4.1が完了後に実装（IPCハンドラ依存）
  - _Requirements: 1.1, 4.4_
  - _Method: executeProjectCommand_
  - _Verify: Grep "executeProjectCommand" in IpcApiClient.ts_

- [x] 5.3 (P) WebSocketApiClientにスタブ実装を追加
  - 未対応エラーを返すスタブとして`executeProjectCommand`を実装
  - `executeAskProject`を削除
  - Remote UI対応は本Specスコープ外のため、エラーを返す
  - _Requirements: 1.1_
  - _Method: executeProjectCommand (stub)_
  - _Verify: Grep "NOT_IMPLEMENTED.*executeProjectCommand" in WebSocketApiClient.ts_

## Task 6: UIコンポーネントの更新

- [x] 6.1 Releaseボタンのハンドラを新APIに移行
  - `handleRelease`で`executeProjectCommand(path, '/release', 'release')`を呼び出す
  - 既存の`executeAskProject`呼び出しを置き換え
  - タスク5.2が完了後に実装（API実装依存）
  - _Requirements: 2.1_
  - _Method: executeProjectCommand, handleRelease_
  - _Verify: Grep "executeProjectCommand.*'/release'.*'release'" in ProjectAgentPanel.tsx_

- [x] 6.2 Askボタンのハンドラを新APIに移行
  - `handleAskExecute`で`executeProjectCommand(path, '/kiro:project-ask "${prompt}"', 'ask')`を呼び出す
  - 既存のAsk機能と同等の動作を維持
  - タスク5.2が完了後に実装（API実装依存）
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: executeProjectCommand, handleAskExecute_
  - _Verify: Grep "executeProjectCommand.*project-ask" in ProjectAgentPanel.tsx_

- [x] 6.3 isReleaseRunning判定ロジックを更新
  - `phase === 'release' && status === 'running'`で判定
  - 既存の`args?.includes('/release')`判定を置き換え
  - Agent一覧に「release」タイトルで表示されることを確認
  - _Requirements: 5.1, 5.2, 2.2, 2.3_
  - _Method: isReleaseRunning computed property_
  - _Verify: Grep "phase.*===.*'release'" in ProjectAgentPanel.tsx_

## Task 7: テストの更新

- [x] 7.1 ProjectAgentPanel.test.tsxを更新
  - `handleRelease`が`executeProjectCommand`を呼び出すことをテスト
  - `handleAskExecute`が`executeProjectCommand`を呼び出すことをテスト
  - `isReleaseRunning`が`phase === 'release'`で判定することをテスト
  - 既存の`executeAskProject`関連テストを削除または更新
  - _Requirements: 2.1, 2.3, 3.1, 5.1, 5.2_

## Task 8: 検証

- [x] 8.1 ビルドと型チェックを実行
  - `npm run build`が成功することを確認
  - `npm run typecheck`が成功することを確認
  - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `executeProjectCommand`シグネチャでIPC APIを提供 | 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3 | Feature |
| 1.2 | commandパラメータをそのまま実行 | 4.1 | Feature |
| 1.3 | titleパラメータがAgent表示名として使用 | 4.1 | Feature |
| 1.4 | AgentInfo返却 | 4.1 | Feature |
| 1.5 | エラー時メッセージ返却 | 4.1 | Feature |
| 2.1 | releaseボタンでexecuteProjectCommand呼び出し | 6.1 | Feature |
| 2.2 | Agent一覧に「release」表示 | 6.3 | Feature |
| 2.3 | 重複起動防止ロジック | 6.3, 7.1 | Feature |
| 3.1 | AskボタンでexecuteProjectCommand呼び出し | 6.2, 7.1 | Feature |
| 3.2 | 既存Ask機能と同等動作 | 6.2 | Feature |
| 3.3 | Agent一覧に「ask」表示 | 6.2 | Feature |
| 4.1 | EXECUTE_ASK_PROJECT削除 | 1.1 | Cleanup |
| 4.2 | executeAskProject型定義削除 | 3.1, 5.1 | Cleanup |
| 4.3 | preloadからexecuteAskProject削除 | 2.1 | Cleanup |
| 4.4 | ハンドラ実装削除 | 4.1, 5.2 | Cleanup |
| 5.1 | title==='release'かつstatus==='running'判定 | 6.3, 7.1 | Feature |
| 5.2 | args判定からtitle判定へ移行 | 6.3, 7.1 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
