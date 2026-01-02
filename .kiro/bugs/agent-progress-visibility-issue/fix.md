# Bug Fix: agent-progress-visibility-issue

## Summary
`specManagerService.startAgent`にClaude CLIベースフラグの正規化処理（`normalizeClaudeArgs`）を追加し、全てのAgent起動で`--output-format stream-json`が保証されるようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/specManagerService.ts` | `normalizeClaudeArgs`メソッドを追加、`startAgent`で呼び出し |
| `electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.tsx` | 重複フラグを削除、コマンドのみ渡すように変更 |
| `electron-sdd-manager/src/renderer/components/BugActionButtons.tsx` | args形式を統一（`[fullCommand]`形式に） |
| `electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx` | `-p`フラグ削除、コマンドのみ渡すように変更 |
| `electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts` | `-p`フラグ削除、コマンドのみ渡すように変更 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | spec-init/bug-createのハードコードフラグ削除 |
| `electron-sdd-manager/src/renderer/components/BugActionButtons.test.tsx` | テストを新しいargs形式に更新 |
| `electron-sdd-manager/src/renderer/components/BugWorkflowView.test.tsx` | テストを新しいargs形式に更新 |

### Code Changes

#### 1. specManagerService.ts - normalizeClaudeArgsメソッド追加

```diff
+ /**
+  * Normalize Claude CLI arguments to ensure base flags are always present
+  * This is the Single Source of Truth (SSOT) for Claude CLI flag normalization.
+  */
+ private normalizeClaudeArgs(args: string[], skipPermissions?: boolean): string[] {
+   // Extract command part: filter out known base flags to get the actual command
+   const baseFlags = new Set(['-p', '--verbose', '--output-format', 'stream-json', '--dangerously-skip-permissions']);
+   const commandParts: string[] = [];
+   // ... フラグを除去してコマンド部分を抽出
+   // Rebuild args using buildClaudeArgs to ensure consistency
+   const command = commandParts.join(' ');
+   return buildClaudeArgs({ command: command || undefined, skipPermissions });
+ }
```

#### 2. startAgentでの呼び出し

```diff
  async startAgent(options: StartAgentOptions): Promise<Result<AgentInfo, AgentError>> {
    const { specId, phase, command, args, group, sessionId, providerType, skipPermissions } = options;

-   // Add --dangerously-skip-permissions flag if enabled
-   const effectiveArgs = skipPermissions
-     ? ['--dangerously-skip-permissions', ...args]
-     : args;
+   // Normalize args: ensure base flags are always present (SSOT for Claude CLI flags)
+   const effectiveArgs = this.normalizeClaudeArgs(args, skipPermissions);
```

#### 3. 呼び出し元の簡素化（例: BugActionButtons.tsx）

```diff
  const agentId = await startAgent(
    `bug:${bug.name}`,
    `bug-${config.action}`,
-   config.command,
-   [bug.name],
+   'claude',
+   [`${config.command} ${bug.name}`], // Base flags added by service
    undefined,
    undefined
  );
```

## Implementation Notes
- **SSOT原則**: ベースフラグの定義は`specManagerService`の`buildClaudeArgs`に集約
- **idempotent**: 既にフラグが含まれていても正しく動作（重複は除去）
- **後方互換性**: 古い形式のargsも正規化により正しく処理される

## Breaking Changes
- [x] No breaking changes

呼び出し元のargs形式が変更されたが、`normalizeClaudeArgs`により両方の形式が正しく処理されるため、破壊的変更はない。

## Rollback Plan
1. `specManagerService.ts`の`normalizeClaudeArgs`メソッドを削除
2. `startAgent`内の呼び出しを元に戻す
3. 各呼び出し元を元のargs形式に戻す

## Test Results
```
Test Files  143 passed (143)
Tests       2920 passed | 12 skipped (2932)
```

## Related Commits
- *To be filled after commit*
