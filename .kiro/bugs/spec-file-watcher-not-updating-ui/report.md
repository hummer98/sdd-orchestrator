# Bug Report: spec-file-watcher-not-updating-ui

## Overview
specフォルダ内のファイル（requirements.md, design.md, tasks.md等）が外部で更新されてもUIにリアルタイム反映されない。

## Status
**Fixed**

## Environment
- Date Reported: 2025-12-21T00:00:00+09:00
- Date Fixed: 2025-12-21T05:17:00+09:00
- Affected Component: handlers.ts, specStore.ts, bugStore.ts
- Severity: High

## Steps to Reproduce
1. SDD Orchestratorを起動
2. プロジェクトを選択
3. VSCodeでspec内のファイル（例: requirements.md）を編集・保存
4. SDD Orchestratorに反映されない（修正前）

## Expected Behavior
外部でファイルを編集・保存すると、即座にUI上のspec詳細が更新される。

## Actual Behavior
ファイルを保存しても、UIに反映されなかった。watcherが起動していなかったため。

## Root Cause
`unified-project-selection` spec の Task 1.4（Watcher Initialization）が不完全だった。設計ではSELECT_PROJECT IPC内でwatcherを起動することになっていたが、実装ではRenderer側のstartWatching()呼び出しに依存していた。

## Fix Summary
Main processの`SELECT_PROJECT` IPCハンドラー内でwatcherを自動起動するように修正。詳細は[fix.md](fix.md)を参照。

## Related Files
- [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts)
- [specStore.ts](electron-sdd-manager/src/renderer/stores/specStore.ts)
- [bugStore.ts](electron-sdd-manager/src/renderer/stores/bugStore.ts)
- [unified-project-selection/design.md](.kiro/specs/unified-project-selection/design.md)

## Additional Context
この問題はHMR（Hot Module Replacement）後にも発生していた。Renderer側でwatcherを起動する設計では、HMR後にイベントリスナーが失われる問題があった。修正後はMain processでwatcherを起動するため、HMR後もリスナーを再登録するだけで動作する。
