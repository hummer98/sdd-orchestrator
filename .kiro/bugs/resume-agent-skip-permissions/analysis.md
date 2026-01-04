# Bug Analysis: resume-agent-skip-permissions

## Summary
`resumeAgent`メソッドがUI状態の`skipPermissions`フラグを受け取らず、Claude CLI引数に`--dangerously-skip-permissions`が含まれない。

## Root Cause
`startAgent`ではRenderer → IPC → Mainの全レイヤーで`skipPermissions`を受け渡しているが、`resumeAgent`では実装されていない。

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/stores/agentStore.ts:233-246` - resumeAgentアクション
  - `electron-sdd-manager/src/preload/index.ts:105-106` - preload bridge
  - `electron-sdd-manager/src/main/ipc/handlers.ts:718-737` - IPCハンドラー
  - `electron-sdd-manager/src/main/services/specManagerService.ts:848-851` - resumeAgentメソッド
- **Component**: Agent管理システム（3レイヤー全て）
- **Trigger**: skip permissionsがチェックされた状態でAgentInputPanelから続行プロンプトを送信

## Impact Assessment
- **Severity**: Medium
- **Scope**: skip permissions機能を使用してAgent続行を行うユーザー全員
- **Risk**: 続行時にpermission確認ダイアログが予期せず表示される

## Related Code

### 現在の実装（問題箇所）

**agentStore.ts:233-246** - skipPermissionsを取得していない：
```typescript
resumeAgent: async (agentId: string, prompt?: string) => {
  // ...
  const resumedAgent = await window.electronAPI.resumeAgent(agentId, prompt);
  // skipPermissions が渡されていない
```

**preload/index.ts:105-106** - skipPermissionsパラメータがない：
```typescript
resumeAgent: (agentId: string, prompt?: string): Promise<AgentInfo> =>
  ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId, prompt),
```

**handlers.ts:718-737** - skipPermissionsを受け取っていない：
```typescript
ipcMain.handle(
  IPC_CHANNELS.RESUME_AGENT,
  async (event, agentId: string, prompt?: string) => {
    // skipPermissions パラメータなし
    const result = await service.resumeAgent(agentId, prompt);
```

**specManagerService.ts:848-882** - skipPermissionsがbuildClaudeArgsに渡されていない：
```typescript
async resumeAgent(
  agentId: string,
  prompt?: string  // skipPermissions パラメータなし
): Promise<Result<AgentInfo, AgentError>> {
  // ...
  const args = buildClaudeArgs({
    resumeSessionId: agent.sessionId,
    resumePrompt,
    allowedTools,
    // skipPermissions が渡されていない！
  });
```

### 対照的にstartAgentの実装（正しい実装）

**agentStore.ts:191-201**:
```typescript
const { skipPermissions } = get();  // ← 状態から取得
const newAgent = await window.electronAPI.startAgent(
  specId, phase, command, args, group, sessionId,
  skipPermissions  // ← 渡している
);
```

## Proposed Solution

### Option 1: 3レイヤー全てにskipPermissionsを追加（推奨）
- Description: startAgentと同様に、resumeAgentの全レイヤーにskipPermissionsパラメータを追加
- Pros: 一貫性のある実装、startAgentと同じパターン
- Cons: 4ファイルの変更が必要

### Recommended Approach
Option 1を採用。以下のファイルを修正：

1. **specManagerService.ts**: `resumeAgent`メソッドに`skipPermissions`パラメータを追加し、`buildClaudeArgs`に渡す
2. **handlers.ts**: IPCハンドラーで`skipPermissions`を受け取り、`service.resumeAgent`に渡す
3. **preload/index.ts**: `resumeAgent`に`skipPermissions`パラメータを追加
4. **electron.d.ts**: 型定義を更新
5. **agentStore.ts**: `resumeAgent`アクションで`get().skipPermissions`を取得してIPCに渡す

## Dependencies
- `buildClaudeArgs`関数は既に`skipPermissions`オプションをサポート済み
- 型定義の更新が必要（electron.d.ts）

## Testing Strategy
1. skip permissionsをOFFでAgent実行 → 完了後、続行 → `--dangerously-skip-permissions`がないことを確認
2. skip permissionsをONでAgent実行 → 完了後、続行 → `--dangerously-skip-permissions`があることを確認
3. 実行途中でskip permissionsをON/OFF切り替え → 続行時に最新の状態が反映されることを確認
