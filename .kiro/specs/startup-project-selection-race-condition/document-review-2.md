# Specification Review Report #2

**Feature**: startup-project-selection-race-condition
**Review Date**: 2026-02-07
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, document-review-1.md, document-review-1-reply.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 深刻度 | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 2 |
| Info | 2 |

Review #1 で指摘された3件の修正（W1: Requirements重複解消、W2: Open Questionsクローズ、I2: Task 5.3期待値確定）が全て正しく適用されていることを確認しました。ソースコード検証により仕様の記載内容は全て正確であることが再確認されました。新たに2件のWarningと2件のInfoを検出しました。

## 0. Review #1 修正適用状況

### W1: Requirements 1.4/1.5 と 4.1/4.2 の重複解消 ✅ 適用済み

requirements.md で以下の修正を確認:
- Requirement 4.1: `~~ContextServicesへの getter/clearer 追加~~ → Requirement 1.4 参照（同一内容のため統合）`
- Requirement 4.2: `~~createDefaultServicesのデフォルト実装~~ → Requirement 1.5 参照（同一内容のため統合）`

### W2: Open Questions のクローズ ✅ 適用済み

requirements.md の Open Questions セクションで以下を確認:
- E2Eテスト更新: `→ **解決済み**: Design UJ-001/UJ-002 の分析により、既存 E2E テストは Pull モデルでもそのまま動作する`
- `onProjectSelected` 使用箇所: `→ **解決済み**: ソースコード grep により使用箇所は全て本仕様の削除対象`

### I2: Task 5.3 の期待値確定 ✅ 適用済み

tasks.md の Task 5.3 で以下を確認:
- `Subscription 一覧テストの数を1減らす（37→36）` （曖昧な「37→36等」から確定値に修正済み）

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**評価: 良好（Review #1 から変化なし）**

全5要件がDesignで完全にカバーされています。Review #1 で指摘されたRequirement 4.1/4.2の重複もクリーンに統合されました。

### 1.2 Design ↔ Tasks Alignment

**評価: 良好（Review #1 から変化なし）**

全11の Design Component が Tasks にマッピングされています。

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

### 1.6 Cross-Document Contradictions

**検出なし。** Review #1 からの改善により、Open Questions もクローズされ、ドキュメント間の一貫性が向上しています。

**ソースコード検証結果（再確認）**:

| 仕様記載 | ソースコード | Status |
|----------|-------------|--------|
| `broadcastInitialProjectSelection` in `main/index.ts` | ✅ 存在（line 183-205） | ✅ |
| `ready-to-show` ハンドラーからの呼び出し | ✅ 存在（line 246） | ✅ |
| `onProjectSelected` Subscription in `events.ts` | ✅ 存在（line 194-196） | ✅ |
| `EVENT_NAMES.PROJECT_SELECTED` in `eventBus.ts` | ✅ 存在（line 31） | ✅ |
| `onProjectSelected.useSubscription` in `App.tsx` | ✅ 存在（line 295-301） | ✅ |
| `get/set/clearInitialSelectResult` in `projectSetup.ts` | ✅ 全て存在 | ✅ |
| `ContextServices` に getter/clearer なし | ✅ 確認（未追加） | ✅ |
| `getInitialSelectResult` query なし in project router | ✅ 確認（未追加） | ✅ |
| `SelectProjectResultLike` type in `context.ts` | ✅ 存在（line 104-113） | ✅ |
| Subscription 数 37 | ✅ 確認（events-router.test.ts） | ✅ |
| `applySelectProjectResult` in `App.tsx` | ✅ 存在（line 540, useProjectStore経由） | ✅ |
| `getVanillaClient` in `App.tsx` | ✅ 存在（line 74, 広範に使用） | ✅ |

## 2. Gap Analysis

### 2.1 Technical Considerations

#### WARNING: `SelectProjectResultLike` vs `SelectProjectResult` の型不整合リスク

**新規検出**: Design および Requirements では ContextServices の `getInitialSelectResult` の戻り値型を `SelectProjectResultLike | null` と定義しています（context.ts:104-113）。一方、`projectSetup.ts` の実装（line 106-108）は `SelectProjectResult`（renderer/types/index.ts:245-）を返します。

| 型 | 定義場所 | フィールドの違い |
|----|----------|-----------------|
| `SelectProjectResultLike` | `context.ts:104` | `specs: Array<{ name: string }>`, `bugs: Array<Record<string, unknown>>` |
| `SelectProjectResult` | `renderer/types/index.ts:245` | `specs: SpecMetadata[]`, `bugs: BugMetadata[]` |

TypeScript の構造的型付けにより `SelectProjectResult` は `SelectProjectResultLike` の supertype として互換性がありますが、DI 注入時にキャストの必要性が生じる可能性があります。

**影響箇所**: Task 2.2（handler.ts で DI 注入）で `projectSetup.getInitialSelectResult` を `ContextServices.getInitialSelectResult` に注入する際、型の互換性を確認する必要があります。

**推奨**: Design の Implementation Notes に `projectSetup.ts` の `SelectProjectResult` が `SelectProjectResultLike` と構造的に互換であることを注記し、Task 2.2 の実装時に型アサーション（`as`）が不要であることを明記する。

#### WARNING: `App.tsx` の `applySelectProjectResult` の取得方法

**新規検出**: Design では Task 3.1 の実装について「`applySelectProjectResult(result)` を呼び出してストアに適用する」と記載されていますが、`applySelectProjectResult` の具体的な取得方法が明記されていません。

現在のソースコードを確認すると:
- `App.tsx:540`: `const { applySelectProjectResult } = useProjectStore();` （React Hook 経由で取得）
- 既存の `onProjectSelected` Subscription ハンドラ（line 295-301）では、この Hook 経由の値を使用

しかし、Task 3.1 の `useEffect` 内では `vanillaClient` を使用する設計です。`useEffect` の中で `applySelectProjectResult`（Hook 由来）を呼び出す場合、React の依存配列の扱いに注意が必要です。

現行コードの `onProjectSelected` Subscription ハンドラーが既に同様のパターン（Hook 由来の `applySelectProjectResult` を Subscription コールバック内で使用）を採用しているため、実装上は問題ないですが、Design で明示的に触れておくとより安全です。

### 2.2 Operational Considerations

**特記事項なし。** E2E テストへの影響も Open Questions で解決済みです。

## 3. Ambiguities and Unknowns

#### INFO: `App.tsx` の `onProjectSelected` 関連コメント（line 538）の削除

`App.tsx` line 538 に以下のコメントが残っています:
```
// startup-project-selection-fix Task 5.1: onProjectSelected listener
```

Requirements 3.6 では `onProjectSelected.useSubscription` フックの削除を規定していますが、このコメントの削除については明示的に触れていません。Task 3.1 で Subscription フック削除時にこの関連コメントも合わせてクリーンアップすべきです。

#### INFO: 並列実行可能タスクの依存関係

Tasks.md で `(P)` マークされたタスク（2.1/2.2、4.1/4.2/4.3、5.2/5.3）は並列実行可能とされています。この依存関係は適切ですが、Task 4.2（events.ts の Subscription 削除）と Task 4.3（eventBus.ts の定数削除）は、削除する `onProjectSelected` が `EVENT_NAMES.PROJECT_SELECTED` を参照しているため、実装順序に注意が必要です（events.ts → eventBus.ts の順で削除、または同時削除が安全）。実際には両方の削除は独立しているため問題はありませんが、注記として記録します。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**評価: 優秀（Review #1 から変化なし）**

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

**特筆事項**: 本仕様の Pull モデル設計は `structure.md` の「ステート配置の判断基準」に完全に準拠しています。起動時のプロジェクト選択結果はセッション状態であり、Main Process で保持すべきものです。Renderer が tRPC query で Pull する設計は正しいアーキテクチャパターンです。

### 4.2 Integration Concerns

**Remote UI 影響**: 対象外として適切に Out of Scope で管理されています。

**`onMenuOpenProject` Subscription**: 影響を受けないことが Decision Log で確認済みです。

### 4.3 Migration Requirements

段階的移行は不要。1回のリリースで完了する変更です。

## 5. Recommendations

### Critical Issues (Must Fix)

なし。

### Warnings (Should Address)

1. **`SelectProjectResultLike` vs `SelectProjectResult` の型互換性注記**: Design に `projectSetup.ts` が返す `SelectProjectResult` 型が `SelectProjectResultLike` と構造的に互換であることを注記する。Task 2.2 の DI 注入時にキャストが不要であることを明記することで、実装時の混乱を防ぐ。

2. **`App.tsx` の `applySelectProjectResult` 取得方法の明記**: Task 3.1 の実装で、`useProjectStore()` Hook 経由で取得した `applySelectProjectResult` を `useEffect` 内の `vanillaClient` query コールバックで使用することを Design に明記する。

### Suggestions (Nice to Have)

1. **`App.tsx` line 538 のコメントクリーンアップ**: Task 3.1 で `onProjectSelected` Subscription 削除時に、関連するコメント（line 538）も合わせて削除するよう Tasks に注記を追加。

2. **Task 4.2/4.3 の削除順序の安全性注記**: events.ts と eventBus.ts は独立して削除可能だが、実装者への親切として順序の安全性を注記。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | `SelectProjectResultLike` vs `SelectProjectResult` 型互換性 | Design の Implementation Notes に型互換性を注記。Task 2.2 の説明にキャスト不要である旨を追記 | design.md, tasks.md |
| Warning | `applySelectProjectResult` 取得方法 | Design の System Flows セクションまたは Task 3.1 の説明に、Hook 経由での取得パターンを明記 | design.md または tasks.md |
| Info | `App.tsx` コメントクリーンアップ | Task 3.1 に「line 538 の関連コメントも削除」を追記 | tasks.md |
| Info | Task 4.2/4.3 の削除順序 | 並列実行の安全性を注記（必須ではない） | tasks.md |

---

_This review was generated by the document-review command._
