# Specification Review Report #4

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, document-review-3-reply.md, steering/product.md, steering/tech.md, steering/structure.md, steering/design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 2     |
| Warning  | 3     |
| Info     | 2     |

前回のReview #3で指摘された3件の修正（sendInput重複定義削除、委譲メソッド方針統一、タスク実行順序注記）は全て適切に適用済み。本ラウンドでは、ソースコード実態との照合により新たに2件のCritical（spec文書とソースコードの不一致）と3件のWarning（不完全な記載）を検出した。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Requirements全7要件がDesignのRequirements Traceabilityに網羅されている**: ✅

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: ファサードから状態フィールド削除 | DD-001, Components and Interfaces | ✅ |
| Req 2: コンポーネントのSSOT直接読み取り | Architecture Pattern, Components Summary | ✅ |
| Req 3: AgentInfo型統一 | DD-002, Data Models | ✅ |
| Req 4: skipPermissionsのSSOT移行 | DD-003, State Management | ✅ |
| Req 5: runningAgentCountのSSOT移行 | DD-004, State Management | ✅ |
| Req 6: ファサードのアクション維持 | DD-001, AgentActionStore interface | ✅ |
| Req 7: テスト更新 | Testing Strategy | ✅ |

### 1.2 Design ↔ Tasks Alignment

**Designの全コンポーネント変更がTasksに反映されている**: ✅

| Design Component | Task Coverage | Status |
|------------------|--------------|--------|
| useSharedAgentStore拡張 | Task 1.1, 1.2 | ✅ |
| AgentInfo型統一 | Task 2.1, 2.2 | ✅ |
| ファサード状態削除 | Task 3.1 | ✅ |
| コンポーネント移行 | Task 4.1-4.5 | ✅ |
| 関連ファイル更新 | Task 5.1, 5.2 | ✅ |
| テスト更新 | Task 6.1-6.5 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| SSOT拡張 | skipPermissions, getRunningAgentCount | Task 1.1, 1.2 | ✅ |
| 型統一 | AgentInfo re-export, 変換関数削除 | Task 2.1, 2.2 | ✅ |
| ファサード縮小 | 状態フィールド全削除 | Task 3.1 | ✅ |
| コンポーネント移行 | 5コンポーネント | Task 4.1-4.5 | ✅ |
| 関連ファイル | specStoreFacade, import元変更 | Task 5.1, 5.2 | ✅ |
| テスト | 4種テスト更新 | Task 6.1-6.5 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | agents等の状態フィールド削除 | 3.1 | Feature | ✅ |
| 1.2 | subscribe-and-sync削除 | 3.1 | Feature | ✅ |
| 1.3 | 初期化時getAgentsFromShared()呼び出し削除 | 3.1 | Feature | ✅ |
| 1.4 | getAgentsFromShared(), calculateRunningCounts()削除 | 3.1 | Feature | ✅ |
| 2.1 | selectedAgentIdのSSOT直接読み取り | 4.1-4.4, 5.1 | Feature | ✅ |
| 2.2 | agentsのSSOT直接読み取り | 4.1, 4.2, 4.4, 5.1 | Feature | ✅ |
| 2.3 | logsのSSOT直接読み取り | 4.2 | Feature | ✅ |
| 2.4 | skipPermissionsのSSOT直接読み取り | 4.1 | Feature | ✅ |
| 2.5 | 移行後のコンポーネント動作維持 | 6.5 | Feature | ✅ |
| 3.1 | SharedAgentInfoにretryCount追加 | 2.1 | Feature | ✅ |
| 3.2 | SharedAgentInfoにexecutionMode追加 | 2.1 | Feature | ✅ |
| 3.3 | Renderer固有AgentInfo型削除 | 2.1 | Feature | ✅ |
| 3.4 | toRendererAgentInfo(), toSharedAgentInfo()削除 | 2.2 | Feature | ✅ |
| 3.5 | 全コンポーネントでSharedAgentInfo使用 | 2.1, 5.2 | Feature | ✅ |
| 4.1 | useSharedAgentStoreにskipPermissions追加 | 1.1 | Feature | ✅ |
| 4.2 | useSharedAgentStoreにsetSkipPermissions追加 | 1.1 | Feature | ✅ |
| 4.3 | ファサードからskipPermissions削除 | 3.1 | Feature | ✅ |
| 4.4 | AgentListPanelがSSOTからskipPermissions読み取り | 4.1 | Feature | ✅ |
| 5.1 | SSOTにgetRunningAgentCount()追加 | 1.2 | Feature | ✅ |
| 5.2 | SpecListがSSOTのgetRunningAgentCount()使用 | 4.5 | Feature | ✅ |
| 5.3 | ファサードからrunningAgentCounts削除 | 3.1 | Feature | ✅ |
| 6.1 | アクションがファサードに残る | 3.1 | Feature | ✅ |
| 6.2 | アクション内部でSSOTメソッド呼び出し | 3.1 | Feature | ✅ |
| 6.3 | setupEventListeners()のtRPC初期化維持 | 3.1 | Feature | ✅ |
| 7.1 | agentStore.test.ts更新 | 6.2, 6.3 | Testing | ✅ |
| 7.2 | コンポーネントテストのモック更新 | 6.4 | Testing | ✅ |
| 7.3 | 全テストパス | 6.5 | Testing | ✅ |
| 7.4 | 共有ストアテスト拡張 | 6.1 | Testing | ✅ |

**Validation Results**:
- [x] 全criterion IDがmapping済み
- [x] ユーザー向けcriteriaにFeature Implementation tasksが対応
- [x] Infrastructureのみのcriterionは存在しない

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Store-Component統合 | Integration Test Strategy | 6.4 (モック更新) | ✅ |
| SSOT→コンポーネント伝播 | Testing Strategy | 6.4, 6.5 | ✅ |
| specStoreFacade連携 | Wiring Points | 5.1 | ✅ |

**Validation Results**:
- [x] コンポーネントテストのモック更新でStore-Component統合を検証
- [x] 全テストパスで回帰テストを検証

### 1.6 Cross-Document Contradictions

#### C-01 [CRITICAL]: AgentInputPanelのRequirements記載がソースコード実態と不一致

**Requirements 2.1**: 「`selectedAgentId`を読む4コンポーネント（AgentLogPanel, ProjectAgentPanel, AgentListPanel, AgentInputPanel）」
**Requirements 2.2**: 「`agents`を読む4コンポーネント（AgentLogPanel, ProjectAgentPanel, AgentListPanel, AgentInputPanel）」

ソースコード実態:
- AgentInputPanel.tsx L21-28: `useAgentStore((state) => { ... for (const agentList of state.agents.values()) ... })` — **agentsを読み取っている**

**しかし、Design側**:
- Design Requirements Traceability 2.2: 「agentsのSSOT直接読み取り」の対象に **4.1, 4.2, 4.4** のみリスト（AgentInputPanelの4.3が**欠落**）
- Design Components and Interfaces: AgentInputPanelのReq Coverageが「2.1」のみ（「2.2」が**欠落**）
- Task 4.3: 「`selectedAgentId`の読み取り元を`useSharedAgentStore`に変更」のみ記載。**agentsの移行が欠落**

AgentInputPanelは実際にはagents Mapを全走査してselectedAgentIdに対応するagentオブジェクトを取得しており、selectedAgentIdだけでなくagentsも読み取っている。Task 4.3でagentsの移行が漏れると、ファサードから状態フィールドを削除するTask 3.1の後にコンパイルエラーが発生する。

#### C-02 [CRITICAL]: specStoreFacadeのuseAgentStore使用箇所数がDesignと不一致

**Design Interface Changes L493**: 「`specStoreFacade.ts`の`useAgentStore.getState()`による状態読み取り（2箇所）を`useSharedAgentStore.getState()`に変更」
**Task 5.1**: 同様に「2箇所」と記載

ソースコード実態:
- L80: `useAgentStore.getState()` — **agents** と **error** の状態読み取り（2フィールド参照）
- L162: `useAgentStore.subscribe()` — ファサードの状態変更をsubscribe
- L468: `useAgentStore.getState().clearError()` — アクション呼び出し

Task 5.1のスコープ注記で「L466-470のclearError()はアクション呼び出しのため変更不要」と記載あるが、**L162の`useAgentStore.subscribe()`については言及がない**。ファサードから状態フィールドを削除した後、`useAgentStore.subscribe()`でsubscribeしている部分はファサードのアクション呼び出しの変更を検知するだけになり、状態読み取りの目的（`getAggregatedState()`内でのagents/errorアクセス）が動作しなくなる。

---

## 2. Gap Analysis

### 2.1 Technical Considerations

#### W-01 [WARNING]: specStoreFacadeのsubscribe移行戦略が未定義

specStoreFacade.ts L158-166:
```typescript
export function setupAgentStoreSubscription(): void {
  useAgentStore.subscribe(() => {
    useSpecStoreFacade.setState(getAggregatedState());
  });
}
```

`getAggregatedState()`内の`getSpecManagerExecution()`（L80-81）はファサードの`agents`と`error`を読み取っている。ファサードから状態が削除された後:
1. `useAgentStore.subscribe()`はアクションの内部状態変更を検知しなくなる（状態フィールドがないため）
2. `getSpecManagerExecution()`の読み取り先を`useSharedAgentStore.getState()`に変更する必要がある
3. subscribeも`useSharedAgentStore.subscribe()`に変更する必要がある

**Task 5.1では`getState()`の2箇所のみ言及しており、subscribe()の移行が漏れている。**

#### W-02 [WARNING]: AgentInputPanelのagent検索パターンのSSOT移行方針が未定義

AgentInputPanel.tsx L21-28のコード:
```typescript
const agent = useAgentStore((state) => {
  if (!state.selectedAgentId) return undefined;
  for (const agentList of state.agents.values()) {
    const found = agentList.find((a) => a.agentId === state.selectedAgentId);
    if (found) return found;
  }
  return undefined;
});
```

このパターンは単純な`useSharedAgentStore(s => s.agents)`ではなく、agentsの全値を走査してselectedAgentIdに一致するagentを見つける**導出ロジック**。移行時に:
- `useSharedAgentStore`経由で同じパターンを使用するか
- SSOTの`getAgentById()`や`findAgentById()`を使用するか
- 共有フック（`useSelectedAgent`等）を検討するか

を設計文書で明確にすべき。

#### W-03 [WARNING]: SpecListコンポーネントの配置がDesignと実態で不一致

Design Wiring Points（L459）: 「`src/renderer/components/SpecList.tsx`」
Design Components and Interfaces: SpecListが「renderer/components」に配置

ソースコード実態: `src/renderer/components/SpecList.tsx`は存在するが、実際にはSpecListの主要ロジックは`shared/components/spec/SpecListContainer.tsx`にある可能性が高い（SpecList.tsxがSpecListContainerに`getRunningAgentCount`を渡している構造）。

Task 4.5の実装時に、SpecListContainer側の変更も必要になる可能性がある。SpecListContainerが`getRunningAgentCount`をpropsとして受け取っている場合、`useRunningAgentCount`フックへの置き換えはSpecListContainer内部に移動する設計変更を伴う可能性がある。

### 2.2 Operational Considerations

特に問題なし。リファクタリングはコード内部の変更であり、デプロイ・ロールバック・モニタリングに新たな考慮は不要。

---

## 3. Ambiguities and Unknowns

#### I-01 [INFO]: AgentLogPanelのselectedAgentId読み取り元の記載にReviewラウンド間で揺れ

Design L295-303のAgentLogPanel移行パターンで`useSharedAgentStore`経由のログ読み取りが記載されているが、L146の記載では「現在はファサードの`logs`フィールドから読み取っており」と正確に記述されている。

ソースコード確認の結果、L39-42は`useAgentStore`（ファサード）からの読み取りであることを確認。Design文書の記載は正確。

#### I-02 [INFO]: AgentActionStoreのsetSkipPermissions/loadSkipPermissionsの実装方針

Design L273-275:
```typescript
// skipPermissions操作はSSOTに委譲
setSkipPermissions(enabled: boolean): void;
loadSkipPermissions(projectPath: string): Promise<void>;
```

`setSkipPermissions`のSSOT委譲は明確だが、`loadSkipPermissions`はtRPC経由でプロジェクト設定を読み込むアクションであり、ファサードのアクションとして残すのは妥当。ただし、内部実装が「SSOTの`setSkipPermissions()`を呼ぶ」のか「直接SSOTを更新する」のかの詳細が未記載。実装時に判断可能な範囲のため、問題は軽微。

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **State Management Rules (Strict)** との整合: SSOT原則に従い、ドメインデータを`shared/stores`に集約する方向性は`structure.md`のルールに完全に合致。

✅ **Electron Process Boundary Rules** との整合: ファサードの状態読み取り委譲メソッドは`structure.md`の「RendererはMainのキャッシュ」パターンに準拠。

### 4.2 Integration Concerns

⚠️ **specStoreFacadeへの影響**: specStoreFacadeは`useAgentStore.subscribe()`と`useAgentStore.getState()`の両方でファサードに依存しており、単純な`getState()`の差し替えだけでは不十分（W-01参照）。

### 4.3 Migration Requirements

✅ ファイル名維持（DD-005）により、import変更の影響を最小化する方針はsteering/structure.mdのRe-export Patternと整合。

---

## 5. Recommendations

### Critical Issues (Must Fix)

**C-01**: AgentInputPanelのagents読み取り移行がTask 4.3から欠落
- Requirements 2.2の対象コンポーネントにAgentInputPanelが含まれている
- Design Requirements TraceabilityのCriterion 2.2対象にTask 4.3を追加
- Design Components and InterfacesのAgentInputPanelのReq Coverageに「2.2」を追加
- Task 4.3にagentsの`useSharedAgentStore`移行を追記

**C-02**: specStoreFacadeの`useAgentStore.subscribe()`移行がTask 5.1から欠落
- Task 5.1に`setupAgentStoreSubscription()`の`useAgentStore.subscribe()`を`useSharedAgentStore.subscribe()`に変更する作業を追加
- `getSpecManagerExecution()`内の`useAgentStore.getState()`も同時に`useSharedAgentStore.getState()`に変更

### Warnings (Should Address)

**W-01**: specStoreFacadeのsubscribe移行戦略をDesignに明記
**W-02**: AgentInputPanelのagent検索パターン（agents全走査→agent導出）のSSOT移行方針を明記
**W-03**: SpecList/SpecListContainerの`getRunningAgentCount`→`useRunningAgentCount`置き換えの影響範囲を確認

### Suggestions (Nice to Have)

**I-01**: 特に対応不要（記載は正確）
**I-02**: 実装時に自然に解決される範囲

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| Critical | C-01: AgentInputPanelのagents移行欠落 | Task 4.3にagents移行を追記、Design Traceability/Components更新 | design.md, tasks.md |
| Critical | C-02: specStoreFacade subscribe移行欠落 | Task 5.1にsubscribe移行を追記、Design Wiring Points更新 | design.md, tasks.md |
| Warning | W-01: subscribe移行戦略未定義 | Designに移行戦略を追記 | design.md |
| Warning | W-02: AgentInputPanel agent検索移行方針 | Task 4.3に具体的な移行パターンを記載 | tasks.md |
| Warning | W-03: SpecListContainer影響確認 | Task 4.5の影響範囲をSpecListContainerまで拡張するか確認 | tasks.md |

---

_This review was generated by the document-review command._
