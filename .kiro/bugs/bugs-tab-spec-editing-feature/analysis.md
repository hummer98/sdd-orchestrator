# Bug Analysis: bugs-tab-spec-editing-feature

## Summary
BugsタブのBugArtifactEditorはプレビュー表示のみで、Spec用のArtifactEditorが持つ編集・保存機能が欠落している。

## Root Cause
BugArtifactEditorはMDEditorを`preview="preview"`（固定プレビューモード）で使用しており、編集機能を実装していない。

### Technical Details
- **Location**: [BugArtifactEditor.tsx:119-126](electron-sdd-manager/src/renderer/components/BugArtifactEditor.tsx#L119-L126)
- **Component**: `BugArtifactEditor`
- **Trigger**: Bugs選択時にエディターが表示されるが、プレビューのみで編集不可

### 比較表: ArtifactEditor vs BugArtifactEditor

| 機能 | ArtifactEditor (Spec) | BugArtifactEditor (Bug) |
|------|----------------------|------------------------|
| 編集モード | ✅ edit/preview切替 | ❌ previewのみ固定 |
| 保存ボタン | ✅ あり | ❌ なし |
| Dirty状態管理 | ✅ useEditorStore | ❌ なし |
| onChange | ✅ setContent | ❌ なし |
| 保存確認ダイアログ | ✅ タブ切替時 | ❌ なし |
| ステータスバー | ✅ 未保存表示、文字数 | ❌ なし |

### 共通化の根拠

editorStoreを分析した結果、保存・読込ロジックは**完全に汎用的**：

```typescript
// loadArtifact: パスを受け取るだけでSpec固有ロジックなし
loadArtifact: async (basePath: string, artifact: ArtifactType) => {
  const artifactPath = `${basePath}/${artifact}.md`;
  // ...
}

// save: currentPathに保存するだけ
save: async () => {
  await window.electronAPI.writeFile(currentPath, content);
  // ...
}
```

**Spec/Bugの差分はタブ定義のみ**であり、エディターUIは完全に共通化可能。

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bugsタブを使用するすべてのユーザーが影響を受ける
- **Risk**: バグレポートの編集ができず、ワークフローが制限される

## Proposed Solution

### Recommended Approach: ArtifactEditorの共通コンポーネント化

既存のArtifactEditorをprops化して、Spec/Bug両方で使える汎用コンポーネントに変換する。

#### 設計

```tsx
// 共通インターフェース
interface ArtifactEditorProps {
  /** タブ設定（タイプ別に異なる） */
  tabs: TabConfig[];
  /** ベースパス（spec/bugのディレクトリパス） */
  basePath: string | null;
  /** 未選択時のプレースホルダー */
  placeholder: string;
  /** 追加のタブ生成関数（Document Review等） */
  dynamicTabs?: TabConfig[];
}

// 使用例: SpecPane
<ArtifactEditor
  tabs={SPEC_TABS}  // requirements, design, tasks, research
  basePath={selectedSpec?.path}
  placeholder="仕様を選択してエディターを開始"
  dynamicTabs={documentReviewTabs}
/>

// 使用例: BugPane
<ArtifactEditor
  tabs={BUG_TABS}  // report, analysis, fix, verification
  basePath={selectedBug?.path}
  placeholder="バグを選択してエディターを開始"
/>
```

#### 変更内容

1. **ArtifactEditor.tsx** - Props化
   - タブ定義を外部から受け取る
   - `selectedSpec`依存を`basePath` propsに変更
   - Document Review/Inspectionタブは`dynamicTabs`として渡す

2. **BugArtifactEditor.tsx** - 削除
   - 共通ArtifactEditorに置き換え

3. **SpecPane.tsx** - 呼び出し修正
   - 新しいpropsを渡す

4. **BugPane.tsx** - 呼び出し修正
   - 共通ArtifactEditorを使用

5. **editorStore.ts** - 変更なし
   - 既に汎用的なので変更不要

#### タブ定義

```typescript
// Spec用タブ
const SPEC_TABS: TabConfig[] = [
  { key: 'requirements', label: 'requirements.md' },
  { key: 'design', label: 'design.md' },
  { key: 'tasks', label: 'tasks.md' },
  { key: 'research', label: 'research.md' },
];

// Bug用タブ
const BUG_TABS: TabConfig[] = [
  { key: 'report', label: 'report.md' },
  { key: 'analysis', label: 'analysis.md' },
  { key: 'fix', label: 'fix.md' },
  { key: 'verification', label: 'verification.md' },
];
```

### メリット

| 観点 | 効果 |
|-----|------|
| DRY | エディターロジックの重複排除 |
| 保守性 | 編集機能の修正が1箇所で済む |
| 一貫性 | Spec/Bugで同じ操作体験 |
| コード量 | BugArtifactEditor.tsx（136行）削除 |

## Dependencies
- [ArtifactEditor.tsx](electron-sdd-manager/src/renderer/components/ArtifactEditor.tsx) - Props化
- [BugArtifactEditor.tsx](electron-sdd-manager/src/renderer/components/BugArtifactEditor.tsx) - 削除
- [SpecPane.tsx](electron-sdd-manager/src/renderer/components/SpecPane.tsx) - 呼び出し修正
- [BugPane.tsx](electron-sdd-manager/src/renderer/components/BugPane.tsx) - 呼び出し修正
- [components/index.ts](electron-sdd-manager/src/renderer/components/index.ts) - export修正

## Testing Strategy
- ユニットテスト: ArtifactEditorのprops動作確認
- 統合テスト: Spec/Bug両方での編集→保存→再読込サイクル
- 既存テスト: ArtifactEditor.test.tsx の修正
- 削除: BugArtifactEditor.test.tsx（不要になる）
