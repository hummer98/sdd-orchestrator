# Bug Fix: bugs-tab-agent-list-missing

## Summary
BugsタブでBug選択時にAgent一覧パネルが表示されない問題を、SpecPane/BugPaneコンポーネントの導入とDocsTabsのControlled Component化により修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/DocsTabs.tsx` | Controlled componentに変更（activeTab, onTabChange props追加） |
| `electron-sdd-manager/src/renderer/components/SpecPane.tsx` | 新規作成 - Spec用のMain+Right pane統合コンポーネント |
| `electron-sdd-manager/src/renderer/components/BugPane.tsx` | 新規作成 - Bug用のMain+Right pane統合コンポーネント |
| `electron-sdd-manager/src/renderer/components/BugAgentListPanel.tsx` | 新規作成 - Bug用のAgent一覧パネル |
| `electron-sdd-manager/src/renderer/components/index.ts` | 新規コンポーネントのexport追加 |
| `electron-sdd-manager/src/renderer/App.tsx` | タブベースの切り替えロジックに変更 |
| `electron-sdd-manager/src/renderer/components/DocsTabs.test.tsx` | DocsTabsWrapperを使用したテストに更新 |
| `electron-sdd-manager/src/renderer/components/DocsTabs.integration.test.tsx` | DocsTabsWrapperを使用したテストに更新 |
| `electron-sdd-manager/src/renderer/components/SpecPane.test.tsx` | 新規作成 - SpecPaneのユニットテスト |
| `electron-sdd-manager/src/renderer/components/BugPane.test.tsx` | 新規作成 - BugPaneのユニットテスト |
| `electron-sdd-manager/src/renderer/components/BugAgentListPanel.test.tsx` | 新規作成 - BugAgentListPanelのユニットテスト |

### Code Changes

**DocsTabs.tsx - Controlled Component化**
```diff
-export function DocsTabs({ className }: DocsTabsProps): React.ReactElement {
-  const [activeTab, setActiveTab] = useState<DocsTab>('specs');
+interface DocsTabsProps {
+  className?: string;
+  activeTab: DocsTab;
+  onTabChange: (tab: DocsTab) => void;
+}
+
+export function DocsTabs({ className, activeTab, onTabChange }: DocsTabsProps): React.ReactElement {
```

**App.tsx - タブベースの切り替え**
```diff
+const [activeTab, setActiveTab] = useState<DocsTab>('specs');
+
 // In render:
-<DocsTabs className="flex-1" />
+<DocsTabs activeTab={activeTab} onTabChange={setActiveTab} className="flex-1" />

 // Main area:
-{selectedSpec ? <SpecView /> : selectedBug ? <BugView /> : placeholder}
+{activeTab === 'specs' ? <SpecPane {...paneProps} /> : <BugPane {...paneProps} />}
```

**BugAgentListPanel.tsx - Bug専用Agent一覧（新規）**
```typescript
export function BugAgentListPanel() {
  const { selectedBug } = useBugStore();
  // Bug agents are stored with specId = "bug:{bugName}"
  const bugId = selectedBug ? `bug:${selectedBug.name}` : '';
  const bugAgents = getAgentsForSpec(bugId);
  // ...
}
```

## Implementation Notes

### アーキテクチャ変更

**変更前の構造**:
```
App.tsx
├── Left: DocsTabs (tabs状態を内部管理)
└── Main+Right: selectedSpec ? SpecView : selectedBug ? BugView : placeholder
    └── 各コンポーネントがselectedSpec/selectedBugを個別参照
```

**変更後の構造**:
```
App.tsx
├── Left: DocsTabs (tabs状態を外部からcontrol)
│   └── activeTab, onTabChange props
└── Main+Right: activeTab === 'specs' ? <SpecPane /> : <BugPane />
    ├── SpecPane: Spec選択状態を管理
    └── BugPane: Bug選択状態を管理、BugAgentListPanelを含む
```

### 設計上のメリット
- タブ選択とアイテム選択の責務が分離
- 各Paneが自身の選択状態のみを管理
- AgentListPanelがSpec/Bugを意識する必要がなくなる

## Breaking Changes
- [x] No breaking changes

DocsTabsはControlled Componentに変更されたが、App.tsx側で適切にpropsを渡すため、外部API的には変更なし。

## Rollback Plan
1. App.tsxのactiveTab状態管理を削除
2. DocsTabsを内部状態管理に戻す
3. SpecPane/BugPane/BugAgentListPanelを削除
4. App.tsxのメイン領域をselectedSpec/selectedBug条件分岐に戻す

## Test Results
- ✅ TypeScriptビルド成功
- ✅ DocsTabsユニットテスト: 20件通過
- ✅ DocsTabs統合テスト: 16件通過
- ✅ SpecPaneユニットテスト: 8件通過
- ✅ BugPaneユニットテスト: 8件通過
- ✅ BugAgentListPanelユニットテスト: 18件通過
- ✅ 視覚的確認: Bugsタブ選択時にBugAgentListPanelが表示されることを確認

## Related Commits
- 78a2cf8 fix(ui): show Agent list panel in Bugs tab when bug is selected
