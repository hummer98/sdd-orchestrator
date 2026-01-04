# Design Principles Review - 2026-01-02 (v3)

## 概要
`electron-sdd-manager/src/renderer` 以下のコードベースを対象に、`CLAUDE.md` で定義された Design Principles に基づく再々検証を行いました。
`specStore` のリファクタリング（Decomposition）が行われ、コードの構造化と責務分離が進みましたが、アーキテクチャレベルの根本的な課題は残存しています。

## 改善された点
*   **SpecStore Decomposition:** 巨大な `specStore.ts` が `specListStore`, `specDetailStore`, `autoExecutionStore`, `specManagerExecutionStore` および `specSyncService`, `specWatcherService` に分割されました。これにより、単体テストの容易性とコードの見通しが大幅に向上しました。
*   **Facade Pattern:** `specStoreFacade` を導入することで、既存コードへの影響を最小限に抑えつつ内部構造を改善した点は評価できます。

## 残存する違反・懸念事項

### 1. Circular Dependencies (Separation of Concerns / KISS)

分割された `specStoreFacade` およびサービス層においても、他ストアへの依存は解消されておらず、動的インポートによる回避策が維持されています。

*   **SpecStoreFacade (Sync/Watcher Service) <-> ProjectStore:**
    *   `specStoreFacade.ts` 内の `initSpecStoreFacade` や `updateSpecMetadata` などで `projectStore` を動的にインポートしています。
    *   **状態:** 構造化されたものの、論理的な循環依存は解決していません。

*   **SpecStoreFacade (Sync Service) -> EditorStore:**
    *   `specSyncService` のコールバック内で `editorStore` を動的にインポートしています。
    *   **状態:** 同上。

### 2. Duplicated Execution Logic (DRY / SSOT)

実行ロジックの重複は解消されていません。

*   **ExecutionStore:** 汎用的なコマンド実行状態（`isExecuting`, `logs`）を管理。
*   **SpecManagerExecutionStore:** `spec-manager` 固有の実行状態（`specManagerExecution`）を管理。
*   **状態:** 未解決。2つのストアが別々に実装されており、一貫した実行管理（キャンセル処理、ログ集約、排他制御など）が困難な状態です。

### 3. God Object (Encapsulation)

Facadeパターンは後方互換性のために有用ですが、結果として `useSpecStore` (Facade) は依然としてすべての状態とアクションを公開する巨大なインターフェース（God Object）として振る舞っています。
コンポーネントが本当に必要なサブストア（例: `useSpecDetailStore`）だけを直接利用するように移行しなければ、結合度は高いままとなります。

## 結論と推奨事項

`specStore` の分割は「クラス/ファイルレベルの凝集度」を高める良いリファクタリングでしたが、「システムレベルの結合度」を下げるには至っていません。

**次のステップとしての推奨事項:**

1.  **Shared Service Layer (AppService) の導入:**
    *   `projectStore`, `specStore`, `editorStore` を統括する上位レイヤー（またはMediator）を作成し、ストア間の連携ロジックをそこに移動する。これにより動的インポートによる循環参照を排除できます。

2.  **Execution Logicの統合:**
    *   `SpecManagerExecutionStore` を廃止し、その機能を `ExecutionStore`（または新しい `JobStore`）に統合する。もしくは、`ExecutionStore` を下位レイヤーとして利用するように再構成する。

3.  **Component Refactoring:**
    *   UIコンポーネントが Facade (`useSpecStore`) ではなく、分割された各ストア (`useSpecListStore`, `useSpecDetailStore` 等) を直接、必要な分だけフックするように修正し、レンダリングの最適化と依存の最小化を図る。
