/**
 * initializeTRPCHandler unit tests
 * multi-window-integration Task 2.2 / 2.4
 * Requirements: 3.1
 *
 * Verifies:
 * - initializeTRPCHandler creates IPCHandler once
 * - IPCHandler instance is stored on WindowManager
 * - createContext uses createWindowContextFactory
 * - Subsequent calls do NOT create new IPCHandler (attaches window instead)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron-trpc/main
const mockCreateIPCHandler = vi.fn();
vi.mock('electron-trpc/main', () => ({
  createIPCHandler: (...args: any[]) => mockCreateIPCHandler(...args),
}));

// Mock projectLogger
vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock productionServices
vi.mock('../productionServices', () => ({
  createProductionServices: vi.fn(() => ({
    fileService: null,
    configStore: null,
  })),
}));

// Mock globalEventBus
vi.mock('../services/globalEventBus', () => ({
  getGlobalEventBus: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}));

// Mock projectState
vi.mock('../helpers/projectState', () => ({
  getInitialSelectResult: vi.fn(() => null),
  clearInitialSelectResult: vi.fn(),
}));

describe('initializeTRPCHandler', () => {
  let initializeTRPCHandler: typeof import('../handler').initializeTRPCHandler;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock IPCHandler instance returned by createIPCHandler
    const mockIPCHandlerInstance = {
      attachWindow: vi.fn(),
      detachWindow: vi.fn(),
    };
    mockCreateIPCHandler.mockReturnValue(mockIPCHandlerInstance);

    // Reset module cache to get fresh imports
    vi.resetModules();

    const module = await import('../handler');
    initializeTRPCHandler = module.initializeTRPCHandler;
  });

  it('should be exported as a function', () => {
    expect(typeof initializeTRPCHandler).toBe('function');
  });

  it('should call createIPCHandler exactly once on first invocation', () => {
    const mockWindowManager = {
      getIPCHandler: vi.fn(() => null),
      setIPCHandler: vi.fn(),
      getWindowIdByWebContents: vi.fn(),
      getWindowContext: vi.fn(),
      getFocusedWindowId: vi.fn(),
      getWindowProject: vi.fn(),
      getWindowServices: vi.fn(),
    };

    const mockWindow = { id: 1, webContents: { id: 101 } } as any;

    initializeTRPCHandler(mockWindowManager as any, mockWindow);

    expect(mockCreateIPCHandler).toHaveBeenCalledTimes(1);
  });

  it('should pass createContext function to createIPCHandler', () => {
    const mockWindowManager = {
      getIPCHandler: vi.fn(() => null),
      setIPCHandler: vi.fn(),
      getWindowIdByWebContents: vi.fn(),
      getWindowContext: vi.fn(),
      getFocusedWindowId: vi.fn(),
      getWindowProject: vi.fn(),
      getWindowServices: vi.fn(),
    };

    const mockWindow = { id: 1, webContents: { id: 101 } } as any;

    initializeTRPCHandler(mockWindowManager as any, mockWindow);

    const callArgs = mockCreateIPCHandler.mock.calls[0][0];
    expect(callArgs).toHaveProperty('createContext');
    expect(typeof callArgs.createContext).toBe('function');
    expect(callArgs).toHaveProperty('router');
    expect(callArgs).toHaveProperty('windows');
    expect(callArgs.windows).toEqual([mockWindow]);
  });

  it('should store IPCHandler on WindowManager via setIPCHandler', () => {
    const mockIPCHandlerInstance = {
      attachWindow: vi.fn(),
      detachWindow: vi.fn(),
    };
    mockCreateIPCHandler.mockReturnValue(mockIPCHandlerInstance);

    const mockWindowManager = {
      getIPCHandler: vi.fn(() => null),
      setIPCHandler: vi.fn(),
      getWindowIdByWebContents: vi.fn(),
      getWindowContext: vi.fn(),
      getFocusedWindowId: vi.fn(),
      getWindowProject: vi.fn(),
      getWindowServices: vi.fn(),
    };

    const mockWindow = { id: 1, webContents: { id: 101 } } as any;

    initializeTRPCHandler(mockWindowManager as any, mockWindow);

    expect(mockWindowManager.setIPCHandler).toHaveBeenCalledWith(mockIPCHandlerInstance);
  });

  it('should NOT call createIPCHandler if IPCHandler already exists (attach window instead)', () => {
    const mockExistingHandler = {
      attachWindow: vi.fn(),
      detachWindow: vi.fn(),
    };

    const mockWindowManager = {
      getIPCHandler: vi.fn(() => mockExistingHandler),
      setIPCHandler: vi.fn(),
      getWindowIdByWebContents: vi.fn(),
      getWindowContext: vi.fn(),
      getFocusedWindowId: vi.fn(),
      getWindowProject: vi.fn(),
      getWindowServices: vi.fn(),
    };

    const mockWindow = { id: 2, webContents: { id: 102 } } as any;

    initializeTRPCHandler(mockWindowManager as any, mockWindow);

    // createIPCHandler should NOT be called
    expect(mockCreateIPCHandler).not.toHaveBeenCalled();
    // Instead, attachWindow should be called on the existing handler
    expect(mockExistingHandler.attachWindow).toHaveBeenCalledWith(mockWindow);
  });
});
