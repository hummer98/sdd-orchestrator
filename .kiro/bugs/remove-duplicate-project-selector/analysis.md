# Bug Analysis: remove-duplicate-project-selector

## Summary
ヘッダーバーにプロジェクト名表示を追加した際、左ペインのProjectSelectorコンポーネントから重複する「プロジェクト選択UI」を削除し忘れた。コンポーネントの役割を「バリデーション表示」に限定し、名称も変更する必要がある。

## Root Cause
ヘッダーバーへのプロジェクト名追加時の作業漏れ。ProjectSelectorは元々「プロジェクト選択＋バリデーション表示」の2つの責務を持っていたが、選択機能がヘッダーに移行した後も、旧コードが残存している。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/ProjectSelector.tsx:41-76`
- **Component**: `ProjectSelector` コンポーネント
- **Trigger**: プロジェクト選択済み状態でアプリを表示

### 削除対象のコード（lines 42-76）
```tsx
<div className="p-4 border-b border-gray-200 dark:border-gray-700">
  <div className="flex items-center gap-2 mb-2">
    <FolderOpen className="w-5 h-5 text-gray-500" />
    <h2 className="font-semibold text-gray-700 dark:text-gray-300">
      プロジェクト
    </h2>
  </div>

  <button onClick={handleSelectProject} ...>
    {/* プロジェクト選択ボタン - 削除対象 */}
  </button>

  {currentProject && (
    <div className="mt-2 text-xs text-gray-500 truncate" ...>
      {currentProject}  {/* フルパス表示 - 削除対象 */}
    </div>
  )}
```

### 維持するコード（lines 78-127）
- `.kiro`ディレクトリバリデーション表示
- spec-managerファイルチェック・インストールUI
- パーミッションチェック・修正UI

## Impact Assessment
- **Severity**: Low（機能障害ではなくUI冗長性）
- **Scope**: 全ユーザー（プロジェクト選択時）
- **Risk**: 低。削除対象は純粋な表示要素であり、状態管理やロジックへの影響なし

## Related Code
| ファイル | 変更内容 |
|---------|---------|
| `ProjectSelector.tsx` | コンポーネント名変更、選択UI削除 |
| `index.ts:5` | エクスポート名変更 |
| `App.tsx:34,545` | インポート・使用箇所の名称変更 |
| `ProjectSelector.specManager.test.tsx` | ファイル名・テスト内容の更新 |

## Proposed Solution

### Option 1: リファクタリング（推奨）
- コンポーネント名を`ProjectValidationPanel`に変更
- 選択ボタン・パス表示を削除
- 内部関数`handleSelectProject`も削除
- ラッパーdivのpaddingは維持（バリデーションUIの余白として）

**Pros**: 責務が明確になり、コード可読性向上
**Cons**: ファイル名変更により複数ファイルに影響

### Option 2: 最小変更
- UIのみ削除し、コンポーネント名はそのまま
- 関数`handleSelectProject`は未使用となるが残す

**Pros**: 変更箇所が最小
**Cons**: コンポーネント名と実態が乖離

### Recommended Approach
**Option 1（リファクタリング）**を推奨。理由:
1. DRY/単一責務の原則に沿う
2. 将来のメンテナンス性向上
3. 変更箇所は4ファイルのみで影響範囲が限定的

## Dependencies
- `useProjectStore`: `selectProject`の使用を削除
- `useSpecStore`: `loadSpecs`の使用を削除
- import削除: `FolderOpen`アイコン

## Testing Strategy
1. **ビルド確認**: `npm run build`でコンパイルエラーがないこと
2. **既存テスト**: `ProjectSelector.specManager.test.tsx`の更新・パス
3. **E2Eテスト**: バリデーション表示が正常に動作すること
4. **視覚確認**: 左ペインから選択UI消失、バリデーションUI維持を確認
