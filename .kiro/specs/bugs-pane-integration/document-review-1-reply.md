# Response to Document Review #1

**Feature**: bugs-pane-integration
**Review Date**: 2025-12-25
**Reply Date**: 2025-12-25

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 0            | 1             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 3      | 2            | 1             | 0                |

---

## Response to Critical Issues

### C1: BugPhaseItemの再利用 vs 新規作成の矛盾

**Issue**: research.mdでは「共通のPhaseItemコンポーネントを再利用」、design.mdでは「既存PhaseItemのUIデザインを踏襲」、tasks.mdでは「コンポーネントを作成」と記載されており、矛盾している。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

既存の`PhaseItem`コンポーネント（`PhaseItem.tsx:37-64`）を確認した結果、Spec専用に設計されており、直接再利用は困難：

```typescript
// PhaseItem.tsx:37-64
export interface PhaseItemProps {
  phase: WorkflowPhase;  // 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy' ← Spec専用
  label: string;
  status: PhaseStatus;   // 'pending' | 'generated' | 'approved' ← approvedはBug非対応
  previousStatus: PhaseStatus | null;
  autoExecutionPermitted: boolean;  // ← Bug非対応
  isExecuting: boolean;
  canExecute: boolean;
  isAutoPhase?: boolean;
  onExecute: () => void;
  onApprove: () => void;              // ← Bug非対応
  onApproveAndExecute: () => void;    // ← Bug非対応
  onToggleAutoPermission: () => void; // ← Bug非対応
  onShowAgentLog?: () => void;
}
```

また、`PHASE_DESCRIPTIONS`（`PhaseItem.tsx:28-35`）もSpec専用の説明文である。

**結論**: 各ドキュメントは矛盾しておらず、以下の解釈で整合している：
- **research.md**: 「共通化が可能」という技術的可能性の記述。Risk軽減策として記載
- **design.md**: 「UIデザインを踏襲」は、視覚的スタイル（色、アイコン、間隔）を合わせるという意味
- **tasks.md**: 実際の実装方針として「BugPhaseItemを新規作成」

既存`PhaseItem`はSpec専用のProps・ロジックが多いため、共通化するとかえって複雑化する。現時点では新規作成が適切。将来的な共通化は実装後に再評価する方針は`research.md`に記載済み。

**Action Items**: なし（設計は整合している）

---

## Response to Warnings

### W1: AgentListPanelのContext切り替え

**Issue**: 現在のAgentListPanelがSpec/Bug両方のコンテキストを扱えるかの検証が不足している。

**Judgment**: **Fix Required** ✅

**Evidence**:

`AgentListPanel.tsx:69-91`を確認した結果：
```typescript
export function AgentListPanel() {
  const { selectedSpec } = useSpecStore();
  // ...
  const specName = selectedSpec?.name || '';
  const specAgents = getAgentsForSpec(specName)
  // ...
  if (!selectedSpec) {
    return null;  // ← selectedSpecがない場合は何も表示しない
  }
```

現在の実装は`selectedSpec`に完全依存しており、Bug対応には以下の拡張が必要：
1. `selectedBug`も参照するようにする
2. `getAgentsForSpec`の引数にbugIdを渡せるようにするか、別途`getAgentsForBug`を用意
3. Bugコンテキストでも動作するようにnull チェックを調整

**Action Items**:
- tasks.mdのTask 5.2に「AgentListPanelのBug対応拡張」を追加
- design.mdのAgentListPanel参照箇所に拡張方針を記載

---

### W2: E2Eテストカバレッジ

**Issue**: E2Eテストファイルの配置方針が不明確。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

既存ファイル`bug-workflow.e2e.spec.ts`が存在することを確認。tasks.md Task 6.2では：
> E2Eテストを追加する

と記載されており、「追加」という表現は既存ファイルへの追記を含む。具体的なファイル名の指定は不要であり、実装時に適切に判断すれば良い。

**Action Items**: なし

---

### W3: symbol-semantic-map.mdの更新

**Issue**: 新規コンポーネントがsymbol-semantic-map.mdに追加されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

指摘通り、新規コンポーネント（BugArtifactEditor, BugWorkflowView, BugPhaseItem）はsymbol-semantic-map.mdに追加が必要。ただし、これは実装完了後のドキュメント更新タスクとして扱うべき。

**Action Items**:
- tasks.mdに「Task 7: symbol-semantic-map.md更新」を追加

---

## Response to Info (Low Priority)

| #   | Issue                       | Judgment      | Reason                                                |
| --- | --------------------------- | ------------- | ----------------------------------------------------- |
| I1  | activeTab状態の管理場所     | Fix Required ✅ | DocsTabs内でローカル管理されており、App.tsxから参照できない。設計に方針を明記すべき |
| I2  | BugDocumentTab型定義の場所  | Fix Required ✅ | Task 1.1のスコープに含める必要がある |
| I3  | フェーズ間の依存関係        | No Fix Needed ❌ | Bugワークフローは順序依存なし（Req 4.1-4.5参照）。各フェーズは独立実行可能 |

### I1詳細: activeTab状態の管理場所

**Evidence**:
`DocsTabs.tsx:41`を確認：
```typescript
const [activeTab, setActiveTab] = useState<DocsTab>('specs');
```

ローカル状態で管理されており、App.tsxからは参照できない。設計で2つの選択肢が示されているが決定されていない。

**Action Items**:
- design.mdのApp拡張セクションに「DocsTabsからactiveTabをコールバックで通知」または「別途uiStoreで管理」の方針を明記

### I2詳細: BugDocumentTab型定義

**Evidence**:
design.md（行226-227）で`BugDocumentTab`型が定義されているが、Task 1.1のスコープには含まれていない。

**Action Items**:
- tasks.md Task 1.1のスコープを拡大し、`BugDocumentTab`型の定義も含める

---

## Files to Modify

| File           | Changes                                                       |
| -------------- | ------------------------------------------------------------- |
| design.md      | App拡張セクションにactiveTab管理方針を明記                    |
| tasks.md       | Task 1.1にBugDocumentTab型を追加、Task 5.2にAgentListPanel拡張を追加、Task 7としてsymbol-semantic-map更新を追加 |

---

## Conclusion

Critical Issue（C1）は実際にはドキュメント間の矛盾ではなく、記述の抽象度の違いであることを確認。設計は整合している。

Warning/Info指摘の一部は実際に対応が必要：
- AgentListPanelのBug対応（W1）
- symbol-semantic-map更新タスク追加（W3）
- activeTab管理方針の明確化（I1）
- BugDocumentTab型のスコープ追加（I2）

修正を適用するには `--fix` オプションで再実行してください。

---

## Applied Fixes

**Applied Date**: 2025-12-25
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | activeTab管理方針を明記（I1対応） |
| tasks.md | Task 1.1にBugDocumentTab型追加、Task 5.2にAgentListPanel拡張追加、Task 7追加（W1, W3, I2対応） |
| spec.json | documentReview.roundDetails[0].fixApplied = true |

### Details

#### design.md

**Issue(s) Addressed**: I1

**Changes**:
- App拡張セクションに「activeTab管理方針」を追記
- DocsTabs.onTabChangeコールバック方式を採用することを明記
- Implementation Notesも更新

**Diff Summary**:
```diff
- **Implementation Notes**
- - Integration: DocsTabs.activeTabをApp.tsxで参照するか、別途状態管理
+ **activeTab管理方針**
+ DocsTabsからactiveTabをコールバックで通知する方式を採用：
+ - DocsTabs: `onTabChange: (tab: 'specs' | 'bugs') => void` コールバックProps追加
+ - App.tsx: `activeDocsTab`をローカルstate（useState）で管理
+ - タブ変更時にコールバック経由でApp.tsxの状態を更新
+ - 理由: uiStoreを新設するほどの複雑さがなく、シンプルなコールバック方式で十分
+
+ **Implementation Notes**
+ - Integration: DocsTabs.onTabChangeコールバックでApp.tsxにタブ状態を通知
```

#### tasks.md

**Issue(s) Addressed**: W1, W3, I2

**Changes**:
- Task 1.1: BugDocumentTab型を追加
- Task 5.2: AgentListPanelのBug対応拡張の詳細を追記
- Task 7: symbol-semantic-map.md更新タスクを新規追加

**Diff Summary**:
```diff
- - [ ] 1.1 (P) BugWorkflowPhase型とBugPhaseStatus型を定義する
+ - [ ] 1.1 (P) BugWorkflowPhase型、BugPhaseStatus型、BugDocumentTab型を定義する
+   - BugDocumentTab型を`report`, `analysis`, `fix`, `verification`の4値で定義
+   - _Requirements: 2.2, 3.2_

- - [ ] 5.2 Bug選択時の右ペイン表示を実装する
-   - AgentListPanelは既存コンポーネントを再利用
+ - [ ] 5.2 Bug選択時の右ペイン表示を実装する
+   - AgentListPanelのBug対応拡張:
+     - selectedBugも参照するように拡張
+     - getAgentsForSpec関数をbugIdも受け付けるように拡張、または別途getAgentsForBugを用意
+     - Bugコンテキストでも動作するようにnullチェックを調整

+ - [ ] 7. ドキュメント更新
+ - [ ] 7.1 symbol-semantic-map.mdに新規コンポーネントを追加する
+   - BugArtifactEditor, BugWorkflowView, BugPhaseItem
```

---

_Fixes applied by document-review-reply command._
