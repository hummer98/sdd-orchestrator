# Bug Analysis: agent-output-not-displayed

## Summary
Agent実行時に出力がローディング状態のまま表示されない問題。**根本原因はClaude CLIがパーミッション許可を待っている状態**。

## Root Cause

**確定原因：Claude CLIのパーミッション要求待ち**

### 問題の構造

1. **`executePhase`/`executeValidation`は`skipPermissions`を渡していない**
   - [specManagerService.ts:1011-1017](electron-sdd-manager/src/main/services/specManagerService.ts#L1011-L1017)
   - 常に`skipPermissions: undefined`（= `false`相当）でClaude CLIを起動

2. **stdinは即座にクローズされる**
   - [agentProcess.ts:78-80](electron-sdd-manager/src/main/services/agentProcess.ts#L78-L80)
   - パーミッション要求への応答手段がない

3. **結果：CLIがパーミッション応答を待ち続け、出力が止まる**

### Technical Details
- **Location**: [specManagerService.ts:1011-1017](electron-sdd-manager/src/main/services/specManagerService.ts#L1011-L1017)
- **Component**: executePhase / executeValidation メソッド
- **Trigger**: settings.local.jsonに必要なパーミッションが設定されていない場合

### なぜ「たびたび」発生するのか

- settings.local.jsonにパーミッションが設定されている場合は問題なし
- 新しいツールや未許可のパスへのアクセス時にパーミッション要求が発生
- **症状発生の条件**: Claude CLIが未許可の操作を試みたとき

## Impact Assessment
- **Severity**: High
- **Scope**: すべてのexecutePhase/executeValidation経由のAgent実行
- **Risk**: ユーザーは出力がないまま待ち続ける

## Related Code

### 問題箇所
```typescript
// specManagerService.ts:1011-1017
async executePhase(options: ExecutePhaseOptions): Promise<Result<AgentInfo, AgentError>> {
  // ...
  return this.startAgent({
    specId,
    phase,
    command: getClaudeCommand(),
    args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
    group,
    // skipPermissions が渡されていない！
  });
}
```

### stdinクローズ
```typescript
// agentProcess.ts:78-80
if (this.process.stdin) {
  this.process.stdin.end();  // パーミッション応答を送れない
}
```

### 対照的に、startAgent直接呼び出しはskipPermissionsをサポート
```typescript
// agentStore.ts:192-201
executeAgent: async (specId, phase, command, args, group) => {
  const { skipPermissions } = get();  // UIからのフラグを使用
  return window.electronAPI.startAgent(
    specId, phase, command, args, group, undefined, skipPermissions
  );
},
```

## Proposed Solution

### Option 1: executePhase/executeValidationにskipPermissionsを追加（推奨）

```typescript
// specManagerService.ts
async executePhase(options: ExecutePhaseOptions): Promise<Result<AgentInfo, AgentError>> {
  const { specId, phase, featureName, commandPrefix = 'kiro', skipPermissions } = options;
  // ...
  return this.startAgent({
    specId,
    phase,
    command: getClaudeCommand(),
    args: buildClaudeArgs({ command: `${slashCommand} ${featureName}` }),
    group,
    skipPermissions,  // 追加
  });
}
```

- Pros: 既存のアーキテクチャに沿った変更
- Cons: IPC API、handlers.ts、preload.ts、electron.d.tsの変更が必要

### Option 2: executePhase/executeValidationで常にskipPermissionsをtrue

```typescript
return this.startAgent({
  // ...
  skipPermissions: true,  // 常にtrue
});
```

- Pros: 最小限の変更
- Cons: ユーザーに選択権がない

### Option 3: agentStoreのskipPermissionsをexecutePhase経由でも参照

AutoExecutionService/BugAutoExecutionServiceからagentStore.skipPermissionsを取得して渡す。

- Pros: UIの設定が一貫して適用される
- Cons: 複数箇所の変更が必要

### Recommended Approach
**Option 2**を即座に適用し、後で**Option 1**に移行することを推奨。

理由：
- SDD OrchestratorはCLI的な使い方を想定しており、毎回パーミッション確認は不要
- stdinがクローズされている以上、パーミッション応答は不可能

## Dependencies
- [specManagerService.ts](electron-sdd-manager/src/main/services/specManagerService.ts)
- [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts) (Option 1の場合)

## Testing Strategy
1. **修正確認**: executePhase経由でAgent実行し、出力が表示されることを確認
2. **リグレッション**: 既存のstartAgent経由の実行が影響を受けないこと
3. **E2Eテスト**: spec-requirements等のワークフロー全体が正常動作すること

## Next Steps
1. `/kiro:bug-fix`で修正を実装
2. `executePhase`/`executeValidation`/`executeTaskImpl`等すべての高レベルAPIを確認
3. テスト実行で動作確認
