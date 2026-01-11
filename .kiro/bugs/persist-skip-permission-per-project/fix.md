# Bug Fix: persist-skip-permission-per-project

## Summary
`skipPermissions`設定（`--dangerously-skip-permissions`オプション）がプロジェクト毎に永続化されるよう修正。`sdd-orchestrator.json`の`settings.skipPermissions`フィールドに保存するようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/layoutConfigService.ts` | `settings.skipPermissions`フィールドのスキーマと読み書きメソッドを追加 |
| `electron-sdd-manager/src/main/ipc/channels.ts` | `LOAD_SKIP_PERMISSIONS`と`SAVE_SKIP_PERMISSIONS`チャンネルを追加 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | 新しいIPCハンドラーを追加 |
| `electron-sdd-manager/src/preload/index.ts` | `loadSkipPermissions`と`saveSkipPermissions` APIを公開 |
| `electron-sdd-manager/src/renderer/types/electron.d.ts` | 新しいAPI型定義を追加 |
| `electron-sdd-manager/src/renderer/stores/agentStore.ts` | `setSkipPermissions`で永続化処理を追加、`loadSkipPermissions`アクションを追加 |
| `electron-sdd-manager/src/renderer/App.tsx` | プロジェクト選択時に`skipPermissions`設定を復帰 |

### Code Changes

#### layoutConfigService.ts - スキーマ拡張
```diff
+/**
+ * プロジェクト設定のスキーマ
+ * Bug fix: persist-skip-permission-per-project
+ */
+export const ProjectSettingsSchema = z.object({
+  skipPermissions: z.boolean().optional(),
+});
+
+export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
+
 export const ProjectConfigSchemaV3 = z.object({
   version: z.literal(3),
   profile: ProfileConfigSchema.optional(),
   layout: LayoutValuesSchema.optional(),
   commandsets: z.record(...).optional(),
+  settings: ProjectSettingsSchema.optional(),
 });
```

#### layoutConfigService.ts - 新規メソッド
```diff
+  async loadSkipPermissions(projectPath: string): Promise<boolean> {
+    const config = await loadProjectConfigV3(projectPath);
+    return config?.settings?.skipPermissions ?? false;
+  },
+
+  async saveSkipPermissions(projectPath: string, skipPermissions: boolean): Promise<void> {
+    const existing = await loadProjectConfigV3(projectPath);
+    const config: ProjectConfigV3 = {
+      version: 3,
+      profile: existing?.profile,
+      layout: existing?.layout,
+      commandsets: existing?.commandsets,
+      settings: {
+        ...(existing?.settings ?? {}),
+        skipPermissions,
+      },
+    };
+    await saveProjectConfigV3(projectPath, config);
+  },
```

#### agentStore.ts - 永続化処理追加
```diff
-  setSkipPermissions: (enabled: boolean) => {
+  setSkipPermissions: async (enabled: boolean) => {
     set({ skipPermissions: enabled });
+
+    // Persist to project config file
+    const { useProjectStore } = await import('./projectStore');
+    const currentProject = useProjectStore.getState().currentProject;
+    if (currentProject) {
+      await window.electronAPI.saveSkipPermissions(currentProject, enabled);
+    }
   },
+
+  loadSkipPermissions: async (projectPath: string) => {
+    const skipPermissions = await window.electronAPI.loadSkipPermissions(projectPath);
+    set({ skipPermissions });
+  },
```

#### App.tsx - 復帰処理追加
```diff
   const loadLayout = useCallback(async (projectPath: string) => {
     // ... existing layout loading code ...
+
+    // Bug fix: persist-skip-permission-per-project
+    await loadSkipPermissions(projectPath);
   }, [loadSkipPermissions]);
```

## Implementation Notes
- `sdd-orchestrator.json`に`settings`セクションを追加し、プロジェクト固有の設定を保存
- 既存の`profile`, `layout`, `commandsets`フィールドを維持しつつ設定を永続化
- 後方互換性を維持：`settings.skipPermissions`が存在しない場合はデフォルト値`false`を使用
- プロジェクト切り替え時に`loadLayout`関数内で`skipPermissions`も自動復帰

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. 以下のファイルの変更を元に戻す：
   - `layoutConfigService.ts`: `settings`フィールドと関連メソッドを削除
   - `channels.ts`: `LOAD_SKIP_PERMISSIONS`, `SAVE_SKIP_PERMISSIONS`を削除
   - `handlers.ts`: 対応するハンドラーを削除
   - `preload/index.ts`: APIを削除
   - `electron.d.ts`: 型定義を削除
   - `agentStore.ts`: 永続化処理を削除、`loadSkipPermissions`アクションを削除
   - `App.tsx`: `loadSkipPermissions`呼び出しを削除

## Related Commits
- *Fix to be committed*
