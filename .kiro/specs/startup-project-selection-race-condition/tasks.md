# Implementation Plan

- [x] 1. DI 基盤の拡張（ContextServices インターフェース）
- [x] 1.1 `ContextServices` インターフェースに `getInitialSelectResult` と `clearInitialSelectResult` を追加し、`createDefaultServices` にデフォルト実装を追加する
  - `getInitialSelectResult: () => SelectProjectResultLike | null` を追加（デフォルト: `() => null`）
  - `clearInitialSelectResult: () => void` を追加（デフォルト: `() => {}`）
  - _Requirements: 1.4, 1.5, 4.1, 4.2_
  - _Method: ContextServices, createDefaultServices_
  - _Verify: Grep "getInitialSelectResult|clearInitialSelectResult" in context.ts_

- [x] 1.2 テストヘルパーの `createMockServices` にモックプロパティを追加する
  - `getInitialSelectResult` と `clearInitialSelectResult` のモック関数を追加
  - _Requirements: 4.1_
  - _Method: createMockServices_
  - _Verify: Grep "getInitialSelectResult|clearInitialSelectResult" in test-helpers.ts_

- [x] 2. Pull API の実装と DI 注入
- [x] 2.1 (P) `project` router に `getInitialSelectResult` query を追加する
  - `ctx.services.getInitialSelectResult()` でキャッシュを取得し、結果がある場合は `ctx.services.clearInitialSelectResult()` でクリアしてから返却する
  - キャッシュが null の場合は null をそのまま返却する（read-and-clear セマンティクス）
  - _Requirements: 1.1, 1.2, 1.3_
  - _Method: getInitialSelectResult query, ctx.services.getInitialSelectResult, ctx.services.clearInitialSelectResult_
  - _Verify: Grep "getInitialSelectResult" in project.ts_

- [x] 2.2 (P) `handler.ts` の `setupTRPCHandler` で `projectSetup.ts` の実関数を DI 注入する
  - `mergedOverrides` に `getInitialSelectResult` と `clearInitialSelectResult` を追加し、`projectSetup.ts` の関数を注入する
  - **注**: `projectSetup.ts` の `getInitialSelectResult()` は `SelectProjectResult` 型を返すが、`ContextServices` は `SelectProjectResultLike` で定義。構造的型付けにより互換であり、型アサーション（`as`）は不要
  - _Requirements: 4.3_
  - _Method: setupTRPCHandler, mergedOverrides_
  - _Verify: Grep "getInitialSelectResult|clearInitialSelectResult" in handler.ts_

- [x] 3. Renderer の Pull 実装と Push モデルの除去
- [x] 3.1 `App.tsx` で起動時 Pull の `useEffect` を実装し、既存の `onProjectSelected` Subscription を削除する
  - マウント完了後に `vanillaClient.project.getInitialSelectResult.query()` を呼び出す
  - 結果が null でない場合、`applySelectProjectResult(result)` でストアに適用する（`applySelectProjectResult` は `useProjectStore()` Hook 経由で取得済みの関数を `useEffect` 内で使用する。Zustand store の関数は安定した参照を持つため依存配列への追加は不要）
  - `useRef` で1回限り実行を保証する（StrictMode 二重実行防止）
  - エラー発生時は `console.error` でログ出力し、クラッシュを防止する
  - `trpc.events.onProjectSelected.useSubscription()` フックを削除する
  - Subscription 削除時に、関連するコメント（line 538-539 の `startup-project-selection-fix` / `Task 9.2` コメント）も合わせてクリーンアップする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.6_
  - _Method: vanillaClient.project.getInitialSelectResult.query, applySelectProjectResult, useRef_
  - _Verify: Grep "getInitialSelectResult|applySelectProjectResult" in App.tsx_

- [x] 4. Push モデルの除去（Main process 側）
- [x] 4.1 (P) `main/index.ts` から `broadcastInitialProjectSelection` 関数を削除し、`ready-to-show` ハンドラーからの呼び出しと不要な import を削除する
  - `broadcastInitialProjectSelection` 関数定義を削除
  - `ready-to-show` イベントハンドラー内の `broadcastInitialProjectSelection()` 呼び出しを削除
  - `getInitialSelectResult`, `clearInitialSelectResult` の import を削除（query ハンドラーから直接使用するため）
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4.2 (P) `events.ts` router から `onProjectSelected` Subscription を削除する
  - `onProjectSelected` Subscription プロシージャ定義を削除
  - 関連する import がある場合は削除
  - _Requirements: 3.4_

- [x] 4.3 (P) `eventBus.ts` から `EVENT_NAMES.PROJECT_SELECTED` 定数を削除する
  - `PROJECT_SELECTED` イベント名の定義を削除
  - _Requirements: 3.5_

- [x] 5. テストの追加と既存テストの修正
- [x] 5.1 `project` router の `getInitialSelectResult` query テストを追加する
  - キャッシュ有りの場合: 結果を返却し、`clearInitialSelectResult` が呼ばれたことを検証する
  - キャッシュ無しの場合: null を返却することを検証する
  - `createTestCaller` パターンで DI モックを使用する
  - _Requirements: 5.1, 5.2_
  - _Method: createTestCaller, createMockServices_
  - _Verify: Grep "getInitialSelectResult" in project-router.test.ts_

- [x] 5.2 (P) `main/index.test.ts` の `broadcastInitialProjectSelection` テストブロックを削除する
  - _Requirements: 5.3_

- [x] 5.3 (P) `events-router.test.ts` の `onProjectSelected` テストを削除し、Subscription 一覧テストの期待値を修正する
  - `onProjectSelected` テストケースを削除
  - Subscription 一覧テストの数を1減らす（37→36）
  - _Requirements: 5.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `getInitialSelectResult` query 追加 | 2.1 | Feature |
| 1.2 | キャッシュ取得 + クリア | 2.1 | Feature |
| 1.3 | キャッシュ null 時は null 返却 | 2.1 | Feature |
| 1.4 | `ContextServices` に getter/clearer 追加 | 1.1, 1.2 | Infrastructure |
| 1.5 | `createDefaultServices` にデフォルト実装追加 | 1.1 | Infrastructure |
| 2.1 | `useEffect` で query 呼び出し | 3.1 | Feature |
| 2.2 | 結果を `applySelectProjectResult` に適用 | 3.1 | Feature |
| 2.3 | `useRef` で1回限り実行 | 3.1 | Feature |
| 2.4 | エラー時の `console.error` | 3.1 | Feature |
| 3.1 | `broadcastInitialProjectSelection` 削除 | 4.1 | Cleanup |
| 3.2 | `ready-to-show` から呼び出し削除 | 4.1 | Cleanup |
| 3.3 | import から getter/clearer 削除 | 4.1 | Cleanup |
| 3.4 | `onProjectSelected` Subscription 削除 | 4.2 | Cleanup |
| 3.5 | `EVENT_NAMES.PROJECT_SELECTED` 削除 | 4.3 | Cleanup |
| 3.6 | `onProjectSelected.useSubscription` 削除 | 3.1 | Cleanup |
| 4.1 | `ContextServices` に getter/clearer 追加 | 1.1 | Infrastructure |
| 4.2 | `createDefaultServices` デフォルト実装 | 1.1 | Infrastructure |
| 4.3 | `handler.ts` で DI 注入 | 2.2 | Integration |
| 5.1 | query テスト（キャッシュ有り/無し） | 5.1 | Test |
| 5.2 | キャッシュクリア検証 | 5.1 | Test |
| 5.3 | `broadcastInitialProjectSelection` テスト削除 | 5.2 | Cleanup |
| 5.4 | `onProjectSelected` テスト削除 | 5.3 | Cleanup |
