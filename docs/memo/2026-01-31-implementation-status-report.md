# 実装状況レポート: 既知の課題と解決状況

**作成日**: 2026-01-31
**元文書**:
1. `docs/memo/2026-01-31-agent-json-watcher-architecture.md`
2. `docs/memo/2026-01-30-file-watcher-structural-issues.md`
3. `docs/memo/2026-01-31-agent-status-update-architecture-issues.md`
4. `docs/memo/2026-01-31-spec-workflow-verification-gap-analysis.md`

## サマリー

| カテゴリ | 項目 | ステータス | 詳細 |
|----------|------|------------|------|
| **Agent JSON Watcher** | カテゴリパス定義のSSOT化 | 🔴 未解決 | `agentCategory.ts` に `getWatchPatterns` がなく、ハードコードが残存 |
| | カテゴリ判定ロジック | 🔴 未解決 | `bug:` プレフィックスに依存 |
| | Watcher `ignoreInitial` | 🔴 未解決 | 統合された Watcher でも `true` のまま |
| **File Watcher構造** | 二重監視防止 (`watchedPaths`) | 🟢 解決済 | `watchedPaths` Set導入済み |
| | Race Condition (`setTimeout`) | 🟢 解決済 | Adaptive Retry ロジックに置換済み |
| | 監視戦略 | 🟢 解決済 | ルート監視 + フィルタリングに移行済み |
| **Agent Status Update** | `agentStoreAdapter` デッドコード | 🔴 未解決 | `change` イベントが処理されていない |
| | `HangDetector` 起動 | 🔴 未解決 | `start()` がどこからも呼ばれていない |
| | `AgentWatchdog` 監視範囲 | 🔴 未解決 | インメモリのみ監視（JSON未監視） |
| **Spec Workflow** | `startScheduler()` 呼び出し漏れ | 🟢 解決済 | `initScheduleTaskCoordinator` で呼び出し確認 |
| | 残存TODO | 🟢 解決済 | 実装完了しTODOコメント削除済み |

---

## 詳細分析

### 1. Agent JSON Watcher Architecture
**状態**: 部分的に改善されたが、SSOT化とロジックの改善は未着手。

*   **未解決**: `electron-sdd-manager/src/main/services/agentCategory.ts` は依然として `getWatchPatterns` をエクスポートしておらず、監視パスの定義が分散しています。
*   **未解決**: `determineCategory` は依然として `bug:` 文字列プレフィックスに依存しており、データ構造に基づいた判定になっていません。
*   **未解決**: `agentRecordWatcherService.ts` において、`_specWatcher` は `_projectAgentWatcher` に統合されたようですが、`ignoreInitial: true` の設定は維持されており、既存ファイルの読み込みに関する課題は残っています。

### 2. File Watcher Structural Issues (`bugs`/`specs` Watcher)
**状態**: 完了。

*   **解決済**: `BugsWatcherService` と `SpecsWatcherService` は `watchedPaths` Set を導入し、二重監視を防止しています。
*   **解決済**: 固定の `setTimeout(500)` は廃止され、より堅牢な Adaptive Retry ロジックに変更されました。
*   **解決済**: 個別の深いパスを監視する方式から、ルートディレクトリ（depth: 2）を監視する方式へ移行しました。Chokidar v4 の制約により Glob は使用されていませんが、構造的な改善は達成されています。

### 3. Agent Status Update Architecture Issues
**状態**: 未解決。アーキテクチャ上の不整合がそのまま残存。

*   **未解決**: `electron-sdd-manager/src/renderer/stores/agentStoreAdapter.ts` の `onAgentRecordChanged` 内の `change` イベントハンドラは、"delegating to facade" というログを出すだけで実処理が行われていません。ファイル監視によるUI更新は機能していません。
*   **未解決**: `HangDetector` クラスは存在しますが、`agentLifecycleSetup.ts` を含めコードベース全体でインスタンス化・起動 (`start()`) されていません。ハングしたエージェントの検出機能は無効状態です。
*   **未解決**: `AgentWatchdog` は依然としてインメモリの `AgentRegistry` のみを参照しており、JSONファイルとの整合性チェックや、プロセス再起動後の追跡漏れのリスクが残っています。

### 4. Spec Workflow Verification Gap Analysis
**状態**: 完了。特定のバグは修正されたが、プロセス自体の改善（再発防止）は別途継続検討が必要。

*   **解決済**: `electron-sdd-manager/src/main/ipc/scheduleTaskHandlers.ts` 内の `initScheduleTaskCoordinator` 関数において、`scheduleTaskCoordinator.startScheduler()` が正しく呼び出されていることを確認しました。
*   **解決済**: ドキュメントで指摘されていた `Task 7.1` (Idle Time) および `Task 2.5` (Dependencies) のTODOコメントは解消され、機能が実装されています。

## 次のアクション

優先的に対応すべきは「Agent Status Update Architecture」の未解決項目です。特に `HangDetector` が機能していない点と、UI更新のパスが断絶している点は、ユーザー体験と信頼性に直結する問題です。

1.  **Agent Status Update の修正**: `HangDetector` の有効化と、`agentStoreAdapter` の実装。
2.  **Agent JSON Watcher のリファクタリング**: `agentCategory.ts` のSSOT化。
