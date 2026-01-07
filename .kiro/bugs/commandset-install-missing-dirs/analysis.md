# Bug Analysis: commandset-install-missing-dirs

## Summary
コマンドセットインストール時に `.kiro/steering` および `.kiro/specs` ディレクトリが作成されない。インストール完了後にプロジェクトバリデーションを実行すると、これらのディレクトリが存在しないため警告が発生する。

## Root Cause
`UnifiedCommandsetInstaller.installCommandset()` および関連するインストールメソッドが、必要な作業ディレクトリの作成を行っていない。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts:152-261`
- **Component**: `UnifiedCommandsetInstaller`
- **Trigger**: プロファイルまたはコマンドセットをインストールした後、`.kiro/steering/` と `.kiro/specs/` が存在しない状態でプロジェクトが残る

`installCommandset()` メソッドは以下を行う:
1. コマンドファイル（`.claude/commands/`）のインストール
2. 設定ファイル（`.kiro/settings/`）のインストール
3. パーミッションの追加

しかし、SDD ワークフローで使用される以下のディレクトリは作成されない:
- `.kiro/steering/` - Steering ドキュメントの格納先
- `.kiro/specs/` - 仕様ドキュメントの格納先

## Impact Assessment
- **Severity**: Medium
- **Scope**: 新規プロジェクトで初めてコマンドセットをインストールするすべてのユーザー
- **Risk**:
  - ユーザー体験の混乱（インストール成功後に警告が出る）
  - `/kiro:spec-init` などのコマンド実行時に親ディレクトリが存在しない可能性

## Related Code
```typescript
// electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts:152-176
async installCommandset(
  projectPath: string,
  commandsetName: CommandsetName,
  options?: InstallOptions
): Promise<Result<InstallResult, InstallError>> {
  switch (commandsetName) {
    case 'cc-sdd': {
      // Install cc-sdd commands and settings
      const commandResult = await this.ccSddInstaller.installCommands(projectPath, 'cc-sdd', options);
      if (!commandResult.ok) return commandResult;

      const settingsResult = await this.ccSddInstaller.installSettings(projectPath, options);
      if (!settingsResult.ok) return settingsResult;

      // Add required permissions
      await addPermissionsToProject(projectPath, [...REQUIRED_PERMISSIONS]);

      // NOTE: Missing directory creation for .kiro/steering and .kiro/specs
      return { ... };
    }
    // ...
  }
}
```

## Proposed Solution

### Option 1: インストール時に必須ディレクトリを作成
- **Description**: `installCommandset()` または `installByProfile()` の成功後に、必須ディレクトリを作成するロジックを追加
- **Pros**:
  - シンプルな実装
  - インストール完了後すぐにプロジェクトが使用可能
- **Cons**:
  - 空ディレクトリが作成されることになる（ただし問題ではない）

### Option 2: バリデーション警告を変更
- **Description**: ディレクトリが存在しない場合の警告を「初期化されていません」から「使用時に自動作成されます」に変更
- **Pros**:
  - 既存の動作を変更しない
- **Cons**:
  - 根本的な解決にならない
  - ユーザーは依然として警告を見る

### Recommended Approach
**Option 1** を推奨。`installMultiple()` メソッドの最後に、プロファイルインストール成功後のディレクトリ作成ステップを追加する。

実装場所:
- `UnifiedCommandsetInstaller.installMultiple()` の最後（`recordCommandsetVersions()` の後）
- または新しいプライベートメソッド `ensureProjectDirectories()` を作成

作成すべきディレクトリ:
- `{projectPath}/.kiro/steering/`
- `{projectPath}/.kiro/specs/`

## Dependencies
- `UnifiedCommandsetInstaller` クラス
- Node.js `fs/promises` の `mkdir` 関数

## Testing Strategy
1. **ユニットテスト**:
   - `unifiedCommandsetInstaller.test.ts` に新しいテストケースを追加
   - インストール後にディレクトリが存在することを確認
2. **E2Eテスト**:
   - クリーンなプロジェクトにコマンドセットをインストール
   - `.kiro/steering/` と `.kiro/specs/` が作成されることを確認
3. **手動テスト**:
   - 新規プロジェクトでコマンドセットインストールダイアログを使用
   - インストール後にバリデーション警告が出ないことを確認
