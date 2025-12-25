# Bug Fix: empty-project-agents-list

## Summary
プロジェクト未選択時にProjectAgentPanelを非表示にするよう条件分岐を追加

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/App.tsx` | ProjectAgentPanelとリサイズハンドルを`currentProject`条件でラップ |

### Code Changes

```diff
-            {/* 4. ProjectAgentPanel用リサイズハンドル（上方向にリサイズ） */}
-            <ResizeHandle direction="vertical" onResize={handleProjectAgentPanelResize} onResizeEnd={saveLayout} />
-
-            {/* 5. ProjectAgentPanel (下部固定、リサイズ可能) */}
-            <div
-              style={{ height: projectAgentPanelHeight }}
-              className="shrink-0 overflow-hidden"
-              data-testid="project-agent-panel-container"
-            >
-              <ProjectAgentPanel />
-            </div>
+            {/* 4. ProjectAgentPanel用リサイズハンドル（上方向にリサイズ） - プロジェクト選択時のみ表示 */}
+            {currentProject && (
+              <>
+                <ResizeHandle direction="vertical" onResize={handleProjectAgentPanelResize} onResizeEnd={saveLayout} />
+
+                {/* 5. ProjectAgentPanel (下部固定、リサイズ可能) */}
+                <div
+                  style={{ height: projectAgentPanelHeight }}
+                  className="shrink-0 overflow-hidden"
+                  data-testid="project-agent-panel-container"
+                >
+                  <ProjectAgentPanel />
+                </div>
+              </>
+            )}
```

## Implementation Notes
- DocsTabsと同様のパターンで`currentProject`条件を適用
- リサイズハンドルも同時に非表示にすることで、UIの一貫性を維持
- React Fragmentを使用して余分なDOM要素を追加しない

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
App.tsx:557-571の`{currentProject && ( ... )}`条件を削除し、元の無条件表示に戻す

## Related Commits
- *未コミット*

## Test Results
- ProjectAgentPanel.test.tsx: 18/18 テストパス
- TypeScript: コンパイルエラーなし（既存の未使用変数警告のみ）
