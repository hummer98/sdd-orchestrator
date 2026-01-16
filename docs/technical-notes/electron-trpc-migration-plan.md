# Electron tRPC Migration Plan

## 1. 概要
本ドキュメントは、現在の `ipcMain.handle` / `ipcRenderer.invoke` ベースのIPC通信を、**electron-trpc** ベースの構成へ移行するための計画書です。

### 目的
1.  **AI実装効率の最大化**: コードとスキーマ（API契約）を一致させ、AIが単一の「ルーター定義」を書くだけで実装が完結する状態を作る。
2.  **テスト容易性の向上**: Electron依存（`ipcMain`モック）を排除し、純粋な非同期関数としてビジネスロジックをテスト可能にする。
3.  **型安全性の強制**: Zodによる実行時バリデーションを標準化し、契約不整合によるバグを根絶する。

---

## 2. 現状分析と影響範囲

### 規模感
*   **対象IPCチャンネル数**: 100以上 (概算)
*   **関連ファイル**:
    *   `src/main/ipc/*Handlers.ts` (ハンドラ実装)
    *   `src/preload/index.ts` (API公開)
    *   `src/renderer/` (呼び出し元)
    *   `src/main/ipc/*Handlers.test.ts` (既存テスト)

### 技術スタックの変更点

| 項目 | 現在 (Legacy) | 移行後 (tRPC) |
| :--- | :--- | :--- |
| **通信定義** | 文字列チャンネル名 (`IPC_CHANNELS.*`) | tRPC Procedures (`trpc.router.proc`) |
| **バリデーション** | 実装依存 (手動チェック or なし) | **Zod Schema (必須)** |
| **型安全性** | `electron.d.ts` 手動定義 | TypeScript推論 (自動) |
| **テスト手法** | `ipcMain.handle` のモック | `caller.proc()` 直接呼び出し |
| **API公開** | `contextBridge.exposeInMainWorld` | `exposeElectronTRPC` |

---

## 3. 移行フェーズ計画

「Big Bang（一括移行）」はリスクが高すぎるため、**共存期間**を設けた段階的移行を行います。

### Phase 0: 基盤構築 (推定: 0.5日)
tRPCのインフラを整え、"Hello World" が動く状態にします。

1.  **依存パッケージの追加**:
    *   `electron-trpc`, `@trpc/server`, `@trpc/client`, `zod`
2.  **Mainプロセス セットアップ**:
    *   `src/main/trpc.ts` (tRPC初期化)
    *   `src/main/routers/index.ts` (Root Router)
    *   `src/main/index.ts` で `createIPCHandler` を適用。
3.  **Preload セットアップ**:
    *   `src/preload/index.ts` で `exposeElectronTRPC` を追加。
4.  **Rendererプロセス セットアップ**:
    *   `src/renderer/trpc.ts` (Client作成)
    *   React Provider (もし必要なら) またはシングルトンクライアントの整備。

### Phase 1: パイロット移行 (推定: 1日)
独立性が高く、影響の少ない機能を1つ選んで移行し、パターンを確立します。
**候補**: `BUG_WORKTREE_CREATE` (最近問題になった箇所)

1.  **ルーター作成**: `src/main/routers/bugWorktree.ts`
2.  **プロシージャ実装**: Zodスキーマ定義とロジック移動。
3.  **テスト実装**: Electronなしの単体テスト作成。
4.  **Renderer修正**: `window.electronAPI.createBugWorktree` → `trpc.bugWorktree.create.mutate`。
5.  **クリーンアップ**: 古い `ipcMain` ハンドラと `preload` 定義を削除。

### Phase 2: カテゴリ別移行 (順次実施)
既存のハンドラファイル単位でルーター化していきます。

*   `bugWorktreeHandlers.ts` -> `routers/bugWorktree.ts`
*   `autoExecutionHandlers.ts` -> `routers/autoExecution.ts`
*   ...

**注意**: このフェーズはAIエージェントを活用し、1ファイルずつ確実に移行します。

### Phase 3: 完全移行とクリーンアップ
全てのIPCがtRPC化された後、古いIPC基盤を撤去します。

*   `IPC_CHANNELS` 定数の削除。
*   `preload/index.ts` の古いAPI削除。
*   `electron.d.ts` の清掃。

---

## 4. リスクと対策

### 懸念1: Context Isolation との整合性
`electron-trpc` は `contextIsolation: true` を前提としていますが、プロジェクトの設定によっては微調整が必要です。
*   **対策**: `preload` での `process.contextIsolated` チェックを行い、正しい公開方法を選択する。

### 懸念2: パフォーマンス
tRPCはオーバーヘッドがありますが、通常のUI操作やファイル操作の頻度では無視できるレベルです。
*   **対策**: 巨大なバイナリ転送などが発生する場合は、tRPCを経由せず既存のIPCを維持するか、専用のストリーム転送を検討する（現状のコードを見る限りテキストベースが主なので問題ない）。

### 懸念3: 学習コスト
将来の開発者がtRPCを知らない場合。
*   **対策**: `docs/technical-notes/trpc-guidelines.md` を作成し、新しいIPCの追加手順を標準化する。

---

## 5. AIエージェントへの指示指針 (Prompting Guide)

今後、AIにIPC追加/修正を依頼する際は以下のテンプレートを使用します。

> **タスク**: 機能Xの実装
> **制約**:
> 1. IPC通信には **electron-trpc** を使用すること。
> 2. 入力値は必ず **Zod** で検証すること。
> 3. テストは `ipcMain` をモックせず、tRPCの `caller` を使ってロジックを直接テストすること。
> 4. `electron.d.ts` や `IPC_CHANNELS` は編集しないこと（tRPCでは不要なため）。

---

## 6. 作業開始に向けた次のステップ

まず **Phase 0 (基盤構築)** を実施し、`bugWorktree` の移行（Phase 1）までを完了させることを推奨します。
