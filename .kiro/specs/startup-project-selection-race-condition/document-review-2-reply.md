# Response to Document Review #2

**Feature**: startup-project-selection-race-condition
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 2      | 1            | 1             | 0                |

---

## Response to Warnings

### W1: `SelectProjectResultLike` vs `SelectProjectResult` の型不整合リスク

**Issue**: Design/Requirements では `ContextServices.getInitialSelectResult` の戻り値型を `SelectProjectResultLike | null` と定義しているが、`projectSetup.ts` の実装は `SelectProjectResult` を返す。DI 注入時にキャストが必要になる可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:

ソースコード検証により、型の互換性は確認済み:

- `SelectProjectResultLike`（`context.ts:104-113`）: `specs: Array<{ name: string }>`, `bugs: Array<Record<string, unknown>>`, `specJsonMap: Record<string, Record<string, unknown>>`
- `SelectProjectResult`（`renderer/types/index.ts:245-261`）: `specs: SpecMetadata[]`, `bugs: BugMetadata[]`, `specJsonMap: Record<string, SpecJson>`

TypeScript の構造的型付けにより `SelectProjectResult` は `SelectProjectResultLike` のサブタイプであり、**キャストは不要**です。しかし、実装者がこの型の関係を理解できるよう、Design に注記を追加することは有益です。

**Action Items**:

- design.md の ContextServices 拡張セクションの Implementation Notes に型互換性の注記を追加
- tasks.md の Task 2.2 に「型アサーション不要」の注記を追加

---

### W2: `App.tsx` の `applySelectProjectResult` の取得方法

**Issue**: Task 3.1 の実装で `useProjectStore()` Hook 経由で取得した `applySelectProjectResult` を `useEffect` 内の `vanillaClient` query コールバックで使用する方法が Design に明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

現行コードの確認結果:
- `App.tsx:540`: `const { applySelectProjectResult } = useProjectStore();`
- `App.tsx:295-301`: 既存の `onProjectSelected` Subscription ハンドラーで、Hook 由来の `applySelectProjectResult` をコールバック内で使用するパターンが既に存在

Zustand store のセレクターで返される関数は安定した参照を持つため、React の依存配列に含める必要はありません。既存コードと同じパターンであり実装上の問題はありませんが、Design/tasks に明記することで実装時の迷いを防げます。

**Action Items**:

- tasks.md の Task 3.1 に `useProjectStore()` 経由で `applySelectProjectResult` を取得し `useEffect` 内で使用する旨を注記

---

## Response to Info (Low Priority)

| #  | Issue | Judgment | Reason |
| -- | ----- | -------- | ------ |
| I1 | `App.tsx` line 538 のコメントクリーンアップ | Fix Required ✅ | Task 3.1 で Subscription 削除時に関連コメント（line 538-539）も合わせて削除すべき。tasks.md に注記追加 |
| I2 | Task 4.2/4.3 の削除順序の安全性注記 | No Fix Needed ❌ | `events.ts` と `eventBus.ts` の削除は完全に独立しており、tasks.md で既に `(P)` マークされている。追加注記は不要 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | ContextServices 拡張セクションの Implementation Notes に `SelectProjectResult` → `SelectProjectResultLike` の型互換性注記を追加 |
| tasks.md | Task 2.2 に型アサーション不要の注記追加、Task 3.1 に `applySelectProjectResult` 取得方法と関連コメント削除の注記追加 |

---

## Conclusion

Warning 2件は共に指摘内容が正しく、Design/Tasks への注記追加で対応します。Info 2件のうち1件（コメントクリーンアップ）は tasks.md への注記追加で対応、1件（並列実行の安全性）は既に適切に管理されており追加対応不要です。

全体として、仕様ドキュメントの品質は高く、修正は全て注記の追加（実装内容の変更なし）にとどまります。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | ContextServices 拡張セクションの Implementation Notes に型互換性注記を追加 |
| tasks.md | Task 2.2 に型アサーション不要の注記追加、Task 3.1 に `applySelectProjectResult` 取得方法と関連コメント削除の注記追加 |

### Details

#### design.md

**Issue(s) Addressed**: W1

**Changes**:
- ContextServices 拡張セクションの Implementation Notes に `SelectProjectResult` → `SelectProjectResultLike` の構造的型互換性と、DI 注入時に型アサーション不要である旨の注記を追加

**Diff Summary**:
```diff
 **Implementation Notes**
 - `handler.ts` の `setupTRPCHandler` で `projectSetup.ts` の実関数を注入
 - `test-helpers.ts` の `createMockServices` にモック追加
+- **型互換性**: `projectSetup.ts` の `getInitialSelectResult()` は `SelectProjectResult`（`renderer/types`）を返すが、`ContextServices` は `SelectProjectResultLike`（`context.ts`）で定義。TypeScript の構造的型付けにより `SelectProjectResult` は `SelectProjectResultLike` のサブタイプであるため、DI 注入時に型アサーション（`as`）は不要
```

#### tasks.md

**Issue(s) Addressed**: W1, W2, I1

**Changes**:
- Task 2.2 に `projectSetup.ts` の `SelectProjectResult` と `ContextServices` の `SelectProjectResultLike` の型互換性注記を追加
- Task 3.1 の `applySelectProjectResult` 説明に `useProjectStore()` Hook 経由での取得と Zustand store の安定参照についての注記を追加
- Task 3.1 に Subscription 削除時の関連コメント（line 538-539）クリーンアップの注記を追加

**Diff Summary**:
```diff
 - [ ] 2.2 (P) `handler.ts` の `setupTRPCHandler` で `projectSetup.ts` の実関数を DI 注入する
   - `mergedOverrides` に `getInitialSelectResult` と `clearInitialSelectResult` を追加し、`projectSetup.ts` の関数を注入する
+  - **注**: `projectSetup.ts` の `getInitialSelectResult()` は `SelectProjectResult` 型を返すが、`ContextServices` は `SelectProjectResultLike` で定義。構造的型付けにより互換であり、型アサーション（`as`）は不要
```

```diff
-  - 結果が null でない場合、`applySelectProjectResult(result)` でストアに適用する
+  - 結果が null でない場合、`applySelectProjectResult(result)` でストアに適用する（`applySelectProjectResult` は `useProjectStore()` Hook 経由で取得済みの関数を `useEffect` 内で使用する。Zustand store の関数は安定した参照を持つため依存配列への追加は不要）
   - `trpc.events.onProjectSelected.useSubscription()` フックを削除する
+  - Subscription 削除時に、関連するコメント（line 538-539 の `startup-project-selection-fix` / `Task 9.2` コメント）も合わせてクリーンアップする
```

---

_Fixes applied by document-review-reply command._
