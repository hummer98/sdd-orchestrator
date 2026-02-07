# tRPC導入およびIPC刷新計画書

## 1. 概要
本ドキュメントは、現在の`electron-sdd-manager`におけるIPC通信の肥大化・複雑化を解消するため、`electron-trpc`を導入し、型安全かつ保守性の高いアーキテクチャへ移行するための計画である。
本移行は**全てAIコーディングエージェントによって自律的に遂行される**ことを前提とし、そのための安全策と手順を定義する。

## 2. 現状の課題
「ソースコード肥大化調査レポート (2026-02-06)」により、以下の課題が特定されている。

1.  **Preloadの限界**: `preload/index.ts`が2,700行を超え、単なるIPCブリッジの保守が困難。
2.  **分散した定義**: 1つの機能追加に対し、`channels.ts`, `handlers.ts`, `preload/index.ts`, `electron.d.ts` の4箇所修正が必要。
3.  **型安全性の欠如**: `ipcRenderer.invoke`の戻り値が`any`になりやすく、手動での型定義同期に依存している。

## 3. 品質担保・テスト戦略 (Quality Assurance)

AIによる自動改修のリスク（機能破壊、挙動変化）を防ぐため、**「ロジックの分離」と「多層防御」**を組み合わせた戦略をとる。

### 3.1. ロジック分離による単体テスト (Migration Pre-requisite)
現状のIPCハンドラは、IPC層とビジネスロジックが結合している場合が多い。これをtRPC移行前に分離する。

*   **Before:**
    ```typescript
    // main/ipc/handlers.ts
    ipcMain.handle('GET_USERS', async () => {
      // DBアクセスなどのロジックがここに直書きされている
      return db.users.findMany();
    });
    ```
*   **Step 1 (Refactor):** Service層への切り出し
    ```typescript
    // main/services/userService.ts
    export const getUsers = async () => db.users.findMany();

    // main/ipc/handlers.ts
    import { getUsers } from '../services/userService';
    ipcMain.handle('GET_USERS', async () => getUsers());
    ```
*   **Step 2 (Test):** `userService.ts` に対するVitest単体テストを作成。
    *   この時点でロジックの正当性が担保される。

### 3.2. IPC単体テスト (Mocking)
E2Eテストだけでなく、Vitestを用いたUnit TestレベルでもIPCの動作検証を行う。
`electron` モジュールをモックすることで、プロセスを起動せずにハンドラの登録と実行ロジックをテスト可能にする。

*   **検証内容**:
    *   正しいチャンネル名で `ipcMain.handle` が呼ばれているか。
    *   ハンドラが実行された際、期待通りのServiceメソッドが呼ばれ、戻り値が返されるか。
*   **実装例 (Vitest):**
    ```typescript
    import { vi, expect, test } from 'vitest';
    import { ipcMain } from 'electron'; // vi.mockによりモック化済
    import { registerUserHandlers } from './userHandlers';

    vi.mock('electron', () => ({
      ipcMain: { handle: vi.fn() }
    }));

    test('GET_USERS handler registration', async () => {
      registerUserHandlers();
      
      // 1. ハンドラ登録の検証
      expect(ipcMain.handle).toHaveBeenCalledWith('GET_USERS', expect.any(Function));
      
      // 2. ハンドラロジックの検証
      const handler = vi.mocked(ipcMain.handle).mock.calls.find(c => c[0] === 'GET_USERS')![1];
      const result = await handler(mockEvent, mockArgs);
      expect(result).toEqual(expectedData);
    });
    ```

### 3.3. 統合テストによる振る舞い検知 (Behavior Verification)
E2Eテストは実行コストが高く、デバッグも困難であるため、**原則として「統合的なユニットテスト（上記3.1, 3.2）」で検証できない項目に限定**して実施する。

1.  **E2Eテストの制限と役割**
    *   **Smoke Test (起動確認)**: アプリケーションが起動し、メイン画面が表示されること。
    *   **Native Capabilities**: ファイル選択ダイアログ、ウィンドウ生成、Shellコマンド実行など、モックが困難または信頼できない部分。
    *   **Critical Paths**: ユーザーにとって最も重要なフロー（例: プロジェクトを開く〜エージェント実行開始）の正常系のみ。
2.  **検証の責任分界点**
    *   **ロジックの正しさ**: Service Unit Test (3.1) で保証。
    *   **IPCの繋ぎこみ**: IPC Unit Test (Mocking) (3.2) で保証。
    *   **全体統合**: 最小限のE2Eテストで保証。
    *   *Note: 詳細なエッジケースや異常系のテストをE2Eで実施しないこと。*

## 4. 移行フェーズ

### Phase 0: 基盤構築 (Infrastructure)
*   `electron-trpc` および `zod` のインストール。
*   `main/trpc/router.ts` (Root Router) の作成。
*   `preload/trpc.ts` (tRPC専用Preload) の作成。
*   Vite設定の調整。
*   **検証**: シンプルな `healthCheck` APIを実装し、Rendererから呼べることを確認。

### Phase 1: パイロット移行 (Pilot)
*   **対象**: 依存関係が少なく、副作用のない参照系API（例: `GET_APP_VERSION`, `GET_PLATFORM`）。
*   **目的**: AIエージェントが「ロジック分離 → ルーター実装 → UI側差し替え」のサイクルを確立するため。

### Phase 2: ドメイン単位の段階的移行 (Incremental Migration)
最も肥大化しているファイルをターゲットに、ドメインごとに移行を進める。

1.  **WebSocket / Agent関連 (`webSocketHandler.ts`周辺)**
    *   最優先課題。ストリーミング（Subscription）機能を用いて、ログ出力やステータス更新を移行。
2.  **Project / Spec関連**
3.  **File System関連**

**AIエージェントへの指示フロー:**
1.  対象ドメインの既存IPCハンドラを特定。
2.  ロジックがハンドラ内にある場合、Service層へ抽出（Refactoring）。
3.  抽出したServiceに対して単体テストを作成（Testing）。
4.  tRPC Routerを定義し、Serviceを呼び出すよう実装（Implementation）。
5.  Renderer側の `window.electronAPI` 呼び出しを `trpc` フックへ置換（Client Migration）。
6.  古いIPCハンドラと型定義を削除（Cleanup）。

### Phase 3: レガシーIPCの撤廃 (Cleanup)
*   `preload/index.ts` が空に近づいた段階で、最終的なクリーンアップを行う。
*   `contextBridge` から古いAPIを削除。

## 5. AIエージェント向け開発ガイドライン

将来このタスクを担当するAIエージェントは以下のルールを厳守すること。

1.  **Schema First**:
    *   必ず `zod` で入出力のスキーマを定義すること。`any` は禁止。
2.  **Service Isolation**:
    *   tRPCルーターの中に複雑なロジックを書かない。ルーターは「バリデーション」と「Service呼び出し」に徹すること。
3.  **Test Stability**:
    *   IPCを置き換える前に、必ず**「その機能が現在動いていることを証明するテスト」**を実行（なければ作成）すること。テストが失敗している状態で移行を開始してはならない。
4.  **No Big Bang**:
    *   一度に全てのIPCを移行しない。1PRにつき1ドメイン（または数メソッド）に留める。

## 6. 質問事項・確認事項
移行を開始するにあたり、以下の点を明確にする必要があります。

*   **E2Eテストランナーの選定**: プロジェクトには `Playwright` と `WebdriverIO` が混在しています。IPC移行の検証にはどちらを主軸とすべきか？（推奨はWeb系テストに強いPlaywrightだが、Electron固有のフックが必要ならWDIO）
*   **既存テストのカバレッジ**: 現在のテストコードでどの程度の機能がカバーされているか？（カバレッジが低い場合、テスト作成工数が先にかかる）

## 7. 完了ステータス

| フェーズ | ステータス | 完了日 | 備考 |
|---------|----------|--------|------|
| Phase 0: 基盤構築 | **完了** | 2026-02-05 | `trpc-infrastructure` Specとして実施。healthCheck API動作確認済み |
| Phase 1: パイロット移行 | **完了** | 2026-02-06 | `GET_APP_VERSION`, `GET_PLATFORM`, `getNodeEnv`, `getAppPath` の4チャンネル移行完了 |
| Phase 2: ドメイン単位移行 | **完了** | 2026-02-07 | 全219チャンネルを15ドメインルーターに移行完了（config, project, file, spec, bug, agent, autoExecution, git, events, cloudflare, install, mcp, schedule, misc + system拡張） |
| Phase 3: レガシーIPC撤廃 | **完了** | 2026-02-07 | `src/main/ipc/`ディレクトリ全削除、`preload/index.ts`最小化、`electron.d.ts`削除、`IpcApiClient.ts`削除、`window.electronAPI`参照全削除 |

### 実施Spec

- **trpc-infrastructure**: Phase 0（基盤構築）を担当
- **trpc-full-migration**: Phase 1〜3（全チャンネル移行〜レガシー撤廃）を担当

### 最終アーキテクチャ

移行完了後のIPC通信は以下の構成:
- **15ドメインルーター**: system, config, project, file, spec, bug, agent, autoExecution, git, events, cloudflare, install, mcp, schedule, misc
- **37 tRPC Subscription**: EventBusパターンによるMain→Rendererイベント通知
- **vanillaClient**: Zustand Store用の命令的tRPCクライアント
- **Context DI**: `ctx.services.*`経由のサービス注入（テスト時モック可能）
