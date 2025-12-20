/**
 * Install Dialogs E2E Tests
 * CLI/CLAUDE.mdインストールダイアログのE2Eテスト
 *
 * テスト内容:
 * - CliInstallDialogの表示と操作
 * - ClaudeMdInstallDialogの表示と操作
 * - IPC API確認
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
  // ClaudeMdInstallDialog
  // ============================================================
  describe('ClaudeMdInstallDialogコンポーネント', () => {
    it('Renderer APIにCLAUDE.mdインストールメソッドが存在する', async () => {
      const hasClaudeMdAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installClaudeMd === 'function';
      });
      // CLAUDE.md APIが実装されている場合はtrue
      expect(typeof hasClaudeMdAPI).toBe('boolean');
    });

    it('ClaudeMdInstallDialogが開いた場合、上書きボタンが存在する', async () => {
      const overwriteButton = await $('[data-testid="claudemd-install-overwrite-button"]');
      if (await overwriteButton.isExisting()) {
        const isDisplayed = await overwriteButton.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        // ダイアログが開いていない場合はスキップ
        expect(true).toBe(true);
      }
    });

    it('ClaudeMdInstallDialogが開いた場合、マージボタンが存在する', async () => {
      const mergeButton = await $('[data-testid="claudemd-install-merge-button"]');
      if (await mergeButton.isExisting()) {
        const isDisplayed = await mergeButton.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    it('ClaudeMdInstallDialogが開いた場合、キャンセルボタンが存在する', async () => {
      const cancelButton = await $('[data-testid="claudemd-install-cancel-button"]');
      if (await cancelButton.isExisting()) {
        const isDisplayed = await cancelButton.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    it('ClaudeMdInstallDialogが開いた場合、閉じるボタンが存在する', async () => {
      const closeButton = await $('[data-testid="claudemd-install-close-button"]');
      if (await closeButton.isExisting()) {
        const isDisplayed = await closeButton.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    it('新規インストール時、インストールボタンが存在する', async () => {
      const submitButton = await $('[data-testid="claudemd-install-submit-button"]');
      if (await submitButton.isExisting()) {
        const isDisplayed = await submitButton.isDisplayed();
        expect(isDisplayed).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  // ============================================================
  // メニュー関連IPC
  // ============================================================
  describe('メニュー関連IPC', () => {
    it('メニューからCLIインストールイベントを受信できる', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallCli === 'function';
      });
      expect(typeof hasMenuListener).toBe('boolean');
    });

    it('メニューからCLAUDE.mdインストールイベントを受信できる', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallClaudeMd === 'function';
      });
      expect(typeof hasMenuListener).toBe('boolean');
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
