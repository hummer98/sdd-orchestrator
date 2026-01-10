# Bug Fix: bugs-folder-creation

## Summary
コマンドセットインストール時に `.kiro/bugs` ディレクトリが作成されるように修正

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [unifiedCommandsetInstaller.ts](electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts) | `ensureProjectDirectories`に`.kiro/bugs`を追加 |
| [unifiedCommandsetInstaller.test.ts](electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.test.ts) | `.kiro/bugs`作成のテストケースを追加 |

### Code Changes

#### unifiedCommandsetInstaller.ts
```diff
  /**
   * Ensure required project directories exist
-  * Creates .kiro/steering and .kiro/specs directories if they don't exist
+  * Creates .kiro/steering, .kiro/specs, and .kiro/bugs directories if they don't exist
+  * Bug fix: bugs-folder-creation - Added .kiro/bugs to ensure directory exists for file watching
   * @param projectPath - Project root path
   */
  private async ensureProjectDirectories(projectPath: string): Promise<void> {
    const requiredDirs = [
      path.join(projectPath, '.kiro', 'steering'),
      path.join(projectPath, '.kiro', 'specs'),
+     path.join(projectPath, '.kiro', 'bugs'),
    ];
```

#### unifiedCommandsetInstaller.test.ts
```diff
+ // Bug fix: bugs-folder-creation - ensure .kiro/bugs directory is created
+ it('should create .kiro/bugs directory after profile installation', async () => {
+   const result = await installer.installByProfile(tempDir, 'cc-sdd');
+   expect(result.ok).toBe(true);
+   const bugsDir = path.join(tempDir, '.kiro', 'bugs');
+   const dirExists = await fs.access(bugsDir).then(() => true).catch(() => false);
+   expect(dirExists).toBe(true);
+ });
```

Also updated the test `should create steering, specs, and bugs directories for all profiles` to verify all three directories.

## Implementation Notes
- 分析で推奨されたOption 1（ensureProjectDirectoriesへの追加）を採用
- 最小限の変更（1行追加）で修正を完了
- 既存のパターンに従い、docstringとコメントにバグ修正の参照を追加
- テストケースを追加して、将来のリグレッションを防止

## Breaking Changes
- [x] No breaking changes

この修正は新しいディレクトリを追加するだけであり、既存の動作に影響を与えない。

## Test Results
```
Test Files  1 passed (1)
     Tests  29 passed (29)
  Duration  1.42s
```

新しく追加したテスト:
- `should create .kiro/bugs directory after profile installation`
- `should create steering, specs, and bugs directories for all profiles`（更新）

## Rollback Plan
1. `unifiedCommandsetInstaller.ts`から`.kiro/bugs`行を削除
2. `unifiedCommandsetInstaller.test.ts`からbugs関連のテストを削除
3. テストを再実行して確認

## Related Commits
- *コミット待ち*
