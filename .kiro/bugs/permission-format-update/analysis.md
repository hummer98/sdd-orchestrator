# Bug Analysis: permission-format-update

## Summary
Claude Codeのパーミッション形式が変更され、`Bash(**)`、`SlashCommand`形式が非推奨となった。新形式への移行と既存設定のバリデーション/クリーンアップが必要。

## Root Cause
Claude Codeの仕様変更により、以下のパーミッション形式が非サポートまたは非推奨となった：
1. `Bash(**)` - ドキュメントに記載なし、動作保証なし
2. `SlashCommand` - `Skill` 形式に変更
3. MCP個別ツール指定 - サーバー単位指定が推奨

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/projectChecker.ts:53-91`
- **Component**: `REQUIRED_BASIC_PERMISSIONS`, `REQUIRED_SLASH_COMMAND_PERMISSIONS`
- **Trigger**: プロジェクト選択時のパーミッションチェック・追加処理

## Impact Assessment
- **Severity**: Medium
- **Scope**: 全プロジェクトのパーミッション設定に影響
- **Risk**: 旧形式パーミッションがあると動作しない可能性

## Related Code

### projectChecker.ts:53-62 (問題箇所1)
```typescript
export const REQUIRED_BASIC_PERMISSIONS = [
  'Read(**)',
  'Edit(**)',
  'Write(**)',
  'Glob(**)',
  'Grep(**)',
  'WebSearch',
  'WebFetch',
  'Bash(**)',  // ← 削除が必要
] as const;
```

### projectChecker.ts:68-83 (問題箇所2)
```typescript
export const REQUIRED_SLASH_COMMAND_PERMISSIONS = [
  'SlashCommand(/kiro:spec-init:*)',  // ← Skill形式に変更
  // ... 14個すべて変更が必要
] as const;
```

### permissionsService.ts (問題箇所3)
- `addPermissionsToProject` で旧形式パーミッションを追加してしまう
- `Bash(**)` の検出・削除機能がない

## Proposed Solution

### Option 1: 定数の更新 + バリデーション追加
- `REQUIRED_BASIC_PERMISSIONS` から `Bash(**)` を削除
- `REQUIRED_SLASH_COMMAND_PERMISSIONS` を `Skill(kiro:*)` 1行に置換
- `permissionsService.ts` に `sanitizePermissions` 関数を追加して旧形式を検出・削除

**Pros:**
- シンプルな変更
- 既存のプロジェクト設定も自動クリーンアップ

**Cons:**
- 既存設定との互換性管理が必要

### Option 2: 設定ファイルのマイグレーション機能
- 旧形式から新形式への自動変換機能を実装

**Pros:**
- より堅牢なマイグレーション

**Cons:**
- 実装コストが高い

### Recommended Approach
**Option 1** を採用。以下の修正を実施：

1. `projectChecker.ts`:
   - `REQUIRED_BASIC_PERMISSIONS` から `Bash(**)` を削除
   - `REQUIRED_SLASH_COMMAND_PERMISSIONS` を `REQUIRED_SKILL_PERMISSIONS` にリネームし、`Skill(kiro:*)` のみに変更
   - MCP パーミッションは個別指定が不要なため削除（`enableAllProjectMcpServers` で対応）

2. `permissionsService.ts`:
   - `sanitizePermissions` 関数を追加: `Bash(**)` の検出・削除
   - `addPermissionsToProject` 呼び出し前にサニタイズを実行

3. `standard-commands.txt`:
   - 変更不要（個別Bashコマンドは正しい形式）

## Dependencies
- `electron-sdd-manager/src/main/services/projectChecker.ts`
- `electron-sdd-manager/src/main/services/permissionsService.ts`
- `electron-sdd-manager/src/main/services/permissionsService.test.ts`

## Testing Strategy
1. 既存テストの更新（`SlashCommand` → `Skill` 形式）
2. `sanitizePermissions` の単体テスト追加
3. `Bash(**)` を含む設定ファイルでのバリデーションテスト
