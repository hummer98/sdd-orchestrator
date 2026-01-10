# Bug Fix: agent-watcher-missing-dir

## Summary
`AgentRecordWatcherService.start()` でディレクトリを事前作成し、chokidarの監視が確実に機能するようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [agentRecordWatcherService.ts](electron-sdd-manager/src/main/services/agentRecordWatcherService.ts) | `fs` import追加、`start()`メソッドにディレクトリ作成ロジック追加 |

### Code Changes

#### 1. fs import の追加

```diff
 import * as chokidar from 'chokidar';
+import * as fs from 'fs';
 import * as path from 'path';
 import { logger } from './logger';
 // Bug fix: spec-agent-list-not-updating-on-auto-execution
-// Removed fs and AgentRecord imports - no longer reading files in this service
+// Removed AgentRecord imports - no longer reading files in this service
+// Bug fix: agent-watcher-missing-dir - fs import restored for directory creation
```

#### 2. start() メソッドにディレクトリ作成ロジック追加

```diff
   /**
    * Start watching the agents directory
+   * Bug fix: agent-watcher-missing-dir - Ensure directory exists before watching
    */
   start(): void {
     if (this.watcher) {
       logger.warn('[AgentRecordWatcherService] Watcher already running');
       return;
     }

     const agentsDir = path.join(this.projectPath, '.kiro', 'runtime', 'agents');
+
+    // Bug fix: agent-watcher-missing-dir
+    // Ensure directory exists before starting watcher
+    // Without this, chokidar may fail to detect files created after directory creation
+    if (!fs.existsSync(agentsDir)) {
+      fs.mkdirSync(agentsDir, { recursive: true });
+      logger.info('[AgentRecordWatcherService] Created agents directory', { agentsDir });
+    }
+
     logger.info('[AgentRecordWatcherService] Starting watcher', { agentsDir });
```

## Implementation Notes

### アプローチ
- `projectLogger.ts` と同じパターン（`existsSync` + `mkdirSync`）を採用
- `{ recursive: true }` により `.kiro/runtime/` と `.kiro/runtime/agents/` の両方を作成

### なぜこのアプローチか
1. **最小限の変更**: 2-3行の追加のみ
2. **実績あるパターン**: `projectLogger.ts` で同じパターンが使用されている
3. **gitignore対応済み**: `.kiro/runtime` は既に `.gitignore` に含まれている
4. **KISS原則**: シンプルで効果的な解決策

### 代替案（不採用）
- `BugsWatcherService` パターン（親ディレクトリ監視+フィルタ）は過剰な複雑性のため不採用

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `fs` import を削除
2. `start()` メソッドからディレクトリ作成ロジックを削除
3. コメントを元に戻す

## Test Results
- TypeScript型チェック: ✅ PASS
- ユニットテスト: ✅ 関連テストなし（既存の失敗は無関係）

## Related Commits
- *コミット待ち*
