# Bug Fix: bugs-tab-spec-editing-feature

## Summary
ArtifactEditorをprops化して共通コンポーネントに変更し、BugsタブでもSpecタブと同等の編集・保存機能を利用可能にした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [editorStore.ts](electron-sdd-manager/src/renderer/stores/editorStore.ts) | Bug用のartifact type（report, analysis, fix, verification）を追加 |
| [ArtifactEditor.tsx](electron-sdd-manager/src/renderer/components/ArtifactEditor.tsx) | Props化（tabs, basePath, placeholder, dynamicTabs, artifacts, testId） |
| [SpecPane.tsx](electron-sdd-manager/src/renderer/components/SpecPane.tsx) | 新しいpropsをArtifactEditorに渡すよう更新 |
| [BugPane.tsx](electron-sdd-manager/src/renderer/components/BugPane.tsx) | BugArtifactEditorを共通ArtifactEditorに置き換え |
| [components/index.ts](electron-sdd-manager/src/renderer/components/index.ts) | BugArtifactEditorのexport削除、TabInfo/ArtifactInfo型エクスポート追加 |
| [ArtifactEditor.test.tsx](electron-sdd-manager/src/renderer/components/ArtifactEditor.test.tsx) | 新しいpropsベースのテストに更新 |

### Files Deleted
| File | Reason |
|------|--------|
| BugArtifactEditor.tsx | 共通ArtifactEditorに統合 |
| BugArtifactEditor.test.tsx | 不要になったため削除 |

### Code Changes

#### editorStore.ts - Bug artifact types追加
```diff
-/** Base artifact types */
-type BaseArtifactType = 'requirements' | 'design' | 'tasks' | 'research';
+/** Spec artifact types */
+type SpecArtifactType = 'requirements' | 'design' | 'tasks' | 'research';
+/** Bug artifact types */
+type BugArtifactType = 'report' | 'analysis' | 'fix' | 'verification';
 /** All artifact types */
-export type ArtifactType = BaseArtifactType | DynamicArtifactType;
+export type ArtifactType = SpecArtifactType | BugArtifactType | DynamicArtifactType;
```

#### ArtifactEditor.tsx - Props化
```diff
-export function ArtifactEditor() {
-  const { selectedSpec, specDetail } = useSpecStore();
+export interface ArtifactEditorProps {
+  tabs: TabInfo[];
+  basePath: string | null;
+  placeholder: string;
+  dynamicTabs?: TabInfo[];
+  artifacts?: Record<string, ArtifactInfo | null>;
+  testId?: string;
+}
+
+export function ArtifactEditor({
+  tabs,
+  basePath,
+  placeholder,
+  dynamicTabs = [],
+  artifacts,
+  testId,
+}: ArtifactEditorProps) {
```

#### BugPane.tsx - 共通ArtifactEditor使用
```diff
-import { BugArtifactEditor, ... } from './index';
+import { ArtifactEditor, ... } from './index';
+import type { TabInfo, ArtifactInfo } from './ArtifactEditor';
+
+const BUG_TABS: TabInfo[] = [
+  { key: 'report', label: 'report.md' },
+  { key: 'analysis', label: 'analysis.md' },
+  { key: 'fix', label: 'fix.md' },
+  { key: 'verification', label: 'verification.md' },
+];

-<BugArtifactEditor />
+<ArtifactEditor
+  tabs={BUG_TABS}
+  basePath={selectedBug.path}
+  placeholder="バグを選択してエディターを開始"
+  artifacts={artifacts}
+  testId="bug-artifact-editor"
+/>
```

## Implementation Notes
- `editorStore`は元々汎用的な設計だったため、変更は最小限（型追加のみ）
- `ArtifactEditor`のDocument Review/Inspectionタブ生成ロジックは`SpecPane`に移動
- `testId` propsを追加してBug用のテストIDを維持

## Breaking Changes
- [x] Breaking changes (documented below)

### Breaking Change: ArtifactEditor API変更
- `ArtifactEditor`は必須propsを受け取るようになった
- 旧: `<ArtifactEditor />` (props なし)
- 新: `<ArtifactEditor tabs={...} basePath={...} placeholder={...} />`

**影響**: ArtifactEditorを直接使用していたコードは更新が必要。ただし、SpecPaneとBugPane経由での使用のみなので外部影響なし。

## Rollback Plan
1. `git revert` で変更をrevert
2. BugArtifactEditor.tsxを再作成
3. index.tsのexportを復元

## Related Commits
- *To be added after commit*
