# Bug Fix: profile-config-unification

## Summary
プロジェクト設定を`.kiro/settings/profile.json`から`.kiro/sdd-orchestrator.json`に統合。version 2スキーマを導入し、profileとlayoutの両方を単一ファイルで管理可能にした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `layoutConfigService.ts` | version 2スキーマ追加、`projectConfigService`導入、`loadProfile`/`saveProfile`メソッド追加 |
| `projectChecker.ts` | `projectConfigService`を使用するよう変更、`profile.json`への参照を削除 |
| `unifiedCommandsetInstaller.ts` | `projectConfigService.saveProfile()`を使用するよう変更 |
| `layoutConfigService.test.ts` | 新スキーマとprofile関連テストを追加 |
| `projectChecker.test.ts` | テストヘルパーを`sdd-orchestrator.json`形式に更新 |

### Code Changes

#### 新しいスキーマ (version 2)
```typescript
// 統合設定ファイルのスキーマ
export const ProjectConfigSchema = z.object({
  version: z.literal(2),
  profile: ProfileConfigSchema.optional(),
  layout: LayoutValuesSchema.optional(),
});

export const ProfileConfigSchema = z.object({
  name: z.enum(['cc-sdd', 'cc-sdd-agent', 'spec-manager']),
  installedAt: z.string(),
});
```

#### projectConfigService (新API)
```typescript
export const projectConfigService = {
  async loadProfile(projectPath: string): Promise<ProfileConfig | null>,
  async saveProfile(projectPath: string, profile: ProfileConfig): Promise<void>,
  async loadLayoutConfig(projectPath: string): Promise<LayoutValues | null>,
  async saveLayoutConfig(projectPath: string, layout: LayoutValues): Promise<void>,
  async resetLayoutConfig(projectPath: string): Promise<void>,
};

// 後方互換エイリアス
export const layoutConfigService = projectConfigService;
```

#### projectChecker.ts の変更
```diff
- import { readFile } from 'fs/promises';
+ import { projectConfigService } from './layoutConfigService';

- async function readProfileConfig(projectPath: string): Promise<ProfileConfig | null> {
-   const configPath = getProfileConfigPath(projectPath);
-   const content = await readFile(configPath, 'utf-8');
-   const config = JSON.parse(content);
-   return config;
- }
+ async function readProfileConfig(projectPath: string): Promise<ProfileConfig | null> {
+   const profile = await projectConfigService.loadProfile(projectPath);
+   if (profile && COMMANDS_BY_PROFILE[profile.name]) {
+     return { profile: profile.name, installedAt: profile.installedAt };
+   }
+   return null;
+ }
```

#### unifiedCommandsetInstaller.ts の変更
```diff
- import { writeFile, mkdir } from 'fs/promises';
- import { REQUIRED_PERMISSIONS, ProfileConfig } from './projectChecker';
+ import { REQUIRED_PERMISSIONS } from './projectChecker';
+ import { projectConfigService, ProfileConfig } from './layoutConfigService';

  private async saveProfileConfig(projectPath: string, profileName: ProfileName): Promise<void> {
-   const configPath = join(projectPath, '.kiro', 'settings', 'profile.json');
-   const config: ProfileConfig = { profile: profileName, installedAt: new Date().toISOString() };
-   await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
+   const config: ProfileConfig = { name: profileName, installedAt: new Date().toISOString() };
+   await projectConfigService.saveProfile(projectPath, config);
  }
```

## Implementation Notes
- version 1からのマイグレーション：読み込み時に自動的にversion 2形式に変換
- 既存の`layoutConfigService`は`projectConfigService`のエイリアスとして後方互換性を維持
- profileとlayoutは独立して保存可能（片方がnull/undefinedでも他方は保持される）

## Breaking Changes
- [x] Breaking changes (documented below)

**Breaking Change**: `.kiro/settings/profile.json`は使用されなくなりました。新規インストールでは`.kiro/sdd-orchestrator.json`にprofile情報が保存されます。

ただし、後方互換性は不要との指示により、マイグレーションパスは提供していません。

## Rollback Plan
1. 変更をrevertする
2. 既存の`.kiro/sdd-orchestrator.json`から手動でprofile情報を`.kiro/settings/profile.json`に移行

## Related Commits
- (コミット未実施)

## Test Results
```
Test Files  2 passed (2)
Tests       62 passed (62)
```
