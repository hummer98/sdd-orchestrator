/**
 * Application Menu Manager
 * Requirements: 11.6, 11.7
 */

import { Menu, MenuItem, app, BrowserWindow, dialog } from 'electron';
import { basename } from 'path';
import { getConfigStore } from './services/configStore';

const isMac = process.platform === 'darwin';

/**
 * Build recent projects submenu from config store
 */
function buildRecentProjectsSubmenu(): Electron.MenuItemConstructorOptions[] {
  const configStore = getConfigStore();
  const recentProjects = configStore.getRecentProjects();

  if (recentProjects.length === 0) {
    return [{ label: '(なし)', enabled: false }];
  }

  const projectItems: Electron.MenuItemConstructorOptions[] = recentProjects.map((projectPath) => ({
    label: basename(projectPath),
    sublabel: projectPath,
    click: () => {
      const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (window) {
        window.webContents.send('menu:open-project', projectPath);
      }
    },
  }));

  // Add separator and clear option
  projectItems.push(
    { type: 'separator' },
    {
      label: '履歴をクリア',
      click: () => {
        const configStore = getConfigStore();
        const projects = configStore.getRecentProjects();
        projects.forEach((p) => configStore.removeRecentProject(p));
        updateMenu();
      },
    }
  );

  return projectItems;
}

export function createMenu(): void {
  const isDev = !app.isPackaged;
  const template: (Electron.MenuItemConstructorOptions | MenuItem)[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const, label: 'SDD Managerについて' },
              { type: 'separator' as const },
              { role: 'services' as const, label: 'サービス' },
              { type: 'separator' as const },
              { role: 'hide' as const, label: 'SDD Managerを隠す' },
              { role: 'hideOthers' as const, label: '他を隠す' },
              { role: 'unhide' as const, label: 'すべてを表示' },
              { type: 'separator' as const },
              { role: 'quit' as const, label: 'SDD Managerを終了' },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'ファイル',
      submenu: [
        {
          label: 'プロジェクトを開く...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              const result = await dialog.showOpenDialog(window, {
                properties: ['openDirectory'],
                title: 'プロジェクトディレクトリを選択',
              });

              if (!result.canceled && result.filePaths.length > 0) {
                window.webContents.send('menu:open-project', result.filePaths[0]);
              }
            }
          },
        },
        { type: 'separator' as const },
        {
          label: '最近のプロジェクト',
          submenu: buildRecentProjectsSubmenu(),
        },
        { type: 'separator' as const },
        isMac
          ? { role: 'close' as const, label: 'ウィンドウを閉じる' }
          : { role: 'quit' as const, label: '終了' },
      ],
    },

    // Edit menu
    {
      label: '編集',
      submenu: [
        { role: 'undo' as const, label: '元に戻す' },
        { role: 'redo' as const, label: 'やり直す' },
        { type: 'separator' as const },
        { role: 'cut' as const, label: '切り取り' },
        { role: 'copy' as const, label: 'コピー' },
        { role: 'paste' as const, label: '貼り付け' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const, label: 'ペーストしてスタイルを合わせる' },
              { role: 'delete' as const, label: '削除' },
              { role: 'selectAll' as const, label: 'すべてを選択' },
            ]
          : [
              { role: 'delete' as const, label: '削除' },
              { type: 'separator' as const },
              { role: 'selectAll' as const, label: 'すべてを選択' },
            ]),
      ],
    },

    // View menu
    {
      label: '表示',
      submenu: [
        { role: 'reload' as const, label: '再読み込み' },
        { role: 'forceReload' as const, label: '強制再読み込み' },
        ...(isDev
          ? [
              { role: 'toggleDevTools' as const, label: '開発者ツール' },
            ]
          : []),
        { type: 'separator' as const },
        { role: 'resetZoom' as const, label: '実際のサイズ' },
        { role: 'zoomIn' as const, label: '拡大' },
        { role: 'zoomOut' as const, label: '縮小' },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const, label: 'フルスクリーン' },
      ],
    },

    // Window menu
    {
      label: 'ウィンドウ',
      submenu: [
        { role: 'minimize' as const, label: '最小化' },
        { role: 'zoom' as const, label: 'ズーム' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: '手前に移動' },
              { type: 'separator' as const },
              { role: 'window' as const, label: 'ウィンドウ' },
            ]
          : [{ role: 'close' as const, label: '閉じる' }]),
      ],
    },

    // Help menu
    {
      role: 'help',
      label: 'ヘルプ',
      submenu: [
        {
          label: 'SDDドキュメント',
          click: async () => {
            const { shell } = await import('electron');
            shell.openExternal('https://github.com/your-repo/sdd-manager');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Update menu (call after recent projects change)
 */
export function updateMenu(): void {
  createMenu();
}
