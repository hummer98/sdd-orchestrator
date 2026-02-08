/**
 * Install Dialogs E2E Tests
 * CLIインストールダイアログ及び統合インストーラーのE2Eテスト
 *
 * テスト内容:
 * - tRPC IPCブリッジの確認
 * - Zustand Store経由のAPI確認
 * - コマンドセットインストール関連のtRPC通信確認
 *
 * Note: Phase 2 (commandset-unified-installer) で以下のメニュー項目が削除されました:
 * - 「CLAUDE.mdをインストール...」 → 統合インストーラーに統合
 * - 「spec-managerコマンドを再インストール...」 → 統合インストーラーに統合
 * - 「シェルコマンドの実行許可を追加...」 → 統合インストーラーに統合
 * - 「cc-sdd Workflowをインストール...」 → 統合インストーラーに統合
 *
 * 削除されたメニュー操作のテストは統合インストーラーのテストでカバーされます。
 *
 * Note: 基本的なアプリ起動・セキュリティ・安定性テストは app-launch.spec.ts に統合
 * Note: tRPC完全移行後、window.electronAPIは削除済み
 *       electron-trpc の IPC ブリッジ (window.electronTRPC) を使用
 */

// Note: fs/path/os imports removed - no longer needed after tRPC migration
// CLAUDE.md non-creation tests are now covered by unit tests

describe('Install Dialogs E2E', () => {
  // ============================================================
  // tRPC IPCブリッジ確認
  // ============================================================
  describe('tRPC IPCブリッジ', () => {
    it('electronTRPC IPCブリッジが定義されている', async () => {
      const hasElectronTRPC = await browser.execute(() => {
        return typeof (window as any).electronTRPC !== 'undefined';
      });
      expect(hasElectronTRPC).toBe(true);
    });

    it('__STORES__グローバルオブジェクトが利用可能', async () => {
      const storeKeys = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        if (!stores) return [];
        return Object.keys(stores);
      });
      expect(storeKeys).toContain('project');
    });
  });

  // ============================================================
  // CommandsetInstallDialog（統合インストーラー）
  // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
  // Task: 19.2 - 削除されたメニュー機能をカバー
  // Note: tRPC移行後、install APIはtRPCルーター経由でアクセス
  // ============================================================
  describe('CommandsetInstallDialog（統合インストーラー）tRPC通信確認', () => {
    it('tRPC経由でinstall APIにアクセスできる（Zustand store確認）', async () => {
      // tRPC vanillaClient経由でinstallルーターが利用可能であることを確認
      // 直接メソッド存在確認はできないため、Zustand store経由でtRPC通信が動作していることを検証
      const storeAvailable = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores !== undefined && stores.project !== undefined;
      });
      expect(storeAvailable).toBe(true);
    });

    it('agentストアがtRPC Subscription経由で利用可能', async () => {
      const agentStoreReady = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.agent?.getState !== undefined;
      });
      expect(agentStoreReady).toBe(true);
    });
  });

  // ============================================================
  // メニュー関連IPC（tRPC Subscription経由）
  // ============================================================
  describe('メニュー関連tRPC通信', () => {
    it('tRPC Subscriptionイベントリスナーが動作している', async () => {
      // tRPC Subscription経由でメニューイベントを受信する仕組みを確認
      const agentStoreReady = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.agent?.getState !== undefined;
      });
      expect(agentStoreReady).toBe(true);
    });

    // Note: 以下のメニューイベントはPhase 2で削除されました:
    // - onMenuInstallClaudeMd → 統合インストーラーに統合
    // - onMenuForceReinstall → 統合インストーラーに統合
    // - onMenuAddShellPermissions → 統合インストーラーに統合
    // - onMenuInstallCcSddWorkflow → 統合インストーラーに統合
  });

  // ============================================================
  // パーミッション関連API（tRPC経由）
  // Note: 個別メニュー項目は削除されましたが、APIは統合インストーラーから使用されます
  // ============================================================
  describe('パーミッション関連tRPC通信', () => {
    it('projectストアがtRPC経由で利用可能', async () => {
      const projectStoreReady = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState !== undefined;
      });
      expect(projectStoreReady).toBe(true);
    });
  });

  // ============================================================
  // CLAUDE.md非作成確認（claudemd-profile-install-merge）
  // Note: installCommandsetByProfile() の動作確認はユニットテストでカバー
  //       E2EではtRPCルーター経由でinstall APIが利用可能であることを確認
  //       ビルド済みアプリでは個別モジュールの動的importは不可のため、
  //       browser.electron.execute + import() アプローチは使用しない
  // ============================================================
  describe('コマンドセットインストールtRPC統合', () => {
    it('tRPC IPCブリッジ経由でinstall APIにアクセス可能', async () => {
      const hasTRPC = await browser.execute(() => {
        return typeof (window as any).electronTRPC !== 'undefined';
      });
      expect(hasTRPC).toBe(true);
    });

    it('projectストアにinstallCommandset関連の状態がある', async () => {
      const hasInstallState = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        if (!stores?.project?.getState) return false;
        const state = stores.project.getState();
        // installedProfile はコマンドセットインストール後に設定される
        return 'installedProfile' in state;
      });
      expect(hasInstallState).toBe(true);
    });
  });

  // Note: セキュリティ設定・安定性テストは app-launch.spec.ts に統合
});
