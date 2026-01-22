# Bug Fix: agent-resume-cwd-mismatch

## Summary
AgentRecordにcwdフィールドを追加し、agent起動時のcwdを保存することで、resume時にworktree内で起動したセッションを正しく復元できるようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/agentRecordService.ts` | AgentRecord, AgentInfo interfaceにcwdフィールドを追加 |
| `electron-sdd-manager/src/main/services/specManagerService.ts` | startAgent, resumeAgentでcwdの保存・参照を実装 |

### Code Changes

**agentRecordService.ts - AgentInfo interface:**
```diff
 export interface AgentInfo {
   readonly agentId: string;
   ...
   readonly command: string;
+  /** Working directory used when agent was started. Required for resume in worktree mode. */
+  readonly cwd?: string;
 }
```

**agentRecordService.ts - AgentRecord interface:**
```diff
 export interface AgentRecord {
   agentId: string;
   ...
   command: string;
+  /** Working directory used when agent was started. Required for resume in worktree mode. */
+  cwd?: string;
 }
```

**specManagerService.ts - startAgent (writeRecord呼び出し):**
```diff
       // agent-state-file-ssot: Write agent record to file (SSOT)
+      // Bug fix: agent-resume-cwd-mismatch - Save cwd for resume operations
       await this.recordService.writeRecord({
         agentId,
         ...
         command: `${command} ${effectiveArgs.join(' ')}`,
+        cwd: effectiveCwd,
       });
```

**specManagerService.ts - startAgent (agentInfo作成):**
```diff
       // Create agent info
+      // Bug fix: agent-resume-cwd-mismatch - Include cwd for consistency
       const agentInfo: AgentInfo = {
         agentId,
         ...
         command: `${command} ${effectiveArgs.join(' ')}`,
+        cwd: effectiveCwd,
       };
```

**specManagerService.ts - resumeAgent (effectiveCwd計算):**
```diff
-    // git-worktree-support: Use worktreeCwd if provided, fallback to projectPath
-    const effectiveCwd = worktreeCwd || this.projectPath;
+    // Bug fix: agent-resume-cwd-mismatch
+    // Priority: 1. worktreeCwd argument (explicit override)
+    //           2. agent.cwd (stored from original start)
+    //           3. projectPath (fallback for legacy records without cwd)
+    const effectiveCwd = worktreeCwd || agent.cwd || this.projectPath;
```

## Implementation Notes
- cwdフィールドはオプショナル（`?`）として定義し、既存レコードとの後方互換性を維持
- resumeAgentでは3段階のフォールバック戦略を採用:
  1. 明示的なworktreeCwd引数（オーバーライド用）
  2. AgentRecordに保存されたcwd（通常のケース）
  3. projectPath（cwdフィールドがない既存レコード用）
- この修正はSSoT原則（agent-state-file-ssot）に沿った正しいアプローチ

## Breaking Changes
- [x] No breaking changes

cwdフィールドはオプショナルであり、既存のAgentRecordファイルは引き続き動作する。

## Rollback Plan
1. agentRecordService.tsからcwdフィールドを削除
2. specManagerService.tsのcwd関連の変更を元に戻す
3. TypeScriptビルドを実行して型エラーがないことを確認

## Related Commits
- *Pending commit*
