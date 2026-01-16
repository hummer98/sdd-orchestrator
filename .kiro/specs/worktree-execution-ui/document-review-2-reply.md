# Response to Document Review #2

**Feature**: worktree-execution-ui
**Review Date**: 2026-01-17
**Reply Date**: 2026-01-17

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 1            | 0             | 1                |
| Info     | 2      | 1            | 1             | 0                |

---

## Response to Warnings

### W-NEW-1: Requirements 4.1「両方のチェックボックス」の曖昧さ

**Issue**: Requirements 4.1で「実装フロー枠内のチェックボックスと自動実行ボタン横のチェックボックスが連動すること」と記載されているが、「自動実行ボタン横のチェックボックス」の実体が不明確。BugWorkflowViewには存在するが、Spec側WorkflowViewへの追加は本仕様の範囲か。

**Judgment**: **Needs Discussion** ⚠️

**Evidence**:

1. **BugWorkflowViewには存在**:
   - `electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx`
   - `workflow-use-worktree-checkbox` (data-testid)

2. **レビュー#1での解釈**:
   レビュー#1-replyでW-1として指摘され「No Fix Needed」と判断。理由は「ImplFlowFrame内のチェックボックスが実質的に自動実行ボタンの近くに配置される」と解釈。

3. **Design DD-006の記載**:
   > workflowStoreに単一のisWorktreeModeSelected状態を持ち、両方のチェックボックスがこれを参照・更新する

   この「両方」が何を指すかが曖昧:
   - 解釈A: ImplFlowFrame内のチェックボックスのみで、「両方」は不要な記載
   - 解釈B: WorkflowViewヘッダー等にも別途チェックボックスを追加し連動させる

4. **本仕様のスコープ確認**:
   本仕様のObjective（requirements.md Introduction）:
   > specワークフローにおけるworktree実行のOn/Offインターフェースを改善する

   ImplFlowFrameヘッダー内に1つのチェックボックスを配置し、それで状態管理を行う設計は明確。「両方のチェックボックス」は誤解を招く表現。

**推奨**:
Requirements 4.1を「ImplFlowFrameヘッダー内のチェックボックスでworktreeモードの状態を管理する」に修正し、曖昧さを解消する。ただし、これは設計意図の確認が必要なため「Needs Discussion」とする。

**暫定対応案**（--autofixで適用可能な範囲）:
Design DD-006に「本仕様ではImplFlowFrameヘッダー内にチェックボックスを1つ配置する。Requirements 4.1の『両方のチェックボックス』は、将来的に自動実行ボタン横にも配置する可能性を想定した記載だが、本仕様のスコープではImplFlowFrame内のチェックボックスのみを実装する」と明記する。

---

### W-NEW-2: Task依存関係の明示不足

**Issue**: tasks.mdでは各Taskの前提条件・依存関係が明示されていない。並列実装やレビュー時に混乱を招く可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:

tasks.mdを確認したところ、タスク間の依存関係は以下の通り推測される:

| Task | 依存するTask | 理由 |
|------|-------------|------|
| 5.2 (WorkflowView通常モード処理) | 5.1 (IPC handler) | IPCハンドラが必要 |
| 6.1 (WorkflowView統合) | 3.1, 4.1, 4.2, 4.3 | コンポーネントが必要 |
| 6.2 (実行処理分岐) | 5.1 | IPCハンドラが必要 |

これらは明記されていないが、タスク番号順に実装すれば自然に依存関係が満たされる設計になっている。しかし、明示的に記載することで実装者の混乱を防げる。

**Action Items**:
- tasks.mdの各Taskに`Depends on:`行を追加
- または冒頭に簡易的な依存関係の説明を追加

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-NEW-1 | workflowStore初期化タイミング | No Fix Needed | Design Task 2.1に「既存worktree存在時の初期値設定ロジック追加」と記載されており、実装時に`isActualWorktreeMode()`で判定すれば良い。追加の明記は過剰 |
| I-NEW-2 | 「リセット可能」の定義 | Fix Required | Requirements 5.3の「リセット可能」は曖昧。「変更可能になること」に修正すべき |

### I-NEW-2: 「リセット可能」の定義

**Issue**: Requirements 5.3で「deploy完了後にチェックボックスがリセット可能になること」と記載。「リセット可能」の意味が不明確。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design DD-005から推測すると、「リセット可能」は以下の意味:
1. deploy完了 → worktreeフィールド削除
2. worktreeフィールドなし → isImplStarted: false
3. isImplStarted: false → チェックボックスがdisabledでなくなる

つまり「リセット可能」= 「変更可能になる」という意味。Requirements 5.3を明確化すべき。

**Action Items**:
- requirements.md 5.3を「deploy完了後にチェックボックスが変更可能になること」に修正

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | DD-006に「本仕様ではImplFlowFrame内のチェックボックスのみ実装」を明記 |
| tasks.md | 各Taskに`Depends on:`行を追加 |
| requirements.md | 5.3を「変更可能になること」に修正 |

---

## Conclusion

2件のWarningと2件のInfoを評価し、以下の判断を行った:

**Fix Required (2件)**:
1. **W-NEW-2**: tasks.mdにTask依存関係を明記
2. **I-NEW-2**: requirements.md 5.3の「リセット可能」を「変更可能になること」に明確化

**Needs Discussion (1件)**:
1. **W-NEW-1**: Requirements 4.1の「両方のチェックボックス」の解釈。暫定対応としてDesign DD-006に注記を追加するが、設計意図の確認が望ましい

**No Fix Needed (1件)**:
1. **I-NEW-1**: workflowStore初期化タイミングは実装時に対応可能

修正適用後、再レビューで確認が必要。

---

## Applied Fixes

**Applied Date**: 2026-01-17
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | 5.3「リセット可能」を「変更可能」に修正 |
| design.md | DD-006にScope Clarification（チェックボックス実装範囲の明記）を追加 |
| tasks.md | Task Dependencies Overviewセクションを追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: I-NEW-2

**Changes**:
- Requirement 5.3の「リセット可能」を「変更可能」に修正

**Diff Summary**:
```diff
-3. deploy完了後（`spec.json.phase` が `deploy-complete`）にチェックボックスがリセット可能になること
+3. deploy完了後（`spec.json.phase` が `deploy-complete`）にチェックボックスが変更可能になること
```

#### design.md

**Issue(s) Addressed**: W-NEW-1（暫定対応）

**Changes**:
- DD-006テーブルにScope Clarification行を追加
- 本仕様ではImplFlowFrame内のチェックボックスのみを実装することを明記

**Diff Summary**:
```diff
 | Consequences | workflowStoreにisWorktreeModeSelectedとsetWorktreeModeSelectedを追加 |
+| **Scope Clarification** | **本仕様ではImplFlowFrameヘッダー内にチェックボックスを1つ配置する。Requirements 4.1の「両方のチェックボックス」は将来的な拡張可能性を想定した記載であり、本仕様のスコープではImplFlowFrame内のチェックボックスのみを実装する。** |
```

#### tasks.md

**Issue(s) Addressed**: W-NEW-2

**Changes**:
- Implementation Plan冒頭に「Task Dependencies Overview」セクションを追加
- タスク間の依存関係をASCII図と説明で明記

**Diff Summary**:
```diff
 # Implementation Plan
+
+## Task Dependencies Overview
+
+以下のタスク依存関係に従って実装を進める:
+
+```
+Task 1.1 → Task 2.1 → Task 3.1 → Task 4.1/4.2/4.3
+                  ↓
+            Task 5.1 → Task 5.2
+                  ↓
+            Task 6.1 → Task 6.2
+                  ↓
+            Task 7.1 → Task 7.2
+                  ↓
+            Task 8.1/8.2 → Task 9.1/9.2
+```
+
+- **Task 1**: 基盤となる型定義とユーティリティ関数（他タスクの前提）
+- **Task 2-4**: UI関連タスク（Task 1完了後に並列実行可能）
+- **Task 5-6**: IPC・統合タスク（Task 1, 2完了後）
+- **Task 7-8**: deploy処理・表示条件（Task 1完了後）
+- **Task 9**: 統合テスト（全実装完了後）
+
+---
```

---

_Fixes applied by document-review-reply command._
