# Response to Document Review #3

**Feature**: auto-exec-phase-ssot
**Review Date**: 2026-02-14
**Reply Date**: 2026-02-14

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 1      | 1            | 0             | 0                |
| Info     | 1      | 0            | 1             | 0                |

---

## Response to Warnings

### W-6: `deploy-complete` → `'deploy'` マッピングと `PHASE_ORDER` の不整合

**Issue**: `getLastCompletedPhase` が `deploy-complete` に対して `'deploy'` を返す設計だが、`PHASE_ORDER` に `'deploy'` が含まれないため、`getImmediateNextPhase` が `indexOf('deploy') === -1` → `startIndex = 0` → `'requirements'` を返す潜在的バグが発生する。

**Judgment**: **Fix Required** ✅

**Evidence**:

ソースコードを確認した結果、レビューの指摘は正確:

1. `PHASE_ORDER`（L47）: `['requirements', 'design', 'tasks', 'document-review', 'impl', 'inspection']` — `'deploy'` を含まない
2. `getImmediateNextPhase`（L1062-1099）: `PHASE_ORDER.indexOf(currentPhase) + 1` を使用し、`indexOf === -1` のガード処理がない
3. `WorkflowPhase` 型: `'deploy'` を含むが、`PHASE_ORDER` には反映されていない

```typescript
// autoExecutionCoordinator.ts L1067
const startIndex = currentPhase === null ? 0 : PHASE_ORDER.indexOf(currentPhase) + 1;
// deploy の場合: PHASE_ORDER.indexOf('deploy') = -1 → startIndex = 0 → PHASE_ORDER[0] = 'requirements'
```

`deploy` は `PHASE_ORDER` の線形フロー外で処理される（inspection 完了後に `execute-spec-merge` イベントを発火: L1278-1294）。`deploy-complete` 状態で自動実行を再開するユースケースは稀だが、マッピング表通りに実装するとランタイムバグとなる。

**対処方針**: レビュー推奨A を採用。`deploy-complete` → `'inspection'`（`PHASE_ORDER` の最終要素）にマッピングを変更する。

理由:
- `PHASE_ORDER` の最終要素 `'inspection'` を返せば、`getImmediateNextPhase` は `startIndex = 6 >= PHASE_ORDER.length` で `null`（完了）を正しく返す
- Out of Scope で `getImmediateNextPhase` の変更を明確に除外しているため、マッピング表側で対処するのが設計方針と一貫性がある
- `getImmediateNextPhase` の防御コード追加はスコープ外の変更となり、YAGNI に反する

**Action Items**:

- requirements.md: Requirement 2 のマッピング表で `deploy-complete` | any | `'deploy'` → `deploy-complete` | any | `'inspection'` に変更
- design.md: Data Models のマッピング表で `deploy-complete` | any | `'deploy'` → `deploy-complete` | any | `'inspection'` に変更
- tasks.md: Task 1.1 の switch 文マッピング記述で `deploy-complete` → `'deploy'` → `deploy-complete` → `'inspection'` に変更

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-6 | `getImmediateNextPhase` の `indexOf` 防御 | No Fix Needed ❌ | W-6 の対処（`deploy-complete` → `'inspection'` 変更）により、`getImmediateNextPhase` に `PHASE_ORDER` 外の値が渡されるパスが消滅するため、独立した防御コードは不要 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | Requirement 2 マッピング表: `deploy-complete` → `'deploy'` を `'inspection'` に変更 |
| design.md | Data Models マッピング表: `deploy-complete` → `'deploy'` を `'inspection'` に変更 |
| tasks.md | Task 1.1 switch 文記述: `deploy-complete` → `'deploy'` を `'inspection'` に変更 |

---

## Conclusion

W-6 は正当な指摘であり、マッピング表の `deploy-complete` → `'deploy'` を `'inspection'` に変更することで対処する。`PHASE_ORDER` の最終要素を返す方針に統一することで、`getImmediateNextPhase` との整合性が保たれ、潜在的なバグパスが解消される。

I-6 は W-6 の対処に包含されるため、独立した修正は不要。

---

## Applied Fixes

**Applied Date**: 2026-02-14
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | `deploy-complete` マッピング戻り値を `'deploy'` → `'inspection'` に変更（マッピング表 + テストケース記述） |
| design.md | `deploy-complete` マッピング戻り値を `'deploy'` → `'inspection'` に変更（Data Models マッピング表） |
| tasks.md | `deploy-complete` マッピング戻り値を `'deploy'` → `'inspection'` に変更（Task 1.1 switch 文記述 + Task 3.2 テストケース記述） |

### Details

#### requirements.md

**Issue(s) Addressed**: W-6

**Changes**:
- Requirement 2 Acceptance Criteria マッピング表: `deploy-complete` の戻り値を `'deploy'` → `'inspection'` に変更
- Requirement 4 Acceptance Criteria テストケース: `deploy-complete` → `'deploy'` を `'inspection'` に変更

**Diff Summary**:
```diff
- | `deploy-complete` | any | `'deploy'` |
+ | `deploy-complete` | any | `'inspection'` |

-    - `specPhase === 'deploy-complete'` → `'deploy'` を返す
+    - `specPhase === 'deploy-complete'` → `'inspection'` を返す
```

#### design.md

**Issue(s) Addressed**: W-6

**Changes**:
- Data Models マッピング表: `deploy-complete` の戻り値を `'deploy'` → `'inspection'` に変更

**Diff Summary**:
```diff
- | `'deploy-complete'` | any | `'deploy'` |
+ | `'deploy-complete'` | any | `'inspection'` |
```

#### tasks.md

**Issue(s) Addressed**: W-6

**Changes**:
- Task 1.1 switch 文マッピング記述: `deploy-complete` → `'deploy'` を `'inspection'` に変更
- Task 3.2 テストケース記述: `deploy-complete` → `'deploy'` を `'inspection'` に変更

**Diff Summary**:
```diff
-  `deploy-complete` → `'deploy'` をマッピングする
+  `deploy-complete` → `'inspection'` をマッピングする

-   - `specPhase === 'deploy-complete'` → `'deploy'` を返すテスト
+   - `specPhase === 'deploy-complete'` → `'inspection'` を返すテスト
```

---

_Fixes applied by document-review-reply command._
