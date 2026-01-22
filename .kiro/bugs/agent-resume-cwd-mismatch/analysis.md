# Bug Analysis: agent-resume-cwd-mismatch

## Summary
Claude Codeはセッションをcwdごとに管理するため、worktree内で起動したagentをresumeする際、元のcwdが使用されず`No conversation found with session ID`エラーが発生する。

## Root Cause
**AgentRecordにcwdフィールドが存在しない**ため、agent起動時のcwdが永続化されず、resume時に正しいcwdを復元できない。

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/main/services/agentRecordService.ts:35-45` (AgentRecord interface)
  - `electron-sdd-manager/src/main/services/specManagerService.ts:706-716` (writeRecord呼び出し)
  - `electron-sdd-manager/src/main/services/specManagerService.ts:1000-1001` (resumeAgent cwdフォールバック)
- **Component**: AgentRecordService, SpecManagerService
- **Trigger**: worktree内で起動したagentに対するresume操作

### Data Flow
1. `startAgent`で`effectiveCwd`を計算（worktree pathまたはprojectPath）
2. `writeRecord`時に**cwdを保存しない**（現状）
3. `resumeAgent`時に`worktreeCwd || this.projectPath`でフォールバック
4. worktreeCwdが渡されないため、常に`this.projectPath`が使用される
5. Claude Codeがセッションを見つけられない

## Impact Assessment
- **Severity**: High
- **Scope**: worktree modeを使用する全てのspec-impl操作
- **Risk**: resume機能がworktree modeで完全に動作しない

## Related Code

**AgentRecord interface（cwdフィールドなし）:**
```typescript
// agentRecordService.ts:35-45
export interface AgentRecord {
  agentId: string;
  specId: string;
  phase: string;
  pid: number;
  sessionId: string;
  status: AgentStatus;
  startedAt: string;
  lastActivityAt: string;
  command: string;
  // cwd フィールドが欠落
}
```

**startAgent（cwdを保存しない）:**
```typescript
// specManagerService.ts:706-716
await this.recordService.writeRecord({
  agentId,
  specId,
  phase,
  pid: process.pid,
  sessionId: sessionId || '',
  status: 'running',
  startedAt: now,
  lastActivityAt: now,
  command: `${command} ${effectiveArgs.join(' ')}`,
  // effectiveCwd を保存していない
});
```

**resumeAgent（cwdフォールバック）:**
```typescript
// specManagerService.ts:1000-1001
// git-worktree-support: Use worktreeCwd if provided, fallback to projectPath
const effectiveCwd = worktreeCwd || this.projectPath;
```

## Proposed Solution

### Option 1: AgentRecordにcwdフィールドを追加（推奨）
- Description: AgentRecordにcwdフィールドを追加し、起動時に保存、resume時に参照
- Pros:
  - agent-state-file-ssotの原則に沿った正しいアプローチ
  - 状態の一元管理（cwdは起動時に決まる固定値）
  - resumeAgent呼び出し側の変更不要
- Cons:
  - スキーマ変更が必要（既存レコードとの互換性考慮）

### Recommended Approach
**Option 1を採用**。これはSSoT原則に従った正しい修正方法。

修正箇所:
1. `AgentRecord` interfaceに`cwd: string`フィールドを追加
2. `AgentInfo` interfaceに`cwd: string`フィールドを追加
3. `AgentRecordUpdate`型に`cwd`を追加
4. `startAgent`で`writeRecord`呼び出し時に`cwd: effectiveCwd`を追加
5. `resumeAgent`で`agent.cwd`を使用（worktreeCwd引数は削除または非推奨化）
6. 既存レコードの互換性: cwdが未定義の場合はprojectPathにフォールバック

## Dependencies
- `electron-sdd-manager/src/main/services/agentRecordService.ts` - スキーマ変更
- `electron-sdd-manager/src/main/services/specManagerService.ts` - startAgent, resumeAgent修正
- 既存のagentレコードJSONファイル（互換性フォールバック必要）

## Testing Strategy
1. worktree modeでagentを起動
2. agentが完了/中断後にresumeを実行
3. セッションが正常に継続されることを確認
4. 既存（cwdフィールドなし）レコードからのresumeがprojectPathにフォールバックすることを確認
