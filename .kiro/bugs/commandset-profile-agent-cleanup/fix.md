# Bug Fix: commandset-profile-agent-cleanup

## Summary
cc-sdd-agentプロファイルから他のプロファイルへ切り替える際、既存のagentフォルダ（.claude/agents/kiro/）の処理に関する3択確認ダイアログを実装した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/ipc/channels.ts` | CHECK_AGENT_FOLDER_EXISTS, DELETE_AGENT_FOLDER チャネル追加 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | agentフォルダ存在確認・削除のIPCハンドラー追加 |
| `electron-sdd-manager/src/preload/index.ts` | checkAgentFolderExists, deleteAgentFolder API追加 |
| `electron-sdd-manager/src/renderer/components/CommandsetInstallDialog.tsx` | agent-cleanup-confirm状態と3択ダイアログUI追加 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | ElectronAPI型定義にメソッド追加 |
| `electron-sdd-manager/src/renderer/App.tsx` | CommandsetInstallDialogに新しいprops追加 |

### Code Changes

**1. IPCチャネル追加（channels.ts）:**
```diff
+  // Agent Folder Management (commandset-profile-agent-cleanup)
+  CHECK_AGENT_FOLDER_EXISTS: 'ipc:check-agent-folder-exists',
+  DELETE_AGENT_FOLDER: 'ipc:delete-agent-folder',
```

**2. IPCハンドラー追加（handlers.ts）:**
```diff
+  ipcMain.handle(
+    IPC_CHANNELS.CHECK_AGENT_FOLDER_EXISTS,
+    async (_event, projectPath: string): Promise<boolean> => {
+      const agentFolderPath = join(projectPath, '.claude', 'agents', 'kiro');
+      try {
+        await access(agentFolderPath);
+        return true;
+      } catch {
+        return false;
+      }
+    }
+  );
+
+  ipcMain.handle(
+    IPC_CHANNELS.DELETE_AGENT_FOLDER,
+    async (_event, projectPath: string): Promise<{ ok: true } | { ok: false; error: string }> => {
+      const agentFolderPath = join(projectPath, '.claude', 'agents', 'kiro');
+      try {
+        await rm(agentFolderPath, { recursive: true, force: true });
+        return { ok: true };
+      } catch (error) {
+        return { ok: false, error: error.message };
+      }
+    }
+  );
```

**3. ダイアログ状態追加（CommandsetInstallDialog.tsx）:**
```diff
-type DialogState = 'selection' | 'installing' | 'complete';
+type DialogState = 'selection' | 'agent-cleanup-confirm' | 'installing' | 'complete';

+type AgentCleanupChoice = 'keep' | 'delete' | 'cancel';
```

**4. 3択確認ダイアログUI追加:**
- 「エージェントを維持」ボタン - 削除せずにインストール続行
- 「削除する」ボタン - agentフォルダを削除してからインストール
- 「キャンセル」ボタン - プロファイル選択に戻る

## Implementation Notes
- ダイアログ表示条件: 選択したプロファイルがagentを含まない（cc-sddまたはspec-manager）かつ、既存のagentフォルダが存在する場合
- agentフォルダの存在確認はダイアログオープン時に非同期で実行
- 削除処理は`fs/promises`の`rm`を使用（recursive: true, force: true）
- 既存のテストは全て成功（36テスト）

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. 追加した6ファイルの変更を元に戻す
2. 特別なデータマイグレーションは不要

## Related Commits
- *コミット待ち*
