# Bug Fix: bugs-panel-document-not-found

## Summary
`BugService.getBugArtifacts`メソッドでファイル内容（content）を読み込むように修正。これによりBugsタブでバグドキュメントが正しく表示されるようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/bugService.ts` | `getArtifact`関数にファイル内容読み込みを追加 |

### Code Changes

```diff
--- a/electron-sdd-manager/src/main/services/bugService.ts
+++ b/electron-sdd-manager/src/main/services/bugService.ts
@@ -182,12 +182,14 @@ export class BugService {
   private async getBugArtifacts(bugPath: string): Promise<BugDetail['artifacts']> {
     const getArtifact = async (name: string): Promise<BugArtifactInfo | null> => {
       try {
         const filePath = join(bugPath, `${name}.md`);
         const stats = await stat(filePath);
+        const content = await readFile(filePath, 'utf-8');
         return {
           exists: true,
           path: filePath,
           updatedAt: stats.mtime.toISOString(),
+          content,
         };
       } catch {
         return null;
```

## Implementation Notes
- `readFile`は既に`bugService.ts`の1行目でインポート済み
- `BugArtifactInfo`型には`content?: string`が既に定義済み（型変更不要）
- 4つのアーティファクト（report, analysis, fix, verification）すべてに適用される

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
```bash
git checkout HEAD -- electron-sdd-manager/src/main/services/bugService.ts
```

## Test Results
- `bugService.test.ts`: 13 tests passed
- `BugArtifactEditor.test.tsx`: 11 tests passed

## Related Commits
- *Pending commit after verification*
