# Bug Analysis: commandset-install-warning-persists

## Summary
統合コマンドセットインストーラーでプロファイルをインストールしても、プロジェクト検証パネルに「不足しているコマンド」警告が表示され続ける問題。プロジェクトを再読み込みすると警告が消えることから、インストール後のUI状態更新が欠落していることが判明。

## Root Cause
**インストール完了後に `checkSpecManagerFiles` が呼ばれず、UI状態が更新されない**

### Technical Details
- **Location**: [App.tsx:685-708](electron-sdd-manager/src/renderer/App.tsx#L685-L708) - `onInstall` ハンドラー
- **Component**: `CommandsetInstallDialog`, `App.tsx`, `projectStore`
- **Trigger**: コマンドセットインストール完了後

### 問題のコードフロー

1. ユーザーがコマンドセットインストールダイアログでインストールを実行
2. `App.tsx` の `onInstall` ハンドラーが `installCommandsetByProfile` を呼び出し
3. インストール成功後、サマリーを返すだけで終了
4. **`checkSpecManagerFiles` が呼ばれない** → `specManagerCheck` 状態が古いまま
5. `ProjectValidationPanel` は古い状態を表示し続ける

### 関連コード

**App.tsx の onInstall ハンドラー** (685-708行目):
```typescript
onInstall={async (profileName: ProfileName, _progressCallback) => {
  if (!currentProject) return;
  console.log(`[App] Installing commandset with profile: ${profileName}`);

  const result = await window.electronAPI.installCommandsetByProfile(
    currentProject,
    profileName,
    { force: true }
  );

  if (!result.ok) {
    throw new Error(result.error.message || result.error.type);
  }

  const { summary } = result.value;
  console.log(`[App] Commandset installed successfully:`, summary);

  // Return summary for the dialog to display
  return {
    totalInstalled: summary.totalInstalled,
    totalSkipped: summary.totalSkipped,
    totalFailed: summary.totalFailed,
  };
  // ⚠️ ここで checkSpecManagerFiles が呼ばれていない！
}}
```

**projectStore の checkSpecManagerFiles** (projectStore.ts):
```typescript
checkSpecManagerFiles: async (projectPath: string) => {
  try {
    const result = await window.electronAPI.checkSpecManagerFiles(projectPath);
    set({ specManagerCheck: result });
  } catch (error) {
    console.error('[projectStore] Failed to check spec-manager files:', error);
  }
},
```

## Impact Assessment
- **Severity**: Low (機能的には動作する。UIの見た目の問題のみ)
- **Scope**: すべてのプロファイルでのコマンドセットインストールに影響
- **Risk**: ユーザー体験の混乱（インストール成功と表示されるが警告が消えない）

## Proposed Solution

### Option 1: onInstall 完了後に checkSpecManagerFiles を呼び出す (推奨)
`App.tsx` の `onInstall` ハンドラーで、インストール成功後に `checkSpecManagerFiles` を呼び出す。

- **変更箇所**: `App.tsx` の `onInstall` ハンドラー
- **変更内容**:
```typescript
onInstall={async (profileName: ProfileName, _progressCallback) => {
  if (!currentProject) return;

  const result = await window.electronAPI.installCommandsetByProfile(
    currentProject,
    profileName,
    { force: true }
  );

  if (!result.ok) {
    throw new Error(result.error.message || result.error.type);
  }

  // ✅ 追加: インストール後にspec-managerファイルを再チェック
  await checkSpecManagerFiles(currentProject);

  return { ... };
}}
```

- **Pros**:
  - 最小限の変更
  - 明確な責任範囲

- **Cons**:
  - `checkSpecManagerFiles` を `App.tsx` で参照する必要がある

### Option 2: CommandsetInstallDialog に onSuccess コールバックを追加
ダイアログコンポーネントに `onSuccess` コールバックを追加し、インストール成功時に呼び出す。

- **Pros**:
  - より汎用的な設計

- **Cons**:
  - コンポーネントAPIの変更が必要

### Recommended Approach
**Option 1: onInstall 完了後に checkSpecManagerFiles を呼び出す**

理由:
1. 最小限のコード変更
2. 問題の根本原因を直接解決
3. 既存のAPI（`checkSpecManagerFiles`）を再利用

## Dependencies
- [App.tsx](electron-sdd-manager/src/renderer/App.tsx)
- [projectStore.ts](electron-sdd-manager/src/renderer/stores/projectStore.ts)

## Testing Strategy
1. コマンドセットインストールダイアログを開く
2. 任意のプロファイルを選択してインストール
3. ダイアログを閉じた後、警告が消えていることを確認
4. プロジェクトを再読み込みせずに動作することを検証
