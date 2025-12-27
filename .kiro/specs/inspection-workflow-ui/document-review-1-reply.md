# Response to Document Review #1

**Feature**: inspection-workflow-ui
**Review Date**: 2025-12-27
**Reply Date**: 2025-12-27

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 4      | 3            | 1             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: マイグレーション/互換性の明確化

**Issue**: 既存spec.jsonの取り扱い方針をDesignに追記する必要がある。レガシーフォールバックの具体的な実装方針が不足している。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design.mdのセクション「Remote UI Compatibility」（L373-392）にレガシー構造のフォールバック処理の擬似コードが記載されているが、以下が不足している：
- 既存spec.jsonの移行は「しない」という明確な方針のセクション化
- レガシー構造を検出した場合のUI上の表示方針

既存コードでは `inspection.passed` を直接参照している（`workflow.ts:121`）：
```typescript
return specJson.inspection?.passed ? 'approved' : 'pending';
```

新構造への移行時に、この既存ロジックとの共存方針を明確にする必要がある。

**Action Items**:
- Design.mdに「既存spec.jsonの取り扱い」セクションを追加
- 「自動マイグレーションなし」の方針を明記
- レガシー構造検出時のフォールバック処理を既存コードベースと整合させて記載

---

## Response to Warnings

### W1: workflowStore拡張タスク欠落

**Issue**: workflowStoreへのinspectionOptions追加タスクが欠落している。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
`workflowStore.ts`を確認すると、既存の`documentReviewOptions`と同様のパターンで`inspectionOptions`を追加する必要があるように見えるが、実際のDesignを確認すると：

- Design.md（L349）: `autoExecutionFlag={workflowStore.inspectionOptions.autoExecutionFlag}`
- しかし、Design.md（L472-473）の「autoExecution.permissions拡張」セクションでは、既存の`autoExecution.permissions.inspection`フィールドを使用することが明記されている

つまり、DocumentReviewの`documentReviewOptions.autoExecutionFlag`とは異なり、Inspectionでは**既存の`autoExecution.permissions.inspection`を使用する設計意図**があると解釈できる。

Design.mdの擬似コード（L349）の`workflowStore.inspectionOptions`は**記載ミス**であり、実際には`autoExecution.permissions.inspection`を参照すべき。

**Action Items**:
- Design.mdの擬似コード（L349）を`specDetail.autoExecution.permissions.inspection`に修正
- workflowStoreへの新規フィールド追加は不要

---

### W2: IPC handlers追加タスク欠落

**Issue**: IPC handlers (startInspection, executeFix, setInspectionAutoExecutionFlag) の追加タスクが明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
`handlers.ts`を調査したところ、Document Review用のIPCハンドラは明確に実装されている：
- `IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW`
- `IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_REPLY`
- `IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_FIX`

Design.mdのシーケンス図（L108-125, L130-145）では、`InspectionPanel → specManagerService`の連携が記載されているが、その中間のIPC層が暗黙的に扱われている。

Tasks.mdでは、Task 3.1-3.2でspecManagerServiceの拡張は記載されているが、IPCハンドラの追加が明示されていない。

**Action Items**:
- Tasks.md Task 3に「3.3 IPC handlersの追加」サブタスクを追加
  - startInspection, executeInspectionFix, setInspectionAutoExecutionFlagのIPCチャンネル定義
  - preload/index.tsへのAPI追加

---

### W3: WebSocketHandler拡張の明記

**Issue**: Remote UI対応としてwebSocketHandler.tsへのInspection関連イベント追加をtasks.mdに記載する必要がある。

**Judgment**: **Fix Required** ✅

**Evidence**:
`webSocketHandler.ts`を調査したところ、Document Review用の以下のインターフェースが定義されている（L147）：
```typescript
executeDocumentReview?(specId: string): Promise<WorkflowResult<AgentInfo>>;
```

Inspection機能についても同様にWorkflowControllerインターフェースの拡張が必要。

**Action Items**:
- Tasks.md Task 6に「6.2 WebSocketHandler拡張」サブタスクを追加
  - WorkflowControllerインターフェースにexecuteInspection追加
  - webSocketHandler.tsにInspectionリクエスト処理を追加

---

### W4: Fix用タスクの追加形式の明確化

**Issue**: Fix実行時のtasks.md更新形式がDesignで定義されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
Requirement 4.1で「inspection-{n}.mdの指摘事項をtasks.mdに追加」と記載されているが、Design.mdでは「tasks.mdにFix用タスクを追加」（L119）とのみ記載されており、具体的なフォーマットが未定義。

既存のDocumentReviewFixフローを参照すると、`specManagerService.ts:1136`の`executeDocumentReviewFix`では、`/kiro:document-review-reply --fix`コマンドを呼び出しており、コマンド側でtasks.mdの更新形式が決定される。

同様にInspectionでも、`/kiro:spec-inspection --fix`相当のコマンドを呼び出し、コマンド側でtasks.md更新形式を決定する設計が適切。

**Action Items**:
- Design.mdの「Fix実行フロー」セクションに、Fix用タスク追加の具体的な形式を追記
- 推奨形式: `- [ ] [INSPECTION-FIX] {指摘事項}` または既存のspec-implタスク形式に統合

---

## Response to Info (Low Priority)

| #  | Issue | Judgment | Reason |
| -- | ----- | -------- | ------ |
| I1 | Agent実行中判定ロジック | No Fix Needed | 既存の`isExecuting`プロップで対応可能。Inspection専用の判定は不要（Task 2.3で`isExecuting`を使用） |
| I2 | ログ出力仕様 | No Fix Needed | 既存のprojectLogger経由でログ出力は標準パターン。明示的な仕様追加は不要 |
| I3 | ラウンド上限 | No Fix Needed | UIは動的レンダリングのため上限不要。極端なケースはスクロールで対応 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | 「既存spec.jsonの取り扱い」セクション追加、擬似コード修正（workflowStore.inspectionOptions → specDetail）、Fix用タスク追加形式の明記 |
| tasks.md | Task 3.3（IPC handlers追加）、Task 6.2（WebSocketHandler拡張）のサブタスク追加 |

---

## Conclusion

Critical 1件、Warning 3件の修正が必要。主な変更点：

1. **Design.md**: レガシー互換性方針のセクション追加、擬似コードの誤記修正、Fix用タスク形式の明記
2. **Tasks.md**: IPC handlers追加タスク（3.3）とWebSocketHandler拡張タスク（6.2）の追加

Warning 1件（workflowStore拡張）は「No Fix Needed」と判定。Design.mdの擬似コードに誤記があり、実際には既存の`autoExecution.permissions.inspection`を使用する設計意図があるため、workflowStoreへの新規フィールド追加は不要。

修正を適用後、`/kiro:spec-impl inspection-workflow-ui`で実装を開始できる。

---

## Applied Fixes

**Applied Date**: 2025-12-27
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | 「Legacy spec.json Handling」セクション追加、擬似コード修正、Fix用タスク追加形式の明記 |
| tasks.md | Task 3.3（IPC handlers追加）、Task 6.1/6.2（WebSocketHandler拡張）の追加 |
| spec.json | documentReview.roundDetails[0].fixApplied を true に設定 |

### Details

#### design.md

**Issue(s) Addressed**: C1, W1, W4

**Changes**:
- 「Legacy spec.json Handling (Migration Policy)」セクションを Non-Goals の後に追加
- レガシー構造の判定条件、Desktop UI/Remote UI での動作、既存ロジックとの共存方針を明記
- 擬似コード（L349付近）の `workflowStore.inspectionOptions.autoExecutionFlag` を `specDetail.autoExecution?.permissions?.inspection` に修正
- 「Fix用タスクの追加形式」サブセクションを Fix実行フロー セクション内に追加
- `[INSPECTION-FIX-{roundNumber}]` タスク形式とその例を明記

**Diff Summary**:
```diff
+ ### Legacy spec.json Handling (Migration Policy)
+
+ **方針**: 既存spec.jsonの自動マイグレーションは行わない。
+ ... (レガシー構造検出時の動作方針を追記)

- autoExecutionFlag={workflowStore.inspectionOptions.autoExecutionFlag}
+ autoExecutionFlag={specDetail.autoExecution?.permissions?.inspection ? 'run' : 'pause'}

+ #### Fix用タスクの追加形式
+
+ Fix実行時にtasks.mdへ追加するタスクは、既存のspec-implタスク形式と統合して以下の形式を使用する：
+ ... (タスク形式の定義と例を追記)
```

#### tasks.md

**Issue(s) Addressed**: W2, W3

**Changes**:
- Task 3に「3.3 IPC handlersの追加」サブタスクを追加
  - IPC_CHANNELSへのチャンネル定義（EXECUTE_INSPECTION等）
  - handlers.tsへのハンドラ実装
  - preload/index.tsへのAPI追加
- Task 6を「6.1 SpecDetail新構造解釈の実装」と「6.2 WebSocketHandler拡張」にサブタスク化
  - WorkflowControllerインターフェース拡張
  - webSocketHandler.tsへのInspectionリクエスト処理追加

**Diff Summary**:
```diff
+ - [ ] 3.3 IPC handlersの追加
+   - IPC_CHANNELSにInspection関連チャンネルを定義する
+   - handlers.tsにstartInspection, executeInspectionFix, setInspectionAutoExecutionFlagのハンドラを実装する
+   - preload/index.tsにInspection用APIを追加する
+   - _Requirements: 4.2, 4.3, 4.5_

- - [ ] 6. (P) Remote UI（SpecDetail）の新構造対応
+ - [ ] 6. (P) Remote UI（SpecDetail）の新構造対応
+ - [ ] 6.1 SpecDetail新構造解釈の実装
    - inspection.roundDetailsが存在する場合は最新ラウンドのpassed値からGO/NOGO状態を判定する
    ... (既存内容を6.1として整理)

+ - [ ] 6.2 WebSocketHandler拡張
+   - WorkflowControllerインターフェースにexecuteInspection, executeInspectionFixメソッドを追加する
+   - webSocketHandler.tsにInspection開始リクエスト（inspection:start）の処理を追加する
+   - webSocketHandler.tsにInspectionFix実行リクエスト（inspection:fix）の処理を追加する
+   - リモートからのInspection状態更新をwebSocket経由でブロードキャストする
+   - _Requirements: 6.1, 6.4_
```

#### spec.json

**Issue(s) Addressed**: (state update)

**Changes**:
- `documentReview.roundDetails[0].fixApplied` を `true` に設定

**Diff Summary**:
```diff
  "roundDetails": [
    {
      "roundNumber": 1,
-     "status": "reply_complete"
+     "status": "reply_complete",
+     "fixApplied": true
    }
  ]
```

---

_Fixes applied by document-review-reply command._
