# Specification Review Report #2

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Documents Reviewed**:
- `spec.json`
- `requirements.md` (Review #1 修正適用済み)
- `design.md` (Review #1 修正適用済み)
- `tasks.md` (Review #1 修正適用済み)
- `document-review-1.md`, `document-review-1-reply.md`
- `steering/product.md`, `steering/tech.md`, `steering/structure.md`, `steering/design-principles.md`
- ソースコード（実装状態確認）: `renderer/stores/agentStore.ts`, `shared/stores/agentStore.ts`, `shared/api/types.ts`, `renderer/stores/agentStoreAdapter.ts`, `renderer/stores/index.ts`, `shared/hooks/useAgentsBySpec.ts`, `renderer/components/AgentListPanel.tsx`, `renderer/components/AgentLogPanel.tsx`, `renderer/components/AgentInputPanel.tsx`, `renderer/components/ProjectAgentPanel.tsx`, `renderer/components/SpecList.tsx`, `renderer/stores/spec/specStoreFacade.ts`

## Executive Summary

**全体評価**: Critical: 2件 / Warning: 3件 / Info: 2件

Review #1で検出されたWarning/Info指摘は全て適切に修正済み。本レビューではソースコード実態との深層的な整合性検証を実施した結果、**アクション一覧の不完全性**（要件・設計双方）および**ログ読み取り移行の事実誤認**が Critical として検出された。これらは実装時にそのまま従うと、ファサードの必要なアクションが削除されるか、ログ表示が壊れるリスクがある。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: 問題あり（Critical 1件）**

**🔴 CRITICAL C-01: Requirement 6.1のアクション一覧が不完全**

Requirements Req 6.1は以下のアクションがファサードに残ると記載:
```
setupEventListeners, startAgent, stopAgent, resumeAgent, selectAgent, addAgent,
removeAgent, loadAgents, clearLogs, ensureLogsLoaded, selectForProjectAgents, getAgentById
```

しかし、現在のファサードには**24個のアクション**が存在し、削除対象（`loadRunningAgentCounts`, `getRunningAgentCount`）と`setSkipPermissions`/`loadSkipPermissions`（SSOT委譲ラッパーとして残存）を除いても、**以下の7アクションが一覧から欠落**:

| 欠落アクション | 用途 | 欠落の影響 |
|---------------|------|-----------|
| `sendInput` | コンポーネントからAgentへの入力送信 | AgentInputPanelの入力機能が喪失 |
| `updateAgentStatus` | IPCイベントハンドラでのステータス更新 | Agentステータス同期の断絶 |
| `appendLog` | IPCイベントハンドラでのログ追加 | ログリアルタイム表示の断絶 |
| `getLogsForAgent` | AgentLogPanelでのログ取得 | ログ表示機能の喪失 |
| `getSelectedAgent` | 選択中Agent取得ヘルパー | 選択Agent依存コードの破損 |
| `findAgentById` | Agent検索ヘルパー | Agent検索機能の喪失 |
| `clearError` | specStoreFacade等でのエラークリア | エラー状態のリセット不能 |

**Design.mdのAgentActionStore interface（lines 250-270）も同様に不完全**で、上記7アクションが型定義から欠落している。

**影響**: 実装者がReq 6.1またはDesign.mdのAgentActionStore interfaceを忠実に実装した場合、既存の必要なアクションが削除され、ランタイムエラーが発生する。

**推奨対応**:
- requirements.md Req 6.1のアクション一覧に欠落7アクションを追加
- design.md AgentActionStore interfaceに欠落7アクションの型定義を追加
- `loadAgentLogs`は deprecated であり削除候補として明記するか、残す場合はリストに追加

### 1.2 Design ↔ Tasks Alignment

**結果: 良好** ✅

Design.mdの全コンポーネント変更がTasks.mdにタスクとして反映されている。Review #1からの改善も適切に取り込まれている。

### 1.3 Design ↔ Tasks Completeness

**結果: 良好** ✅

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | 5コンポーネント | Task 4.1〜4.5 | ✅ |
| Services/Stores | SSOT拡張, ファサードリファクタリング | Task 1.1, 1.2, 3.1 | ✅ |
| Types/Models | AgentInfo統一 | Task 2.1, 2.2 | ✅ |
| Adapter | 変換関数削除 | Task 2.2 | ✅ |
| Related files | specStoreFacade, CreateSpecDialog等 | Task 5.1, 5.2 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**結果: 問題あり（Critical 1件）**

**🔴 CRITICAL C-02: Requirement 2.3の事実誤認 — ログ読み取りは「対応済み」ではない**

requirements.md Criterion 2.3は:
> `logs`を読むAgentLogPanelが`useSharedAgentStore`から直接読み取ること（既に対応済み）

design.md Requirements Traceability（Criterion 2.3）でも:
> 既に`useAgentLogSubscription`経由で対応済み、残存箇所の確認

しかし、**ソースコード調査により、AgentLogPanel.tsx（lines 39-42）はファサードストア（`useAgentStore`）の`logs` Mapから直接読み取っている**:

```typescript
const rawLogs = useAgentStore((state) => {
  if (!state.selectedAgentId) return EMPTY_LOGS;
  return state.logs.get(state.selectedAgentId) || EMPTY_LOGS;
});
```

`useAgentLogSubscription`フックはログの**購読・ローディング**を担当するが、**ログの読み取り自体はファサードの`logs`フィールドから行われている**。ファサードの`logs`フィールドが削除された場合、AgentLogPanelのログ表示が壊れる。

tasks.md Task 4.2では「`logs`の読み取りは既に`useAgentLogSubscription`経由で対応済みであることを確認、残存箇所があれば修正」と記載しているが、**残存箇所は確実に存在する**（AgentLogPanel.tsx lines 39-42）。

**影響**:
- 実装者が「対応済み」と信じて確認のみで済ませた場合、ファサードの`logs`フィールド削除後にログ表示機能が壊れる
- Task 4.2の記述が「確認のみ」ではなく「SSOTからの直接読み取りへの移行」を明示すべき

**推奨対応**:
- requirements.md Criterion 2.3から「（既に対応済み）」を削除し、移行が必要であることを明記
- design.md Requirements Traceability Criterion 2.3の記述を修正
- tasks.md Task 4.2の記述を「確認」から「移行」に変更（`useSharedAgentStore(s => s.logs.get(selectedAgentId))`への書き換え）

### 1.5 Integration Test Coverage

**結果: 良好** ✅

Review #1 W-01の修正により、Design.mdのIntegration Test Strategyが既存テスト更新の文脈に合わせて修正されている。Tasks.mdのTask 6.4と整合している。

### 1.6 Cross-Document Contradictions

**結果: Review #1の修正で解消済み** ✅

- W-02（SharedAgentInfo型名）: 修正済み
- W-03（SSSOT表記揺れ）: 修正済み

### 1.7 Refactoring Integrity Check

**結果: 良好** ✅

| Check | Validation | Status |
|-------|------------|--------|
| 削除対象の明確化 | Design.md「削除対象ファイルはない」— 既存ファイルの内容削減のみ | ✅ 正確 |
| Consumer Updates | Design.md Wiring Points（21ファイル）が全消費者を網羅 | ✅ 網羅的 |
| 並行実装の回避 | 新ファイル作成なし、既存ファイルのリファクタリングのみ | ✅ ゾンビコードなし |
| Import更新 | AgentInfo re-export戦略で既存importパスとの後方互換を維持 | ✅ 適切 |

## 2. Gap Analysis

### 2.1 Technical Considerations

**⚠️ WARNING W-01: AgentLogPanelのログ読み取りパターンの詳細設計が不足**

C-02で指摘したログ読み取りの移行について、具体的な実装パターンが設計文書に不足している。ファサードの`logs`フィールド削除後、AgentLogPanelがどのセレクタパターンでSSOTからログを読み取るかを明確にすべき:

```typescript
// 移行後の想定パターン
const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);
const rawLogs = useSharedAgentStore(s => {
  if (!s.selectedAgentId) return EMPTY_LOGS;
  return s.logs.get(s.selectedAgentId) || EMPTY_LOGS;
});
```

**⚠️ WARNING W-02: `getLogsFromShared()`関数の削除がTask 3.1で暗黙的**

ソースコード調査により、`getLogsFromShared()`はファサードの初期state設定（line 369）、`ensureLogsLoaded`（line 463）、`removeAgent`（line 536）、`resumeAgent`（line 551）で使用されている。Task 3.1の「subscribe-and-sync削除」に暗黙的に含まれるが、`ensureLogsLoaded`等のアクション内での使用は`subscribe-and-sync`とは別の文脈。これらの箇所でも`getLogsFromShared()`呼び出しを削除または置換する必要がある。

### 2.2 Operational Considerations

特に問題なし。

## 3. Ambiguities and Unknowns

**⚠️ WARNING W-03: `loadAgentLogs`(deprecated)の扱いが未定義**

ファサードの`loadAgentLogs`は deprecated であり`ensureLogsLoaded`に委譲している（line 466-474）。削除するか残すかがReq 6.1・Design.md双方で明示されていない。

**ℹ️ INFO I-01: AgentListPanelの`agents` Map読み取りの冗長性**

AgentListPanel.tsx（line 67）は`useAgentStore`から`agents` Mapを読み取っているが、実際のAgent表示には`useAgentsBySpec(specId)`フック（line 86）の戻り値を使用している。`agents` Map読み取りの目的はloadチェック（line 90-93）のみであり、SSOT移行時にこの冗長な読み取りを整理できる可能性がある。

**ℹ️ INFO I-02: specStoreFacade.tsの`clearError()`はアクション呼び出し**

specStoreFacade.ts（line 468）の`useAgentStore.getState().clearError()`は状態読み取りではなくアクション呼び出しであることを確認。Task 5.1の「状態読み取りをSSOT読み取りに変更」の対象ではないが、ファサードのアクション経由で呼ぶか、SSOTの`clearError()`を直接呼ぶかの判断が必要。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: 完全に整合** ✅

- `structure.md`のState Management Rules（Domain State SSOT）に準拠
- `design-principles.md`の「根本原因への対処の徹底」に合致（subscribe-and-syncの構造的欠陥を排除）
- SSOT原則のより純粋な実装として評価可能

### 4.2 Integration Concerns

Review #1で確認済み。Remote UIへの好影響（skipPermissions共有）、他ファサードストアへの影響なし。

### 4.3 Migration Requirements

特になし。インメモリ状態のリファクタリングのみ。

## 5. Recommendations

### Critical Issues (Must Fix)

**C-01**: requirements.md Req 6.1のアクション一覧に以下を追加: `sendInput`, `updateAgentStatus`, `appendLog`, `getLogsForAgent`, `getSelectedAgent`, `findAgentById`, `clearError`。design.md AgentActionStore interfaceにも同様に追加。

**C-02**: requirements.md Criterion 2.3から「（既に対応済み）」を削除。design.md Requirements Traceability Criterion 2.3を修正。tasks.md Task 4.2を「確認」から「SSOTからの直接読み取りへの移行」に修正。

### Warnings (Should Address)

**W-01**: design.mdにAgentLogPanelのログ読み取り移行パターン（SSOTセレクタ）を追記。

**W-02**: tasks.md Task 3.1に`getLogsFromShared()`関数の全使用箇所（初期state、ensureLogsLoaded、removeAgent、resumeAgent内）の削除・置換を明示。

**W-03**: `loadAgentLogs`(deprecated)を削除対象として明記するか、残存する場合はReq 6.1に含める。

### Suggestions (Nice to Have)

**I-01**: AgentListPanelのSSOT移行時に、`agents` Map直接読み取りの冗長性を解消する注記をTask 4.1に追加。

**I-02**: specStoreFacade.tsの`clearError()`呼び出しのリファクタリング方針（ファサード経由 vs SSOT直接）をTask 5.1に明記。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | C-01: アクション一覧不完全 | Req 6.1に7アクション追加、Design interface拡張 | `requirements.md`, `design.md` |
| Critical | C-02: ログ読み取り「対応済み」は事実誤認 | Criterion 2.3修正、Task 4.2を移行タスクに変更 | `requirements.md`, `design.md`, `tasks.md` |
| Warning | W-01: ログ移行パターン未記載 | Design.mdにSSOTセレクタパターン追記 | `design.md` |
| Warning | W-02: getLogsFromShared()削除範囲の明示 | Task 3.1に全使用箇所の削除を記載 | `tasks.md` |
| Warning | W-03: loadAgentLogs(deprecated)の扱い | 削除対象として明記 | `requirements.md`, `tasks.md` |
| Info | I-01: AgentListPanelのagents冗長読み取り | Task 4.1に整理の注記追加 | `tasks.md` |
| Info | I-02: clearError()リファクタリング方針 | Task 5.1に方針明記 | `tasks.md` |

---

_This review was generated by the document-review command._
