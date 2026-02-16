# Remote E2E Test Report — 2026-02-14

## Summary

| 項目 | 値 |
|------|-----|
| 実行環境 | KDG-069 (yuji@172.25.76.217) macOS |
| 実行日時 | 2026-02-14 17:47 - 18:28 JST |
| 実行時間 | 41分25秒 |
| Electron | v35.7.5 (Chromedriver v134.0.6998.205) |
| 結果 | **52 passed / 21 failed / 73 total** |
| 成功率 | 71.2% |

## Failed Tests (21)

### Category A: 環境固有 — Git リポジトリ不在 (2件)

rsync で `.git/` を除外しているため、fixture ディレクトリが git リポジトリではない。
Worktree 操作が `fatal: not a git repository` で失敗。

| # | Spec | エラー |
|---|------|--------|
| 0-24 | convert-spec-to-worktree | `convert-to-worktree-button` not found (git branch 取得不可) |
| 0-39 | impl-start-worktree | `icon-git-branch`, `icon-play` not found (git branch 取得不可) |

**対応**: rsync 時に fixtures の `.git` を含める、またはリモートで `git init` を実行。

### Category B: 環境固有 — ポート/リモートサーバー (2件)

全テストで `NO_AVAILABLE_PORT` (3001-3011) 警告が出力。
Remote Server テストは `startRemoteServer` でポート取得に失敗。

| # | Spec | エラー |
|---|------|--------|
| 0-57 | remote-webserver | `before all` hook 失敗: startRemoteServer |
| 0-67 | websocket-command-execution | `before all` hook 失敗: startRemoteServer |

**対応**: リモート環境のポート空き確認。テストで使用するポート範囲を拡大。

### Category C: 環境固有 — タイミング/ContextId Timeout (3件)

リモート環境のパフォーマンス問題による ContextId Timeout。
Auto Execution 系テストで非同期処理の完了待ちが不十分。

| # | Spec | エラー |
|---|------|--------|
| 0-14 | auto-execution-phase-ssot | 1 failing (assertion failure) |
| 0-15 | auto-execution-resume | ContextId Timeout + assertion failure |
| 0-16 | auto-execution-workflow | ContextId Timeout + assertion failure |

**対応**: 待機時間の延長。リモート用 wdio.conf 設定の検討。

### Category D: テスト期待値変更 — IPC → eventBus 移行未追従 (1件)

メニューイベントが `webContents.send()` → `eventBus.emit()` + tRPC subscription に移行済み。
テストは旧方式 `webContents.send('menu-cli-install')` を使用 → イベントが到達しない。

| # | Spec | エラー |
|---|------|--------|
| 0-22 | cli-install-dialog | 全 5 テスト失敗: ダイアログが開かない |

**原因**: `menu.ts` は `getGlobalEventBus().emit(EVENT_NAMES.MENU_INSTALL_CLI)` を使用するようになったが、
テストは旧式の `windows[0].webContents.send('menu-cli-install')` を使用している。
**対応**: テストを eventBus 経由に修正。

### Category E: 未実装機能 — Renderer Console ノイズフィルタリング (1件)

テストは HMR/Vite/React DevTools メッセージのフィルタリングを期待するが、
`windowFactory.ts` の `console-message` ハンドラにフィルタリングが実装されていない。

| # | Spec | エラー |
|---|------|--------|
| 0-58 | renderer-logging | 3件: HMR filter, Vite filter, React DevTools filter |

**原因**: `windowFactory.ts:90` の `console-message` リスナーが全メッセージを無条件にログ出力。
**対応**: ノイズフィルタリングを実装（HMR, Vite, React DevTools メッセージを除外）。

### Category F: 環境固有 — UI レンダリング遅延 (12件)

リモート環境での UI レンダリング速度が遅く、要素が見つからない。
ローカルで再現確認が必要。

| # | Spec | エラー概要 |
|---|------|-----------|
| 0-7 | ask-agent-dialog | execute button not found |
| 0-43 | mcp-server-settings | MCP tab/panel not found |
| 0-44 | mermaid-preview | edit button, textarea not found + git errors |
| 0-46 | multi-window | フォーカスウィンドウ取得失敗 |
| 0-49 | phase-rejection | reject button 全般 not found |
| 0-52 | project-file-editing | toast 通知が click を妨害 + dirty-indicator not found |
| 0-54 | project-settings-dialog | Phase-specific selectors not found |
| 0-55 | project-switch-warning | 警告ダイアログが表示されない |
| 0-56 | recent-projects | ProjectSelectionView not displayed |
| 0-60 | schedule-type-settings | 全 selector not found |
| 0-65 | tool-path-settings | ContextId Timeout + tool row not found |
| 0-66 | vcs-scheme-ui | Jujutsu option not found |

**対応**: ローカル環境で再現確認し、環境固有かコードの問題かを切り分け。

## Passed Tests (52)

<details>
<summary>全52件のPASSEDスペック一覧</summary>

| # | Spec |
|---|------|
| 0-0 | additional-markdown-files |
| 0-1 | agent-completion-notification |
| 0-2 | agent-delete |
| 0-3 | agent-log-streaming |
| 0-4 | agent-resume-log-display |
| 0-5 | app-launch |
| 0-6 | artifact-editor-search |
| 0-8 | auto-execution-document-review |
| 0-9 | auto-execution-flow |
| 0-10 | auto-execution-impl-flow |
| 0-11 | auto-execution-impl-phase |
| 0-12 | auto-execution-intermediate-artifacts |
| 0-13 | auto-execution-permissions |
| 0-17 | bug-auto-execution |
| 0-18 | bug-workflow |
| 0-19 | bugs-file-watcher |
| 0-20 | bugs-pane-integration |
| 0-21 | bugs-worktree-support |
| 0-23 | cloudflare-tunnel |
| 0-25 | debatex-scheme |
| 0-26 | diag-main-process |
| 0-27 | diagnostic-project-selection |
| 0-28 | diagnostic |
| 0-29 | document-review-ui-states |
| 0-30 | document-review |
| 0-31 | edit-preview-toggle |
| 0-32 | event-log |
| 0-33 | experimental-tools-installer |
| 0-34 | file-change-dialogs |
| 0-35 | file-watcher-root-monitoring |
| 0-36 | file-watcher-ui-update |
| 0-37 | gemini-document-review |
| 0-38 | git-diff-viewer |
| 0-40 | inspection-workflow |
| 0-41 | install-dialogs |
| 0-42 | layout-persistence |
| 0-45 | metrics-display |
| 0-47 | parsed-log-entry-display |
| 0-48 | permission-control |
| 0-50 | project-agent-startup |
| 0-51 | project-docs-viewer |
| 0-53 | project-selection-basic |
| 0-59 | schedule-task |
| 0-61 | simple-auto-execution |
| 0-62 | spec-workflow |
| 0-63 | ssh-workflow |
| 0-64 | startup-project-selection |
| 0-68 | workflow-integration |
| 0-69 | worktree-execution |
| 0-70 | worktree-rebase-from-main |
| 0-71 | worktree-spec-sync |
| 0-72 | worktree-two-stage-watcher |

</details>

## 原因分類サマリー

| 分類 | 件数 | 対応 |
|------|------|------|
| 環境固有 (Git/Port/Timing) | 7 | リモート環境改善 |
| テスト期待値変更 (IPC→eventBus) | 1 | テスト修正 |
| 未実装機能 (ノイズフィルタ) | 1 | 実装追加 |
| UI レンダリング遅延 (要切り分け) | 12 | ローカル再現確認 |

## 共通ログ

全 73 テストで以下の警告が出力:
```
[MCP] Failed to auto-start MCP server {"error":{"type":"NO_AVAILABLE_PORT","triedPorts":[3001,...,3011]}}
```
MCP ポート範囲 (3001-3011) が全て使用中。ただし MCP 未使用のテストには影響なし。
