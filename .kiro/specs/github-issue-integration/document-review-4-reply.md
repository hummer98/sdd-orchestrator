# Response to Document Review #4

**Feature**: github-issue-integration
**Review Date**: 2026-03-06
**Reply Date**: 2026-03-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 1      | 1            | 0             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W-01: Issue/PRのページネーション設計の不足

**Issue**: design.md `IssueStoreState` にページネーション関連のstate（`hasMore`, `currentPage`等）が含まれていない。Task 7.2に「もっと読み込む」ボタンの記述があるがdesign.mdには未反映。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `design.md` IssueStoreState（649-678行目）: `issues`, `pullRequests`, `filters`, `isLoading` 等は定義済みだが、ページネーション用の `hasMore`, `currentPage` が未定義
- `design.md` IssueFilters（464-471行目）: `page`, `per_page` パラメータは既に定義済み
- `tasks.md` Task 7.2: 「もっと読み込む」ボタンによるページネーション（per_page: 30、次ページ読み込み）」が記述済み
- tasks.mdにはUI側のページネーション動作が記述されているが、design.mdのStoreStateとコンポーネント説明に反映されていないギャップが存在

**Action Items**:

- `design.md` IssueStoreState に `hasMore: boolean` と `currentPage: number` を追加
- `design.md` IssueStoreState アクションに `loadMoreIssues` を追加
- `design.md` IssueListPanel のUI Components Summary に「もっと読み込む」ページネーション動作を記載
- `tasks.md` Task 6.1 にページネーション状態管理の記述を追加

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-01 | Slash Commandコメントフォーマット | No Fix Needed ❌ | 実装詳細レベル。コマンドテンプレート内で定義可能。設計文書への追記は不要 |
| I-02 | issueStore pollingのライフサイクル管理 | No Fix Needed ❌ | 実装詳細レベル。コンポーネントマウント/アンマウント連動は標準パターンであり、設計文書に記載するまでもない |
| I-03 | PRのdiff表示におけるパフォーマンス考慮 | No Fix Needed ❌ | 実装詳細レベル。patch省略時のフォールバックは実装時に対応可能 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| `design.md` | IssueStoreStateにページネーションstate追加、IssueListPanelのUI説明にページネーション動作記載 |
| `tasks.md` | Task 6.1にページネーション状態管理の記述追加 |

---

## Conclusion

Review #4はCritical指摘なし、Warning 1件、Info 3件。3回のレビューサイクルを経て主要な不整合はすべて解消されている。

唯一のWarning（W-01）はdesign.mdとtasks.md間のページネーション設計ギャップであり、IssueStoreStateへのstate追加とIssueListPanelの説明補完で対応する。Info項目はすべて実装詳細レベルであり設計文書の修正は不要。

---

## Applied Fixes

**Applied Date**: 2026-03-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `design.md` | IssueStoreStateにページネーションstate追加、IssueListPanel説明にページネーション動作追記 |
| `tasks.md` | Task 6.1にページネーション状態管理の記述追加 |

### Details

#### design.md

**Issue(s) Addressed**: W-01

**Changes**:
- `IssueStoreState` に `hasMore: boolean` と `currentPage: number` フィールドを追加
- `IssueStoreState` アクションに `loadMoreIssues: (projectPath: string) => Promise<void>` を追加
- UI Components Summary の IssueListPanel 説明に「もっと読み込む」ボタンによるページネーション動作を追記

**Diff Summary**:
```diff
   // Filters
   filters: IssueFilters;

+  // Pagination
+  hasMore: boolean; // trueの場合、次ページのIssueが存在する
+  currentPage: number; // 現在読み込み済みのページ番号
+
   // Loading
```

```diff
   loadIssues: (projectPath: string) => Promise<void>;
+  loadMoreIssues: (projectPath: string) => Promise<void>; // 次ページを追加読み込み
   loadPullRequests: (projectPath: string) => Promise<void>;
```

```diff
-| IssueListPanel | shared/components/issue/ | SpecListPanel同等のリスト + フィルタUI |
+| IssueListPanel | shared/components/issue/ | SpecListPanel同等のリスト + フィルタUI。「もっと読み込む」ボタンによるページネーション（per_page: 30、次ページ追加読み込み）対応 |
```

#### tasks.md

**Issue(s) Addressed**: W-01

**Changes**:
- Task 6.1のアクション一覧に `loadMoreIssues` を追加
- ページネーション状態管理（hasMore, currentPage）の動作説明を追加

**Diff Summary**:
```diff
-  - vanillaClient経由でissueRouterを呼び出すアクション（loadIssues, loadPullRequests, selectIssue, selectPR, refresh, checkConnection, reset）
-  - ポーリング制御（60秒間隔、手動リフレッシュ対応、競合時は最新結果優先）
+  - vanillaClient経由でissueRouterを呼び出すアクション（loadIssues, loadMoreIssues, loadPullRequests, selectIssue, selectPR, refresh, checkConnection, reset）
+  - ページネーション状態管理（hasMore, currentPage）: `loadIssues` で1ページ目を取得、`loadMoreIssues` で次ページを追加読み込み、取得件数 < per_page の場合 hasMore=false
+  - ポーリング制御（60秒間隔、手動リフレッシュ対応、競合時は最新結果優先）
```

---

_Fixes applied by document-review-reply command._
