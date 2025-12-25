# Bug Fix: impl-complete-detection-in-renderer

## Summary
tasks.md の全タスク完了検知をメインプロセス（specsWatcherService）に移動し、アプリ終了時やspec未選択時でもphase更新が正しく行われるよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/specsWatcherService.ts` | FileService依存性を追加、checkTaskCompletionメソッドを実装 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | SpecsWatcherService初期化時にfileServiceを渡すよう修正 |
| `electron-sdd-manager/src/main/services/windowManager.ts` | SpecsWatcherService初期化時にfileServiceを渡すよう修正 |

### Code Changes

#### specsWatcherService.ts - インポートとコンストラクタ
```diff
  import * as chokidar from 'chokidar';
  import * as path from 'path';
+ import { readFile } from 'fs/promises';
  import { logger } from './logger';
+ import type { FileService } from './fileService';

  export class SpecsWatcherService {
    private watcher: chokidar.FSWatcher | null = null;
    private projectPath: string;
    private callbacks: SpecsChangeCallback[] = [];
    private debounceTimer: NodeJS.Timeout | null = null;
    private debounceMs = 300;
+   private fileService: FileService | null = null;

-   constructor(projectPath: string) {
+   constructor(projectPath: string, fileService?: FileService) {
      this.projectPath = projectPath;
+     this.fileService = fileService ?? null;
    }
```

#### specsWatcherService.ts - handleEvent修正
```diff
  private handleEvent(type: SpecsChangeEvent['type'], filePath: string): void {
    const specId = this.extractSpecId(filePath);
    logger.debug('[SpecsWatcherService] File event', { type, filePath, specId });

+   // Check if tasks.md was modified and handle completion detection
+   const fileName = path.basename(filePath);
+   if ((type === 'change' || type === 'add') && fileName === 'tasks.md' && specId) {
+     this.checkTaskCompletion(filePath, specId).catch((error) => {
+       logger.error('[SpecsWatcherService] Failed to check task completion', { error, specId });
+     });
+   }

    // Debounce to avoid multiple rapid events
    ...
  }
```

#### specsWatcherService.ts - checkTaskCompletionメソッド追加
```typescript
/**
 * Check if all tasks in tasks.md are complete and update spec.json phase
 * This runs in the main process, independent of renderer state
 */
private async checkTaskCompletion(tasksFilePath: string, specId: string): Promise<void> {
  if (!this.fileService) {
    logger.debug('[SpecsWatcherService] FileService not available, skipping task completion check');
    return;
  }

  try {
    // Read tasks.md content
    const content = await readFile(tasksFilePath, 'utf-8');

    // Parse task checkboxes (same logic as specStore)
    const completedMatches = content.match(/^- \[x\]/gim) || [];
    const pendingMatches = content.match(/^- \[ \]/gm) || [];
    const total = completedMatches.length + pendingMatches.length;
    const completed = completedMatches.length;

    if (total === 0) {
      return;
    }

    const isAllComplete = completed === total;
    if (!isAllComplete) {
      return;
    }

    // Read current spec.json to check phase
    const specPath = path.dirname(tasksFilePath);
    const specJsonPath = path.join(specPath, 'spec.json');
    const specJsonContent = await readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(specJsonContent);

    if (specJson.phase === 'implementation-complete') {
      return;
    }

    // Update phase to implementation-complete
    await this.fileService.updateSpecJsonFromPhase(specPath, 'impl-complete', { skipTimestamp: true });
  } catch (error) {
    logger.error('[SpecsWatcherService] Failed to check task completion', { specId, error });
  }
}
```

#### handlers.ts
```diff
- specsWatcherService = new SpecsWatcherService(currentProjectPath);
+ specsWatcherService = new SpecsWatcherService(currentProjectPath, fileService);
```

#### windowManager.ts
```diff
+ import { FileService } from './fileService';

  private createWindowServices(windowId: number, projectPath: string): void {
    // ...
    // Create new services
+   const fileService = new FileService();
    const services: PerWindowServices = {
      specManagerService: new SpecManagerService(projectPath),
-     specsWatcherService: new SpecsWatcherService(projectPath),
+     specsWatcherService: new SpecsWatcherService(projectPath, fileService),
      agentRecordWatcherService: new AgentRecordWatcherService(projectPath),
      bugsWatcherService: new BugsWatcherService(projectPath),
    };
  }
```

## Implementation Notes
- **責務移動**: タスク完了検知ロジックをレンダラープロセス（specStore）からメインプロセス（specsWatcherService）に移動
- **既存互換**: specStore の自動修正ロジックは残存（fallback として機能）
- **依存性注入**: FileService をオプショナルパラメータとして注入（後方互換性維持）
- **skipTimestamp**: UI自動修正と同様に `skipTimestamp: true` で updated_at を更新しない

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. specsWatcherService.ts から checkTaskCompletion 関連のコードを削除
2. コンストラクタから fileService パラメータを削除
3. handlers.ts と windowManager.ts で fileService を渡す部分を元に戻す

## Related Commits
- 未コミット（/kiro:bug-verify 後にコミット予定）
