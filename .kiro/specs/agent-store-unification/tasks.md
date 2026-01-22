# Implementation Plan

## Task 1: shared/agentStoreのデータ構造修正

- [x] 1.1 agentsフィールドのデータ構造を変更
  - 既存の `Map<string, AgentInfo>` を `Map<string, AgentInfo[]>` に変更
  - キーはspecId、値はそのSpecに属するAgent配列
  - 空文字列のspecIdはProject Agentを表す
  - _Requirements: 1.1_

- [x] 1.2 (P) getAgentsForSpec(specId)メソッドを実装
  - 指定specIdに対応するAgent配列を取得
  - 存在しない場合は空配列を返却
  - _Requirements: 1.2_

- [x] 1.3 (P) getAgentById(agentId)メソッドを修正
  - 全specを走査して該当Agentを検索
  - 見つからない場合はundefinedを返却
  - _Requirements: 1.3_

- [x] 1.4 addAgent(specId, agent)メソッドを修正
  - 該当specの配列が存在しない場合は新規作成
  - 既存配列に追加（重複チェックはagentIdで実施）
  - _Requirements: 1.4_

- [x] 1.5 (P) removeAgent(agentId)メソッドを修正
  - 全specから該当Agentを検索して削除
  - 削除後に空になった配列はそのまま保持（削除しない）
  - _Requirements: 1.5_

- [x] 1.6 (P) updateAgentStatus(agentId, status)メソッドを修正
  - 全specから該当Agentを検索して更新
  - ステータス更新と同時にlastActivityAtも更新
  - _Requirements: 1.6_

## Task 2: Electron IPC Adapterの作成

- [x] 2.1 agentStoreAdapter.tsファイルを作成
  - `src/renderer/stores/agentStoreAdapter.ts` に新規作成
  - 既存renderer/agentStoreからIPC関連コードを抽出
  - _Requirements: 2.1_

- [x] 2.2 agentOperationsオブジェクトを実装
  - startAgent: Agent起動とshared/agentStoreへの登録
  - stopAgent: Agent停止リクエスト
  - resumeAgent: Agent再開リクエスト
  - removeAgent: Agent削除リクエストとshared/agentStoreからの削除
  - sendInput: Agent入力送信
  - loadAgentLogs: ログ読み込みとshared/agentStoreへの設定
  - _Requirements: 2.2, 2.3_

- [x] 2.3 setupAgentEventListeners()関数を実装
  - onAgentOutput: ログ追加をshared/agentStoreに反映
  - onAgentStatusChange: ステータス更新をshared/agentStoreに反映
  - onAgentRecordChanged: Agent追加/更新/削除をshared/agentStoreに反映
  - クリーンアップ関数を返却しリスナー解除を可能にする
  - _Requirements: 2.4, 2.5_

- [x] 2.4 (P) skipPermissions管理をAdapterに移動
  - setSkipPermissions: 設定変更と永続化
  - loadSkipPermissions: プロジェクトパスから設定読み込み
  - getSkipPermissions: 現在値取得
  - _Requirements: 2.6_

## Task 3: renderer/agentStoreのFacade化

- [x] 3.1 renderer/agentStoreをFacadeとして再実装
  - 既存ファイルを完全書き換え
  - Zustand create()でFacadeを作成
  - useSharedAgentStoreをインポートして委譲
  - _Requirements: 3.1, 3.2_

- [x] 3.2 全メソッドの委譲を実装
  - 状態取得: shared/agentStoreから取得
  - 状態更新アクション: shared/agentStoreに委譲
  - IPC操作アクション: agentStoreAdapterに委譲
  - _Requirements: 3.3_
  - _Verify: Grep "useSharedAgentStore|agentOperations" in agentStore.ts_

- [x] 3.3 (P) 型のre-exportを実装
  - AgentInfo型をshared/agentStoreから再export
  - AgentStatus型をshared/agentStoreから再export
  - LogEntry型をshared/agentStoreから再export
  - _Requirements: 3.4_

- [x] 3.4 (P) ヘルパーメソッドを実装
  - getAgentById: shared/agentStoreに委譲
  - getAgentsForSpec: shared/agentStoreに委譲
  - getProjectAgents: specId=''のAgentを返却
  - getRunningAgentCount: 実行中Agent数をカウント
  - findAgentById: 後方互換性（getAgentByIdのエイリアス）
  - _Requirements: 3.5_

- [x] 3.5 (P) Electron固有機能を公開
  - skipPermissions: Adapterから取得
  - setSkipPermissions: Adapterに委譲
  - loadSkipPermissions: Adapterに委譲
  - _Requirements: 3.6_

- [x] 3.6 setupEventListeners()を実装
  - Adapter経由でIPCイベントリスナーを設定
  - クリーンアップ関数を返却
  - _Requirements: 3.7_

## Task 4: 状態同期機構の実装

- [x] 4.1 useSharedAgentStore.subscribe()による監視を実装
  - Facade初期化時にsubscribeを設定
  - 変更検知でFacadeの状態を更新
  - _Requirements: 4.1, 4.2_

- [x] 4.2 (P) 全状態フィールドの同期を実装
  - agents: Map<specId, AgentInfo[]>形式で同期
  - selectedAgentId: 選択中AgentID
  - logs: Agent別ログ
  - isLoading: 読み込み状態
  - error: エラーメッセージ
  - データ構造が統一されているため変換処理は不要
  - _Requirements: 4.3, 4.4_

- [x] 4.3 (P) Zustandアクセスパターンの互換性確認
  - セレクタパターン: `useAgentStore((state) => state.xxx)` の動作確認
  - 分割代入パターン: `const { xxx } = useAgentStore()` の動作確認
  - 既存21コンポーネントのアクセスパターンとの互換性
  - _Requirements: 4.5_

## Task 5: 統合テストと動作検証

- [x] 5.1 Spec選択時の動作検証
  - 実行中Agentがない状態でSpec選択 → ログエリア空表示の確認
  - 実行中Agentがある状態でSpec選択 → 最新Agent自動選択の確認
  - Agent interrupted後に別Spec選択 → 古いログ非表示の確認
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.2 (P) ビルドと型チェックの実行
  - `npm run build` がエラーなく完了
  - `npm run typecheck` がエラーなく完了
  - _Requirements: 5.4, 5.5_

- [x] 5.3 コンポーネント互換性の確認
  - 21個のコンポーネントのimport文が変更されていないこと
  - データ構造が `Map<specId, AgentInfo[]>` に統一されていること
  - _Requirements: 5.6, 5.7_

---

## Inspection Fixes

### Round 2 (2026-01-22)

- [x] 6.1 renderer/agentStore.tsをFacadeに置き換え
  - 関連: Task 3.1, 3.2, Requirement 3.1, 3.2
  - 現在の独立した実装を削除し、agentStoreFacade.tsの実装をagentStore.tsに移動
  - useAgentStoreFacadeをuseAgentStoreにリネーム
  - 既存のimport文（`from './agentStore'`）が動作するようにする
  - AgentInfo型はshared/agentStoreの型を使用し、agentIdからidへのマッピングをAdapter層で実施

- [x] 6.2 agentStoreFacade.tsの削除
  - 関連: Task 6.1
  - 実装をagentStore.tsに移動後、agentStoreFacade.tsを削除
  - 関連するテストファイルのimport文を更新

- [x] 6.3 specStoreFacadeのagentStore連携を更新
  - 関連: Task 6.1, Requirement 4.1
  - specStoreFacade.tsがFacade化されたagentStoreを正しく参照することを確認
  - AgentInfo型の互換性を確保

- [x] 6.4 ビルドと型チェックの実行
  - 関連: Requirement 5.4, 5.5
  - `npm run typecheck` が成功することを確認
  - `npm run test` が成功することを確認
  - 21個のコンポーネントのimport文が変更されていないことを確認

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | agentsフィールドを`Map<string, AgentInfo[]>`に変更 | 1.1 | Infrastructure |
| 1.2 | getAgentsForSpec(specId)実装 | 1.2 | Infrastructure |
| 1.3 | getAgentById(agentId)実装 | 1.3 | Infrastructure |
| 1.4 | addAgent(specId, agent)実装 | 1.4 | Infrastructure |
| 1.5 | removeAgent(agentId)実装 | 1.5 | Infrastructure |
| 1.6 | updateAgentStatus(agentId, status)実装 | 1.6 | Infrastructure |
| 2.1 | agentStoreAdapter.tsファイル作成 | 2.1 | Infrastructure |
| 2.2 | agentOperationsオブジェクト提供 | 2.2 | Infrastructure |
| 2.3 | agentOperationsがelectronAPI呼び出し | 2.2 | Infrastructure |
| 2.4 | setupAgentEventListeners()関数提供 | 2.3 | Infrastructure |
| 2.5 | クリーンアップ関数を返す | 2.3 | Infrastructure |
| 2.6 | skipPermissions管理をAdapter内で実装 | 2.4 | Infrastructure |
| 3.1 | renderer/agentStoreをFacade化 | 3.1 | Infrastructure |
| 3.2 | Facade内でuseSharedAgentStoreをインポート | 3.1 | Infrastructure |
| 3.3 | Facadeメソッドが委譲を実行 | 3.2 | Infrastructure |
| 3.4 | 型のre-export | 3.3 | Infrastructure |
| 3.5 | ヘルパーメソッド提供 | 3.4 | Feature |
| 3.6 | Electron固有機能公開 | 3.5 | Feature |
| 3.7 | setupEventListeners()公開 | 3.6 | Feature |
| 4.1 | subscribe()でshared store監視 | 4.1 | Infrastructure |
| 4.2 | 状態変更の即時反映 | 4.1 | Infrastructure |
| 4.3 | 状態フィールド同期 | 4.2 | Infrastructure |
| 4.4 | 変換処理なしで同期 | 4.2 | Infrastructure |
| 4.5 | セレクタ/分割代入両パターン対応 | 4.3 | Feature |
| 5.1 | 実行中Agentなし時のログエリア空表示 | 5.1 | Feature |
| 5.2 | 実行中Agent自動選択 | 5.1 | Feature |
| 5.3 | interrupted後の別Spec選択時に古いログ非表示 | 5.1 | Feature |
| 5.4 | E2Eテストパス | 5.2 | Validation |
| 5.5 | ユニットテストパス | 5.2 | Validation |
| 5.6 | 21個のコンポーネントのimport文不変 | 5.3 | Validation |
| 5.7 | データ構造統一確認 | 5.3 | Validation |
