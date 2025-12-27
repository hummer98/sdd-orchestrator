# Bug Analysis: document-review-auto-flag-trigger

## Summary
ドキュメントレビューの自動実行フラグを変更した際に、予期せずdocument-reviewエージェントが起動する問題。

## Root Cause

### 調査結果

コード分析の結果、**フラグ変更自体がdocument-reviewエージェントを直接起動するコードパスは存在しない**ことを確認しました。

#### フラグ変更時の処理フロー
1. UIで自動実行フラグをクリック
2. `workflowStore.setDocumentReviewAutoExecutionFlag()` が呼ばれる
3. `persistSettingsToSpec()` が呼ばれる → spec.jsonを更新
4. ファイル変更がSpecsWatcherに検出される
5. `refreshSpecs()` → `selectSpec()` → `syncFromSpecAutoExecution()` が呼ばれる

`syncFromSpecAutoExecution()` は workflowStore の設定を更新するだけで、エージェントを起動する処理は含まれていません。

### 推定される原因

以下のいずれかの状況で問題が発生した可能性があります：

1. **自動実行中のフラグ変更**
   - 自動実行が進行中の状態でフラグを変更した場合、タイミングによっては次のフェーズとしてdocument-reviewが起動される可能性がある
   - 特に `handleTasksCompletedForDocumentReview()` の実行中にフラグを変更した場合

2. **レースコンディション**
   - フラグ変更とファイルウォッチャーのイベント処理が競合し、意図しない状態遷移が発生した可能性

3. **validate-design-agentとの混同**
   - `/kiro:validate-design` エージェントが起動した可能性（別のトリガーによる）

### Technical Details
- **Location**:
  - [workflowStore.ts:341-350](electron-sdd-manager/src/renderer/stores/workflowStore.ts#L341-L350) - setDocumentReviewAutoExecutionFlag
  - [workflowStore.ts:27-57](electron-sdd-manager/src/renderer/stores/workflowStore.ts#L27-L57) - persistSettingsToSpec
  - [AutoExecutionService.ts:660-679](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L660-L679) - handleTasksCompletedForDocumentReview
- **Component**: ワークフロー自動実行システム、ドキュメントレビュー統合
- **Trigger**: 不明（追加情報が必要）

## Impact Assessment
- **Severity**: Medium
- **Scope**: 自動実行フラグのUI操作を行うユーザー
- **Risk**: 予期しないエージェント起動によるワークフロー混乱

## Related Code
```typescript
// workflowStore.ts:341-350
setDocumentReviewAutoExecutionFlag: (flag: DocumentReviewAutoExecutionFlag) => {
  set((state) => ({
    documentReviewOptions: {
      ...state.documentReviewOptions,
      autoExecutionFlag: flag,
    },
  }));
  // Persist to spec.json after state update
  persistSettingsToSpec();  // ← spec.jsonへの書き込みがトリガー
},
```

```typescript
// AutoExecutionService.ts:660-679
private async handleTasksCompletedForDocumentReview(): Promise<void> {
  const workflowStore = useWorkflowStore.getState();
  const { documentReviewOptions } = workflowStore;

  // Check if document review should be skipped
  if (documentReviewOptions.autoExecutionFlag === 'skip') {
    // Skip document review, continue to next phase
    ...
  }

  // Execute document review
  await this.executeDocumentReview();  // ← ここでエージェントが起動
}
```

## Proposed Solution

### Option 1: 追加情報の収集
再現手順を明確にするため、以下の情報が必要：
- 自動実行中だったか否か
- どのフェーズで問題が発生したか
- どの自動実行フラグ値から変更したか

### Option 2: ガード条件の追加
自動実行中のフラグ変更を安全に処理するためのガード条件を追加：
- Pros: 競合状態を防止できる
- Cons: コードの複雑性が増す

### Recommended Approach
まず再現手順を確認し、正確なトリガーを特定する。

## Dependencies
- SpecsWatcher（ファイル変更検出）
- AutoExecutionService（自動実行管理）
- workflowStore（設定状態管理）

## Testing Strategy
1. 自動実行中に各フラグ値を変更し、予期しないエージェント起動が発生するか確認
2. フラグ変更のログを追加し、処理フローを追跡
3. E2Eテストで再現を試みる

## 次のステップ
ユーザーに以下を確認：
1. 問題発生時、自動実行は進行中でしたか？
2. 具体的にどのフラグ値（run/pause/skip）から変更しましたか？
3. 起動したエージェントは `/kiro:document-review` でしたか、それとも `/kiro:validate-design` でしたか？
