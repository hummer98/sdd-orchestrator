/**
 * Electron SDD Manager E2Eテスト
 * WebdriverIO + wdio-electron-service
 */

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

  it('ウィンドウタイトルが設定されている', async () => {
    const title = await browser.getTitle();
    expect(title).toBeTruthy();
  });
});

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

describe('ウィンドウ動作', () => {
  it('ウィンドウの最小サイズが設定されている', async () => {
    const minSize = await browser.electron.execute((electron) => {
      const windows = electron.BrowserWindow.getAllWindows();
      if (windows.length === 0) return [0, 0];
      return windows[0].getMinimumSize();
    });
    expect(minSize[0]).toBeGreaterThanOrEqual(800);
    expect(minSize[1]).toBeGreaterThanOrEqual(600);
  });

  it('ウィンドウのリサイズが可能', async () => {
    const isResizable = await browser.electron.execute((electron) => {
      const windows = electron.BrowserWindow.getAllWindows();
      if (windows.length === 0) return false;
      return windows[0].isResizable();
    });
    expect(isResizable).toBe(true);
  });

  it('アプリケーションメニューが存在する', async () => {
    const hasMenu = await browser.electron.execute((electron) => {
      const menu = electron.Menu.getApplicationMenu();
      return menu !== null;
    });
    expect(hasMenu).toBe(true);
  });

  it('アプリケーションはビルド済みバイナリで実行されている', async () => {
    // appBinaryPathを使用してビルド済みアプリをテストしているため
    // app.isPackagedはtrueになる
    const isPackaged = await browser.electron.execute((electron) => {
      return electron.app.isPackaged;
    });
    expect(isPackaged).toBe(true);
  });
});
