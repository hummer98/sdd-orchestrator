# Bug Analysis: bugstore-refresh-to-filewatch

## Summary
bugStoreの`onBugsChanged`ハンドラがFile Watchイベントの詳細（`type`, `bugName`）を無視して毎回`refreshBugs()`で全件リフレッシュしているため、Bug自動実行中にファイル変更が発生すると`selectedBug`がクリアされ「No bug selected」エラーが発生する。

## Root Cause
`bugStore.ts:171-174`で、File Watchイベントの内容を完全に無視して一律`refreshBugs()`を呼び出している：

```typescript
watcherCleanup = window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
  console.log('[bugStore] Bugs changed:', event);
  // Refresh bugs list on any change ← 問題: イベント内容を無視
  get().refreshBugs();
});
```

`refreshBugs()`は全件再取得後、`selectedBug.path`との照合を行い、一致しない場合`clearSelectedBug()`を呼ぶ（L143-149）。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/stores/bugStore.ts:171-174`
- **Component**: bugStore (Zustand store)
- **Trigger**: `.kiro/bugs/`配下のファイル変更時（analyzeフェーズでanalysis.md作成など）

### 問題の発生フロー
1. Bug自動実行でanalyzeフェーズ開始
2. エージェントが`analysis.md`を作成/更新
3. `BugsWatcherService`が`change`イベントを発火（`type: 'change'`, `bugName: 'xxx'`を含む）
4. `bugStore.onBugsChanged`が`refreshBugs()`を呼び出し
5. `refreshBugs()`が全件再取得 → `selectedBug.path`との照合
6. 照合に失敗（タイミングorパス不一致）→ `clearSelectedBug()`
7. 次のフェーズ（fix）実行時に`selectedBug`が`null` → 「No bug selected」エラー

## Impact Assessment
- **Severity**: High
- **Scope**: Bug自動実行機能が実質的に使用不可
- **Risk**: 修正による既存動作への影響は低い（より細かいイベントハンドリングへの移行）

## Related Code

### 現在の実装（bugStore.ts）
```typescript
// L171-174: イベント内容を無視して全件リフレッシュ
watcherCleanup = window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
  console.log('[bugStore] Bugs changed:', event);
  get().refreshBugs();
});

// L143-149: 照合失敗時にselectedBugをクリア
const updatedBug = bugs.find((b) => b.path === selectedBug.path);
if (updatedBug) {
  await get().selectBug(updatedBug, { silent: true });
} else {
  get().clearSelectedBug();  // ← これが問題を引き起こす
}
```

### 参考実装（specWatcherService.ts）
```typescript
// L96-120: イベント内容に基づいて適切なハンドラにルーティング
private handleSpecsChanged(event: SpecsChangeEvent): void {
  if (!event.specId) return;

  const selectedSpec = this.deps.getSelectedSpec();
  const isSelectedSpecChanged = selectedSpec && event.specId === selectedSpec.name;

  if (isSelectedSpecChanged && event.path) {
    // ファイル名に基づいて適切な更新処理を呼び出し
    this.dispatchByFileName(fileName);
  } else if (event.specId) {
    // 選択中でないspecの変更はメタデータのみ更新
    this.deps.updateSpecMetadata(event.specId);
  }
}
```

## Proposed Solution

### Option 1: イベントベースの差分更新（推奨）
- **Description**: `BugsChangeEvent`の`type`と`bugName`に基づいて最小限の更新を行う
- **Pros**:
  - 不要な全件リフレッシュを排除
  - `selectedBug`を維持したまま必要な部分のみ更新
  - specWatcherServiceと同様のパターンで一貫性がある
- **Cons**:
  - 新しいメソッド追加が必要（`updateBugMetadata`, `addBug`, `removeBug`）

```typescript
private handleBugsChanged(event: BugsChangeEvent): void {
  const { type, bugName, path } = event;
  const { selectedBug } = get();

  switch (type) {
    case 'add':
    case 'addDir':
      if (bugName) {
        // 新規バグを追加（全件リフレッシュではなく差分追加）
        get().addBugByName(bugName);
      }
      break;

    case 'change':
      if (bugName) {
        // 該当バグのメタデータを更新
        get().updateBugMetadata(bugName);
        // selectedBugが変更対象なら詳細も更新
        if (selectedBug?.name === bugName) {
          get().refreshSelectedBugDetail();
        }
      }
      break;

    case 'unlink':
    case 'unlinkDir':
      if (bugName) {
        // 該当バグを削除
        get().removeBugByName(bugName);
        // selectedBugが削除対象の場合のみクリア
        if (selectedBug?.name === bugName) {
          get().clearSelectedBug();
        }
      }
      break;
  }
}
```

### Option 2: refreshBugsでのselectedBug保持強化
- **Description**: `refreshBugs()`内で`selectedBug`の照合ロジックを改善（名前ベースで照合）
- **Pros**: 変更箇所が少ない
- **Cons**:
  - 根本的な問題（不要な全件リフレッシュ）は解決しない
  - パフォーマンス上の無駄が残る

### Recommended Approach
**Option 1（イベントベースの差分更新）** を推奨。理由：
1. specWatcherServiceと同様のパターンで一貫性がある
2. 不要な全件リフレッシュを完全に排除
3. 将来的な拡張性が高い
4. `refreshBugs()`は手動リフレッシュ用途のみに限定

## Dependencies
- `bugStore.ts`: 新規メソッド追加（`updateBugMetadata`, `addBugByName`, `removeBugByName`, `refreshSelectedBugDetail`）
- `electron.d.ts`: 必要に応じてIPC型定義の追加（`readBugMetadata`）

## Testing Strategy
1. **単体テスト**: 各イベントタイプに対する適切なハンドリングを検証
   - `change`イベントで`selectedBug`が維持されることを確認
   - `unlink`イベントで該当バグのみ削除されることを確認
2. **統合テスト**: Bug自動実行でanalyze→fixフェーズが連続して成功することを確認
3. **回帰テスト**: 手動でのバグ選択・削除が正常に動作することを確認
