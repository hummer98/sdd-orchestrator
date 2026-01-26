# Bug Analysis: remote-ui-spec-list-agent-count

## Summary
Remote UIのSpecsViewでSpecListItemに`runningAgentCount`が渡されておらず、実行中のエージェント数バッジが表示されない。

## Root Cause

SpecsViewコンポーネントはSpecListContainerを使用せず、独自にSpecListItemをレンダリングしているが、`runningAgentCount`プロパティを渡していない。

### Technical Details
- **Location**: `electron-sdd-manager/src/remote-ui/views/SpecsView.tsx:206-211`
- **Component**: SpecsView
- **Trigger**: Specリストの表示時、SpecListItemには`runningAgentCount`が渡されていない

**問題のコード (SpecsView.tsx:204-212)**:
```tsx
return (
  <div key={specWithPhase.name} data-testid={`remote-spec-item-${specWithPhase.name}`}>
    <SpecListItem
      spec={specWithPhase}
      isSelected={selectedSpecId === specWithPhase.name}
      onSelect={() => originalSpec && handleSelectSpec(originalSpec)}
      worktree={worktree}
      // runningAgentCount が渡されていない!
    />
  </div>
);
```

**比較: BugsViewの正しい実装 (BugsView.tsx:91-94)**:
```tsx
const getRunningAgentCount = (bugName: string): number => {
  const agents = getAgentsForSpec(`bug:${bugName}`);
  return agents.filter((a) => a.status === 'running').length;
};
```

BugsViewでは`useSharedAgentStore`から`getAgentsForSpec`を取得し、`getRunningAgentCount`関数を作成してBugListContainerに渡している。

## Impact Assessment
- **Severity**: Low（UI表示の欠落、機能への影響なし）
- **Scope**: Remote UIでSpecを表示するすべてのユーザーに影響
- **Risk**: 修正による副作用リスクは低い

## Related Code
| ファイル | 役割 |
|----------|------|
| `remote-ui/views/SpecsView.tsx:206-211` | 問題箇所：runningAgentCountが未指定 |
| `remote-ui/views/BugsView.tsx:60-62, 91-94` | 参照実装：getAgentsForSpecを使用 |
| `shared/stores/agentStore.ts:212-214` | getAgentsForSpec関数の実装 |
| `shared/components/spec/SpecListItem.tsx:228-236` | バッジ表示UI |

## Proposed Solution

### Option 1: BugsViewパターンを適用（推奨）

BugsViewと同じパターンで、`useSharedAgentStore`から`getAgentsForSpec`を取得し、specごとのrunning agent数を計算してSpecListItemに渡す。

**変更内容**:
1. `useSharedAgentStore`をインポート
2. `getAgentsForSpec`を取得
3. `getRunningAgentCount`関数を作成
4. SpecListItemに`runningAgentCount`を渡す

```tsx
// 1. インポート追加
import { useSharedAgentStore } from '@shared/stores/agentStore';

// 2. コンポーネント内でhookを使用
const { getAgentsForSpec } = useSharedAgentStore();

// 3. helper関数を追加
const getRunningAgentCount = (specName: string): number => {
  const agents = getAgentsForSpec(specName);
  return agents.filter((a) => a.status === 'running').length;
};

// 4. SpecListItemに渡す
<SpecListItem
  spec={specWithPhase}
  isSelected={selectedSpecId === specWithPhase.name}
  onSelect={() => originalSpec && handleSelectSpec(originalSpec)}
  worktree={worktree}
  runningAgentCount={getRunningAgentCount(specWithPhase.name)}
/>
```

- **Pros**: 既存パターンと一貫性あり、共有storeを活用
- **Cons**: なし

### Recommended Approach
**Option 1**を採用。BugsViewで確立されたパターンに従い、一貫性のある実装を行う。

## Dependencies
- `@shared/stores/agentStore` - useSharedAgentStoreフック

## Testing Strategy
1. Electronアプリを起動
2. Specを選択してエージェントを実行
3. Remote UIのSpecsタブでSpecListItemを確認
4. 実行中エージェント数バッジが表示されることを検証
5. エージェント終了後、バッジが消えることを確認
