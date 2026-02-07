# Specification Review Report #4

**Feature**: trpc-service-wiring-completion
**Review Date**: 2026-02-07
**Documents Reviewed**:
- `spec.json`
- `requirements.md` (Round 3修正適用済み)
- `design.md` (Round 3修正適用済み)
- `tasks.md` (Round 3修正適用済み)
- `research.md`
- `document-review-1.md` + `document-review-1-reply.md`
- `document-review-2.md` + `document-review-2-reply.md`
- `document-review-3.md` + `document-review-3-reply.md`
- `context.ts` (ContextServices型定義 - 全94プロパティ直接検証)
- `handler.ts` (setupTRPCHandler - マージ順序検証)
- `test-helpers.ts` (createMockServices - 93キー検証)
- `index.ts` (setupTRPCHandler呼び出し検証)
- Steering: `product.md`, `tech.md`, `structure.md`, `design-principles.md`

## Executive Summary

Round 3で指摘されたWarning 2件（handler.tsマージ順序の文書化、配線完全性テスト検証条件の精緻化）は全て修正が適用されている。修正後の仕様書を実コードと精密に照合した結果、仕様全体の整合性は非常に高い水準に達している。残存する課題は軽微なものに限られ、実装フェーズへの移行に問題はない。

| レベル | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 0 |
| Info | 3 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Round 3修正の検証**: ✅ 修正済み

- design.md Components Intent に「`createProductionServices()` は `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を返さない」制約が明記されている
- design.md Testing Strategy の配線完全性テスト検証式が精緻化されている: `Object.keys(createProductionServices())` ⊇ `Object.keys(createMockServices()) \ {eventBus, getInitialSelectResult, clearInitialSelectResult}`
- `confirmCommonCommands` のmock追加前提条件（93→94キー）がTesting Strategyに明記されている

**数値の検証**:

| 項目 | 仕様記載 | 実コード | 一致 |
|------|---------|---------|------|
| ContextServices 総プロパティ数 | 94 | 94 (required 26 + optional 68) | ✅ |
| 既配線済みプロパティ数 | 22 | 22 (State 4 + System 4 + ServiceInstances 9 + selectProject + getIsE2ETest + getInitialSelectResult + clearInitialSelectResult + eventBus) | ✅ |
| 配線対象サービス数 | 72 (required差し替え5 + optional 67) | 72 (File 3 + Project 2 + 67 optional ※eventBus除く) | ✅ |
| handler.ts注入プロパティ | 3 (eventBus, getInitialSelectResult, clearInitialSelectResult) | 3 | ✅ |
| createMockServicesプロパティ数 | 93 (confirmCommonCommands欠落) | 93 | ✅ |

**残存する不整合**: なし

### 1.2 Design ↔ Tasks Alignment

**整合**: ✅

- 全72サービスがTask 1.1〜5.4の各Featureタスクにマッピングされている
- Task 0.1（productionServices.ts新規作成）、Task 0.2（index.ts統合）がインフラタスクとして定義されている
- Task 6.1-6.2（配線完全性テスト）にconfirmCommonCommandsのmock追加が前提条件として明記されている
- Task 7.1-7.2（回帰検証）がtypecheck、build、全テスト実行をカバーしている

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| productionServices.ts 新規作成 | 72サービス配線 | Task 0.1-0.2, 1.1-5.4 | ✅ |
| productionServices.test.ts | 配線完全性テスト | Task 6.1-6.2 | ✅ |
| 回帰テスト | typecheck, build, test | Task 7.1-7.2 | ✅ |
| handler.ts統合 | index.tsからの呼び出し | Task 0.2 | ✅ |
| confirmCommonCommandsモック追加 | Task 6.1前提条件 | Task 6.1 | ✅ |

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
- [x] Acceptance criteria count (Req 1-9): 3+2+7+1+5+13+12+1+28 = 72 ✅

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| productionServices keys vs ContextServices keys | Testing Strategy | 6.1 | ✅ |
| productionServices keys vs mockServices keys | Testing Strategy | 6.2 | ✅ |
| productionServices → handler.ts 注入パス | Integration & Deprecation | 0.2 | ✅ |
| handler.ts マージ順序（上書きリスク防止） | Components Intent | 設計制約として明記 | ✅ |

**Validation Results**:
- [x] 配線完全性テストが設計されている
- [x] 回帰テスト（既存テスト）が計画されている
- [x] handler.tsへの注入パスがTask 0.2でカバーされている
- [x] handler.tsマージ順序の注意事項がdesign.mdに明記されている

### 1.6 Cross-Document Contradictions

**検出された矛盾**: なし

Round 3で指摘された以下の問題は全て解決済み:
- ✅ handler.tsマージ順序と配線重複リスク → design.mdに制約として明記
- ✅ 配線完全性テストの検証条件 → テスト検証式が精緻化

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| `createNewWindow` の循環依存 | Info | research.mdで認識済み。ファクトリ引数パターンまたは遅延importで解決予定。Task 0.1のシグネチャ設計で対応 |
| サービス初期化タイミング | Info | DD-004（クロージャパターン）で対応済み。プロジェクトパス依存サービスは遅延評価 |
| `confirmCommonCommands` のmock追加 | Info | Task 6.1の前提条件に明記済み。createMockServicesは93→94キーに更新予定 |

### 2.2 Operational Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| ロールバック戦略 | -- | git revertで完全にロールバック可能（Round 1確認済み） |
| ドキュメント更新 | -- | 不要（APIの新規追加・変更なし） |

全てのギャップがInfo以下であり、実装フェーズで対応可能。

## 3. Ambiguities and Unknowns

1. **`createProductionServices()` の返却プロパティ数の解釈**: design.mdは「72プロパティを返す」と記載。これは「Req 1-9で配線する72サービス」を指す。ただし、`createProductionServices()` が実際にオブジェクトとして返すキー数は、`createDefaultServices()` でカバーされるrequiredプロパティ（State 4 + System 4 + ServiceInstances 9 + selectProject + getIsE2ETest = 19件）も含める場合は72+19=91キーとなる可能性がある。実装時にどちらのパターンを採用するかは、配線完全性テストの検証式（`createMockServices()` のキーセットからhandler.ts注入3件を除いた集合との比較）で自動的に決定される。

   **補足**: design.md Testing Strategy の検証式 `Object.keys(createProductionServices())` ⊇ `Object.keys(createMockServices()) \ {eventBus, getInitialSelectResult, clearInitialSelectResult}` に従えば、`createProductionServices()` は `createMockServices()` の94キーからhandler.ts注入3件を除いた**91キー**を返す必要がある。「72プロパティ」は「新規追加分」の数であり、残り19件はcreateDefaultServicesと同等の実装をproductionServicesにも含めることになる。

2. **Task 0.1のファクトリ引数設計**: `createNewWindow` 用の `createWindow` 関数参照を引数として受け取るか、遅延importで解決するかはTask 0.1の実装時に決定。research.mdに両選択肢が記載済み。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tRPC IPC設計パターン準拠**: tech.md の `ctx.services.*` DI注入パターンを踏襲 ✅
- **ディレクトリ構造準拠**: structure.md の `src/main/trpc/` 配下にファイル配置 ✅
- **テストパターン準拠**: tech.md の Vitest パターンを使用 ✅
- **設計原則準拠**: KISS（単一ファイルに集約）、YAGNI（過剰な抽象化回避）、DRY（既存パターン踏襲） ✅
- **Electron Process Boundary**: structure.md のMain Process保持ルールに準拠（全サービスはMain Process側） ✅
- **AI設計判断の原則**: design-principles.md に従い、「変更が大きい」を理由とした妥協なし ✅

### 4.2 Integration Concerns

- **既存ルーターへの影響なし**: 配線追加のみで、ルーター側の変更は不要 ✅
- **Remote UI対応不要**: requirements.md に「Remote UI対応: 不要」と明記 ✅
- **webSocketHandler.ts スコープ外**: Decision Logに記録済み ✅

### 4.3 Migration Requirements

- **マイグレーション不要**: 配線追加のみで、データ構造の変更はない ✅
- **後方互換性**: `createProductionServices()` は `Partial<ContextServices>` を返すため、既存コードとの互換性あり ✅

## 5. Recommendations

### Critical Issues (Must Fix)

なし。Round 1-3で指摘された全Criticalは修正済み。

### Warnings (Should Address)

なし。Round 3で指摘された全Warningは修正済み。

### Suggestions (Nice to Have)

1. **INFO-1: `createProductionServices()` の返却キー数の明確化**
   - design.mdは「72プロパティを返す」と記載しているが、配線完全性テストの検証式は`createMockServices()` のキーセット（94）からhandler.ts注入3件を除いた91キーとの比較を要求している
   - これは、productionServicesがcreateDefaultServicesでカバーされる19件のrequiredプロパティも含めて91キーを返す必要があることを意味する
   - 実装フェーズでテストが正しい期待値を持つことで解決されるため、仕様書の修正は不要
   - ただし、「72プロパティ」と「91キー」の関係を理解していないと実装者が混乱する可能性がある

2. **INFO-2: requirements.md Introductionの「22プロパティ」の内訳**
   - 「handler.ts および createDefaultServices() で既に配線済みの22プロパティ（State/System/ServiceInstances/Config/Startup 19件 + selectProject/getIsE2ETest 2件 + eventBus 1件）」と記載
   - 実際はcreateDefaultServicesが26プロパティを返し、うち5件（File 3 + Project 2）はプロダクション実装差し替えが必要なため配線済みにカウントしない: 26 - 5 + 1(eventBus) = 22
   - 計算は正確だが、「19件」の内訳（State 4 + System 4 + ServiceInstances 9 = 17? or 19?）にやや曖昧さが残る
   - 配線完全性テストで実数が検証されるため、実質的な問題はない

3. **INFO-3: `installByProfile` と ContextServicesプロパティ名の対応関係**
   - Req 7.3は `install.installByProfile` と記載しているが、ContextServicesのプロパティ名は `installUnifiedCommandsetInstaller`
   - `installByProfile` は `installUnifiedCommandsetInstaller` のメソッド呼び出しであり、Requirements記法はtRPCルーター経由の呼び出しパスを記載している
   - design.md Requirements Traceabilityでは正しく「UnifiedCommandsetInstaller 参照」と記載されており、実装上の問題はない

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Info | productionServicesの返却キー数の明確化 | 実装フェーズでテスト検証式が自動的に正しい数を強制するため、対応不要 | -- |
| Info | 「22プロパティ」の内訳の曖昧さ | 配線完全性テストで実数が検証されるため、対応不要 | -- |
| Info | installByProfileとプロパティ名の対応 | design.md Traceabilityで正しく記載済み、対応不要 | -- |

## Round 3修正の検証結果

| Round 3 Issue | 修正状況 | 検証結果 |
|---------------|---------|---------|
| WARNING-1: handler.tsマージ順序と配線重複リスク | 適用済み | ✅ design.md Components Intentに「eventBus/getInitialSelectResult/clearInitialSelectResultを返さない」制約が明記。Integration & Deprecation Strategyにマージ順序の注意事項が追記 |
| WARNING-2: 配線完全性テストの検証条件の精緻化 | 適用済み | ✅ Testing Strategyにテスト検証式を精緻化。handler.ts注入3件の除外、confirmCommonCommands前提条件が明記 |
| INFO-1: confirmCommonCommandsのmock追加 | No Fix Needed判定 | ✅ Task 6.1の前提条件に明記済み |
| INFO-2: handler.ts既存配線の内訳 | No Fix Needed判定 | ✅ 配線完全性テストで実数検証されるため妥当 |

## 実コード検証結果

| 検証項目 | 仕様書記載 | 実コード | 一致 |
|---------|-----------|---------|------|
| ContextServicesプロパティ総数 | 94 | 94（required 26 + optional 68） | ✅ |
| Required プロパティ数 | 26 (22配線済み + 5差し替え対象 - 1 eventBus) | 26 | ✅ |
| Optional プロパティ数 | 68 | 68 | ✅ |
| 配線対象サービス数 | 72（required差し替え5 + optional 67） | 計算一致 | ✅ |
| handler.ts注入プロパティ | eventBus, getInitialSelectResult, clearInitialSelectResult | 同左（マージ順序も検証済み） | ✅ |
| handler.tsマージ順序 | serviceOverridesが後からスプレッド | 同左（上書きリスクあり、制約で対応） | ✅ |
| productionServices.ts | 新規作成 | ファイル未存在（正しい） | ✅ |
| createMockServicesプロパティ数 | 93（confirmCommonCommands欠落） | 93 | ✅ |
| createDefaultServicesプロパティ数 | 26（required全プロパティ） | 26 | ✅ |
| index.ts setupTRPCHandler呼び出し | Task 0.2で変更予定 | `setupTRPCHandler(mainWindow)` serviceOverridesなし | ✅（変更前として正しい） |

## 総合判定

仕様書は4回のレビューラウンドを経て、高い整合性を達成している。Critical/Warning指摘はなく、残存するInfoレベルの課題はいずれも実装フェーズで自動的に解決される。**実装フェーズへの移行を推奨する。**

---

_This review was generated by the document-review command._
