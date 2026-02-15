# Specification Review Report #3

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Documents Reviewed**:
- `spec.json`
- `requirements.md` (Review #1, #2 修正適用済み)
- `design.md` (Review #1, #2 修正適用済み)
- `tasks.md` (Review #1, #2 修正適用済み)
- `document-review-1.md`, `document-review-1-reply.md`
- `document-review-2.md`, `document-review-2-reply.md`
- `steering/product.md`, `steering/tech.md`, `steering/structure.md`, `steering/design-principles.md`
- ソースコード（実装状態確認）: `renderer/stores/agentStore.ts`, `shared/stores/agentStore.ts`, `shared/api/types.ts`, `renderer/stores/agentStoreAdapter.ts`, `renderer/stores/index.ts`, `shared/hooks/useAgentsBySpec.ts`, 5コンポーネント, `specStoreFacade.ts`, `CreateSpecDialog.tsx`, `CreateBugDialog.tsx`

## Executive Summary

**全体評価**: Critical: 1件 / Warning: 2件 / Info: 1件

Review #2で検出されたCritical 2件・Warning 3件・Info 2件は全て適切に修正済み。本レビュー（#3）ではソースコードとの最終整合性検証を実施し、Review #2修正で**新たに混入した型定義の重複**をCriticalとして検出した。また、ファサードの状態読み取り委譲メソッドの扱いに関するWarningと、タスク間依存の明示に関するWarningを検出した。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: 問題あり（Critical 1件）**

**🔴 CRITICAL C-01: AgentActionStore interfaceに`sendInput`が2回定義されている**

Review #2のC-01修正で7アクションをDesign.mdのAgentActionStore interfaceに追加した際、`sendInput`が**2箇所に定義**されている:

```typescript
// design.md lines 258, 266
sendInput(agentId: string, input: string): Promise<void>;  // line 258 (元からある)
// ... 中間に他のメソッド ...
sendInput(agentId: string, input: string): Promise<void>;  // line 266 (C-01修正で追加)
```

TypeScriptインターフェースでは同一シグネチャの重複定義はオーバーロードとして扱われエラーにはならないが、仕様文書としては混乱の原因になる。

**影響**: 実装者がinterfaceをそのまま転記すると、不要なオーバーロードが残る。
**推奨対応**: design.md line 266の重複`sendInput`定義を削除する。

### 1.2 Design ↔ Tasks Alignment

**結果: 良好** ✅

Review #2の修正により、全設計コンポーネントがTasks.mdのタスクに適切に反映されている。

### 1.3 Design ↔ Tasks Completeness

**結果: 良好** ✅

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | 5コンポーネント | Task 4.1〜4.5 | ✅ |
| Services/Stores | SSOT拡張, ファサードリファクタリング | Task 1.1, 1.2, 3.1 | ✅ |
| Types/Models | AgentInfo統一 | Task 2.1, 2.2 | ✅ |
| Adapter | 変換関数削除 | Task 2.2 | ✅ |
| Related files | specStoreFacade, CreateSpecDialog等 | Task 5.1, 5.2 | ✅ |
| Tests | 全テスト更新 | Task 6.1〜6.5 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**結果: 良好** ✅

Review #2のC-02修正により、Criterion 2.3の「対応済み」が「SSOTへの移行が必要」に正しく修正されている。全criterionが具体的なFeatureタスクにマッピングされている。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 状態フィールド削除 | 3.1 | Feature | ✅ |
| 1.2 | subscribe-and-sync削除 | 3.1 | Feature | ✅ |
| 1.3 | 初期化時関数呼び出し削除 | 3.1 | Feature | ✅ |
| 1.4 | ヘルパー関数削除 | 3.1 | Feature | ✅ |
| 2.1 | selectedAgentId SSOT直接 | 4.1, 4.2, 4.3, 4.4, 5.1 | Feature | ✅ |
| 2.2 | agents SSOT直接 | 4.1, 4.2, 4.4, 5.1 | Feature | ✅ |
| 2.3 | logs SSOT直接（移行） | 4.2 | Feature | ✅ |
| 2.4 | skipPermissions SSOT直接 | 4.1 | Feature | ✅ |
| 2.5 | コンポーネント動作維持 | 6.5 | Feature | ✅ |
| 3.1 | retryCount確認 | 2.1 | Feature | ✅ |
| 3.2 | executionMode確認 | 2.1 | Feature | ✅ |
| 3.3 | Renderer固有AgentInfo削除 | 2.1 | Feature | ✅ |
| 3.4 | 変換関数削除 | 2.2 | Feature | ✅ |
| 3.5 | AgentInfo型統一 | 2.1, 5.2 | Feature | ✅ |
| 4.1 | skipPermissions追加 | 1.1 | Feature | ✅ |
| 4.2 | setSkipPermissions追加 | 1.1 | Feature | ✅ |
| 4.3 | ファサードskipPermissions削除 | 3.1 | Feature | ✅ |
| 4.4 | AgentListPanel SSOT読み取り | 4.1 | Feature | ✅ |
| 5.1 | getRunningAgentCount追加 | 1.2 | Feature | ✅ |
| 5.2 | SpecList SSOT使用 | 4.5 | Feature | ✅ |
| 5.3 | runningAgentCounts削除 | 3.1 | Feature | ✅ |
| 6.1 | アクション残存 | 3.1 | Feature | ✅ |
| 6.2 | SSOTメソッド呼び出し | 3.1 | Feature | ✅ |
| 6.3 | setupEventListeners維持 | 3.1 | Feature | ✅ |
| 7.1 | agentStore.test.ts更新 | 6.2, 6.3 | Testing | ✅ |
| 7.2 | コンポーネントテストモック更新 | 6.4 | Testing | ✅ |
| 7.3 | 全テストパス | 6.5 | Testing | ✅ |
| 7.4 | 共有ストアテスト拡張 | 6.1 | Testing | ✅ |

**Validation Results**:
- [x] 全criterion IDがrequirements.mdからマッピング済み
- [x] ユーザー向けcriteriaにFeature Implementationタスクがある
- [x] Infrastructureのみに依存するcriterionなし

### 1.5 Integration Test Coverage

**結果: 良好** ✅

Design.mdのIntegration Test Strategyが既存テスト更新の文脈と整合。Task 6.4が具体的なモック更新を列挙しており、十分な検証ポイントが定義されている。

### 1.6 Cross-Document Contradictions

**結果: C-01以外は解消済み** ✅

Review #1, #2で検出された矛盾は全て修正済み。新たなC-01（sendInput重複）のみが残存。

### 1.7 Refactoring Integrity Check

**結果: 良好** ✅

| Check | Validation | Status |
|-------|------------|--------|
| 削除対象の明確化 | Design.md「削除対象ファイルはない」 | ✅ 正確 |
| Consumer Updates | Design.md Wiring Points（21ファイル）が全消費者を網羅 | ✅ 網羅的 |
| 並行実装の回避 | 新ファイル作成なし、既存ファイルのリファクタリングのみ | ✅ ゾンビコードなし |
| Import更新 | AgentInfo re-export戦略で後方互換維持 | ✅ 適切 |
| getLogsFromShared削除 | Task 3.1で全8箇所を明示 | ✅ Review #2修正で追加済み |
| loadAgentLogs削除 | Task 3.1で明示 | ✅ Review #2修正で追加済み |

## 2. Gap Analysis

### 2.1 Technical Considerations

**⚠️ WARNING W-01: ファサードの状態読み取り委譲メソッド（getAgentById, getSelectedAgent, findAgentById, getLogsForAgent）の設計意図が不明確**

Design.mdのAgentActionStoreに以下の状態読み取り委譲メソッドが含まれている:
- `getAgentById(agentId)` — Implementation Notesで「SSOT委譲メソッドとしてファサードに残す」と言及あり
- `getSelectedAgent()` — 委譲方針の記載なし
- `findAgentById(agentId | null)` — 委譲方針の記載なし
- `getLogsForAgent(agentId)` — 委譲方針の記載なし

これら4メソッドは**状態読み取り**であり、リファクタリングの目的「コンポーネントは状態をSSOTから直接読み取る」と矛盾する。Design.mdのInvariant「ファサードは状態フィールドを持たない。全ての状態読み取りはSSOT経由で行う」とも整合しない。

`getAgentById`のみは「既存の呼び出しパターンとの互換性のため」という根拠があるが、他3メソッドには同様の根拠が記載されていない。

**推奨対応**: 以下のいずれかの方針をDesign.mdのImplementation Notesに明記する:
- (A) 全4メソッドをSSOT委譲ラッパーとしてファサードに残す（理由: 互換性）
- (B) コンポーネントからは`useSharedAgentStore.getState().getAgentById()`を直接呼ばせ、ファサードから削除する
- 現状の`getAgentById`のみ言及、他3つは未言及の状態は不整合

**⚠️ WARNING W-02: タスク間の実行順序依存が明示されていない**

Tasks.mdのTask 3.1（ファサードから状態フィールド削除）とTask 4.x（コンポーネントのSSOT移行）には強い依存関係がある:

- Task 3.1を先に実行すると、Task 4.xが未実行のコンポーネントでランタイムエラーが発生する
- Task 4.xを先に実行すると、Task 1.1（SSOT拡張）が未実行の場合にskipPermissionsの読み取りが失敗する

正しい実行順序は: **Task 1 → Task 2 → Task 4/5（先にコンポーネント移行） → Task 3（最後にファサード削除） → Task 6**

しかしTasks.mdの番号順（1→2→3→4→5→6）に従うと、Task 3（ファサード削除）がTask 4（コンポーネント移行）より先に実行され、コンパイルエラーが大量発生する。

**推奨対応**: Tasks.mdに実行順序の注記を追加するか、Task番号を依存順に並べ替える。

### 2.2 Operational Considerations

特に問題なし。

## 3. Ambiguities and Unknowns

**ℹ️ INFO I-01: AgentLogPanelのSSOTセレクタパターンで`selectedAgentId`がクロージャ参照**

Design.mdのAgentLogPanelセレクタパターン（lines 298-303）:

```typescript
const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);
const rawLogs = useSharedAgentStore(s => {
  if (!selectedAgentId) return EMPTY_LOGS;
  return s.logs.get(selectedAgentId) || EMPTY_LOGS;
});
```

2番目のセレクタは外部の`selectedAgentId`変数をクロージャで参照している。Zustandセレクタは参照等価性で再レンダリングを判断するため、`selectedAgentId`が変わった場合にセレクタ内部の`selectedAgentId`が更新されるかはReactレンダリングサイクルに依存する。

ただし、`selectedAgentId`が変更された時点でコンポーネントが再レンダリングされ、新しいクロージャが生成されるため、実用上は問題ない。Zustandの公式パターンとしても一般的であり、実装の障害にはならない。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: 完全に整合** ✅

- `structure.md`の**State Management Rules**: Domain State SSOTの原則に準拠。ファサードから状態を排除しSSOT直接読み取りに移行することは、この原則の純粋な実装
- `structure.md`の**Electron Process Boundary Rules**: ファサードのアクション（tRPC mutation経由のMain操作）はRenderer → tRPC mutation → Main → Subscription → Rendererのフローに従っており、正しい
- `design-principles.md`の**根本原因への対処の徹底**: subscribe-and-sync機構の構造的欠陥を「修正」ではなく「排除」するアプローチは、この原則に完全に合致

### 4.2 Integration Concerns

特になし。Review #1, #2で確認済み。

### 4.3 Migration Requirements

特になし。インメモリ状態のリファクタリングのみ。

## 5. Recommendations

### Critical Issues (Must Fix)

**C-01**: design.md AgentActionStore interfaceの`sendInput`重複定義（line 258とline 266）を修正し、1箇所にする。

### Warnings (Should Address)

**W-01**: Design.mdのImplementation Notesに、状態読み取り委譲メソッド（`getAgentById`, `getSelectedAgent`, `findAgentById`, `getLogsForAgent`）の設計方針を統一的に記載する。

**W-02**: Tasks.mdにタスク実行順序の注記を追加する（推奨順: 1→2→4/5→3→6）。または、Task 3をTask 4/5の後に移動する。

### Suggestions (Nice to Have)

**I-01**: Design.mdのAgentLogPanelセレクタパターンはZustand標準パターンであり、実装上の問題はない。ドキュメントとしては現状のままで十分。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | C-01: sendInput重複定義 | AgentActionStore interface line 266の重複`sendInput`を削除 | `design.md` |
| Warning | W-01: 状態読み取り委譲メソッドの方針未統一 | Implementation Notesに4メソッド全ての設計根拠を記載 | `design.md` |
| Warning | W-02: タスク実行順序の依存明示 | 実行順序注記の追加（1→2→4/5→3→6） | `tasks.md` |
| Info | I-01: セレクタクロージャパターン | 対応不要（標準パターン） | - |

---

_This review was generated by the document-review command._
