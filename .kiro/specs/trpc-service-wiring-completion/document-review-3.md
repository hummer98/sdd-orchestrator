# Specification Review Report #3

**Feature**: trpc-service-wiring-completion
**Review Date**: 2026-02-07
**Documents Reviewed**:
- `spec.json`
- `requirements.md` (Round 2修正適用済み)
- `design.md` (Round 2修正適用済み)
- `tasks.md` (Round 2修正適用済み)
- `research.md`
- `document-review-1.md` + `document-review-1-reply.md`
- `document-review-2.md` + `document-review-2-reply.md`
- `context.ts` (ContextServices型定義 - 全プロパティ直接カウント)
- `handler.ts` (setupTRPCHandler)
- `test-helpers.ts` (createMockServices)
- `index.ts` (setupTRPCHandler呼び出し)
- Steering: `product.md`, `tech.md`, `structure.md`, `design-principles.md`

## Executive Summary

Round 2で指摘されたCritical 1件（配線対象の分類とスコープ）およびWarning 3件は全て修正が適用されている。修正後の仕様書を実コードと精密に照合した結果、仕様全体の整合性は大幅に改善されている。残存する課題は軽微なものに限られる。

| レベル | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 2 |
| Info | 2 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Round 2修正の検証**: ✅ 修正済み
- 「66」→「72」の数値修正がrequirements.md、design.mdの両方に適用されている
- 「requiredプロパティのプロダクション実装差し替え5件 + optionalプロパティの配線67件」の正確な内訳が記載されている
- Req 9にautoExecution/Cloudflare/MCP/Schedule追加6サービス（9.23-9.28）が追加されている

**残存する不整合**: なし

### 1.2 Design ↔ Tasks Alignment

**整合**: ✅
- Task 5.4（AutoExecution・Cloudflare・MCP・Schedule追加6サービス）が追加されている
- Task 6.1にconfirmCommonCommandsのmock追加が前提条件として明記されている
- Requirements Coverage Matrixに9.23-9.28の6件が追加されている

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| productionServices.ts 新規作成 | 72サービス配線 | Task 0.1-0.2, 1.1-5.4 | ✅ |
| productionServices.test.ts | 配線完全性テスト | Task 6.1-6.2 | ✅ |
| 回帰テスト | typecheck, build, test | Task 7.1-7.2 | ✅ |
| handler.ts統合 | index.tsからの呼び出し | Task 0.2 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1-1.3 | File 3サービス配線 | 1.1 | Feature | ✅ |
| 2.1-2.2 | Project 2サービス配線 | 1.2 | Feature | ✅ |
| 3.1-3.7 | Bug 7サービス配線 | 1.3 | Feature | ✅ |
| 4.1 | Spec 1サービス配線 | 2.1 | Feature | ✅ |
| 5.1-5.5 | Agent 5サービス配線 | 2.2 | Feature | ✅ |
| 6.1-6.13 | Git/Worktree 13サービス配線 | 3.1, 3.2 | Feature | ✅ |
| 7.1-7.12 | Install 12サービス配線 | 4.1, 4.2 | Feature | ✅ |
| 8.1 | Schedule 1サービス配線 | 5.1 | Feature | ✅ |
| 9.1-9.22 | Misc 22サービス配線 | 5.2, 5.3 | Feature | ✅ |
| 9.23-9.28 | AutoExecution/Cloudflare/MCP/Schedule 6サービス配線 | 5.4 | Feature | ✅ |
| 10.1-10.4 | 配線完全性テスト | 6.1, 6.2 | Integration Test | ✅ |
| 11.1-11.3 | 回帰検証 | 7.1, 7.2 | Regression | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| productionServices keys vs ContextServices keys | Testing Strategy | 6.1 | ✅ |
| productionServices keys vs mockServices keys | Testing Strategy | 6.2 | ✅ |
| productionServices → handler.ts 注入パス | Integration & Deprecation | 0.2 | ✅ |

**Validation Results**:
- [x] 配線完全性テストが設計されている
- [x] 回帰テスト（既存テスト）が計画されている
- [x] handler.tsへの注入パスがTask 0.2でカバーされている

### 1.6 Cross-Document Contradictions

#### WARNING-1: handler.tsの`serviceOverrides`マージ順序と`eventBus`の配線重複リスク

**問題**: `handler.ts` (L38-43) では `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` の3つが先にセットされ、その後に `...serviceOverrides` でスプレッドされる。つまり `serviceOverrides`（= `createProductionServices()` の返却値）に `eventBus` が含まれている場合、`handler.ts` のEventBus注入が上書きされる。

```typescript
const mergedOverrides: Partial<ContextServices> = {
  eventBus: getGlobalEventBus(),           // handler.ts が先に注入
  getInitialSelectResult: ...,
  clearInitialSelectResult,
  ...serviceOverrides,                      // productionServicesが後からスプレッド
};
```

design.md は「`productionServices.ts` は72プロパティを返し、`handler.ts` で `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` が追加マージされる」と記載しているが、実際のマージ順序は逆（handler.tsが先、serviceOverridesが後）。

`createProductionServices()` が `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を**返さなければ**問題は発生しないが、配線完全性テスト（Task 6.1）が「全キーセットの一致」を検証するため、これら3プロパティを `productionServices.ts` に含めるか否かの判断が必要。

**影響**:
- `productionServices.ts` がこれら3プロパティを返す → handler.tsの値が上書きされ、EventBusが動作しなくなるリスク
- `productionServices.ts` がこれら3プロパティを返さない → 配線完全性テストで「72キー vs 94キー」の差が許容範囲かの定義が必要

**推奨**: design.mdに「`createProductionServices()` が返す72プロパティには `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を含めない。これらはhandler.tsが管理する」と明記し、配線完全性テストの期待値を調整（handler.ts注入分3件は差分として許容）

#### WARNING-2: design.md の配線完全性テスト記述の曖昧さ（精緻化必要）

**問題**: design.md の Components Intent (productionServices.ts) は以下のように記載:

> `productionServices.ts` は72プロパティを返し、`handler.ts` で `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` が追加マージされる。配線完全性テストは最終的にcontextに注入される全キーセット（= `createMockServices()` のキーセット）を検証対象とする

しかし、実際の検証対象は以下のように分解される:

| 検証対象 | キーセット | 期待値 |
|---------|-----------|--------|
| `createProductionServices()` のキー | 72 | handler.ts注入分3件を含まず、handler.ts既存配線22件も含まず |
| `createProductionServices()` + handler.ts mergedOverrides | 75 | 上記 + eventBus, getInitialSelectResult, clearInitialSelectResult |
| `createContext(mergedOverrides)` の最終キー | 94 | createDefaultServicesの26件 + 上記75件のマージ（重複あり） |
| `createMockServices()` のキー | 93 | 全94 - confirmCommonCommands (欠落) |

design.md Testing Strategy (L280-281) は「`productionServices.ts` のキーセット + handler.ts注入分3件の合計が ContextServices の全94プロパティを網羅」と記載しているが、`createProductionServices()` は既に `createDefaultServices()` でカバーされるrequired 22件（State 4 + System 4 + Services 8 + selectProject + getIsE2ETest + File 3 + Project 2に該当しない残り）も返す必要がある。

実際には `createDefaultServices()` がrequired 26件を提供し、`createProductionServices()` が72件を提供し、`handler.ts` が3件を追加マージする。`createContext()` は `...defaults, ...overrides` でマージするため、required 26件は `createDefaultServices()` と `createProductionServices()` の両方にあってもOK（後者が優先）。

配線完全性テストの設計は「`createProductionServices()` の返却キーが72以上であること」と「`createMockServices()` キーセット - handler.ts注入3件 ⊆ `createProductionServices()` キーセット」の2条件で定義すべき。

**推奨**: design.md Testing Strategy に以下を明記:
1. `createProductionServices()` は72プロパティを返す（handler.ts注入分3件は含まない）
2. テスト検証: `Object.keys(createProductionServices())` ⊇ `Object.keys(createMockServices())` - `{eventBus, getInitialSelectResult, clearInitialSelectResult}`
3. `createMockServices()` にまず `confirmCommonCommands` を追加する（前提条件）

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| handler.tsマージ順序の文書化 | Warning | serviceOverridesがhandler.ts注入値を上書きするリスクの明文化 |
| 配線完全性テストの数学的定義 | Warning | 「一致」の正確な定義（productionServicesが返す72キー + handler.ts 3キー + createDefaultServices 19キー = 94）|
| `confirmCommonCommands` のmock追加 | Info | Round 2 W3で認識済み、Task 6.1の前提条件に明記済み |
| `createNewWindow` の循環依存 | Info | research.mdで認識済み、ファクトリ引数パターンで解決予定 |

### 2.2 Operational Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| ロールバック戦略 | -- | git revertで完全にロールバック可能（Round 1確認済み） |
| ドキュメント更新 | -- | 不要（APIの新規追加・変更なし） |

## 3. Ambiguities and Unknowns

1. **`createProductionServices()` がrequired 26プロパティのうちどの範囲を返すか**: `createDefaultServices()` が全26 requiredプロパティのnoop実装を提供しているため、`createProductionServices()` が返す「72プロパティ」には:
   - File 3 + Project 2 = 5つのrequiredプロパティ（本番実装への差し替え）
   - 67のoptionalプロパティ
   が含まれる。残り21のrequiredプロパティ（State 4 + System 4 + Services 4 + Config 5 + selectProject + getIsE2ETest + getInitialSelectResult + clearInitialSelectResult）は `createProductionServices()` に含める必要は**ない**（handler.tsの既存配線で提供済み）。

   design.md の記載「72プロパティを返す」はこの解釈と一致するが、配線完全性テストでどの集合と比較するかが明確になっていない（WARNING-2参照）。

2. **handler.ts既存配線19件の扱い**: 現在の `handler.ts` → `context.ts` の `createDefaultServices()` で提供される19件のrequired実装（State 4 + System 4 + Services 4 + Config 5 + selectProject + getIsE2ETest）は、`index.ts` の `setupTRPCHandler(mainWindow)` で `serviceOverrides` として渡されるのではなく、`createDefaultServices()` が直接提供する。Task 0.2 でこのフローがどう変更されるかの詳細が不明。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tRPC IPC設計パターン準拠**: tech.md の `ctx.services.*` DI注入パターンを踏襲 ✅
- **ディレクトリ構造準拠**: structure.md の `src/main/trpc/` 配下にファイル配置 ✅
- **テストパターン準拠**: tech.md の Vitest パターンを使用 ✅
- **設計原則準拠**: KISS（単一ファイルに集約）、YAGNI（過剰な抽象化回避） ✅
- **Electron Process Boundary**: structure.md のMain Process保持ルールに準拠（全サービスはMain Process側） ✅

### 4.2 Integration Concerns

- **既存ルーターへの影響なし**: 配線追加のみで、ルーター側の変更は不要 ✅
- **Remote UI対応不要**: requirements.md に「Remote UI対応: 不要」と明記 ✅
- **webSocketHandler.ts スコープ外**: Decision Logに記録済み ✅

### 4.3 Migration Requirements

- **マイグレーション不要**: 配線追加のみで、データ構造の変更はない ✅
- **後方互換性**: `createProductionServices()` は `Partial<ContextServices>` を返すため、既存コードとの互換性あり ✅

## 5. Recommendations

### Critical Issues (Must Fix)

なし。Round 2で指摘された全Criticalは修正済み。

### Warnings (Should Address)

1. **WARNING-1: handler.tsマージ順序と`eventBus`等の配線重複リスク**
   - design.mdに「`createProductionServices()` は `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を含めない」を明記
   - または、handler.tsのマージ順序を変更（`serviceOverrides` を先、handler.ts固有値を後にして上書きされないようにする）
   - 実装フェーズでの対応で十分だが、design.mdに意図を明記しておくことが望ましい

2. **WARNING-2: 配線完全性テストの検証条件の精緻化**
   - design.md Testing Strategyに「`createProductionServices()` は72キーを返す。配線完全性テストは `createMockServices()` のキーセットからhandler.ts注入分3件を除いた集合と比較する」と明記
   - テスト設計の曖昧さを排除することで、実装フェーズでの手戻りを防止

### Suggestions (Nice to Have)

1. **INFO-1: `createMockServices()` への `confirmCommonCommands` 追加の明確化**
   - Round 2 W3で認識済み、Task 6.1の前提条件に明記済み
   - `createMockServices()` は現在93キー（`confirmCommonCommands` 欠落）。追加後は94キーとなる
   - 実装フェーズで対応予定

2. **INFO-2: handler.ts既存配線19件の説明強化**
   - requirements.md Introductionに「handler.ts および `createDefaultServices()` で既に配線済みの22プロパティ」と記載があるが、具体的な内訳（State 4 + System 4 + Services 4 + Config 5 + selectProject + getIsE2ETest + getInitialSelectResult + clearInitialSelectResult = 26件のうちどの22件を指すか）が不明確
   - 配線完全性テストの設計に直接影響しないが、将来の保守性のために内訳の明確化が望ましい

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | handler.tsマージ順序と配線重複リスク | design.mdに「productionServicesがeventBus/getInitialSelectResult/clearInitialSelectResultを含めない」を明記 | design.md |
| Warning | 配線完全性テストの検証条件 | Testing Strategyの検証式を精緻化（handler.ts注入3件の除外を明記） | design.md |
| Info | confirmCommonCommandsのmock追加 | Task 6.1の前提条件として既に明記済み（対応不要） | -- |
| Info | handler.ts既存配線の内訳 | 22件の具体的内訳を補足記載（任意） | requirements.md |

---

## Round 2修正の検証結果

| Round 2 Issue | 修正状況 | 検証結果 |
|---------------|---------|---------|
| CRITICAL-1: 配線対象の分類とスコープ不整合（66→72, required/optional分類） | 適用済み | ✅ requirements.md Introduction、Decision Log、Req 9で修正確認 |
| WARNING-1: 配線完全性テストの検証対象範囲 | 適用済み | ✅ design.md Components Intentに明記。ただし検証式の精緻化がさらに必要（WARNING-2） |
| WARNING-2: 6つの未カバーoptionalサービス | 適用済み | ✅ Req 9.23-9.28、Task 5.4、Coverage Matrix追加確認 |
| WARNING-3: confirmCommonCommandsのmock追加 | 適用済み | ✅ Task 6.1の前提条件に明記確認 |
| INFO-1, INFO-2 | No Fix Needed判定 | ✅ 判定は妥当 |

## 実コード検証結果

| 検証項目 | 仕様書記載 | 実コード | 一致 |
|---------|-----------|---------|------|
| ContextServicesプロパティ総数 | 94 | 94（required 26 + optional 68） | ✅ |
| Required プロパティ数 | 22（handler.ts配線済み記載） | 26 | ⚠️ INFO-2参照 |
| Optional プロパティ数 | 68（67配線対象 + eventBus 1） | 68 | ✅ |
| 配線対象サービス数 | 72（required差し替え5 + optional 67） | 実装前 | -- |
| handler.ts注入プロパティ | eventBus, getInitialSelectResult, clearInitialSelectResult | 同左 | ✅ |
| productionServices.ts | 新規作成 | ファイル未存在（正しい） | ✅ |
| createMockServicesプロパティ数 | 94（confirmCommonCommands追加後） | 93（confirmCommonCommands欠落） | ⚠️ INFO-1参照 |
| index.ts setupTRPCHandler呼び出し | Task 0.2で変更予定 | `setupTRPCHandler(mainWindow)` serviceOverridesなし | ✅（変更前として正しい） |

---

_This review was generated by the document-review command._
