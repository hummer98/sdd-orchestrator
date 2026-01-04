# Bug Fix: resume-agent-skip-permissions

## Summary
`resumeAgent`に`skipPermissions`パラメータを追加し、`startAgent`と同様にUI状態のskip permissionsフラグをClaude CLI引数に反映するようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/specManagerService.ts` | `resumeAgent`メソッドに`skipPermissions`パラメータを追加、`buildClaudeArgs`に渡す |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | IPCハンドラーで`skipPermissions`を受け取り`service.resumeAgent`に渡す |
| `electron-sdd-manager/src/preload/index.ts` | `resumeAgent`関数に`skipPermissions`パラメータを追加 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | 型定義を更新 |
| `electron-sdd-manager/src/renderer/stores/agentStore.ts` | `get().skipPermissions`を取得してIPCに渡す |
| `electron-sdd-manager/src/preload/index.test.ts` | テストを更新（新パラメータ対応） |

### Code Changes

**specManagerService.ts** - メソッドシグネチャ変更:
```diff
  async resumeAgent(
    agentId: string,
-   prompt?: string
+   prompt?: string,
+   skipPermissions?: boolean
  ): Promise<Result<AgentInfo, AgentError>> {
```

**specManagerService.ts** - buildClaudeArgsにskipPermissionsを渡す:
```diff
    const args = buildClaudeArgs({
      resumeSessionId: agent.sessionId,
      resumePrompt,
      allowedTools,
+     skipPermissions,
    });
```

**handlers.ts** - IPCハンドラー修正:
```diff
  ipcMain.handle(
    IPC_CHANNELS.RESUME_AGENT,
-   async (event, agentId: string, prompt?: string) => {
+   async (event, agentId: string, prompt?: string, skipPermissions?: boolean) => {
      // ...
-     const result = await service.resumeAgent(agentId, prompt);
+     const result = await service.resumeAgent(agentId, prompt, skipPermissions);
```

**preload/index.ts** - ブリッジ関数修正:
```diff
- resumeAgent: (agentId: string, prompt?: string): Promise<AgentInfo> =>
-   ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId, prompt),
+ resumeAgent: (agentId: string, prompt?: string, skipPermissions?: boolean): Promise<AgentInfo> =>
+   ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId, prompt, skipPermissions),
```

**electron.d.ts** - 型定義更新:
```diff
- resumeAgent(agentId: string, prompt?: string): Promise<AgentInfo>;
+ resumeAgent(agentId: string, prompt?: string, skipPermissions?: boolean): Promise<AgentInfo>;
```

**agentStore.ts** - ストアアクション修正:
```diff
  resumeAgent: async (agentId: string, prompt?: string) => {
    try {
      // ...
+     // Get skipPermissions from current state (same as startAgent)
+     const { skipPermissions } = get();
-     const resumedAgent = await window.electronAPI.resumeAgent(agentId, prompt);
+     const resumedAgent = await window.electronAPI.resumeAgent(agentId, prompt, skipPermissions);
```

## Implementation Notes
- `startAgent`の実装パターンをそのまま踏襲
- `buildClaudeArgs`関数は既に`skipPermissions`オプションをサポートしていたため、渡すだけで動作
- 3レイヤー（Renderer → IPC → Main）全てにパラメータを追加
- ログ出力にも`skipPermissions`を追加して追跡可能に

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

パラメータはオプショナル（`skipPermissions?: boolean`）のため、既存のコードは影響を受けない。

## Rollback Plan
1. 各ファイルの変更を`git checkout`でリバート
2. テストファイルのアサーションを元に戻す

## Related Commits
- *コミット待ち*
