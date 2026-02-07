# Response to Document Review #1

**Feature**: startup-project-selection-race-condition
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 3      | 1            | 2             | 0                |

---

## Response to Warnings

### W1: Requirements 1.4/1.5 と 4.1/4.2 の重複

**Issue**: Requirements.md で Requirement 1 と Requirement 4 の一部 acceptance criteria が完全に重複している（1.4 ≡ 4.1、1.5 ≡ 4.2）。実装時の混乱を招く可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:
requirements.md を確認した結果、以下が確認される:
- Requirement 1.4: `ContextServices` に `getInitialSelectResult` と `clearInitialSelectResult` を追加する
- Requirement 4.1: `context.ts` の `ContextServices` に `getInitialSelectResult` / `clearInitialSelectResult` を追加する
- Requirement 1.5: `createDefaultServices` にデフォルト実装を追加する
- Requirement 4.2: `createDefaultServices()` でのデフォルト実装は `() => null` / `() => {}` とする

Design でも「4.1 → 1.4 と同一」「4.2 → 1.5 と同一」と認識されているが、重複解消はされていない。同一内容の acceptance criteria が2箇所に存在するのは仕様上の冗長性であり、実装タスクの紐づけで混乱するリスクがある。

**Action Items**:
- requirements.md の Requirement 4 の acceptance criteria 4.1 と 4.2 を「1.4 参照」「1.5 参照」の形で統合し、Requirement 4 を `handler.ts` の DI 注入（4.3）に限定する

### W2: Open Questions が未解決

**Issue**: requirements.md の Open Questions に2件の未解決項目がある。Design では暗黙的に回答されているが、明示的にクローズされていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- Open Question 1「E2E テスト更新の必要性」→ Design UJ-001/UJ-002 で「既存 E2E でカバー」と判断済み
- Open Question 2「`onProjectSelected` の他箇所での使用確認」→ ソースコード grep で `onProjectSelected` の使用箇所を確認:
  - `events.ts:194` (Subscription定義) → 削除対象
  - `App.tsx:295` (useSubscription) → 削除対象
  - `App.tsx:538` (コメント) → 削除対象
  - `events-router.test.ts:514,882` (テスト) → 削除対象
  - Remote UI やマルチウィンドウでの使用はなし

Design で回答済みの内容を Open Questions に反映してクローズすべき。

**Action Items**:
- requirements.md の Open Questions セクションに Design での回答結果を追記しクローズ済みにする

### W3: `getInitialProjectPath` と `getInitialSelectResult` の命名類似性

**Issue**: 既存の `getInitialProjectPath` query と新規の `getInitialSelectResult` query の命名が類似しており混乱の可能性がある。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
ソースコード `project.ts:129` で確認:
```typescript
getInitialProjectPath: publicProcedure
  .query(async ({ ctx }) => {
    return ctx.services.getInitialProjectPath();
  });
```

- `getInitialProjectPath`: パス文字列を返す（CLI引数の初期パス）
- `getInitialSelectResult`: `SelectProjectResult` オブジェクトを返す（選択結果全体）

命名は異なるドメインオブジェクト（パス vs 選択結果）を明確に反映しており、`Path` vs `SelectResult` で十分に区別可能。Design への注記追加は過剰な文書化であり、実装コードのインテリセンスで型の違いが明確になるため、追加のドキュメント修正は不要。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | `SelectProjectResultLike` 型の定義元 | No Fix Needed | `context.ts:104` で定義済み。Design の Service Interface で `SelectProjectResultLike` を使用しており、実装対象ファイルと同一ファイル内に型定義があるため、import 元の明記は不要 |
| I2 | Task 5.3 の曖昧な期待値 | Fix Required ✅ | ソースコード確認で Subscription 数は正確に37。`onProjectSelected` 削除後は36に確定。「37→36等」を「37→36」に修正すべき |
| I3 | E2E テスト確認結果の追記 | No Fix Needed | W2 の Open Questions クローズで対応済み |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| requirements.md | Requirement 4.1/4.2 を「1.4/1.5 参照」に統合、Open Questions をクローズ |
| tasks.md | Task 5.3 の「37→36等」を「37→36」に修正 |

---

## Conclusion

Warning 3件のうち2件が Fix Required（Requirements の重複解消、Open Questions のクローズ）、1件は No Fix Needed（命名類似性の注記は過剰）。Info 3件のうち1件が Fix Required（Task 5.3 の期待値確定）。

合計3件の修正を `--autofix` で適用する。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Requirement 4.1/4.2 を「1.4/1.5 参照」に統合、Open Questions をクローズ |
| tasks.md | Task 5.3 の期待値を「37→36」に確定 |

### Details

#### requirements.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- Requirement 4.1 を「→ Requirement 1.4 参照（同一内容のため統合）」に修正
- Requirement 4.2 を「→ Requirement 1.5 参照（同一内容のため統合）」に修正
- Open Question 1（E2Eテスト更新）を解決済みとしてクローズ（Design UJ-001/UJ-002 の判断結果を追記）
- Open Question 2（onProjectSelected の他箇所使用）を解決済みとしてクローズ（ソースコード grep 結果を追記）

**Diff Summary**:
```diff
- 4.1. `context.ts` の `ContextServices` に以下を追加する:
-   - `getInitialSelectResult: () => SelectProjectResultLike | null`
-   - `clearInitialSelectResult: () => void`
+ 4.1. ~~`ContextServices` への getter/clearer 追加~~ → Requirement 1.4 参照（同一内容のため統合）

- 4.2. `createDefaultServices()` でのデフォルト実装は `getInitialSelectResult: () => null`, `clearInitialSelectResult: () => {}` とする。
+ 4.2. ~~`createDefaultServices` のデフォルト実装~~ → Requirement 1.5 参照（同一内容のため統合）

- - E2E テスト（`diagnostic-project-selection.e2e.spec.ts`）の更新が必要か確認（Pull 動作の検証方法）
- - `onProjectSelected` Subscription を削除した場合、他の箇所（Remote UI、マルチウィンドウ等）で使用されていないか最終確認が必要
+ - ~~E2E テスト...~~ → **解決済み**: 既存 E2E テストは Pull モデルでもそのまま動作する
+ - ~~`onProjectSelected` Subscription...~~ → **解決済み**: 使用箇所は全て本仕様の削除対象のみ
```

#### tasks.md

**Issue(s) Addressed**: I2

**Changes**:
- Task 5.3 の Subscription 一覧テスト期待値を「37→36等」から「37→36」に確定

**Diff Summary**:
```diff
-   - Subscription 一覧テストの数を1減らす（37→36等）
+   - Subscription 一覧テストの数を1減らす（37→36）
```

---

_Fixes applied by document-review-reply command._
