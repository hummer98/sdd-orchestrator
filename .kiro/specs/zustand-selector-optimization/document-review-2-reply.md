# Response to Document Review #2

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Reply Date**: 2026-02-13

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C-003: App.tsxの購読ストア一覧が不完全

**Issue**: design.md 324行のApp.tsxストア一覧には6ストアしか記載されていないが、実際のソースコードでは12ストアを購読している。

**Judgment**: **Fix Required** ✅

**Evidence**:
`src/renderer/App.tsx` のソースコード確認結果（102-153行）:

```typescript
// design.mdに記載済み（6個）
const { currentProject, kiroValidation, ... } = useProjectStore();       // ✅記載済
const { specDetail } = useSpecStore();                                    // ✅記載済
const { bugs, selectedBugId } = useSharedBugStore();                     // ✅記載済
const { setupEventListeners } = useAgentStore();                         // ✅記載済
const { initialize: initializeMcpStore } = useMcpStore();               // ✅記載済
const { addNotification } = useNotificationStore();                      // ✅記載済

// design.mdに未記載（6個）
const { isDirty } = useEditorStore();                                    // ❌未記載 → stateフィールド
const { setCommandPrefix } = useWorkflowStore();                         // ❌未記載 → アクションのみ
const { isRunning, startServer, stopServer, ... } = useRemoteAccessStore(); // ❌未記載 → state+actions混在
const { connectSSH, authDialog, ... } = useConnectionStore();            // ❌未記載 → state+actions混在
const { fetchStatuses } = useToolPathStore();                            // ❌未記載 → アクションのみ（522行）
const { clearEditor } = useProjectEditorStore();                         // ❌未記載 → アクションのみ
```

**Req 1.2の判定適用**:
- `useWorkflowStore` → `setCommandPrefix`のみ使用 → **アクション専用、セレクター化対象外**
- `useToolPathStore` → `fetchStatuses`のみ使用 → **アクション専用、セレクター化対象外**
- `useProjectEditorStore` → `clearEditor`のみ使用 → **アクション専用、セレクター化対象外**
- `useEditorStore` → `isDirty`（stateフィールド）使用 → **セレクター化必要**
- `useRemoteAccessStore` → `isRunning`（stateフィールド）+ actions → **セレクター化必要**
- `useConnectionStore` → `authDialog`, `projectSwitchConfirm`（stateフィールド）+ actions → **セレクター化必要**

**Action Items**:

- design.md 324行のApp.tsxストア一覧に6つの追加ストアを記載する
- セレクター化が必要なストア（useEditorStore, useRemoteAccessStore, useConnectionStore）と、アクション専用で対象外のストア（useWorkflowStore, useToolPathStore, useProjectEditorStore）を明記する
- tasks.md Task 1.1にApp.tsxの追加ストア言及を追加する

---

## Response to Warnings

### W-005: App.tsx以外の追加コンポーネント/ストアの漏れ

**Issue**: ArtifactEditor.tsx, ToolSettingsPanel.tsx, ProjectPane.tsx, ProjectFileEditor.tsx, RemoteAccessPanel.txsがdesign.mdの変更対象ファイル一覧に含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード確認結果:

| ファイル | ストア | 使用フィールド | セレクター化判定 |
|----------|--------|---------------|-----------------|
| `ArtifactEditor.tsx` | `useEditorStore()` | 18フィールド（state+actions混在） | 必要 |
| `ToolSettingsPanel.tsx` | `useToolPathStore()` | 5フィールド（statuses, isLoading, error + actions） | 必要 |
| `ProjectPane.tsx` | `useProjectEditorStore()` | 7フィールド（currentFilePath, currentFileName等 + actions） | 必要 |
| `ProjectFileEditor.tsx` | `useProjectEditorStore()` | 10フィールド（content, isDirty等 + actions） | 必要 |
| `RemoteAccessPanel.tsx` | `useRemoteAccessStore()` | 20フィールド（isRunning, port, url等 + actions） | 必要 |

全てstateフィールドを含む全購読パターンであり、Req 1.1のセレクター化対象に含まれる。

**Action Items**:

- design.mdの変更対象ファイル一覧（Rendererセクション）に5ファイルの追加ストア購読を記載する
- tasks.mdの該当タスクに各ファイルを追加する

### W-006: Remote UIコンポーネントの漏れ

**Issue**: `RemoteProjectEditor.tsx`がdesign.mdのRemote UIセクションに含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
`src/remote-ui/components/RemoteProjectEditor.tsx` のソースコード確認:

```typescript
import { useProjectEditorStore } from '@shared/stores/projectEditorStore';

const {
  content, isDirty, isSaving, error, mode,
  loadFile, setContent, setMode, save,
} = useProjectEditorStore();
```

9フィールド（state+actions混在）を全購読しており、Req 1.4のRemote UIセレクター化対象に含まれる。

**Action Items**:

- design.md 350行以降のRemote UIセクションにRemoteProjectEditor.tsxを追加する
- tasks.md Task 3.2にRemoteProjectEditor.tsxを追加する

### W-007: useElectronWorkflowState内のuseWorkflowStore購読未記載

**Issue**: design.md 347行には`useSpecStore`のみ記載だが、`useWorkflowStore`もセレクターなしで全購読している。

**Judgment**: **Fix Required** ✅

**Evidence**:
`src/renderer/hooks/useElectronWorkflowState.ts` のソースコード確認（66行）:

```typescript
const workflowStore = useWorkflowStore();
```

`useWorkflowStore`がセレクターなしで全購読されている。このフックは11個以上のストアを使用しているが、`useWorkflowStore`以外は既にセレクターパターン `useStore((state) => state.field)` を使用済み。`useWorkflowStore`のみがセレクターなし全購読のパターン。

ただし、実装時に`useWorkflowStore`の使用フィールドを特定し、セレクター化するかアクションのみ使用かを判断する必要がある。

**Action Items**:

- design.md 347行に`useWorkflowStore`を追加する
- tasks.md Task 1.5に`useWorkflowStore`のセレクター化を反映する

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-004 | renderer/stores vs shared/storesのスコープ明確化 | No Fix Needed ❌ | Req 1.1の「セレクターなしの全購読パターンが解消されること」は文言上、ストアの種類を区別していない。renderer/storesも対象に含むことは自明であり、明示的な記述追加は不要。各ストアの所在はimportパスから判断可能 |
| S-005 | design.mdのストア分類の整理 | No Fix Needed ❌ | 現行のファイル一覧で各ファイルの購読ストア名が記載されており、ストアの所在はimportパスで判断可能（shared/stores vs renderer/stores）。分類列の追加は情報の冗長化を招く |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| `design.md` | C-003: App.tsxのストア一覧に6つの追加ストアを記載、アクション専用の除外判定を明記。W-005: Rendererセクションに5ファイルの追加ストア購読を記載。W-006: Remote UIセクションにRemoteProjectEditor.tsxを追加。W-007: useElectronWorkflowState.tsにuseWorkflowStoreを追加 |
| `tasks.md` | C-003: Task 1.1にApp.tsxの追加ストア言及を追加。W-005: 該当タスクに各ファイルを追加。W-006: Task 3.2にRemoteProjectEditor.tsxを追加。W-007: Task 1.5にuseWorkflowStoreを追加 |

---

## Conclusion

Critical 1件・Warning 3件の計4件が全てFix Requiredと判断された。全て、design.mdの変更対象ファイル一覧とtasks.mdのタスク記述に追加コンポーネント/ストアを反映する修正が必要。

Info 2件（S-004, S-005）はNo Fix Neededと判断。Req 1.1の文言は十分明確であり、ストア分類の追加列は情報の冗長化を招く。

---

## Applied Fixes

**Applied Date**: 2026-02-13
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `design.md` | App.tsxストア一覧に6ストア追加、Rendererセクションに5ファイル追加、Remote UIにRemoteProjectEditor.tsx追加、useElectronWorkflowState.tsにuseWorkflowStore追加 |
| `tasks.md` | Task 1.1に追加ストア記述、Task 1.5にuseWorkflowStore追記、Task 2.1にProjectPaneのuseProjectEditorStore追記、Task 2.4にArtifactEditor/ToolSettingsPanel/RemoteAccessPanel追記、Task 2.6にProjectFileEditorのuseProjectEditorStore追記、Task 3.2にRemoteProjectEditor.tsx追記 |

### Details

#### design.md

**Issue(s) Addressed**: C-003, W-005, W-006, W-007

**Changes**:
- App.tsxのストア一覧に6つの追加ストア（useEditorStore, useWorkflowStore, useRemoteAccessStore, useConnectionStore, useToolPathStore, useProjectEditorStore）を記載し、各ストアのアクション専用/セレクター化必要の判定を明記
- Rendererセクションに`ArtifactEditor.tsx`（useEditorStore 18フィールド）、`ToolSettingsPanel.tsx`（useToolPathStore 5フィールド）を新規追加
- `ProjectPane.tsx`にuseProjectEditorStore購読（7フィールド）を追記
- `ProjectFileEditor.tsx`にuseProjectEditorStore購読（10フィールド）を追記
- `RemoteAccessPanel.tsx`にuseRemoteAccessStore購読（20フィールド）を追記
- Remote UIセクションに`RemoteProjectEditor.tsx`（useProjectEditorStore 9フィールド）を新規追加
- `useElectronWorkflowState.ts`にuseWorkflowStore（セレクターなし全購読）を追記

**Diff Summary**:
```diff
- - `src/renderer/App.tsx` - useProjectStore, useSpecStore, useSharedBugStore, useAgentStore, useMcpStore, useNotificationStore
+ - `src/renderer/App.tsx` - useProjectStore, useSpecStore, useSharedBugStore, useAgentStore, useMcpStore, useNotificationStore, useEditorStore（isDirty: stateフィールド）, useRemoteAccessStore（isRunning等: state+actions混在）, useConnectionStore（authDialog, projectSwitchConfirm等: state+actions混在）, useWorkflowStore（setCommandPrefix: アクション専用→Req 1.2対象外）, useToolPathStore（fetchStatuses: アクション専用→Req 1.2対象外）, useProjectEditorStore（clearEditor: アクション専用→Req 1.2対象外）
```

```diff
- - `src/renderer/components/ProjectPane.tsx` - useProjectStore
+ - `src/renderer/components/ProjectPane.tsx` - useProjectStore, useProjectEditorStore（7フィールド）
```

```diff
- - `src/renderer/components/RemoteAccessPanel.tsx` - useProjectStore
+ - `src/renderer/components/RemoteAccessPanel.tsx` - useProjectStore, useRemoteAccessStore（20フィールド）
```

```diff
- - `src/renderer/components/ProjectFileEditor.tsx` - useNotificationStore
+ - `src/renderer/components/ProjectFileEditor.tsx` - useNotificationStore, useProjectEditorStore（10フィールド）
```

```diff
  - `src/renderer/components/RemoteAccessDialog.tsx` - useRemoteAccessStore
+ - `src/renderer/components/ArtifactEditor.tsx` - useEditorStore（18フィールド）
+ - `src/renderer/components/ToolSettingsPanel.tsx` - useToolPathStore（5フィールド）
```

```diff
- - `src/renderer/hooks/useElectronWorkflowState.ts` - useSpecStore
+ - `src/renderer/hooks/useElectronWorkflowState.ts` - useSpecStore, useWorkflowStore（セレクターなし全購読）
```

```diff
  - `src/remote-ui/components/CreateBugDialogRemote.tsx` - useSharedBugStore
+ - `src/remote-ui/components/RemoteProjectEditor.tsx` - useProjectEditorStore（9フィールド）
```

#### tasks.md

**Issue(s) Addressed**: C-003, W-005, W-006, W-007

**Changes**:
- Task 1.1: App.tsxの追加ストア（useEditorStore, useRemoteAccessStore, useConnectionStoreのセレクター化、useWorkflowStore/useToolPathStore/useProjectEditorStoreのReq 1.2対象外判定）を記述追加
- Task 1.5: useWorkflowStore購読のセレクター化を追記
- Task 2.1: ProjectPaneのuseProjectEditorStore購読（7フィールド）のuseShallowセレクター化を追記
- Task 2.4: ArtifactEditor.tsx（useEditorStore 18フィールド）、ToolSettingsPanel.tsx（useToolPathStore 5フィールド）、RemoteAccessPanel.tsx（useRemoteAccessStore 20フィールド）のセレクター化を追記
- Task 2.6: ProjectFileEditor.tsxのuseProjectEditorStore購読（10フィールド）のuseShallowセレクター化を追記
- Task 3.2: RemoteProjectEditor.tsxのuseProjectEditorStore購読（9フィールド）のuseShallowセレクター化を追記

---

_Fixes applied by document-review-reply command._
