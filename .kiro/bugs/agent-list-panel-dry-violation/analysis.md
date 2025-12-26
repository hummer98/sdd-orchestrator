# Bug Analysis: agent-list-panel-dry-violation

## Summary
AgentListPanelとBugAgentListPanelは同一機能を持つコンポーネントだが、コピー＆ペーストで作成されたため約310行のコードが完全に重複している。

## Root Cause
BugAgentListPanel作成時に、AgentListPanelをコピーして変数名を変更するアプローチを取ったため、共通化の機会を逃した。

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/components/AgentListPanel.tsx` (319行)
  - `electron-sdd-manager/src/renderer/components/BugAgentListPanel.tsx` (318行)
- **Component**: Agent一覧表示コンポーネント
- **Trigger**: Bugsタブ用のAgent一覧機能追加時

## Impact Assessment
- **Severity**: Low (機能上の問題なし、技術的負債)
- **Scope**: 開発者の保守性のみ
- **Risk**:
  - 片方を修正してもう片方を忘れる可能性
  - テストコードも重複（約500行 x 2）

## Related Code

### 差分は実質3点のみ

| 項目 | AgentListPanel | BugAgentListPanel |
|------|----------------|-------------------|
| Store | `useSpecStore()` | `useBugStore()` |
| specId | `selectedSpec?.name \|\| ''` | `` `bug:${selectedBug.name}` `` |
| testId | `agent-list-panel` | `bug-agent-list-panel` |

### 重複している部分（約310行）
- `formatDateTime()` 関数
- `formatDuration()` 関数
- `STATUS_CONFIG` オブジェクト
- `AgentListItem` / `BugAgentListItem` コンポーネント（名前以外同一）
- 削除確認ダイアログ
- ソートロジック
- 自動選択ロジック

## Proposed Solution

### Option 1: Props化による統合（推奨）
AgentListPanelをpropsで汎用化し、BugAgentListPanelを削除

```tsx
interface AgentListPanelProps {
  specId: string;
  testId?: string;
}

export function AgentListPanel({ specId, testId = 'agent-list-panel' }: AgentListPanelProps) {
  // 共通ロジック
}
```

呼び出し側：
```tsx
// SpecPane.tsx
const { selectedSpec } = useSpecStore();
<AgentListPanel specId={selectedSpec?.name || ''} />

// BugPane.tsx
const { selectedBug } = useBugStore();
<AgentListPanel
  specId={selectedBug ? `bug:${selectedBug.name}` : ''}
  testId="bug-agent-list-panel"
/>
```

- Pros: 最もシンプル、重複完全解消
- Cons: 呼び出し側でstore参照が必要

### Option 2: Wrapper + 共通コンポーネント
BaseAgentListPanelを作成し、両コンポーネントはwrapperとして存続

- Pros: 既存のインポートを変更不要
- Cons: ファイル数が増える

### Recommended Approach
**Option 1** を推奨。シンプルで保守しやすく、DRY原則を完全に満たす。

## Dependencies
- `SpecPane.tsx`: AgentListPanelの呼び出し方変更
- `BugPane.tsx`: BugAgentListPanelからAgentListPanelに変更
- テストファイル: 統合後のテスト方法検討

## Testing Strategy
1. 既存テストをprops対応に更新
2. SpecPane/BugPane両方でAgent一覧が正常表示されることを確認
3. Agent選択、停止、削除が両タブで動作することを確認
