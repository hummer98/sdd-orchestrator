# Bug Analysis: git-view-bugs-tab

## Summary
BugsタブにGitViewが統合されていない。SpecsタブにはCenterPaneContainerによってArtifactEditor/GitView切り替え機能が実装されているが、BugsタブにはArtifactEditorのみが表示されGitViewへの切り替え機能が存在しない。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/BugPane.tsx:74-85`
- **Component**: `BugPane`
- **Trigger**: BugPaneが直接ArtifactEditorをレンダリングしており、CenterPaneContainerを使用していない

**現在の実装 (BugPane.tsx:72-85)**:
```tsx
return (
  <div className="flex-1 flex overflow-hidden">
    {/* Center - Bug Document Editor */}
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <ArtifactEditor
        tabs={BUG_TABS}
        baseName={selectedBug.name}
        placeholder="バグを選択してエディターを開始"
        artifacts={artifacts}
        testId="bug-artifact-editor"
        entityType="bug"
      />
    </div>
    {/* Right resize handle and sidebar */}
```

**対照: SpecPane実装 (SpecPane.tsx:185-197)**:
```tsx
return (
  <div className="flex-1 flex overflow-hidden">
    {/* Center - CenterPaneContainer (ArtifactEditor / GitView switch) */}
    <CenterPaneContainer
      dynamicTabs={dynamicTabs}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      baseName={selectedSpec.name}
      placeholder="仕様を選択してエディターを開始"
      artifacts={artifacts}
      worktreePath={worktreePath}
    />
    {/* Right resize handle and sidebar */}
```

### 不足している実装要素

1. **CenterPaneContainer統合なし**: BugPaneは直接ArtifactEditorをレンダリング
2. **viewMode state管理なし**: SpecPaneには`viewMode`と`handleViewModeChange`が実装されているが、BugPaneには存在しない
3. **worktreePath解決ロジックなし**: SpecPaneには`worktreePath`をuseMemoで解決するロジックがあるが、BugPaneには存在しない
4. **レイアウト永続化なし**: SpecPaneはviewModeをlayoutConfigに保存するが、BugPaneには対応するロジックがない

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bugsタブを使用する全てのユーザー。特にworktreeモードでバグ修正を行うユーザーに影響
- **Risk**:
  - ユーザーはBugsタブでGit差分を確認できない
  - SpecsタブとBugsタブでUX一貫性が欠如
  - worktreeモードで作業しているユーザーがworktree内のgit状態を確認できない

## Related Code

**関連ファイル**:
- `electron-sdd-manager/src/renderer/components/BugPane.tsx` (修正対象)
- `electron-sdd-manager/src/renderer/components/SpecPane.tsx` (参照実装)
- `electron-sdd-manager/src/renderer/components/CenterPaneContainer.tsx` (統合先コンポーネント)
- `electron-sdd-manager/src/renderer/types/bug.ts` (BugMetadata型定義)
- `electron-sdd-manager/src/shared/types/worktree.ts` (hasWorktreePath utility)

**重要な型定義**:
```typescript
// BugMetadata (electron-sdd-manager/src/renderer/types/bug.ts:28-42)
export interface BugMetadata {
  readonly name: string;
  readonly phase: BugPhase;
  readonly updatedAt: string;
  readonly reportedAt: string;
  readonly worktree?: BugWorktreeConfig;  // bug.jsonから読み込まれる
  readonly worktreeBasePath?: string;     // ディレクトリモード用
}

// BugWorktreeConfig (electron-sdd-manager/src/renderer/types/bugJson.ts:20-27)
export interface BugWorktreeConfig {
  path: string;    // 例: ".kiro/worktrees/bugs/git-view-bugs-tab"
  branch: string;  // 例: "bugfix/git-view-bugs-tab"
  created_at: string;
}
```

## Proposed Solution

### Recommended Approach: SpecPaneパターンの適用

**アーキテクチャ整合性**: SpecPaneと同じ設計パターンを適用することで、コードベース全体の一貫性を維持する。

**実装ステップ**:

1. **BugPaneにviewMode state追加**:
   ```typescript
   const [viewMode, setViewMode] = useState<'artifacts' | 'git-diff'>('artifacts');
   ```

2. **handleViewModeChange実装** (レイアウト永続化含む):
   ```typescript
   const handleViewModeChange = useCallback(async (mode: 'artifacts' | 'git-diff') => {
     setViewMode(mode);
     try {
       const currentConfig = await window.electronAPI?.loadLayoutConfig?.();
       if (currentConfig) {
         await window.electronAPI?.saveLayoutConfig?.({ ...currentConfig, viewMode: mode });
       }
     } catch (err) {
       console.error('[BugPane] Failed to save viewMode:', err);
     }
   }, []);
   ```

3. **viewModeの初期化** (mount時にlayoutConfigから読み込み):
   ```typescript
   useEffect(() => {
     const loadViewMode = async () => {
       try {
         const config = await window.electronAPI?.loadLayoutConfig?.();
         if (config?.viewMode) {
           setViewMode(config.viewMode);
         }
       } catch (err) {
         console.error('[BugPane] Failed to load viewMode:', err);
       }
     };
     loadViewMode();
   }, []);
   ```

4. **worktreePath解決ロジック追加**:
   ```typescript
   const worktreePath = useMemo((): string | undefined => {
     const metadata = bugDetail?.metadata;
     if (!metadata?.worktree) {
       return undefined;
     }

     const projectPath = useProjectStore.getState().currentProject;
     if (!projectPath) {
       return undefined;
     }

     const relativePath = metadata.worktree.path;
     if (!relativePath) {
       return undefined;
     }

     return `${projectPath}/${relativePath}`;
   }, [bugDetail?.metadata]);
   ```

5. **CenterPaneContainerで置き換え**:
   ```tsx
   <CenterPaneContainer
     dynamicTabs={[]}  // BugsにはdynamicTabsは不要
     viewMode={viewMode}
     onViewModeChange={handleViewModeChange}
     baseName={selectedBug.name}
     placeholder="バグを選択してエディターを開始"
     artifacts={artifacts}
     worktreePath={worktreePath}
   />
   ```

### アーキテクチャ原則への適合性

- **SSOT (Single Source of Truth)**: bug.json.worktreeフィールドをworktree pathの唯一の情報源とする
- **DRY (Don't Repeat Yourself)**: CenterPaneContainerを再利用し、コード重複を避ける
- **Consistency (一貫性)**: SpecPaneと同じパターンを使用し、UX一貫性を確保
- **Separation of Concerns**: worktree path解決ロジックをBugPaneに局所化し、CenterPaneContainerは汎用コンポーネントのまま維持

## Dependencies
- `CenterPaneContainer` (既存コンポーネント、修正不要)
- `useProjectStore` (currentProject取得用)
- `layoutConfigService` (viewMode永続化用、IPC経由)

## Testing Strategy
- BugsタブでGit Diffボタンが表示されることを確認
- Git Diffボタンをクリックして、GitViewに切り替わることを確認
- Ctrl+Shift+G (Cmd+Shift+G on Mac) でArtifacts/Git Diff切り替えが動作することを確認
- worktreeモードのバグでは、worktree pathが正しくGitViewに渡されることを確認
- viewMode設定がアプリ再起動後も保持されることを確認
- SpecsタブとBugsタブの間でviewModeが独立して機能することを確認
