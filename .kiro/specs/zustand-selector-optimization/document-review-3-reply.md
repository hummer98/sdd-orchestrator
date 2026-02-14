# Response to Document Review #3

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Reply Date**: 2026-02-13

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 2      | 1            | 1             | 0                |
| Info     | 1      | 0            | 1             | 0                |

---

## Response to Critical Issues

### C-004: useSharedGitViewStoreの全購読コンポーネント3件が完全欠落

**Issue**: `src/shared/components/git/`配下の3つのコンポーネント（GitDiffViewer.tsx, GitView.tsx, GitFileTree.tsx）が`useSharedGitViewStore()`をセレクターなしで全購読しているが、design.mdの変更対象ファイル一覧にもtasks.mdにも記載されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード実態を確認した結果、レビュー指摘は正確である。

- `GitDiffViewer.tsx:44` - `useSharedGitViewStore()` で6フィールド取得（selectedFilePath, cachedDiffContent, isLoading, error, diffMode: state + setDiffMode: action）
- `GitView.tsx:73` - `useSharedGitViewStore()` で11フィールド取得（isLoading, error, cachedStatus, fileTreeWidth, diffMode, selectedFilePath, cachedFileContent: state + setFileTreeWidth, refreshStatus, clearError, setDiffMode: action）
- `GitFileTree.tsx:542` - `useSharedGitViewStore()` で5フィールド取得（cachedStatus, selectedFilePath, expandedDirs: state + selectFile, toggleDir: action）

`useSharedGitViewStore`は`src/shared/stores/gitViewStore.ts`に定義されたドメインステートストア（shared/stores）であり、Req 1.1「セレクターなしの全購読パターンが解消されること」の対象に含まれる。3ファイルすべてでstateフィールドを含む全購読パターンが使用されており、セレクター化が必要。

**Action Items**:

- design.mdの「セレクター適用対象（Shared）」セクションにGitDiffViewer.tsx, GitView.tsx, GitFileTree.tsxとuseSharedGitViewStore全購読を追加
- tasks.mdのTask 4にGitView関連3ファイルのセレクター適用タスクを追加（Task 4.3）
- requirements.md Req 1.1 AC3のストアリストに`gitViewStore`を明示的に追加（S-006も同時解消）

---

## Response to Warnings

### W-008: BugsView.tsx（Remote UI）のrequirements.md Req 1.3リスト漏れ

**Issue**: BugsView.txはdesign.mdとtasks.mdに記載済みだが、requirements.md Req 1.3 Acceptance Criterion 3のコンポーネントリストに`BugsView`が明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
`BugsView.tsx:61`で`useSharedBugStore()`をセレクターなしで全購読していることを確認済み。design.md 354行（Remote UIセクション）およびtasks.md Task 3.2にBugsViewは記載されており、実装上の影響はない。しかし、requirements.md Req 1.3 AC3のコンポーネントリストにBugsViewが欠落しているのはトレーサビリティの不完全さであり、修正すべき。

**Action Items**:

- requirements.md Req 1.3 Acceptance Criterion 3のuseSharedBugStoreコンポーネントリストに`BugsView`を追加

### W-009: EventLogListItemの親コンテナのインラインコールバック未確認

**Issue**: EventLogListItemの親コンテナ（EventLogViewerModal.tsx）がdesign.mdのインラインコールバック安定化対象に含まれていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
`EventLogViewerModal.tsx:150-153`を確認した結果、EventLogListItemへのprops渡しは以下のみ:

```tsx
<EventLogListItem
  key={`${event.timestamp}-${index}`}
  event={event}
/>
```

EventLogListItemのpropsインターフェース（`EventLogListItemProps`）は`event: EventLogEntry`と`className?: string`のみであり、**コールバック関数は一切受け取っていない**。したがって、インラインコールバック排除の対象にはならず、React.memoの効果を阻害する要因はない。design.mdのインラインコールバック安定化対象4コンテナのリストは正確である。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-006 | Req 1.1 AC3の「等」の明確化 | No Fix Needed | C-004の修正時にgitViewStoreをReq 1.1 AC3のストアリストに明示追加するため、自然に解消される |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `requirements.md` | Req 1.1 AC3にgitViewStoreを追加、Req 1.3 AC3にBugsViewを追加 |
| `design.md` | Sharedセクションに GitDiffViewer.tsx, GitView.tsx, GitFileTree.tsx + useSharedGitViewStore を追加 |
| `tasks.md` | Task 4.3としてGitView関連3ファイルのセレクター適用タスクを追加 |

---

## Conclusion

4件のレビューイシューのうち、2件（C-004, W-008）が修正必要と判定された。W-009はソースコード確認によりEventLogListItemにコールバックpropsが存在しないことが判明し、修正不要と判定。S-006はC-004の修正で自然に解消される。

修正はdesign.md, tasks.md, requirements.mdの3ドキュメントへの追記が必要。

---

## Applied Fixes

**Applied Date**: 2026-02-13
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `requirements.md` | Req 1.1 AC3にgitViewStoreを追加、Req 1.3 AC3にBugsViewを追加 |
| `design.md` | Sharedセクションに GitView.tsx, GitDiffViewer.tsx, GitFileTree.tsx + useSharedGitViewStore を追加 |
| `tasks.md` | Task 4.3としてGitView関連3ファイルのセレクター適用タスクを追加、Requirements Coverage MatrixのCriterion 1.1にTask 4.3を追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: C-004 (gitViewStore追加), W-008 (BugsView追加)

**Changes**:
- Req 1.1 AC3のストアリストに`gitViewStore`を明示追加
- Req 1.3 AC3のuseSharedBugStoreコンポーネントリストに`BugsView`を追加

**Diff Summary**:
```diff
-    - その他関連ストア: notificationStore, executionStore, scheduleTaskStore 等
+    - その他関連ストア: notificationStore, executionStore, scheduleTaskStore, gitViewStore 等
```

```diff
-    - `useSharedBugStore`: BugList, BugPane, BugWorkflowView, App.tsx 等
+    - `useSharedBugStore`: BugList, BugPane, BugWorkflowView, App.tsx, BugsView 等
```

#### design.md

**Issue(s) Addressed**: C-004

**Changes**:
- 「セレクター適用対象（Shared）」セクションにGitView.tsx, GitDiffViewer.tsx, GitFileTree.tsxの3ファイルを追加
- 各ファイルの使用フィールド詳細（state/action分類）を記載

**Diff Summary**:
```diff
 **セレクター適用対象（Shared）**:
 - `src/shared/components/schedule/ScheduleTaskSettingView.tsx` - useScheduleTaskStore（14フィールドを全購読）
 - `src/shared/components/project/DocsTreeSection.tsx` - useDocsTreeExpandedStore（DirectoryNode内で使用）
+- `src/shared/components/git/GitView.tsx` - useSharedGitViewStore（11フィールド: state + action）
+- `src/shared/components/git/GitDiffViewer.tsx` - useSharedGitViewStore（6フィールド: state + action）
+- `src/shared/components/git/GitFileTree.tsx` - useSharedGitViewStore（5フィールド: state + action）
```

#### tasks.md

**Issue(s) Addressed**: C-004

**Changes**:
- Task 4.2の後にTask 4.3を追加（GitView, GitDiffViewer, GitFileTreeのセレクター適用）
- Requirements Coverage MatrixのCriterion 1.1のタスクリストにTask 4.3を追加

**Diff Summary**:
```diff
+- [ ] 4.3 (P) GitView, GitDiffViewer, GitFileTreeのセレクター適用
+  - GitView.tsxのuseSharedGitViewStore購読（11フィールド）をuseShallowセレクターに変更
+  - GitDiffViewer.tsxのuseSharedGitViewStore購読（6フィールド）をuseShallowセレクターに変更
+  - GitFileTree.tsxのuseSharedGitViewStore購読（5フィールド）をuseShallowセレクターに変更
+  - _Requirements: 1.1_
```

```diff
-| 1.1 | セレクターなし全購読の解消 | 1.1, 1.2, ..., 4.1, 4.2 | Feature |
+| 1.1 | セレクターなし全購読の解消 | 1.1, 1.2, ..., 4.1, 4.2, 4.3 | Feature |
```

---

_Fixes applied by document-review-reply command._
