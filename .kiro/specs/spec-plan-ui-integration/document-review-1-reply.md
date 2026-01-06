# Response to Document Review #1

**Feature**: spec-plan-ui-integration
**Review Date**: 2026-01-07
**Reply Date**: 2026-01-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 2            | 0             | 1                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W1: spec-manager プレフィックス時のエラーハンドリング未定義

**Issue**: `commandPrefix: 'spec-manager'` の場合、`SPEC_PLAN_COMMANDS['spec-manager']` が未定義になる可能性があり、エラーハンドリングかフォールバックかが曖昧。

**Judgment**: **Fix Required** ✅

**Evidence**:
既存コード `electron-sdd-manager/src/main/services/specManagerService.ts:150-153` を確認:
```typescript
export const SPEC_INIT_COMMANDS: Record<CommandPrefix, string> = {
  kiro: '/kiro:spec-init',
  'spec-manager': '/spec-manager:init',
};
```

`spec-manager` プレフィックスでは `init` コマンドが定義されている（`/spec-manager:init`）。しかし、`spec-manager:plan` は存在しない（steering/skill-reference.md でも未定義）。

Design DD-002 では「現時点では `/kiro:spec-plan` のみ実装。`spec-manager:plan` は Out of Scope」とあるが、handlers.ts 実装時に `commandPrefix: 'spec-manager'` が渡された場合の動作が未定義。

**Action Items**:

1. `design.md` の DD-002 を明確化: `spec-manager` プレフィックス時は **明示的なエラー** を throw する方針を採用
2. `tasks.md` の Task 2.2 に「spec-manager プレフィックス時は NotImplementedError を throw する」旨を追記

**Rationale for Error (not Fallback)**:
- フォールバックは混乱の元（DD-002 Alternatives Considered で指摘済み）
- 明示的なエラーにより、将来的に `spec-manager:plan` を追加する際の実装漏れを防止
- UI から呼び出す場合、`commandPrefix` はデフォルト `'kiro'` となるため、通常フローでは発生しない

---

### W2: skill-reference.md への反映タスク欠落

**Issue**: 実装完了後、`.kiro/steering/skill-reference.md` に `spec-plan` コマンドを追加する必要があるが、Tasks に明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
現在の `skill-reference.md` を確認すると、cc-sdd セクション（Line 7-37）と cc-sdd-agent セクション（Line 42-92）に以下のコマンドが定義されている:
- spec-init, spec-requirements, spec-design, spec-tasks, spec-impl, etc.

`spec-plan` は対話型で requirements.md を生成する新コマンドだが、skill-reference.md への追加タスクが tasks.md にない。

**Action Items**:

1. `tasks.md` に Task 8 を追加:
```markdown
- [ ] 8. (P) steering/skill-reference.md への spec-plan 追記
  - cc-sdd セクションに spec-plan コマンドを追加
  - cc-sdd-agent セクションに spec-plan コマンドを追加（cc-sdd と同一動作）
  - _Post-implementation task_
```

2. 追記すべき内容（参考）:
```markdown
| spec-plan | `spec.json`, `requirements.md` | - | 説明文提供 | phase: `requirements-generated`, approvals.requirements.generated: true, approved: false | 変更なし | Claude |
```

---

### W3: Open Questions の解決状況が不明瞭

**Issue**: requirements.md の Open Questions セクションに解決状況が明記されていない。

**Judgment**: **Needs Discussion** ⚠️

**Evidence**:
`requirements.md` の Open Questions セクション（Line 117-119）:
```markdown
## Open Questions

1. `cc-sdd-agent` 用の `spec-plan.md` は agent 委譲版として別途作成が必要か、それとも同じファイルを共有するか？
2. `spec-manager` プレフィックス用の plan コマンド（`/spec-manager:plan`）は必要か？
```

これらは Design の DD-003 および DD-002 で解決済みだが、requirements.md には「→ 解決済み」の追記がない。

**Discussion Points**:
- トレーサビリティ向上のため追記するか？
- Decision Log が充実しているため、実質的な影響は低い
- requirements.md は承認済み（spec.json: `approvals.requirements.approved: true`）

**Recommendation**:
- Optional として対応可能
- 実装優先の場合はスキップしても問題ない

---

## Response to Info (Low Priority)

| #  | Issue | Judgment | Reason |
| -- | ----- | -------- | ------ |
| I1 | セキュリティ考慮事項 | No Fix Needed ❌ | 既存パターン踏襲、新規リスクなし |
| I2 | パフォーマンス考慮事項 | No Fix Needed ❌ | 既存 startAgent を使用、新規影響なし |
| I3 | product.md への反映 | No Fix Needed ❌ | Optional、フェーズ構造自体は不変 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `.kiro/specs/spec-plan-ui-integration/design.md` | DD-002 に「spec-manager プレフィックス時は明示的なエラーを throw」を追記 |
| `.kiro/specs/spec-plan-ui-integration/tasks.md` | Task 2.2 にエラーハンドリング追記、Task 8 として steering 更新タスクを追加 |
| `.kiro/specs/spec-plan-ui-integration/requirements.md` | (Optional) Open Questions に解決状況追記 |

---

## Conclusion

**判定結果**:
- W1, W2: Fix Required（設計の曖昧性解消、タスク追加）
- W3: Needs Discussion（Optional、実装優先可）
- I1-I3: No Fix Needed

**次のステップ**:
1. `--autofix` により W1, W2 の修正を自動適用
2. W3 は Optional のため、ユーザー判断に委ねる
3. 修正完了後、`/kiro:spec-impl spec-plan-ui-integration` で実装開始可能

---

## Applied Fixes

**Applied Date**: 2026-01-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `design.md` | DD-002 にエラーハンドリング方針を明記 |
| `tasks.md` | Task 2.2 にエラーハンドリング詳細追記、Task 8（steering 更新）追加 |
| `spec.json` | documentReview.roundDetails 追加 |

### Details

#### design.md

**Issue(s) Addressed**: W1

**Changes**:
- DD-002 の Consequences フィールドを明確化
- Error Handling フィールドを追加

**Diff Summary**:
```diff
- | Consequences | `commandPrefix: 'spec-manager'` の場合、`SPEC_PLAN_COMMANDS['spec-manager']` が未定義でエラーになる可能性。ハンドラで適切にエラーハンドリングするか、kiro にフォールバックする |
+ | Consequences | `commandPrefix: 'spec-manager'` の場合、handlers.ts で明示的なエラー（`Error('spec-manager:plan is not yet implemented')`）を throw する。フォールバックは混乱の元となるため採用しない |
+ | Error Handling | **明示的エラー方針を採用**: `SPEC_PLAN_COMMANDS['spec-manager']` が undefined の場合、`throw new Error('spec-manager:plan is not yet implemented. Use kiro prefix.')` とする。UI からの呼び出しでは `commandPrefix` はデフォルト `'kiro'` となるため、通常フローでは発生しない |
```

#### tasks.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- Task 2.2 に spec-manager プレフィックス時のエラーハンドリング詳細を追記
- Task 8 として steering/skill-reference.md 更新タスクを追加

**Diff Summary**:
```diff
  - エラー時は説明的なメッセージを含む Error を throw
+   - **spec-manager プレフィックス時のエラーハンドリング**: `SPEC_PLAN_COMMANDS[commandPrefix]` が undefined の場合、`throw new Error('spec-manager:plan is not yet implemented. Use kiro prefix.')` とする（DD-002 参照）

+ - [ ] 8. (P) steering/skill-reference.md への spec-plan 追記
+   - `.kiro/steering/skill-reference.md` の cc-sdd セクションに spec-plan コマンドを追加
+   - cc-sdd-agent セクションにも同様に追加（cc-sdd と同一動作）
+   - 追記内容: `| spec-plan | spec.json, requirements.md | - | 説明文提供 | phase: requirements-generated, approvals.requirements.generated: true, approved: false | 変更なし | Claude |`
+   - _Post-implementation task (実装完了後に実施)_
```

#### spec.json

**Issue(s) Addressed**: (metadata update)

**Changes**:
- `documentReview.roundDetails` フィールドを追加
- Round 1 のステータスを `reply_complete`、`fixApplied: true` に設定

---

_Fixes applied by document-review-reply --autofix command._
