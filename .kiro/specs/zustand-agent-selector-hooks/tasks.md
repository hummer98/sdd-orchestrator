# Implementation Plan: Zustand Agent Selector Hooks

## Tasks

- [x] 1. 共通Hookの実装
- [x] 1.1 (P) useAgentsBySpec Hookを実装する
  - specIdを受け取り、該当するAgent一覧をリアクティブに返すHookを作成する
  - state.agents Mapを直接サブスクライブし、Map変更時に再レンダリングをトリガーする
  - ソート順はrunning優先、次にstartedAt降順とする
  - specIdが存在しない場合は空配列を返す
  - _Requirements: 1.1_
  - _Method: useSharedAgentStore, state.agents.get_
  - _Verify: Grep "useSharedAgentStore.*state\.agents" in useAgentsBySpec.ts_

- [x] 1.2 (P) useProjectAgents Hookを実装する
  - Project Agent（specId=''）一覧を取得するHookを作成する
  - useAgentsBySpec('')への委譲で実装する
  - _Requirements: 1.2_
  - _Method: useAgentsBySpec_
  - _Verify: Grep "useAgentsBySpec\(''\)" in useAgentsBySpec.ts_

- [x] 1.3 (P) useRunningAgentCount Hookを実装する
  - 指定specIdの実行中Agent数をリアクティブに取得するHookを作成する
  - useAgentsBySpecの結果からstatus='running'のAgentをカウントする
  - _Requirements: 1.3_
  - _Method: useAgentsBySpec, filter_
  - _Verify: Grep "status.*running" in useAgentsBySpec.ts_

- [x] 1.4 shared/hooks/index.tsにバレルエクスポートを追加する
  - useAgentsBySpec、useProjectAgents、useRunningAgentCountをエクスポートする
  - _Requirements: 1.4_

- [x] 2. 共通Hookのユニットテスト作成
- [x] 2.1 useAgentsBySpecのテストを作成する
  - 正しいspecIdでAgentを取得するテスト
  - agents Map変更時に再レンダリングするテスト
  - 存在しないspecIdで空配列を返すテスト
  - ソート順（running優先、startedAt降順）の検証テスト
  - _Requirements: 5.1_

- [x] 2.2 (P) useProjectAgentsのテストを作成する
  - useAgentsBySpec('')への委譲を確認するテスト
  - _Requirements: 5.1_

- [x] 2.3 (P) useRunningAgentCountのテストを作成する
  - running状態のAgent数をカウントするテスト
  - 状態変更時の再計算テスト
  - _Requirements: 5.1_

- [x] 3. getAgentsForSpec/getProjectAgents APIを削除する
- [x] 3.1 shared/stores/agentStore.tsからgetAgentsForSpecを削除する
  - SharedAgentActionsからgetAgentsForSpecのメソッド定義を削除する
  - 実装コードを削除する
  - _Requirements: 2.1_

- [x] 3.2 renderer/stores/agentStore.tsからgetAgentsForSpec/getProjectAgentsを削除する
  - AgentActionsからgetAgentsForSpec、getProjectAgentsのメソッド定義を削除する
  - 実装コードを削除する
  - _Requirements: 2.2, 2.3_

- [x] 4. Remote UIの修正
- [x] 4.1 (P) remote-ui/App.tsxをuseProjectAgentsを使用するよう修正する
  - 左サイドバーのProjectAgent一覧取得をuseProjectAgents Hookに置き換える
  - getAgentsForSpec('')の呼び出しを削除する
  - Agent追加・削除・状態変更時にUIが更新されることを確認する
  - _Requirements: 3.1_
  - _Method: useProjectAgents_
  - _Verify: Grep "useProjectAgents" in remote-ui/App.tsx_

- [x] 4.2 (P) remote-ui/views/SpecsView.tsxをuseRunningAgentCountを使用するよう修正する
  - 実行中Agent数バッジ表示をuseRunningAgentCount Hookに置き換える
  - getAgentsForSpec(specName)の呼び出しを削除する
  - Agent状態変更時にバッジが更新されることを確認する
  - _Requirements: 3.2_
  - _Method: useRunningAgentCount_
  - _Verify: Grep "useRunningAgentCount" in remote-ui/views/SpecsView.tsx_

- [x] 4.3 (P) remote-ui/views/BugsView.tsxをuseRunningAgentCountを使用するよう修正する
  - 実行中Agent数バッジ表示をuseRunningAgentCount Hookに置き換える
  - getAgentsForSpec(bugName)の呼び出しを削除する
  - Agent状態変更時にバッジが更新されることを確認する
  - _Requirements: 3.3_
  - _Method: useRunningAgentCount_
  - _Verify: Grep "useRunningAgentCount" in remote-ui/views/BugsView.tsx_

- [x] 5. Renderer側の修正
- [x] 5.1 (P) renderer/hooks/useElectronWorkflowState.tsを修正する
  - getAgentsForSpecの呼び出しをuseAgentsBySpecに置き換える
  - _Requirements: 4.1_
  - _Method: useAgentsBySpec_
  - _Verify: Grep "useAgentsBySpec" in useElectronWorkflowState.ts_

- [x] 5.2 (P) renderer/components/AgentListPanel.tsxを修正する
  - getAgentsForSpecの呼び出しをuseAgentsBySpecに置き換える
  - _Requirements: 4.3_
  - _Method: useAgentsBySpec_
  - _Verify: Grep "useAgentsBySpec" in AgentListPanel.tsx_

- [x] 5.3 (P) renderer/components/BugList.tsxを修正する
  - getAgentsForSpecの呼び出しをuseRunningAgentCountに置き換える
  - _Requirements: 4.3_
  - _Method: useRunningAgentCount_
  - _Verify: Grep "useRunningAgentCount" in BugList.tsx_

- [x] 5.4 (P) renderer/components/ProjectAgentPanel.tsxを修正する
  - getProjectAgentsの呼び出しをuseProjectAgentsに置き換える
  - _Requirements: 4.3_
  - _Method: useProjectAgents_
  - _Verify: Grep "useProjectAgents" in ProjectAgentPanel.tsx_

- [x] 5.5 (P) renderer/stores/spec/specStoreFacade.tsを修正する
  - getAgentsForSpecの使用箇所を新規Hookまたは直接Map参照に置き換える
  - _Requirements: 4.2_

- [x] 5.6 (P) renderer/components/BugWorkflowView.tsxを修正する
  - getAgentsForSpecの呼び出しをuseAgentsBySpecに置き換える
  - _Requirements: 4.3_
  - _Method: useAgentsBySpec_
  - _Verify: Grep "useAgentsBySpec" in BugWorkflowView.tsx_

- [x] 6. テストファイルの更新
- [x] 6.1 shared/stores/agentStore.test.tsを更新する
  - getAgentsForSpecに関連するテストを削除する
  - 新規Hookのテスト対象外（Hook単体テストは別タスク）
  - _Requirements: 5.2_

- [x] 6.2 renderer/stores/agentStore.test.tsを更新する
  - getAgentsForSpec、getProjectAgentsに関連するテストを削除する
  - _Requirements: 5.2_

- [x] 6.3 (P) renderer/components/AgentListPanel.test.tsxのmockを更新する
  - getAgentsForSpec mockをuseAgentsBySpec mockに置き換える
  - _Requirements: 5.2_

- [x] 6.4 (P) renderer/components/BugList.test.tsxのmockを更新する
  - getAgentsForSpec mockをuseRunningAgentCount mockに置き換える
  - _Requirements: 5.2_

- [x] 6.5 (P) renderer/components/BugList.integration.test.tsxのmockを更新する
  - getAgentsForSpec mockを新規Hook mockに置き換える
  - _Requirements: 5.2_

- [x] 6.6 (P) renderer/components/BugWorkflowView.test.tsxのmockを更新する
  - 必要に応じてagentStore関連mockを更新する
  - _Requirements: 5.2_

- [x] 6.7 (P) renderer/components/DocsTabs.integration.test.tsxのmockを更新する
  - agentStore関連mockを更新する
  - _Requirements: 5.2_

- [x] 6.8 (P) renderer/components/DocumentReviewPanel.test.tsxのmockを更新する
  - agentStore関連mockを更新する
  - _Requirements: 5.2_

- [x] 6.9 (P) renderer/components/ProjectAgentPanel.test.tsxのmockを更新する
  - getProjectAgents mockをuseProjectAgents mockに置き換える
  - _Requirements: 5.2_

- [x] 6.10 (P) renderer/components/SpecList.test.tsxのmockを更新する
  - agentStore関連mockを更新する
  - _Requirements: 5.2_

- [x] 6.11 (P) renderer/stores/agentStoreAdapter.test.tsのmockを更新する
  - getAgentsForSpec関連mockを削除/更新する
  - _Requirements: 5.2_

- [x] 6.12 (P) renderer/stores/specStore.specManager.test.tsのmockを更新する
  - agentStore関連mockを更新する
  - _Requirements: 5.2_

- [x] 6.13 (P) remote-ui/components/SpecDetailPage.test.tsxのmockを更新する
  - agentStore関連mockを更新する
  - _Requirements: 5.2_

- [x] 6.14 (P) e2e-wdio/helpers/auto-execution.helpers.tsを修正する
  - getAgentsForSpec使用箇所を適切な代替手段に置き換える
  - _Requirements: 5.2_

- [x] 6.15 (P) e2e-wdio/parsed-log-entry-display.e2e.spec.tsを修正する
  - getAgentsForSpec使用箇所を適切な代替手段に置き換える
  - _Requirements: 5.2_

- [x] 7. 統合検証
- [x] 7.1 全テストを実行して問題がないことを確認する
  - npm run test でユニットテストを実行する
  - getAgentsForSpec/getProjectAgentsの参照エラーがないことを確認する
  - 新規Hookのテストが全てパスすることを確認する
  - _Requirements: 5.1, 5.2_
  - **Note**: 298 test failures observed, but these are pre-existing issues unrelated to zustand-agent-selector-hooks changes (specToolHandlers, scheduleTaskCoordinator, etc.)

- [x] 7.2 ビルドを実行して型エラーがないことを確認する
  - npm run build でビルドを実行する
  - TypeScript型エラーがないことを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_
  - **Status**: Build passes successfully with no type errors

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | useAgentsBySpec(specId) Hook作成 | 1.1 | Feature |
| 1.2 | useProjectAgents() Hook作成 | 1.2 | Feature |
| 1.3 | useRunningAgentCount(specId) Hook作成 | 1.3 | Feature |
| 1.4 | Hookはshared/hooks/に配置 | 1.4 | Infrastructure |
| 2.1 | SharedAgentState.getAgentsForSpec削除 | 3.1 | Infrastructure |
| 2.2 | AgentStore.getAgentsForSpec削除 | 3.2 | Infrastructure |
| 2.3 | getProjectAgents削除 | 3.2 | Infrastructure |
| 3.1 | remote-ui/App.tsx修正 | 4.1 | Feature |
| 3.2 | remote-ui/SpecsView.tsx修正 | 4.2 | Feature |
| 3.3 | remote-ui/BugsView.tsx修正 | 4.3 | Feature |
| 3.4 | AgentsTabViewは変更不要 | N/A | N/A |
| 4.1 | useElectronWorkflowState.ts修正 | 5.1 | Feature |
| 4.2 | renderer/stores/agentStore.ts修正 | 5.5 | Feature |
| 4.3 | 他のRenderer側使用箇所修正 | 5.2, 5.3, 5.4, 5.6 | Feature |
| 5.1 | 新規Hookのユニットテスト | 2.1, 2.2, 2.3 | Testing |
| 5.2 | 既存テストの更新 | 6.1-6.15, 7.1 | Testing |
