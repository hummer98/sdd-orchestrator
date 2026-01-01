# Bug Report: e2e-file-watcher-test-bypass

## Overview
E2Eテストでファイル監視による自動UI更新が検証されていない - refreshSpecStore()による手動リフレッシュで回避されているため、onSpecsChanged経由の自動更新が正しく動作しているか不明

## Status
**Fixed** ✅

## Environment
- Date Reported: 2026-01-02T12:30:00+09:00
- Date Fixed: 2026-01-02T21:41:00+09:00
- Affected Component: specStore ↔ editorStore 同期
- Severity: Medium

## Steps to Reproduce
1. 新規specを作成する
2. requirementワークフローを実行してrequirements.mdが生成される
3. メインパネルのエディターを確認する

## Expected Behavior
requirements.mdが更新されたら、メインパネルのエディター表示も自動的に更新される

## Actual Behavior (修正前)
ファイル監視でspecStore.specDetail.artifactsは更新されるが、UIが表示しているeditorStore.contentは更新されない

## Root Cause
specStoreとeditorStoreが独立しており、ファイル変更時にeditorStoreへの同期が行われていなかった

## Fix Applied
`specStore.ts`の`updateArtifact()`関数に、editorStore同期処理を追加：
- アクティブタブが更新対象のアーティファクトと一致する場合
- エディターがdirty状態でない場合
- editorStore.loadArtifact()を呼び出してコンテンツを再読み込み

## Related Files
- `electron-sdd-manager/src/renderer/stores/specStore.ts` (修正箇所)
- `electron-sdd-manager/src/renderer/stores/editorStore.ts`
- `electron-sdd-manager/e2e-wdio/file-watcher-ui-update.e2e.spec.ts` (新規テスト)

## Verification
E2Eテスト4件すべてパス：
- `should have file watcher active after project selection`
- `should update requirements.md content in UI when file changes without manual refresh`
- `should update spec.json phase in UI when file changes without manual refresh`
- `should update editorStore.content when requirements.md changes`
