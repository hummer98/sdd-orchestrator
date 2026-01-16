# Bug Fix: remove-agent-header-collapse

## Summary
ProjectAgentPanelのヘッダ部の折り畳み機能を完全に削除。エージェント一覧は常に表示されるようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/ProjectAgentPanel.tsx` | 折り畳み機能を削除 |
| `electron-sdd-manager/src/renderer/components/ProjectAgentPanel.test.tsx` | 折り畳み関連テストを削除 |

### Code Changes

**ProjectAgentPanel.tsx**

1. lucide-reactからChevronDown, ChevronRightインポートを削除:
```diff
-import { Bot, ChevronDown, ChevronRight, StopCircle, PlayCircle, Loader2, CheckCircle, XCircle, AlertCircle, Trash2, MessageSquare } from 'lucide-react';
+import { Bot, StopCircle, PlayCircle, Loader2, CheckCircle, XCircle, AlertCircle, Trash2, MessageSquare } from 'lucide-react';
```

2. ProjectAgentPanelPropsインターフェースとpropsを削除:
```diff
-interface ProjectAgentPanelProps {
-  /** 折りたたみ状態 */
-  collapsed?: boolean;
-  /** 折りたたみ状態変更コールバック */
-  onCollapsedChange?: (collapsed: boolean) => void;
-}
-
-export function ProjectAgentPanel({ collapsed, onCollapsedChange }: ProjectAgentPanelProps) {
+export function ProjectAgentPanel() {
```

3. 折り畳み関連の状態とハンドラを削除:
```diff
-  const [internalCollapsed, setInternalCollapsed] = useState(false);
-  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
-
-  const handleToggleCollapse = () => {
-    const newCollapsed = !isCollapsed;
-    if (onCollapsedChange) {
-      onCollapsedChange(newCollapsed);
-    } else {
-      setInternalCollapsed(newCollapsed);
-    }
-  };
```

4. ヘッダからクリックハンドラとChevronアイコンを削除:
```diff
       <div
         data-testid="project-agent-panel-header"
-        onClick={handleToggleCollapse}
-        className={clsx(
-          'flex items-center gap-2 px-4 py-2 cursor-pointer',
-          'hover:bg-gray-100 dark:hover:bg-gray-800'
-        )}
+        className="flex items-center gap-2 px-4 py-2"
       >
-        {isCollapsed ? (
-          <ChevronRight className="w-4 h-4 text-gray-500" />
-        ) : (
-          <ChevronDown className="w-4 h-4 text-gray-500" />
-        )}
         <Bot className="w-4 h-4 text-gray-500" />
```

5. 条件付きレンダリングを常時表示に変更:
```diff
-      {!isCollapsed && (
-        projectAgents.length === 0 ? (
+      {projectAgents.length === 0 ? (
```

**ProjectAgentPanel.test.tsx**

1. 折り畳み関連テスト（should hide empty state message when collapsed）を削除
2. 「Collapse functionality」describeブロック全体を削除（3テスト）

## Implementation Notes
- パネル自体のリサイズ機能（ResizeHandle経由）は維持
- App.tsxでは元々propsを渡していなかったため変更不要
- 17テストが全てパス

## Breaking Changes
- [x] Breaking changes (documented below)

`ProjectAgentPanel`コンポーネントから`collapsed`と`onCollapsedChange`プロパティが削除された。ただし、App.tsxを含む現在の使用箇所ではこれらのpropsは使用されていなかったため、実際の影響はない。

## Rollback Plan
1. gitでコミットを戻す: `git revert <commit-hash>`

## Related Commits
- *コミット前*
