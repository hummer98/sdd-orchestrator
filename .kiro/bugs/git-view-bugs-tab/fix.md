# Bug Fix: git-view-bugs-tab

## Summary
BugsタブにGitView統合機能を追加。SpecPaneと同じパターンを適用し、CenterPaneContainerによるArtifacts/Git Diff切り替え機能を実装。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/BugPane.tsx` | CenterPaneContainer統合、viewMode state管理、worktreePath解決ロジック追加 |
| `electron-sdd-manager/src/renderer/components/CenterPaneContainer.tsx` | tabs/entityType propsを追加してBugsタブに対応 |

### Code Changes

#### 1. Import文の追加・変更

```diff
-import { useMemo } from 'react';
+import { useMemo, useState, useCallback, useEffect } from 'react';
 // bugs-view-unification Task 6.1: Use shared bugStore
 import { useSharedBugStore } from '../../shared/stores/bugStore';
+import { useProjectStore } from '../stores/projectStore';
 import {
-  ArtifactEditor,
   AgentListPanel,
   BugWorkflowView,
   ResizeHandle,
 } from './index';
+import { CenterPaneContainer } from './CenterPaneContainer';
 import type { TabInfo, ArtifactInfo } from './ArtifactEditor';
```

#### 2. viewMode state管理の追加

```diff
 export function BugPane({
   rightPaneWidth,
   agentListHeight,
   onRightResize,
   onAgentListResize,
   onResizeEnd,
 }: BugPaneProps): React.ReactElement {
   // bugs-view-unification Task 6.1: Use shared bugStore
   // Compute selectedBug from bugs + selectedBugId
   const { bugs, selectedBugId, bugDetail } = useSharedBugStore();
   const selectedBug = selectedBugId ? bugs.find(b => b.name === selectedBugId) : null;

+  // Bug fix: git-view-bugs-tab - View mode state (artifacts or git-diff)
+  const [viewMode, setViewMode] = useState<'artifacts' | 'git-diff'>('artifacts');
+
+  // Handle view mode change with layout persistence
+  const handleViewModeChange = useCallback(async (mode: 'artifacts' | 'git-diff') => {
+    setViewMode(mode);
+    // Save to layout config (fire-and-forget for UX)
+    // Read current config first, then update viewMode
+    try {
+      const currentConfig = await window.electronAPI?.loadLayoutConfig?.();
+      if (currentConfig) {
+        await window.electronAPI?.saveLayoutConfig?.({ ...currentConfig, viewMode: mode });
+      }
+    } catch (err) {
+      console.error('[BugPane] Failed to save viewMode:', err);
+    }
+  }, []);
+
+  // Load view mode from layout config on mount
+  useEffect(() => {
+    const loadViewMode = async () => {
+      try {
+        const config = await window.electronAPI?.loadLayoutConfig?.();
+        if (config?.viewMode) {
+          setViewMode(config.viewMode);
+        }
+      } catch (err) {
+        console.error('[BugPane] Failed to load viewMode:', err);
+      }
+    };
+    loadViewMode();
+  }, []);

   // Convert artifacts to ArtifactInfo format
   const artifacts = useMemo((): Record<string, ArtifactInfo | null> | undefined => {
     if (!bugDetail?.artifacts) return undefined;
     return bugDetail.artifacts as Record<string, ArtifactInfo | null>;
   }, [bugDetail?.artifacts]);
```

#### 3. worktreePath解決ロジックの追加

```diff
   // Convert artifacts to ArtifactInfo format
   const artifacts = useMemo((): Record<string, ArtifactInfo | null> | undefined => {
     if (!bugDetail?.artifacts) return undefined;
     return bugDetail.artifacts as Record<string, ArtifactInfo | null>;
   }, [bugDetail?.artifacts]);

+  // Bug fix: git-view-bugs-tab - Resolve worktree path for GitView
+  const worktreePath = useMemo((): string | undefined => {
+    const metadata = bugDetail?.metadata;
+    if (!metadata?.worktree) {
+      return undefined;
+    }
+
+    const projectPath = useProjectStore.getState().currentProject;
+    if (!projectPath) {
+      return undefined;
+    }
+
+    // Resolve relative worktree path to absolute path
+    const relativePath = metadata.worktree.path;
+    if (!relativePath) {
+      return undefined;
+    }
+
+    return `${projectPath}/${relativePath}`;
+  }, [bugDetail?.metadata]);
```

#### 4. CenterPaneContainerへの置き換え

```diff
   return (
     <div className="flex-1 flex overflow-hidden">
-      {/* Center - Bug Document Editor */}
-      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
-        {/* spec-path-ssot-refactor: Changed basePath to baseName */}
-        {/* bug-artifact-content-not-displayed: Add entityType="bug" for correct path resolution */}
-        <ArtifactEditor
-          tabs={BUG_TABS}
-          baseName={selectedBug.name}
-          placeholder="バグを選択してエディターを開始"
-          artifacts={artifacts}
-          testId="bug-artifact-editor"
-          entityType="bug"
-        />
-      </div>
+      {/* Center - CenterPaneContainer (ArtifactEditor / GitView switch) */}
+      {/* Bug fix: git-view-bugs-tab - Replace direct ArtifactEditor with CenterPaneContainer */}
+      <CenterPaneContainer
+        tabs={BUG_TABS}
+        dynamicTabs={[]}
+        viewMode={viewMode}
+        onViewModeChange={handleViewModeChange}
+        baseName={selectedBug.name}
+        placeholder="バグを選択してエディターを開始"
+        artifacts={artifacts}
+        entityType="bug"
+        worktreePath={worktreePath}
+      />

       {/* Right resize handle */}
       <ResizeHandle direction="horizontal" onResize={onRightResize} onResizeEnd={onResizeEnd} />
```

#### 5. CenterPaneContainerの拡張（tabs/entityType props追加）

**electron-sdd-manager/src/renderer/components/CenterPaneContainer.tsx**

```diff
 export interface CenterPaneContainerProps {
+  /** Static tabs for ArtifactEditor (optional, defaults to SPEC_TABS) */
+  tabs?: TabInfo[];
   /** Dynamic tabs (document-review, inspection, etc.) */
   dynamicTabs: TabInfo[];
   /** View mode: 'artifacts' | 'git-diff' */
   viewMode: 'artifacts' | 'git-diff';
   /** Callback when viewMode changes */
   onViewModeChange: (mode: 'artifacts' | 'git-diff') => void;
   /** Base name for ArtifactEditor */
   baseName?: string;
   /** Placeholder for ArtifactEditor */
   placeholder?: string;
   /** Artifacts for ArtifactEditor */
   artifacts?: Record<string, ArtifactInfo | null>;
+  /** Entity type for ArtifactEditor path resolution (optional, defaults to 'spec') */
+  entityType?: 'spec' | 'bug';
   /**
    * Worktree path for GitView.
    * When provided, GitView uses this path instead of projectPath for git operations.
    * Use this when viewing git diff for a worktree instead of the main project.
    */
   worktreePath?: string;
 }

 export function CenterPaneContainer({
+  tabs = SPEC_TABS,
   dynamicTabs,
   viewMode,
   onViewModeChange,
   baseName,
   placeholder,
   artifacts,
+  entityType = 'spec',
   worktreePath,
 }: CenterPaneContainerProps): React.ReactElement {
```

```diff
       {/* Content area - conditional rendering based on viewMode */}
       <div className="flex-1 overflow-hidden">
         {viewMode === 'artifacts' ? (
           <ArtifactEditor
-            tabs={SPEC_TABS}
+            tabs={tabs}
             baseName={baseName || ''}
             placeholder={placeholder || '仕様を選択してエディターを開始'}
             dynamicTabs={dynamicTabs}
             artifacts={artifacts}
+            entityType={entityType}
           />
         ) : (
           <GitView workingPath={worktreePath} />
         )}
       </div>
```

## Implementation Notes

### アーキテクチャ整合性
- SpecPaneと同一の設計パターンを適用し、コードベース全体の一貫性を維持
- CenterPaneContainerを再利用することでDRY原則を遵守
- bug.json.worktreeフィールドをSSOT (Single Source of Truth) として利用

### CenterPaneContainerの汎用化
- **課題**: CenterPaneContainerは元々Specs専用で、SPEC_TABSとentityType='spec'がハードコードされていた
- **解決**: tabs/entityType propsを追加し、Specs/Bugs両方で使用可能な汎用コンポーネントに拡張
- **デフォルト値**: 既存のSpecPaneに影響を与えないよう、tabs/entityTypeにデフォルト値を設定
- **BugsタブからはBUG_TABSとentityType='bug'を明示的に渡す**

### viewMode永続化
- layoutConfigServiceを経由してviewMode設定を永続化
- アプリ再起動後も前回のview mode (artifacts/git-diff) が保持される
- SpecsタブとBugsタブで独立したviewMode管理が可能（将来的に個別永続化の余地あり）

### worktreePath解決ロジック
- bugDetail.metadata.worktreeからworktree pathを取得
- projectPathと結合して絶対パスに変換
- GitViewコンポーネントにworktreePathとして渡される

### dynamicTabs
- Bugsタブでは静的タブ (report/analysis/fix/verification) のみ使用
- dynamicTabsは空配列として渡す（SpecsタブのDocument Review/Inspection用機能）

## Breaking Changes
- [x] No breaking changes

既存のBugPaneの表示・動作は維持されており、GitView機能が追加されるのみ。

## Rollback Plan

以下のコミットをrevertすることで元の状態に戻せる:
1. このコミット（BugPane.tsxの変更）をgit revertで取り消す
2. ArtifactEditorを直接レンダリングする元の実装に戻る

緊急時の手動ロールバック手順:
1. `electron-sdd-manager/src/renderer/components/BugPane.tsx`を編集
2. `CenterPaneContainer`を`<div><ArtifactEditor /></div>`に置き換え
3. viewMode関連のstate/callback/effectを削除
4. import文からCenterPaneContainer, useProjectStoreを削除
5. ArtifactEditorをimportに追加

## Related Commits
- *コミット後に記録*
