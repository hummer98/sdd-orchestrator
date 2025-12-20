# Bug Analysis: profile-validation-mismatch

## Summary
ProjectCheckerがプロファイル（cc-sdd/cc-sdd-agent）を区別せずに固定の`REQUIRED_COMMANDS`リストでバリデーションを行うため、cc-sddプロファイルにはない`spec-quick`の存在チェックでエラーになる。

## Root Cause

### Technical Details
- **Location**: [projectChecker.ts:16-32](electron-sdd-manager/src/main/services/projectChecker.ts#L16-L32)
- **Component**: `ProjectChecker.checkSlashCommands()`
- **Trigger**: cc-sddプロファイルでインストール後のバリデーション時

**問題のコード**:
```typescript
export const REQUIRED_COMMANDS = [
  // CC-SDD commands (kiro namespace) - 14 commands
  'kiro/spec-init',
  ...
  'kiro/spec-quick',  // ← cc-sdd-agent専用だがここに含まれている
  ...
] as const;
```

### 根本原因
1. **インストーラー**（`ccSddWorkflowInstaller.ts`, `unifiedCommandsetInstaller.ts`）はプロファイル別のディレクトリ（`cc-sdd/`, `cc-sdd-agent/`）からファイルをインストール
2. **バリデーター**（`projectChecker.ts`）は**固定のリスト**でチェック
3. この2つが**同期していない**

### プロファイル別のコマンド差異
| コマンド | cc-sdd | cc-sdd-agent |
|----------|--------|--------------|
| spec-quick | ❌ なし | ✅ あり |

## Impact Assessment
- **Severity**: Medium
- **Scope**: cc-sddプロファイルでインストールしたすべてのプロジェクト
- **Risk**: バリデーションが常に失敗し、ユーザーに誤った警告が表示される

## Related Code

### 影響を受けるファイル
1. [projectChecker.ts](electron-sdd-manager/src/main/services/projectChecker.ts) - `REQUIRED_COMMANDS`定義とチェックロジック
2. [validationService.ts:107-108](electron-sdd-manager/src/main/services/validationService.ts#L107-L108) - `CC_SDD_COMMANDS`を使用
3. [commandInstallerService.ts:10](electron-sdd-manager/src/main/services/commandInstallerService.ts#L10) - `REQUIRED_COMMANDS`をインポート

### 既存のプロファイル定義
[unifiedCommandsetInstaller.ts:108-124](electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts#L108-L124):
```typescript
private static readonly PROFILES: Record<ProfileName, Profile> = {
  'cc-sdd': {
    name: 'cc-sdd',
    commandsets: ['cc-sdd', 'bug', 'document-review']
  },
  'cc-sdd-agent': {
    name: 'cc-sdd-agent',
    commandsets: ['cc-sdd-agent', 'bug', 'document-review']
  },
  ...
};
```

## Proposed Solution

### Option 1: プロファイル別のコマンドリストを定義
- Description: `COMMANDS_BY_PROFILE`のような構造を作成し、ProjectCheckerがプロファイルを考慮してチェック
- Pros: 正確なバリデーション、将来のプロファイル追加に対応
- Cons: プロファイル情報の保存・取得ロジックが必要

### Option 2: テンプレートディレクトリから動的にリストを生成
- Description: `resources/templates/commands/{profile}/`ディレクトリを読み取り、動的にリストを生成
- Pros: コードとテンプレートが常に同期
- Cons: 実行時のファイルシステムアクセスが増加

### Option 3: インストール時にプロファイル情報を記録
- Description: `.kiro/settings/profile.json`にインストールしたプロファイル情報を保存
- Pros: バリデーション時にプロファイルを正確に判定可能
- Cons: 既存プロジェクトへの移行対応が必要

### Recommended Approach
**Option 1 + Option 3 の組み合わせ**

1. `projectChecker.ts`にプロファイル別の`COMMANDS_BY_PROFILE`を定義
2. インストール時に`.kiro/settings/profile.json`にプロファイル情報を保存
3. バリデーション時にprofile.jsonを読み取り、該当するコマンドリストでチェック
4. profile.jsonがない場合はcc-sdd-agent（最大セット）でフォールバック

## Dependencies
- `projectChecker.ts` - コマンドリストとチェックロジックの変更
- `ccSddWorkflowInstaller.ts` - プロファイル情報の保存処理追加
- `unifiedCommandsetInstaller.ts` - プロファイル情報の保存処理追加
- `validationService.ts` - プロファイル対応

## Testing Strategy
1. cc-sddプロファイルでインストール → バリデーション成功を確認
2. cc-sdd-agentプロファイルでインストール → バリデーション成功を確認
3. profile.jsonがない既存プロジェクト → フォールバック動作を確認
4. 既存のユニットテストが通ることを確認
