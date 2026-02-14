# Response to Document Review #1

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Reply Date**: 2026-02-13

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 3      | 1            | 2             | 0                |

---

## Response to Critical Issues

### C-001: コールバック安定化対象の漏れ（design.md + tasks.md）

**Issue**: design.mdの「インラインコールバック安定化対象」セクション（365-368行）に`AgentList.tsx`が記載されていない（tasks.mdにはTask 5.4として存在するが、design.mdとの不一致）。`ScheduleTaskSettingView.tsx`のScheduleTaskListサブコンポーネントがdesign.mdにもtasks.mdにも安定化対象として記載されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

ソースコード調査により、以下を確認：

1. **AgentList.tsx**: 3つのインラインコールバックを確認
   ```tsx
   // electron-sdd-manager/src/shared/components/agent/AgentList.tsx:136-145
   <AgentListItem
     onSelect={() => onSelect(agent.agentId)}     // インライン
     onStop={(e) => onStop(e, agent.agentId)}     // インライン
     onRemove={(e) => onRemove(e, agent.agentId)} // インライン
   />
   ```
   tasks.mdにはTask 5.4として存在するが、design.mdの安定化対象リスト（365-368行）に記載がない → **design.mdへの追加が必要**

2. **ScheduleTaskSettingView.tsx内のScheduleTaskListサブコンポーネント**: 1つのインラインコールバックを確認
   ```tsx
   // ScheduleTaskSettingView.tsx ScheduleTaskList内
   <ScheduleTaskListItem
     onClick={() => onTaskClick(task)}  // インライン
     onToggleEnabled={onToggleEnabled}  // 安定参照（問題なし）
     onDelete={onDelete}                // 安定参照（問題なし）
     onExecuteImmediately={onExecuteImmediately}  // 安定参照（問題なし）
   />
   ```
   `onClick`のみインラインコールバック。design.mdにもtasks.mdにも記載なし → **両方への追加が必要**

**Action Items**:

- design.md 365-368行の「インラインコールバック安定化対象」に以下を追加:
  - `src/shared/components/agent/AgentList.tsx`（AgentListItemへのonSelect, onStop, onRemove）
  - `src/shared/components/schedule/ScheduleTaskSettingView.tsx`内ScheduleTaskList（ScheduleTaskListItemへのonClick）
- tasks.mdにScheduleTaskListのコールバック安定化タスクを追加（Task 5.4を拡張、またはTask 5.5として追加）

---

### C-002: セレクター適用対象ファイルの漏れ（design.md）

**Issue**: `RemoteAccessDialog.tsx`と`DocsTreeSection.tsx`がdesign.mdの変更対象ファイル一覧に含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

ソースコード調査により、以下を確認：

1. **RemoteAccessDialog.tsx**: ストアをセレクターなしで分割代入
   ```tsx
   // src/renderer/components/RemoteAccessDialog.tsx:62
   const { showInstallCloudflaredDialog, dismissInstallDialog } = useRemoteAccessStore();
   ```
   → セレクター適用が必要。ただし両方ともstateフィールドとアクションの混在のため、フィールド特定が必要

2. **DocsTreeSection.tsx**: ストアをセレクターなしで分割代入
   ```tsx
   // src/shared/components/project/DocsTreeSection.tsx:122 (DirectoryNode内)
   const { isExpanded, toggleDir } = useDocsTreeExpandedStore();
   ```
   → セレクター適用が必要（isExpanded: state, toggleDir: action）

**Action Items**:

- design.mdの「セレクター適用対象（Renderer）」に`RemoteAccessDialog.tsx` - useRemoteAccessStoreを追加
- design.mdの「セレクター適用対象（Shared）」に`DocsTreeSection.tsx` - useDocsTreeExpandedStoreを追加
- tasks.mdに対応するセレクター適用タスクを追加（Task 2.4またはTask 4に統合）

---

## Response to Warnings

### W-001: DD-005のコールバックパターン未確定

**Issue**: `onSelect: (id: string) => void`パターンへの変更か`onSelect: () => void`維持かが未確定。実装時に判断するとされているが、propsインターフェースの変更有無はdesignフェーズで確定すべき。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

ソースコード調査により、現状のBugListItemのpropsインターフェースを確認：
```tsx
// BugListItem.tsx:19-30
export interface BugListItemProps {
  onSelect: () => void;  // パラメータなし
}
```

DD-005の記述を再確認すると：
> BugListItemは既に`onSelect: () => void`のシグネチャを持つ。現行のBugListContainerが各アイテムに`onSelectBug={() => handleSelect(bug)}`を渡しているため、Container側でuseCallbackまたはアイテム内部でのid呼び出しパターンに変更する

この記述は「2つの選択肢がある」という**トレードオフの文書化**であり、曖昧性ではない。実際の実装は`onSelect: () => void`を維持し、親側の`useCallback`で安定化する方がprops変更なしで済む。DD-005のConsequencesセクションにも「`onSelect: () => void`のままであれば、親側のコールバック安定化のみで対応可能」と明記されている。

design.mdの目的は選択肢と判断基準の記録であり、実装時の柔軟性を許容する設計判断は妥当。ただし推奨パターン（既存propsを維持＋親側useCallback）は明確に読み取れる。

---

### W-002: ScheduleTaskSettingViewのストア使用状況の曖昧性

**Issue**: tRPCベースのAPIヘルパー使用のため、`useScheduleTaskStore`のセレクター適用が本当に必要かが不明確。

**Judgment**: **Fix Required** ✅

**Evidence**:

ソースコード調査により、`ScheduleTaskSettingView.tsx`が`useScheduleTaskStore`を直接分割代入で使用していることを確認：
```tsx
// ScheduleTaskSettingView.tsx:323-337
const {
  tasks,
  editingTask,
  isCreatingNew,
  isLoading,
  startEditing,
  startNewTask,
  cancelEditing,
  loadTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskEnabled,
  executeImmediately,
} = useScheduleTaskStore();
```

14フィールドをセレクターなしで全購読しており、セレクター適用が**明確に必要**。tRPCベースの`getScheduleTaskAPI()`は別の用途（API操作オブジェクトの生成）であり、ストア購読パターンとは独立。

レビューの指摘（曖昧性がある）自体は妥当。design.mdの記述を「useScheduleTaskStoreを直接購読（14フィールド）、セレクター適用必須」と明確化すべき。

**Action Items**:

- design.md 356行のScheduleTaskSettingViewの記述にストア使用パターンの詳細を補記

---

### W-003: セレクターパターン基準のsteering文書への未反映

**Issue**: 3+フィールド: useShallow、1-2フィールド: 個別セレクターの使用基準が確立されるが、steering文書への反映計画がない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

W-003は実装完了後のsteering同期に関する指摘であり、specドキュメント自体の問題ではない。steering文書の更新は実装完了後に`/kiro:steering`で対応すべき事項であり、spec文書に反映計画を記載する必要はない。

CLAUDE.mdの「Keep steering current and verify alignment with `/kiro:spec-status`」ルールに従い、実装完了後のsteeringSync時に対応する。本specの修正対象外。

---

### W-004: requirements.md Req 1.3のリスト正確性

**Issue**: `useSharedAgentStore (shared): BugList, BugsView, SpecsView 等（agents Map購読は既にセレクター使用のため対象外）`の記述で、意図が不明確。

**Judgment**: **Fix Required** ✅

**Evidence**:

ソースコード調査により確認：
- **SpecsView.tsx**: `useSharedAgentStore((state) => state.agents)` → **既にセレクター使用済み**
- **BugsView.tsx**: `useSharedBugStore`のみ使用。`useSharedAgentStore`は使用していない
- **BugList.tsx**: `useSharedAgentStore((state) => state.agents)` → **既にセレクター使用済み**

Req 1.3のリストは「useSharedBugStore全購読箇所の修正」であるが、5行目に`useSharedAgentStore`に関する記述が混在しており、読者に混乱を与えている。`useSharedAgentStore`は既にセレクターを使用しているため「対象外」と括弧書きされているが、Req 1.3のコンテキスト（useSharedBugStore）と無関係な情報が混在している。

**Action Items**:

- requirements.md 55行目を明確化：`useSharedAgentStore`の記述をReq 1.3から分離するか、別のReqへ移動。または「既にセレクター使用済みのため修正不要」であることをより明確に記述

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-001 | EventLogListItemのmemo化効果の限定性 | No Fix Needed ❌ | ソースコード確認済み。EventLogListItemはコールバックpropsなし（event, classNameのみ）。memo化は統一方針として妥当。eventオブジェクトの参照安定性はZustandのimmutable updateで担保される |
| S-002 | requirements.mdタイポ修正 `App.txs` → `App.tsx` | Fix Required ✅ | 明らかなタイポ。修正する |
| S-003 | E2Eテストのリグレッション検証タイミング | No Fix Needed ❌ | tasks.md 6.4「ビルド成功を確認する」の後、verification-commandsでE2E実行が対応可能。タスク追加は不要 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `requirements.md` | 83行: `App.txs` → `App.tsx` タイポ修正。55行: Req 1.3のuseSharedAgentStore記述を明確化 |
| `design.md` | 365-368行: コールバック安定化対象にAgentList.tsx、ScheduleTaskSettingView.tsx(ScheduleTaskList)を追加。323-348行: RemoteAccessDialog.tsx、DocsTreeSection.tsxをセレクター適用対象に追加。356行: ScheduleTaskSettingViewのストア使用パターンを明確化 |
| `tasks.md` | ScheduleTaskList(ScheduleTaskSettingView内)のコールバック安定化タスクを追加。RemoteAccessDialog.tsx、DocsTreeSection.tsxのセレクター適用タスクを追加 |

---

## Conclusion

Critical Issue 2件、Warning 2件、Info 1件の計5件が修正必要と判断された。主な修正内容：

1. **design.mdの網羅性向上**: コールバック安定化対象（AgentList, ScheduleTaskList）とセレクター適用対象（RemoteAccessDialog, DocsTreeSection）の追加
2. **tasks.mdの補完**: 対応するタスクの追加
3. **requirements.mdの明確化**: タイポ修正とReq 1.3のストアリスト記述の改善

W-001（DD-005のコールバックパターン）とW-003（steering未反映）は、現状の記述が妥当であり修正不要と判断した。

---

## Applied Fixes

**Applied Date**: 2026-02-13
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `requirements.md` | タイポ修正（App.txs → App.tsx）、Req 1.3のuseSharedAgentStore記述を明確化 |
| `design.md` | セレクター適用対象にRemoteAccessDialog, DocsTreeSectionを追加。コールバック安定化対象にAgentList, ScheduleTaskListを追加。ScheduleTaskSettingViewのストア使用パターンを明確化。Requirements Traceabilityを更新 |
| `tasks.md` | Task 2.4にRemoteAccessDialog追加。Task 4.2（DocsTreeSection）追加。Task 5.5（ScheduleTaskListコールバック安定化）追加。Requirements Coverage Matrix更新 |

### Details

#### requirements.md

**Issue(s) Addressed**: S-002, W-004

**Changes**:
- 83行: `App.txs` → `App.tsx` タイポ修正
- 55行: `useSharedAgentStore`の記述を「既にセレクターパターン使用済みのため本spec修正対象外」と明確化

**Diff Summary**:
```diff
- ### Requirement 3: App.txsルートコンポーネントの最適化
+ ### Requirement 3: App.tsxルートコンポーネントの最適化
```

```diff
-    - `useSharedAgentStore` (shared): BugList, BugsView, SpecsView 等（agents Map購読は既にセレクター使用のため対象外）
+    - `useSharedAgentStore` (shared): BugList, SpecsView 等で使用されるが、既に`(state) => state.agents`セレクターパターンを使用済みのため本spec修正対象外
```

#### design.md

**Issue(s) Addressed**: C-001, C-002, W-002

**Changes**:
- セレクター適用対象（Renderer）に`RemoteAccessDialog.tsx` - useRemoteAccessStoreを追加
- セレクター適用対象（Shared）に`DocsTreeSection.tsx` - useDocsTreeExpandedStoreを追加
- ScheduleTaskSettingViewの記述に「14フィールドを全購読、tRPCヘルパーとは別にストアを直接購読」を補記
- インラインコールバック安定化対象に`AgentList.tsx`と`ScheduleTaskSettingView.tsx内ScheduleTaskList`を追加
- Requirements Traceability表の1.1にRemoteAccessDialog, DocsTreeSectionを追加、2.2にAgentList, ScheduleTaskListを追加

**Diff Summary**:
```diff
 **インラインコールバック安定化対象（ListItemの親コンテナ）**:
 - `src/shared/components/bug/BugListContainer.tsx`（BugListItemへのonSelect）
 - `src/shared/components/spec/SpecListContainer.tsx`（SpecListItemへのonSelect）
-- 各リストコンテナのコールバック安定化
+- `src/shared/components/agent/AgentList.tsx`（AgentListItemへのonSelect, onStop, onRemove）
+- `src/shared/components/schedule/ScheduleTaskSettingView.tsx`内ScheduleTaskList（ScheduleTaskListItemへのonClick）
```

#### tasks.md

**Issue(s) Addressed**: C-001, C-002

**Changes**:
- Task 2.4にRemoteAccessDialogのuseRemoteAccessStoreセレクター適用を追加
- Task 4.2（新規）: DocsTreeSectionのuseDocsTreeExpandedStoreセレクター適用を追加
- Task 5.5（新規）: ScheduleTaskList（ScheduleTaskSettingView内）のインラインコールバック安定化を追加
- Requirements Coverage Matrix: 1.1に4.2を追加、2.2に5.5を追加

---

_Fixes applied by document-review-reply command._
