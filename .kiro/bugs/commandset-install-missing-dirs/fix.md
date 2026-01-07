# Bug Fix: commandset-install-missing-dirs

## Summary
コマンドセットインストール完了後に `.kiro/steering` と `.kiro/specs` ディレクトリを自動作成するように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts` | `ensureProjectDirectories()` メソッドを追加し、`installMultiple()` の最後で呼び出すように修正 |
| `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.test.ts` | ディレクトリ作成機能のテストケースを追加 |

### Code Changes

**1. Import追加** (unifiedCommandsetInstaller.ts:7-8)
```diff
+ import { mkdir } from 'fs/promises';
+ import path from 'path';
  import { CcSddWorkflowInstaller, InstallOptions, InstallResult, InstallError, Result } from './ccSddWorkflowInstaller';
```

**2. ensureProjectDirectories() メソッド追加** (unifiedCommandsetInstaller.ts:438-457)
```diff
+ /**
+  * Ensure required project directories exist
+  * Creates .kiro/steering and .kiro/specs directories if they don't exist
+  * @param projectPath - Project root path
+  */
+ private async ensureProjectDirectories(projectPath: string): Promise<void> {
+   const requiredDirs = [
+     path.join(projectPath, '.kiro', 'steering'),
+     path.join(projectPath, '.kiro', 'specs'),
+   ];
+
+   for (const dir of requiredDirs) {
+     try {
+       await mkdir(dir, { recursive: true });
+     } catch (error) {
+       // Log but don't fail installation if directory creation fails
+       console.warn(`[UnifiedCommandsetInstaller] Failed to create directory: ${dir}`, error);
+     }
+   }
+ }
```

**3. installMultiple() でディレクトリ作成を呼び出し** (unifiedCommandsetInstaller.ts:393-394)
```diff
    // Record versions for successfully installed commandsets
    // Requirements (commandset-version-detection): 1.1, 1.2, 1.3, 1.4
    if (successfullyInstalled.length > 0) {
      await this.recordCommandsetVersions(projectPath, successfullyInstalled);
    }

+   // Ensure required project directories exist (.kiro/steering, .kiro/specs)
+   await this.ensureProjectDirectories(projectPath);

    return {
      ok: true,
```

**4. テストケース追加** (unifiedCommandsetInstaller.test.ts:503-565)
- `should create .kiro/steering directory after profile installation`
- `should create .kiro/specs directory after profile installation`
- `should create both steering and specs directories for all profiles`
- `should not fail if directories already exist`

## Implementation Notes

- `mkdir` は `recursive: true` オプションを使用しているため、親ディレクトリ（`.kiro`）が存在しない場合も自動的に作成される
- ディレクトリ作成に失敗してもインストール全体は失敗させず、警告をログに出力するのみ
- 既存のディレクトリやファイルがある場合は上書きせず、そのまま保持される
- 全プロファイル（`cc-sdd`, `cc-sdd-agent`, `spec-manager`）で同様に動作

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `ensureProjectDirectories()` メソッドの呼び出しを `installMultiple()` から削除
2. `ensureProjectDirectories()` メソッド自体を削除
3. import文から `mkdir` と `path` を削除

## Test Results

```
 ✓ src/main/services/unifiedCommandsetInstaller.test.ts (28 tests) 769ms
   ✓ project directories creation
     ✓ should create .kiro/steering directory after profile installation
     ✓ should create .kiro/specs directory after profile installation
     ✓ should create both steering and specs directories for all profiles
     ✓ should not fail if directories already exist

 Test Files  1 passed (1)
      Tests  28 passed (28)
```

## Related Commits
- *To be added after commit*
