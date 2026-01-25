/**
 * BugAutoExecutionHandlers Tests
 * Verifies IPC communication and data serialization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock objects
const { mockIpcMain, mockIpcHandlers, mockWebContents, mockWindow, mockElectron, mockLogger, mockCoordinatorInstance } = vi.hoisted(() => {
  const mockIpcHandlers = new Map<string, Function>();
  
  const mockWebContents = {
    send: vi.fn(),
  };

  const mockWindow = {
    isDestroyed: vi.fn(() => false),
    webContents: mockWebContents,
  };

  // Shared spies
  const handleSpy = vi.fn((channel, handler) => {
    mockIpcHandlers.set(channel, handler);
  });
  const removeHandlerSpy = vi.fn((channel) => {
    mockIpcHandlers.delete(channel);
  });

  const mockIpcMain = {
    handle: handleSpy,
    removeHandler: removeHandlerSpy,
  };

  // Mock Coordinator class manually to avoid import dependency
  class MockCoordinator {
    listeners = new Map<string, Function[]>();
    
    start = vi.fn();
    stop = vi.fn();
    getStatus = vi.fn();
    getAllStatuses = vi.fn();
    retryFrom = vi.fn();
    resetAll = vi.fn();
    
    // EventEmitter minimal implementation
    on(event: string, fn: Function) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event)!.push(fn);
      return this;
    }
    
    emit(event: string, ...args: any[]) {
      const listeners = this.listeners.get(event) || [];
      listeners.forEach(fn => fn(...args));
      return true;
    }
    
    removeAllListeners() {
      this.listeners.clear();
    }
  }
  
  const mockCoordinatorInstance = new MockCoordinator();

  return {
    mockIpcHandlers,
    mockIpcMain,
    mockWebContents,
    mockWindow,
    mockElectron: {
      ipcMain: mockIpcMain, // Share the same object
      BrowserWindow: {
        getAllWindows: vi.fn(() => [mockWindow]),
      },
    },
    mockLogger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
    mockCoordinatorInstance,
  };
});

// Apply mocks
vi.mock('electron', () => ({
  ...mockElectron,
  default: mockElectron,
}));
vi.mock('../services/logger', () => ({ logger: mockLogger }));
vi.mock('../services/bugAutoExecutionCoordinator', () => ({
  BugAutoExecutionCoordinator: vi.fn(() => mockCoordinatorInstance),
}));

// Import code under test
import {
  registerBugAutoExecutionHandlers,
  unregisterBugAutoExecutionHandlers,
} from './bugAutoExecutionHandlers';
import { IPC_CHANNELS } from './channels';

describe('BugAutoExecutionHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpcHandlers.clear();
    mockCoordinatorInstance.removeAllListeners();
  });

  afterEach(() => {
    unregisterBugAutoExecutionHandlers();
  });

  describe('Registration', () => {
    it('should register all IPC handlers', () => {
      registerBugAutoExecutionHandlers(mockCoordinatorInstance as any);

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_AUTO_EXECUTION_START,
        expect.any(Function)
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_AUTO_EXECUTION_STOP,
        expect.any(Function)
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS,
        expect.any(Function)
      );
    });
  });

  describe('BUG_AUTO_EXECUTION_START Handler', () => {
    it('should pass projectPath to coordinator.start() as the first argument', async () => {
      registerBugAutoExecutionHandlers(mockCoordinatorInstance as any);

      // Mock coordinator.start() to return success
      mockCoordinatorInstance.start.mockResolvedValue({
        ok: true,
        value: {
          projectPath: '/project/path',
          bugPath: '/project/path/.kiro/bugs/test-bug',
          bugName: 'test-bug',
          status: 'running',
          currentPhase: null,
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
          retryCount: 0,
          lastFailedPhase: null,
        },
      });

      // Get the handler
      const handler = mockIpcHandlers.get(IPC_CHANNELS.BUG_AUTO_EXECUTION_START);
      expect(handler).toBeDefined();

      // Call with BugStartParams including projectPath (Requirement 3.2)
      const params = {
        projectPath: '/project/path',
        bugPath: '/project/path/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        options: {
          permissions: {
            analyze: true,
            fix: true,
            verify: true,
            deploy: false,
          },
        },
        lastCompletedPhase: null,
      };

      await handler!({}, params);

      // Verify coordinator.start() was called with projectPath as the first argument
      // Requirement 3.3: IPCハンドラでprojectPath伝播
      expect(mockCoordinatorInstance.start).toHaveBeenCalledWith(
        '/project/path',          // projectPath (first arg)
        '/project/path/.kiro/bugs/test-bug', // bugPath
        'test-bug',               // bugName
        params.options,           // options
        null                      // lastCompletedPhase
      );
    });
  });

  describe('Serialization Logic', () => {
    it('should remove timeoutId from state before sending', async () => {
      registerBugAutoExecutionHandlers(mockCoordinatorInstance as any);

      // Create a state object with a circular-ish property (simulated timeoutId)
      // Node.js Timeout objects are complex, here we just ensure it's removed
      const mockTimeout = { _idleTimeout: 1000 } as any; 
      const rawState = {
        bugPath: '/test/bug',
        status: 'running',
        timeoutId: mockTimeout, // This should be removed
        currentPhase: 'analysis',
        startTime: 1234567890,
      };

      mockCoordinatorInstance.getStatus.mockReturnValue(rawState);

      // Call the status handler
      const handler = mockIpcHandlers.get(IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS);
      expect(handler).toBeDefined();

      const result = await handler!({}, { bugPath: '/test/bug' });

      // Verify result
      expect(result).toEqual({
        bugPath: '/test/bug',
        status: 'running',
        currentPhase: 'analysis',
        startTime: 1234567890,
      });
      expect(result).not.toHaveProperty('timeoutId');
    });

    it('should handle null state gracefully', async () => {
      registerBugAutoExecutionHandlers(mockCoordinatorInstance as any);
      mockCoordinatorInstance.getStatus.mockReturnValue(null);

      const handler = mockIpcHandlers.get(IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS);
      const result = await handler!({}, { bugPath: '/test/bug' });

      expect(result).toBeNull();
    });
  });

  describe('Event Forwarding', () => {
    it('should forward state-changed events to renderer', () => {
      registerBugAutoExecutionHandlers(mockCoordinatorInstance as any);

      const rawState = {
        bugPath: '/test/bug',
        status: 'completed',
        timeoutId: {},
        currentPhase: 'verification',
      };

      // Emit event from coordinator
      mockCoordinatorInstance.emit('state-changed', '/test/bug', rawState);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS_CHANGED,
        {
          bugPath: '/test/bug',
          state: expect.objectContaining({
            status: 'completed',
            currentPhase: 'verification',
          }),
        }
      );
      
      // Verify timeoutId was removed in the forwarded event too
      const callArgs = mockWebContents.send.mock.calls[0];
      const payload = callArgs[1];
      expect(payload.state).not.toHaveProperty('timeoutId');
    });

    it('should forward phase-started events', () => {
      registerBugAutoExecutionHandlers(mockCoordinatorInstance as any);

      mockCoordinatorInstance.emit('phase-started', '/test/bug', 'plan', 'agent-123');

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_AUTO_EXECUTION_PHASE_STARTED,
        {
          bugPath: '/test/bug',
          phase: 'plan',
          agentId: 'agent-123',
        }
      );
    });

    it('should forward execute-next-phase events', () => {
      registerBugAutoExecutionHandlers(mockCoordinatorInstance as any);

      mockCoordinatorInstance.emit('execute-next-phase', '/test/bug', 'code', { bugName: 'My Bug' });

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.BUG_AUTO_EXECUTION_EXECUTE_PHASE,
        {
          bugPath: '/test/bug',
          phase: 'code',
          bugName: 'My Bug',
        }
      );
    });
  });
});
