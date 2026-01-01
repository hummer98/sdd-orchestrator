# Bug Fix: spec-workflow-missing-arrow

## Summary
Specワークフロー右ペインのDocumentReviewPanelとInspectionPanelの前に矢印を追加し、InspectionPanelを常に表示するように変更（ボタンの有効/無効で制御）

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | DocumentReviewPanelとInspectionPanelの前に矢印を追加、InspectionPanelの表示条件を簡略化 |
| `electron-sdd-manager/src/renderer/components/InspectionPanel.tsx` | `canExecuteInspection` propを追加、ボタンの有効/無効制御に使用 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.test.tsx` | InspectionPanelの新しい動作に合わせてテストを修正 |

### Code Changes

**WorkflowView.tsx - DocumentReviewPanelの前に矢印追加**
```diff
+            {/* Arrow to DocumentReviewPanel */}
+            {phase === 'tasks' && (
+              <div className="flex justify-center py-1">
+                <ArrowDown className="w-4 h-4 text-gray-400" />
+              </div>
+            )}
+
             {/* Task 6.3: Document Review Panel (between tasks and impl) */}
```

**WorkflowView.tsx - InspectionPanelの前に矢印追加 + 常に表示**
```diff
+            {/* Arrow to InspectionPanel */}
+            {phase === 'impl' && (
+              <div className="flex justify-center py-1">
+                <ArrowDown className="w-4 h-4 text-gray-400" />
+              </div>
+            )}
+
             {/* Task 4: InspectionPanel (after impl, before deploy) */}
             {/* Requirements: 3.1, 3.2, 3.3, 3.4, 3.5 */}
-            {/* Show InspectionPanel when:
-                1. Current phase is 'impl'
-                2. Tasks are approved (phaseStatuses.tasks === 'approved')
-                3. Task progress is 100%
-            */}
-            {phase === 'impl' && phaseStatuses.tasks === 'approved' && specDetail.taskProgress?.percentage === 100 && (
+            {/* Bug fix: Always show panel, control button enabled state via canExecuteInspection prop */}
+            {phase === 'impl' && (
               <div className="my-3">
                 <InspectionPanel
                   ...
+                  canExecuteInspection={phaseStatuses.tasks === 'approved' && specDetail.taskProgress?.percentage === 100}
                 />
               </div>
             )}
```

**InspectionPanel.tsx - canExecuteInspection prop追加**
```diff
 export interface InspectionPanelProps {
   ...
+  /** Whether inspection can be executed (tasks approved and 100% complete) */
+  canExecuteInspection?: boolean;
   ...
 }

 export function InspectionPanel({
   ...
+  canExecuteInspection = true,
   ...
 }: InspectionPanelProps) {
-  // Buttons are disabled when executing or auto-executing
-  const canExecute = !isExecuting && !isAutoExecuting;
+  // Buttons are disabled when executing, auto-executing, or inspection not allowed
+  const canExecute = !isExecuting && !isAutoExecuting && canExecuteInspection;
```

## Implementation Notes
- DocumentReviewPanelと同様のパターンを適用（パネル常に表示、ボタン制御）
- 矢印は既存のConnector Arrowと同じスタイル（`ArrowDown`, `w-4 h-4 text-gray-400`）
- テストを新しい動作に合わせて更新（「非表示を確認」→「表示＆ボタン無効を確認」）

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. WorkflowView.tsxのDocumentReviewPanel/InspectionPanel周辺の矢印を削除
2. InspectionPanelの表示条件を元に戻す（`phase === 'impl' && phaseStatuses.tasks === 'approved' && specDetail.taskProgress?.percentage === 100`）
3. InspectionPanel.tsxから`canExecuteInspection` propを削除
4. テストファイルを元に戻す

## Related Commits
- *Pending commit*
