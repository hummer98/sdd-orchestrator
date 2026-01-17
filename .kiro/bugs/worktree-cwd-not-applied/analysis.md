# Bug Analysis: worktree-cwd-not-applied

## Summary
Worktreeモードで実装を開始しても、Claude CLIのcwdがworktreeパスではなくメインプロジェクトパスのままになる。設計書で定義された関数は存在するが、実際の呼び出し箇所で使用されていないことが原因。

## Root Cause

### 問題の本質
設計で定義された「worktreeCwd設定」機能が**実装途中で放置**されている。関数は定義されているが、**呼び出し元から呼び出されていない**。

### Technical Details

#### Specsワークフロー
- **Location**: `electron-sdd-manager/src/main/services/specManagerService.ts:596`
- **Component**: `SpecManagerService.startAgent()`
- **Trigger**: `executeTaskImpl()`等からstartAgentを呼び出す際にworktreeCwdが渡されない

**未実装箇所**:
1. `StartAgentOptions`インターフェースに`worktreeCwd`フィールドが**存在しない**（設計書:行388-393で定義済み）
2. `startAgent()`のプロセス起動で常に`this.projectPath`を使用（行596, 975）
3. `getWorktreeCwd()`関数は存在するが、`executeTaskImpl()`から呼び出されていない

```typescript
// specManagerService.ts:596 - 現状
cwd: this.projectPath,  // ハードコード

// 設計書の期待動作
cwd: worktreeCwd || this.projectPath,
```

#### Bugsワークフロー
- **Location**: `electron-sdd-manager/src/main/ipc/remoteAccessHandlers.ts:194-199`
- **Component**: `executeBugPhase()` IPC handler
- **Trigger**: `remoteAccessHandlers.executeBugPhase()`実行時

**未実装箇所**:
1. `BugService.getAgentCwd()`は存在する（行467-483）が、**呼び出されていない**
2. `executeBugPhase()`でstartAgentを呼び出す際、cwdオプションを設定していない

```typescript
// remoteAccessHandlers.ts:194 - 現状
const result = await specManagerService.startAgent({
  specId: '',
  phase: bugPhase,
  command: getClaudeCommand(),
  args: buildClaudeArgs({ command: `${slashCommand} ${bugName}`, allowedTools }),
  // worktreeCwdなし
});

// 設計書の期待動作
const cwd = await bugService.getAgentCwd(bugPath, projectPath);
const result = await specManagerService.startAgent({
  ...
  worktreeCwd: cwd,
});
```

## Impact Assessment
- **Severity**: Major
- **Scope**: worktreeモードを使用するすべてのSpecs/Bugsワークフロー
- **Risk**:
  - worktree内で作業したつもりが、メインブランチで変更が行われる
  - マージ時にコンフリクトが発生しやすくなる
  - worktreeモードの意図（並列開発、ブランチ分離）が完全に失われる

## Related Code

### Specsワークフロー
```typescript
// worktreeImplHandlers.ts:220-250 - 関数は存在
export function getWorktreeCwd(
  projectPath: string,
  specJson: { worktree?: unknown }
): string {
  if (!isWorktreeMode(specJson)) {
    return projectPath;
  }
  // ... worktreeパス解決ロジック
}
```

### Bugsワークフロー
```typescript
// bugService.ts:467-483 - 関数は存在
async getAgentCwd(bugPath: string, projectPath: string): Promise<string> {
  const readResult = await this.readBugJson(bugPath);
  if (!readResult.ok || readResult.value === null) {
    return projectPath;
  }
  const bugJson = readResult.value;
  if (isBugWorktreeConfig(bugJson.worktree)) {
    return resolve(projectPath, bugJson.worktree.path);
  }
  return projectPath;
}
```

## Proposed Solution

### Architecturally Correct Approach

修正は2段階で行う必要がある：

**Phase 1: StartAgentOptionsの拡張**
1. `StartAgentOptions`インターフェースに`worktreeCwd?: string`を追加
2. `startAgent()`内でcwd設定を`worktreeCwd || this.projectPath`に変更
3. `resumeAgent()`も同様に対応

**Phase 2: 呼び出し元の修正**

| ワークフロー | 修正ファイル | 修正内容 |
|-------------|-------------|---------|
| Specs | `specManagerService.ts` | `executeTaskImpl()`, `executeInspection()`, `executeInspectionFix()`でspec.jsonを読み取り、`getWorktreeCwd()`を呼び出してworktreeCwdを設定 |
| Bugs | `remoteAccessHandlers.ts` | `executeBugPhase()`で`bugService.getAgentCwd()`を呼び出してworktreeCwdを設定 |

### Option 1 (Recommended): 設計書準拠の完全実装
- Description: 設計書通りにworktreeCwdを追加し、すべての呼び出し元を修正
- Pros:
  - 設計と実装の整合性が取れる
  - 将来の保守性が高い
- Cons:
  - 複数ファイルの変更が必要
  - テストの追加も必要

### Recommended Approach
**Option 1**を推奨。設計書で明確に定義されている仕様であり、「関数の存在」だけでなく「呼び出しの完了」まで実装する必要がある。

## Dependencies
- `electron-sdd-manager/src/main/services/specManagerService.ts` - StartAgentOptions, startAgent()
- `electron-sdd-manager/src/main/ipc/worktreeImplHandlers.ts` - getWorktreeCwd()
- `electron-sdd-manager/src/main/services/bugService.ts` - getAgentCwd()
- `electron-sdd-manager/src/main/ipc/remoteAccessHandlers.ts` - executeBugPhase()

## Testing Strategy
1. **Unit Test**: `startAgent()`にworktreeCwdを渡した際にcwdが正しく設定されることを確認
2. **Integration Test**: worktreeモードでimpl実行時、Claude CLIのcwdがworktreeパスになることを確認
3. **E2E Test**:
   - worktreeモードでspec-implを実行し、worktree内にファイルが作成されることを確認
   - worktreeモードでbug-fixを実行し、worktree内でコミットが行われることを確認

## Lessons Learned (Inspection改善提案)
- Inspectionで「関数の存在確認」だけでなく「呼び出し確認」も行うべき
- 「PASS」判定の基準を厳格化: 関数定義 + 呼び出し + 期待動作のすべてを検証
