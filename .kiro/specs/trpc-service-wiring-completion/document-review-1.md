# Specification Review Report #1

**Feature**: trpc-service-wiring-completion
**Review Date**: 2026-02-07
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `research.md`
- `context.ts` (ContextServices 型定義)
- `test-helpers.ts` (createMockServices)
- `handler.ts` (setupTRPCHandler)
- Steering: `product.md`, `tech.md`, `structure.md`, `design-principles.md`

## Executive Summary

全体として、この仕様書は「66サービスのDI配線追加」という明確なスコープを持ち、ドキュメント間の整合性は高い。ただし、**ContextServicesの実際のプロパティ数と仕様書記載の数値に不整合**があり、配線対象の正確な範囲について修正が必要。

| レベル | 件数 |
|--------|------|
| Critical | 2 |
| Warning | 4 |
| Info | 3 |

## 1. Document Consistency Analysis

### 1.1 Requirements <-> Design Alignment

**概ね整合**。Requirements の全11要件（Req 1-11）が Design の Requirements Traceability テーブルで網羅されている。

**不整合なし**。

### 1.2 Design <-> Tasks Alignment

**概ね整合**。Design の Components（productionServices.ts 拡張、productionServices.test.ts 拡張）が Tasks に反映されている。

**不整合なし**。

### 1.3 Design <-> Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| productionServices.ts 拡張 | 66サービス配線 | Task 1.1-5.3 | ✅ |
| productionServices.test.ts | 配線完全性テスト | Task 6.1-6.2 | ✅ |
| 回帰テスト | typecheck, build, test | Task 7.1-7.2 | ✅ |
| UI Components | なし（配線のみ） | N/A | ✅ |

### 1.4 Acceptance Criteria -> Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | listProjectFiles配線 | 1.1 | Feature | ✅ |
| 1.2 | readProjectFile配線 | 1.1 | Feature | ✅ |
| 1.3 | writeProjectFile配線 | 1.1 | Feature | ✅ |
| 2.1 | showOpenDialog配線 | 1.2 | Feature | ✅ |
| 2.2 | createNewWindow配線 | 1.2 | Feature | ✅ |
| 3.1-3.7 | Bug 7サービス配線 | 1.3 | Feature | ✅ |
| 4.1 | confirmCommonCommands配線 | 2.1 | Feature | ✅ |
| 5.1-5.5 | Agent 5サービス配線 | 2.2 | Feature | ✅ |
| 6.1-6.13 | Git/Worktree 13サービス配線 | 3.1, 3.2 | Feature | ✅ |
| 7.1-7.12 | Install 12サービス配線 | 4.1, 4.2 | Feature | ✅ |
| 8.1 | reportIdleTime配線 | 5.1 | Feature | ✅ |
| 9.1-9.22 | Misc 22サービス配線 | 5.2, 5.3 | Feature | ✅ |
| 10.1-10.4 | 配線完全性テスト | 6.1, 6.2 | Integration Test | ✅ |
| 11.1-11.3 | 回帰検証 | 7.1, 7.2 | Regression | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

本仕様はDI配線のみであり、新しいIPC/イベント/Store同期は導入しない。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| productionServices keys vs ContextServices keys | Testing Strategy | 6.1 | ✅ |
| productionServices keys vs mockServices keys | Testing Strategy | 6.2 | ✅ |

**Validation Results**:
- [x] 配線完全性テストが設計されている
- [x] 回帰テスト（既存847テスト）が計画されている
- N/A: 新規IPC/Event/Store同期はないため、それらのテストは不要

### 1.6 Cross-Document Contradictions

#### CRITICAL-1: ContextServices プロパティ数の不整合

| Document | 記載値 | 実際の値 | 差分 |
|----------|--------|----------|------|
| requirements.md | 92プロパティ | 実コード上で確認必要 | 不一致の可能性 |
| design.md | 92プロパティ（配線率100%） | 同上 | 同上 |

**実コード検証結果** (`context.ts` の `ContextServices` インターフェース):

`ContextServices` の直接プロパティを列挙:

| カテゴリ | プロパティ数 | 仕様書の「配線済み26」に含まれるか |
|----------|------------|----------------------------------|
| State Getters/Setters | 4 | Phase 2配線済み |
| System Information | 4 | Phase 2配線済み |
| Core Service Instances | 4 | Phase 2配線済み |
| Config Domain | 5 | Phase 2配線済み |
| File Domain | 3 | **未配線（66の一部）** |
| Project Domain | 4 | 部分的（selectProject, getIsE2ETest は配線済み？） |
| Bug Domain | 7 (optional) | **未配線（66の一部）** |
| Spec Domain | 1 (optional) | **未配線（66の一部）** |
| Agent Domain | 5 (optional) | **未配線（66の一部）** |
| Auto Execution | 2 (optional) | **Phase 2配線済みの可能性** |
| Git Domain | 13 (optional) | **未配線（66の一部）** |
| Install Domain | 12 (optional) | **未配線（66の一部）** |
| Cloudflare Domain | 1 (optional) | **Phase 2配線済みの可能性** |
| MCP Domain | 1 (optional) | **Phase 2配線済みの可能性** |
| Schedule Domain | 3 (optional) | **未配線（66の一部）** |
| Misc Domain | 22 (optional) | **未配線（66の一部）** |
| Startup Selection | 2 | handler.tsで配線済み |
| Event Bus | 1 (optional) | handler.tsで配線済み |

**問題**: 仕様書では「92プロパティのうち26配線済み、残り66」としているが、`ContextServices` の実際のプロパティ数はより多い可能性がある。`productionServices.ts` がまだ存在しないため、「Phase 2で配線済みの26サービス」の根拠が不明確。

**推奨アクション**: `productionServices.ts` は**まだ存在しない**ことが確認された（worktreeのコードベースに該当ファイルなし）。`handler.ts` で注入されているのは `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` の3つのみで、残りは `createDefaultServices()` のnull/noopデフォルト値が使われている状態。仕様書の「Phase 2で26サービス配線済み」という前提と、実際のコードベースの状態を再確認する必要がある。

#### CRITICAL-2: productionServices.ts の存在前提の矛盾

仕様書（requirements.md, design.md, tasks.md）は全て `productionServices.ts` が既に存在し、Phase 2で26サービスが配線済みであることを前提としている:

- requirements.md: 「Phase 2で配線済みの26サービスに加え、残り66のオプショナルサービスを `productionServices.ts` に配線する」
- design.md: 「`createProductionServices()` が返す `Partial<ContextServices>` に66プロパティを追加」
- tasks.md: 全タスクが「`createProductionServices()` に追加」と記載

**実態**: `productionServices.ts` は**worktreeのコードベースに存在しない**。`handler.ts` は `serviceOverrides` パラメータを受け取るが、呼び出し元（`createWindow()` 等）から `productionServices` が注入されている形跡がない。

**影響**: タスクの実装アプローチが根本的に異なる可能性がある:
- Option A: `productionServices.ts` を新規作成する（仕様書はこれを前提としているが「追加」ではなく「新規作成」が正確）
- Option B: `handler.ts` の `setupTRPCHandler` に直接配線する

**推奨アクション**: design.md の「拡張」という表現を「新規作成」に修正し、Phase 2の配線パターンの実態を正確に反映させる。ただし、masterブランチのソースコードに `productionServices.ts` が既に存在する可能性があるため、worktreeではなくmasterの最新状態を確認すべき。

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| `confirmCommonCommands` がmockServicesに存在しない可能性 | Warning | Explore agentの調査で「Missing Service: confirmCommonCommands」と報告。ただし test-helpers.ts の再読み込みでは存在確認できなかった → 実装時に確認 |
| `confirmCommonCommands` のRequirement 4.1タスク記載 | Warning | Requirement 4.1のサービス名 `confirmCommonCommands` がtasks.md Task 2.1でカバーされているが、**mockServicesへの追加タスクが明示されていない** |
| 循環依存の解決策が確定していない | Warning | research.mdで `createNewWindow` の循環依存リスクが指摘されており、DD-003で解決方針は示されているが、「実装時に確認」となっている部分がある |
| エラーハンドリング | Info | 配線のみのため新規エラーパターンは発生しない（design.md に記載済み） |

### 2.2 Operational Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| ロールバック戦略 | Info | 配線追加のみであり、git revertで完全にロールバック可能。明示的なロールバック手順は不要 |
| ドキュメント更新 | Info | 配線完了後のインシデントレポート更新（Phase 3完了の記録）が言及されていないが、このSpecのスコープ外でも対応可能 |

## 3. Ambiguities and Unknowns

1. **「Phase 2で配線済みの26サービス」の正確なリスト**: requirements.md で26サービスが配線済みとしているが、その具体的なリストがドキュメントに記載されていない。productionServices.ts が存在しない状態では、どのサービスが「配線済み」なのか不明

2. **`createDefaultServices()` のデフォルト値の扱い**: context.ts には `createDefaultServices()` 関数があり、一部プロパティ（`selectProject`, `listProjectFiles`, `readProjectFile`, `writeProjectFile` 等）にnoopデフォルト値が設定されている。これらを「配線済み」とカウントしているのか、それとも「本物の実装への配線」のみをカウントしているのか不明

3. **`handler.ts` の `serviceOverrides` への注入方法**: 現在の `handler.ts` は `setupTRPCHandler(window, serviceOverrides)` の形だが、`serviceOverrides` を渡す呼び出し側のコードが不明。`productionServices.ts` を新規作成する場合、どこからどう呼び出すかの詳細が Design に明示されていない

4. **mockServicesへの `confirmCommonCommands` 追加**: test-helpers.ts の `createMockServices` に `confirmCommonCommands` が含まれているか要確認。もし含まれていない場合、配線完全性テスト（Task 6.2）でmockServicesキーセットが不完全になる

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tRPC IPC設計パターン準拠**: tech.md に記載の `ctx.services.*` 経由のDI注入パターンを踏襲 ✅
- **ディレクトリ構造準拠**: structure.md の `src/main/trpc/` 配下にファイル配置 ✅
- **テストパターン準拠**: tech.md の Vitest パターンを使用 ✅

### 4.2 Integration Concerns

- **既存ルーターへの影響なし**: 配線追加のみで、ルーター側の変更は不要 ✅
- **Remote UI対応不要**: requirements.md に「Remote UI対応: 不要」と明記 ✅
- **webSocketHandler.ts スコープ外**: Decision Logに記録済み ✅

### 4.3 Migration Requirements

- **マイグレーション不要**: 配線追加のみで、データ構造の変更はない ✅
- **後方互換性**: `createProductionServices()` は `Partial<ContextServices>` を返すため、既存コードとの互換性あり ✅

## 5. Recommendations

### Critical Issues (Must Fix)

1. **CRITICAL-1: プロパティ数の正確な確認**
   - `ContextServices` の実際の直接プロパティ数を数え、requirements.md/design.md の「92プロパティ」を正確な値に更新する
   - 「Phase 2で26配線済み」の根拠を明確にする（masterブランチの `productionServices.ts` を確認）

2. **CRITICAL-2: productionServices.ts の存在状態の確認**
   - masterブランチに `productionServices.ts` が存在するか確認する
   - 存在しない場合、design.md/tasks.md の「拡張」を「新規作成」に修正し、`handler.ts` からの呼び出しコードも実装タスクに追加する
   - 存在する場合、worktreeへの取り込みが必要

### Warnings (Should Address)

1. **WARNING-1: `confirmCommonCommands` のmockServicesカバレッジ確認**
   - test-helpers.ts の `createMockServices` に含まれているか確認し、不足していれば追加タスクを tasks.md に追加

2. **WARNING-2: `handler.ts` への productionServices 注入パスの明示**
   - design.md の Integration & Deprecation Strategy に、`productionServices.ts` の `createProductionServices()` をどこで呼び出し、どうやって `handler.ts` の `setupTRPCHandler` に渡すかを明記する

3. **WARNING-3: 循環依存の解決策確定**
   - `createNewWindow` の循環依存リスク（research.md に記載）に対する具体的な解決策を design.md DD-003 に確定させる

4. **WARNING-4: `Spec Domain` の `confirmCommonCommands` がtasks.md Task 2.1に記載されているが、mockServices追加が漏れている可能性**
   - Task 6.1-6.2 の配線完全性テストが正しく動作するには、mockServicesに全プロパティが含まれている必要がある

### Suggestions (Nice to Have)

1. **INFO-1: インシデントレポートの更新タスク追加**
   - Phase 3完了時に `docs/incidents/2026-02-07-trpc-full-migration-startup-failure.md` のステータス更新を検討

2. **INFO-2: Decision Log へのmasterブランチ確認結果追記**
   - productionServices.ts の存在状態確認結果を記録に残す

3. **INFO-3: 「Phase 2で配線済みの26サービス」リストの明文化**
   - requirements.md または research.md に配線済みサービスの具体的リストを追記する

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | productionServices.ts の存在確認 | masterブランチで `productionServices.ts` の存在を確認し、worktreeの状態との差分を解消 | design.md, tasks.md |
| Critical | プロパティ数の正確な確認 | ContextServices の直接プロパティ数を数え直し、仕様書の数値を修正 | requirements.md, design.md |
| Warning | handler.ts への注入パス明示 | productionServices からの配線がどうhandlerに到達するかを設計に明記 | design.md |
| Warning | 循環依存の解決策確定 | createNewWindow のimportパスを確定 | design.md (DD-003), research.md |
| Warning | confirmCommonCommands のmock確認 | test-helpers.ts を確認し、不足していれば追加 | tasks.md |
| Warning | mockServices追加タスク | mockServicesに不足プロパティがある場合のタスク追加 | tasks.md |
| Info | インシデントレポート更新 | Phase 3完了記録の追加を検討 | Out of scope |
| Info | 配線済み26サービスの明文化 | Phase 2配線済みリストを記載 | research.md |

---

_This review was generated by the document-review command._
