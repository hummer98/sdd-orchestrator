# Specification Review Report #2

**Feature**: trpc-service-wiring-completion
**Review Date**: 2026-02-07
**Documents Reviewed**:
- `spec.json`
- `requirements.md` (Round 1修正適用済み)
- `design.md` (Round 1修正適用済み)
- `tasks.md` (Round 1修正適用済み)
- `research.md`
- `document-review-1.md` + `document-review-1-reply.md`
- `context.ts` (ContextServices 型定義 - 直接カウント)
- `handler.ts` (setupTRPCHandler)
- `test-helpers.ts` (createMockServices)
- Steering: `product.md`, `tech.md`, `structure.md`, `design-principles.md`

## Executive Summary

Round 1で指摘された2件のCritical（プロパティ数不整合、productionServices.ts存在前提）は修正が適用されている。しかし、修正後の仕様書を実コードと精密に照合した結果、**配線対象サービスの分類と実際のContextServicesプロパティ属性（required/optional）の不整合**が新たに検出された。

| レベル | 件数 |
|--------|------|
| Critical | 1 |
| Warning | 3 |
| Info | 2 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Round 1修正の検証**: ✅ 修正済み
- 「92プロパティ」→「94プロパティ」の修正が requirements.md と design.md の両方に適用されている
- 「productionServices.ts を新規作成」が正確に記載されている

**残存する不整合**: 1件（CRITICAL-1参照）

### 1.2 Design ↔ Tasks Alignment

**整合**: ✅
- Task 0（productionServices.ts 新規作成 + handler.ts統合）が追加されている
- 全ドメインの配線タスクが Design の Components と一致

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| productionServices.ts 新規作成 | 66サービス配線 | Task 0.1-0.2, 1.1-5.3 | ✅ |
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

#### CRITICAL-1: 「66のオプショナルサービス」の分類が不正確

**問題**: requirements.md (Introduction) は「残り66のオプショナルサービスを...配線する」と記載しているが、Req 1-9の66サービスの中に**requiredプロパティ**が含まれている。

**実コード検証** (`context.ts` 直接カウント):

| プロパティ属性 | 合計 | 内訳 |
|---------------|------|------|
| **Required** (no `?`) | **26** | State 4, System 4, Service Instances 4, Config 5, File 3, Project 4, Startup 2 |
| **Optional** (`?`) | **68** | Bug 7, Spec 1, Agent 5, AutoExecution 2, Git 13, Install 12, Cloudflare 1, MCP 1, Schedule 3, Misc 22, EventBus 1 |
| **合計** | **94** | |

**Req 1-9 の66サービスの属性分析**:

| Requirement | サービス数 | ContextServicesでの属性 | 不整合 |
|-------------|-----------|----------------------|--------|
| Req 1 (File) | 3 | **Required** (`listProjectFiles`, `readProjectFile`, `writeProjectFile`) | ❌ requireだが「オプショナル」と記載 |
| Req 2 (Project) | 2 | **Required** (`showOpenDialog`, `createNewWindow`) | ❌ requiredだが「オプショナル」と記載 |
| Req 3 (Bug) | 7 | Optional | ✅ |
| Req 4 (Spec) | 1 | Optional | ✅ |
| Req 5 (Agent) | 5 | Optional | ✅ |
| Req 6 (Git) | 13 | Optional | ✅ |
| Req 7 (Install) | 12 | Optional | ✅ |
| Req 8 (Schedule) | 1 | Optional (`reportIdleTime`) | ✅ |
| Req 9 (Misc) | 22 | Optional | ✅ |

**66サービス中、5つがrequired**（File 3 + Project 2）。これらは `createDefaultServices()` で既にnoop実装が提供されているため、技術的には「配線」が必要だが「オプショナル」ではない。

**さらに、Req 1-9でカバーされていないオプショナルプロパティが存在**:

| プロパティ | 属性 | Reqカバー |
|-----------|------|----------|
| `autoExecutionCoordinator` | Optional | ❌ なし |
| `bugAutoExecutionCoordinator` | Optional | ❌ なし |
| `cloudflareService` | Optional | ❌ なし |
| `mcpServerService` | Optional | ❌ なし |
| `scheduleTaskService` | Optional | ❌ なし |
| `scheduleTaskCoordinator` | Optional | ❌ なし |
| `eventBus` | Optional | handler.ts配線済み |

**68 optional - 1 (eventBus配線済み) = 67 optional配線対象**
**Req 1-9のoptional分: 66 - 5 (required) = 61**
**差分: 67 - 61 = 6 未カバーoptional**

つまり、配線完全性テスト（Req 10）が成功するためには、Req 1-9でカバーされていない6つのオプショナルサービスも `productionServices.ts` に配線する必要がある。

**影響**: 配線完全性テスト（Task 6.1-6.2）が `createMockServices()` のキーセットと比較する設計のため、これら6サービスが `productionServices.ts` に含まれていなければテストが失敗する。しかし、タスクの中でこれら6サービスの配線が明示されていない。

**推奨アクション**:
- 数値の正確な記載: 「66のオプショナルサービス」→「66サービス（うち5つはrequiredプロパティのプロダクション実装差し替え、61はoptionalプロパティの配線）」
- 6つの未カバーサービスの取り扱いを明確にする（スコープ内/外の判断）

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| 6つの未カバーoptionalサービス | Warning | `autoExecutionCoordinator`, `bugAutoExecutionCoordinator`, `cloudflareService`, `mcpServerService`, `scheduleTaskService`, `scheduleTaskCoordinator` がReq 1-9に含まれていない。配線完全性テスト（Req 10）との整合性問題 |
| `confirmCommonCommands` がcreateMockServicesに不在 | Warning | Round 1 W1で指摘済み。test-helpers.tsにこのプロパティがないため、配線完全性テスト（Task 6.2）で `mockServices` をベースラインにする場合、テスト前にmockServicesの更新が必要 |
| File/Project requiredプロパティの配線意義 | Info | `listProjectFiles`, `readProjectFile`, `writeProjectFile`, `showOpenDialog`, `createNewWindow` はrequiredでcreateDefaultServicesにnoop実装がある。productionServicesでの「上書き」は有用だが、「未配線」とは異なる意味を持つ |

### 2.2 Operational Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| productionServicesの配線キーセット目標値 | Warning | 配線完全性テスト（Req 10.1）の「一致」判定基準が不明確。`createProductionServices()` は `Partial<ContextServices>` を返すので、requiredの26プロパティを全て含める必要があるのか、optionalの68だけでよいのか |
| ロールバック戦略 | Info | 配線追加のみであり、git revertで完全にロールバック可能（Round 1確認済み） |

## 3. Ambiguities and Unknowns

1. **配線完全性テストの検証対象範囲**: `productionServices.ts` が返すべきキーセットの範囲が未確定。以下の3つの解釈が可能:
   - (A) optional 68プロパティのみ（requiredはcreateDefaultServicesが提供するから不要）
   - (B) optional 68 + required 26 = 全94プロパティ（完全な配線保証）
   - (C) Req 1-9の66サービスのみ（仕様書のスコープ）

   Req 10.1は「ContextServicesの全プロパティ名が一致」とあるため(B)が意図されているように読めるが、design.mdは「66プロパティを追加」と記載しており(C)のようにも読める。

2. **6つの未カバーoptionalサービスの配線元**: `autoExecutionCoordinator`等のサービス実装元がresearch.mdに記載されていない。実装フェーズで調査が必要。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tRPC IPC設計パターン準拠**: tech.md の `ctx.services.*` DI注入パターンを踏襲 ✅
- **ディレクトリ構造準拠**: structure.md の `src/main/trpc/` 配下にファイル配置 ✅
- **テストパターン準拠**: tech.md の Vitest パターンを使用 ✅
- **設計原則準拠**: KISS（単一ファイルに集約）、YAGNI（過剰な抽象化回避） ✅

### 4.2 Integration Concerns

- **既存ルーターへの影響なし**: 配線追加のみで、ルーター側の変更は不要 ✅
- **Remote UI対応不要**: requirements.md に「Remote UI対応: 不要」と明記 ✅
- **webSocketHandler.ts スコープ外**: Decision Logに記録済み ✅

### 4.3 Migration Requirements

- **マイグレーション不要**: 配線追加のみで、データ構造の変更はない ✅
- **後方互換性**: `createProductionServices()` は `Partial<ContextServices>` を返すため、既存コードとの互換性あり ✅

## 5. Recommendations

### Critical Issues (Must Fix)

1. **CRITICAL-1: 配線対象の分類とスコープの正確化**
   - 「66のオプショナルサービス」という表現は不正確（File 3 + Project 2 = 5つがrequired）
   - 6つのoptionalサービス（autoExecutionCoordinator, bugAutoExecutionCoordinator, cloudflareService, mcpServerService, scheduleTaskService, scheduleTaskCoordinator）がReq 1-9でカバーされていない
   - 配線完全性テスト（Req 10）が全プロパティを検証する場合、これら6サービスも配線タスクが必要
   - **推奨**: (a) Introductionの記述を正確化し、(b) 6つの未カバーサービスをスコープに含めるか除外するかを明確にし、(c) 配線完全性テストの検証範囲を確定する

### Warnings (Should Address)

1. **WARNING-1: 配線完全性テストの検証対象範囲の確定**
   - `createProductionServices()` が返すべきキーセット（全94? optional 68のみ? Req 1-9の66?）を design.md に明確に定義する
   - Req 10.1の「ContextServicesの全プロパティ名が一致」と design.md の「66プロパティを追加」に曖昧さがある

2. **WARNING-2: 6つの未カバーoptionalサービスの配線タスク追加**
   - `autoExecutionCoordinator`, `bugAutoExecutionCoordinator` → Req と Tasks に配線タスクを追加
   - `cloudflareService`, `mcpServerService` → Req と Tasks に配線タスクを追加
   - `scheduleTaskService`, `scheduleTaskCoordinator` → Req と Tasks に配線タスクを追加
   - または明示的にスコープ外と宣言し、配線完全性テストの期待値を調整

3. **WARNING-3: `confirmCommonCommands` のcreateMockServicesへの追加**
   - test-helpers.ts の `createMockServices` に `confirmCommonCommands` が含まれていない（Round 1 W1で確認済み）
   - Task 6.2のベースライン比較で不整合が発生する可能性
   - 実装フェーズで対応可能だが、認識しておくべき

### Suggestions (Nice to Have)

1. **INFO-1: File/Projectサービスの「配線」と「上書き」の区別**
   - requiredプロパティ（File 3 + Project 2）はcreateDefaultServicesでnoop実装が既にある
   - productionServicesでの配線は「上書き」であり「新規配線」とは異なる
   - 技術的には問題ないが、ドキュメントの説明が「未配線→配線」であることと実態にギャップがある

2. **INFO-2: research.md の未カバーサービス調査追加**
   - 6つの未カバーoptionalサービスの実装元情報がresearch.mdに含まれていない
   - スコープに含める場合は実装元マッピングの追記が必要

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | 配線対象の分類とスコープ不整合 | 「66のオプショナルサービス」の表現を正確化、6つの未カバーサービスの取り扱い決定 | requirements.md, design.md, tasks.md |
| Warning | 配線完全性テストの検証範囲 | `createProductionServices()` の返却キーセット範囲を確定（全94 or optional 68 or Req 66） | design.md |
| Warning | 6つの未カバーoptionalサービス | 配線タスク追加 or スコープ外宣言 | requirements.md, tasks.md |
| Warning | confirmCommonCommandsのmock追加 | 実装フェーズで対処（認識レベル） | tasks.md |
| Info | required/optional分類の説明改善 | Introduction文の正確化 | requirements.md |
| Info | research.mdの補完 | 未カバー6サービスの実装元追記 | research.md |

---

## Round 1修正の検証結果

| Round 1 Issue | 修正状況 | 検証結果 |
|---------------|---------|---------|
| CRITICAL-1: プロパティ数「92→94」 | 適用済み | ✅ requirements.md, design.md で94に修正されている |
| CRITICAL-2: productionServices.ts「拡張→新規作成」 | 適用済み | ✅ requirements.md Decision Log, design.md, tasks.md Task 0 で修正されている |
| WARNING-2: handler.tsへの注入パス明示 | 適用済み | ✅ design.md にフロー記載、tasks.md Task 0.2 で対応 |
| WARNING-1, 3, 4 | No Fix Needed判定 | ✅ 判定は妥当（実装フェーズで対処） |

---

_This review was generated by the document-review command._
