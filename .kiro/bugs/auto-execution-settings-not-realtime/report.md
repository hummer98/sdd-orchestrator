# Bug Report: auto-execution-settings-not-realtime

## Overview
自動実行開始後にGO/NOGO設定を変更しても、実行中のフェーズ遷移に反映されない。`autoExecutionCoordinator.start()` 時点で `executionOptions` にキャッシュされた設定が使い続けられるため、リアルタイムでの設定変更が無視される。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-19T06:19:20Z
- Affected Component: `autoExecutionCoordinator.ts`
- Severity: Medium

## Steps to Reproduce
1. Specの自動実行を開始する
2. 実行中にUI上でGO/NOGO設定を変更する（例: design を NOGO → GO に変更）
3. 次のフェーズ遷移時に設定が反映されないことを確認

## Expected Behavior
設定変更がフェーズ遷移時に反映され、変更後のGO/NOGO設定に従って次フェーズが実行/スキップされる

## Actual Behavior
`start()` 呼び出し時にキャッシュされた設定が使い続けられ、実行中の設定変更が無視される

## Error Messages / Logs
```
なし（エラーではなく設計上の制限）
```

## Related Files
- `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts:190` - `executionOptions` マップ定義
- `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts:387` - `start()` 時のキャッシュ
- `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts:657` - フェーズ遷移時のキャッシュ参照

## Additional Context
- 設定は `spec.json.autoExecution` に永続化されている
- コード内で既に `spec.json` を直接読んでいる箇所が複数存在（L399-414, L674-685など）
- 解決策: `getOptions()` を変更し、キャッシュではなく毎回 `spec.json` から読み直す
