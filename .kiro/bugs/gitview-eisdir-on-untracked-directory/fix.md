# Bug Fix: gitview-eisdir-on-untracked-directory

## Summary
`parsePorcelain()` メソッドにディレクトリフィルタリングロジックを追加し、未追跡ディレクトリをファイルリストから除外することで、EISDIRエラーを解消しました。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/GitService.ts` | Line 343にディレクトリ除外ロジックを追加（末尾スラッシュの検出） |

### Code Changes

```diff
 private parsePorcelain(output: string): GitFileStatus[] {
   const files: GitFileStatus[] = [];
   const lines = output.split('\n').filter(line => line.trim());

   for (const line of lines) {
     const statusCode = line.substring(0, 2).trim();
-    const path = line.substring(3).trim();
+    let path = line.substring(3).trim();
+
+    // Skip directories (git status --porcelain reports untracked dirs with trailing slash)
+    if (path.endsWith('/')) {
+      continue;
+    }

     let status: GitFileStatus['status'];
```

## Implementation Notes

### Design Decision
- **Approach**: `parsePorcelain()` の段階でディレクトリを除外（推奨アプローチを採用）
- **Rationale**:
  - Gitのセマンティクスに準拠（ディレクトリは追跡対象ではない）
  - SSOT原則に従う（GitFileStatusはファイルのみを扱う）
  - 最小限の変更（3行追加のみ）
- **Alternative Rejected**: 型定義を拡張してディレクトリフラグを追加する案は、過剰設計として却下

### Technical Details
- `git status --porcelain` は未追跡ディレクトリを末尾スラッシュ付きで報告（例: `?? .kiro/bugs/foo/`）
- 末尾スラッシュを検出して `continue` でループをスキップ
- ディレクトリは `GitFileStatus[]` に含まれなくなり、UI側に表示されない
- `generateUntrackedDiff()` が呼ばれることがなくなり、EISDIRエラーが発生しない

### Test Results
- 全25テスト中19がパス、6がスキップ（既存の動作）
- リグレッションなし
- 統合テストで間接的に `parsePorcelain()` の動作を確認

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

**UI Behavior Change**:
- 未追跡ディレクトリがGitViewのファイルリストに**表示されなくなる**
- これはバグではなく意図的な仕様変更（Gitのセマンティクスに準拠）
- ユーザーは個々の未追跡ファイルのみを表示・操作する

## Rollback Plan
修正は1つのメソッド内の3行追加のみ。ロールバックは容易：

```bash
git revert <commit-hash>
```

または手動で以下の3行を削除：
```typescript
// Skip directories (git status --porcelain reports untracked dirs with trailing slash)
if (path.endsWith('/')) {
  continue;
}
```
および `let path` → `const path` に戻す。

## Related Commits
*(コミット作成後に記載予定)*
