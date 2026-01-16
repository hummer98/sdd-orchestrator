# Bug Analysis: remove-spec-status-button

## Summary
specワークフローの自動実行ボタン横にあるspec-statusボタンとその関連コード（IPC、ハンドラー、テスト）を削除する。

## Root Cause
不要な機能の削除リクエスト。spec-statusボタンは使用されていないため、コードベースから削除する。

### Technical Details
- **Location**: 複数ファイルに跨る実装
- **Component**: WorkflowView UI、IPC層、SpecManagerService
- **Trigger**: 機能削除リクエスト

## Impact Assessment
- **Severity**: Low（機能削除のため、副作用なし）
- **Scope**: spec-status関連のコード全体
- **Risk**: 低（独立した機能で他の機能に依存されていない）

## Related Code

### 1. UI Component - WorkflowView.tsx
```typescript
// electron-sdd-manager/src/renderer/components/WorkflowView.tsx:269-283
const handleSpecStatus = useCallback(async () => {
  if (!specDetail) return;
  try {
    await window.electronAPI.executeSpecStatus(
      specDetail.metadata.name,
      specDetail.metadata.name,
      workflowStore.commandPrefix
    );
  } catch (error) {
    notify.error(error instanceof Error ? error.message : 'spec-statusの実行に失敗しました');
  }
}, [specDetail, workflowStore.commandPrefix]);

// electron-sdd-manager/src/renderer/components/WorkflowView.tsx:723-734
<button onClick={handleSpecStatus} ...>
  <RefreshCw className="w-4 h-4" />
  spec-status
</button>
```

### 2. IPC Channel - channels.ts
```typescript
// electron-sdd-manager/src/main/ipc/channels.ts:31
EXECUTE_SPEC_STATUS: 'ipc:execute-spec-status',
```

### 3. Preload API - preload/index.ts
```typescript
// electron-sdd-manager/src/preload/index.ts:132-133
executeSpecStatus: (specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo> =>
  ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_STATUS, specId, featureName, commandPrefix),
```

### 4. IPC Handler - handlers.ts
```typescript
// electron-sdd-manager/src/main/ipc/handlers.ts:967-980
ipcMain.handle(IPC_CHANNELS.EXECUTE_SPEC_STATUS, ...) handler
```

### 5. Type Definition - electron.d.ts
```typescript
// electron-sdd-manager/src/renderer/types/electron.d.ts:401
executeSpecStatus(specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
```

### 6. Service Layer - specManagerService.ts
```typescript
// electron-sdd-manager/src/main/services/specManagerService.ts:146-150
const SPEC_STATUS_COMMANDS: Record<CommandPrefix, string> = {
  kiro: '/kiro:spec-status',
  'spec-manager': '/spec-manager:status',
};

// electron-sdd-manager/src/main/services/specManagerService.ts:1238-1249
async executeSpecStatus(specId: string, featureName: string, commandPrefix: CommandPrefix = 'kiro'): Promise<Result<AgentInfo, AgentError>>
```

### 7. Unit Tests - WorkflowView.test.tsx
```typescript
// electron-sdd-manager/src/renderer/components/WorkflowView.test.tsx:239-250
it('should display spec-status button', ...)
it('should spec-status button be always enabled', ...)
```

### 8. Integration Tests - WorkflowView.integration.test.tsx
```typescript
// electron-sdd-manager/src/renderer/components/WorkflowView.integration.test.tsx:150-175
it('should call executeSpecStatus for spec-status command', ...)
```

### 9. Test Setup - setup.ts
```typescript
// electron-sdd-manager/src/test/setup.ts
executeSpecStatus mock
```

## Proposed Solution

### Recommended Approach: 完全削除

以下のファイルから関連コードを削除：

1. **WorkflowView.tsx**: `handleSpecStatus`ハンドラーとボタンUIを削除
2. **channels.ts**: `EXECUTE_SPEC_STATUS`チャンネル定義を削除
3. **preload/index.ts**: `executeSpecStatus`関数を削除
4. **handlers.ts**: `EXECUTE_SPEC_STATUS`ハンドラーを削除
5. **electron.d.ts**: `executeSpecStatus`型定義を削除
6. **specManagerService.ts**: `SPEC_STATUS_COMMANDS`と`executeSpecStatus`メソッドを削除
7. **WorkflowView.test.tsx**: spec-status関連テストを削除
8. **WorkflowView.integration.test.tsx**: spec-status関連テストを削除
9. **setup.ts**: `executeSpecStatus`モックを削除

## Dependencies
- 他のコンポーネントからの参照なし（独立した機能）

## Testing Strategy
- 削除後にUnit Testが全てパスすることを確認
- 削除後にElectronアプリがビルドできることを確認
- TypeScriptコンパイルエラーがないことを確認
