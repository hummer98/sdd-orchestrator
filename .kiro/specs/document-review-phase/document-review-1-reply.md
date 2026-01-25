# Response to Document Review #1

**Feature**: document-review-phase
**Review Date**: 2026-01-25
**Reply Date**: 2026-01-25

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W-1: Remote UI 影響範囲の明確化

**Issue**: Design では「shared/stores の変更に追従するのみ」と記載されているが、具体的にどのコンポーネントが影響を受けるか明記されていない

**Judgment**: **Fix Required** ✅

**Evidence**:
既存コードを確認した結果、以下の Remote UI ファイルで `documentReviewFlag` を参照している:

```typescript
// remote-ui/views/SpecActionsView.tsx:155-156
const documentReviewFlag: DocumentReviewAutoExecutionFlag =
  specDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run';

// remote-ui/views/MobileSpecWorkflowView.tsx:251
documentReviewFlag: specDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run',

// remote-ui/App.tsx:656
documentReviewFlag: selectedSpecDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run',

// remote-ui/hooks/useRemoteWorkflowState.ts:303, 447
documentReviewFlag: specDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run',
documentReviewAutoExecutionFlag: specDetail?.specJson?.autoExecution?.documentReviewFlag ?? 'run',
```

これらのファイルは `documentReviewFlag` の廃止に伴い変更が必要。Design に具体的な影響範囲を記載すべき。

**Action Items**:
- Design の「Remote UI 影響」セクションに具体的な変更対象ファイルリストを追記
- 影響を受けるファイル:
  - `remote-ui/views/SpecActionsView.tsx`
  - `remote-ui/views/MobileSpecWorkflowView.tsx`
  - `remote-ui/App.tsx`
  - `remote-ui/hooks/useRemoteWorkflowState.ts`

---

### W-2: Open Question OQ-1 の解決

**Issue**: `execute-spec-merge` イベントも同様に統一すべきか？という Open Question が Design で検討・決定されていない

**Judgment**: **Fix Required** ✅

**Evidence**:
Design を確認した結果、この問題は言及されていない。ただし、`execute-spec-merge` は inspection 完了後に呼ばれるイベントであり、フェーズ実行とは異なる性質を持つ（マージ操作は自動実行フローとは独立したアクション）。

コードを確認:
```typescript
// autoExecutionCoordinator.ts
'execute-spec-merge': (specPath: string, context: { specId: string }) => void;
```

このイベントは inspection 完了後のマージ操作用であり、フェーズ遷移の一部ではない。本仕様のスコープ外として明記すべき。

**Action Items**:
- Requirements の Open Questions に回答を追記（スコープ外として決定）
- Design の Non-Goals に `execute-spec-merge` イベントの統一を追加

---

### W-3: UI コンポーネントの具体化

**Issue**: Tasks 7.1, 7.2 に変更対象ファイルパスを追記すべき

**Judgment**: **Fix Required** ✅

**Evidence**:
既存コードを確認した結果、`documentReviewFlag` 関連の UI コードは以下に存在:

```typescript
// renderer/stores/workflowStore.ts:53
documentReviewFlag: workflowState.documentReviewOptions.autoExecutionFlag,

// renderer/stores/workflowStore.ts:122-128
export type DocumentReviewAutoExecutionFlag = 'run' | 'pause';
export interface DocumentReviewOptions {
  autoExecutionFlag: DocumentReviewAutoExecutionFlag;
}

// renderer/hooks/useElectronWorkflowState.ts:279
documentReviewFlag: workflowStore.documentReviewOptions.autoExecutionFlag,

// renderer/stores/spec/specDetailStore.ts:230-238
if (specJson.autoExecution.documentReviewFlag) {
  documentReviewOptions: {
    autoExecutionFlag: specJson.autoExecution.documentReviewFlag,
  };
  ...
  documentReviewFlag: specJson.autoExecution.documentReviewFlag,
}
```

permissions トグル UI は workflowStore の `toggleAutoPermission` で管理されており、既存の `permissions.inspection` と同様のパターンで `permissions.documentReview` を追加可能。

**Action Items**:
- Tasks 7.1 に変更対象ファイルパスを追記:
  - `renderer/stores/workflowStore.ts` - documentReviewOptions, setDocumentReviewAutoExecutionFlag 削除
  - `renderer/hooks/useElectronWorkflowState.ts` - documentReviewFlag 参照削除
  - `renderer/stores/spec/specDetailStore.ts` - documentReviewFlag 参照削除
- Tasks 7.2 に参照すべきパターンの場所を追記:
  - `renderer/stores/workflowStore.ts` の `toggleAutoPermission` メソッド
  - `renderer/stores/workflowStore.ts` の `DEFAULT_AUTO_EXECUTION_PERMISSIONS`

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-1 | product.md 更新の検討 | No Fix Needed | 実装完了後に steering 更新を検討する運用事項であり、本仕様の範囲外。実装後タスクとして別途対応 |
| S-2 | ロールバック戦略 | No Fix Needed | マイグレーションは読み込み時に透過的に実行され、書き込みは明示的な update 時のみ。破壊的変更がないため、明示的なロールバック手順は不要 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | W-1: Remote UI 影響セクションに具体的ファイルリスト追加、W-2: Non-Goals に execute-spec-merge 統一を追加 |
| requirements.md | W-2: Open Questions に回答を追記 |
| tasks.md | W-3: Tasks 7.1, 7.2 に具体的ファイルパスを追記 |

---

## Conclusion

3件の Warning すべてについて Fix Required と判断。いずれも仕様ドキュメントの具体性を高めるための修正であり、設計方針の変更は不要。

修正は `--autofix` フラグにより自動適用される。

---

## Applied Fixes

**Applied Date**: 2026-01-25
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | W-1: Remote UI 影響セクションに具体的ファイルリスト追加、W-2: Non-Goals に execute-spec-merge 統一を追加 |
| requirements.md | W-2: Open Questions に回答（スコープ外として決定）を追記 |
| tasks.md | W-3: Tasks 7.1, 7.2 に具体的ファイルパスを追記 |

### Details

#### design.md

**Issue(s) Addressed**: W-1, W-2

**Changes**:
- Non-Goals に `execute-spec-merge` イベントの統一をスコープ外として追加
- Remote UI 影響セクションに具体的な変更対象ファイルリストを追加

**Diff Summary**:
```diff
 ### Non-Goals

 - Remote UI の大幅な変更（shared/stores の変更に追従するのみ）
 ...
 - `run`/`pause` 等の新しいフラグ実装
+- `execute-spec-merge` イベントの統一（本イベントはフェーズ遷移ではなくマージ操作用であり、スコープ外）
```

```diff
 ### Remote UI 影響

 - `shared/stores` と `shared/types` の変更に追従するのみ
 - 専用の変更は不要（既存のpermissions UIパターンを再利用）
+
+**具体的な影響ファイル**:
+
+| ファイルパス | 変更内容 |
+|-------------|---------|
+| `remote-ui/views/SpecActionsView.tsx` | `documentReviewFlag` 参照を `permissions.documentReview` に変更 |
+| `remote-ui/views/MobileSpecWorkflowView.tsx` | `documentReviewFlag` 参照を `permissions.documentReview` に変更 |
+| `remote-ui/App.tsx` | `documentReviewFlag` 参照を `permissions.documentReview` に変更 |
+| `remote-ui/hooks/useRemoteWorkflowState.ts` | `documentReviewFlag` 参照を `permissions.documentReview` に変更 |
+
+これらのファイルでは `specJson.autoExecution.documentReviewFlag` への参照を削除し、`specJson.autoExecution.permissions.documentReview` を使用するように変更する。
```

#### requirements.md

**Issue(s) Addressed**: W-2

**Changes**:
- Open Questions セクションに OQ-1 の回答を追記（スコープ外として決定）

**Diff Summary**:
```diff
 ## Open Questions

-- `execute-spec-merge` イベントも同様に統一すべきか？（現在は inspection 完了後に呼ばれる）
+### OQ-1: `execute-spec-merge` イベントの統一について
+
+**Question**: `execute-spec-merge` イベントも同様に統一すべきか？
+
+**Resolution**: スコープ外として決定
+
+**Rationale**: `execute-spec-merge` は inspection 完了後のマージ操作用イベントであり、フェーズ遷移の一部ではない。
```

#### tasks.md

**Issue(s) Addressed**: W-3

**Changes**:
- Tasks 7.1 に変更対象ファイルパスを追記
- Tasks 7.2 に参照すべきパターンの場所を追記

**Diff Summary**:
```diff
 - [ ] 7.1 (P) documentReviewFlag トグル UI を削除
   - 設定 UI から documentReviewFlag のトグルを削除
   - 関連するコンポーネント参照を削除
+  - **変更対象ファイル**:
+    - `renderer/stores/workflowStore.ts` - `documentReviewOptions`, `setDocumentReviewAutoExecutionFlag` 削除
+    - `renderer/hooks/useElectronWorkflowState.ts` - `documentReviewFlag` 参照削除
+    - `renderer/stores/spec/specDetailStore.ts` - `documentReviewFlag` 参照削除
   - _Requirements: 6.1_
```

```diff
 - [ ] 7.2 (P) permissions.documentReview トグルを追加
   - 既存の permissions トグル UI パターンに従って追加
   - 他のフェーズと同様の GO/NOGO トグルを表示
+  - **参照すべきパターン**:
+    - `renderer/stores/workflowStore.ts` の `toggleAutoPermission` メソッド
+    - `renderer/stores/workflowStore.ts` の `DEFAULT_AUTO_EXECUTION_PERMISSIONS`
+    - `permissions.inspection` の実装パターンと同一
   - _Requirements: 6.2_
```

---

_Fixes applied by document-review-reply command._

