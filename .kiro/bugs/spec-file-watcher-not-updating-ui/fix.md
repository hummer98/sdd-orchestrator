# Bug Fix: spec-file-watcher-not-updating-ui

## Summary
specフォルダ内のファイル（requirements.md, design.md, tasks.md等）が外部で更新されてもUIにリアルタイム反映されない問題を修正。

## Root Cause
`unified-project-selection` spec の Task 1.4（Watcher Initialization）が不完全だった。設計ではSELECT_PROJECT IPC内でwatcherを起動することになっていたが、実装ではRenderer側のstartWatching()呼び出しに依存しており、競合状態やHMRでの問題が発生していた。

## Solution
### Approach: Option 2 - Watcher起動をselectProject IPC内に移動

設計どおり、Main processの`SELECT_PROJECT` IPCハンドラー内でwatcherを自動起動するように修正。

### Changes Made

#### 1. handlers.ts - SELECT_PROJECT IPCでwatcher起動
```typescript
// electron-sdd-manager/src/main/ipc/handlers.ts
ipcMain.handle(
  IPC_CHANNELS.SELECT_PROJECT,
  async (event, projectPath: string): Promise<SelectProjectResult> => {
    logger.info('[handlers] SELECT_PROJECT called', { projectPath });
    const result = await selectProject(projectPath);

    // Start file watchers on successful project selection
    // Design: unified-project-selection Task 1.4
    if (result.success) {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        startSpecsWatcher(window);
        startAgentRecordWatcher(window);
        startBugsWatcher(window);
        logger.info('[handlers] File watchers started for project', { projectPath });
      }
    }

    return result;
  }
);
```

#### 2. specStore.ts - リスナー登録のみに変更
```typescript
// electron-sdd-manager/src/renderer/stores/specStore.ts
startWatching: async () => {
  // Clean up existing listener if any
  if (watcherCleanup) {
    watcherCleanup();
    watcherCleanup = null;
  }

  try {
    // Note: Watcher is now started by Main process in SELECT_PROJECT IPC handler
    // (unified-project-selection Task 1.4)
    // Here we only register the event listener

    // Subscribe to change events
    watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
      console.log('[specStore] Specs changed:', event);
      const { selectedSpec } = get();
      const isSelectedSpecChanged = selectedSpec && event.specId === selectedSpec.name;
      if (isSelectedSpecChanged) {
        console.log('[specStore] Selected spec changed, refreshing specDetail:', event.specId);
      }
      get().refreshSpecs();
    });

    set({ isWatching: true });
    console.log('[specStore] Specs change listener registered');
  } catch (error) {
    console.error('[specStore] Failed to register specs change listener:', error);
  }
},
```

#### 3. bugStore.ts - 同様にリスナー登録のみに変更
```typescript
// electron-sdd-manager/src/renderer/stores/bugStore.ts
startWatching: async () => {
  if (watcherCleanup) {
    watcherCleanup();
    watcherCleanup = null;
  }
  try {
    // Note: Watcher is now started by Main process in SELECT_PROJECT IPC handler
    watcherCleanup = window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
      console.log('[bugStore] Bugs changed:', event);
      get().refreshBugs();
    });
    set({ isWatching: true });
    console.log('[bugStore] Bugs change listener registered');
  } catch (error) {
    console.error('[bugStore] Failed to register bugs change listener:', error);
  }
},
```

#### 4. projectStore.ts - コメント更新
```typescript
// Register event listeners for file watchers (File as SSOT)
// Note: Watchers are started by Main process in SELECT_PROJECT IPC handler
// Here we only register the event listeners on Renderer side
await useSpecStore.getState().startWatching();
await useBugStore.getState().startWatching();
```

#### 5. テストの更新
- `bugStore.test.ts`: `mockStartBugsWatcher`の期待値を削除、`mockOnBugsChanged`の期待値を追加
- `BugList.integration.test.tsx`: 同様に更新

## Testing

### Automated Tests
```bash
npx vitest run
# Result: 114 test files passed (2080 tests)
```

### Manual Testing
1. アプリを起動
2. プロジェクトを選択
3. ログで確認:
   ```
   [handlers] SELECT_PROJECT called {"projectPath":"..."}
   [handlers] File watchers started for project {"projectPath":"..."}
   [SpecsWatcherService] Watcher ready
   [BugsWatcherService] Watcher ready
   [AgentRecordWatcherService] Watcher ready
   ```
4. 外部でrequirements.mdを編集・保存
5. ログで検知を確認:
   ```
   [SpecsWatcherService] File event {"type":"change",...}
   [handlers] Specs changed {"event":{...}}
   ```

## Architecture Improvement
この修正により、watcher起動がMain processに統一され、以下が改善:
- **競合状態の解消**: Renderer/Main間の同期問題がなくなった
- **単一責任**: プロジェクト選択時の初期化がすべてMain processで完結
- **HMR耐性**: Renderer側はリスナー登録のみなので、HMRで再登録が可能

## Files Changed
- [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts)
- [specStore.ts](electron-sdd-manager/src/renderer/stores/specStore.ts)
- [bugStore.ts](electron-sdd-manager/src/renderer/stores/bugStore.ts)
- [projectStore.ts](electron-sdd-manager/src/renderer/stores/projectStore.ts) (comment only)
- [bugStore.test.ts](electron-sdd-manager/src/renderer/stores/bugStore.test.ts)
- [BugList.integration.test.tsx](electron-sdd-manager/src/renderer/components/BugList.integration.test.tsx)
