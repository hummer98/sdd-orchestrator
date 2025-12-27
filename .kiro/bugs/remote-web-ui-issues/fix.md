# Bug Fix: remote-web-ui-issues

## Summary
RemoteWebサーバーのUIに存在した4つの問題を修正：Agent一覧のタイトル表示、Agentログのフォーマット、ヘッダーとコンテンツの重なり、ワークフロー状態とボタン表記の不整合。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/remote-ui/index.html` | logFormatter.jsの読み込み追加、Detail sectionのコンテンツ領域にpadding-top追加 |
| `electron-sdd-manager/src/main/remote-ui/components.js` | Agent phase表示改善、LogViewer整形表示対応、phase判定ロジック改善 |
| `electron-sdd-manager/src/main/remote-ui/logFormatter.js` | 新規作成 - Claude CLI stream-jsonログのパース・整形表示ユーティリティ |

### Code Changes

#### Issue 1: Agent一覧のタイトルが "unknown" になる問題の修正
```diff
// components.js - updateAgentList()
+      // Extract phase from agentId if not explicitly set (agentId format: specName-phase-timestamp)
+      const displayPhase = agent.phase || this.extractPhaseFromId(agent.id) || 'Agent';

       return `
         <div class="...">
           <div class="flex-1 min-w-0">
-            <div class="text-sm font-medium truncate">${agent.phase || 'Unknown'}</div>
+            <div class="text-sm font-medium truncate">${displayPhase}</div>
```

新規メソッド `extractPhaseFromId()` を追加し、agentIdからフェーズ名を抽出。

#### Issue 2: Agentログの整形表示
```diff
// index.html
   <script src="websocket.js"></script>
+  <script src="logFormatter.js"></script>
   <script src="components.js"></script>
```

```diff
// components.js - renderEntry()
+  // Try to parse and format the log data using LogFormatter
+  if (data && window.LogFormatter) {
+    const formattedLines = window.LogFormatter.formatLogData(data);
+    if (formattedLines.length > 0) {
+      return formattedLines.map(line => this.renderFormattedLine(line, timestamp)).join('');
+    }
+  }
+  // Fallback: render as raw log entry
+  return this.renderRawEntry(entry);
```

新規ファイル `logFormatter.js` を作成。Electron版の`logFormatter.ts`をバニラJS版に移植。

#### Issue 3: ヘッダーとコンテンツの重なり修正
```diff
// index.html - spec-detail-section, bug-detail-section
-      <div class="p-4 space-y-4">
+      <div class="p-4 pt-16 space-y-4">
```

#### Issue 4: ワークフロー状態とボタン表記の不整合修正
```diff
// components.js - getPhaseStatusFromSpec()
     // Fallback: derive from phase string
-    const phaseString = spec.phase || 'ready';
+    // SpecPhase values: 'initialized', 'requirements-generated', 'design-generated', 'tasks-generated', 'implementation-complete'
+    const phaseString = spec.phase || 'initialized';
     switch (phaseString) {
       case 'implementation-complete':
-      case 'implementation':
-      case 'tasks-approved':
         result.requirements = 'approved';
         result.design = 'approved';
         result.tasks = 'approved';
         break;
       case 'tasks-generated':
         ...
+      case 'initialized':
+      case 'ready':
+      default:
+        // Nothing generated yet
+        break;
```

## Implementation Notes
- `logFormatter.js`はElectron版の`logFormatter.ts`をそのままバニラJSに移植した実装
- ツールアイコンマッピング、ログパース処理、色クラス生成はElectron版と同一のロジック
- `extractPhaseFromId()`はagentIdに含まれるフェーズ名を検出するためのフォールバック処理
- SpecPhaseの実際の値（`initialized`, `requirements-generated`等）に合わせてフォールバック処理を修正

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `git checkout HEAD~1 -- electron-sdd-manager/src/main/remote-ui/`
2. `rm electron-sdd-manager/src/main/remote-ui/logFormatter.js`

## Test Results
```
✓ src/main/remote-ui/remote-ui.test.ts (81 tests) 10ms

Test Files  1 passed (1)
     Tests  81 passed (81)
```

## Related Commits
- *To be added after commit*
