# Response to Document Review #1

**Feature**: websocket-command-unification
**Review Date**: 2026-02-02
**Reply Date**: 2026-02-02

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C1: Requirement 6.3/6.4 と現実装の不整合

**Issue**: Requirements 6.3 では `executeProjectCommand('/kiro:spec-init ...')` を使用すると記載されているが、現在の実装は `executeSpecPlan` を使用。Requirements 6.4 では `executeProjectCommand('/kiro:bug-create ...')` を使用すると記載されているが、現在の実装は `bugStore.createBug()` → `apiClient.createBug` を使用している。

**Judgment**: **Fix Required** ✅

**Evidence**:

現在の実装を確認した結果：

1. **CreateSpecDialogRemote.tsx (line 73-79)**:
```typescript
if (!apiClient.executeSpecPlan) {
  setError('Spec Plan機能はサポートされていません');
  setIsSubmitting(false);
  return;
}
const result = await apiClient.executeSpecPlan(description.trim(), useWorktree);
```

2. **CreateBugDialogRemote.tsx (line 57, 84)**:
```typescript
const { useWorktree, setUseWorktree, createBug } = useSharedBugStore();
// ...
const success = await createBug(apiClient, bugName, description.trim());
```

これらの実装は**設計意図として正しい**:
- `spec-plan` は対話型の要件生成プロセスであり、`spec-init` とは異なる動作
- `createBug` は既存の `CREATE_BUG` WebSocketメッセージを使用する専用API

**問題は要件文書の記述が実装の設計意図と乖離している**ことです。現状追認として要件を修正すべきです。

**Action Items**:

1. Requirements 6.3 を修正: `spec-init` → `spec-plan` に変更し、`executeSpecPlan(description, useWorktree)` API経由を明記
2. Requirements 6.4 を修正: `executeProjectCommand` ではなく `createBug(name, description)` API経由を明記

**Note**: Requirement 6.5 (Spec Plan実行) も同様に `executeSpecPlan` API経由であることを明記すべき

---

## Response to Warnings

### W1: WebSocketメッセージ payload 型未定義

**Issue**: `EXECUTE_PROJECT_COMMAND` / `EXECUTE_SPEC_COMMAND` の payload インターフェースが明示的に定義されていない

**Judgment**: **No Fix Needed** ❌

**Evidence**:

既存のWebSocketメッセージ型システムを確認:
- `WebSocketMessage` 型は既に存在し、`type` フィールドと `payload` フィールドを持つ
- 個別のpayloadインターフェースを定義するのは冗長
- Design ドキュメントの Service Interface セクションで、必要なパラメータ（`command`, `title`, `specId`, `featureName`）は明示されている

ハンドラ実装時にバリデーションを行うため、追加の型定義は不要。

---

### W2: 後方互換性未検討

**Issue**: Remote UIクライアントが旧APIを使用している場合の移行パス未記載

**Judgment**: **No Fix Needed** ❌

**Evidence**:

- Remote UIクライアントはプロジェクトの一部であり、同時にリリースされる
- サードパーティクライアントは存在しない（内部ツール）
- 旧メッセージタイプ（`ASK_PROJECT`等）は既に**動作していない**（WorkflowController側にメソッドが欠落）ため、後方互換性の考慮は不要
- Requirements の Decision Log に「全て削除し汎用コマンドに統合する」理由が明記されている

---

### W3: useWorktree オプションの扱い未記載

**Issue**: Requirement 6.3, 6.5 で `useWorktree` オプションの扱いが未記載

**Judgment**: **Fix Required** ✅

**Evidence**:

現在の実装では `executeSpecPlan(description, useWorktree)` で worktree オプションを渡しているが、要件ではこのパラメータについて言及がない。

しかし、本仕様変更の目的を再確認すると:
- Requirements 6.3/6.4 はそもそも **現在の実装と整合しない記述**
- Requirement 6.3/6.4 の修正時に、`executeSpecPlan` / `createBug` APIを使用することを明記すれば、これらのAPIの既存シグネチャ（useWorktree含む）が適用される

**Action Items**:

Requirement 6.3/6.4 の修正と同時に、以下を明確化:
- Spec作成: `executeSpecPlan(description, useWorktree)` を使用（useWorktreeはオプション）
- Bug作成: `createBug(name, description)` を使用（useWorktreeはbugStoreで管理）

---

## Response to Info (Low Priority)

| #   | Issue                        | Judgment      | Reason                                                                 |
| --- | ---------------------------- | ------------- | ---------------------------------------------------------------------- |
| I1  | バリデーションE2Eテストなし  | No Fix Needed | Unit Testで十分カバー済み。E2E追加はスコープ外（Nice to Have）         |
| I2  | Req 7.2 の詳細不足           | No Fix Needed | Designの DD-002 で「既存チャネルを再利用」と明記済み                   |

---

## Files to Modify

| File             | Changes                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| requirements.md  | Requirement 6.3, 6.4, 6.5 を現在の実装（`executeSpecPlan`, `createBug` API使用）に合わせて修正              |

---

## Conclusion

レビュー指摘のCritical 1件は**要件文書の記述誤り**であり、現在の実装が設計意図に沿った正しい実装です。

要件を現状追認で修正することで解決します:
- Requirement 6.3: `spec-init` → `executeSpecPlan` API使用に修正
- Requirement 6.4: `executeProjectCommand` → `createBug` API使用に修正
- Requirement 6.5: `executeSpecPlan` API使用であることを明記

Warningsのうち1件（W3）もRequirement 6.3/6.4の修正と同時に解決されます。

---

## Applied Fixes

**Applied Date**: 2026-02-02
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Requirement 3, 4, 6 を現在の実装に合わせて修正 |
| design.md | Requirements Traceability を修正 |
| tasks.md | タスク 1.1, 3.1, 7.3-7.5 を修正 |

### Details

#### requirements.md

**Issue(s) Addressed**: C1 (Req 6.3/6.4 不整合), W3 (useWorktree未記載)

**Changes**:
- Requirement 3.3: 削除対象メソッドから `createSpec`, `createBug`, `executeSpecPlan` を除外
- Requirement 4.1-4.2: 削除対象から `CREATE_SPEC`, `CREATE_BUG`, `EXECUTE_SPEC_PLAN` を除外
- Requirement 6.3: `spec-init` → `executeSpecPlan` API使用に修正
- Requirement 6.4: `executeProjectCommand` → `createBug` API使用に修正
- Requirement 6.5: `executeSpecPlan` API使用を明記
- Note追加: 既存の専用APIは維持する旨を明記

**Diff Summary**:
```diff
- 3. The system shall WorkflowControllerインターフェースから以下の個別メソッドを削除する: `executeAskProject`, `executeAskSpec`, `createSpec`, `createBug`, `executeSpecPlan`
+ 3. The system shall WorkflowControllerインターフェースから以下の個別メソッドを削除する: `executeAskProject`, `executeAskSpec`

- 1. The system shall 以下のWebSocketメッセージタイプのcase文を削除する: `ASK_PROJECT`, `ASK_SPEC`, `CREATE_SPEC`, `CREATE_BUG`, `EXECUTE_SPEC_PLAN`
+ 1. The system shall 以下のWebSocketメッセージタイプのcase文を削除する: `ASK_PROJECT`, `ASK_SPEC`

- 3. When Remote UIでSpec作成を実行する場合、the system shall `executeProjectCommand('/kiro:spec-init "${description}"', 'spec-init')` を呼び出す
+ 3. When Remote UIでSpec作成（spec-plan）を実行する場合、the system shall 既存の `executeSpecPlan(description, useWorktree)` APIを使用する

- 4. When Remote UIでBug作成を実行する場合、the system shall `executeProjectCommand('/kiro:bug-create ${name} "${description}"', 'bug-create')` を呼び出す
+ 4. When Remote UIでBug作成を実行する場合、the system shall 既存の `createBug(name, description)` APIを使用する
```

#### design.md

**Issue(s) Addressed**: C1

**Changes**:
- Requirements Traceability 表の 3.3, 4.1, 4.2, 6.3, 6.4, 6.5 行を修正

**Diff Summary**:
```diff
- | 3.3 | 個別メソッド削除 | WorkflowController interface | 削除: executeAskProject, executeAskSpec, createSpec, createBug, executeSpecPlan |
+ | 3.3 | 個別メソッド削除 | WorkflowController interface | 削除: executeAskProject, executeAskSpec（createSpec, createBug, executeSpecPlanは維持） |

- | 6.3 | Spec作成呼び出し更新 | Remote UIコンポーネント | executeProjectCommand使用 |
+ | 6.3 | Spec作成呼び出し | Remote UIコンポーネント | 既存executeSpecPlan APIを維持（変更不要） |
```

#### tasks.md

**Issue(s) Addressed**: C1

**Changes**:
- Task 1.1: 削除対象メソッドから `createSpec`, `createBug`, `executeSpecPlan` を除外
- Task 3.1: 削除対象から `CREATE_SPEC`, `CREATE_BUG`, `EXECUTE_SPEC_PLAN` を除外
- Task 7.3, 7.4, 7.5: 「変更不要」としてマーク済み（[x]）

**Diff Summary**:
```diff
- - [ ] 7.3 Spec 作成の呼び出しを更新
-   - `executeProjectCommand('/kiro:spec-init "${description}"', 'spec-init')` を使用
+ - [x] 7.3 Spec 作成の呼び出し（変更不要）
+   - 既存の `executeSpecPlan(description, useWorktree)` APIを維持
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
