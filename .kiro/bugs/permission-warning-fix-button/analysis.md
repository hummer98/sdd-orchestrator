# Bug Analysis: permission-warning-fix-button

## Summary
パーミッション不足の警告表示エリアに「Fix」ボタンが存在しない。ボタンを追加して、押下時にパーミッションを自動追加し、警告を消す機能を実装する必要がある。

## Root Cause
UIコンポーネントに「Fix」ボタンが実装されていない。バックエンドのロジック（パーミッション追加機能）は既に存在する。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/ProjectSelector.tsx:321-350`
- **Component**: `PermissionsCheckSection`
- **Trigger**: `permissionsCheck.allPresent === false` の時に警告が表示されるが、「Fix」ボタンがない

## Impact Assessment
- **Severity**: Low（UXの改善）
- **Scope**: パーミッション不足を検出したすべてのプロジェクト
- **Risk**: 低リスク - 既存のバックエンド機能を活用するUI変更のみ

## Related Code

### 警告表示コンポーネント (現状)
```tsx
// ProjectSelector.tsx:321-350
function PermissionsCheckSection({ check }: PermissionsCheckSectionProps) {
  if (check.allPresent) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t ...">
      <h3>パーミッション</h3>
      <div>
        <FileWarning />
        <span>不足しているパーミッション ({check.missing.length})</span>
      </div>
      {/* Fixボタンがない！ */}
      <div>CC-SDD WORKFLOWをインストールすると...</div>
    </div>
  );
}
```

### 既存のバックエンド機能
```typescript
// projectStore.ts:443-454
addShellPermissions: async () => {
  const { currentProject } = get();
  if (!currentProject) return null;
  const result = await window.electronAPI.addShellPermissions(currentProject);
  return result;
}

// handlers.ts:976-986
ipcMain.handle(
  IPC_CHANNELS.ADD_SHELL_PERMISSIONS,
  async (_event, projectPath: string) => {
    const result = await addShellPermissions(projectPath);
    return result.value;
  }
);
```

## Proposed Solution

### Option 1（推奨）
`PermissionsCheckSection`コンポーネントに「Fix」ボタンを追加し、既存の`addShellPermissions`アクションを呼び出す。

- Description: UIに「Fix」ボタンを追加し、既存のストアアクションを使用
- Pros: 既存のコードを最大限活用、最小限の変更
- Cons: なし

### 実装手順
1. `PermissionsCheckSection`のpropsに`onFix`コールバックを追加
2. 「Fix」ボタンをUIに追加
3. ボタン押下時に`addShellPermissions`を呼び出し
4. 成功後に`permissionsCheck`を再取得して警告を消す

### Recommended Approach
Option 1を採用。`SpecManagerFilesSection`と同様のパターンで実装する。

## Dependencies
- `useProjectStore.addShellPermissions()` - 既存
- `window.electronAPI.addShellPermissions()` - 既存
- `window.electronAPI.checkRequiredPermissions()` - 既存

## Testing Strategy
1. パーミッション不足のプロジェクトを選択
2. 警告エリアに「Fix」ボタンが表示されることを確認
3. ボタン押下後にパーミッションが追加され、警告が消えることを確認
4. 既存のspec-managerインストールボタンとの干渉がないことを確認
