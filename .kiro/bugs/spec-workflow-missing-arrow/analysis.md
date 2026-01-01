# Bug Analysis: spec-workflow-missing-arrow

## Summary
Specワークフローの右ペインで、以下の問題がある：
1. タスク（tasks）フェーズとDocumentReviewPanelの間に矢印がない
2. 実装（impl）フェーズとInspectionPanelの間に矢印がない
3. InspectionPanelが条件付きで非表示になる（他のパネルと一貫性がない）

## Root Cause

### Technical Details
- **Location**: [WorkflowView.tsx:521-582](electron-sdd-manager/src/renderer/components/WorkflowView.tsx#L521-L582)
- **Component**: WorkflowView
- **Trigger**:
  1. パネルの前に矢印が配置されていない
  2. InspectionPanelのみ表示条件が厳格（タスク進捗100%必須）

### 問題の構造

**現在のDocumentReviewPanel**（正しいパターン）:
```tsx
{phase === 'tasks' && (
  <DocumentReviewPanel ... />
)}
```
→ パネルは常に表示、ボタンの有効/無効で制御

**現在のInspectionPanel**（問題のパターン）:
```tsx
{phase === 'impl' && phaseStatuses.tasks === 'approved' && specDetail.taskProgress?.percentage === 100 && (
  <InspectionPanel ... />
)}
```
→ パネル自体が条件付きで非表示（一貫性がない）

### 矢印の欠落
両パネルの前に矢印（ArrowDown）がない。

## Impact Assessment
- **Severity**: Low（視覚的な問題のみ、機能への影響なし）
- **Scope**: Specワークフロー画面のUI表示
- **Risk**: ワークフローの視覚的な接続関係が不明確、UIの一貫性欠如

## Proposed Solution

### 修正1: DocumentReviewPanelの前に矢印を追加
```tsx
{/* Arrow to DocumentReviewPanel */}
{phase === 'tasks' && (
  <div className="flex justify-center py-1">
    <ArrowDown className="w-4 h-4 text-gray-400" />
  </div>
)}

{/* DocumentReviewPanel */}
{phase === 'tasks' && (
  <div className="my-3">
    <DocumentReviewPanel ... />
  </div>
)}
```

### 修正2: InspectionPanelを常に表示 + 矢印追加

**WorkflowView.tsx**: 表示条件を簡略化
```tsx
{/* Arrow to InspectionPanel */}
{phase === 'impl' && (
  <div className="flex justify-center py-1">
    <ArrowDown className="w-4 h-4 text-gray-400" />
  </div>
)}

{/* InspectionPanel - 常に表示、ボタンの有効/無効で制御 */}
{phase === 'impl' && (
  <div className="my-3">
    <InspectionPanel
      inspectionState={inspectionState}
      isExecuting={isInspectionExecuting}
      isAutoExecuting={isAutoExecuting}
      autoExecutionFlag={...}
      canExecuteInspection={phaseStatuses.tasks === 'approved' && specDetail.taskProgress?.percentage === 100}
      onStartInspection={handleStartInspection}
      onExecuteFix={handleExecuteInspectionFix}
      onAutoExecutionFlagChange={handleInspectionAutoExecutionFlagChange}
    />
  </div>
)}
```

**InspectionPanel.tsx**: 新しいprop `canExecuteInspection` を追加
- `canExecuteInspection`がfalseの場合、ボタンを無効化
- パネル自体は常に表示

## Dependencies
- [WorkflowView.tsx](electron-sdd-manager/src/renderer/components/WorkflowView.tsx)
- [InspectionPanel.tsx](electron-sdd-manager/src/renderer/components/InspectionPanel.tsx)

## Testing Strategy
1. 単体テスト:
   - 各パネル表示条件時に矢印が表示されることを確認
   - InspectionPanelが常に表示されることを確認
   - タスク進捗100%未満でボタンが無効化されることを確認
2. E2Eテスト: ワークフローUI表示を確認
3. 視覚確認:
   - タスク → (矢印) → DocumentReview → (矢印) → 実装
   - 実装 → (矢印) → Inspection → (矢印) → デプロイ
