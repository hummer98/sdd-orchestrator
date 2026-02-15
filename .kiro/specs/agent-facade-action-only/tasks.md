# Implementation Plan

> **実行順序の注記**: Task間には強い依存関係があるため、番号順ではなく以下の順序で実行すること:
> **Task 1 → Task 2 → Task 4/5 → Task 3 → Task 6**
>
> 理由: Task 3（ファサードから状態フィールド削除）をTask 4（コンポーネントのSSOT移行）より先に実行すると、
> 未移行コンポーネントがファサードから削除済みの状態フィールドを参照してコンパイルエラーが大量発生する。
> 必ず先にTask 4/5でコンポーネントをSSOT直接読み取りに移行してから、Task 3でファサードの状態フィールドを削除すること。

## Task 1. SSOT（useSharedAgentStore）の拡張
- [x] 1.1 (P) skipPermissionsフィールドとsetSkipPermissionsアクションをSSOTに追加する
  - SharedAgentStateに`skipPermissions: boolean`（初期値`false`）を追加
  - SharedAgentActionsに`setSkipPermissions(value: boolean): void`を追加
  - 既存の状態管理パターン（`set()`による更新）に従って実装
  - _Requirements: 4.1, 4.2_

- [x] 1.2 (P) getRunningAgentCount()メソッドをSSOTに追加する
  - SharedAgentActionsに`getRunningAgentCount(specId: string): number`を追加
  - `agents.get(specId)`から`status === 'running'`のAgentをカウントして返す
  - 既存の`getAgentById()`と同様のヘルパーメソッドパターンに従う
  - _Requirements: 5.1_

## Task 2. AgentInfo型の統一
- [x] 2.1 Renderer固有のAgentInfo型定義を削除し、SSOTの型をre-exportする
  - `renderer/stores/agentStore.ts`のRenderer固有`AgentInfo` interface定義を削除
  - `shared/api/types`の`AgentInfo`を`renderer/stores/agentStore.ts`からre-exportし、既存のimportパスとの後方互換を維持
  - `renderer/stores/index.ts`のAgentInfo re-exportを`shared/api/types`経由に更新
  - _Requirements: 3.1, 3.2, 3.3, 3.5_
  - _Method: re-export from shared/api/types_

- [x] 2.2 型変換関数toRendererAgentInfo()とtoSharedAgentInfo()を削除する
  - `renderer/stores/agentStore.ts`の`toRendererAgentInfo()`を削除
  - `renderer/stores/agentStoreAdapter.ts`の`toSharedAgentInfo()`と`RendererAgentInfo`型を削除
  - 変換関数を呼んでいるアダプタ内の箇所を、`AgentInfo`（shared型）の直接使用に書き換え
  - _Requirements: 3.4_

## Task 3. ファサードストアの状態フィールド削除とアクション専用化
- [x] 3.1 ファサードストアから全状態フィールドとsubscribe-and-sync機構を削除する
  - `AgentState` interfaceから`agents`, `logs`, `selectedAgentId`, `isLoading`, `error`, `runningAgentCounts`, `skipPermissions`を削除
  - `useSharedAgentStore.subscribe()`による状態同期メカニズム（`setupEventListeners`内）を削除
  - 初期化時の`getAgentsFromShared()`と`calculateRunningCounts()`呼び出しを削除
  - `getAgentsFromShared()`関数と`calculateRunningCounts()`関数を削除
  - `getLogsFromShared()`関数を削除し、全8箇所の`set({ logs: getLogsFromShared() })`呼び出しを除去（初期state L369、ensureLogsLoaded L463、loadAgentLogs L473、removeAgent L536、appendLog L563、clearLogs L568、イベントリスナー L607/L651）
  - `loadAgentLogs`を削除（`ensureLogsLoaded`で代替可能、機能的に重複）
  - ファサードからの`skipPermissions`フィールドと`setSkipPermissions`ローカル状態を削除（SSOT委譲に変更）
  - ファサードから`runningAgentCounts`フィールドと`getRunningAgentCount()`メソッドを削除
  - アクション内の`set()`によるローカル状態更新を除去（SSOTの更新がZustandリアクティビティで直接伝播するため）
  - ファイル先頭のJSDocコメントに「Action-Only Store」と明記する（DD-005準拠）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.3, 5.3, 6.1, 6.2, 6.3_
  - _Verify: Grep "subscribe\(.*useSharedAgentStore\|getAgentsFromShared\|calculateRunningCounts\|getLogsFromShared" in agentStore.ts — 0 matches expected_

## Task 4. コンポーネントの状態読み取りをSSOT直接に移行
- [x] 4.1 (P) AgentListPanelの状態読み取りをSSOTに移行する
  - `selectedAgentId`、`agents`、`skipPermissions`の読み取り元を`useSharedAgentStore`に変更
  - アクション呼び出し（stopAgent, selectAgent等）は引き続き`useAgentStore`を使用
  - `AgentInfo`型のimport元を`shared/api/types`（またはre-export）に変更
  - 注: `startedAt`が`string | number`になるため、ISO文字列前提のコードがあれば型ガードを追加する
  - 注: 現在の`agents` Map全体の購読は`agents.size === 0`のloadチェック（L90-93）にのみ使用。SSOT移行時にセレクタを`agents.size`のみに最適化するか、loadチェックの方法を見直すこと
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4.2 (P) AgentLogPanelの状態読み取りをSSOTに移行する
  - `selectedAgentId`、`agents`の読み取り元を`useSharedAgentStore`に変更
  - `logs`の読み取りをSSOT直接読み取りに移行する: 現在の`useAgentStore(s => s.logs.get(s.selectedAgentId))`を`useSharedAgentStore(s => s.logs.get(selectedAgentId))`に書き換え（AgentLogPanel.tsx L39-42）
  - `AgentInfo`型のimport元を`shared/api/types`（またはre-export）に変更
  - 注: `startedAt`が`string | number`になるため、ISO文字列前提のコードがあれば型ガードを追加する
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4.3 (P) AgentInputPanelの状態読み取りをSSOTに移行する
  - `selectedAgentId`の読み取り元を`useSharedAgentStore`に変更
  - `agents`全走査によるagent導出ロジック（L21-28: `state.agents.values()`を走査して`selectedAgentId`に一致するagentを取得）の読み取り元を`useSharedAgentStore`に変更。セレクタ内のロジックは既存パターンを維持し、読み取り元のみ変更する
  - アクション呼び出しは引き続き`useAgentStore`を使用
  - _Requirements: 2.1, 2.2_

- [x] 4.4 (P) ProjectAgentPanelの状態読み取りをSSOTに移行する
  - `selectedAgentId`、`agents`の読み取り元を`useSharedAgentStore`に変更
  - `AgentInfo`型のimport元を`shared/api/types`（またはre-export）に変更
  - 注: `startedAt`が`string | number`になるため、ISO文字列前提のコードがあれば型ガードを追加する
  - _Requirements: 2.1, 2.2_

- [x] 4.5 SpecListのrunningAgentCount取得をSSOTフック経由に変更する
  - `useAgentStore(s => s.getRunningAgentCount)`を`useRunningAgentCount`フック（`shared/hooks/useAgentsBySpec.ts`）に置き換え
  - SpecList.tsxで`useRunningAgentCount`フックを呼び出し、結果をSpecListContainerにpropsとして渡す。SpecListContainer（`shared/components/spec/SpecListContainer.tsx`）自体の変更は不要（既に`getRunningAgentCount?: (specName: string) => number`をoptional propとして受け取っている）
  - _Requirements: 5.2_
  - _Method: useRunningAgentCount_
  - _Verify: Grep "useRunningAgentCount" in SpecList.tsx — at least 1 match_

## Task 5. 関連ファイルのimportパスとSSOT読み取りへの更新
- [x] 5.1 specStoreFacadeのuseAgentStoreからの状態読み取り・subscribeをSSOTに変更する
  - `specStoreFacade.ts`の`useAgentStore.getState()`による状態読み取り（L80: `getSpecManagerExecution()`内）を`useSharedAgentStore.getState()`に変更
  - `setupAgentStoreSubscription()`（L158-166）の`useAgentStore.subscribe()`を`useSharedAgentStore.subscribe()`に変更。ファサードから状態フィールドが削除された後、`useAgentStore.subscribe()`では状態変更を検知できなくなるため、SSOTのsubscribeに切り替える
  - `clearSpecManagerError()`（L466-470）の`useAgentStore.getState().clearError()`呼び出しはアクション呼び出しのため、ファサードの`clearError`アクション経由を維持する（状態読み取りではないため変更不要）
  - _Requirements: 2.1, 2.2_

- [x] 5.2 (P) AgentInfo型のimport元を変更するコンポーネント群を更新する
  - `CreateSpecDialog.tsx`、`CreateBugDialog.tsx`、`BugActionButtons.tsx`、`projectStore.ts`のAgentInfo型import元を`shared/api/types`（またはre-export経由）に変更
  - re-exportが`renderer/stores/agentStore.ts`に設定済みであれば、import元変更は最小限になる
  - _Requirements: 3.5_

## Task 6. テストの更新
- [x] 6.1 共有ストアテスト（shared/stores/agentStore.test.ts）にskipPermissionsとgetRunningAgentCountのテストを追加する
  - `skipPermissions`の初期値が`false`であること
  - `setSkipPermissions(true)`で値が更新されること
  - `getRunningAgentCount(specId)`がrunning状態のAgentを正しくカウントすること
  - running Agentがいない場合に0を返すこと
  - _Requirements: 7.4_

- [x] 6.2 ファサードストアテスト（renderer/stores/agentStore.test.ts）をアクション専用構造に更新する
  - 状態フィールドの参照テストを削除
  - アクション（startAgent, stopAgent, resumeAgent等）がSSOTを正しく更新するかのテストに書き換え
  - subscribe-and-sync関連のテストを削除
  - _Requirements: 7.1_

- [x] 6.3 agentStoreAdapter.test.tsから変換関数テストを削除する
  - `toSharedAgentInfo()`関連のテストケースを削除
  - `RendererAgentInfo`型を使っているテストを`AgentInfo`（shared型）に更新
  - _Requirements: 7.1_

- [x] 6.4 コンポーネントテストのモック構造をuseSharedAgentStore対応に更新する
  - AgentListPanel.test.tsx: `useSharedAgentStore`モックの追加（agents, selectedAgentId, skipPermissions）
  - AgentLogPanel.test.tsx: `useSharedAgentStore`モックの追加（agents, selectedAgentId, logs）
  - AgentInputPanel.test.tsx: `useSharedAgentStore`モックの追加（selectedAgentId）
  - ProjectAgentPanel.test.tsx: `useSharedAgentStore`モックの追加（agents, selectedAgentId）
  - SpecList.test.tsx: `getRunningAgentCount`モックを`useRunningAgentCount`フックのモックに変更
  - _Requirements: 7.2_

- [x] 6.5 全テストがパスすることを検証する
  - `task electron:test:run`で全ユニットテストを実行
  - `cd electron-sdd-manager && npm run build && npm run typecheck`でビルド・型チェックを実行
  - 失敗するテストがあれば修正
  - _Requirements: 7.3, 2.5_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | agents等の状態フィールド削除 | 3.1 | Feature |
| 1.2 | subscribe-and-sync削除 | 3.1 | Feature |
| 1.3 | 初期化時のgetAgentsFromShared()呼び出し削除 | 3.1 | Feature |
| 1.4 | getAgentsFromShared(), calculateRunningCounts()削除 | 3.1 | Feature |
| 2.1 | selectedAgentIdのSSOT直接読み取り | 4.1, 4.2, 4.3, 4.4, 5.1 | Feature |
| 2.2 | agentsのSSOT直接読み取り | 4.1, 4.2, 4.3, 4.4, 5.1 | Feature |
| 2.3 | logsのSSOT直接読み取り（移行） | 4.2 | Feature |
| 2.4 | skipPermissionsのSSOT直接読み取り | 4.1 | Feature |
| 2.5 | 移行後のコンポーネント動作維持 | 6.5 | Feature |
| 3.1 | SharedAgentInfoにretryCount追加（確認のみ） | 2.1 | Feature |
| 3.2 | SharedAgentInfoにexecutionMode追加（確認のみ） | 2.1 | Feature |
| 3.3 | Renderer固有AgentInfo型の削除 | 2.1 | Feature |
| 3.4 | toRendererAgentInfo(), toSharedAgentInfo()削除 | 2.2 | Feature |
| 3.5 | 全コンポーネントでSharedAgentInfo使用 | 2.1, 5.2 | Feature |
| 4.1 | useSharedAgentStoreにskipPermissions追加 | 1.1 | Feature |
| 4.2 | useSharedAgentStoreにsetSkipPermissions追加 | 1.1 | Feature |
| 4.3 | ファサードからskipPermissions削除 | 3.1 | Feature |
| 4.4 | AgentListPanelがSSOTからskipPermissions読み取り | 4.1 | Feature |
| 5.1 | SSOTにgetRunningAgentCount()追加 | 1.2 | Feature |
| 5.2 | SpecListがSSOTのgetRunningAgentCount()使用 | 4.5 | Feature |
| 5.3 | ファサードからrunningAgentCounts削除 | 3.1 | Feature |
| 6.1 | アクションがファサードに残る | 3.1 | Feature |
| 6.2 | アクション内部でSSOTメソッド呼び出し | 3.1 | Feature |
| 6.3 | setupEventListeners()のtRPC初期化維持 | 3.1 | Feature |
| 7.1 | agentStore.test.ts更新 | 6.2, 6.3 | Testing |
| 7.2 | コンポーネントテストのモック更新 | 6.4 | Testing |
| 7.3 | 全テストパス | 6.5 | Testing |
| 7.4 | 共有ストアテスト拡張 | 6.1 | Testing |
