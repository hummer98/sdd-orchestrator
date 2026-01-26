# Bug Fix: remote-ui-spec-list-agent-count

## Summary
Remote UIのSpecsViewにuseSharedAgentStoreを追加し、SpecListItemにrunningAgentCountプロパティを渡すよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `src/remote-ui/views/SpecsView.tsx` | useSharedAgentStoreをインポートし、getRunningAgentCount関数を追加、SpecListItemにrunningAgentCountを渡す |

### Code Changes

```diff
--- a/electron-sdd-manager/src/remote-ui/views/SpecsView.tsx
+++ b/electron-sdd-manager/src/remote-ui/views/SpecsView.tsx
@@ -18,6 +18,7 @@ import { SpecListItem } from '@shared/components/spec/SpecListItem';
 import { Spinner } from '@shared/components/ui/Spinner';
 import { useSpecListLogic } from '@shared/hooks';
+import { useSharedAgentStore } from '@shared/stores/agentStore';
 import type { ApiClient, SpecMetadataWithPath } from '@shared/api/types';

 export function SpecsView({
@@ -50,6 +51,17 @@ export function SpecsView({
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

+  // remote-ui-spec-list-agent-count: Use shared agentStore for running agent counts
+  const { getAgentsForSpec } = useSharedAgentStore();
+
   const { filteredSpecs, searchQuery, setSearchQuery } = useSpecListLogic({
     specs,
     enableTextSearch: true,
   });

+  // remote-ui-spec-list-agent-count: Get running agent count for a spec
+  const getRunningAgentCount = useCallback(
+    (specName: string): number => {
+      const agents = getAgentsForSpec(specName);
+      return agents.filter((a) => a.status === 'running').length;
+    },
+    [getAgentsForSpec]
+  );
+
   // ... (unchanged code)

@@ -217,6 +229,7 @@ export function SpecsView({
                     isSelected={selectedSpecId === specWithPhase.name}
                     onSelect={() => originalSpec && handleSelectSpec(originalSpec)}
                     worktree={worktree}
+                    runningAgentCount={getRunningAgentCount(specWithPhase.name)}
                   />
```

## Implementation Notes

BugsView.tsxで確立された既存パターンに従い実装:

1. `useSharedAgentStore`フックから`getAgentsForSpec`を取得
2. `getRunningAgentCount`ヘルパー関数を`useCallback`でメモ化して作成
3. `SpecListItem`に`runningAgentCount`プロパティとして渡す

BugsViewとの違い:
- BugsViewは`bug:${bugName}`プレフィックス付きでエージェントを取得
- SpecsViewはspec名をそのまま使用してエージェントを取得

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. SpecsView.tsxの`useSharedAgentStore`インポートを削除
2. `getAgentsForSpec`と`getRunningAgentCount`関数を削除
3. SpecListItemから`runningAgentCount`プロパティを削除

## Related Commits
- *Pending commit*
