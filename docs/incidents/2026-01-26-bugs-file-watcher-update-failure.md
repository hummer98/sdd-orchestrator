# [Resolved] Bugs File Watcher UI更新バグ

> **Status:** Resolved
> **Resolution Report:** [2026-01-26-bugs-file-watcher-update-failure-resolution.md](./2026-01-26-bugs-file-watcher-update-failure-resolution.md)

## 発見日
2026-01-26

## 概要
Bugsのファイル監視（`onBugsChanged`）経由でのUI自動更新が機能しない。`bug-create`でbugフォルダを作成しても`bugStore.bugs`が更新されず、プロジェクトを再読み込みするまで表示されない。

## 症状
- `/kiro:bug-create`でbugフォルダ作成後、Bugs一覧に新しいbugが表示されない
- プロジェクト再読み込みで表示される
- ファイル削除時（`unlinkDir`イベント）は正常に動作する

## E2Eテスト期待値

### テストファイル
`electron-sdd-manager/e2e-wdio/bugs-file-watcher.e2e.spec.ts`

### テスト: "should update bugs list when new bug folder is created"

#### 前提条件
1. プロジェクト選択済み（`selectProjectViaStore(FIXTURE_PATH)`）
2. `bugStore.isWatching === true`
3. 初期状態で`test-bug`が存在

#### テスト手順
```typescript
// 1. プロジェクト選択
const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
expect(projectSuccess).toBe(true);

// 2. 初期状態を確認
const initialBugs = await getBugsList();
// → [{ name: 'test-bug', phase: '...' }]

// 3. 新しいbugフォルダを作成（ファイルシステム操作）
const newBugName = 'e2e-new-bug';
createBugFolder(newBugName);
// → .kiro/bugs/e2e-new-bug/report.md を作成

// 4. ファイル監視による自動更新を待つ（最大15秒）
const updated = await waitForCondition(async () => {
  const bugs = await getBugsList();
  return bugs.some(b => b.name === newBugName);
}, 15000, 500);

// 5. 結果を検証
expect(updated).toBe(true);
expect(finalBugs.some(b => b.name === newBugName)).toBe(true);
expect(finalBugs.length).toBe(initialBugs.length + 1);
```

#### 期待動作フロー
```
1. ファイルシステム: .kiro/bugs/e2e-new-bug/report.md 作成
2. Main Process: chokidar が add イベントを検知
3. Main Process: BugsWatcherService が IPC 経由で Renderer に通知
4. Renderer: window.electronAPI.onBugsChanged() のリスナーが受信
5. Renderer: bugStore.handleBugsChanged() が呼ばれる
6. Renderer: IpcApiClient.getBugs() で最新のbugs一覧を取得
7. Renderer: bugStore.bugs が更新される
8. UI: Bugs一覧に新しいbugが表示される
```

#### 実際の動作（バグ状態）
```
1-4: 正常動作（IPCイベントは受信できている）
5-8: 失敗（bugStore.bugs が更新されない）
```

## 発見した問題

### 問題1: IpcApiClient.ts の型ミスマッチ（修正済み）

#### 場所
`electron-sdd-manager/src/shared/api/IpcApiClient.ts` 32行目, 46行目

#### 問題のコード（修正前）
```typescript
// 32行目: 型定義が間違っている
let _projectStore: { getState: () => { currentProject: { path: string } | null } } | null = null;

// 46行目: .path プロパティにアクセスしている
function getCurrentProjectPath(): string | null {
  const store = getProjectStore();
  return store?.getState().currentProject?.path ?? null;
}
```

#### 原因
`projectStore.currentProject`は`string | null`型だが、型定義では`{ path: string } | null`と宣言されている。結果として`currentProject?.path`は常に`undefined`を返し、`getCurrentProjectPath()`は常に`null`を返す。

#### 修正後のコード
```typescript
// Bug fix: currentProject is string | null, not { path: string } | null
let _projectStore: { getState: () => { currentProject: string | null } } | null = null;

function getCurrentProjectPath(): string | null {
  const store = getProjectStore();
  // Bug fix: currentProject is a string, not an object with .path property
  return store?.getState().currentProject ?? null;
}
```

### 問題2: bugStoreのイベントリスナーが機能しない（未解決）

#### 状況
- テスト用に追加したリスナー（`api.onBugsChanged()`）ではイベントを受信できる
- `readBugs(projectPath)`を直接呼ぶと正しいデータ（新しいbugを含む）が返る
- しかし`bugStore.bugs`は更新されない

#### 調査結果
```
[E2E] hasOnBugsChanged: true
[E2E] isWatching after project select: true
[E2E-DEBUG] Received bugs change event: {"type":"add","bugName":"report.md","path":"..."}
[E2E-DEBUG] readBugs after event: ["test-bug","e2e-new-bug"]
[E2E] bugStore state: {"isWatching":true,"bugsCount":1,"bugNames":["test-bug"]}
                                              ↑ 更新されていない
```

#### 仮説
1. `bugStore.startWatching()`で登録したリスナーが、テストリスナーより先に登録されていない可能性
2. `handleBugsChanged`内の`apiClient.getBugs()`が何らかの理由で失敗している可能性
3. Zustand storeの更新が非同期で反映されていない可能性

## E2Eテストのストアアクセサ修正

テスト内で`__STORES__.bugStore`を使用していたが、正しくは`__STORES__.bug`。

```typescript
// 修正前（間違い）
const stores = (window as any).__STORES__;
if (!stores?.bugStore?.getState) return [];

// 修正後（正しい）
const stores = (window as any).__STORES__;
if (!stores?.bug?.getState) return [];
```

## 影響範囲
- `bugs-file-watcher.e2e.spec.ts`
- `/kiro:bug-create` コマンド実行後のUI表示
- Bugsファイル監視全般

## 関連ファイル

### Main Process
- `src/main/services/bugsWatcherService.ts` - ファイル監視・IPC通知
- `src/main/ipc/bugsHandlers.ts` - IPCハンドラー

### Renderer
- `src/shared/stores/bugStore.ts` - Zustand store
  - `handleBugsChanged()` - イベントハンドラー
  - `startWatching()` - リスナー登録
- `src/shared/api/IpcApiClient.ts` - API client（型バグ修正済み）

### テスト
- `e2e-wdio/bugs-file-watcher.e2e.spec.ts`
- `e2e-wdio/fixtures/bugs-pane-test/` - テストフィクスチャ

## テスト結果（修正適用後）

```
Bugs File Watcher E2E
  Bugs Watcher Registration
    ✓ should have bugs watcher active after project selection
  Bugs List Auto Update via File Watcher
    ✓ should detect existing bugs after project selection
    ✖ should update bugs list when new bug folder is created  ← 失敗
    ✓ should update bugs list when bug folder is deleted
```

## 次のアクション
1. `bugStore.handleBugsChanged`内の`apiClient.getBugs()`呼び出しをデバッグ
2. `getCurrentProjectPath()`が修正後に正しい値を返すか確認
3. Zustand storeの更新タイミングを確認
4. `unlinkDir`は動作するが`add`が動作しない理由を調査
   - `unlinkDir`: 同期的にfilterで削除
   - `add`: 非同期でAPIを呼んでsetBugs

## 補足: unlinkDirが動作する理由

`bugStore.handleBugsChanged`の実装：
```typescript
if (event.type === 'unlinkDir') {
  // 同期的に削除 - projectPath不要
  set({ bugs: get().bugs.filter(b => b.name !== event.bugName) });
} else if (event.type === 'add' || event.type === 'addDir') {
  // 非同期でAPI呼び出し - projectPathが必要
  const result = await apiClient.getBugs(projectPath);
  if (result.ok) {
    set({ bugs: result.value });
  }
}
```

`unlinkDir`は`projectPath`不要で同期的に動作するため成功。`add`は`getBugs(projectPath)`が必要で、`getCurrentProjectPath()`の修正が必要だった。
