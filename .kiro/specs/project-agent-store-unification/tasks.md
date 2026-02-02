# Implementation Plan

## 1. SharedAgentStore の ensureLogsLoaded シグネチャ拡張

- [x] 1.1 (P) ensureLogsLoaded に specIdHint パラメータを追加
  - オプショナルパラメータ `specIdHint?: string` を追加する
  - agentがstoreに存在しない場合のフォールバックとして `specIdHint` を使用する
  - `specIdHint` も未指定の場合は空文字 `''` をデフォルトとして使用する
  - 既存の呼び出しパターン（specIdHint未指定）の後方互換性を維持する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: ensureLogsLoaded_
  - _Verify: Grep "specIdHint" in agentStore.ts_

## 2. Remote UI LeftSidebar のリファクタリング

- [x] 2.1 projectAgents ローカルstate を削除
  - `useState<AgentInfo[]>(projectAgents)` を削除する
  - `setProjectAgents` を使用するすべての useEffect を削除する
  - 3秒ポーリングの setInterval 呼び出しを削除する
  - `useSharedAgentStore((state) => state.getAgentsForSpec(''))` で ProjectAgent を取得する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Method: useSharedAgentStore, getAgentsForSpec_
  - _Verify: Grep "getAgentsForSpec('')" in App.tsx_

- [x] 2.2 (P) ProjectAgent のソートロジックを実装
  - `useMemo` を使用して running 優先・startedAt 降順のソートを適用する
  - SharedAgentStore から取得した ProjectAgent リストに対してソートする
  - _Requirements: 1.5_
  - _Method: useMemo_

- [x] 2.3 handleSelectAgent を簡素化
  - `addAgent('', agent)` の呼び出しを削除する
  - `selectAgent(agentId)` のみの呼び出しに簡素化する
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: selectAgent_

## 3. Remote UI RightSidebar の調整

- [x] 3.1 (P) RightSidebar の handleSelectAgent を簡素化
  - `addAgent` 呼び出しを削除し `selectAgent(agentId)` のみに簡素化する
  - SpecAgent の handleSelectAgent も同様のパターンに統一する
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: selectAgent_

## 4. Remote UI FooterContent の依存配列修正

- [x] 4.1 (P) useEffect 依存配列から selectedAgent を削除
  - `ensureLogsLoaded` を呼び出す useEffect から `selectedAgent` を依存配列から削除する
  - `selectedAgentId` 変更時のみ `ensureLogsLoaded` を呼び出すようにする
  - `ensureLogsLoaded` 呼び出し時に `specIdHint=''` を渡す（ProjectAgent 対応）
  - _Requirements: 2.5_
  - _Method: ensureLogsLoaded_
  - _Verify: Grep "ensureLogsLoaded.*specIdHint" in App.tsx_

## 5. Electron版との整合性確認

- [x] 5.1 (P) Electron版 ProjectAgentPanel の設計確認
  - Electron版が既に SharedAgentStore の SSOT パターンに準拠していることを確認する
  - ProjectAgent のローカルstate が存在しないことを確認する
  - 追加修正が不要であることを検証する
  - _Requirements: 4.1, 4.2, 4.3_

## 6. テストの更新

- [x] 6.1 ensureLogsLoaded 新シグネチャのテストケース追加
  - agent が store に存在しない場合に specIdHint が使用されることを検証する
  - specIdHint 未指定時に空文字がデフォルトとして使用されることを検証する
  - 既存の呼び出しパターン（specIdHint未指定）が正常動作することを検証する
  - _Requirements: 5.1_

- [x] 6.2 ユニットテスト通過の確認
  - すべての agentStore 関連テストが通過することを確認する
  - Remote UI 関連のテストが存在する場合、更新・修正する
  - _Requirements: 5.2, 5.3_

## 7. 統合確認

- [x] 7.1 動作検証
  - ビルドが成功することを確認する（`npm run build && npm run typecheck`）
  - Remote UI Desktop版で ProjectAgent が SharedAgentStore から正しく表示されることを確認する
  - Agent 起動後に WebSocket イベントで UI がリアルタイム更新されることを確認する
  - ProjectAgent 選択時にログが正しく表示されることを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `projectAgents` useState 削除 | 2.1 | Feature |
| 1.2 | `setProjectAgents` 使用の useEffect 削除 | 2.1 | Feature |
| 1.3 | 3秒ポーリング削除 | 2.1 | Feature |
| 1.4 | `getAgentsForSpec('')` 使用 | 2.1 | Feature |
| 1.5 | running 優先・startedAt 降順ソート | 2.2 | Feature |
| 2.1 | `specIdHint` パラメータ追加 | 1.1 | Feature |
| 2.2 | agent 未発見時に specIdHint 使用 | 1.1 | Feature |
| 2.3 | specIdHint 未指定時に空文字使用 | 1.1 | Feature |
| 2.4 | 後方互換性維持 | 1.1 | Feature |
| 2.5 | FooterContent 依存配列から `selectedAgent` 削除 | 4.1 | Feature |
| 3.1 | `addAgent` 呼び出し削除 | 2.3, 3.1 | Feature |
| 3.2 | `selectAgent(agentId)` のみに簡素化 | 2.3, 3.1 | Feature |
| 3.3 | SharedAgentStore 前提の設計 | 2.3, 3.1 | Feature |
| 4.1 | Electron版ローカルstate 確認・削除 | 5.1 | Infrastructure |
| 4.2 | 同一の useSharedAgentStore 使用 | 5.1 | Infrastructure |
| 4.3 | 同等の動作保証 | 5.1, 7.1 | Infrastructure |
| 5.1 | ensureLogsLoaded 新シグネチャテスト | 6.1 | Feature |
| 5.2 | App.tsx 関連テスト更新 | 6.2 | Feature |
| 5.3 | ユニットテスト通過 | 6.2, 7.1 | Feature |
