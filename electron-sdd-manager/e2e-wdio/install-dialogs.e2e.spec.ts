/**
 * Install Dialogs E2E Tests
 * CLIインストールダイアログ及び統合インストーラーのE2Eテスト
 *
 * テスト内容:
 * - CliInstallDialogの表示と操作
 * - CommandsetInstallDialog（統合インストーラー）の表示と操作
 * - IPC API確認
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
 */

describe('Install Dialogs E2E', () => {
  // ============================================================
  // CliInstallDialog API
  // ============================================================
  describe('CliInstallDialog API', () => {
    it('Renderer APIにCLIインストールメソッドが存在する', async () => {
      const hasCliInstallAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installCliCommand === 'function';
      });
      expect(hasCliInstallAPI).toBe(true);
    });

    // Note: ダイアログUI要素テストはダイアログを開く操作が必要
    // TODO: メニュー操作でダイアログを開いてからUI要素を検証するテストを追加
  });

  // ============================================================
  // CommandsetInstallDialog（統合インストーラー）
  // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
  // Task: 19.2 - 削除されたメニュー機能をカバー
  // ============================================================
  describe('CommandsetInstallDialog（統合インストーラー）', () => {
    it('Renderer APIにコマンドセットインストールメソッドが存在する', async () => {
      const hasCommandsetInstallAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installCommandsetByProfile === 'function';
      });
      expect(hasCommandsetInstallAPI).toBe(true);
    });

    it('Renderer APIにコマンドセットインストールメニューイベントリスナーが存在する', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallCommandset === 'function';
      });
      expect(hasMenuListener).toBe(true);
    });

    it('Renderer APIにエージェントフォルダ存在確認メソッドが存在する', async () => {
      const hasCheckAgentFolderAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.checkAgentFolderExists === 'function';
      });
      expect(hasCheckAgentFolderAPI).toBe(true);
    });

    it('Renderer APIにエージェントフォルダ削除メソッドが存在する', async () => {
      const hasDeleteAgentFolderAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.deleteAgentFolder === 'function';
      });
      expect(hasDeleteAgentFolderAPI).toBe(true);
    });
  });

  // ============================================================
  // CLAUDE.md Install API（統合インストーラーに統合済み）
  // Note: 個別のCLAUDE.mdインストールダイアログは削除されましたが、
  //       installClaudeMd APIは他の機能から使用される可能性があるため維持
  // ============================================================
  describe('CLAUDE.md Install API', () => {
    it('Renderer APIにCLAUDE.mdインストールメソッドが存在する', async () => {
      const hasClaudeMdAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installClaudeMd === 'function';
      });
      expect(hasClaudeMdAPI).toBe(true);
    });

    it('Renderer APIにCLAUDE.md存在確認メソッドが存在する', async () => {
      const hasCheckClaudeMdAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.checkClaudeMdExists === 'function';
      });
      expect(hasCheckClaudeMdAPI).toBe(true);
    });
  });

  // ============================================================
  // メニュー関連IPC
  // ============================================================
  describe('メニュー関連IPC', () => {
    it('メニューからCLIインストールイベントを受信できる', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallCliCommand === 'function';
      });
      expect(hasMenuListener).toBe(true);
    });

    it('メニューからコマンドセットインストールイベントを受信できる', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallCommandset === 'function';
      });
      expect(hasMenuListener).toBe(true);
    });

    // Note: 以下のメニューイベントはPhase 2で削除されました:
    // - onMenuInstallClaudeMd → 統合インストーラーに統合
    // - onMenuForceReinstall → 統合インストーラーに統合
    // - onMenuAddShellPermissions → 統合インストーラーに統合
    // - onMenuInstallCcSddWorkflow → 統合インストーラーに統合
  });

  // ============================================================
  // パーミッション関連API
  // Note: 個別メニュー項目は削除されましたが、APIは統合インストーラーから使用されます
  // ============================================================
  describe('パーミッション関連API', () => {
    it('Renderer APIにシェルパーミッション追加メソッドが存在する', async () => {
      const hasAddShellPermissionsAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.addShellPermissions === 'function';
      });
      expect(hasAddShellPermissionsAPI).toBe(true);
    });

    it('Renderer APIに必要パーミッション確認メソッドが存在する', async () => {
      const hasCheckRequiredPermissionsAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.checkRequiredPermissions === 'function';
      });
      expect(hasCheckRequiredPermissionsAPI).toBe(true);
    });
  });

  // ============================================================
  // cc-sdd Workflow API
  // Note: 個別メニュー項目は削除されましたが、APIは維持されています
  // ============================================================
  describe('cc-sdd Workflow API', () => {
    it('Renderer APIにcc-sddワークフローインストールメソッドが存在する', async () => {
      const hasCcSddWorkflowAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installCcSddWorkflow === 'function';
      });
      expect(hasCcSddWorkflowAPI).toBe(true);
    });

    it('Renderer APIにcc-sddワークフローステータス確認メソッドが存在する', async () => {
      const hasCheckCcSddWorkflowStatusAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.checkCcSddWorkflowStatus === 'function';
      });
      expect(hasCheckCcSddWorkflowStatusAPI).toBe(true);
    });
  });

  // Note: セキュリティ設定・安定性テストは app-launch.spec.ts に統合
});
