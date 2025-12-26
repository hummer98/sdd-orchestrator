# Bug Analysis: bugs-tab-agent-list-missing

## Summary
BugsタブでBugアイテムを選択した際、右ペイン上部のAgent一覧パネル（`AgentListPanel`）が表示されない。根本的には、App.tsxがselectedSpec/selectedBugを直接参照して条件分岐しており、責務が分散している設計上の問題がある。

## Root Cause
1. **直接的原因**: `AgentListPanel`が`useSpecStore`の`selectedSpec`のみを参照し、Bug選択時に`return null`で非表示になる
2. **設計上の問題**: App.tsxが`selectedSpec`/`selectedBug`を直接参照して条件分岐しており、各コンポーネントがSpecs/Bugsのタブ選択状態を気にする必要がある

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/App.tsx:589-658`
- **Component**: `App.tsx`のメイン領域レンダリング
- **Trigger**: Bugsタブでバグアイテムを選択すると、`AgentListPanel`が`selectedSpec === null`で早期リターン

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bugsタブ使用時のAgent一覧表示機能
- **Risk**: Bug修正ワークフローでのAgent管理ができない

## Implemented Solution

### アーキテクチャ変更: SpecPane / BugPane コンポーネント導入

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
    ├── SpecPane: Spec選択状態を管理、ArtifactEditor + AgentListPanel + WorkflowView
    └── BugPane: Bug選択状態を管理、BugArtifactEditor + BugAgentListPanel + BugWorkflowView
```

### 実施した変更

1. **DocsTabs.tsx**: Controlled componentに変更
   - `activeTab`と`onTabChange`をpropsとして受け取る
   - 内部の`useState`を削除

2. **SpecPane.tsx**: 新規作成
   - Spec用のMain+Right paneを統合
   - `ArtifactEditor` + `AgentListPanel` + `WorkflowView`をラップ

3. **BugPane.tsx**: 新規作成
   - Bug用のMain+Right paneを統合
   - `BugArtifactEditor` + `BugAgentListPanel` + `BugWorkflowView`をラップ

4. **BugAgentListPanel.tsx**: 新規作成
   - AgentListPanelのBug版
   - `useBugStore`の`selectedBug`を参照
   - specIdは`bug:{bugName}`形式

5. **App.tsx**: タブベースの切り替えに変更
   - `activeTab`状態を管理
   - `DocsTabs`にpropsを渡す
   - メイン領域の条件分岐をタブベースに変更

6. **テスト更新**: DocsTabs.test.tsx, DocsTabs.integration.test.tsx
   - `DocsTabsWrapper`を追加してcontrolled componentをテスト

### メリット
- タブ選択とアイテム選択の責務が分離
- 各Paneが自身の選択状態のみを管理
- AgentListPanelがSpec/Bugを意識する必要がなくなる

## Files Changed
- `electron-sdd-manager/src/renderer/components/DocsTabs.tsx` - Controlled componentに変更
- `electron-sdd-manager/src/renderer/components/SpecPane.tsx` - 新規作成
- `electron-sdd-manager/src/renderer/components/BugPane.tsx` - 新規作成
- `electron-sdd-manager/src/renderer/components/BugAgentListPanel.tsx` - 新規作成
- `electron-sdd-manager/src/renderer/components/index.ts` - Export追加
- `electron-sdd-manager/src/renderer/App.tsx` - タブベースの切り替えに変更
- `electron-sdd-manager/src/renderer/components/DocsTabs.test.tsx` - テスト更新
- `electron-sdd-manager/src/renderer/components/DocsTabs.integration.test.tsx` - テスト更新
- `electron-sdd-manager/src/renderer/components/SpecPane.test.tsx` - 新規作成
- `electron-sdd-manager/src/renderer/components/BugPane.test.tsx` - 新規作成
- `electron-sdd-manager/src/renderer/components/BugAgentListPanel.test.tsx` - 新規作成

## Testing Strategy
1. ✅ TypeScriptビルド成功
2. ✅ DocsTabsのユニットテスト通過 (20テスト)
3. ✅ DocsTabsの統合テスト通過 (16テスト)
4. ✅ SpecPaneのユニットテスト通過 (8テスト)
5. ✅ BugPaneのユニットテスト通過 (8テスト)
6. ✅ BugAgentListPanelのユニットテスト通過 (18テスト)
7. ✅ 視覚的確認：Bugsタブ選択時にBugAgentListPanelが表示されることを確認
