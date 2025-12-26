# Bug Analysis: bugs-tab-empty-panel-display

## Summary
BugArtifactEditorでは全てのタブ（report.md, analysis.md, fix.md, verification.md）が常に表示されるが、ArtifactEditor（Spec用）では存在するファイルのタブのみ表示される。これにより、Bugsタブでは未生成のドキュメントに対してもタブが表示され「ドキュメント未生成」と表示される不整合が発生。

## Root Cause
BugArtifactEditorとArtifactEditorのタブ表示ロジックが異なる実装になっている。

### Technical Details
- **Location**: [BugArtifactEditor.tsx:66-83](electron-sdd-manager/src/renderer/components/BugArtifactEditor.tsx#L66-L83)
- **Component**: BugArtifactEditor
- **Trigger**: TAB_CONFIGSの全てのタブを無条件でレンダリング

**BugArtifactEditor（問題のあるコード）**:
```tsx
// 66-83行目: 全タブを無条件表示
{TAB_CONFIGS.map((tab) => (
  <button
    key={tab.key}
    ...
  >
    {tab.label}
  </button>
))}
```

**ArtifactEditor（正しい実装）**:
```tsx
// 107-117行目: 存在するアーティファクトのみフィルタリング
const availableTabs = useMemo((): TabInfo[] => {
  let baseTabs = BASE_TABS;
  if (specDetail?.artifacts) {
    baseTabs = BASE_TABS.filter((tab) => {
      const artifact = specDetail.artifacts[tab.key as BaseArtifactType];
      return artifact !== null && artifact.exists;
    });
  }
  return [...baseTabs, ...documentReviewTabs, ...inspectionTabs];
}, [specDetail?.artifacts, documentReviewTabs, inspectionTabs]);
```

## Impact Assessment
- **Severity**: Low（UX上の不整合、機能には影響なし）
- **Scope**: Bugsタブを使用する全ユーザー
- **Risk**: 修正によるサイドエフェクトは低い

## Related Code
| ファイル | 行 | 説明 |
|----------|-----|------|
| [BugArtifactEditor.tsx](electron-sdd-manager/src/renderer/components/BugArtifactEditor.tsx) | 19-24 | TAB_CONFIGS定義 |
| [BugArtifactEditor.tsx](electron-sdd-manager/src/renderer/components/BugArtifactEditor.tsx) | 66-83 | タブレンダリング（問題箇所） |
| [ArtifactEditor.tsx](electron-sdd-manager/src/renderer/components/ArtifactEditor.tsx) | 107-117 | availableTabsのフィルタリング（参考実装） |

## Proposed Solution

### Option 1: ArtifactEditorと同様のフィルタリングを実装
- Description: `bugDetail.artifacts`を参照し、`exists: true`のタブのみ表示
- Pros: Spec側と一貫した挙動、ユーザー期待に合致
- Cons: 実装変更が必要

### Option 2: 存在しないタブをdisabled表示
- Description: 未生成のドキュメントはグレーアウト表示
- Pros: ワークフローの全体像が見える
- Cons: クリック可能に見えて操作できない混乱

### Recommended Approach
**Option 1**を推奨。ArtifactEditorの`availableTabs`パターンをBugArtifactEditorに適用する。

修正箇所:
1. `useMemo`で`bugDetail.artifacts`からexistsがtrueのタブをフィルタリング
2. タブが0件の場合のフォールバック表示を追加
3. アクティブタブが利用不可になった場合の自動切り替え

## Dependencies
- `useBugStore`の`bugDetail.artifacts`が正しくpopulateされている前提
- テスト更新: `BugArtifactEditor.test.tsx`

## Testing Strategy
1. **Unit Test**: 存在しないアーティファクトのタブが非表示になることを検証
2. **Unit Test**: 全アーティファクトが存在しない場合のフォールバック表示を検証
3. **Manual Test**: Bugsタブで実際にバグを選択し、存在するドキュメントのみタブ表示されることを確認
