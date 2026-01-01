# Bug Analysis: document-review-auto-reply-not-triggered

## Summary
手動でdocument-reviewを実行した場合、`document-review-reply`が自動実行されない。`document-review` → `document-review-reply`は常にワンセットで実行されるべき。

## Root Cause
2つの問題が組み合わさっている:

### 問題1: 手動実行時のエージェントがトラッキングされない
`AutoExecutionService`はエージェントのトラッキングを`agentToSpecMap`で管理しているが、**手動実行されたエージェントはこのマップに登録されない**ため、完了イベントを処理できない。

### 問題2: `autoExecutionFlag`による不要な条件分岐
`handleDocumentReviewCompletedForContext`で`autoExecutionFlag === 'run'`をチェックしているが、`document-review` → `document-review-reply`はワンセットで実行されるべきであり、このチェックは不要。

### Technical Details
- **Location 1**: [AutoExecutionService.ts:606-637](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L606-L637) - エージェントトラッキング
- **Location 2**: [AutoExecutionService.ts:862-867](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L862-L867) - 不要な条件分岐
- **Location 3**: [WorkflowView.tsx:313-326](electron-sdd-manager/src/renderer/components/WorkflowView.tsx#L313-L326) - 手動実行ハンドラー
- **Component**: AutoExecutionService, WorkflowView
- **Trigger**: 手動でdocument-reviewを実行後、完了イベントが発火

### Code Flow Analysis

#### 手動実行時のコードパス（現状 - 問題あり）
```
WorkflowView.tsx:handleStartDocumentReview
  → window.electronAPI.executeDocumentReview(...)  // 直接呼び出し
  → エージェントが起動
  → agentToSpecMapには登録されない ❌
  → 完了イベント発火
  → handleDirectStatusChange (line 606)
  → agentToSpecMap.get(agentId) → undefined (line 610)
  → イベントをpendingEventsにバッファリングして無視 (line 614-616)
  → document-review-replyは実行されない ❌
```

#### 自動実行時のコードパス（正常動作）
```
AutoExecutionService.executeDocumentReviewForContext (line 826)
  → window.electronAPI.executeDocumentReview(...)
  → agentToSpecMapにagentIdを登録 (line 839)
  → 完了イベント発火
  → handleDirectStatusChange (line 606)
  → agentToSpecMap.get(agentId) → specId (line 610) ✓
  → handleDocumentReviewCompletedForContext (line 852)
  → autoExecutionFlag === 'run'の場合のみ
  → executeDocumentReviewReplyForContext (line 864)
```

### 関連コード箇所

1. **handleDirectStatusChange** (line 606-664):
   ```typescript
   private handleDirectStatusChange(agentId: string, status: string): void {
     const specId = this.agentToSpecMap.get(agentId);
     if (!specId) {
       // 手動実行時はここで処理が中断される
       this.pendingEvents.set(agentId, status);
       return;
     }
     // ...
   }
   ```

2. **手動実行ハンドラー** (WorkflowView.tsx:313-326):
   ```typescript
   const handleStartDocumentReview = useCallback(async () => {
     await window.electronAPI.executeDocumentReview(...);
     // ← AutoExecutionServiceへの登録処理がない
   }, []);
   ```

3. **不要な条件分岐** (line 862-867):
   ```typescript
   if (documentReviewOptions.autoExecutionFlag === 'run') {
     await this.executeDocumentReviewReplyForContext(context);
   } else {
     this.setStatusForSpec(context.specId, 'paused');  // ← ワンセット実行されない
   }
   ```

## Impact Assessment
- **Severity**: Medium
- **Scope**: document-reviewの手動実行時に影響
- **Risk**: ユーザーが期待するワンセット実行が機能しない

## Proposed Solution

### 修正1: 手動実行時もエージェントをトラッキング

**対象ファイル**: `WorkflowView.tsx`

`handleStartDocumentReview`で`executeDocumentReview`の戻り値からagentIdを取得し、`AutoExecutionService`に登録する。

```typescript
const handleStartDocumentReview = useCallback(async () => {
  if (!specDetail) return;

  try {
    const agentInfo = await window.electronAPI.executeDocumentReview(
      specDetail.metadata.name,
      specDetail.metadata.name,
      workflowStore.commandPrefix
    );

    // 手動実行時もエージェントをトラッキング
    if (agentInfo?.agentId) {
      const autoExecutionService = getAutoExecutionService();
      autoExecutionService.trackManualDocumentReviewAgent(
        agentInfo.agentId,
        specDetail.metadata.name
      );
    }
  } catch (error) {
    notify.error(error instanceof Error ? error.message : 'ドキュメントレビューの実行に失敗しました');
  }
}, [specDetail, workflowStore.commandPrefix]);
```

### 修正2: `autoExecutionFlag`チェックを削除

**対象ファイル**: `AutoExecutionService.ts`

`handleDocumentReviewCompletedForContext`から条件分岐を削除し、常に`document-review-reply`を実行する。

```typescript
private async handleDocumentReviewCompletedForContext(context: ExecutionContext): Promise<void> {
  console.log(`[AutoExecutionService] Document review completed for spec ${context.specId}`);

  if (context.timeoutId) {
    clearTimeout(context.timeoutId);
    context.timeoutId = null;
  }

  // document-review -> document-review-reply は常にワンセットで実行
  await this.executeDocumentReviewReplyForContext(context);
}
```

### 修正3: AutoExecutionServiceに手動トラッキング用APIを追加

**対象ファイル**: `AutoExecutionService.ts`

```typescript
/**
 * 手動実行されたdocument-reviewエージェントをトラッキングする
 */
trackManualDocumentReviewAgent(agentId: string, specId: string): void {
  // ExecutionContextがなければ作成
  let context = this.executionContexts.get(specId);
  if (!context) {
    const specStore = useSpecStore.getState();
    if (!specStore.specDetail || specStore.specDetail.metadata.name !== specId) {
      console.warn(`[AutoExecutionService] Cannot track agent: specDetail not available for ${specId}`);
      return;
    }
    context = createExecutionContext({
      specId,
      specDetail: specStore.specDetail,
    });
    this.executionContexts.set(specId, context);
  }

  // エージェントをトラッキング
  this.agentToSpecMap.set(agentId, specId);
  context.trackedAgentIds.add(agentId);
  this.trackedAgentIds.add(agentId);

  console.log(`[AutoExecutionService] Tracking manual document-review agent: ${agentId} -> ${specId}`);

  // バッファリングされたイベントがあれば処理
  const bufferedStatus = this.pendingEvents.get(agentId);
  if (bufferedStatus) {
    this.pendingEvents.delete(agentId);
    this.handleDirectStatusChange(agentId, bufferedStatus);
  }
}
```

## Dependencies
- `AutoExecutionService`: 手動トラッキング用API追加
- `WorkflowView.tsx`: 手動実行ハンドラーの更新

## Testing Strategy
1. **単体テスト**:
   - `trackManualDocumentReviewAgent`のテスト
   - `handleDocumentReviewCompletedForContext`が常に`document-review-reply`を実行することのテスト

2. **結合テスト**:
   - 手動document-review実行 → document-review-reply自動実行
   - 自動実行時も従来通り動作することの確認（二重起動がないこと）

3. **E2Eテスト**:
   - 手動実行での完全なワークフロー実行
