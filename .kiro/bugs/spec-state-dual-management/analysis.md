# Bug Analysis: spec-state-dual-management

## Summary
projectStore、specStore、bugStoreでSpec/Bugデータの二重管理が発生している。`agent-state-dual-management`で修正したAgentストアと同じパターンの問題がSpec/Bugストアにも存在する。

## Root Cause

### Technical Details
- **Location**:
  - [projectStore.ts:55-56](electron-sdd-manager/src/renderer/stores/projectStore.ts#L55-L56)
  - [projectStore.ts:105-106](electron-sdd-manager/src/renderer/stores/projectStore.ts#L105-L106)
  - [projectStore.ts:169-170](electron-sdd-manager/src/renderer/stores/projectStore.ts#L169-L170)
- **Component**: renderer/stores/
- **Trigger**: プロジェクト選択時に同じデータがprojectStoreとspecStore/bugStoreの両方に格納される

### 問題の構造

```
【現状: 二重キャッシュ】
selectProject()
  ├─ IPC呼び出し → specs/bugs取得
  ├─ projectStore.specs = result.specs   ← 重複コピー1
  ├─ projectStore.bugs = result.bugs     ← 重複コピー1
  ├─ specStore.setSpecs(result.specs)    ← 重複コピー2
  └─ bugStore.setBugs(result.bugs)       ← 重複コピー2
```

projectStoreの`specs`/`bugs`フィールドは、specStore/bugStoreと同じデータを保持しており、これがFile as SSOTアーキテクチャに違反している。

## Impact Assessment
- **Severity**: Medium（機能的には動作するが、アーキテクチャ上の負債）
- **Scope**: プロジェクト選択時のデータフロー全体
- **Risk**:
  - メモリの無駄遣い
  - 将来的な同期バグの可能性
  - コードの複雑性増加

## Related Code

### projectStore.ts - 重複キャッシュ
```typescript
// L55-56: 不要なフィールド定義
interface ProjectState {
  specs: SpecMetadata[];  // specStoreと重複
  bugs: BugMetadata[];    // bugStoreと重複
}

// L105-106: 初期値
specs: [],
bugs: [],

// L169-170: 重複格納
set({
  currentProject: result.projectPath,
  kiroValidation: result.kiroValidation,
  specs: result.specs,    // 不要
  bugs: result.bugs,      // 不要
});

// L177-182: 本来必要な同期のみ
useSpecStore.getState().setSpecs(result.specs);
useBugStore.getState().setBugs(result.bugs);
```

### L239-240: clearProject内でも二重リセット
```typescript
clearProject: () => {
  set({
    specs: [],   // 不要
    bugs: [],    // 不要
  });
},
```

## Proposed Solution

### Option 1: projectStoreからspecs/bugsフィールドを削除（推奨）
- **Description**: projectStoreからspecs/bugsを完全に削除し、specStore/bugStoreのみをSSOTとする
- **Pros**:
  - シンプルで明確なアーキテクチャ
  - `agent-state-dual-management`の修正と一貫性がある
  - メモリ使用量削減
- **Cons**:
  - projectStoreから直接specs/bugsを参照しているコードがあれば修正必要

### Option 2: specStore/bugStoreを廃止しprojectStoreに統合
- **Description**: projectStoreのみですべてを管理
- **Pros**:
  - ストア数が減る
- **Cons**:
  - projectStoreが肥大化
  - ファイル監視ロジックの移動が必要
  - 関心の分離が失われる

### Recommended Approach
**Option 1**を採用。以下の変更を行う：

1. **projectStore.ts**:
   - `specs: SpecMetadata[]`フィールドを削除
   - `bugs: BugMetadata[]`フィールドを削除
   - `selectProject`内の`specs: result.specs`を削除
   - `clearProject`内の`specs: []`を削除
   - `lastSelectResult`から`specs`/`bugs`を参照するコードがあれば調査

2. **依存コードの確認**:
   - `projectStore.specs`や`projectStore.bugs`を直接参照するコンポーネントがないか確認
   - 必要に応じて`useSpecStore`/`useBugStore`への参照に変更

## Dependencies
- specStore: 変更不要（SSOTとして維持）
- bugStore: 変更不要（SSOTとして維持）
- projectStoreを参照するコンポーネント: 調査必要

## イベントフロー分析（UI更新への影響調査）

### 現状のデータフロー

```
【初期ロード時】
projectStore.selectProject()
  ├─ IPC: selectProject → {specs, bugs}取得
  ├─ projectStore.specs/bugs ← 格納（削除対象）
  ├─ specStore.setSpecs() ← 格納（維持）
  ├─ bugStore.setBugs() ← 格納（維持）
  ├─ specStore.startWatching() ← ファイル監視開始
  └─ bugStore.startWatching() ← ファイル監視開始

【ファイル変更時】
FileWatcher (main)
  └─ IPC: SPECS_CHANGED / BUGS_CHANGED
       └─ onSpecsChanged / onBugsChanged コールバック
            └─ refreshSpecs() / refreshBugs()
                 ├─ IPC: readSpecs / readBugs
                 ├─ specStore.specs / bugStore.bugs 更新
                 └─ 選択中Specの詳細も再読み込み
```

### コンポーネントのデータ参照先

| コンポーネント | データ参照元 | projectStore.specs/bugs依存 |
|--------------|-------------|---------------------------|
| SpecList | `useSpecStore().getSortedFilteredSpecs()` | **なし** |
| BugList | `useBugStore().getSortedBugs()` | **なし** |
| SpecDetail | `useSpecStore().specDetail` | **なし** |
| WorkflowView | `useSpecStore().specDetail` | **なし** |
| CreateSpecDialog | `useProjectStore().currentProject` | **なし** |
| CreateBugDialog | `useProjectStore().currentProject` | **なし** |

### UI更新チェーンへの影響

**影響なし**の理由：

1. **コンポーネントはprojectStore.specs/bugsを参照していない**
   - SpecList/BugListは直接specStore/bugStoreからデータ取得
   - `useProjectStore()`から取得しているのは`currentProject`のみ

2. **ファイル監視はspecStore/bugStore側で完結**
   - `startWatching()`はspecStore/bugStore内で実装
   - `onSpecsChanged`/`onBugsChanged`はspecStore/bugStoreに直接通知
   - projectStoreは監視イベントに関与しない

3. **Zustand reactivity**
   - コンポーネントが`useSpecStore()`で`specs`をセレクトしている
   - `setSpecs()`呼び出しでspecs参照が変わり、再レンダリングが発生
   - projectStore.specsを削除しても、この動作に変更なし

### 修正後のデータフロー（予定）

```
【初期ロード時】修正後
projectStore.selectProject()
  ├─ IPC: selectProject → {specs, bugs}取得
  ├─ specStore.setSpecs() ← 格納（維持）
  ├─ bugStore.setBugs() ← 格納（維持）
  ├─ specStore.startWatching() ← ファイル監視開始
  └─ bugStore.startWatching() ← ファイル監視開始
  （projectStore.specs/bugsへの格納を削除）
```

### 結論

**UI更新への影響はない**

- すべてのUIコンポーネントはspecStore/bugStoreを直接参照
- projectStore.specs/bugsはどこからも参照されていない「死んだ状態」
- 削除しても機能・パフォーマンス・イベントチェーンに影響なし

---

## Bugワークフロー右ペイン更新の分析

### 現状の仕組み

```
【Bugファイル変更時】
BugsWatcherService (.kiro/bugs/ を監視)
  └─ IPC: BUGS_CHANGED
       └─ onBugsChanged (bugStore)
            └─ refreshBugs()
                 ├─ readBugs() → bugs一覧更新
                 └─ selectBug(selectedBug) → bugDetail更新（選択中のみ）
```

### エージェント完了との同期

**Spec側**:
- AutoExecutionServiceがエージェント完了を検知
- `handleAgentCompleted()` → `selectSpec()` で明示的にspecDetail更新

**Bug側**:
- BugsWatcherServiceがファイル変更を検知
- `refreshBugs()` → `selectBug()` で自動的にbugDetail更新

### 比較分析

| 観点 | Spec | Bug |
|-----|------|-----|
| 更新トリガー | Agent完了検知 + ファイル監視 | ファイル監視のみ |
| 明示的更新 | AutoExecutionService内で`selectSpec()` | なし |
| 実質動作 | エージェント完了時即座に更新 | ファイル変更検知で更新（300msデバウンス） |

### 結論: Bugは正しく同期される

Bugワークフローの右ペイン（bugDetail）は、以下の理由でエージェント完了と正しく同期されます：

1. **BugsWatcherがファイル変更を監視**
   - `.kiro/bugs/` 配下のファイル変更をchokidarで監視
   - analysis.md, fix.md などがエージェントによって作成・更新されると検知

2. **refreshBugs()がselectedBugの詳細も更新**
   ```typescript
   // bugStore.ts L131-139
   if (selectedBug) {
     const updatedBug = bugs.find((b) => b.path === selectedBug.path);
     if (updatedBug) {
       await get().selectBug(updatedBug, { silent: true });
     }
   }
   ```

3. **Specよりシンプルな構造**
   - Specには`AutoExecutionService`による複雑な連続実行があるため明示的更新が必要
   - Bugは単発実行が前提のため、ファイル監視のみで十分

**今回の修正（projectStore.specs/bugs削除）はBugワークフローの更新フローに影響しない**

## Testing Strategy
1. プロジェクト選択後、specStore/bugStoreにデータが正しく格納されることを確認
2. ファイル変更時にwatcher経由で更新されることを確認
3. 既存テストが全てパスすることを確認
4. projectStore.specsを参照するテストがあれば修正
