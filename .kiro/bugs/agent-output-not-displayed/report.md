# Bug Report: agent-output-not-displayed

## Overview
Agentの実行が始まったのに出力がないままローディング状態が続く問題。原因として、eventCallbacksRegisteredフラグによりウィンドウリロード後にイベントコールバックが再登録されない可能性がある。

## Status
**Pending**

## Environment
- Date Reported: 2025-12-27T08:27:00+09:00
- Affected Component: Agent実行・出力表示パイプライン
- Severity: High（ユーザー体験に直接影響）

## Steps to Reproduce
1. SDD Orchestratorでプロジェクトを開く
2. Agentを実行する（例：/kiro:spec-requirements）
3. ローディング状態が続き、出力が表示されないことがある

## Expected Behavior
Agent実行開始後、出力がリアルタイムでログパネルに表示される

## Actual Behavior
Agent実行中のローディング状態が続くが、出力が全く表示されないことがある

## Error Messages / Logs
```
ログ確認の結果、「Window destroyed, cannot send output」のパターンは未確認。
ただし、eventCallbacksに関するログがmain.logに出力されていない（DEBUGレベルのため）。
```

## Related Files
- [handlers.ts:608-645](electron-sdd-manager/src/main/ipc/handlers.ts#L608-L645) - eventCallbacksRegisteredフラグ
- [handlers.ts:1538-1573](electron-sdd-manager/src/main/ipc/handlers.ts#L1538-L1573) - registerEventCallbacks関数
- [specManagerService.ts:570-602](electron-sdd-manager/src/main/services/specManagerService.ts#L570-L602) - 出力コールバック処理

## Additional Context
### 調査で特定した潜在的問題

1. **ウィンドウ参照のキャプチャ問題**: `registerEventCallbacks`で最初のウィンドウ参照がクロージャにキャプチャされ、ウィンドウリロード後に古い参照を使い続ける
2. **グローバルフラグ**: `eventCallbacksRegistered`が`true`になると、プロジェクト変更時以外はリセットされない
3. **コールバック蓄積**: `SpecManagerService`の`outputCallbacks`配列をクリアする機構がない
