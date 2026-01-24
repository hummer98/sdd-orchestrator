# Implementation Review Report (2026-01-21)

## 概要
現在の `electron-sdd-manager` の実装状況について、Electronアーキテクチャ、設計原則、デッドコード、共通化の観点から評価を行いました。

## 1. Electronアーキテクチャ (Main vs Renderer)

### 評価: 概ね良好だが、一部に重大な依存違反と責務の漏れがある

*   **Good:** ファイルシステム監視 (`chokidar`) やファイルの書き込み、ビジネスロジック（タスク完了判定、フェーズ更新）の多くが Main プロセス (`SpecsWatcherService`) に実装されており、「Fat Main, Thin Renderer」の原則に従おうとする意図が見られます。
*   **Bad (Critical):** Main プロセスが Renderer プロセスのコードを直接 import しています。
    *   `src/main/services/specsWatcherService.ts` にて:
        ```typescript
        import { normalizeInspectionState, hasPassed } from '../../renderer/types/inspection';
        ```
    *   **リスク:** Renderer 側のコードがブラウザAPI (DOM等) を含んでいる場合、Main プロセスで実行時エラーが発生します。また、ビルド依存関係が循環する可能性があります。
    *   **推奨:** 当該コードを `src/shared` または `src/common` に移動し、両プロセスから参照できるように修正すべきです。

### Renderer 側の不要なステート・ロジック
*   `src/renderer/services/specWatcherService.ts` が、ファイル名 (`tasks.md`, `requirements.md`) に基づいてどのストアを更新するかを判断しています。
*   Main プロセス側でも同様のファイル名判定ロジック (`handleArtifactGeneration`, `checkTaskCompletion`) が存在しており、**ファイル名の仕様変更に対して脆弱な二重管理**となっています。
*   **推奨:** Main プロセスから送るイベントを、生のファイル変更イベントではなく、セマンティックなイベント（例: `SpecArtifactUpdated { type: 'tasks' }`）に抽象化することで、Renderer 側の判定ロジックを排除できます。

## 2. 実装基本原則への適合状況

### 命名規則の混乱
*   `src/renderer/services/specWatcherService.ts` (単数形)
*   `src/main/services/specsWatcherService.ts` (複数形)
*   名前が酷似しており、会話や検索での混同を招きやすい状態です。Main側は `SpecFileSystemWatcher`、Renderer側は `SpecUpdateListener` など、役割（監視 vs 受信）を明確にした命名が望ましいです。

### 責務の分散
*   `src/main/services/` ディレクトリがフラットすぎて肥大化しています（約50ファイル）。
*   「Service」という名前が乱用されており、単なるデータアクセサ、外部プロセスラッパー、ビジネスロジックが混在しています。
*   例: `providerAgentProcess.ts` と `agentProcess.ts` の役割分担がファイル名からは不明確です。

## 3. Deadcode / 不要ファイル

以下のファイルは削除または整理が必要です：

1.  **`electron-sdd-manager/src/main/services/metricsService.ts.design.md`**
    *   コードディレクトリにマークダウンの設計メモが混入しています。`docs/` に移動すべきです。
2.  **`CheckImplResult` (型定義)**
    *   `src/renderer/stores/specStore.ts` のコメントに "REMOVED" とあり、コード上も整理されていますが、関連する古いコードが `src/renderer/stores/spec/` 内に残っていないか確認が必要です。

## 4. 共通化・重複コード

### ファイル名・パス処理の重複
*   前述の通り、`requirements.md`, `design.md`, `tasks.md` といったファイル名の定義が Main と Renderer の両方の Service にハードコードされています。
*   これらは `src/shared/constants.ts` 等で定数化し、一元管理すべきです。

### Worktree ロジック
*   Main プロセスの `SpecsWatcherService` には複雑な Worktree パス解決ロジックが含まれています。これが他の Service (例: `FileService`) と重複していないか注意が必要です（現時点では `worktreeWatcherUtils` に切り出されているようですが、徹底が必要です）。

## 修正優先度 (Action Plan)

1.  **[High] Main から Renderer への import 除去**: `inspection.ts` のロジックを `shared` に移動。
2.  **[Medium] ファイル名定義の共通化**: 定数ファイルを作成し、Main/Renderer 双方が参照するように変更。
3.  **[Low] ディレクトリ整理**: `src/main/services` をカテゴリ別（`managers`, `utils`, `core` 等）に整理。
4.  **[Low] 不要ファイル削除**: `metricsService.ts.design.md` の移動。

## 詳細改善計画

### Phase 1: クリティカルな依存関係の修正 (Estimated: 2h)

最もリスクの高い「Main プロセスから Renderer への不正 import」を解消し、同時にデッドコードの削除を行います。

1.  **Shared Module の作成**
    *   `electron-sdd-manager/src/shared/types/inspection.ts` を作成。
    *   `src/renderer/types/inspection.ts` から `normalizeInspectionState`, `hasPassed`, および関連する型定義を移動。
    *   Main (`src/main/services/specsWatcherService.ts`) と Renderer 双方の import パスを修正。

2.  **不要ファイルの移動・削除**
    *   `electron-sdd-manager/src/main/services/metricsService.ts.design.md` を `docs/memo/` に移動（または内容確認の上削除）。
    *   `src/renderer/stores/specStore.ts` のコメントアウトされている古い型参照を確認し、完全に削除。

### Phase 2: 定数共通化とロジックのDRY化 (Estimated: 3h)

ファイル名定義の重複を解消し、変更に強い構造にします。

1.  **Constants の定義**
    *   `electron-sdd-manager/src/shared/constants/artifacts.ts` を作成。
    *   以下の定義を集約:
        ```typescript
        export const ARTIFACT_FILES = {
          REQUIREMENTS: 'requirements.md',
          DESIGN: 'design.md',
          TASKS: 'tasks.md',
          SPEC_JSON: 'spec.json',
          // ...
        } as const;
        ```

2.  **Service のリファクタリング**
    *   **Main:** `SpecsWatcherService.ts` 内のハードコードされた文字列を `ARTIFACT_FILES` 定数に置き換え。
    *   **Renderer:** `specWatcherService.ts` 内の条件分岐を `ARTIFACT_FILES` 定数を使用するように修正。

### Phase 3: ファイル監視ロジックの改善 (Estimated: 4h)

Main と Renderer で重複している「ファイル名 → アクション」のマッピングロジックを整理し、Main 主導のイベント通知に変更します。

1.  **イベント定義の拡張**
    *   `src/shared/types/events.ts` (または `electron.d.ts`) に、より抽象度の高いイベントを追加。
    *   例: `onSpecArtifactUpdated: (event: { specId: string, artifactType: 'requirements' | 'design' | ... }) => void`

2.  **Main プロセスの責務拡大**
    *   `SpecsWatcherService` でファイル変更を検知した際、単にパスを流すのではなく、どのアーティファクトが変更されたかを判定（Phase 2 の定数を使用）。
    *   判定結果に基づいて、具体的なイベント (`SpecArtifactUpdated`) を Renderer に送信するように変更。

3.  **Renderer プロセスの簡素化**
    *   `src/renderer/services/specWatcherService.ts` の複雑なファイル名判定ロジックを削除。
    *   Main から送られてくるタイプ別のイベントを単純に Store の更新メソッドにマッピングするだけの薄いレイヤーにする。

### Phase 4: ディレクトリ構造の整理 (Estimated: 2h)

肥大化した `src/main/services` を整理し、可読性を向上させます。

1.  **サブディレクトリの作成**
    *   `src/main/services/core`: アプリ基盤 (`appInfo`, `config`, `logger`)
    *   `src/main/services/watchers`: 監視系 (`specsWatcher`, `bugsWatcher`)
    *   `src/main/services/managers`: 管理・調整系 (`profileManager`, `updateManager`)
    *   `src/main/services/integrations`: 外部連携 (`github`, `cloudflare`)

2.  **ファイルの移動と参照の修正**
    *   既存のファイルを適切なサブディレクトリに移動。
    *   VS Code の自動 import 修正機能を活用して参照エラーを解消。

### Phase 5: 命名規則の統一 (Estimated: 1h)

混乱を招くサービス名をリネームします。

1.  **リネームの実施**
    *   Main: `SpecsWatcherService` -> `SpecFileSystemWatcher`
    *   Renderer: `SpecWatcherService` -> `SpecUpdateListener` (または `SpecSyncService` に統合を検討)

---

## 2026-01-24 Update: 現状調査と残タスク

2026年1月24日時点での実装状況を再調査しました。

### ✅ 解決済み (Resolved)
1.  **Main プロセスからの不正 Import**
    *   `SpecsWatcherService.ts` から `renderer/types/inspection` への参照は削除されました。
    *   該当箇所には `// normalizeInspectionState and hasPassed are no longer used here` とのコメントがあり、ロジック自体が Main プロセスから除去されたようです。
2.  **CheckImplResult (Dead Code)**
    *   コードベースから `CheckImplResult` の型定義および使用箇所は削除されました（多数の "REMOVED" コメントとして痕跡は残っていますが、機能的にはクリーンアップ済みです）。
3.  **Worktree 型の重複定義** (2026-01-25 解決)
    *   `src/shared/types/worktree.ts` を正として全型定義（`WorktreeConfig`, `WorktreeError`, `WorktreeInfo`, `WorktreeServiceResult`, `hasWorktreePath`, `isImplStarted`, `isWorktreeConfig`）を集約。
    *   `src/renderer/types/worktree.ts` は Shared からの re-export のみに変更し、後方互換性を維持。
    *   これにより Main プロセスから Renderer への不正 import 問題も解消。

### ⚠️ 未解決 (Unresolved / Partially Resolved)
1.  **不要ファイルの残存**
    *   `electron-sdd-manager/src/main/services/metricsService.ts.design.md` が依然として存在します。早急な移動または削除が必要です。
2.  **Shared Constants の不在**
    *   `src/shared/constants/artifacts.ts` は作成されていません。Main/Renderer 間でファイル名文字列（`tasks.md` 等）のハードコードが残っています。
3.  **ディレクトリ構造の肥大化**
    *   `src/main/services` は依然としてフラットな構造で、大量のファイルが混在しています。整理は行われていません。
4.  **命名規則の混乱**
    *   `SpecsWatcherService` (Main) と `SpecWatcherService` (Renderer) は両方存在し、リネームされていません。
5.  **Worktree ロジックの分散**
    *   `worktreeWatcherUtils.ts` は存在しますが、`SpecsWatcherService.ts` 内の `extractSpecId` メソッドなどに依然として Worktree のパス構造に関する詳細なロジック（`worktreeParts` の手動解析など）が残っており、完全な共通化には至っていません。

### 次のアクション (Next Actions)
優先度の高い順に以下の対応を推奨します。

1.  **[Immediate] 不要ファイルの削除**: `metricsService.ts.design.md` を移動/削除（完了済み）。
2.  **[High] 定数共通化 (Phase 2)**: `src/shared/constants/artifacts.ts` を作成し、Main/Renderer のハードコードを排除。
3.  **[High] Worktree Utilsの統合**: `worktreeWatcherUtils.ts` と `worktreeHelpers.ts` は内容が重複しているため、`worktreeHelpers.ts` に一本化する。
4.  **[Medium] ディレクトリ整理 (Phase 4)**: `src/main/services` を以下のカテゴリ別に再編する。
    *   `agents/`: エージェント実行 (`agentProcess`, `autoExecutionCoordinator` 等)
    *   `bugs/`: バグ管理 (`bugService`, `bugWorkflowService` 等)
    *   `config/`: 設定管理 (`configStore`, `profileManager` 等)
    *   `core/`: 基盤 (`fileService`, `windowManager` 等)
    *   `installers/`: インストーラー (`cliInstaller`, `commandInstaller` 等)
    *   `logging/`: ログ (`logger`, `loggingService` 等)
    *   `metrics/`: メトリクス (`metricsService` 等)
    *   `remote/`: リモートアクセス (`cloudflareTunnelManager` 等)
    *   `watchers/`: ファイル監視 (`specsWatcherService` 等)
    *   `worktree/`: Worktree連携 (`worktreeService` 等)
