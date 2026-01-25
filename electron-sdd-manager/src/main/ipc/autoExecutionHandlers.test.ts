/**
 * AutoExecutionHandlers Test
 * TDD tests for auto-execution IPC handlers
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { AutoExecutionCoordinator } from '../services/autoExecutionCoordinator';
import { registerAutoExecutionHandlers, unregisterAutoExecutionHandlers } from './autoExecutionHandlers';
import { IPC_CHANNELS } from './channels';

// Mock electron (needs app for logger)
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'test-app'),
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    getFocusedWindow: vi.fn(() => null),
  },
}));

// Mock FileService for resolveSpecPath
vi.mock('../services/fileService', () => ({
  FileService: vi.fn().mockImplementation(() => ({
    resolveSpecPath: vi.fn().mockImplementation((_projectPath: string, specName: string) => {
      // Return the specName as-is for test purposes (assuming it's already a full path in tests)
      return Promise.resolve({ ok: true, value: specName });
    }),
  })),
}));

describe('autoExecutionHandlers', () => {
  let coordinator: AutoExecutionCoordinator;
  let mockHandlers: Map<string, Function>;

  beforeEach(() => {
    coordinator = new AutoExecutionCoordinator();
    mockHandlers = new Map();

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });
  });

  afterEach(() => {
    coordinator.dispose();
    vi.clearAllMocks();
    mockHandlers.clear();
  });

  describe('registerAutoExecutionHandlers()', () => {
    it('should register all auto-execution IPC handlers', () => {
      registerAutoExecutionHandlers(coordinator);

      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_EXECUTION_START,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_EXECUTION_STOP,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_EXECUTION_STATUS,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS,
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM,
        expect.any(Function)
      );
    });
  });

  describe('unregisterAutoExecutionHandlers()', () => {
    it('should unregister all auto-execution IPC handlers', () => {
      registerAutoExecutionHandlers(coordinator);
      unregisterAutoExecutionHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_EXECUTION_START);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_EXECUTION_STOP);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_EXECUTION_STATUS);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM);
    });
  });

  describe('AUTO_EXECUTION_START handler', () => {
    it('should call coordinator.start with correct parameters', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);

      const params = {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      };

      const result = await handler({}, params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.specPath).toBe('/test/spec');
        expect(result.value.status).toBe('running');
      }
    });

    it('should return error when already executing', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);

      const params = {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      };

      // First call should succeed
      await handler({}, params);
      // Second call should fail
      const result = await handler({}, params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_EXECUTING');
      }
    });
  });

  describe('AUTO_EXECUTION_STOP handler', () => {
    it('should call coordinator.stop with correct parameters', async () => {
      registerAutoExecutionHandlers(coordinator);
      const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
      const stopHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STOP);

      // Start first
      await startHandler({}, {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      });

      // Then stop
      const result = await stopHandler({}, { specPath: '/test/spec' });

      expect(result.ok).toBe(true);
    });

    it('should return error when not executing', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STOP);

      const result = await handler({}, { specPath: '/non-existent/spec' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_EXECUTING');
      }
    });
  });

  describe('AUTO_EXECUTION_STATUS handler', () => {
    it('should return status for existing spec', async () => {
      registerAutoExecutionHandlers(coordinator);
      const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
      const statusHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STATUS);

      await startHandler({}, {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      });

      const result = await statusHandler({}, { specPath: '/test/spec' });

      expect(result).not.toBeNull();
      expect(result?.specPath).toBe('/test/spec');
      expect(result?.status).toBe('running');
    });

    it('should return null for non-existent spec', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STATUS);

      const result = await handler({}, { specPath: '/non-existent/spec' });

      expect(result).toBeNull();
    });
  });

  describe('AUTO_EXECUTION_ALL_STATUS handler', () => {
    it('should return all statuses', async () => {
      registerAutoExecutionHandlers(coordinator);
      const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
      const allStatusHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS);

      await startHandler({}, {
        projectPath: '/test/project',
        specPath: '/spec/1',
        specId: 'spec-1',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      });

      await startHandler({}, {
        projectPath: '/test/project',
        specPath: '/spec/2',
        specId: 'spec-2',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      });

      const result = await allStatusHandler({});

      expect(Object.keys(result).length).toBe(2);
      expect(result['/spec/1']).toBeDefined();
      expect(result['/spec/2']).toBeDefined();
    });
  });

  describe('AUTO_EXECUTION_RETRY_FROM handler', () => {
    it('should retry from specified phase', async () => {
      registerAutoExecutionHandlers(coordinator);
      const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
      const stopHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STOP);
      const retryHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM);

      await startHandler({}, {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      });

      await stopHandler({}, { specPath: '/test/spec' });

      const result = await retryHandler({}, { specPath: '/test/spec', phase: 'design' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        expect(result.value.currentPhase).toBe('design');
      }
    });
  });

  // ============================================================
  // Task 3.1: StartParams includes projectPath
  // Requirements: 3.1, 3.3 (auto-execution-projectpath-fix)
  // ============================================================

  describe('Task 3.1: StartParams with projectPath', () => {
    it('should pass params.projectPath to coordinator.start()', async () => {
      const coordinatorSpy = vi.spyOn(coordinator, 'start');
      registerAutoExecutionHandlers(coordinator);

      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);

      // StartParams with projectPath field
      const params = {
        projectPath: '/explicit/project/path',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      };

      await handler({}, params);

      // Verify coordinator.start() was called with params.projectPath (not getCurrentProjectPath)
      expect(coordinatorSpy).toHaveBeenCalledWith(
        '/explicit/project/path',  // should use params.projectPath
        '/test/spec',
        'test-feature',
        expect.objectContaining({
          permissions: { requirements: true, design: true, tasks: true, impl: false },
        })
      );

      coordinatorSpy.mockRestore();
    });

    it('should return PRECONDITION_FAILED if projectPath is missing', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);

      // StartParams without projectPath
      const params = {
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      };

      const result = await handler({}, params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PRECONDITION_FAILED');
        expect(result.error.message).toContain('projectPath');
      }
    });
  });

  // ============================================================
  // Task 8.1: IPC Channel Name Backward Compatibility
  // Requirements: 9.1
  // ============================================================

  describe('Task 8.1: IPC Channel Backward Compatibility', () => {
    it('should have all required channel names defined', () => {
      // Verify channel names are defined and consistent
      expect(IPC_CHANNELS.AUTO_EXECUTION_START).toBeDefined();
      expect(IPC_CHANNELS.AUTO_EXECUTION_STOP).toBeDefined();
      expect(IPC_CHANNELS.AUTO_EXECUTION_STATUS).toBeDefined();
      expect(IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS).toBeDefined();
      expect(IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM).toBeDefined();
    });

    it('should use consistent channel naming convention', () => {
      // All auto-execution channels should start with 'auto-execution:'
      expect(IPC_CHANNELS.AUTO_EXECUTION_START).toMatch(/^auto-execution:/);
      expect(IPC_CHANNELS.AUTO_EXECUTION_STOP).toMatch(/^auto-execution:/);
      expect(IPC_CHANNELS.AUTO_EXECUTION_STATUS).toMatch(/^auto-execution:/);
      expect(IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS).toMatch(/^auto-execution:/);
      expect(IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM).toMatch(/^auto-execution:/);
    });
  });

  // ============================================================
  // Task 8.2: spec.json Format Compatibility
  // Requirements: 9.2
  // ============================================================

  describe('Task 8.2: spec.json Format Compatibility', () => {
    it('should accept options without optional fields', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);

      // Minimal required options (without timeoutMs, commandPrefix)
      const params = {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: false, tasks: false, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      };

      const result = await handler({}, params);

      expect(result.ok).toBe(true);
    });

    it('should accept options with all optional fields', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);

      // Full options with all optional fields
      const params = {
        projectPath: '/test/project',
        specPath: '/test/spec2',
        specId: 'test-feature2',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: true },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: true, design: true, impl: true },
          timeoutMs: 600000,
          commandPrefix: 'kiro' as const,
        },
      };

      const result = await handler({}, params);

      expect(result.ok).toBe(true);
    });
  });

  // ============================================================
  // Task 8.3: Legacy Client Compatibility Mode
  // Requirements: 9.3
  // ============================================================

  describe('Task 8.3: Legacy Client Compatibility', () => {
    it('should handle requests without version info', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STATUS);

      // Request without any version metadata (legacy client style)
      const result = await handler({}, { specPath: '/test/spec' });

      // Should work without errors
      expect(result).toBeNull(); // No execution running
    });

    it('should return serializable results', async () => {
      registerAutoExecutionHandlers(coordinator);
      const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
      const statusHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STATUS);

      await startHandler({}, {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      });

      const result = await statusHandler({}, { specPath: '/test/spec' });

      // Result should be JSON serializable (no circular refs, no functions)
      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });

  // ============================================================
  // Task 8.4: Log Format Compatibility
  // Requirements: 9.4
  // ============================================================

  describe('Task 8.4: Log Format Compatibility', () => {
    it('should not throw when handlers are called (logging works)', async () => {
      registerAutoExecutionHandlers(coordinator);
      const handler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);

      // Calling handler should not throw due to logging issues
      await expect(handler({}, {
        projectPath: '/test/project',
        specPath: '/test/spec',
        specId: 'test-feature',
        options: {
          permissions: { requirements: true, design: true, tasks: true, impl: false },
          documentReviewFlag: 'run' as const,
          validationOptions: { gap: false, design: false, impl: false },
        },
      })).resolves.toBeDefined();
    });
  });

  // ============================================================
  // Task 11.3: Integration Tests for Inspection Fix
  // Verifies: Critical Issues #1-#4 are resolved
  // ============================================================

  describe('Task 11.3: Integration Verification', () => {
    describe('IPC Channel Registration (Critical Issue #1 fix)', () => {
      it('should register all auto-execution channels via ipcMain.handle', () => {
        registerAutoExecutionHandlers(coordinator);

        // Verify all expected channels are registered
        const registeredChannels = Array.from(mockHandlers.keys());
        expect(registeredChannels).toContain(IPC_CHANNELS.AUTO_EXECUTION_START);
        expect(registeredChannels).toContain(IPC_CHANNELS.AUTO_EXECUTION_STOP);
        expect(registeredChannels).toContain(IPC_CHANNELS.AUTO_EXECUTION_STATUS);
        expect(registeredChannels).toContain(IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS);
        expect(registeredChannels).toContain(IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM);
      });
    });

    describe('Coordinator Instance Sharing (Critical Issue #2 fix)', () => {
      it('should use shared coordinator instance for all handlers', async () => {
        registerAutoExecutionHandlers(coordinator);

        // Start auto-execution via handler
        const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
        await startHandler({}, {
          projectPath: '/test/project',
          specPath: '/shared/test/spec',
          specId: 'shared-test',
          options: {
            permissions: { requirements: true, design: true, tasks: true, impl: false },
            documentReviewFlag: 'run' as const,
            validationOptions: { gap: false, design: false, impl: false },
          },
        });

        // Verify status can be retrieved via the same coordinator
        const statusHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STATUS);
        const status = await statusHandler({}, { specPath: '/shared/test/spec' });

        expect(status).not.toBeNull();
        expect(status?.specPath).toBe('/shared/test/spec');

        // Verify via coordinator directly
        const directStatus = coordinator.getStatus('/shared/test/spec');
        expect(directStatus).not.toBeNull();
        expect(directStatus?.specPath).toBe('/shared/test/spec');
      });
    });

    describe('End-to-end IPC flow (Critical Issue #3 fix)', () => {
      it('should support complete start -> status -> stop -> status flow', async () => {
        registerAutoExecutionHandlers(coordinator);

        const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
        const statusHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STATUS);
        const stopHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_STOP);

        // Step 1: Start
        const startResult = await startHandler({}, {
          projectPath: '/test/project',
          specPath: '/e2e/test/spec',
          specId: 'e2e-test',
          options: {
            permissions: { requirements: true, design: true, tasks: true, impl: false },
            documentReviewFlag: 'run' as const,
            validationOptions: { gap: false, design: false, impl: false },
          },
        });
        expect(startResult.ok).toBe(true);
        expect(startResult.value.status).toBe('running');

        // Step 2: Get status (should be running)
        const statusAfterStart = await statusHandler({}, { specPath: '/e2e/test/spec' });
        expect(statusAfterStart).not.toBeNull();
        expect(statusAfterStart?.status).toBe('running');

        // Step 3: Stop
        const stopResult = await stopHandler({}, { specPath: '/e2e/test/spec' });
        expect(stopResult.ok).toBe(true);

        // Step 4: Get status (should be paused - stop action pauses the execution)
        const statusAfterStop = await statusHandler({}, { specPath: '/e2e/test/spec' });
        expect(statusAfterStop).not.toBeNull();
        expect(statusAfterStop?.status).toBe('paused');
      });
    });

    describe('Handler code is not dead code (Critical Issue #4 fix)', () => {
      it('should have handlers that execute real coordinator methods', async () => {
        // This test verifies that the handler code is actually being called
        // and is not dead code
        const coordinatorSpy = vi.spyOn(coordinator, 'start');
        registerAutoExecutionHandlers(coordinator);

        const startHandler = mockHandlers.get(IPC_CHANNELS.AUTO_EXECUTION_START);
        await startHandler({}, {
          projectPath: '/test/project',
          specPath: '/spy/test/spec',
          specId: 'spy-test',
          options: {
            permissions: { requirements: true, design: false, tasks: false, impl: false },
            documentReviewFlag: 'run' as const,
            validationOptions: { gap: false, design: false, impl: false },
          },
        });

        // Verify the coordinator's start method was actually called
        // auto-execution-projectpath-fix Task 3.1: start() uses params.projectPath
        expect(coordinatorSpy).toHaveBeenCalledWith(
          '/test/project',  // projectPath from params
          '/spy/test/spec',
          'spy-test',
          expect.objectContaining({
            permissions: { requirements: true, design: false, tasks: false, impl: false },
          })
        );

        coordinatorSpy.mockRestore();
      });
    });
  });
});
