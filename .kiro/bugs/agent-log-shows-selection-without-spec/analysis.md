# Bug Analysis: agent-log-shows-selection-without-spec

## Summary
プロジェクト選択時に、Specが未選択であるにもかかわらず、Agentログパネルに以前選択されていたエージェントが表示され続けるバグ。

## Root Cause
**agentStore**の`selectedAgentId`がプロジェクト選択時にクリアされていない。

### Technical Details
- **Location**: [agentStore.ts:424-426](electron-sdd-manager/src/renderer/stores/agentStore.ts#L424-L426)
- **Component**: agentStore（Zustand store）
- **Trigger**: プロジェクト選択時、または Specs/Bugs タブ切り替え時

### 問題の流れ
1. ユーザーがSpec Aを選択 → Agentを起動 → `selectedAgentId`が設定される
2. 別のプロジェクトを選択 or タブを切り替え
3. `specStore.clearSelectedSpec()`と`bugStore.clearSelectedBug()`は呼ばれるが、`agentStore.selectAgent(null)`は呼ばれない
4. AgentLogPanelは`selectedAgentId`を参照して以前のAgentを表示し続ける

### 関連コード箇所
1. **DocsTabs.tsx:57-63** - タブ切り替え時にSpec/Bug選択をクリアするが、Agent選択はクリアしない
2. **projectStore.ts:117-208** - `selectProject`でSpec/Bugを更新するが、Agent選択はリセットしない
3. **agentStore.ts:424-426** - 新規Agent追加時に自動選択する（正常動作）

## Impact Assessment
- **Severity**: Medium
- **Scope**: Specs/Bugsタブ切り替え時、およびプロジェクト切り替え時
- **Risk**: ユーザーが混乱する（無関係なAgentログが表示される）

## Related Code
```typescript
// DocsTabs.tsx:57-63 - Agent選択のクリアが欠落
const handleTabChange = (tabId: DocsTab) => {
  if (tabId === 'specs') {
    clearSelectedBug();
  } else {
    clearSelectedSpec();
  }
  // ← ここで agentStore.selectAgent(null) が必要
  onTabChange(tabId);
};
```

```typescript
// agentStore.ts - selectAgent関数は既に存在
selectAgent: async (agentId: string | null) => {
  set({ selectedAgentId: agentId });
  // ...
},
```

## Proposed Solution

### Option 1: DocsTabs.tsxでAgent選択をクリア
- Description: タブ切り替え時に`agentStore.selectAgent(null)`を呼び出す
- Pros: シンプル、影響範囲が限定的
- Cons: Specs/Bugs切り替えでのみ有効、プロジェクト選択時は別途対応が必要

### Option 2: projectStore.tsでAgent選択をクリア（推奨）
- Description: `selectProject`関数でスペック/バグの更新と同時にAgent選択もクリア
- Pros: プロジェクト選択時に確実にクリア、一箇所で管理可能
- Cons: storeの依存関係が増える

### Recommended Approach
**Option 1 + Option 2の組み合わせ**:
1. `DocsTabs.tsx`のタブ切り替え時に`agentStore.selectAgent(null)`を追加
2. `projectStore.ts`の`selectProject`でも`agentStore.selectAgent(null)`を追加

これにより、タブ切り替え時とプロジェクト選択時の両方で確実にAgent選択がリセットされる。

## Dependencies
- [agentStore.ts](electron-sdd-manager/src/renderer/stores/agentStore.ts) - `selectAgent`関数
- [DocsTabs.tsx](electron-sdd-manager/src/renderer/components/DocsTabs.tsx) - タブ切り替えハンドラ
- [projectStore.ts](electron-sdd-manager/src/renderer/stores/projectStore.ts) - プロジェクト選択処理

## Testing Strategy
1. プロジェクトを選択し、Specを選択してAgentを起動
2. 別のプロジェクトを選択
3. Agentログパネルに「Agentを選択してください」が表示されることを確認
4. Specsタブで Agentを起動後、Bugsタブに切り替え
5. Agentログパネルに「Agentを選択してください」が表示されることを確認
