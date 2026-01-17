/**
 * Application Menu Manager
 * Requirements: 11.6, 11.7
 */

import { Menu, MenuItem, app, BrowserWindow, dialog } from 'electron';
import { basename } from 'path';
import { getConfigStore } from './services/configStore';
import { IPC_CHANNELS } from './ipc/channels';
import { createWindow } from './index';

// Current project path for menu state management
let currentProjectPathForMenu: string | null = null;

// Current command prefix for menu state management
type CommandPrefix = 'kiro' | 'spec-manager';
let currentCommandPrefix: CommandPrefix = 'kiro';

// Remote access server state for menu state management
let isRemoteServerRunning = false;

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
      let window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

      // If no window exists, create one first
      if (!window) {
        createWindow();
        // Get the newly created window
        window = BrowserWindow.getAllWindows()[0];
      }

      if (window) {
        // Wait for window to be ready before sending event
        if (window.webContents.isLoading()) {
          window.webContents.once('did-finish-load', () => {
            window!.webContents.send(IPC_CHANNELS.MENU_OPEN_PROJECT, projectPath);
          });
        } else {
          window.webContents.send(IPC_CHANNELS.MENU_OPEN_PROJECT, projectPath);
        }
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
  const appName = app.name; // Will be "SDD Orchestrator (dev)" in dev mode
  const template: (Electron.MenuItemConstructorOptions | MenuItem)[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: appName,
            submenu: [
              { role: 'about' as const, label: `${appName}について` },
              { type: 'separator' as const },
              { role: 'services' as const, label: 'サービス' },
              { type: 'separator' as const },
              { role: 'hide' as const, label: `${appName}を隠す` },
              { role: 'hideOthers' as const, label: '他を隠す' },
              { role: 'unhide' as const, label: 'すべてを表示' },
              { type: 'separator' as const },
              { role: 'quit' as const, label: `${appName}を終了` },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'ファイル',
      submenu: [
        {
          label: '新しいウィンドウ',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            // Create a new window via createWindow()
            createWindow();
          },
        },
        { type: 'separator' as const },
        {
          label: 'プロジェクトを開く...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            let window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

            // If no window exists, create one first
            if (!window) {
              createWindow();
              window = BrowserWindow.getAllWindows()[0];
            }

            if (window) {
              const result = await dialog.showOpenDialog(window, {
                properties: ['openDirectory'],
                title: 'プロジェクトディレクトリを選択',
              });

              if (!result.canceled && result.filePaths.length > 0) {
                // Wait for window to be ready before sending event
                if (window.webContents.isLoading()) {
                  window.webContents.once('did-finish-load', () => {
                    window!.webContents.send(IPC_CHANNELS.MENU_OPEN_PROJECT, result.filePaths[0]);
                  });
                } else {
                  window.webContents.send(IPC_CHANNELS.MENU_OPEN_PROJECT, result.filePaths[0]);
                }
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
        { type: 'separator' as const },
        {
          label: 'レイアウトをリセット',
          enabled: currentProjectPathForMenu !== null,
          click: () => {
            const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (window) {
              window.webContents.send(IPC_CHANNELS.MENU_RESET_LAYOUT);
            }
          },
        },
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

    // Tools menu
    {
      label: 'ツール',
      submenu: [
        {
          label: isRemoteServerRunning ? 'リモートアクセスサーバーを停止' : 'リモートアクセスサーバーを起動',
          enabled: currentProjectPathForMenu !== null || isRemoteServerRunning, // Allow stopping even without project
          click: () => {
            const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (window) {
              window.webContents.send(IPC_CHANNELS.MENU_TOGGLE_REMOTE_SERVER);
            }
          },
        },
        { type: 'separator' as const },
        {
          label: 'コマンドプレフィックス',
          submenu: [
            {
              label: '/kiro:spec-*',
              type: 'radio' as const,
              checked: currentCommandPrefix === 'kiro',
              click: () => {
                const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
                if (window) {
                  window.webContents.send(IPC_CHANNELS.MENU_SET_COMMAND_PREFIX, 'kiro');
                }
              },
            },
            {
              label: '/spec-manager:*',
              type: 'radio' as const,
              checked: currentCommandPrefix === 'spec-manager',
              click: () => {
                const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
                if (window) {
                  window.webContents.send(IPC_CHANNELS.MENU_SET_COMMAND_PREFIX, 'spec-manager');
                }
              },
            },
          ],
        },
        { type: 'separator' as const },
        {
          label: 'コマンドセットをインストール...',
          enabled: currentProjectPathForMenu !== null,
          click: () => {
            const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (!window) return;

            window.webContents.send(IPC_CHANNELS.MENU_INSTALL_COMMANDSET);
          },
        },
        { type: 'separator' as const },
        {
          label: 'sdd CLIコマンドをインストール...',
          click: async () => {
            const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (!window) return;

            window.webContents.send(IPC_CHANNELS.MENU_INSTALL_CLI_COMMAND);
          },
        },
        { type: 'separator' as const },
        {
          label: '実験的ツール',
          submenu: [
            {
              label: 'Debugエージェントをインストール (実験的)',
              enabled: currentProjectPathForMenu !== null,
              click: () => {
                const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
                if (window) {
                  window.webContents.send(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_DEBUG);
                }
              },
            },
            // gemini-document-review Task 3.3: Gemini document-review install menu item
            // Requirements: 1.1, 1.7, 1.8
            {
              label: 'Gemini document-review をインストール (実験的)',
              enabled: currentProjectPathForMenu !== null,
              click: () => {
                const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
                if (window) {
                  window.webContents.send(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW);
                }
              },
            },
            // Note: Commit command is now auto-installed on project selection
            // It's no longer an experimental tool but a core command for the deploy phase
          ],
        },
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
            shell.openExternal('https://github.com/hummer98/sdd-orchestrator');
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

/**
 * Set current project path for menu state management
 * Call this when a project is selected or deselected
 * @param projectPath - Project path or null if no project selected
 */
export function setMenuProjectPath(projectPath: string | null): void {
  currentProjectPathForMenu = projectPath;
  createMenu(); // Rebuild menu to update enabled states
}

/**
 * Set current command prefix for menu state management
 * Call this when command prefix setting changes
 * @param prefix - Command prefix ('kiro' or 'spec-manager')
 */
export function setMenuCommandPrefix(prefix: CommandPrefix): void {
  currentCommandPrefix = prefix;
  createMenu(); // Rebuild menu to update radio button states
}

/**
 * Set remote access server running status for menu state management
 * Call this when server status changes
 * @param isRunning - Whether the server is currently running
 */
export function setMenuRemoteServerStatus(isRunning: boolean): void {
  isRemoteServerRunning = isRunning;
  createMenu(); // Rebuild menu to update label
}

/**
 * Update window title with project name
 * Requirements: 1.3 (sidebar-refactor) - Display current project name in window title
 * @param projectName - Project name or null for default title
 */
export function updateWindowTitle(projectName: string | null): void {
  const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!window) {
    return;
  }

  const isDev = !app.isPackaged;
  const baseTitle = isDev ? 'SDD Orchestrator (dev)' : 'SDD Orchestrator';
  const title = projectName ? `${baseTitle} - ${projectName}` : baseTitle;

  window.setTitle(title);
}
