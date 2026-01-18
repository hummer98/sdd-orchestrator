# Response to Document Review #1

**Feature**: impl-start-unification
**Review Date**: 2026-01-18
**Reply Date**: 2026-01-18

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W1: Remote UI 影響の未記載

**Issue**: tech.md の「新規Spec作成時の確認事項」に「Remote UI影響チェック」が求められているが、requirements.md に Remote UI への影響有無が明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
webSocketHandler.ts を確認したところ、`startImpl`、`worktreeImplStart`、`normalModeImplStart` などの関数は WebSocket ハンドラに存在しない。

```bash
# 検索結果: webSocketHandler.ts には impl 開始関連の処理なし
grep -n "startImpl\|implStart\|impl.*start" webSocketHandler.ts
# No matches found
```

現在、impl 開始操作は Renderer Process の `WorkflowView.tsx` から IPC 経由で実行されており、Remote UI からはアクセスできない設計。これは Desktop 専用操作として妥当であり、明記すべき。

**Action Items**:
- requirements.md に「Remote UI対応: 不要（Desktop専用操作）」を追記
- 理由: impl 実行は Git worktree 操作やローカルファイルシステム操作を伴うため、Desktop UI からのみ許可

---

### W2: commandPrefix ハードコード

**Issue**: design.md の execute-next-phase 修正コードで `commandPrefix: 'kiro'` がハードコードされている。

**Judgment**: **Fix Required** ✅

**Evidence**:
handlers.ts の現在の実装を確認:

```typescript
// handlers.ts:2057-2062
const result = await service.execute({
  type: phase,
  specId: context.specId,
  featureName: context.featureName,
  commandPrefix: 'kiro', // Use kiro prefix by default for auto-execution
});
```

このハードコードは意図的な設計判断である:
- Auto Execution は SDD Orchestrator を通じて実行される
- SDD Orchestrator 経由の実行は常に `kiro` プレフィックスを使用
- 手動実行時は `workflowStore.commandPrefix` で設定値を使用

しかし、この意図が設計に明記されていないため、設計に理由を追記することで解決。

**Action Items**:
- design.md の execute-next-phase 修正コードに意図を明記するコメントを追加
- 「Auto Execution では常に 'kiro' プレフィックスを使用（SDD Orchestrator 標準設定）」

---

## Response to Info (Low Priority)

| #   | Issue                        | Judgment      | Reason                                                          |
| --- | ---------------------------- | ------------- | --------------------------------------------------------------- |
| I1  | startImplPhase 配置場所未指定 | No Fix Needed | 既存の `worktreeImplHandlers.ts` に追加するか新規ファイル作成かは実装時に既存パターンに従えば判断可能 |
| I2  | ログ仕様未詳細               | No Fix Needed | steering/logging.md のパターンに従えば十分                      |
| I3  | spec.json 更新責務不明確     | No Fix Needed | 既存関数の責務を確認し実装時に対応可能                          |

---

## Files to Modify

| File             | Changes                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| requirements.md  | Introduction セクション末尾に「Remote UI対応: 不要（Desktop専用操作）」を追記               |
| design.md        | execute-next-phase 修正コードに commandPrefix ハードコードの理由をコメント追記              |

---

## Conclusion

2件の Warning について修正が必要と判断。いずれも設計ドキュメントへの追記で解決可能な軽微な問題。

3件の Info については修正不要と判断。実装時に既存パターンに従えば十分対応可能。

**次のステップ**: requirements.md と design.md に追記を適用後、再レビューを実施。

---

## Applied Fixes

**Applied Date**: 2026-01-18
**Applied By**: --autofix

### Summary

| File            | Changes Applied                                                          |
| --------------- | ------------------------------------------------------------------------ |
| requirements.md | Introduction セクションに Remote UI 対応方針を追記                       |
| design.md       | execute-next-phase の commandPrefix ハードコードに理由コメントを追記    |

### Details

#### requirements.md

**Issue(s) Addressed**: W1

**Changes**:
- Introduction セクション末尾に「Remote UI対応: 不要（Desktop専用操作）」を追記
- 理由として Git worktree 操作やローカルファイルシステム操作を伴うことを明記

**Diff Summary**:
```diff
 impl フェーズ開始処理を Main Process の単一関数に集約し、手動実行と Auto Execution の両方で一貫した動作を保証する。これにより、Auto Execution 時に Worktree 作成がスキップされる構造的問題を解決する。
+
+**Remote UI対応**: 不要（Desktop専用操作）
+- 理由: impl 実行は Git worktree 操作やローカルファイルシステム操作を伴うため、Desktop UI からのみ許可される。WebSocket ハンドラへの追加は不要。
```

#### design.md

**Issue(s) Addressed**: W2

**Changes**:
- execute-next-phase 変更後コードに commandPrefix: 'kiro' がハードコードされている理由のコメントを追加

**Diff Summary**:
```diff
   if (phase === 'impl') {
     // impl フェーズは startImplPhase 経由で実行
+    // NOTE: Auto Execution では常に 'kiro' プレフィックスを使用
+    // SDD Orchestrator 経由の実行は kiro コマンドセットを前提とするため
     const result = await startImplPhase({
```

---

_Fixes applied by document-review-reply command._
