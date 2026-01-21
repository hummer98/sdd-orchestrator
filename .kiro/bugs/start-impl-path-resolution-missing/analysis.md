# Bug Analysis: start-impl-path-resolution-missing

## Summary
`START_IMPL` および `AUTO_EXECUTION_START` IPCハンドラーで `spec-path-ssot-refactor` 設計原則が適用されておらず、Rendererから渡される `specName` がそのまま `specPath` として使用され、相対パスでspec.jsonにアクセスしようとしてENOENTエラーが発生する。

## Root Cause
`spec-path-ssot-refactor` の適用漏れ。

### Technical Details
- **Location**:
  - [handlers.ts:2195](electron-sdd-manager/src/main/ipc/handlers.ts#L2195) - START_IMPL handler
  - [autoExecutionHandlers.ts:141](electron-sdd-manager/src/main/ipc/autoExecutionHandlers.ts#L141) - AUTO_EXECUTION_START handler
- **Component**: IPC handlers (Main Process)
- **Trigger**: Worktreeモードでの実装開始ボタンクリック

### 問題の詳細フロー

```
Renderer                    Main Process
---------                   ------------
specDetail.metadata.name
("spec-event-log")
    ↓
startImpl(specName, ...)
    ↓
handlers.ts: START_IMPL
  └── resolveSpecPath 欠落 ❌
    ↓
startImplPhase({ specPath: "spec-event-log", ... })
    ↓
path.join(specPath, 'spec.json')
  └── "spec-event-log/spec.json" (相対パス)
    ↓
fs.readFile("spec-event-log/spec.json")
  └── ENOENT エラー
```

## Impact Assessment
- **Severity**: High
- **Scope**: Worktreeモードでのすべてのspec実装開始が不可能
- **Risk**: 低（修正は既存パターンに従うため、副作用リスクは最小）

## Related Code

### 問題箇所1: handlers.ts:2195
```typescript
ipcMain.handle(
  IPC_CHANNELS.START_IMPL,
  async (event, specPath: string, featureName: string, commandPrefix: string) => {
    // ❌ resolveSpecPath が欠落
    const result = await startImplPhase({
      specPath,  // specName がそのまま渡される
      ...
    });
  }
);
```

### 問題箇所2: autoExecutionHandlers.ts:141
```typescript
const result = await coordinator.start(params.specPath, params.specId, params.options);
// ❌ params.specPath は specName が渡されている
```

### 正しいパターン（他のハンドラー）
```typescript
// handlers.ts:618 - READ_SPEC_JSON
const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
if (!specPathResult.ok) {
  throw new Error(`Spec not found: ${specName}`);
}
const result = await fileService.readSpecJson(specPathResult.value);
```

## Proposed Solution

### 修正方針: spec-path-ssot-refactor パターンの適用

既存の設計原則に従い、IPCハンドラー層でパス解決を行う。

### 修正箇所1: handlers.ts START_IMPL

```typescript
ipcMain.handle(
  IPC_CHANNELS.START_IMPL,
  async (event, specName: string, featureName: string, commandPrefix: string) => {
    // spec-path-ssot-refactor: Resolve path from name
    const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
    if (!specPathResult.ok) {
      return {
        ok: false,
        error: { type: 'SPEC_JSON_ERROR', message: `Spec not found: ${specName}` },
      };
    }

    const result = await startImplPhase({
      specPath: specPathResult.value,  // 解決された絶対パス
      featureName,
      commandPrefix: validPrefix,
      specManagerService: service,
    });
    return result;
  }
);
```

### 修正箇所2: autoExecutionHandlers.ts AUTO_EXECUTION_START

```typescript
ipcMain.handle(
  IPC_CHANNELS.AUTO_EXECUTION_START,
  async (_event, params: StartParams): Promise<...> => {
    // spec-path-ssot-refactor: Resolve path from name
    const specPathResult = await fileService.resolveSpecPath(currentProjectPath, params.specPath);
    if (!specPathResult.ok) {
      return {
        ok: false,
        error: { type: 'SPEC_NOT_FOUND', specPath: params.specPath },
      };
    }

    const result = await coordinator.start(
      specPathResult.value,  // 解決された絶対パス
      params.specId,
      params.options
    );
    return toSerializableResult(result);
  }
);
```

### Recommended Approach
上記2箇所に `resolveSpecPath` を追加する。これは：
- ✅ SSOT原則に従っている（パス解決はMain Processの責務）
- ✅ 既存パターンと一貫している
- ✅ startImplPhaseやcoordinatorの設計変更不要
- ✅ 副作用リスクが最小

## Design Principle Check
1. **Does this fix duplicate state?** → No (パス解決はMain Processで一度のみ)
2. **Does this fix rely on manual sync?** → No (自動解決)
3. **Is this where the data naturally belongs?** → Yes (IPCハンドラーがパス解決の責務を持つ)

## Dependencies
- `FileService.resolveSpecPath` - 既存機能を使用
- `currentProjectPath` - handlers.tsで既に使用可能

## Testing Strategy
1. Worktreeモードでspecを作成
2. document-review-replyまで完了
3. 「実装開始」ボタンをクリック
4. 正常に実装フェーズが開始されることを確認
5. AutoExecution経由でimplフェーズが正常に実行されることを確認
