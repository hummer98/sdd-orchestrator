# Bug Analysis: auto-execution-settings-not-persisted

## Summary
自動実行設定（permissions, validationOptions, documentReviewFlag）がSpec毎に保存されず、他のSpecを選択して戻ると設定がデフォルトに戻る。

## Root Cause

### Technical Details
- **Location**:
  - [workflowStore.ts:230-248](electron-sdd-manager/src/renderer/stores/workflowStore.ts#L230-L248) - UI操作時のトグル処理
  - [AutoExecutionService.ts:140-161](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L140-L161) - 復帰処理のみ実装
- **Component**: workflowStore, AutoExecutionService
- **Trigger**: 自動実行設定を変更後、他のSpecを選択して戻る

### 問題の詳細

1. **片方向の同期のみ実装**:
   - `syncFromSpecAutoExecution()`: spec.json → workflowStore への同期（Spec選択時に実行）✅ 実装済み
   - workflowStore → spec.json への同期 ❌ **未実装**

2. **現在のデータフロー**:
   ```
   UI変更 → workflowStore（メモリ/LocalStorage）→ ❌ spec.jsonに保存されない
   Spec選択 → spec.json読み込み → workflowStore上書き → デフォルト値に戻る
   ```

3. **期待されるデータフロー**:
   ```
   UI変更 → workflowStore → spec.jsonに保存 ✅
   Spec選択 → spec.jsonから復帰 → workflowStore同期 ✅
   ```

## Impact Assessment
- **Severity**: Medium
- **Scope**: 自動実行設定を使用する全ユーザー
- **Risk**: 設定が保持されないためUX低下、意図しないフェーズの自動実行

## Related Code

### 現在のUI操作ハンドラ（workflowStore）
```typescript
// workflowStore.ts:230-237
toggleAutoPermission: (phase: WorkflowPhase) => {
  set((state) => ({
    autoExecutionPermissions: {
      ...state.autoExecutionPermissions,
      [phase]: !state.autoExecutionPermissions[phase],
    },
  }));
  // ❌ spec.jsonへの保存処理がない
},
```

### 既存の復帰処理（読み込みのみ）
```typescript
// AutoExecutionService.ts:140-161
syncFromSpecAutoExecution(): void {
  const specState = this.getSpecAutoExecutionState();
  // spec.json → workflowStore への同期（片方向のみ）
  workflowStore.setAutoExecutionPermissions(specState.permissions);
  workflowStore.setDocumentReviewOptions({ autoExecutionFlag: specState.documentReviewFlag });
  workflowStore.setValidationOptions(specState.validationOptions);
}
```

## Proposed Solution

### Option 1: workflowStoreのトグル時にspec.jsonへ保存（推奨）
- Description: `toggleAutoPermission`等の操作時に`updateSpecAutoExecutionState()`を呼び出す
- Pros: 即時保存で確実、既存のAPIを活用
- Cons: 各トグル操作でIPC通信が発生

### Option 2: Spec切り替え時に自動保存
- Description: Spec切り替え直前にworkflowStoreの状態をspec.jsonに保存
- Pros: IPC通信回数を削減
- Cons: 保存タイミングが遅れる、異常終了時にデータ損失の可能性

### Recommended Approach
**Option 1**を推奨。理由：
1. 即時保存でデータ損失リスクを最小化
2. 既存の`updateSpecAutoExecutionState()` APIを活用可能
3. workflowStoreのアクションにspec.json保存を追加するシンプルな実装

## Dependencies
- `AutoExecutionService.updateSpecAutoExecutionState()` - 既存API、変更不要
- `workflowStore` - トグルアクションの修正が必要
- `window.electronAPI.updateSpecJson()` - 既存IPC、変更不要

## Testing Strategy
1. 自動実行設定を変更
2. 他のSpecを選択
3. 元のSpecに戻る
4. 設定が保持されていることを確認
5. アプリ再起動後も設定が保持されていることを確認
