/**
 * 共通アプリケーション基本テスト
 *
 * 以下のテストを共通化:
 * - アプリケーション起動
 * - セキュリティ設定
 * - アプリケーション安定性
 *
 * 使用方法:
 * ```typescript
 * import { runAppBasicsTests } from './common/app-basics';
 * runAppBasicsTests();
 * ```
 *
 * または個別に:
 * ```typescript
 * import { runSecurityTests, runStabilityTests } from './common/app-basics';
 * runSecurityTests();
 * runStabilityTests();
 * ```
 */

/**
 * アプリケーション起動テスト
 */
export function runAppLaunchTests(): void {
  describe('アプリケーション起動', () => {
    it('アプリケーションが正常に起動する', async () => {
      const isWindowOpen = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows().length > 0;
      });
      expect(isWindowOpen).toBe(true);
    });

    it('メインウィンドウが表示される', async () => {
      const windowExists = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        // E2Eテスト環境では dock.hide() により isVisible() が false になるため、
        // ウィンドウの存在と破棄されていないことを確認
        return windows.length > 0 && !windows[0].isDestroyed();
      });
      expect(windowExists).toBe(true);
    });
  });
}

/**
 * セキュリティ設定テスト
 */
export function runSecurityTests(): void {
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
}

/**
 * アプリケーション安定性テスト
 */
export function runStabilityTests(): void {
  describe('アプリケーション安定性', () => {
    it('アプリケーションがクラッシュしていない', async () => {
      const isResponsive = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return !windows[0].webContents.isCrashed();
      });
      expect(isResponsive).toBe(true);
    });
  });
}

/**
 * 基本テスト一括実行
 * アプリケーション起動 + セキュリティ + 安定性
 */
export function runAppBasicsTests(): void {
  runAppLaunchTests();
  runSecurityTests();
  runStabilityTests();
}
