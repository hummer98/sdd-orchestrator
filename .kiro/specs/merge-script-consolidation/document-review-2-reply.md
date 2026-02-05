# Response to Document Review #2

**Feature**: merge-script-consolidation
**Review Date**: 2026-02-05
**Reply Date**: 2026-02-05

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 1      | 0            | 1             | 0                |

---

## Response to Critical Issues

### C-001: HELPER_SCRIPTS と merge-spec.sh テンプレートの関係が不明確

**Issue**: Tasks 6.1 に「merge-spec.sh をリストに追加（テンプレートは既存だがリストに未含）」と補足を追加

**Judgment**: **Fix Required** ✅

**Evidence**:
コード確認により、レビューの指摘が正確であることを確認しました。

1. テンプレートの存在確認:
   - `electron-sdd-manager/resources/templates/scripts/merge-spec.sh` が存在する

2. HELPER_SCRIPTS リストの確認 (`ccSddWorkflowInstaller.ts:138-143`):
   ```typescript
   export const HELPER_SCRIPTS = [
     'update-spec-for-deploy.sh',
     'update-bug-for-deploy.sh',
     'create-spec-worktree.sh',
     'create-bug-worktree.sh',
   ] as const;
   ```
   - `merge-spec.sh` は HELPER_SCRIPTS に含まれていない

3. **結論**: `merge-spec.sh` テンプレートは既に存在するが、HELPER_SCRIPTS リストには追加されていなかった。これは過去の実装漏れと判断。

**Action Items**:

- Tasks 6.1 の記述を詳細化し、`merge-spec.sh` が「テンプレート既存だがリスト未含」であることを明記

---

## Response to Warnings

### W-001: Tasks 6.1 の記述が曖昧

**Issue**: 「追加」と「更新」の区別を明確化（merge-spec.sh: リスト追加 + テンプレート更新、merge-bug.sh: リスト追加 + テンプレート新規作成）

**Judgment**: **Fix Required** ✅

**Evidence**:
Tasks 6.1 の現在の記述を確認:
```
- `merge-spec.sh` と `merge-bug.sh` をリストに追加
```

この記述では以下が不明確:
1. `merge-spec.sh` テンプレートは既存だがリストに未含
2. `merge-bug.sh` テンプレートは新規作成が必要

レビュー指摘どおり、より詳細な記述が必要です。

**Action Items**:

- Tasks 6.1 の記述を詳細化:
  - `merge-spec.sh`: HELPER_SCRIPTS リストに追加（テンプレートは既存だがリストに未含）
  - `merge-bug.sh`: HELPER_SCRIPTS リストに追加（テンプレートは Task 5.2 で新規作成）
  - `update-spec-for-deploy.sh` と `update-bug-for-deploy.sh` をリストから削除

---

### W-002: Design Impact Analysis Contract に ccSddWorkflowInstaller.test.ts が含まれていない

**Issue**: Design 381行の後に `ccSddWorkflowInstaller.test.ts` の UPDATE を追加（前回レビューで Tasks は修正済みだが Design は未修正）

**Judgment**: **Fix Required** ✅

**Evidence**:
Design の Impact Analysis Contract (`design.md:368-380`) を確認:
```markdown
| Target File | Action | Reason |
|-------------|--------|--------|
...
| `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.ts` | UPDATE | HELPER_SCRIPTS リストの更新 |
```

テストファイル `ccSddWorkflowInstaller.test.ts` が含まれていません。

一方、Tasks 6.1 では既にテストファイルの更新が記載されています:
```
- `ccSddWorkflowInstaller.test.ts` を更新: テストで使用するスクリプト名を `merge-spec.sh` と `merge-bug.sh` に変更
```

Design と Tasks の間に不整合があり、Design を更新する必要があります。

**Action Items**:

- Design の Impact Analysis Contract に以下を追加:
  ```
  | `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.test.ts` | UPDATE | HELPER_SCRIPTS テストの更新 |
  ```

---

## Response to Info (Low Priority)

| #     | Issue                              | Judgment      | Reason                             |
| ----- | ---------------------------------- | ------------- | ---------------------------------- |
| S-001 | Design の Impact Analysis Contract を完全にする | No Fix Needed | W-002 で対応済み                   |

---

## Files to Modify

| File       | Changes                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| tasks.md   | Task 6.1 の記述を詳細化（merge-spec.sh: テンプレート既存・リスト未含、merge-bug.sh: テンプレート新規作成を明記）     |
| design.md  | Impact Analysis Contract に `ccSddWorkflowInstaller.test.ts` を追加                                                  |

---

## Conclusion

Document Review #2 で指摘された 3 件（Critical 1, Warning 2）はすべて正当な指摘であり、修正が必要です。

- **C-001 & W-001**: Tasks 6.1 の記述が不十分で、`merge-spec.sh` の現状（テンプレート既存・リスト未含）が明記されていない
- **W-002**: Design の Impact Analysis Contract にテストファイルが欠落している

これらの修正により、Design ↔ Tasks の整合性が向上し、実装時の混乱を防止できます。

---

## Applied Fixes

**Applied Date**: 2026-02-05
**Applied By**: --autofix

### Summary

| File      | Changes Applied                                                     |
| --------- | ------------------------------------------------------------------- |
| tasks.md  | Task 6.1 の記述を詳細化（merge-spec.sh と merge-bug.sh の状態を明記） |
| design.md | Impact Analysis Contract に ccSddWorkflowInstaller.test.ts を追加   |

### Details

#### tasks.md

**Issue(s) Addressed**: C-001, W-001

**Changes**:
- Task 6.1 の `merge-spec.sh` と `merge-bug.sh` の記述を詳細化
- 「リストに追加」から、各スクリプトの現状を明記する形に変更

**Diff Summary**:
```diff
- `merge-spec.sh` と `merge-bug.sh` をリストに追加
+ `merge-spec.sh` をリストに追加（テンプレートは既存だがリストに未含）
+ `merge-bug.sh` をリストに追加（テンプレートは Task 5.2 で新規作成）
```

#### design.md

**Issue(s) Addressed**: W-002

**Changes**:
- Impact Analysis Contract テーブルに ccSddWorkflowInstaller.test.ts を追加

**Diff Summary**:
```diff
  | `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.ts` | UPDATE | HELPER_SCRIPTS リストの更新 |
+ | `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.test.ts` | UPDATE | HELPER_SCRIPTS テストの更新 |
```

---

_Fixes applied by document-review-reply command._
