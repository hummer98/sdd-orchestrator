import '@testing-library/jest-dom';
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
}));

// Mock main bug worktree handlers
vi.mock('../main/ipc/bugWorktreeHandlers', () => ({
  registerBugWorktreeHandlers: vi.fn(),
}));

// Mock main convert worktree handlers
vi.mock('../main/ipc/convertWorktreeHandlers', () => ({
  registerConvertWorktreeHandlers: vi.fn(),
}));

// Mock main menu - removed to avoid conflicts with menu.test.ts
// Individual test files should mock menu functions if needed

// Mock electron module for main process tests
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

// Mock localStorage for Zustand persist middleware
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.electronAPI for renderer tests
const mockElectronAPI = {
  showOpenDialog: vi.fn(),
  validateKiroDirectory: vi.fn(),
  readSpecs: vi.fn(),
  readSpecJson: vi.fn(),
  readArtifact: vi.fn(),
  createSpec: vi.fn(),
  writeFile: vi.fn(),
  updateApproval: vi.fn(),
  executeCommand: vi.fn(),
  cancelExecution: vi.fn(),
  onCommandOutput: vi.fn(() => vi.fn()),
  getRecentProjects: vi.fn(),
  addRecentProject: vi.fn(),
  getAppVersion: vi.fn(),
  getPlatform: vi.fn(() => 'darwin'),
  // Project/Spec Management APIs
  setProjectPath: vi.fn().mockResolvedValue(undefined),
  watchSpecs: vi.fn().mockResolvedValue(undefined),
  unwatchSpecs: vi.fn().mockResolvedValue(undefined),
  startSpecsWatcher: vi.fn().mockResolvedValue(undefined),
  stopSpecsWatcher: vi.fn().mockResolvedValue(undefined),
  onSpecsChanged: vi.fn(() => vi.fn()),
  executeSpecManagerPhase: vi.fn(),
  // execute-method-unification: Unified execute API
  execute: vi.fn().mockResolvedValue(undefined),
  executeValidation: vi.fn().mockResolvedValue(undefined),
  // Agent Management APIs (Task 29)
  startAgent: vi.fn(),
  stopAgent: vi.fn(),
  resumeAgent: vi.fn(),
  getAgents: vi.fn(),
  getAllAgents: vi.fn(),
  getAgentLogs: vi.fn().mockResolvedValue([]),
  sendAgentInput: vi.fn(),
  onAgentOutput: vi.fn(() => vi.fn()),
  onAgentStatusChange: vi.fn(() => vi.fn()),
  onAgentRecordChanged: vi.fn(() => vi.fn()),
  getHangThreshold: vi.fn(),
  setHangThreshold: vi.fn(),
  // Phase/Review Sync APIs
  syncSpecPhase: vi.fn(),
  syncDocumentReview: vi.fn().mockResolvedValue(false),
  // Agent Watcher APIs (bugs-agent-list-not-updating bug fix)
  switchAgentWatchScope: vi.fn().mockResolvedValue(undefined),
  // Missing APIs found during test
  getRunningAgentCounts: vi.fn().mockResolvedValue({ projectCount: 0, specCount: 0, bugCount: 0 }),
  onBugsChanged: vi.fn(() => vi.fn()),
  startBugsWatcher: vi.fn().mockResolvedValue(undefined),
  stopBugsWatcher: vi.fn().mockResolvedValue(undefined),
  readBugs: vi.fn().mockResolvedValue([]),
  readBugJson: vi.fn().mockResolvedValue({}),
  // parallel-task-impl: Task 10.1 - Parse tasks.md for parallel execution
  parseTasksForParallel: vi.fn().mockResolvedValue(null),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
