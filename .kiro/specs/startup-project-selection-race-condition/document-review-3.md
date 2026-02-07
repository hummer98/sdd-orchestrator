# Specification Review Report #3

**Feature**: startup-project-selection-race-condition
**Review Date**: 2026-02-07
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, document-review-1.md, document-review-1-reply.md, document-review-2.md, document-review-2-reply.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 深刻度 | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 0 |
| Info | 0 |

Review #1 で指摘された3件の Warning（W1: Requirements重複解消、W2: Open Questionsクローズ、W3: `getInitialProjectPath`との類似性明記）および3件の Info が全て適切に対応されました。Review #2 で指摘された2件の Warning（W1: 型互換性注記、W2: `applySelectProjectResult`取得方法）および2件の Info も全て正しく適用されています。

ソースコード検証により、仕様ドキュメントの記載内容が現行コードベースと完全に整合していることを再確認しました。新たな指摘事項はありません。**本仕様は実装開始可能な品質に達しています。**

## 0. 前回レビュー修正適用状況

### Review #1 修正（document-review-1-reply.md 経由で適用済み）

| # | Issue | Status |
|---|-------|--------|
| W1 | Requirements 1.4/1.5 と 4.1/4.2 の重複解消 | ✅ 適用済み（requirements.md で 4.1/4.2 を strikethrough + 参照に統合） |
| W2 | Open Questions のクローズ | ✅ 適用済み（requirements.md で「解決済み」注釈付きでクローズ） |
| W3 | `getInitialProjectPath` との類似性明記 | ✅ Review #1 reply で対応判断済み |
| I1 | `SelectProjectResultLike` 型の定義元 | ✅ design.md で `context.ts` に言及 |
| I2 | Task 5.3 の期待値確定 | ✅ tasks.md で「37→36」に確定 |
| I3 | E2E テスト確認結果 | ✅ requirements.md の Open Questions でクローズ済み |

### Review #2 修正（document-review-2-reply.md 経由で適用済み）

| # | Issue | Status |
|---|-------|--------|
| W1 | `SelectProjectResultLike` vs `SelectProjectResult` 型互換性注記 | ✅ 適用済み（design.md:218, tasks.md Task 2.2 に注記追加） |
| W2 | `App.tsx` の `applySelectProjectResult` 取得方法 | ✅ 適用済み（tasks.md Task 3.1 に `useProjectStore()` 経由の注記追加） |
| I1 | `App.tsx` line 538 コメントクリーンアップ | ✅ 適用済み（tasks.md Task 3.1 にコメント削除指示追加） |
| I2 | Task 4.2/4.3 の削除順序 | ✅ 対応不要と判断済み（既に `(P)` マークで適切に管理） |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**評価: 優秀**

全5要件が Design で完全にカバーされています。Requirement 4.1/4.2 の重複も「1.4/1.5 参照」として適切に統合済みです。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: tRPC Query Pull API (1.1-1.5) | Components表 + Service Interface定義 | ✅ |
| Req 2: Renderer Pull実装 (2.1-2.4) | System Flows + App.tsx修正 | ✅ |
| Req 3: Pushモデル除去 (3.1-3.6) | Integration & Deprecation Strategy | ✅ |
| Req 4: DI基盤拡張 (4.3のみ実質内容) | handler.ts修正 + ContextServices | ✅ |
| Req 5: テスト (5.1-5.4) | Testing Strategy表 | ✅ |

### 1.2 Design ↔ Tasks Alignment

**評価: 優秀**

全11の Design Component が Tasks にマッピングされています。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| project router `getInitialSelectResult` query | Task 2.1 | ✅ |
| ContextServices拡張 + createDefaultServices | Task 1.1 | ✅ |
| handler.ts DI注入 | Task 2.2 | ✅ |
| App.tsx Pull実装 + Push削除 | Task 3.1 | ✅ |
| main/index.ts cleanup | Task 4.1 | ✅ |
| events.ts Subscription削除 | Task 4.2 | ✅ |
| eventBus.ts 定数削除 | Task 4.3 | ✅ |
| test-helpers.ts モック追加 | Task 1.2 | ✅ |
| project-router.test.ts テスト追加 | Task 5.1 | ✅ |
| index.test.ts テスト削除 | Task 5.2 | ✅ |
| events-router.test.ts テスト削除 | Task 5.3 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| tRPC Query | `getInitialSelectResult` query | Task 2.1 | ✅ |
| DI Interface | ContextServices拡張 | Task 1.1 | ✅ |
| DI Wiring | handler.ts注入 | Task 2.2 | ✅ |
| Renderer Pull | useEffect + vanillaClient | Task 3.1 | ✅ |
| Push Cleanup (Main) | broadcastInitialProjectSelection削除 | Task 4.1 | ✅ |
| Push Cleanup (Events) | onProjectSelected削除 | Task 4.2 | ✅ |
| Push Cleanup (EventBus) | PROJECT_SELECTED削除 | Task 4.3 | ✅ |
| Test Helpers | createMockServices拡張 | Task 1.2 | ✅ |
| Unit Tests | query テスト追加/既存テスト削除 | Task 5.1-5.3 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | `getInitialSelectResult` query 追加 | 2.1 | Feature | ✅ |
| 1.2 | キャッシュ取得 + クリア | 2.1 | Feature | ✅ |
| 1.3 | キャッシュ null 時は null 返却 | 2.1 | Feature | ✅ |
| 1.4 | `ContextServices` に getter/clearer 追加 | 1.1 | Infrastructure | ✅ |
| 1.5 | `createDefaultServices` にデフォルト実装追加 | 1.1 | Infrastructure | ✅ |
| 2.1 | `useEffect` で query 呼び出し | 3.1 | Feature | ✅ |
| 2.2 | 結果を `applySelectProjectResult` に適用 | 3.1 | Feature | ✅ |
| 2.3 | `useRef` で1回限り実行 | 3.1 | Feature | ✅ |
| 2.4 | エラー時の `console.error` | 3.1 | Feature | ✅ |
| 3.1 | `broadcastInitialProjectSelection` 削除 | 4.1 | Cleanup | ✅ |
| 3.2 | `ready-to-show` から呼び出し削除 | 4.1 | Cleanup | ✅ |
| 3.3 | import から getter/clearer 削除 | 4.1 | Cleanup | ✅ |
| 3.4 | `onProjectSelected` Subscription 削除 | 4.2 | Cleanup | ✅ |
| 3.5 | `EVENT_NAMES.PROJECT_SELECTED` 削除 | 4.3 | Cleanup | ✅ |
| 3.6 | `onProjectSelected.useSubscription` 削除 | 3.1 | Cleanup | ✅ |
| 4.1 | 1.4 参照（統合済み） | -- | -- | ✅ |
| 4.2 | 1.5 参照（統合済み） | -- | -- | ✅ |
| 4.3 | `handler.ts` で DI 注入 | 2.2 | Integration | ✅ |
| 5.1 | query テスト（キャッシュ有り/無し） | 5.1 | Test | ✅ |
| 5.2 | キャッシュクリア検証 | 5.1 | Test | ✅ |
| 5.3 | `broadcastInitialProjectSelection` テスト削除 | 5.2 | Cleanup | ✅ |
| 5.4 | `onProjectSelected` テスト削除 | 5.3 | Cleanup | ✅ |

**Validation Results**:
- [x] 全 criterion ID が requirements.md からマッピング済み
- [x] ユーザー対面の criteria に Feature Implementation タスクあり
- [x] Infrastructure のみに依存する criterion なし

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| project router + ContextServices DI | "Integration Test Strategy" | Task 5.1 (createTestCaller DI) | ✅ |

**Validation Results**:
- [x] tRPC query は同期的な DI パターンでテスト可能
- [x] Design に "Robustness Strategy" が明記されている
- [x] UJ-001/UJ-002 で既存 E2E テストがカバーすると判断済み
- [x] E2E テスト不要の判断が Open Questions でクローズ済み

### 1.6 Cross-Document Contradictions

**検出なし。** 3回のレビューを通じて、ドキュメント間の一貫性が高い水準に達しています。

**ソースコード検証結果（最終確認）**:

| 仕様記載 | ソースコード | Status |
|----------|-------------|--------|
| `broadcastInitialProjectSelection` in `main/index.ts` | ✅ 存在（line 183-205） | ✅ |
| `ready-to-show` ハンドラーからの呼び出し | ✅ 存在（line 246） | ✅ |
| `getInitialSelectResult`/`clearInitialSelectResult` import in `main/index.ts` | ✅ 存在（line 11） | ✅ |
| `onProjectSelected` Subscription in `events.ts` | ✅ 存在（line 193-196） | ✅ |
| `EVENT_NAMES.PROJECT_SELECTED` in `eventBus.ts` | ✅ 存在（line 31） | ✅ |
| `onProjectSelected.useSubscription` in `App.tsx` | ✅ 存在（line 294-300） | ✅ |
| `App.tsx` line 537-538 コメント | ✅ 存在（Task 3.1 でクリーンアップ対象） | ✅ |
| `applySelectProjectResult` in `App.tsx` (useProjectStore経由) | ✅ 存在（line 539） | ✅ |
| `get/set/clearInitialSelectResult` in `projectSetup.ts` | ✅ 全て存在（line 103-112） | ✅ |
| `SelectProjectResultLike` type in `context.ts` | ✅ 存在（line 104-113） | ✅ |
| `ContextServices` に getter/clearer なし（未実装） | ✅ 確認 | ✅ |
| `getInitialSelectResult` query なし in project router（未実装） | ✅ 確認 | ✅ |
| Subscription 数 37 | ✅ 確認（events-router.test.ts:502-561、37プロシージャ） | ✅ |
| `getInitialProjectPath` 既存 query in project router | ✅ 存在（line 129） | ✅ |
| `mergedOverrides` in handler.ts | ✅ 存在（line 33-35） | ✅ |

## 2. Gap Analysis

### 2.1 Technical Considerations

**特記事項なし。** Review #1/#2 で指摘された技術的懸念は全て解消されています。

- 型互換性（`SelectProjectResult` → `SelectProjectResultLike`）: design.md/tasks.md に注記済み
- `applySelectProjectResult` の取得方法: tasks.md に明記済み
- `getInitialProjectPath` との命名類似性: Review #1 で認識・対応済み
- Requirements の重複: 統合済み
- Open Questions: 全件クローズ済み

### 2.2 Operational Considerations

**特記事項なし。** E2E テストへの影響は Open Questions でクローズ済み（既存 E2E テストがそのまま動作）。

## 3. Ambiguities and Unknowns

**検出なし。** 全ての曖昧事項は前回レビューで解消されています。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**評価: 優秀**

| Steering 原則 | 仕様の準拠状況 | Status |
|---------------|---------------|--------|
| tRPC Context DI パターン（tech.md） | ContextServices 拡張 + createTestCaller テスト | ✅ |
| vanillaClient パターン（structure.md） | App.tsx で vanillaClient 使用 | ✅ |
| EventBus パターン（structure.md） | 不要な EventBus イベントの適切な除去 | ✅ |
| Main Process ステート保持（structure.md） | キャッシュは Main の projectSetup.ts に保持 | ✅ |
| DRY 原則（design-principles.md） | 既存キャッシュ基盤の再利用 | ✅ |
| KISS 原則（design-principles.md） | Subscription 不要化による簡潔化 | ✅ |
| YAGNI 原則（design-principles.md） | 将来拡張のための Subscription 残置を明示的に却下 | ✅ |
| Electron Process Boundary（structure.md） | ステートは Main で保持、Renderer は Pull で取得 | ✅ |

### 4.2 Integration Concerns

**Remote UI 影響**: 対象外として Out of Scope で適切に管理されています。

**`onMenuOpenProject` Subscription**: 影響を受けないことが Decision Log で確認済みです。

### 4.3 Migration Requirements

段階的移行は不要。1回のリリースで完了する小規模変更です。

## 5. Recommendations

### Critical Issues (Must Fix)

なし。

### Warnings (Should Address)

なし。

### Suggestions (Nice to Have)

なし。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| -- | -- | -- | -- |

**全ての指摘事項は前回レビューで解消済みです。新たなアクション不要。**

## 7. Conclusion

3回のレビューを通じて、本仕様は以下の品質を達成しました:

- **Requirements**: 全 acceptance criteria が明確で、重複が解消され、Open Questions が全件クローズ
- **Design**: Architecture、Components、Service Interface、Testing Strategy が網羅的に定義され、型互換性や取得方法の注記も完備
- **Tasks**: 全 criterion に対応する実装タスクが存在し、並列実行可能性 `(P)` も適切にマーク、実装者向けの注記も充実
- **Steering Alignment**: プロジェクトの設計原則（DRY, KISS, YAGNI）および Electron Process Boundary Rules に完全準拠
- **ソースコード整合性**: 仕様に記載された15箇所の既存コードが全てソースコードで確認済み

**本仕様は実装開始可能です。**

---

_This review was generated by the document-review command._
