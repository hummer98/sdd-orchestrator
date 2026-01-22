# Bug Fix: project-agent-no-response

## Summary
`getAllSpecIds()` メソッドを修正し、ProjectAgent（specId=''）をエージェント検索対象に含めるようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/agentRecordService.ts` | `getAllSpecIds()` にProjectAgentの空specIdサポートを追加 |

### Code Changes

```diff
  /**
   * Get all spec IDs that have agent records
   * Requirements: agent-state-file-ssot (for getAllAgents)
+  * Bug fix: project-agent-no-response - Include empty specId for ProjectAgents
-  * @returns Array of spec IDs (directory names under basePath)
+  * @returns Array of spec IDs (directory names under basePath, plus '' for ProjectAgents)
   */
  async getAllSpecIds(): Promise<string[]> {
    try {
-     const specDirs = await fs.readdir(this.basePath, { withFileTypes: true });
-     return specDirs.filter((d) => d.isDirectory()).map((d) => d.name);
+     const entries = await fs.readdir(this.basePath, { withFileTypes: true });
+     const specIds: string[] = [];
+
+     // Check for ProjectAgents (empty specId) - JSON files directly in basePath
+     const hasProjectAgents = entries.some((e) => e.isFile() && e.name.endsWith('.json'));
+     if (hasProjectAgents) {
+       specIds.push(''); // Empty specId for ProjectAgents
+     }
+
+     // Add spec/bug directories
+     specIds.push(...entries.filter((d) => d.isDirectory()).map((d) => d.name));
+
+     return specIds;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
```

## Implementation Notes

- `getRunningAgentCounts()` で既に同様のProjectAgent特殊処理が存在していたため、一貫性のあるパターンを適用
- `findRecordByAgentId()` は `getAllSpecIds()` を使用するため、この修正により自動的にProjectAgentを検索対象に含む
- 検索順序：ProjectAgent（空specId）が最初に検索され、その後spec/bugディレクトリが検索される

## Breaking Changes
- [x] No breaking changes

`getAllSpecIds()` は空specIdを含む配列を返すようになるが、既存の呼び出し元では空specIdをディレクトリパスとして使用した場合でもbasePath直下のファイルを参照するため、動作に問題なし。

## Rollback Plan
`getAllSpecIds()` を元のディレクトリのみをフィルタするロジックに戻す。

## Related Commits
- *Pending: to be committed after verification*
