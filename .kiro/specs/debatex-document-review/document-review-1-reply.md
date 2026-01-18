# Response to Document Review #1

**Feature**: debatex-document-review
**Review Date**: 2026-01-18
**Reply Date**: 2026-01-18

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C-1: SettingsFileManager の責務拡張が不適切

**Issue**: Design ドキュメントでは `SettingsFileManager` にプロジェクトデフォルト取得・更新メソッドを追加する設計になっているが、既存の `SettingsFileManager` はコマンドセット設定ファイルの競合検出・マージを担当しており、異なるドメインである。

**Judgment**: **Fix Required** ✅

**Evidence**:

実際にコードを確認した結果、レビューの指摘は正確である。

1. **`SettingsFileManager`** (`src/main/services/settingsFileManager.ts`):
   - コマンドセット設定ファイルの競合検出・マージを担当
   - `CommandsetName` に依存した設計
   - プロジェクト設定管理とは別のドメイン

```typescript
// settingsFileManager.ts - 現在の責務
export class SettingsFileManager {
  async detectConflicts(commandsets: readonly CommandsetName[]): Promise<SettingsConflict[]>
  async mergeSettings(projectPath, conflicts, strategy): Promise<Result<SettingsMergeResult, MergeError>>
  async validateSettings(projectPath: string): Promise<SettingsValidationResult>
}
```

2. **`projectConfigService`** (`src/main/services/layoutConfigService.ts`):
   - **既に `sdd-orchestrator.json` を管理している**
   - プロファイル、レイアウト、コマンドセットバージョン、settings（skipPermissions）を管理
   - プロジェクトデフォルト設定の追加先として適切

```typescript
// layoutConfigService.ts (export as projectConfigService)
export const projectConfigService = {
  async loadProfile(projectPath: string): Promise<ProfileConfig | null>
  async saveProfile(projectPath: string, profile: ProfileConfig): Promise<void>
  async loadLayoutConfig(projectPath: string): Promise<LayoutValues | null>
  async saveLayoutConfig(projectPath: string, layout: LayoutValues): Promise<void>
  async loadSkipPermissions(projectPath: string): Promise<boolean>
  async saveSkipPermissions(projectPath: string, skipPermissions: boolean): Promise<void>
  // ... etc
}
```

**Action Items**:

1. Design の「4.1 SettingsFileManager」セクションを削除し、`projectConfigService` に統合する記述に変更
2. Tasks の「3.1 SettingsFileManager にプロジェクトデフォルト取得・更新メソッドを追加する」を「3.1 projectConfigService にプロジェクトデフォルト取得・更新メソッドを追加する」に修正
3. Component 表の `SettingsFileManager | Main/Service | プロジェクト設定` 行を `projectConfigService | Main/Service | プロジェクト設定` に変更

---

## Response to Warnings

### W-1: E2E テストタスクの欠如

**Issue**: Design の Testing Strategy セクションで E2E テストが言及されているが、tasks.md には具体的な E2E テストタスクが含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

Design には以下の E2E テストが定義されている:
```
### E2E Tests
- **Scheme 選択と実行**: UI から debatex を選択してレビュー実行、document-review-{n}.md が生成されること
- **プロジェクト設定変更**: ProjectSettingsDialog でデフォルト scheme を変更、新規 spec で適用されること
```

しかし、tasks.md の Requirements Coverage Matrix を確認すると:
- E2E テストに関するタスクが存在しない
- Task 6 はユニットテストのみ

**Action Items**:

1. tasks.md の Task 6 に E2E テストタスクを追加:
   - 6.5 debatex scheme 選択と実行の E2E テストを追加する
   - 6.6 プロジェクト設定変更の E2E テストを追加する

---

### W-2: Remote UI 対応の明記不足

**Issue**: tech.md の「新規Spec作成時の確認事項」セクションでは、Remote UI への影響有無を明記することが求められているが、本 spec ではその記載がない。

**Judgment**: **Fix Required** ✅

**Evidence**:

tech.md には以下のチェック項目が定義されている:
```
### Remote UI影響チェック
1. **Remote UIへの影響有無**
2. **Remote UIも変更する場合** WebSocketハンドラの追加が必要か？
3. **要件定義での明記** requirements.md に「Remote UI対応: 要/不要」を記載
```

本 spec では ProjectSettingsDialog が追加されるが、Remote UI 対応の記載がない。

**Action Items**:

1. requirements.md に以下を追加:
   ```markdown
   ## Remote UI 対応

   **Remote UI 対応: 不要**

   本機能は Desktop UI 専用。理由:
   - ProjectSettingsDialog はプロジェクト設定変更のため Desktop UI のみで操作
   - debatex 実行自体は既存の Remote UI 対応済みのワークフローで動作
   ```

---

### W-3: ドキュメント更新の検討

**Issue**: debatex 利用ガイドの追加が必要か検討が必要とされている。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

requirements.md の Out of Scope セクションに以下が含まれている:
```
- debatex のインストール・セットアップ支援
```

debatex 自体のドキュメントは debatex プロジェクト側で管理されるべきであり、sdd-orchestrator 側では必須ではない。エラーメッセージにインストール方法を含める（要件 6.2）ことで最低限の案内は提供される。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-1 | ProjectSettingsDialog の配置場所未決定 | No Fix Needed | Design に「設定メニューまたは右上の歯車アイコンから開く」と記載済み。実装時に最終決定可能 |
| S-2 | specDetailStore のドメイン状態 | No Fix Needed | 既存パターンとの一貫性を優先。将来的な改善提案として記録するのみ |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | SettingsFileManager → projectConfigService に変更。Component表、Service Interface、Architecture Pattern 図を修正 |
| tasks.md | Task 3.1 の対象サービスを修正。Task 6 に E2E テストタスクを追加 |
| requirements.md | Remote UI 対応セクションを追加 |

---

## Conclusion

**修正が必要な項目**: 3件（C-1, W-1, W-2）

1. **C-1**: 既存の `projectConfigService` に統合することで SRP 違反を回避
2. **W-1**: E2E テストタスクを追加して Design との整合性を確保
3. **W-2**: Remote UI 対応の明記により tech.md の要件を満たす

**修正不要な項目**: 3件（W-3, S-1, S-2）
- これらは既に対応済みまたは実装時に解決可能

---

## Applied Fixes

**Applied Date**: 2026-01-18
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | SettingsFileManager → projectConfigService に変更。Component表、Service Interface、Architecture Pattern図、シーケンス図を修正 |
| tasks.md | Task 3.1 の対象サービスを修正。Task 6.5, 6.6 として E2E テストタスクを追加 |
| requirements.md | Remote UI 対応セクションを追加 |

### Details

#### design.md

**Issue(s) Addressed**: C-1

**Changes**:
- Components and Interfaces 表: `SettingsFileManager` → `projectConfigService` に変更
- Architecture Pattern 図: `SFS[SettingsFileManager]` → `PCS[projectConfigService]` に変更
- Project Default Scheme Resolution Flow シーケンス図: `SFS` → `PCS` に変更
- Main/Service セクション: `SettingsFileManager (Extension)` → `projectConfigService (Extension)` に変更
- メソッド名: `getProjectDefaults`/`updateProjectDefaults` → `loadProjectDefaults`/`saveProjectDefaults` に変更（既存パターンとの一貫性）
- Implementation Notes 追加: 既存の `projectConfigService`（layoutConfigService.ts）を拡張

**Diff Summary**:
```diff
- | SettingsFileManager | Main/Service | プロジェクト設定 | 4.1 | None | Service |
+ | projectConfigService | Main/Service | プロジェクト設定 | 4.1 | None | Service (既存拡張) |

- SFS[SettingsFileManager]
+ PCS[projectConfigService]

- #### SettingsFileManager (Extension)
+ #### projectConfigService (Extension)

- async getProjectDefaults(projectPath: string): Promise<ProjectDefaults>;
+ async loadProjectDefaults(projectPath: string): Promise<ProjectDefaults>;
```

#### tasks.md

**Issue(s) Addressed**: C-1, W-1

**Changes**:
- Task 3.1: `SettingsFileManager` → `projectConfigService` に変更
- Task 3.1: メソッド名 `getProjectDefaults`/`updateProjectDefaults` → `loadProjectDefaults`/`saveProjectDefaults` に変更
- Task 6.3: `SettingsFileManager` → `projectConfigService` に変更
- Task 6.5 追加: debatex scheme 選択と実行の E2E テスト
- Task 6.6 追加: プロジェクト設定変更の E2E テスト

**Diff Summary**:
```diff
- - [ ] 3.1 SettingsFileManager にプロジェクトデフォルト取得・更新メソッドを追加する
-   - getProjectDefaults(projectPath) メソッドを実装
-   - updateProjectDefaults(projectPath, defaults) メソッドを実装
+ - [ ] 3.1 projectConfigService にプロジェクトデフォルト取得・更新メソッドを追加する
+   - loadProjectDefaults(projectPath) メソッドを実装
+   - saveProjectDefaults(projectPath, defaults) メソッドを実装
+   - 既存の loadSkipPermissions/saveSkipPermissions と同様のパターンで実装

+ - [ ] 6.5 debatex scheme 選択と実行の E2E テストを追加する
+ - [ ] 6.6 プロジェクト設定変更の E2E テストを追加する
```

#### requirements.md

**Issue(s) Addressed**: W-2

**Changes**:
- "Remote UI 対応" セクションを Out of Scope の直前に追加
- 「Remote UI 対応: 不要」を明記
- Desktop UI 専用とする理由を記載

**Diff Summary**:
```diff
+ ## Remote UI 対応
+
+ **Remote UI 対応: 不要**
+
+ 本機能は Desktop UI 専用として実装する。
+
+ **理由**:
+ - ProjectSettingsDialog はプロジェクト設定変更を行うため、Desktop UI のみでの操作を想定
+ - debatex 実行自体は既存の Remote UI 対応済みワークフロー（scheme 選択 → 実行）で動作
+ - Remote UI からのプロジェクト設定変更は tech.md の Remote UI 機能範囲（「設定変更は制限あり」）に準拠
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
