# Bug Fix: permission-format-update

## Summary
Claude Codeの新しいパーミッション形式に対応: `Bash(**)`削除、`SlashCommand`→`Skill(kiro:*)`変更、既存設定の自動サニタイズ機能追加

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/projectChecker.ts` | `REQUIRED_BASIC_PERMISSIONS`から`Bash(**)`削除、`REQUIRED_SLASH_COMMAND_PERMISSIONS`を`Skill(kiro:*)`に変更 |
| `electron-sdd-manager/src/main/services/permissionsService.ts` | `sanitizePermissions`関数追加、`addPermissionsToProject`でサニタイズ実行 |
| `electron-sdd-manager/src/main/services/permissionsService.test.ts` | テストをSkill形式に更新、sanitizePermissionsとaddPermissionsToProjectのテスト追加 |

### Code Changes

#### projectChecker.ts - Bash(**) 削除
```diff
 export const REQUIRED_BASIC_PERMISSIONS = [
   'Read(**)',
   'Edit(**)',
   'Write(**)',
   'Glob(**)',
   'Grep(**)',
   'WebSearch',
   'WebFetch',
-  'Bash(**)',
 ] as const;
```

#### projectChecker.ts - SlashCommand → Skill 変更
```diff
-export const REQUIRED_SLASH_COMMAND_PERMISSIONS = [
-  'SlashCommand(/kiro:spec-init:*)',
-  'SlashCommand(/kiro:spec-requirements:*)',
-  // ... 14 commands
-] as const;
+export const REQUIRED_SKILL_PERMISSIONS = [
+  'Skill(kiro:*)',
+] as const;
+
+/** @deprecated Use REQUIRED_SKILL_PERMISSIONS instead */
+export const REQUIRED_SLASH_COMMAND_PERMISSIONS = REQUIRED_SKILL_PERMISSIONS;
```

#### permissionsService.ts - sanitizePermissions 追加
```diff
+const DEPRECATED_PERMISSION_PATTERNS = [
+  'Bash(**)',           // Not a valid pattern
+  /^SlashCommand\(/,    // Replaced by Skill()
+];
+
+export function sanitizePermissions(permissions: string[]): SanitizePermissionsResult {
+  // Removes deprecated patterns from permission list
+}
```

#### permissionsService.ts - addPermissionsToProject サニタイズ統合
```diff
 export async function addPermissionsToProject(...) {
   // ...
+  // Sanitize existing permissions to remove deprecated patterns
+  const sanitizeResult = sanitizePermissions(settings.permissions.allow);
+  if (sanitizeResult.removed.length > 0) {
+    logger.info('[permissionsService] Removed deprecated permissions', { removed: sanitizeResult.removed });
+    settings.permissions.allow = [...sanitizeResult.sanitized];
+  }
   // ...
+  // Add new permissions (also sanitize new permissions)
+  const newPermissionsSanitized = sanitizePermissions([...permissions]);
 }
```

## Implementation Notes
- `sanitizePermissions`は文字列完全一致（`Bash(**)`）と正規表現マッチ（`/^SlashCommand\(/`）の両方をサポート
- 既存の設定ファイルにある非推奨パーミッションはプロジェクト選択時に自動的に削除される
- `REQUIRED_SLASH_COMMAND_PERMISSIONS`は後方互換性のため残し、`@deprecated`マーク付与

## Breaking Changes
- [x] Breaking changes (documented below)

**影響**:
- `REQUIRED_PERMISSIONS`から`Bash(**)`が削除されたため、既存プロジェクトで`Bash(**)`に依存していた場合は個別コマンド指定が必要
- `SlashCommand`形式のパーミッションは自動的に削除されるため、`Skill(kiro:*)`が追加されていることを確認

## Rollback Plan
1. `projectChecker.ts`の変更を元に戻す（`Bash(**)`復元、`SlashCommand`形式復元）
2. `permissionsService.ts`から`sanitizePermissions`関数と関連コード削除
3. テストを元に戻す

## Related Commits
- *To be added after commit*

## Test Results
```
 ✓ checkRequiredPermissions - 5 tests passed
 ✓ sanitizePermissions - 4 tests passed
 ✓ addPermissionsToProject - 2 tests passed

 Test Files  1 passed (1)
      Tests  11 passed (11)
```
