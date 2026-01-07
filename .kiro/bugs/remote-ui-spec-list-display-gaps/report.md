# Bug Report: remote-ui-spec-list-display-gaps

## Overview
Remote-UIのSpec一覧表示について、Electron版との2つの表示差異:

1. **実行中Agent件数が表示されない**
   - Electron版: Botアイコン + 件数バッジ（青色）で実行中Agent数を表示
   - Remote-UI: 表示なし

2. **Phaseバッジの欠落**
   - Electron版: 7種類のPhase（inspection-complete, deploy-complete含む）
   - Remote-UI: 5種類のみ（inspection-complete, deploy-completeが欠落）

## Status
**Pending**

## Environment
- Date Reported: 2026-01-07T13:15:00+09:00
- Affected Component: Remote-UI SpecList
- Severity: Medium（運用上重要な情報が欠落）

## Steps to Reproduce
*To be documented*

1. Remote-UIでプロジェクトに接続
2. Specでエージェントを実行
3. Spec一覧を確認 → 実行中Agent件数が見えない
4. inspection-completeまたはdeploy-completeフェーズのSpecを確認 → バッジ色がデフォルト（グレー）

## Expected Behavior
- Spec一覧で実行中Agent件数がバッジ表示される
- 全7種類のPhaseが適切な色で表示される

## Actual Behavior
- 実行中Agent件数が表示されない
- inspection-complete, deploy-completeのバッジが適切に表示されない

## Error Messages / Logs
```
N/A (表示の欠落)
```

## Related Files
- `electron-sdd-manager/src/renderer/components/SpecList.tsx:217-225` - Electron版Agent件数表示
- `electron-sdd-manager/src/renderer/components/SpecList.tsx:19-41` - Electron版Phaseラベル/色定義
- `electron-sdd-manager/src/main/remote-ui/components.js:258-274` - Remote-UI Phaseバッジ（欠落あり）

## Additional Context
これらは `remote-ui-agent-list-feature-parity` バグの一部として特定された項目。
個別修正として切り出し、高優先度で対応する。
