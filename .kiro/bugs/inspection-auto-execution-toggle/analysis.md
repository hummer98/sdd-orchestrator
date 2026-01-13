# Bug Analysis: inspection-auto-execution-toggle

## Summary
InspectionPanelの自動実行フラグ変更が正しく反映されない。設定変更後に不要な`refreshSpecs()`呼び出しがfile watcherより先に実行され、古い状態でUIが再構築される。

## Root Cause
`handleInspectionAutoExecutionFlagChange`関数が、IPC経由でspec.jsonを更新した直後に`refreshSpecs()`を呼び出している。これにより、ファイル監視（file watcher）がspec.jsonの変更を検知してUIを更新する前に、古いキャッシュ状態でUIが再構築される。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/WorkflowView.tsx:434-447`
- **Component**: WorkflowView / InspectionPanel
- **Trigger**: InspectionPanelの自動実行フラグボタンをクリック

### 問題のあるコード
```typescript
// WorkflowView.tsx:434-447
const handleInspectionAutoExecutionFlagChange = useCallback(async (flag: 'run' | 'pause' | 'skip') => {
  if (!specDetail) return;

  try {
    await window.electronAPI.setInspectionAutoExecutionFlag(
      specDetail.metadata.path,
      flag
    );
    // 問題: refreshSpecs()がfile watcherより先に古い状態を読み込む
    refreshSpecs();
  } catch (error) {
    notify.error(error instanceof Error ? error.message : '自動実行フラグの変更に失敗しました');
  }
}, [specDetail, refreshSpecs]);
```

### 正しい実装パターン（DocumentReviewPanel）
```typescript
// WorkflowView.tsx:562
onAutoExecutionFlagChange={workflowStore.setDocumentReviewAutoExecutionFlag}
```

DocumentReviewPanelは`workflowStore.setDocumentReviewAutoExecutionFlag`を直接使用。このメソッドは：
1. Zustand storeの状態を更新
2. `persistSettingsToSpec()`でspec.jsonに非同期で保存
3. file watcherがspec.json変更を検知してUIを更新

## Impact Assessment
- **Severity**: Medium
- **Scope**: InspectionPanelの自動実行フラグ切り替え機能のみ
- **Risk**: 設定が保存されず、ユーザーが意図した自動実行制御ができない

## Related Code
```typescript
// workflowStore.ts:366-375 - 正しい実装パターン
setDocumentReviewAutoExecutionFlag: (flag: DocumentReviewAutoExecutionFlag) => {
  set((state) => ({
    documentReviewOptions: {
      ...state.documentReviewOptions,
      autoExecutionFlag: flag,
    },
  }));
  // Persist to spec.json after state update
  persistSettingsToSpec();
},
```

## Proposed Solution

### Option 1: workflowStoreに`setInspectionAutoExecutionFlag`メソッドを追加（推奨）
- Description: `setDocumentReviewAutoExecutionFlag`と同様のパターンで`setInspectionAutoExecutionFlag`を実装し、`handleInspectionAutoExecutionFlagChange`を削除
- Pros:
  - DocumentReviewPanelと一貫性のあるアーキテクチャ
  - `refreshSpecs()`の明示的呼び出しが不要
  - file watcherの更新に依存する設計
- Cons:
  - workflowStoreに新しい状態とメソッドを追加する必要がある

### Option 2: `refreshSpecs()`呼び出しを削除し、file watcher依存に変更
- Description: `handleInspectionAutoExecutionFlagChange`から`refreshSpecs()`を削除
- Pros: 最小限の変更で修正可能
- Cons: IPC直接呼び出しパターンが残り、DocumentReviewPanelとの一貫性が欠ける

### Recommended Approach
**Option 1**を推奨。DocumentReviewPanelと同じアーキテクチャパターンを採用することで、コードの一貫性と保守性を向上させる。

修正内容：
1. `workflowStore`に`inspectionAutoExecutionFlag`状態を追加
2. `setInspectionAutoExecutionFlag`メソッドを追加
3. `persistSettingsToSpec()`でInspection設定も保存
4. `WorkflowView.tsx`の`handleInspectionAutoExecutionFlagChange`を削除
5. InspectionPanelに`workflowStore.setInspectionAutoExecutionFlag`を直接渡す

## Dependencies
- `electron-sdd-manager/src/renderer/stores/workflowStore.ts` - 状態とメソッド追加
- `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` - ハンドラ削除とProps変更

## Testing Strategy
1. InspectionPanelの自動実行フラグボタンをクリック
2. UIが正しく更新され、設定が切り替わることを確認
3. アプリを再起動し、設定が永続化されていることを確認
4. file watcher経由でspec.jsonの変更が正しく反映されることを確認
