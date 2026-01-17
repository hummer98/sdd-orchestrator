# Bug Analysis: worktree-checkout-not-complete

## Summary
Worktreeモードで実装開始時に、(1)トースト表示がundefined、(2)Claude CLIがスキルを認識しない2つの問題が発生。

## Root Cause

### 問題1: トーストのundefined

**Location**: `electron-sdd-manager/src/renderer/components/WorkflowView.tsx:503`

```typescript
// 修正前（誤り）
notify.success(`Worktree作成完了: ${implStartResult.value.branch}`);

// 修正後（正しい）
notify.success(`Worktree作成完了: ${implStartResult.value.worktreeConfig.branch}`);
```

**原因**: `handleImplStartWithWorktree`の返り値型は`{ worktreePath, worktreeConfig }`だが、`value.branch`を直接参照していた。

### 問題2: Unknown skill

**Location**: `electron-sdd-manager/src/main/services/worktreeService.ts:210-236`

**Trigger**: `git worktree add`コマンド完了後、ファイルシステムの同期が完了する前にClaude CLIが起動される。

**Technical Details**:
- `git worktree add`実行中は`.git/worktrees/{name}/index.lock`が存在
- コマンドreturn後も、OSがファイルを完全にディスクに書き込むまで遅延がある
- Claude CLIは起動時にcwdの`.claude/commands/`を読み込むが、ファイルがまだ存在しない状態で起動
- 結果として`kiro:*`コマンドが認識されない

**検証データ**:
```
worktree作成: 12:09:17.616Z
エージェント起動: 12:09:17.621Z  (5ms後)
→ slash_commandsにkiro:*が含まれていない
```

## Impact Assessment
- **Severity**: High（worktreeモードでの実装が完全に失敗する）
- **Scope**: worktreeモードを使用する全ユーザー
- **Risk**: 修正自体のリスクは低い（待機処理の追加のみ）

## Related Code

**worktreeService.ts:210-236** - worktree作成（待機なし）
```typescript
const createWorktreeResult = await this.execGit(`git worktree add "${absolutePath}" ${branchName}`);
// ...
return { ok: true, value: worktreeInfo };  // 即座にreturn
```

## Proposed Solution

### Option 1: index.lock消失を待機（推奨）
`worktreeService.createWorktree`でgitコマンド完了後、`.git/worktrees/{name}/index.lock`が消えるまで待機する。

**Pros**:
- gitの内部状態に基づく確実な判定
- worktreeの作成完了を正確に検知

**Cons**:
- 待機処理の追加（通常は数百ms程度）

```typescript
// worktreeService.ts に追加
private async waitForWorktreeReady(worktreeName: string, timeout = 10000): Promise<boolean> {
  const lockFile = path.join(this.projectPath, '.git', 'worktrees', worktreeName, 'index.lock');
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!fs.existsSync(lockFile)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return false;
}
```

### Recommended Approach
Option 1を採用。`createWorktree`メソッド内でgitコマンド完了後、`waitForWorktreeReady`を呼び出す。

## Dependencies
- `electron-sdd-manager/src/main/services/worktreeService.ts`
- `electron-sdd-manager/src/renderer/components/WorkflowView.tsx`（既に修正済み）

## Testing Strategy
1. worktreeを削除してから再作成
2. 実装開始ボタンをクリック
3. トースト表示が正しいブランチ名を表示することを確認
4. エージェントが正常に起動し、spec-implコマンドを実行することを確認
