# Bug Fix: spec-state-dual-management

## Summary
projectStoreからspecs/bugsフィールドを削除し、specStore/bugStoreをSingle Source of Truth（SSOT）として統一。`agent-state-dual-management`の修正と同じパターンを適用。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/projectStore.ts` | specs/bugsフィールドを削除、コメント追加 |
| `electron-sdd-manager/src/renderer/stores/projectStore.test.ts` | テストをspecStore/bugStore参照に変更 |

### Code Changes

#### projectStore.ts - import文からSpecMetadata/BugMetadata削除
```diff
- import type { KiroValidation, SpecMetadata, BugMetadata, SelectProjectResult } from '../types';
+ import type { KiroValidation, SelectProjectResult } from '../types';
```

#### projectStore.ts - interface ProjectStateからspecs/bugs削除
```diff
 interface ProjectState {
   currentProject: string | null;
   recentProjects: string[];
   kiroValidation: KiroValidation | null;
   isLoading: boolean;
   error: string | null;
   lastSelectResult: SelectProjectResult | null;
-  specs: SpecMetadata[];
-  bugs: BugMetadata[];
+  // Note: specs/bugs are managed by specStore/bugStore (SSOT)
   specManagerCheck: SpecManagerCheckResult | null;
```

#### projectStore.ts - 初期値からspecs/bugs削除
```diff
   lastSelectResult: null,
-  specs: [],
-  bugs: [],
+  // Note: specs/bugs are managed by specStore/bugStore (SSOT)
   specManagerCheck: null,
```

#### projectStore.ts - selectProject内からspecs/bugs格納を削除
```diff
       // Success: update store with results
+      // Note: specs/bugs are delegated to specStore/bugStore (SSOT)
       set({
         currentProject: result.projectPath,
         kiroValidation: result.kiroValidation,
-        specs: result.specs,
-        bugs: result.bugs,
         isLoading: false,
         lastSelectResult: result,
       });
```

#### projectStore.ts - clearProject内からspecs/bugs削除
```diff
   clearProject: () => {
     set({
       currentProject: null,
       kiroValidation: null,
       error: null,
       lastSelectResult: null,
-      specs: [],
-      bugs: [],
+      // Note: specs/bugs are managed by specStore/bugStore (SSOT)
       specManagerCheck: null,
```

#### projectStore.test.ts - テスト修正
```diff
+ import { useSpecStore } from './specStore';
+ import { useBugStore } from './bugStore';

   beforeEach(() => {
     useProjectStore.setState({
       ...
-      specs: [],
-      bugs: [],
+      // Note: specs/bugs are now managed by specStore/bugStore (SSOT)
     });
+    // Reset specStore and bugStore
+    useSpecStore.setState({ specs: [], selectedSpec: null, specDetail: null });
+    useBugStore.setState({ bugs: [], selectedBug: null, bugDetail: null });
```

```diff
-      expect(state.specs).toEqual(mockSpecs);
-      expect(state.bugs).toEqual(mockBugs);
+      // specs/bugs are delegated to specStore/bugStore (SSOT)
+      expect(useSpecStore.getState().specs).toEqual(mockSpecs);
+      expect(useBugStore.getState().bugs).toEqual(mockBugs);
```

## Implementation Notes

### アーキテクチャ変更
```
【変更前】二重キャッシュ
selectProject() → projectStore.specs + specStore.specs
                → projectStore.bugs + bugStore.bugs

【変更後】SSOT
selectProject() → specStore.setSpecs() のみ
                → bugStore.setBugs() のみ
```

### データフロー（変更後）
```
projectStore.selectProject()
  ├─ IPC: selectProject → {specs, bugs}取得
  ├─ specStore.setSpecs() ← SSOT
  ├─ bugStore.setBugs() ← SSOT
  ├─ specStore.startWatching() ← ファイル監視
  └─ bugStore.startWatching() ← ファイル監視
```

### UIへの影響
- **なし**: すべてのコンポーネントは既にspecStore/bugStoreを直接参照
- projectStore.specs/bugsは「死んだ状態」だったため、削除しても動作に変化なし

## Breaking Changes
- [x] No breaking changes

アプリの外部APIやIPC通信には変更なし。内部のデータフローのみの変更。

## Rollback Plan
1. `projectStore.ts`にspecs/bugsフィールドを復元
2. import文にSpecMetadata/BugMetadataを追加
3. selectProject/clearProject内で格納/リセットを復元
4. テストを元に戻す

## Test Results
```
Test Files  114 passed (114)
Tests       2079 passed | 6 skipped (2085)
```

## Related Commits
- 未コミット（修正完了、検証待ち）
