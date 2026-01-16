# Bug Fix: worktree-impl-start-trim-error

## Summary
`ExecFunction`型定義をNode.jsの`child_process.exec`の実際のコールバックシグネチャに合わせて修正し、`Cannot read properties of undefined (reading 'trim')`エラーを解消。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/worktreeService.ts` | ExecFunction型のコールバックシグネチャを修正、execGitメソッドのコールバック引数を修正 |
| `electron-sdd-manager/src/main/services/worktreeService.test.ts` | createMockExec関数とインラインモック関数のコールバックシグネチャを修正 |

### Code Changes

**worktreeService.ts - 型定義の修正 (20-25行目)**
```diff
 export type ExecFunction = (
   command: string,
   options: { cwd: string },
-  callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
+  callback: (error: Error | null, stdout: string, stderr: string) => void
 ) => { kill: () => void };
```

**worktreeService.ts - execGitメソッドのコールバック引数修正 (113-123行目)**
```diff
-        (error, result) => {
+        (error, stdout, _stderr) => {
           if (error) {
             const message = error.message || String(error);
             logger.error('[WorktreeService] Git command failed', { command, error: message });
             resolve({
               ok: false,
               error: { type: 'GIT_ERROR', message },
             });
           } else {
-            resolve({ ok: true, value: result.stdout.trim() });
+            resolve({ ok: true, value: stdout.trim() });
           }
         }
```

**worktreeService.test.ts - createMockExec関数の修正 (16-35行目)**
```diff
 function createMockExec(responses: Array<{ pattern: RegExp; stdout?: string; stderr?: string; error?: Error }>): ExecFunction {
   return (
     command: string,
     _options: { cwd: string },
-    callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
+    callback: (error: Error | null, stdout: string, stderr: string) => void
   ) => {
     for (const response of responses) {
       if (response.pattern.test(command)) {
         if (response.error) {
-          callback(response.error, { stdout: '', stderr: response.stderr || response.error.message });
+          callback(response.error, '', response.stderr || response.error.message);
         } else {
-          callback(null, { stdout: response.stdout || '', stderr: response.stderr || '' });
+          callback(null, response.stdout || '', response.stderr || '');
         }
         return { kill: vi.fn() };
       }
     }
     // Default: success with empty output
-    callback(null, { stdout: '', stderr: '' });
+    callback(null, '', '');
     return { kill: vi.fn() };
   };
 }
```

**worktreeService.test.ts - インラインモック関数の修正 (443-463行目)**
```diff
       const mockExec = (
         command: string,
         _options: { cwd: string },
-        callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
+        callback: (error: Error | null, stdout: string, stderr: string) => void
       ) => {
         if (/branch --show-current/.test(command)) {
-          callback(null, { stdout: 'main\n', stderr: '' });
+          callback(null, 'main\n', '');
         } else if (/branch bugfix\//.test(command) && !/branch -d/.test(command)) {
-          callback(null, { stdout: '', stderr: '' });
+          callback(null, '', '');
         } else if (/worktree add/.test(command)) {
-          callback(new Error('fatal: worktree add failed'), { stdout: '', stderr: '' });
+          callback(new Error('fatal: worktree add failed'), '', '');
         } else if (/branch -d/.test(command)) {
           branchDeleteCalled = true;
-          callback(null, { stdout: '', stderr: '' });
+          callback(null, '', '');
         } else {
-          callback(null, { stdout: '', stderr: '' });
+          callback(null, '', '');
         }
         return { kill: () => {} };
       };
```

## Implementation Notes
- 根本原因: `ExecFunction`型がNode.jsの`exec`コールバックシグネチャと不一致
  - Node.js: `callback: (error, stdout, stderr) => void`
  - 誤った定義: `callback: (error, result: { stdout, stderr }) => void`
- `nodeExec as unknown as ExecFunction`のダブルキャストが型エラーを隠蔽していた
- テストはモック関数が型定義通りの形式で値を返すため成功していたが、本番環境では実際のNode.js APIが呼ばれるため失敗

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

型定義の変更は内部実装の修正であり、外部APIに影響なし。

## Rollback Plan
1. `worktreeService.ts`の型定義とコールバック引数を元に戻す
2. `worktreeService.test.ts`のモック関数を元に戻す

## Related Commits
- *To be created after verification*
