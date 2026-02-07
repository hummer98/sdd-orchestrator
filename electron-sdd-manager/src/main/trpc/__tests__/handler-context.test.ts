/**
 * Handler Context integration tests
 * Task 1.1: handler.tsからコンテキストへのサービス渡しを設定する
 * Requirements: 1.1, 1.2, 1.3
 *
 * Verifies:
 * - setupTRPCHandler passes createContext to createIPCHandler
 * - Context factory can receive service overrides
 * - createIPCHandler is called with createContext option
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

describe('setupTRPCHandler - Context Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass createContext to createIPCHandler', async () => {
    const { setupTRPCHandler } = await import('../handler');
    const mockWindow = { id: 1, webContents: {} } as unknown as Electron.BrowserWindow;

    setupTRPCHandler(mockWindow);

    expect(mockCreateIPCHandler).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateIPCHandler.mock.calls[0][0];
    expect(callArgs).toHaveProperty('createContext');
    expect(typeof callArgs.createContext).toBe('function');
  });

  it('should accept service overrides via setupTRPCHandler', async () => {
    const { setupTRPCHandler } = await import('../handler');
    const mockWindow = { id: 1, webContents: {} } as unknown as Electron.BrowserWindow;
    const mockGetCurrentProjectPath = vi.fn().mockReturnValue('/test/path');

    setupTRPCHandler(mockWindow, {
      getCurrentProjectPath: mockGetCurrentProjectPath,
    });

    expect(mockCreateIPCHandler).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateIPCHandler.mock.calls[0][0];
    expect(callArgs).toHaveProperty('createContext');

    // Invoke the createContext factory to verify overrides are passed through
    // createContext is now async (returns Promise<Context>)
    const ctx = await callArgs.createContext();
    expect(ctx.services.getCurrentProjectPath()).toBe('/test/path');
    expect(mockGetCurrentProjectPath).toHaveBeenCalledTimes(1);
  });

  it('should use default services when no overrides provided', async () => {
    const { setupTRPCHandler } = await import('../handler');
    const mockWindow = { id: 1, webContents: {} } as unknown as Electron.BrowserWindow;

    setupTRPCHandler(mockWindow);

    const callArgs = mockCreateIPCHandler.mock.calls[0][0];
    // createContext is now async
    const ctx = await callArgs.createContext();

    // Default services should be available
    expect(ctx.services).toBeDefined();
    expect(ctx.services.getCurrentProjectPath()).toBeNull();
    expect(typeof ctx.services.setProjectPath).toBe('function');
  });
});
