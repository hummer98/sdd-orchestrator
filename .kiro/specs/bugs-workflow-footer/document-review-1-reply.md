# Response to Document Review #1

**Feature**: bugs-workflow-footer
**Review Date**: 2026-01-21
**Reply Date**: 2026-01-21

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 4      | 0            | 4             | 0                |

---

## Response to Warnings

### W-001: ロギング設計の不足

**Issue**: Design 文書でエラーケース（WORKTREE_CREATE_FAILED, BUG_JSON_UPDATE_FAILED）のログ出力が言及されていますが、具体的なログフォーマットやログレベルの定義がありません。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

`logging.md` のガイドラインを確認した結果、具体的なログフォーマットやレベルはガイドラインで「推奨」として定義されており、個別機能の Design で詳細に定義する必要はありません：

```
| レベル | 用途 |
|--------|------|
| debug | 開発時のデバッグ情報 |
| info | 正常系の動作記録 |
| error | エラー発生時の詳細 |
```

Design 文書では「Error Handling」セクションで既に以下を定義しています：
- `WORKTREE_CREATE_FAILED`: git worktree add 失敗 → ログ出力 + エラー通知
- `BUG_JSON_UPDATE_FAILED`: bug.json 更新失敗 → ロールバック試行 + エラー通知

これは `logging.md` の原則（エラー発生時にはコンテキスト情報をログに含める）に従った適切な設計です。実装時に `logging.md` のフォーマットに従えば十分であり、Design での詳細定義は過剰です。

---

### W-002: CreateBugDialog への影響確認

**Issue**: Task 1.1 および Design の bugStore セクションに「CreateBugDialog への影響確認が必要」と記載されていますが、具体的な確認項目や対応方針が定義されていません。

**Judgment**: **Fix Required** ✅

**Evidence**:

実際のコードを確認した結果、CreateBugDialog は `useWorktree` を使用しています：

```typescript
// CreateBugDialog.tsx:28
const { refreshBugs, useWorktree, setUseWorktree } = useBugStore();

// CreateBugDialog.tsx:159-191
// useWorktree の参照・更新、および条件付き表示
```

CreateBugDialog は「Worktreeモードで作成」スイッチを持っており、Bug 作成時に worktree モードを選択できます。これは本 Spec の「事前変換方式」とは別の機能（**作成時の worktree 選択**）であり、影響を受けます。

**Action Items**:

1. Task 1.1 に以下のサブタスクを追加：
   - CreateBugDialog から useWorktree/setUseWorktree の使用を削除
   - 「Worktreeモードで作成」スイッチ UI を削除
   - 関連するテスト（CreateBugDialog.test.tsx）の更新

2. requirements.md に Decision Log または Out of Scope を追加：
   - CreateBugDialog の「Worktreeモードで作成」機能も廃止対象とすることを明示

---

### W-003: 変換成功後の UI 更新フロー

**Issue**: Design のシーケンス図で「Refresh bug detail」と記載されていますが、具体的にどのメソッドを呼び出すか、bugStore の selectBug を使うか、他の方法を使うかが明確ではありません。

**Judgment**: **Fix Required** ✅

**Evidence**:

bugStore を確認した結果、`selectBug` メソッドが bug detail の取得に使用されています：

```typescript
// bugStore.ts:133-176
selectBug: async (bug: BugMetadata, options?: { silent?: boolean }) => {
  // ... 詳細取得ロジック
}

// bugStore.ts:197
// refreshBugs 内で selectBug を使用
await get().selectBug(updatedBug, { silent: true });
```

Design の `useConvertBugToWorktree` Implementation Notes に、変換成功後のリフレッシュ方法を明示的に追記すべきです。

**Action Items**:

1. design.md の useConvertBugToWorktree セクションの Implementation Notes に以下を追記：
   - 「変換成功後は `bugStore.selectBug(selectedBug, { silent: true })` を呼び出して詳細をリフレッシュする」

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-001 | テストカバレッジ目標未定義 | No Fix Needed | カバレッジ目標は CI/CD 設定で管理するのが適切。個別タスクで定義するのは過剰 |
| I-002 | 将来の共通化検討 | No Fix Needed | Out of Scope として既に定義済み。将来の検討事項であり、本 Spec の範囲外 |
| I-003 | エラーメッセージの i18n | No Fix Needed | Out of Scope。既存パターンが日本語ハードコードであり、一貫性を保つ |
| I-004 | コンポーネント配置の検討 | No Fix Needed | Out of Scope として「Remote UI への対応」は除外済み |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| tasks.md | Task 1.1 に CreateBugDialog の修正サブタスクを追加 |
| design.md | useConvertBugToWorktree の Implementation Notes にリフレッシュ方法を追記 |

---

## Conclusion

3 件の Warning のうち、2 件（W-002, W-003）で修正が必要と判断しました。

- **W-001（ロギング設計の不足）**: `logging.md` のガイドラインに従う設計で十分であり、過剰な詳細定義は不要
- **W-002（CreateBugDialog 影響）**: 実際にコードが影響を受けるため、Task に明示的なサブタスクを追加
- **W-003（UI 更新フロー）**: 具体的なメソッド呼び出しを Design に追記して明確化

修正適用後、仕様の実装を進められます。

---

## Applied Fixes

**Applied Date**: 2026-01-21
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 1.1 に CreateBugDialog 修正のサブタスクを追加 |
| design.md | useConvertBugToWorktree の Implementation Notes にリフレッシュ方法を追記 |

### Details

#### tasks.md

**Issue(s) Addressed**: W-002

**Changes**:
- Task 1.1 に CreateBugDialog から useWorktree/setUseWorktree の使用を削除するサブタスクを追加
- CreateBugDialog の「Worktreeモードで作成」スイッチ UI 削除を追加
- CreateBugDialog.test.tsx の関連テスト更新を追加

**Diff Summary**:
```diff
- [ ] 1.1 (P) bugStore から useWorktree 関連の削除
    - useWorktree ステート、setUseWorktree アクション、initializeUseWorktree アクションを削除
    - BugWorkflowView からの import と使用箇所を削除
-   - 他のコンポーネント（CreateBugDialog 等）への影響を確認し、必要に応じて修正
+   - CreateBugDialog から useWorktree/setUseWorktree の使用を削除
+   - CreateBugDialog の「Worktreeモードで作成」スイッチ UI を削除
+   - CreateBugDialog.test.tsx の関連テストを更新
    - _Requirements: 9.1, 9.2, 9.3_
```

#### design.md

**Issue(s) Addressed**: W-003

**Changes**:
- useConvertBugToWorktree の Implementation Notes に変換成功後のリフレッシュ方法を追記

**Diff Summary**:
```diff
  **Implementation Notes**
  - Integration: useConvertToWorktree を参考に Bug 用に実装
  - Validation: selectedBug が null の場合は早期リターン
  - Risks: IPC 呼び出し失敗時のエラーハンドリングが必要
+ - Refresh: 変換成功後は `bugStore.selectBug(selectedBug, { silent: true })` を呼び出して詳細をリフレッシュする
```

---

_Fixes applied by document-review-reply command._
