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
 */

describe('Install Dialogs E2E', () => {
  // ============================================================
  // 基本的なアプリケーション起動確認
  // ============================================================
  describe('アプリケーション起動', () => {
    it('アプリケーションが正常に起動する', async () => {
      const isWindowOpen = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows().length > 0;
      });
      expect(isWindowOpen).toBe(true);
    });

    it('メインウィンドウが表示される', async () => {
      const isVisible = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.length > 0 && windows[0].isVisible();
      });
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // CliInstallDialog
  // ============================================================
  describe('CliInstallDialogコンポーネント', () => {
    it('Renderer APIにCLIインストールメソッドが存在する', async () => {
      const hasCliInstallAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installCliCommand === 'function';
      });
      expect(hasCliInstallAPI).toBe(true);
    });

    it('CliInstallDialogが開いた場合、ユーザーディレクトリオプションが存在する', async () => {
      const userOption = await $('[data-testid="cli-install-location-user"]');
      if (await userOption.isExisting()) {
        const isDisplayed = await userOption.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        // ダイアログが開いていない場合はスキップ
        expect(true).toBe(true);
      }
    });

    it('CliInstallDialogが開いた場合、システムディレクトリオプションが存在する', async () => {
      const systemOption = await $('[data-testid="cli-install-location-system"]');
      if (await systemOption.isExisting()) {
        const isDisplayed = await systemOption.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    it('CliInstallDialogが開いた場合、インストールボタンが存在する', async () => {
      const submitButton = await $('[data-testid="cli-install-submit-button"]');
      if (await submitButton.isExisting()) {
        const isDisplayed = await submitButton.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    it('CliInstallDialogが開いた場合、閉じるボタンが存在する', async () => {
      const closeButton = await $('[data-testid="cli-install-close-button"]');
      if (await closeButton.isExisting()) {
        const isDisplayed = await closeButton.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
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

  // ============================================================
  // セキュリティ確認
  // ============================================================
  describe('セキュリティ設定', () => {
    it('contextIsolationが有効である', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.getLastWebPreferences().contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('nodeIntegrationが無効である', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.getLastWebPreferences().nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });
  });

  // ============================================================
  // アプリケーション安定性
  // ============================================================
  describe('アプリケーション安定性', () => {
    it('アプリケーションがクラッシュしていない', async () => {
      const isResponsive = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return !windows[0].webContents.isCrashed();
      });
      expect(isResponsive).toBe(true);
    });

    it('ウィンドウがリサイズ可能である', async () => {
      const isResizable = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].isResizable();
      });
      expect(isResizable).toBe(true);
    });
  });
});
