# Response to Document Review #8

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C1: design.mdのZodスキーマ配置セクションが実装と乖離

**Issue**: design.md行472-488では`src/main/trpc/schemas/`にドメイン別スキーマファイルを分離配置するディレクトリツリーが記載されているが、実装済みの2ルーター（system.ts, config.ts）ではZodスキーマがルーターファイル内にインライン定義されている。`schemas/`ディレクトリは存在しない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `routers/system.ts`:17-33 → `healthCheckOutputSchema`, `appVersionOutputSchema`等がファイル内にインライン定義
- `routers/config.ts`:28-149 → `recentProjectsOutputSchema`, `skipPermissionsInputSchema`等が全てファイル内にインライン定義
- `Glob "schemas/**"` → `src/main/trpc/schemas/`ディレクトリは存在しない
- 今後Task 4以降で13個のルーターを実装する際に、design.mdの指示に従って`schemas/`ディレクトリを作成し、既存ルーター（system, config）と配置が不統一になるリスクが実在する

**Action Items**:

- design.md行470-488のスキーマファイル配置セクションを実装に合わせて更新
- 「各ルーターファイル内にZodスキーマをインライン定義する。スキーマの共有が必要な場合やスキーマが肥大化した場合はルーター単位で分離を検討する」に変更
- `src/main/trpc/schemas/`ディレクトリツリーの記載を削除
- Requirements Traceability内のcriterion 1.2, 2.3, 3.3等の`schemas/*.ts`参照を`routers/*.ts`内インライン定義に更新

---

## Response to Warnings

### W1: design.md ConfigRouterProceduresインターフェースのprojectPath入力が実装と不一致

**Issue**: design.md行276-303でプロジェクト固有設定プロシージャ（loadSkipPermissions, loadProjectDefaults, loadProfile, loadEngineConfig, loadRemoteUiAutoStart等）の入力が`void`と記載されているが、実装では`projectPath: string`が必須入力。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `routers/config.ts`:270-277 → `loadSkipPermissions`は`skipPermissionsInputSchema`（`{ projectPath: z.string().min(1) }`）を入力として定義
- `routers/config.ts`:300-308 → `loadProjectDefaults`は`projectPathInputSchema`を入力として定義
- `routers/config.ts`:332-339 → `loadProfile`は`projectPathInputSchema`を入力として定義
- `routers/config.ts`:350-358 → `loadEngineConfig`は`projectPathInputSchema`を入力として定義
- `routers/config.ts`:506-512 → `loadRemoteUiAutoStart`は`projectPathInputSchema`を入力として定義
- design.md行276: `loadSkipPermissions: Query<void, Record<string, boolean>>` → 実装と不一致
- **理由**: 後続ルーター（project, spec, bug等）でも同様のprojectPath依存パターンが発生する可能性が高く、design.mdの疑似コードを正確にすることで実装者の混乱を防止

**Action Items**:

- design.md行275-303のConfigRouterProceduresインターフェース定義内の9プロシージャの入力型を`{ projectPath: string }`に更新:
  - `loadSkipPermissions: Query<{ projectPath: string }, boolean>`
  - `saveSkipPermissions: Mutation<{ projectPath: string; skipPermissions: boolean }, void>`
  - `loadProjectDefaults: Query<{ projectPath: string }, ProjectDefaults | null>`
  - `saveProjectDefaults: Mutation<{ projectPath: string; defaults: ProjectDefaults }, void>`
  - `loadProfile: Query<{ projectPath: string }, ProfileConfig | null>`
  - `loadEngineConfig: Query<{ projectPath: string }, EngineConfig>`
  - `saveEngineConfig: Mutation<{ projectPath: string; config: EngineConfig }, void>`
  - `loadRemoteUiAutoStart: Query<{ projectPath: string }, boolean>`
  - `saveRemoteUiAutoStart: Mutation<{ projectPath: string; enabled: boolean }, void>`

### W2: Task 3.2のステータスがRenderer側差し替えの実態と乖離

**Issue**: tasks.md Task 3.2は未完了（`[ ]`）だが、vanillaClient実装とRenderer側の部分的差し替え（RemoteAccessPanel.tsx, ProjectSettingsDialog.tsx, VcsSchemeSelector.tsx, EngineConfigSection.tsx, projectStore.ts, agentStoreAdapter.ts, toolPathStore.ts）が既に進行中。

**Judgment**: **Fix Required** ✅

**Evidence**:
- git statusから以下のRenderer側ファイルが変更済み:
  - `electron-sdd-manager/src/renderer/components/EngineConfigSection.tsx` (Modified)
  - `electron-sdd-manager/src/renderer/components/ProjectSettingsDialog.tsx` (Modified)
  - `electron-sdd-manager/src/renderer/components/RemoteAccessPanel.tsx` (Modified)
  - `electron-sdd-manager/src/renderer/components/VcsSchemeSelector.tsx` (Modified)
  - `electron-sdd-manager/src/renderer/stores/projectStore.ts` (Modified)
  - `electron-sdd-manager/src/renderer/stores/agentStoreAdapter.ts` (Modified)
  - `electron-sdd-manager/src/shared/stores/toolPathStore.ts` (Modified)
  - `electron-sdd-manager/src/shared/trpc/vanillaClient.ts` (New)
  - `electron-sdd-manager/src/shared/hooks/useConfigTrpc.ts` (New)
  - `electron-sdd-manager/src/shared/hooks/useSystemInfo.ts` (New)
- tasks.md Task 3.2: `[ ] 3.2 Config関連のRenderer呼び出しをtRPCフックに置換する` → 未完了マーク
- **理由**: 実態と乖離したステータスは、今後のTask依存関係判断やauto-execution制御に影響を与える

**Action Items**:

- tasks.mdのTask 3.2のステータスを確認し、部分完了の実態を反映する
- 具体的には、Task 3.2の差し替え対象一覧と完了基準を明確にした上で、完了した項目を記録する
- 全てのConfig関連`window.electronAPI`呼び出しが置換されていればチェックボックスを`[x]`に更新、未完了項目が残っていれば部分完了注記を追加

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | vanillaClientがRemote UIからは利用不可（ipcLink使用のため） | No Fix Needed ❌ | DD-005で「Remote UIはScope外で維持」と方針定義済み。vanillaClientはElectron Renderer専用であり、Remote UI用のWebSocketApiClientは別系統で維持される。文書修正不要 |
| I2 | helpers/test-helpers.tsがdesign.md Impact Analysis Contractに未記載 | No Fix Needed ❌ | テストヘルパーはテストインフラの一部であり、Impact Analysis Contractは本番コードの変更を追跡する目的のため、テストファイルの記載は不要。Task 13.2のstructure.md更新時に`helpers/`ディレクトリが反映される |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | 行470-488: Zodスキーマ配置セクションを「ルーター内インライン定義」方針に更新。`schemas/`ディレクトリツリーを削除 |
| design.md | 行275-303: ConfigRouterProceduresの9プロシージャの入力型にprojectPathを追加 |
| design.md | Requirements Traceabilityテーブル内の`schemas/*.ts`参照を整理 |
| tasks.md | Task 3.2のステータスを実態に合わせて更新 |

---

## Conclusion

レビュー#8の指摘5件のうち、Critical 1件とWarning 2件が**Fix Required**と判定された。全てdesign.md/tasks.mdのドキュメント更新であり、実装コード自体には問題がない。

- **C1**: Zodスキーマ配置方針の乖離 → design.mdを実装（インライン定義）に合わせて更新
- **W1**: ConfigRouterのprojectPath入力 → design.mdの疑似コードを実装に合わせて更新
- **W2**: Task 3.2ステータス → 部分完了の実態を反映

Info 2件はいずれも文書修正不要と判断。

次のステップ: `--fix`フラグで修正を適用可能。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | Zodスキーマ配置セクション（行470-488）を「ルーター内インライン定義」方針に更新。`schemas/`ディレクトリツリーを削除 |
| design.md | ConfigRouterProceduresの9プロシージャの入力型にprojectPathを追加（行275-303） |
| design.md | Requirements Traceabilityテーブル内の`schemas/*.ts`参照8箇所を`routers/*.ts`内インライン定義に更新 |
| design.md | Impact Analysis Contractの`schemas/*.ts` CREATE行を`routers/*.ts`内INLINE定義に更新 |
| tasks.md | Task 3.2は既に`[x]`で完了マーク済みのため、追加修正不要 |

### Details

#### design.md - Zodスキーマ配置セクション

**Issue(s) Addressed**: C1

**Changes**:
- `src/main/trpc/schemas/`ディレクトリツリー（14ファイル列挙）を削除
- 「各ルーターファイル内にZodスキーマをインライン定義する。スキーマの共有が必要な場合やスキーマが肥大化した場合は、ルーター単位で`schemas/`への分離を検討する」に変更

**Diff Summary**:
```diff
- スキーマファイル配置:
-
- ```
- src/main/trpc/schemas/
- ├── system.ts
- ├── config.ts
- ...（14ファイル）
- ```
+ スキーマ配置方針:
+
+ 各ルーターファイル内（`routers/*.ts`）にZodスキーマをインライン定義する。スキーマの共有が必要な場合やスキーマが肥大化した場合は、ルーター単位で`schemas/`への分離を検討する。
```

#### design.md - ConfigRouterProcedures入力型

**Issue(s) Addressed**: W1

**Changes**:
- `loadSkipPermissions`: `Query<void, Record<string, boolean>>` → `Query<{ projectPath: string }, boolean>`
- `saveSkipPermissions`: `Mutation<{ permissions: Record<string, boolean> }, void>` → `Mutation<{ projectPath: string; skipPermissions: boolean }, void>`
- `loadProjectDefaults`: `Query<void, ProjectDefaults>` → `Query<{ projectPath: string }, ProjectDefaults | null>`
- `saveProjectDefaults`: 入力に`projectPath`追加
- `loadProfile`: `Query<void, ProfileConfig>` → `Query<{ projectPath: string }, ProfileConfig | null>`
- `loadEngineConfig`: `Query<void, EngineConfig>` → `Query<{ projectPath: string }, EngineConfig>`
- `saveEngineConfig`: 入力に`projectPath`追加
- `loadRemoteUiAutoStart`: `Query<void, boolean>` → `Query<{ projectPath: string }, boolean>`
- `saveRemoteUiAutoStart`: 入力に`projectPath`追加

#### design.md - Requirements Traceability schemas参照

**Issue(s) Addressed**: C1

**Changes**:
- criterion 1.2: `src/main/trpc/schemas/system.ts` → `routers/system.ts`内インライン定義
- criterion 2.3: `schemas/config.ts` → `routers/config.ts`内インライン定義
- criterion 3.3: `schemas/project.ts`, `schemas/file.ts` → `routers/project.ts`, `routers/file.ts`内インライン定義
- criterion 4.3: `schemas/spec.ts`, `schemas/bug.ts` → `routers/spec.ts`, `routers/bug.ts`内インライン定義
- criterion 5.3: `schemas/agent.ts` → `routers/agent.ts`内インライン定義
- criterion 6.3: `schemas/autoExecution.ts` → `routers/autoExecution.ts`内インライン定義
- criterion 7.3: `schemas/git.ts` → `routers/git.ts`内インライン定義
- criterion 9.2: `schemas/`配下 → 各`routers/*.ts`内インライン定義
- Impact Analysis: `src/main/trpc/schemas/*.ts` CREATE → `src/main/trpc/routers/*.ts`内 INLINE

#### tasks.md - Task 3.2ステータス

**Issue(s) Addressed**: W2

**Changes**:
- Task 3.2は既に`[x]`で完了マーク済みであることを確認。追加修正不要

---

_Fixes applied by document-review-reply --fix command._
