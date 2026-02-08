/**
 * Setup file for main/ tests (node environment)
 *
 * Main process tests don't need jsdom, localStorage, or window.electronAPI.
 * Only electron module mock and IPC handler mocks are needed.
 */
import { vi } from 'vitest';

// Mock main IPC handlers to prevent index.ts execution errors
vi.mock('../main/ipc/handlers', () => ({
  registerIpcHandlers: vi.fn(),
  setProjectPath: vi.fn(),
  setInitialProjectPath: vi.fn(),
  getCurrentProjectPath: vi.fn(() => null),
}));

// Mock main remote access handlers
vi.mock('../main/ipc/remoteAccessHandlers', () => ({
  registerRemoteAccessHandlers: vi.fn(),
  setupStatusNotifications: vi.fn(),
  getRemoteAccessServer: vi.fn(),
  setupStateProvider: vi.fn(),
  setupWorkflowController: vi.fn(),
  setupAgentLogsProvider: vi.fn(),
  setupSpecDetailProvider: vi.fn(),
  setupBugDetailProvider: vi.fn(),
  setupFileService: vi.fn(),
}));

// Mock main SSH handlers
vi.mock('../main/ipc/sshHandlers', () => ({
  registerSSHHandlers: vi.fn(),
  setupSSHStatusNotifications: vi.fn(),
}));

// Mock main worktree handlers
vi.mock('../main/ipc/worktreeHandlers', () => ({
  registerWorktreeHandlers: vi.fn(),
  handleWorktreeRebaseFromMain: vi.fn(),
}));

// Mock main bug worktree handlers
vi.mock('../main/ipc/bugWorktreeHandlers', () => ({
  registerBugWorktreeHandlers: vi.fn(),
}));

// Mock main convert worktree handlers
vi.mock('../main/ipc/convertWorktreeHandlers', () => ({
  registerConvertWorktreeHandlers: vi.fn(),
}));

// Mock electron module
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    name: 'SDD Orchestrator',
    getPath: vi.fn((name: string) => {
      if (name === 'logs') return '/tmp/test-logs';
      if (name === 'userData') return '/tmp/test-userData';
      return `/tmp/test-${name}`;
    }),
    getName: vi.fn(() => 'SDD Orchestrator'),
    setName: vi.fn(),
    getVersion: vi.fn(() => '0.0.0-test'),
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    commandLine: {
      getSwitchValue: vi.fn(() => ''),
      hasSwitch: vi.fn(() => false),
      appendSwitch: vi.fn(),
    },
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      openDevTools: vi.fn(),
    },
  })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
    openPath: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
  Menu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn(),
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    themeSource: 'system',
    on: vi.fn(),
  },
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
