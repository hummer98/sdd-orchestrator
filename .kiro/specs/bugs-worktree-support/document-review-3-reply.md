# Response to Document Review #3

**Feature**: bugs-worktree-support
**Review Date**: 2026-01-14
**Reply Date**: 2026-01-14

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 1      | 1            | 0             | 0                |
| Info     | 2      | 1            | 1             | 0                |

---

## Response to Warnings

### W1: BUG_PHASE_COMMANDS定数の更新またはDeploy動作分岐方針の明確化

**Issue**: Task 12.3「Deployボタンの条件分岐」でworktree有無による動作切り替えを実装するが、既存のBUG_PHASE_COMMANDS定数（`deploy: '/commit'`）との関係が不明確

**Judgment**: **Fix Required** ✅

**Evidence**:
既存コード `bug.ts:191-197` を確認:
```typescript
export const BUG_PHASE_COMMANDS: Record<BugWorkflowPhase, string | null> = {
  report: null,
  analyze: '/kiro:bug-analyze',
  fix: '/kiro:bug-fix',
  verify: '/kiro:bug-verify',
  deploy: '/commit',
};
```

定数として`deploy: '/commit'`が固定されており、Task 12.3の説明「bug.jsonのworktreeフィールド有無で判定」だけでは、この定数を変更するのか、呼び出し箇所で動的判定するのか不明確。実装時の混乱を防ぐため、具体的な方針を追記すべき。

**Action Items**:
- Task 12.3の説明に「BUG_PHASE_COMMANDS定数は変更せず、BugWorkflowViewのDeploy実行時にbug.jsonのworktreeフィールドを確認して動的にコマンドを切り替える」旨を追記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | bugStore.useWorktreeのスコープ不明確 | Fix Required ✅ | グローバルに1つ保持する設計意図を明確化することで、実装時の誤解を防止できる |
| I2 | BUG_PHASE_COMMANDSへのコメント追加 | No Fix Needed ❌ | これは実装時の対応事項であり、仕様書ではなくコード内コメントとして対応すべき |

### I1: bugStore.useWorktreeのスコープ明確化

**Issue**: 「オンメモリ保持」と記載があるが、バグごとに保持するのかグローバルに1つ保持するのかが不明確

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md「CreateBugDialog拡張」セクションでは「bugStoreのuseWorktreeフラグで管理（オンメモリ）」と記載されているが、スコープは明示されていない。ただし、CreateBugDialogとBugWorkflowViewの両方で同じbugStoreを参照する設計から「グローバルに1つ保持」が意図されていることは推測可能。明示することで実装者の理解を助ける。

**Action Items**:
- design.md「bugStore拡張（UI状態管理）」セクションにスコープの説明を追記
- 具体的には「useWorktreeはグローバルに1つ保持し、CreateBugDialog/BugWorkflowViewで共有する」旨を明記

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| tasks.md | Task 12.3にDeploy動作分岐の具体的な実装方針を追記 |
| design.md | bugStore拡張セクションにuseWorktreeスコープの明記を追加 |

---

## Conclusion

Review #3で指摘された3件のうち、Warning 1件とInfo 1件について修正を行う。Info 1件（I2: BUG_PHASE_COMMANDSへのコメント追加）は実装時の対応事項のため、仕様書としてはNo Fix Needed。

修正内容は軽微であり、実装方針の明確化に留まる。修正適用後、再レビューを実施して変更を検証する。

---

## Applied Fixes

**Applied Date**: 2026-01-14
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 12.3にDeploy動作分岐の具体的な実装方針を追記 |
| design.md | CreateBugDialog拡張セクションにuseWorktreeスコープの説明を追加 |

### Details

#### tasks.md

**Issue(s) Addressed**: W1

**Changes**:
- Task 12.3の説明にBUG_PHASE_COMMANDS定数との関係性を明記
- 「定数は変更せず、BugWorkflowViewで動的に切り替える」方針を追記

**Diff Summary**:
```diff
- [ ] 12.3 Deployボタンの条件分岐を実装する
-   - bug.jsonのworktreeフィールド有無で判定
-   - worktreeあり: `/kiro:bug-merge {bug-name}` 実行
-   - worktreeなし: `/commit {bug-name}` 実行
+- [ ] 12.3 Deployボタンの条件分岐を実装する
+  - BUG_PHASE_COMMANDS定数は変更せず、BugWorkflowViewのDeploy実行時に動的にコマンドを切り替える
+  - bug.jsonのworktreeフィールド有無で判定
+  - worktreeあり: `/kiro:bug-merge {bug-name}` 実行
+  - worktreeなし: `/commit {bug-name}` 実行（BUG_PHASE_COMMANDSのデフォルト値）
```

#### design.md

**Issue(s) Addressed**: I1

**Changes**:
- CreateBugDialog拡張セクションの「Implementation Notes」にスコープの説明を追加
- useWorktreeがグローバルに1つ保持される設計であることを明記

**Diff Summary**:
```diff
 **Implementation Notes**
 - チェックボックス配置: 説明フィールドの下、アクションボタンの上
 - ラベル: 「Worktreeを使用」
 - 初期値: projectStore経由でconfigStoreのデフォルト値を取得
 - 値保持: bugStoreのuseWorktreeフラグで管理（オンメモリ）
+- **スコープ**: useWorktreeはグローバルに1つ保持し、CreateBugDialog/BugWorkflowViewで共有する（バグごとではない）
```

---

_Fixes applied by document-review-reply command._
