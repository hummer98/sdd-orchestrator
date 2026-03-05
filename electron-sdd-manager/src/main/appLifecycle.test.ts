/**
 * Application Lifecycle Tests
 * multi-window-integration Task 8.1: Window state save on quit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the agentLifecycleSetup module
const mockWatchdog = {
  stop: vi.fn(),
};
vi.mock('./services/agentLifecycleSetup', () => ({
  getAgentWatchdog: vi.fn(() => mockWatchdog),
}));

// Mock the remoteAccessSetup module
const mockServer = {
  getStatus: vi.fn(() => ({ isRunning: false })),
  stop: vi.fn(),
};
vi.mock('./services/remoteAccessSetup', () => ({
  getRemoteAccessServer: vi.fn(() => mockServer),
}));

// Mock project logger
vi.mock('./services/projectLogger', () => ({
  projectLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock WindowManager
const mockWindowManager = {
  saveAllWindowStates: vi.fn(),
};
vi.mock('./services/windowManager', () => ({
  getWindowManager: vi.fn(() => mockWindowManager),
}));

import { cleanupOnQuit } from './appLifecycle';

describe('cleanupOnQuit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServer.getStatus.mockReturnValue({ isRunning: false });
  });

  // ============================================================
  // multi-window-integration Task 8.1: Window state save on quit
  // ============================================================
  describe('multi-window Task 8.1: Window state persistence on quit', () => {
    it('should call WindowManager.saveAllWindowStates() during cleanup', async () => {
      await cleanupOnQuit();

      expect(mockWindowManager.saveAllWindowStates).toHaveBeenCalledTimes(1);
    });

    it('should save window states before stopping other services', async () => {
      const callOrder: string[] = [];
      mockWindowManager.saveAllWindowStates.mockImplementation(() => {
        callOrder.push('saveAllWindowStates');
      });
      mockWatchdog.stop.mockImplementation(() => {
        callOrder.push('watchdog.stop');
      });

      await cleanupOnQuit();

      // Window states should be saved first (before watchdog and server cleanup)
      expect(callOrder[0]).toBe('saveAllWindowStates');
    });

    it('should continue cleanup even if saveAllWindowStates throws', async () => {
      mockWindowManager.saveAllWindowStates.mockImplementation(() => {
        throw new Error('Config store write failed');
      });

      // Should not throw
      await cleanupOnQuit();

      // Watchdog should still be stopped
      expect(mockWatchdog.stop).toHaveBeenCalled();
    });
  });

  // Existing behavior: stop watchdog and remote server
  describe('existing cleanup behavior', () => {
    it('should stop agent watchdog', async () => {
      await cleanupOnQuit();
      expect(mockWatchdog.stop).toHaveBeenCalled();
    });

    it('should stop remote UI server if running', async () => {
      mockServer.getStatus.mockReturnValue({ isRunning: true });
      await cleanupOnQuit();
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('should not stop remote UI server if not running', async () => {
      mockServer.getStatus.mockReturnValue({ isRunning: false });
      await cleanupOnQuit();
      expect(mockServer.stop).not.toHaveBeenCalled();
    });
  });
});
