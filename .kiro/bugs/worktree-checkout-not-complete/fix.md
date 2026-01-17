# Bug Fix: worktree-checkout-not-complete

## Summary
Worktreeモードで実装開始時の2つの問題を修正：
1. トースト表示が「undefined」になる問題 → 正しいプロパティパスを参照
2. Claude CLIがスキルを認識しない問題 → worktree checkout完了を待機

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | `value.branch` → `value.worktreeConfig.branch` |
| `electron-sdd-manager/src/main/services/worktreeService.ts` | `waitForWorktreeReady`メソッド追加、createWorktree/createBugWorktreeで呼び出し |

### Code Changes

**WorkflowView.tsx:503**
```diff
- notify.success(`Worktree作成完了: ${implStartResult.value.branch}`);
+ notify.success(`Worktree作成完了: ${implStartResult.value.worktreeConfig.branch}`);
```

**worktreeService.ts - 新規メソッド追加**
```typescript
/**
 * Wait for worktree checkout to complete by monitoring index.lock
 * worktree-checkout-not-complete: Ensures filesystem sync before returning
 */
private async waitForWorktreeReady(worktreeName: string, timeout = 10000): Promise<boolean> {
  const lockFile = path.join(this.projectPath, '.git', 'worktrees', worktreeName, 'index.lock');
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!fs.existsSync(lockFile)) {
      logger.debug('[WorktreeService] Worktree checkout complete', { worktreeName, waitedMs: Date.now() - startTime });
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  logger.warn('[WorktreeService] Worktree checkout timeout', { worktreeName, timeout });
  return false;
}
```

**worktreeService.ts - createWorktree内で呼び出し**
```diff
    }

+   // worktree-checkout-not-complete: Wait for checkout to complete before returning
+   await this.waitForWorktreeReady(featureName);
+
    const worktreeInfo: WorktreeInfo = {
```

**worktreeService.ts - createBugWorktree内で呼び出し**
```diff
    }

+   // worktree-checkout-not-complete: Wait for checkout to complete before returning
+   await this.waitForWorktreeReady(bugName);
+
    const worktreeInfo: WorktreeInfo = {
```

## Implementation Notes
- `index.lock`ファイルはgit worktree add実行中のみ存在し、checkout完了時に自動削除される
- 50msごとにポーリングし、最大10秒待機（タイムアウト時は警告ログを出力して続行）
- spec用worktreeとbug用worktreeの両方に対応
- fsモジュールをインポート追加

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `WorkflowView.tsx:503`を`value.branch`に戻す
2. `worktreeService.ts`から`waitForWorktreeReady`メソッドと呼び出しを削除
3. `fs`インポートを削除

## Test Results
```
 ✓ src/main/services/worktreeService.test.ts (39 tests) 7ms
 Test Files  1 passed (1)
      Tests  39 passed (39)
```

## Related Commits
- *コミット予定*
