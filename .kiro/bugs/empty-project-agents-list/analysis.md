# Bug Analysis: empty-project-agents-list

## Summary
プロジェクト未選択時に「プロジェクトエージェントなし」という空のProjectAgentPanelが表示され、ユーザーに違和感を与えている。プロジェクトが選択されていない状態ではエージェントの概念自体が存在しないため、パネル自体を非表示にすべき。

## Root Cause
`ProjectAgentPanel`は「project-agent-panel-always-visible」機能の一環として、常に表示されるよう設計されている。しかし、この「常に表示」はプロジェクト選択済みの状態を前提としており、プロジェクト未選択時の表示制御が考慮されていない。

### Technical Details
- **Location**: [App.tsx:560-567](electron-sdd-manager/src/renderer/App.tsx#L560-L567)
- **Component**: `ProjectAgentPanel`および`App.tsx`のレイアウト部分
- **Trigger**: アプリ起動直後やプロジェクト切り替え中など、`currentProject`が`null`の状態

## Impact Assessment
- **Severity**: Low（機能的には問題なし、UX改善の範疇）
- **Scope**: プロジェクト未選択時のUI表示
- **Risk**: 修正による副作用リスクは低い

## Related Code
```tsx
// App.tsx:560-567 - ProjectAgentPanelは無条件で表示
{/* 5. ProjectAgentPanel (下部固定、リサイズ可能) */}
<div
  style={{ height: projectAgentPanelHeight }}
  className="shrink-0 overflow-hidden"
  data-testid="project-agent-panel-container"
>
  <ProjectAgentPanel />
</div>
```

```tsx
// 比較: DocsTabs:551-555 - currentProject条件付きで表示
{currentProject && kiroValidation?.exists && (
  <div className="flex-1 overflow-hidden">
    <DocsTabs />
  </div>
)}
```

## Proposed Solution

### Option 1: App.tsxでProjectAgentPanelの表示条件を追加
- Description: `currentProject`がある場合のみProjectAgentPanelとリサイズハンドルを表示
- Pros: 修正箇所が1箇所で明確
- Cons: なし

### Option 2: ProjectAgentPanel内部で条件分岐
- Description: `useProjectStore`から`currentProject`を取得し、nullの場合はnullを返す
- Pros: コンポーネント自身で完結
- Cons: 既存の「always-visible」設計意図に反する

### Recommended Approach
**Option 1**を推奨。App.tsxで他のコンポーネント（DocsTabs, ErrorBanner等）と同様に`currentProject`条件を追加することで、一貫性のあるUIを実現できる。

## Dependencies
- [App.tsx](electron-sdd-manager/src/renderer/App.tsx) - レイアウト部分の修正
- リサイズハンドル（line 557-558）も同時に非表示にする必要あり

## Testing Strategy
1. プロジェクト未選択状態でProjectAgentPanelが非表示であることを確認
2. プロジェクト選択後にProjectAgentPanelが表示されることを確認
3. プロジェクト切り替え時の表示/非表示が正しく動作することを確認
4. 既存のE2Eテストが通ることを確認
