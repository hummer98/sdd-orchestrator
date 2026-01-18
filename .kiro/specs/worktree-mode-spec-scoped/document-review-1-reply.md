# Response to Document Review #1

**Feature**: worktree-mode-spec-scoped
**Review Date**: 2026-01-18
**Reply Date**: 2026-01-18

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 1            | 1             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W-001: ロギング設計の明確化

**Issue**: `updateSpecJson`失敗時のログ出力について未記載

**Judgment**: **No Fix Needed** ❌

**Evidence**:

既存コードを確認した結果、本機能のエラーハンドリングは既存パターンに完全に準拠しています。

1. **fileService.updateSpecJson**（`electron-sdd-manager/src/main/services/fileService.ts:459-486`）:
   ```typescript
   async updateSpecJson(
     specPath: string,
     updates: Record<string, unknown>
   ): Promise<Result<void, FileError>> {
     try {
       // ... 処理 ...
       return { ok: true, value: undefined };
     } catch (error) {
       return {
         ok: false,
         error: {
           type: 'WRITE_ERROR',
           path: specPath,
           message: String(error),
         },
       };
     }
   }
   ```
   - エラーは`Result`型で呼び出し元に返される
   - ロギングはfileService側では行わない設計

2. **WorkflowView.tsx**の既存パターン:
   - `handleApprovePhase`（212-223行目）: `console.error`でエラーログ出力
   - トースト通知は`notify.error()`で表示
   - `ProjectLogger`への出力は既存コードでも行われていない

**結論**: ロギング方針の追加は本機能のスコープ外であり、既存のエラーハンドリングパターン（Result型 + console.error + トースト通知）に準拠することで十分です。ProjectLoggerへのログ出力は横断的関心事であり、別途対応すべき課題です。

---

### W-002: E2Eテストの詳細化

**Issue**: E2Eテストが「追加」と記載されているが、具体的なテストシナリオが簡略

**Judgment**: **Fix Required** ✅

**Evidence**:

design.mdの「E2E Tests」セクションを確認:
```markdown
### E2E Tests

1. **worktreeモード選択の永続化** (`spec-workflow.e2e.spec.ts`に追加)
   - チェックボックス操作後、アプリ再起動しても状態が維持される
```

テストシナリオ名のみで、具体的なステップが記載されていません。既存の`worktree-execution.e2e.spec.ts`（1-68行目）では詳細なシナリオが記載されており、同等のレベルで詳細化すべきです。

**Action Items**:

- design.mdの「E2E Tests」セクションにSpec切り替え時の状態維持テストシナリオを詳細化
- 具体的なテストステップを追記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-001 | 状態パターンDの対処 | No Fix Needed | 将来課題として記録済み。本機能のスコープ外 |
| I-002 | テストカバレッジ目標 | No Fix Needed | 具体的なテスト項目は記載済み。カバレッジ目標は開発方針の問題 |
| I-003 | ドキュメントコメントの充実 | No Fix Needed | Designに記載済み。実装時に反映すれば良い |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | E2E Testsセクションのテストシナリオ詳細化 |

---

## Conclusion

2つのWarningのうち、W-001（ロギング設計）は既存パターン準拠で問題なく、W-002（E2Eテスト詳細化）のみ修正が必要です。

修正は軽微であり、design.mdのテストセクションにSpec切り替え時の状態維持テストシナリオを詳細化するのみです。

---

## Applied Fixes

**Applied Date**: 2026-01-18
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | E2E Testsセクションに「Spec切り替え時の状態維持」テストシナリオを追加 |

### Details

#### design.md

**Issue(s) Addressed**: W-002

**Changes**:
- E2E Testsセクションに「Spec切り替え時の状態維持」テストシナリオを追加
- 前提条件、ステップ、検証項目を明記

**Diff Summary**:
```diff
 ### E2E Tests

 1. **worktreeモード選択の永続化** (`spec-workflow.e2e.spec.ts`に追加)
    - チェックボックス操作後、アプリ再起動しても状態が維持される
+
+2. **Spec切り替え時の状態維持** (`spec-workflow.e2e.spec.ts`に追加)
+   - **前提**: Spec Aとspec Bが存在し、両方ともtasksフェーズ完了済み
+   - **ステップ1**: Spec Aを選択し、worktreeモードチェックボックスをOnにする
+   - **検証1**: `spec.json.worktree.enabled`が`true`に更新されることを確認
+   - **ステップ2**: Spec Bを選択する
+   - **検証2**: Spec Bのチェックボックス状態がSpec Aと独立していることを確認（Off表示）
+   - **ステップ3**: Spec Aに戻る
+   - **検証3**: Spec Aのチェックボックス状態がOnのまま維持されていることを確認
```

---

_Fixes applied by document-review-reply command._
