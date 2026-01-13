# Bug Fix: bugs-agent-list-not-updating

## Summary
preload APIに`switchAgentWatchScope`を追加し、Bug/Spec選択時にIPCを通じてエージェントディレクトリの監視スコープを切り替えるようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/preload/index.ts` | `switchAgentWatchScope` APIを追加 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | `switchAgentWatchScope`の型定義を追加 |
| `electron-sdd-manager/src/renderer/stores/bugStore.ts` | `selectBug`で`switchAgentWatchScope`呼び出しを追加 |
| `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts` | `selectSpec`で`switchAgentWatchScope`呼び出しを追加 |

### Code Changes

**preload/index.ts** - API追加
```diff
+  // agent-watcher-optimization Task 4.2: Switch watch scope for specific spec/bug
+  // Bug fix: bugs-agent-list-not-updating
+  // Called when spec/bug is selected to focus file watcher on that directory
+  switchAgentWatchScope: (scopeId: string | null): Promise<void> =>
+    ipcRenderer.invoke(IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE, scopeId),
```

**electron.d.ts** - 型定義追加
```diff
+  // agent-watcher-optimization Task 4.2: Switch watch scope for specific spec/bug
+  // Bug fix: bugs-agent-list-not-updating
+  // Called when spec/bug is selected to focus file watcher on that directory
+  switchAgentWatchScope(scopeId: string | null): Promise<void>;
```

**bugStore.ts** - selectBugでの呼び出し追加
```diff
   selectBug: async (bug: BugMetadata, options?: { silent?: boolean }) => {
     const silent = options?.silent ?? false;

     if (!silent) {
       set({ selectedBug: bug, isLoading: true, error: null });
     }

     try {
+      // Bug fix: bugs-agent-list-not-updating
+      // Switch agent watcher scope to this bug's directory for real-time updates
+      await window.electronAPI.switchAgentWatchScope(bug.path);
+
       const bugDetail = await window.electronAPI.readBugDetail(bug.path);
```

**specDetailStore.ts** - selectSpecでの呼び出し追加
```diff
   try {
+      // Bug fix: bugs-agent-list-not-updating (also applies to specs)
+      // Switch agent watcher scope to this spec's directory for real-time updates
+      const t0 = performance.now();
+      await window.electronAPI.switchAgentWatchScope(spec.path);
+      timings['switchAgentWatchScope'] = performance.now() - t0;
+
       const t1 = performance.now();
       const specJson = await window.electronAPI.readSpecJson(spec.path);
```

## Implementation Notes
- Main Process側のIPC handler (`handlers.ts:688-695`) は既に実装済みだった
- IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE (`channels.ts:63`) も既に定義済みだった
- 今回の修正はRenderer側からのAPI呼び出しを追加するだけで完了
- Spec選択時も同様の問題があったため、一緒に修正した

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `preload/index.ts`から`switchAgentWatchScope`を削除
2. `electron.d.ts`から型定義を削除
3. `bugStore.ts`の`selectBug`から呼び出しを削除
4. `specDetailStore.ts`の`selectSpec`から呼び出しを削除

## Related Commits
- *To be added after commit*
