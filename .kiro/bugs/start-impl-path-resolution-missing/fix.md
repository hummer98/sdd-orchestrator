# Bug Fix: start-impl-path-resolution-missing

## Summary
`START_IMPL` および `AUTO_EXECUTION_START` IPCハンドラーに `spec-path-ssot-refactor` パターンを適用し、specNameからフルパスへの解決処理を追加。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts) | START_IMPL ハンドラーに `resolveSpecPath` を追加 |
| [autoExecutionHandlers.ts](electron-sdd-manager/src/main/ipc/autoExecutionHandlers.ts) | AUTO_EXECUTION_START ハンドラーに `resolveSpecPath` を追加 |
| [autoExecutionHandlers.test.ts](electron-sdd-manager/src/main/ipc/autoExecutionHandlers.test.ts) | モックを追加してテストを修正 |

### Code Changes

#### handlers.ts START_IMPL (行2192-2246)
```diff
  ipcMain.handle(
    IPC_CHANNELS.START_IMPL,
-   async (event, specPath: string, featureName: string, commandPrefix: string) => {
-     logger.info('[handlers] START_IMPL called', { specPath, featureName, commandPrefix });
+   async (event, specName: string, featureName: string, commandPrefix: string) => {
+     logger.info('[handlers] START_IMPL called', { specName, featureName, commandPrefix });
+
+     if (!currentProjectPath) {
+       return {
+         ok: false,
+         error: { type: 'SPEC_JSON_ERROR', message: 'Project not selected' },
+       };
+     }
+
+     // spec-path-ssot-refactor: Resolve path from name
+     const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
+     if (!specPathResult.ok) {
+       logger.error('[handlers] START_IMPL: spec not found', { specName });
+       return {
+         ok: false,
+         error: { type: 'SPEC_JSON_ERROR', message: `Spec not found: ${specName}` },
+       };
+     }
+     const specPath = specPathResult.value;

      const service = getSpecManagerService();
      // ... rest of handler
```

#### autoExecutionHandlers.ts AUTO_EXECUTION_START (行136-162)
```diff
+ import { FileService } from '../services/fileService';
+ import { getCurrentProjectPath } from './handlers';

  // AUTO_EXECUTION_START
+ const fileService = new FileService();
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_START,
    async (_event, params: StartParams): Promise<...> => {
-     logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_START', { specPath: params.specPath });
-     const result = await coordinator.start(params.specPath, params.specId, params.options);
+     logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_START', { specName: params.specPath });
+
+     const projectPath = getCurrentProjectPath();
+     if (!projectPath) {
+       return {
+         ok: false,
+         error: { type: 'PRECONDITION_FAILED', message: 'Project not selected' },
+       };
+     }
+
+     // spec-path-ssot-refactor: Resolve path from name
+     const specPathResult = await fileService.resolveSpecPath(projectPath, params.specPath);
+     if (!specPathResult.ok) {
+       return {
+         ok: false,
+         error: { type: 'SPEC_NOT_FOUND', specPath: params.specPath },
+       };
+     }
+     const resolvedSpecPath = specPathResult.value;
+
+     const result = await coordinator.start(resolvedSpecPath, params.specId, params.options);
      return toSerializableResult(result);
    }
  );
```

## Implementation Notes
- 既存の `spec-path-ssot-refactor` 設計原則に従った修正
- 他のハンドラー（READ_SPEC_JSON, UPDATE_APPROVAL等）と同じパターンを適用
- `FileService.resolveSpecPath` は worktree と main の両方を検索し、worktree を優先する（SSOT）
- startImplPhase や AutoExecutionCoordinator の設計変更は不要

## Breaking Changes
- [x] No breaking changes

IPC のパラメータ名が内部的に `specPath` から `specName` に変更されたが、Renderer側は元々specNameを渡していたため、影響なし。

## Rollback Plan
1. handlers.ts の START_IMPL ハンドラーを元に戻す
2. autoExecutionHandlers.ts の AUTO_EXECUTION_START ハンドラーを元に戻す
3. autoExecutionHandlers.test.ts のモックを削除

## Related Commits
- (未コミット) Bug fix: start-impl-path-resolution-missing

## Test Results
- TypeScript compile: ✅ Pass
- Unit tests: ✅ Pass (220 files, 4320 tests passed)
