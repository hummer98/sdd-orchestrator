import { vi } from 'vitest';

// === Common mocks (both node and jsdom environments) ===

// Legacy IPC handlers removed: all migrated to tRPC routers (trpc-full-migration)

// Mock electron-trpc/main to prevent ESM named import of CJS electron module
// (projectSetup.ts → menu.ts → handler.ts → electron-trpc/main)
vi.mock('electron-trpc/main', () => ({
  createIPCHandler: vi.fn(),
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

// === jsdom-only mocks (renderer, shared, remote-ui, preload) ===
if (typeof window !== 'undefined') {
  // Import jest-dom matchers only in jsdom environment
  await import('@testing-library/jest-dom');

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

  // trpc-full-migration Task 11.4: window.electronAPI mock removed
  // All IPC communication now uses tRPC. Tests should mock tRPC vanillaClient instead.
}

// Global mock for vanillaClient (tRPC proxy client)
// Renderer/shared tests that indirectly call getVanillaClient() need this mock
// to prevent "Could not find electronTRPC global" errors in test environment.
vi.mock('../shared/trpc/vanillaClient', () => {
  const createMockProxy = (): any => {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'query') return vi.fn().mockResolvedValue(undefined);
          if (prop === 'mutate') return vi.fn().mockResolvedValue(undefined);
          if (prop === 'subscribe')
            return vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
          if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
          return createMockProxy();
        },
      },
    );
  };
  return {
    getVanillaClient: vi.fn(() => createMockProxy()),
    setSharedClient: vi.fn(),
    resetVanillaClient: vi.fn(),
  };
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
