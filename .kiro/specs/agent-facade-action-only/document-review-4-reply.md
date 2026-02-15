# Response to Document Review #4

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Reply Date**: 2026-02-15

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C-01: AgentInputPanelのagents読み取り移行がDesign/Taskから欠落

**Issue**: Requirements 2.2ではAgentInputPanelが`agents`を読むコンポーネントに含まれているが、Design Requirements TraceabilityのCriterion 2.2対象にTask 4.3が欠落しており、Task 4.3自体も`selectedAgentId`の移行のみ記載でagentsの移行が漏れている。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード確認の結果、AgentInputPanel.tsx L17-28:
```typescript
const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
const agent = useAgentStore((state) => {
  if (!state.selectedAgentId) return undefined;
  for (const agentList of state.agents.values()) {
    const found = agentList.find((a) => a.agentId === state.selectedAgentId);
    if (found) return found;
  }
  return undefined;
});
```
`state.agents.values()`を全走査しており、`selectedAgentId`だけでなく`agents`も確実に読み取っている。Task 3.1でファサードから`agents`を削除した際にコンパイルエラーが発生する。

**Action Items**:

- design.md: Requirements Traceability Criterion 2.2の対象タスクに`4.3`を追加
- design.md: Components and InterfacesのAgentInputPanelのReq Coverageに`2.2`を追加
- tasks.md: Task 4.3にagentsの`useSharedAgentStore`移行を追記（agents全走査→agent導出ロジックを含む）
- tasks.md: Requirements Coverage MatrixのCriterion 2.2の対象タスクに`4.3`を追加

---

### C-02: specStoreFacadeの`useAgentStore.subscribe()`移行がTask 5.1から欠落

**Issue**: Task 5.1は`useAgentStore.getState()`の2箇所のみ言及しているが、L162の`useAgentStore.subscribe()`の移行が欠落している。

**Judgment**: **Fix Required** ✅

**Evidence**:
specStoreFacade.ts確認の結果、`useAgentStore`の使用は3箇所:
1. **L80**: `useAgentStore.getState()` — `getSpecManagerExecution()`内で`agents`と`error`を読み取り
2. **L162**: `useAgentStore.subscribe()` — `setupAgentStoreSubscription()`でファサード状態変更をsubscribe
3. **L468**: `useAgentStore.getState().clearError()` — アクション呼び出し（変更不要）

L162の`useAgentStore.subscribe()`は、ファサードから状態フィールドが削除された後は状態変更を検知できなくなる。`useSharedAgentStore.subscribe()`に変更し、`getSpecManagerExecution()`内の読み取り先も同時に`useSharedAgentStore.getState()`に変更する必要がある。

**Action Items**:

- design.md: Wiring Pointsの`specStoreFacade.ts`の変更内容を更新（「2箇所」→「3箇所: getState() 1箇所 + subscribe() 1箇所 + clearError()はアクション呼び出しのため維持」）
- design.md: Interface Changes L493の記載を修正
- tasks.md: Task 5.1に`setupAgentStoreSubscription()`の`useAgentStore.subscribe()`→`useSharedAgentStore.subscribe()`変更を追記
- tasks.md: Task 5.1のスコープ注記にL162のsubscribe()移行についても明記

---

## Response to Warnings

### W-01: specStoreFacadeのsubscribe移行戦略が未定義

**Issue**: `setupAgentStoreSubscription()`内の`useAgentStore.subscribe()`をどう移行するかの戦略がDesignに未記載。

**Judgment**: **Fix Required** ✅

**Evidence**:
C-02と同じ根拠。`getAggregatedState()`→`getSpecManagerExecution()`はファサードの`agents`と`error`を読み取っており、subscribe先もsubscribe対象も両方とも`useSharedAgentStore`に変更が必要。

**Action Items**:

- design.md: Components and Interfacesまたは適切なセクションにspecStoreFacadeのsubscribe移行戦略を追記（subscribe先を`useSharedAgentStore.subscribe()`に変更、`getSpecManagerExecution()`内の読み取りも同時に変更）

---

### W-02: AgentInputPanelのagent検索パターンのSSOT移行方針が未定義

**Issue**: AgentInputPanelのagents全走査パターン（agents.values()→find by selectedAgentId）のSSOT移行方針が未記載。

**Judgment**: **Fix Required** ✅

**Evidence**:
AgentInputPanel.tsx L21-28のコードは単純な`useSharedAgentStore(s => s.agents)`ではなく、全agentListを走査してselectedAgentIdに一致するagentを見つける導出ロジック。SSOT移行時に同じパターンを`useSharedAgentStore`経由で使用するのが最も単純かつ安全。

ファサードの`findAgentById`委譲メソッドが既にDesignに記載されているが、コンポーネントからの状態読み取りはSSOTセレクタ経由が推奨されているため、`useSharedAgentStore`のセレクタ内で同じ走査パターンを使用する方針を明記すべき。

**Action Items**:

- tasks.md: Task 4.3に具体的な移行パターンを記載（`useSharedAgentStore`のセレクタ内でagents全走査→agent導出を実行。既存パターンと同じロジックで読み取り元のみ変更）

---

### W-03: SpecListコンポーネントの配置がDesignと実態で不一致

**Issue**: SpecListがgetRunningAgentCountをpropsとしてSpecListContainerに渡しており、useRunningAgentCountへの置き換えがSpecListContainer内部の変更を伴う可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード確認の結果:
- SpecList.tsx L28: `const getRunningAgentCount = useAgentStore(s => s.getRunningAgentCount);`
- SpecList.tsx L48: SpecListContainerにpropsとして渡している
- SpecListContainer.tsx L73: `getRunningAgentCount?: (specName: string) => number;` （optional prop）
- SpecListContainer.tsx L238: `const runningAgentCount = getRunningAgentCount?.(spec.name) ?? 0;`

SpecListContainerはpropsで`getRunningAgentCount`を受け取る設計（Electron only機能）。`useRunningAgentCount`フックに置き換える場合も、SpecList.tsx側でフックを呼び出してpropsとして渡すだけで済む（SpecListContainerは変更不要）。ただし、Task 4.5にこの点を明記すべき。

**Action Items**:

- tasks.md: Task 4.5に「SpecList.tsxで`useRunningAgentCount`フックを呼び出し、結果をSpecListContainerにpropsとして渡す。SpecListContainer自体の変更は不要」と明記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-01 | AgentLogPanelのselectedAgentId読み取り元の記載にReviewラウンド間で揺れ | No Fix Needed ❌ | レビュー自身が「Design文書の記載は正確」と結論しており、対応不要 |
| I-02 | AgentActionStoreのsetSkipPermissions/loadSkipPermissionsの実装方針 | No Fix Needed ❌ | レビュー自身が「実装時に判断可能な範囲のため、問題は軽微」と結論。Design L273-275に方針は記載済み |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | C-01: AgentInputPanelのReq Coverage更新、Traceability 2.2にTask 4.3追加 |
| design.md | C-02/W-01: specStoreFacadeのWiring Points・Interface Changes更新（subscribe移行追記）、subscribe移行戦略追記 |
| tasks.md | C-01/W-02: Task 4.3にagents移行+具体的パターン追記 |
| tasks.md | C-02: Task 5.1にsubscribe移行追記 |
| tasks.md | W-03: Task 4.5にSpecListContainer propsの方針明記 |
| tasks.md | C-01: Requirements Coverage MatrixのCriterion 2.2にTask 4.3追加 |

---

## Conclusion

全7件のレビュー指摘のうち、Critical 2件 + Warning 3件の計5件が「Fix Required」と判定された。いずれもソースコード実態との照合で問題が確認された正当な指摘であり、spec文書の修正が必要。Info 2件はレビュー自身が軽微と結論しており対応不要。

--autofixモードにより修正を適用済み。

---

## Applied Fixes

**Applied Date**: 2026-02-15
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | C-01: AgentInputPanel Req Coverage更新 + Traceability 2.2にTask 4.3追加 + agents全走査パターン移行方針追記 |
| design.md | C-02/W-01: specStoreFacade Wiring Points更新（subscribe移行追記）+ Interface Changes修正 |
| tasks.md | C-01/W-02: Task 4.3にagents移行と具体的パターン追記、Requirements 2.1→2.1,2.2 |
| tasks.md | C-02: Task 5.1にsubscribe()移行追記（L162） |
| tasks.md | W-03: Task 4.5にSpecListContainer propsの方針明記 |
| tasks.md | C-01: Requirements Coverage Matrix Criterion 2.2にTask 4.3追加 |

### Details

#### design.md

**Issue(s) Addressed**: C-01, C-02, W-01, W-02

**Changes**:
- Requirements Traceability Criterion 2.2にAgentInputPanelのTask 4.3を追加し、agents全走査の導出ロジックを含む旨を注記
- Components and InterfacesのAgentInputPanelのReq Coverageを`2.1`→`2.1, 2.2`に更新
- コンポーネントSummaryセクションにAgentInputPanelのagents全走査パターンのSSOT移行方針を追記（`useSharedAgentStore`セレクタ内で同じ走査パターンを使用）
- Wiring Pointsの`specStoreFacade.ts`を更新: `useAgentStore`使用箇所を3箇所（getState, subscribe, clearError）として正確に記載
- Interface ChangesのspecStoreFacade行を修正: getState() 1箇所 + subscribe() 1箇所 + clearError()アクション（維持）

**Diff Summary**:
```diff
- | 2.2 | agentsのSSOT直接読み取り | ... | `useSharedAgentStore(s => s.agents)` |
+ | 2.2 | agentsのSSOT直接読み取り | ... | `useSharedAgentStore(s => s.agents)`。AgentInputPanelはagents全走査による導出ロジックを含む（Task 4.3） |

- | AgentInputPanel | renderer/components | Agent入力 | 2.1 | ...
+ | AgentInputPanel | renderer/components | Agent入力 | 2.1, 2.2 | ...

- | `specStoreFacade.ts` | `useAgentStore.getState()`（2箇所） | SSOT読み取りに変更 |
+ | `specStoreFacade.ts` | `useAgentStore.getState()`（1箇所）+ `useAgentStore.subscribe()`（1箇所）+ `clearError()`アクション（1箇所、維持） | getState()とsubscribe()をSSOT読み取りに変更。clearError()はアクション呼び出しのため維持 |

- | `src/renderer/stores/spec/specStoreFacade.ts` | `useAgentStore`からの状態読み取りがある場合、SSOT読み取りに変更 |
+ | `src/renderer/stores/spec/specStoreFacade.ts` | `useAgentStore`からの状態読み取り・subscribe（3箇所）をSSOT読み取りに変更: (1) L80 getState()→SSOT、(2) L162 subscribe()→SSOT、(3) L468 clearError()維持 |
```

#### tasks.md

**Issue(s) Addressed**: C-01, C-02, W-02, W-03

**Changes**:
- Task 4.3: `selectedAgentId`の移行に加え、`agents`全走査によるagent導出ロジックのSSOT移行を追記。Requirements を`2.1`→`2.1, 2.2`に更新
- Task 5.1: タイトルを「状態読み取りをSSOT読み取りに変更」→「状態読み取り・subscribeをSSOTに変更」に更新。L162の`useAgentStore.subscribe()`→`useSharedAgentStore.subscribe()`変更を追記
- Task 4.5: SpecList.tsxでの`useRunningAgentCount`フック呼び出しとSpecListContainerへのprops渡しの方針を明記（SpecListContainer自体は変更不要）
- Requirements Coverage Matrix: Criterion 2.2の対象タスクに`4.3`を追加

**Diff Summary**:
```diff
  Task 4.3:
- - `selectedAgentId`の読み取り元を`useSharedAgentStore`に変更
- - _Requirements: 2.1_
+ - `selectedAgentId`の読み取り元を`useSharedAgentStore`に変更
+ - `agents`全走査によるagent導出ロジック（L21-28）の読み取り元を`useSharedAgentStore`に変更
+ - _Requirements: 2.1, 2.2_

  Task 5.1:
- - `specStoreFacade.ts`の`useAgentStore.getState()`による状態読み取り（2箇所）を変更
+ - L80 `useAgentStore.getState()`→`useSharedAgentStore.getState()`
+ - L162 `useAgentStore.subscribe()`→`useSharedAgentStore.subscribe()`

  Requirements Coverage Matrix:
- | 2.2 | agentsのSSOT直接読み取り | 4.1, 4.2, 4.4, 5.1 | Feature |
+ | 2.2 | agentsのSSOT直接読み取り | 4.1, 4.2, 4.3, 4.4, 5.1 | Feature |
```

---

_Fixes applied by document-review-reply command._
