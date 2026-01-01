# Bug Fix: electron-bug-create-command

## Summary
専用IPCハンドラー`EXECUTE_BUG_CREATE`を追加し、CreateBugDialogがspec-initと同じパターンで正しく`claude` CLIを実行するように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/ipc/channels.ts` | `EXECUTE_BUG_CREATE` IPCチャネル追加 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | `EXECUTE_BUG_CREATE` IPCハンドラー追加 |
| `electron-sdd-manager/src/preload/index.ts` | `executeBugCreate` API追加 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | `executeBugCreate` 型定義追加 |
| `electron-sdd-manager/src/renderer/components/CreateBugDialog.tsx` | 専用IPC呼び出しに変更 |
| `electron-sdd-manager/src/renderer/components/CreateBugDialog.test.tsx` | テスト更新 |

### Code Changes

**channels.ts: IPCチャネル追加**
```diff
  EXECUTE_SPEC_INIT: 'ipc:execute-spec-init',
+ EXECUTE_BUG_CREATE: 'ipc:execute-bug-create',
```

**handlers.ts: IPCハンドラー追加**
```diff
+ ipcMain.handle(
+   IPC_CHANNELS.EXECUTE_BUG_CREATE,
+   async (event, projectPath: string, description: string) => {
+     const result = await service.startAgent({
+       specId: '',
+       phase: 'bug-create',
+       command: 'claude',
+       args: ['-p', '--verbose', '--output-format', 'stream-json', `/kiro:bug-create "${description}"`],
+       group: 'doc',
+     });
+     return result.value;
+   }
+ );
```

**CreateBugDialog.tsx: IPC呼び出しに変更**
```diff
- const command = '/kiro:bug-create';
- const args: string[] = [bugName, `"${trimmedDescription}"`];
- const agentId = await startAgent('', 'bug-create', command, args, undefined, undefined);
+ const agentInfo = await window.electronAPI.executeBugCreate(currentProject, trimmedDescription);
+ addAgent('', agentInfo);
```

## Implementation Notes
- spec-initと同じアーキテクチャパターンを採用
- bug名はUI側で生成せず、Claude側で説明から自動生成（bug-create.md仕様に準拠）
- 正しいCLIオプション（`-p`, `--verbose`, `--output-format stream-json`）が渡されるようになった

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. 変更された6ファイルを元に戻す
2. TypeScriptコンパイルを確認
3. テストを実行

## Related Commits
- *修正完了後にコミット予定*
