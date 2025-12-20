# Bug Fix: profile-validation-mismatch

## Summary
プロファイル別のコマンドリストを導入し、ProjectCheckerとvalidationServiceがプロファイルに応じた正しいコマンドセットでバリデーションを行うように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/projectChecker.ts` | プロファイル別コマンドリスト（COMMANDS_BY_PROFILE）を追加、checkSlashCommandsForProfileメソッドを追加 |
| `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts` | installByProfile時にprofile.jsonを保存する処理を追加 |
| `electron-sdd-manager/src/main/services/validationService.ts` | getRequiredFiles関数をプロファイル別コマンドリストを使用するように修正 |

### Code Changes

#### projectChecker.ts - プロファイル別コマンドリスト追加
```diff
+ export type ProfileName = 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';
+
+ export interface ProfileConfig {
+   readonly profile: ProfileName;
+   readonly installedAt: string;
+   readonly version?: string;
+ }
+
+ export const CC_SDD_PROFILE_COMMANDS = [
+   'kiro/spec-init',
+   'kiro/spec-requirements',
+   // ... (spec-quickを含まない)
+ ] as const;
+
+ export const CC_SDD_AGENT_PROFILE_COMMANDS = [
+   'kiro/spec-init',
+   'kiro/spec-quick',  // cc-sdd-agentのみ
+   // ...
+ ] as const;
+
+ export const COMMANDS_BY_PROFILE: Record<ProfileName, readonly string[]> = {
+   'cc-sdd': [...CC_SDD_PROFILE_COMMANDS, ...BUG_PROFILE_COMMANDS, ...DOCUMENT_REVIEW_COMMANDS],
+   'cc-sdd-agent': [...CC_SDD_AGENT_PROFILE_COMMANDS, ...BUG_PROFILE_COMMANDS, ...DOCUMENT_REVIEW_COMMANDS],
+   'spec-manager': [...CC_SDD_PROFILE_COMMANDS, ...BUG_PROFILE_COMMANDS, ...DOCUMENT_REVIEW_COMMANDS],
+ };
```

#### projectChecker.ts - 新しいメソッド追加
```diff
+ async checkSlashCommandsForProfile(
+   projectPath: string,
+   profile?: ProfileName
+ ): Promise<FileCheckResult> {
+   let effectiveProfile = profile;
+   if (!effectiveProfile) {
+     const config = await readProfileConfig(projectPath);
+     effectiveProfile = config?.profile || 'cc-sdd-agent';
+   }
+   const requiredCommands = getCommandsForProfile(effectiveProfile);
+   // ... check commands
+ }
```

#### unifiedCommandsetInstaller.ts - profile.json保存処理追加
```diff
+ private async saveProfileConfig(
+   projectPath: string,
+   profileName: ProfileName
+ ): Promise<void> {
+   const configPath = join(projectPath, '.kiro', 'settings', 'profile.json');
+   const config: ProfileConfig = {
+     profile: profileName,
+     installedAt: new Date().toISOString(),
+   };
+   await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
+ }
```

#### validationService.ts - プロファイル別コマンドリスト使用
```diff
  case 'cc-sdd':
-   commands.push(...CC_SDD_COMMANDS);
+   commands.push(...CC_SDD_PROFILE_COMMANDS.map(c => c.replace('kiro/', '')));
+   commands.push(...DOCUMENT_REVIEW_COMMANDS.map(c => c.replace('kiro/', '')));
    break;
+ case 'cc-sdd-agent':
+   commands.push(...CC_SDD_AGENT_PROFILE_COMMANDS.map(c => c.replace('kiro/', '')));
+   commands.push(...DOCUMENT_REVIEW_COMMANDS.map(c => c.replace('kiro/', '')));
+   break;
```

## Implementation Notes
- `REQUIRED_COMMANDS`は後方互換性のため残し、`@deprecated`マークを追加
- profile.jsonが存在しない既存プロジェクトでは、cc-sdd-agent（最大セット）にフォールバック
- 既存のcheckSlashCommandsメソッドは維持し、新しいcheckSlashCommandsForProfileメソッドを追加

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

既存のAPIは維持され、新しいメソッドが追加されただけなので破壊的変更はありません。

## Rollback Plan
1. projectChecker.tsから新しい定数・関数・メソッドを削除
2. unifiedCommandsetInstaller.tsからsaveProfileConfig呼び出しを削除
3. validationService.tsのgetRequiredFilesを元の実装に戻す

## Test Results
- projectChecker.test.ts: 12 tests passed
- validationService.test.ts: 17 tests passed
- unifiedCommandsetInstaller.test.ts: 20 tests passed
- TypeScript build: Success (no errors)

## Related Commits
- *To be added after commit*
