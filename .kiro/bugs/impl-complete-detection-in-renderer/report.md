# Bug Report: impl-complete-detection-in-renderer

## Overview
implementation-complete への phase 更新判定がレンダラープロセス (specStore) で行われており、メインプロセス側で判定されていない。これにより、Electron アプリが閉じている状態や spec が選択されていない状態では、tasks.md の全タスク完了を検知できず、spec.json の phase が正しく更新されない。

## Status
**Pending**

## Environment
- Date Reported: 2025-12-26T09:30:00+09:00
- Affected Component: specStore (renderer), specsWatcherService (main)
- Severity: Medium

## Steps to Reproduce

1. SDD Orchestrator で spec を選択せずに閉じる
2. CLI で `/kiro:spec-impl` を実行し、全タスクを完了させる
3. SDD Orchestrator を再度開く
4. spec.json の phase が `tasks-generated` のまま（`implementation-complete` に更新されていない）

## Expected Behavior
tasks.md の全タスクが完了した時点で、メインプロセス側で検知し、spec.json の phase を `implementation-complete` に自動更新すべき。

## Actual Behavior
レンダラープロセスの `specStore.selectSpec()` が呼ばれた時にのみ判定が行われる。

## Error Messages / Logs
```
（エラーではないが、期待する動作をしない）
```

## Related Files
- `electron-sdd-manager/src/renderer/stores/specStore.ts` (現在の判定ロジック)
- `electron-sdd-manager/src/main/services/specsWatcherService.ts` (ファイル監視)
- `electron-sdd-manager/src/main/services/fileService.ts` (spec.json 更新)

## Additional Context

### 現在のアーキテクチャ
```
レンダラープロセス (specStore)
  ↓ tasks.md パース
  ↓ isAllComplete 判定
  ↓ IPC呼び出し
メインプロセス (fileService)
  ↓ spec.json 書き込み
```

### 理想的なアーキテクチャ
```
メインプロセス (specsWatcherService)
  ↓ tasks.md 変更検知
  ↓ tasks.md パース
  ↓ isAllComplete 判定
  ↓ spec.json 更新
  ↓ IPC通知
レンダラープロセス
  ↓ UI更新のみ
```

### 関連する問題
- `implementation-in-progress` の判定も同様にレンダラー依存（ただし既に削除済み）
- `documentReviewService.canStartReview()` が phase を参照しており、信頼性が低い
