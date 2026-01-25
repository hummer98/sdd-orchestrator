# Implementation Plan: AutoExecution ProjectPath Fix

## Tasks

- [x] 1. AutoExecutionCoordinatorのprojectPath対応

- [x] 1.1 (P) AutoExecutionState型にprojectPathフィールドを追加する
  - AutoExecutionStateインターフェースにreadonly projectPath: stringを追加
  - 型の整合性を確認
  - _Requirements: 1.1_
  - _Method: AutoExecutionState_
  - _Verify: Grep "projectPath.*string" in autoExecutionCoordinator.ts_

- [x] 1.2 start()メソッドのシグネチャを変更する
  - 第一引数にprojectPath: stringを追加
  - start()内でprojectPathをAutoExecutionStateに保存
  - createState相当の処理でprojectPathを設定
  - _Requirements: 1.2, 1.3_
  - _Method: start(projectPath, specPath, specId, options)_
  - _Verify: Grep "start\(projectPath" in autoExecutionCoordinator.ts_

- [x] 1.3 logAutoExecutionEvent()を修正してstate.projectPathを使用する
  - specPathからの逆算ロジック（.kiro/specs/で分割）を削除
  - state.projectPathを直接EventLogService.logEvent()に渡す
  - _Requirements: 1.4, 1.5_
  - _Method: logAutoExecutionEvent, state.projectPath_
  - _Verify: Grep "state\.projectPath" in autoExecutionCoordinator.ts_

- [x] 2. BugAutoExecutionCoordinatorのprojectPath対応

- [x] 2.1 (P) BugAutoExecutionState型にprojectPathフィールドを追加する
  - BugAutoExecutionStateインターフェースにreadonly projectPath: stringを追加
  - _Requirements: 2.1_
  - _Method: BugAutoExecutionState_
  - _Verify: Grep "projectPath.*string" in bugAutoExecutionCoordinator.ts_

- [x] 2.2 start()メソッドのシグネチャを変更する
  - 第一引数にprojectPath: stringを追加
  - start()内でprojectPathをBugAutoExecutionStateに保存
  - 将来のイベントログ拡張に備えた設計
  - _Requirements: 2.2, 2.3_
  - _Method: start(projectPath, bugPath, bugName, options, lastCompletedPhase)_
  - _Verify: Grep "start\(projectPath" in bugAutoExecutionCoordinator.ts_

- [x] 3. IPCハンドラのパラメータ修正

- [x] 3.1 (P) autoExecutionHandlers.tsのStartParams型にprojectPathを追加する
  - StartParamsインターフェースにprojectPath: stringを追加
  - AUTO_EXECUTION_STARTハンドラでparams.projectPathをcoordinator.start()に渡す
  - _Requirements: 3.1, 3.3_
  - _Method: StartParams, coordinator.start(params.projectPath, ...)_
  - _Verify: Grep "projectPath.*string" in autoExecutionHandlers.ts_

- [x] 3.2 (P) bugAutoExecutionHandlers.tsのBugStartParams型にprojectPathを追加する
  - BugStartParamsインターフェースにprojectPath: stringを追加
  - BUG_AUTO_EXECUTION_STARTハンドラでparams.projectPathをcoordinator.start()に渡す
  - _Requirements: 3.2, 3.3_
  - _Method: BugStartParams, coordinator.start(params.projectPath, ...)_
  - _Verify: Grep "projectPath.*string" in bugAutoExecutionHandlers.ts_

- [x] 4. Preload/Renderer API層の修正

- [x] 4.1 (P) preload/index.tsのIPC呼び出しにprojectPathパラメータを追加する
  - autoExecutionStart関数のparamsにprojectPath: stringを追加
  - bugAutoExecutionStart関数のparamsにprojectPath: stringを追加
  - _Requirements: 4.1_
  - _Method: autoExecutionStart({ projectPath, ... }), bugAutoExecutionStart({ projectPath, ... })_
  - _Verify: Grep "projectPath" in preload/index.ts_

- [x] 4.2 (P) 共有API型定義を更新する
  - ISpecWorkflowApi.ts、types.ts等の関連型定義を更新
  - AutoExecutionState型にprojectPathを追加（shared/api/types.ts）
  - _Requirements: 4.2_
  - _Method: ISpecWorkflowApi, AutoExecutionState_
  - _Verify: Grep "projectPath" in shared/api/_

- [x] 4.3 (P) ElectronSpecWorkflowApiのstartAutoExecution()を修正する
  - startAutoExecution()にprojectPath引数を追加
  - window.electronAPI.autoExecutionStart()にprojectPathを渡す
  - _Requirements: 4.2_
  - _Method: startAutoExecution(projectPath, specPath, specId, options)_
  - _Verify: Grep "startAutoExecution.*projectPath" in ElectronSpecWorkflowApi.ts_

- [x] 4.4 (P) IpcApiClient.tsとWebSocketApiClient.tsを更新する
  - 両クライアントのstartAutoExecution()にprojectPath引数を追加
  - _Requirements: 4.2_
  - _Method: startAutoExecution(projectPath, ...)_
  - _Verify: Grep "startAutoExecution.*projectPath" in IpcApiClient.ts WebSocketApiClient.ts_

- [x] 4.5 Renderer側のstore/hookからprojectPathを取得・送信する
  - useAutoExecution.tsでprojectPathを取得してAPI呼び出しに渡す
  - autoExecutionStore.tsのstartAutoExecution呼び出しを修正
  - _Requirements: 4.3_
  - _Method: useAutoExecution, autoExecutionStore_
  - _Verify: Grep "projectPath" in useAutoExecution.ts autoExecutionStore.ts_

- [x] 5. MCP経由の呼び出し修正

- [x] 5.1 (P) specToolHandlers.tsのspec_start_executionハンドラを修正する
  - coordinator.start()呼び出しにprojectPathを渡す
  - _Requirements: 5.1_
  - _Method: coordinator.start(projectPath, specPath, specName, options)_
  - _Verify: Grep "coordinator\.start\(projectPath" in specToolHandlers.ts_

- [x] 5.2 (P) bugToolHandlers.tsを修正する
  - coordinator.start()呼び出しにprojectPathを渡す
  - _Requirements: 5.2_
  - _Method: coordinator.start(projectPath, ...)_
  - _Verify: Grep "coordinator\.start\(projectPath" in bugToolHandlers.ts_

- [x] 6. electron.d.ts型定義の更新

- [x] 6.1 (P) IPC型定義を更新する
  - autoExecutionStart、bugAutoExecutionStartの引数型にprojectPathを追加
  - _Requirements: 4.1_
  - _Method: ElectronAPI interface_
  - _Verify: Grep "projectPath" in electron.d.ts_

- [x] 7. テストの修正

- [x] 7.1 autoExecutionCoordinator.test.tsの全start()呼び出しを更新する
  - 約84箇所のstart()呼び出しにprojectPath引数を追加
  - テストデータとしてprojectPathを定義
  - _Requirements: 6.1_
  - _Method: coordinator.start(testProjectPath, ...)_
  - _Verify: Bash "npm test -- autoExecutionCoordinator.test.ts"_

- [x] 7.2 (P) autoExecutionHandlers.test.tsおよびbugAutoExecutionHandlers.test.tsのテストを更新する
  - StartParamsにprojectPathを追加したテストデータに変更
  - BugStartParamsにprojectPathを追加したテストデータに変更
  - _Requirements: 6.2, 3.2_
  - _Method: StartParams with projectPath, BugStartParams with projectPath_
  - _Verify: Bash "npm test -- autoExecutionHandlers.test.ts bugAutoExecutionHandlers.test.ts"_

- [x] 7.3 (P) bugAutoExecutionCoordinator.test.tsのテストを更新する
  - start()呼び出しにprojectPath引数を追加
  - _Requirements: 6.3_
  - _Method: coordinator.start(testProjectPath, ...)_
  - _Verify: Bash "npm test -- bugAutoExecutionCoordinator.test.ts"_

- [x] 7.4 (P) Renderer側テストを更新する
  - useAutoExecution、autoExecutionStore等のテストを更新
  - _Requirements: 6.4_
  - _Verify: Bash "npm test -- useAutoExecution autoExecutionStore"_

- [x] 8. 統合検証

- [x] 8.1 全テスト実行とビルド検証
  - npm run test:unit で全ユニットテストをパス
  - npm run build でビルドが成功
  - 型エラーがないことを確認
  - _Requirements: 6.5_
  - _Verify: Bash "npm run test:unit && npm run build"_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | AutoExecutionStateにprojectPathフィールド追加 | 1.1 | Feature |
| 1.2 | start()シグネチャ変更 | 1.2 | Feature |
| 1.3 | projectPathをAutoExecutionStateに保存 | 1.2 | Feature |
| 1.4 | logAutoExecutionEvent()でstate.projectPath使用 | 1.3 | Feature |
| 1.5 | specPathからの逆算ロジック削除 | 1.3 | Feature |
| 2.1 | BugAutoExecutionStateにprojectPathフィールド追加 | 2.1 | Feature |
| 2.2 | BugAutoExecutionCoordinator.start()シグネチャ変更 | 2.2 | Feature |
| 2.3 | Bugイベントログでprojectpath使用 | 2.2 | Feature |
| 3.1 | StartParamsにprojectPath追加 | 3.1 | Feature |
| 3.2 | BugStartParamsにprojectPath追加 | 3.2 | Feature |
| 3.3 | IPCハンドラでprojectPath伝播 | 3.1, 3.2 | Feature |
| 4.1 | preload IPC呼び出しでprojectPath送信 | 4.1, 6.1 | Feature |
| 4.2 | ElectronSpecWorkflowApi.startAutoExecution()でprojectPath渡し | 4.2, 4.3, 4.4 | Feature |
| 4.3 | Renderer側store/hookでprojectPath取得・送信 | 4.5 | Feature |
| 5.1 | specToolHandlers.startAutoExecution()でprojectPath渡し | 5.1 | Feature |
| 5.2 | bugToolHandlers修正 | 5.2 | Feature |
| 6.1 | autoExecutionCoordinator.test.ts修正 | 7.1 | Test |
| 6.2 | autoExecutionHandlers.test.ts修正 | 7.2 | Test |
| 6.3 | bugAutoExecutionCoordinator.test.ts修正 | 7.3 | Test |
| 6.4 | Renderer側テスト修正 | 7.4 | Test |
| 6.5 | 全テストパス | 8.1 | Test |
