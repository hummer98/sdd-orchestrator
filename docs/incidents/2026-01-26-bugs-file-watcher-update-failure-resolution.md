# Bugs File Watcher UI更新バグ解決報告

## 概要
`docs/incidents/2026-01-26-bugs-file-watcher-update-failure.md` で報告された、Bugsのファイル監視経由でのUI自動更新が機能しない問題（`add` イベントでリストが更新されない）を解決しました。

## 原因
`electron-sdd-manager/src/shared/api/IpcApiClient.ts` において、循環参照を回避するために `require('@renderer/stores/projectStore')` を使用して `projectStore` を遅延読み込みしていましたが、Viteによるバンドル後のプロダクションビルド（レンダラープロセス）では `require` が定義されていないため、実行時エラー（`ReferenceError: require is not defined`）が発生していました。

このため、`getCurrentProjectPath()` が失敗し、結果として `getBugs()` がプロジェクトパスを取得できずに処理を中断していました。`unlinkDir` イベント時はストア内のフィルタリングのみで完結するため、API呼び出しが発生せず正常に動作しているように見えていました。

## 対応内容
`electron-sdd-manager/src/shared/api/IpcApiClient.ts` を修正し、`require` を使用する代わりに、グローバルに公開されている `window.__STORES__.project` からプロジェクトの状態を取得するように変更しました。

```typescript
function getCurrentProjectPath(): string | null {
  if (typeof window === 'undefined') return null;
  // Use globally exposed stores to avoid circular dependency and require() issues in renderer
  const stores = (window as any).__STORES__;
  return stores?.project?.getState().currentProject ?? null;
}
```

`window.__STORES__` は `electron-sdd-manager/src/renderer/stores/index.ts` で初期化時に設定されるため、アプリケーション実行時には確実に利用可能です。これにより、循環参照を回避しつつ、レンダラープロセスの状態へ安全にアクセスできるようになりました。

## 検証結果
修正後、E2Eテスト `electron-sdd-manager/e2e-wdio/bugs-file-watcher.e2e.spec.ts` を実行し、全てのテストケースがパスすることを確認しました。

```
[chrome 134.0.6998.205 mac #0-0] Bugs File Watcher E2E
[chrome 134.0.6998.205 mac #0-0]     Bugs Watcher Registration
[chrome 134.0.6998.205 mac #0-0]        ✓ should have bugs watcher active after project selection
[chrome 134.0.6998.205 mac #0-0]     Bugs List Auto Update via File Watcher
[chrome 134.0.6998.205 mac #0-0]        ✓ should detect existing bugs after project selection
[chrome 134.0.6998.205 mac #0-0]        ✓ should update bugs list when new bug folder is created
[chrome 134.0.6998.205 mac #0-0]        ✓ should update bugs list when bug folder is deleted
```

## 影響範囲
- `IpcApiClient` を使用する全てのAPI呼び出しにおいて、プロジェクトパスの取得が安定しました。
- これまで同様の理由で潜在的に失敗していた可能性のある他のAPI呼び出しも修正されています。
