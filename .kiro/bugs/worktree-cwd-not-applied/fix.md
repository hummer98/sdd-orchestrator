# Bug Fix: worktree-cwd-not-applied

## Summary
Worktreeモードでの実装開始時にClaude CLIのcwdがworktreeパスに設定されるよう、既存の`getWorktreeCwd()`/`getAgentCwd()`関数を実際の呼び出し元から呼び出すように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/specManagerService.ts` | `StartAgentOptions`に`worktreeCwd`を追加、`startAgent()`/`resumeAgent()`でcwdを設定、ヘルパーメソッド`getSpecWorktreeCwd()`と`getProjectPath()`を追加、`executeTaskImpl()`/`executeInspection()`/`executeInspectionFix()`でworktreeCwdを取得・設定 |
| `electron-sdd-manager/src/main/ipc/remoteAccessHandlers.ts` | `BugService`をインポート、`executeBugPhase()`で`getAgentCwd()`を呼び出してworktreeCwdを設定 |

### Code Changes

#### 1. StartAgentOptions インターフェースの拡張
```diff
 export interface StartAgentOptions {
   specId: string;
   phase: string;
   command: string;
   args: string[];
   group?: ExecutionGroup;
   sessionId?: string;
   providerType?: ProviderType;
   skipPermissions?: boolean;
+  /** Working directory override for worktree mode (git-worktree-support) */
+  worktreeCwd?: string;
 }
```

#### 2. startAgent()でworktreeCwdを使用
```diff
 async startAgent(options: StartAgentOptions): Promise<Result<AgentInfo, AgentError>> {
-  const { specId, phase, command, args, group, sessionId, providerType, skipPermissions } = options;
+  const { specId, phase, command, args, group, sessionId, providerType, skipPermissions, worktreeCwd } = options;
   const effectiveProviderType = providerType ?? this.providerType;
+  // git-worktree-support: Use worktreeCwd if provided, fallback to projectPath
+  const effectiveCwd = worktreeCwd || this.projectPath;
   ...
   // SSH process
-  cwd: this.projectPath,
+  cwd: effectiveCwd,
   // Local process
-  cwd: this.projectPath,
+  cwd: effectiveCwd,
```

#### 3. resumeAgent()にworktreeCwd引数を追加
```diff
 async resumeAgent(
   agentId: string,
   prompt?: string,
-  skipPermissions?: boolean
+  skipPermissions?: boolean,
+  worktreeCwd?: string
 ): Promise<Result<AgentInfo, AgentError>> {
+  // git-worktree-support: Use worktreeCwd if provided, fallback to projectPath
+  const effectiveCwd = worktreeCwd || this.projectPath;
   ...
   const process = createAgentProcess({
     ...
-    cwd: this.projectPath,
+    cwd: effectiveCwd,
   });
```

#### 4. getSpecWorktreeCwd()ヘルパーメソッドの追加
```typescript
private async getSpecWorktreeCwd(specId: string): Promise<string> {
  try {
    const specJsonPath = path.join(this.projectPath, '.kiro', 'specs', specId, 'spec.json');
    const content = await readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(content);
    return getWorktreeCwd(this.projectPath, specJson);
  } catch (error) {
    logger.warn('[SpecManagerService] getSpecWorktreeCwd failed, using projectPath', {
      specId,
      error: error instanceof Error ? error.message : String(error),
    });
    return this.projectPath;
  }
}
```

#### 5. getProjectPath()ゲッターの追加
```typescript
getProjectPath(): string {
  return this.projectPath;
}
```

#### 6. executeTaskImpl()でworktreeCwdを設定
```diff
 async executeTaskImpl(options: ExecuteTaskImplOptions): Promise<Result<AgentInfo, AgentError>> {
   const { specId, featureName, taskId, commandPrefix = 'kiro' } = options;
   const implCommand = PHASE_COMMANDS_BY_PREFIX[commandPrefix].impl;
+  // git-worktree-support: Resolve worktree cwd for agent execution
+  const worktreeCwd = await this.getSpecWorktreeCwd(specId);

   return this.startAgent({
     ...
     group: 'impl',
+    worktreeCwd,
   });
 }
```

#### 7. executeInspection()とexecuteInspectionFix()で同様の修正
```diff
 async executeInspection(options: ExecuteInspectionOptions): Promise<Result<AgentInfo, AgentError>> {
+  const worktreeCwd = await this.getSpecWorktreeCwd(specId);
   return this.startAgent({
     ...
+    worktreeCwd,
   });
 }
```

#### 8. executeBugPhase()でBugService.getAgentCwd()を呼び出す
```diff
+import { BugService } from '../services/bugService';
+import { join } from 'path';
 ...
 executeBugPhase: async (bugName: string, phase: BugAction) => {
+  // git-worktree-support: Resolve worktree cwd from bug.json
+  const projectPath = specManagerService.getProjectPath();
+  const bugPath = join(projectPath, '.kiro', 'bugs', bugName);
+  const bugService = new BugService();
+  const worktreeCwd = await bugService.getAgentCwd(bugPath, projectPath);

   const result = await specManagerService.startAgent({
     ...
+    worktreeCwd,
   });
 }
```

## Implementation Notes
- 設計書で定義されていた`getWorktreeCwd()`（Specs用）と`getAgentCwd()`（Bugs用）の関数は既に存在していたが、呼び出し元から呼び出されていなかった
- 各execute関数（`executeTaskImpl`, `executeInspection`, `executeInspectionFix`, `executeBugPhase`）で、spec.json/bug.jsonを読み取りworktreeCwdを解決するように修正
- `startAgent()`と`resumeAgent()`でworktreeCwdオプションを受け取り、プロセス起動時のcwdに適用するように修正
- worktreeCwdが設定されていない場合はprojectPathにフォールバック（後方互換性を維持）

## Breaking Changes
- [x] No breaking changes

`worktreeCwd`はオプショナルフィールドであり、設定されていない場合は従来通りprojectPathが使用されるため、既存のコードに影響なし。

## Rollback Plan
1. `StartAgentOptions`から`worktreeCwd`フィールドを削除
2. `startAgent()`と`resumeAgent()`のcwd設定を`this.projectPath`に戻す
3. `getSpecWorktreeCwd()`と`getProjectPath()`メソッドを削除
4. 各execute関数からworktreeCwd取得ロジックを削除
5. `remoteAccessHandlers.ts`からBugService関連のインポートと呼び出しを削除

## Test Results
- TypeScript型チェック: PASS
- specManagerService.test.ts: 53 tests PASS
- worktreeImplHandlers.test.ts: 11 tests PASS
- bugService.test.ts: 31 tests PASS

## Related Commits
- *To be committed after fix approval*
