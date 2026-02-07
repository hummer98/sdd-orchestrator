# Specification Review Report #1

**Feature**: startup-project-selection-race-condition
**Review Date**: 2026-02-07
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 深刻度 | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 3 |
| Info | 3 |

全体として非常に高品質な仕様です。Requirements、Design、Tasks間のトレーサビリティが明確に維持されており、Push→Pullモデルへの移行という設計判断も根拠が妥当です。ソースコード検証により、仕様に記載された既存コード（削除対象含む）の存在が全て確認されています。いくつかの軽微な改善点が見つかりました。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**評価: 良好**

全5要件（Requirement 1-5）がDesignのRequirements Traceability表で完全にカバーされています。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: tRPC Query Pull API (1.1-1.5) | Components表 + Service Interface定義 | ✅ |
| Req 2: Renderer Pull実装 (2.1-2.4) | System Flows + App.tsx修正 | ✅ |
| Req 3: Pushモデル除去 (3.1-3.6) | Integration & Deprecation Strategy | ✅ |
| Req 4: DI基盤拡張 (4.1-4.3) | ContextServices拡張 + handler.ts修正 | ✅ |
| Req 5: テスト (5.1-5.4) | Testing Strategy表 | ✅ |

**重複検出**: Requirement 1.4/1.5 と Requirement 4.1/4.2 は同一内容です。Design の Traceability 表でも「4.1 → 1.4 と同一」「4.2 → 1.5 と同一」と明記されており、認識はされています。

### 1.2 Design ↔ Tasks Alignment

**評価: 良好**

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
| 4.1 | `ContextServices` に getter/clearer 追加 | 1.1 | Infrastructure | ✅ (1.4と重複) |
| 4.2 | `createDefaultServices` デフォルト実装 | 1.1 | Infrastructure | ✅ (1.5と重複) |
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
- [x] tRPC query は同期的な DI パターンでテスト可能（非同期タイミング問題なし）
- [x] Renderer → Main の IPC 通信はテスト対象外（tRPC 層のテストで十分）
- [x] Design に "Robustness Strategy" が明記されている

**Note**: Renderer 側の Pull 実装（`App.tsx` の `useEffect`）については、Design が E2E テスト不要と判断しており（UJ-001: "既存 E2E でカバー"）、この判断は妥当です。Subscription 削除後も `SDD_PROJECT_PATH` 付き起動の E2E テストが既存で存在するため。

### 1.6 Cross-Document Contradictions

**検出なし。** ドキュメント間で用語、仕様値、依存関係の矛盾は見つかりませんでした。

**ソースコード検証結果**:

仕様に記載された既存コードの存在をソースコードで確認しました:

| 仕様記載 | ソースコード | Status |
|----------|-------------|--------|
| `broadcastInitialProjectSelection` in `main/index.ts` | ✅ 存在（line 183-205） | ✅ |
| `ready-to-show` ハンドラーからの呼び出し | ✅ 存在（line 246） | ✅ |
| `onProjectSelected` Subscription in `events.ts` | ✅ 存在（line 194-196） | ✅ |
| `EVENT_NAMES.PROJECT_SELECTED` in `eventBus.ts` | ✅ 存在（line 31） | ✅ |
| `onProjectSelected.useSubscription` in `App.tsx` | ✅ 存在（line 295-300） | ✅ |
| `get/set/clearInitialSelectResult` in `projectSetup.ts` | ✅ 全て存在 | ✅ |
| `ContextServices` に getter/clearer なし | ✅ 確認（未追加） | ✅ |
| Subscription 数 37 | ✅ 確認 | ✅ |

## 2. Gap Analysis

### 2.1 Technical Considerations

#### WARNING: Requirements 1.4/1.5 と 4.1/4.2 の重複

Requirements.md で Requirement 1 と Requirement 4 の一部 acceptance criteria が完全に重複しています:
- 1.4 ≡ 4.1（ContextServices に getter/clearer 追加）
- 1.5 ≡ 4.2（createDefaultServices にデフォルト実装追加）

Design では「4.1 → 1.4 と同一」と認識されているが、要件自体の重複は実装時の混乱を招く可能性があります。

**推奨**: Requirement 4 を「DI 注入（handler.ts）」に限定し、4.1/4.2 を「1.4/1.5 参照」として統合する、または Requirement 4 を削除して Requirement 1 に統合する。

#### INFO: `SelectProjectResultLike` 型の定義元

Requirements 4.1 と Design の Service Interface で `SelectProjectResultLike` 型が使用されていますが、この型の定義元ファイルが明記されていません。既存の型定義ファイルから import する必要があります。

#### INFO: Subscription 数の更新

Design DD-004 で「EventBus のイベント数が37から36に減少」と記載されています。ソースコード検証で現在37であることを確認済みで、この記述は正確です。ただし events-router.test.ts の「Subscription 一覧テストの期待値修正」（Task 5.3）で具体的な修正値が tasks.md に「37→36等」と曖昧に記載されています。

### 2.2 Operational Considerations

#### INFO: E2E テストへの影響

Requirements の Open Questions に「E2E テスト（`diagnostic-project-selection.e2e.spec.ts`）の更新が必要か確認」が残っています。Design では UJ-001/UJ-002 で「既存 E2E でカバー」と判断されていますが、Open Questions としてまだクローズされていません。

## 3. Ambiguities and Unknowns

#### WARNING: Open Questions が未解決

requirements.md の Open Questions に2件の未解決項目があります:

1. **E2E テスト更新の必要性**: `diagnostic-project-selection.e2e.spec.ts` の更新が必要か
2. **`onProjectSelected` の他箇所での使用確認**: Remote UI やマルチウィンドウでの使用有無

Design ではこれらに対して暗黙的に回答しています（E2E は既存でカバー、Subscription は起動時専用）が、Open Questions として明示的にクローズされていません。

#### WARNING: `getInitialProjectPath` との関係

ソースコード検証で、`project` router に既存の `getInitialProjectPath` query（`ctx.services.getInitialProjectPath()` を呼び出す）が存在することがわかりました。新規追加の `getInitialSelectResult` query との命名の類似性が混乱を招く可能性があります。

- `getInitialProjectPath`: パス文字列を返す既存 query
- `getInitialSelectResult`: SelectProjectResult オブジェクトを返す新規 query

Design/Tasks でこの関係について言及がありません。実装時に混同されないよう注意が必要です。

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

### 4.2 Integration Concerns

**Remote UI 影響**: requirements.md の Out of Scope に「Remote UI への初期プロジェクト選択通知は対象外」と明記されています。tech.md の「新規 Spec 作成時の確認事項 - Remote UI 影響チェック」に準拠しています。

**既存機能への影響**: `onMenuOpenProject` Subscription は影響を受けず、menu 経由のプロジェクト選択は従来通り動作します。Decision Log でこの点が確認されています。

### 4.3 Migration Requirements

**段階的移行は不要**: Push→Pull の切替は1回のリリースで完了する小規模な変更です。後方互換性の考慮は不要です。

## 5. Recommendations

### Critical Issues (Must Fix)

なし。

### Warnings (Should Address)

1. **Requirements 1.4/1.5 と 4.1/4.2 の重複解消**: 実装時の混乱を避けるため、重複を明示的に統合するか、参照として整理することを推奨
2. **Open Questions のクローズ**: Design で暗黙的に回答されている Open Questions を requirements.md で明示的にクローズする
3. **`getInitialProjectPath` と `getInitialSelectResult` の関係明記**: 既存の類似 query との違いをDesignに注記する

### Suggestions (Nice to Have)

1. **`SelectProjectResultLike` 型の定義元をDesignに明記**: 実装者が型定義ファイルを探す手間を削減
2. **Task 5.3 の期待値を具体化**: 「37→36等」ではなく「37→36」と確定値を記載
3. **E2E テストの確認結果をOpen Questionsに追記**: Pull 動作で既存 E2E が正常動作するか確認した結果を記録

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | Req 1.4/1.5 と 4.1/4.2 の重複 | Req 4 を handler.ts DI 注入のみに限定するか、4.1/4.2 を「1.4/1.5 参照」に修正 | requirements.md |
| Warning | Open Questions 未解決 | Design の判断結果を踏まえて Open Questions をクローズ | requirements.md |
| Warning | `getInitialProjectPath` との類似性 | Design に既存 query との関係を注記 | design.md |
| Info | `SelectProjectResultLike` 型の定義元 | Design の Interface 定義に import 元を明記 | design.md |
| Info | Task 5.3 の曖昧な期待値 | 「37→36等」を「37→36」に確定 | tasks.md |
| Info | E2E テスト確認結果 | Open Questions に判断結果を追記 | requirements.md |

---

_This review was generated by the document-review command._
