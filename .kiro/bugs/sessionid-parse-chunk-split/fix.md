# Bug Fix: sessionid-parse-chunk-split

## Summary
stdoutのチャンク分割に対応したバッファリングロジックを`parseAndUpdateSessionId()`に追加し、sessionIdが正しく抽出されるよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/specManagerService.ts` | バッファリングロジック追加、クリーンアップ処理追加 |

### Code Changes

#### 1. バッファフィールド追加（行379-380）
フィールド自体は既に追加済みだったため、変更なし。
```typescript
// Buffer for sessionId parsing across chunked stdout data
private sessionIdParseBuffers: Map<string, string> = new Map();
```

#### 2. `parseAndUpdateSessionId()`メソッドの更新（行1314-1377）
```diff
  /**
   * Parse sessionId from Claude Code stream-json output
   * Claude Code outputs session_id in the first "system/init" message
+  *
+  * Uses buffering to handle chunked stdout data where JSON lines may be split
+  * across multiple data events (Node.js child process stdout does not guarantee
+  * line-aligned chunks).
   */
  private parseAndUpdateSessionId(agentId: string, specId: string, data: string): void {
-   // Already have sessionId for this agent
+   // Already have sessionId for this agent - cleanup buffer and return
    const agent = this.registry.get(agentId);
    if (agent?.sessionId) {
+     this.sessionIdParseBuffers.delete(agentId);
      return;
    }

-   try {
-     // Claude Code outputs JSON lines, try to parse each line
-     const lines = data.split('\n').filter((line) => line.trim());
-     for (const line of lines) {
-       try {
-         const parsed = JSON.parse(line);
+   // Combine with previous incomplete data from buffer
+   const buffer = (this.sessionIdParseBuffers.get(agentId) || '') + data;
+   const lines = buffer.split('\n');
+
+   // Last element after split: empty string if buffer ended with \n, otherwise incomplete line
+   const lastLine = lines.pop() || '';
+   if (lastLine) {
+     // Incomplete line - save for next chunk
+     this.sessionIdParseBuffers.set(agentId, lastLine);
+   } else {
+     // Buffer ended with \n - no incomplete data
+     this.sessionIdParseBuffers.delete(agentId);
+   }
+
+   // Process complete lines only
+   for (const line of lines) {
+     if (!line.trim()) continue;
+     try {
+       const parsed = JSON.parse(line);
        // Check for system/init message with session_id
        if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
          // ... sessionId update logic (unchanged)
+         this.sessionIdParseBuffers.delete(agentId);
          return;
        }
-       } catch {
-         // Not valid JSON, skip this line
-       }
+     } catch {
+       // Not valid JSON, skip this line
      }
-   } catch (err) {
-     // Parsing error, ignore
-     logger.debug('[SpecManagerService] Failed to parse output for sessionId', { agentId });
    }
  }
```

#### 3. エージェント終了時のバッファクリーンアップ

`startAgent()`の`onExit`ハンドラ（行673-699）:
```diff
  process.onExit((code) => {
    const currentAgent = this.registry.get(agentId);
    if (currentAgent?.status === 'interrupted') {
      this.processes.delete(agentId);
      this.forcedKillSuccess.delete(agentId);
+     this.sessionIdParseBuffers.delete(agentId);
      return;
    }

    const isForcedSuccess = this.forcedKillSuccess.has(agentId);
    this.forcedKillSuccess.delete(agentId);
+   this.sessionIdParseBuffers.delete(agentId);
    // ...
  });
```

`startAgent()`の`onError`ハンドラ（行701-714）:
```diff
  process.onError(() => {
    this.registry.updateStatus(agentId, 'failed');
    this.statusCallbacks.forEach((cb) => cb(agentId, 'failed'));
    this.processes.delete(agentId);
+   this.sessionIdParseBuffers.delete(agentId);
    // ...
  });
```

`resumeAgent()`にも同様のクリーンアップを追加（行970-1004）。

## Implementation Notes
- バッファリングはJSONLストリームの正しい処理方法
- Node.jsの子プロセスstdoutは任意の位置でデータを分割して配信するため、行境界でのバッファリングが必要
- `String.split('\n')`の結果:
  - 末尾が`\n`の場合: 最後の要素は空文字列
  - 末尾が`\n`でない場合: 最後の要素は不完全な行
- この性質を利用して、不完全な行をバッファに保持

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
`parseAndUpdateSessionId()`を元のシンプルな実装に戻し、`sessionIdParseBuffers`フィールドとクリーンアップ処理を削除。

## Test Results
```
 Test Files  3 passed (3)
      Tests  75 passed (75)
```

## Related Commits
- *Pending commit*
