# Bug Fix: agent-log-duplicate-input

## Summary
AgentLogPanelでstdinログの表示をスキップし、Claude CLIのuserイベント（stdout）のみを表示するよう変更。これにより入力の二重表示を解消。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx` | stdinストリームのログを表示から除外する条件分岐を追加 |

### Code Changes

```diff
--- a/electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx
+++ b/electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx
@@ -62,14 +62,10 @@ export function AgentLogPanel() {
     // Parse each log entry
     logs.forEach((log, logIdx) => {
       if (log.stream === 'stdin') {
-        // stdin shows user input
-        entries.push({
-          id: `${log.id}-stdin-${logIdx}`,
-          type: 'input',
-          text: {
-            content: log.data,
-            role: 'user',
-          },
-        });
+        // Bug fix: stdinは表示しない
+        // Claude CLIのtype: 'user'イベント（stdout）で表示されるため、
+        // ここで表示すると二重表示になる
+        return;
       } else if (log.stream === 'stderr') {
```

## Implementation Notes
- **SSOT遵守**: Claude CLIの`type: 'user'`イベントがユーザー入力の真のソースとして使用される
- **データ保持**: stdinログは内部記録として保持され、将来のデバッグ用途に使用可能
- **最小変更**: AgentLogPanel.tsxの1箇所のみの変更で対応

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
該当コードを元に戻す:
```typescript
if (log.stream === 'stdin') {
  entries.push({
    id: `${log.id}-stdin-${logIdx}`,
    type: 'input',
    text: {
      content: log.data,
      role: 'user',
    },
  });
}
```

## Related Commits
- *Pending commit after verification*
