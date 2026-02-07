/**
 * Main Process tRPC integration tests
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * Verifies: createIPCHandler is called in main/index.ts
 *
 * Note: We test the setup function in isolation since we cannot
 * start a real Electron process in unit tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron-trpc/main
const mockCreateIPCHandler = vi.fn();
vi.mock('electron-trpc/main', () => ({
  createIPCHandler: mockCreateIPCHandler,
}));

// Mock projectLogger
vi.mock('../../services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('setupTRPCHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export setupTRPCHandler function', async () => {
    const { setupTRPCHandler } = await import('../handler');
    expect(setupTRPCHandler).toBeDefined();
    expect(typeof setupTRPCHandler).toBe('function');
  });

  it('should call createIPCHandler with router, window, and createContext', async () => {
    const { setupTRPCHandler } = await import('../handler');

    // Create a mock BrowserWindow
    const mockWindow = { id: 1, webContents: {} } as unknown as Electron.BrowserWindow;

    setupTRPCHandler(mockWindow);

    expect(mockCreateIPCHandler).toHaveBeenCalledTimes(1);
    expect(mockCreateIPCHandler).toHaveBeenCalledWith({
      router: expect.anything(), // appRouter
      windows: [mockWindow],
      createContext: expect.any(Function),
    });
  });

  it('should log error on failure', async () => {
    const { setupTRPCHandler } = await import('../handler');
    const { projectLogger } = await import('../../services/projectLogger');

    // Make createIPCHandler throw
    mockCreateIPCHandler.mockImplementationOnce(() => {
      throw new Error('IPC setup failed');
    });

    const mockWindow = { id: 1, webContents: {} } as unknown as Electron.BrowserWindow;

    // Should not throw (error is caught internally)
    expect(() => setupTRPCHandler(mockWindow)).not.toThrow();

    // Should log the error
    expect(projectLogger.error).toHaveBeenCalled();
  });
});
