# Bug Fix: spec-json-update-timing

## Summary

`specsWatcherService`にアーティファクト生成検知機能を追加。requirements.md, design.md, tasks.mdが生成されたときに`spec.json`の`updated_at`を更新するようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/specsWatcherService.ts` | アーティファクト生成検知とupdated_at更新機能を追加 |
| `.kiro/steering/tech.md` | updated_at更新ルールのドキュメントを追加 |
| `.kiro/bugs/spec-json-update-timing/analysis.md` | 分析内容を更新 |

### Code Changes

**1. インポート追加**
```diff
-import { readFile } from 'fs/promises';
+import { readFile, writeFile } from 'fs/promises';
```

**2. handleEventにアーティファクト生成検知を追加**
```diff
+    // Check for artifact file generation (requirements.md, design.md, tasks.md)
+    // These are user-initiated actions via skills, so we update updated_at
+    const fileName = path.basename(filePath);
+    const artifactFiles = ['requirements.md', 'design.md', 'tasks.md'];
+    if (type === 'add' && artifactFiles.includes(fileName) && specId) {
+      this.handleArtifactGeneration(filePath, specId, fileName).catch((error) => {
+        logger.error('[SpecsWatcherService] Failed to handle artifact generation', { error, specId, fileName });
+      });
+    }
+
     // Check if tasks.md was modified and handle completion detection
-    const fileName = path.basename(filePath);
     if ((type === 'change' || type === 'add') && fileName === 'tasks.md' && specId) {
```

**3. handleArtifactGenerationメソッドを追加**
```typescript
/**
 * Handle artifact file generation (requirements.md, design.md, tasks.md)
 * Updates spec.json updated_at when these files are created by user-initiated skill execution
 * This is a user action, so we update the timestamp (unlike auto-corrections which skip it)
 */
private async handleArtifactGeneration(
  filePath: string,
  specId: string,
  fileName: string
): Promise<void> {
  if (!this.fileService) {
    logger.debug('[SpecsWatcherService] FileService not available, skipping artifact generation handling');
    return;
  }

  try {
    const specPath = path.dirname(filePath);
    const specJsonPath = path.join(specPath, 'spec.json');

    const specJsonContent = await readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(specJsonContent);

    // Determine the expected phase based on the artifact file
    const artifactToPhase: Record<string, string> = {
      'requirements.md': 'requirements',
      'design.md': 'design',
      'tasks.md': 'tasks',
    };
    const expectedPhase = artifactToPhase[fileName];

    if (!expectedPhase) {
      return;
    }

    // Update spec.json with new timestamp (user action, so no skipTimestamp)
    specJson.updated_at = new Date().toISOString();
    await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');

    logger.info('[SpecsWatcherService] Artifact generation detected, updated_at refreshed', {
      specId,
      artifact: fileName,
      expectedPhase,
    });
  } catch (error) {
    logger.error('[SpecsWatcherService] Failed to handle artifact generation', {
      specId,
      fileName,
      error,
    });
  }
}
```

## Implementation Notes

- **変更タイプ**: 機能追加（既存動作への影響なし）
- **設計原則**: 「ユーザーアクション時のみupdated_atを更新」を一貫して適用
- **検知タイミング**: `add`イベントのみ（ファイル生成時）。`change`は含めない（既存ファイル編集は別扱い）

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan

`specsWatcherService.ts`の変更を元に戻す：
1. `handleArtifactGeneration`メソッドを削除
2. `handleEvent`内のアーティファクト検知ブロックを削除
3. `writeFile`インポートを削除

## Related Commits
- *To be committed*
