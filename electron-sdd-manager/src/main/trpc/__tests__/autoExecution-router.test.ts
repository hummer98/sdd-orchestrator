/**
 * AutoExecution Router tests
 * Task 7.1: autoExecutionルーターとZodスキーマを実装する
 * Requirements: 6.1, 6.2, 6.3
 * Method: autoExecutionRouter, autoExecutionCoordinator
 * Verify: Grep "autoExecutionRouter" in router.ts
 *
 * Tests all 14 procedures:
 * Spec Auto Execution (8):
 * - start (mutation): Start auto execution for a spec
 * - stop (mutation): Stop auto execution for a spec
 * - getStatus (query): Get status for a spec
 * - getAllStatus (query): Get all execution statuses
 * - retryFrom (mutation): Retry from a specific phase
 * - reset (mutation): Reset all executions (E2E)
 * - setMockEnv (mutation): Set mock env variable (E2E)
 * - resetImplRetry (mutation): Reset impl retry count
 *
 * Bug Auto Execution (6):
 * - bugStart (mutation): Start auto execution for a bug
 * - bugStop (mutation): Stop auto execution for a bug
 * - bugGetStatus (query): Get status for a bug
 * - bugGetAllStatus (query): Get all bug execution statuses
 * - bugRetryFrom (mutation): Retry from a specific bug phase
 * - bugReset (mutation): Reset all bug executions (E2E)
 *
 * All services accessed via ctx.services for testability (DD-006).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

// Mock coordinator types
interface MockAutoExecutionCoordinator {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  getStatus: ReturnType<typeof vi.fn>;
  getAllStatuses: ReturnType<typeof vi.fn>;
  retryFrom: ReturnType<typeof vi.fn>;
  resetAll: ReturnType<typeof vi.fn>;
  resetImplRetryCount: ReturnType<typeof vi.fn>;
}

interface MockBugAutoExecutionCoordinator {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  getStatus: ReturnType<typeof vi.fn>;
  getAllStatuses: ReturnType<typeof vi.fn>;
  retryFrom: ReturnType<typeof vi.fn>;
  resetAll: ReturnType<typeof vi.fn>;
}

function createMockAutoExecutionCoordinator(): MockAutoExecutionCoordinator {
  return {
    start: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        specPath: '/test/.kiro/specs/test',
        specId: 'test',
        status: 'running',
        currentPhase: 'requirements',
        executedPhases: [],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
      },
    }),
    stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getStatus: vi.fn().mockReturnValue(null),
    getAllStatuses: vi.fn().mockReturnValue(new Map()),
    retryFrom: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        specPath: '/test/.kiro/specs/test',
        specId: 'test',
        status: 'running',
        currentPhase: 'design',
        executedPhases: ['requirements'],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
      },
    }),
    resetAll: vi.fn(),
    resetImplRetryCount: vi.fn(),
  };
}

function createMockBugAutoExecutionCoordinator(): MockBugAutoExecutionCoordinator {
  return {
    start: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        bugPath: '/test/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        status: 'running',
        currentPhase: 'analyze',
        executedPhases: [],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
        retryCount: 0,
        lastFailedPhase: null,
      },
    }),
    stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getStatus: vi.fn().mockReturnValue(null),
    getAllStatuses: vi.fn().mockReturnValue(new Map()),
    retryFrom: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        bugPath: '/test/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        status: 'running',
        currentPhase: 'fix',
        executedPhases: ['analyze'],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
        retryCount: 0,
        lastFailedPhase: null,
      },
    }),
    resetAll: vi.fn(),
  };
}

describe('AutoExecution Router', () => {
  let mockServices: ContextServices;
  let mockCoordinator: MockAutoExecutionCoordinator;
  let mockBugCoordinator: MockBugAutoExecutionCoordinator;

  beforeEach(() => {
    mockCoordinator = createMockAutoExecutionCoordinator();
    mockBugCoordinator = createMockBugAutoExecutionCoordinator();
    mockServices = createMockServices({
      autoExecutionCoordinator: mockCoordinator as any,
      bugAutoExecutionCoordinator: mockBugCoordinator as any,
    });
  });

  // ============================================================
  // Spec Auto Execution: start
  // ============================================================

  describe('start', () => {
    it('should start auto execution and return serializable state', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.start({
        projectPath: '/test/project',
        specPath: 'test-spec',
        specId: 'test-spec',
        options: {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: true,
            deploy: false,
          },
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        // timeoutId should be excluded from serialization
        expect('timeoutId' in result.value).toBe(false);
      }
    });

    it('should call coordinator.start with resolved spec path', async () => {
      const caller = createTestCaller(mockServices);
      await caller.autoExecution.start({
        projectPath: '/test/project',
        specPath: 'test-spec',
        specId: 'test-spec',
        options: {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: true,
            deploy: false,
          },
        },
      });

      // Should resolve spec path via fileService
      expect((mockServices.fileService as any).resolveSpecPath).toHaveBeenCalled();
      expect(mockCoordinator.start).toHaveBeenCalled();
    });

    it('should return error when projectPath is empty', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.start({
        projectPath: '',
        specPath: 'test-spec',
        specId: 'test-spec',
        options: {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: true,
            deploy: false,
          },
        },
      })).rejects.toThrow();
    });

    it('should return error when spec path resolution fails', async () => {
      (mockServices.fileService as any).resolveSpecPath = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', message: 'Spec not found' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.start({
        projectPath: '/test/project',
        specPath: 'nonexistent',
        specId: 'nonexistent',
        options: {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: true,
            deploy: false,
          },
        },
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when coordinator is not initialized', async () => {
      mockServices.autoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.start({
        projectPath: '/test/project',
        specPath: 'test-spec',
        specId: 'test-spec',
        options: {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: true,
            deploy: false,
          },
        },
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // Spec Auto Execution: stop
  // ============================================================

  describe('stop', () => {
    it('should stop auto execution', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.stop({ specPath: '/test/.kiro/specs/test' });

      expect(result.ok).toBe(true);
      expect(mockCoordinator.stop).toHaveBeenCalledWith('/test/.kiro/specs/test');
    });

    it('should return error result when stop fails', async () => {
      mockCoordinator.stop.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_EXECUTING', specId: 'test' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.stop({ specPath: '/test/.kiro/specs/test' });

      expect(result.ok).toBe(false);
    });

    it('should throw when coordinator is not initialized', async () => {
      mockServices.autoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.stop({ specPath: '/test' }))
        .rejects.toThrow();
    });

    it('should validate input - empty specPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.stop({ specPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Spec Auto Execution: getStatus
  // ============================================================

  describe('getStatus', () => {
    it('should return null when no execution exists', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.getStatus({ specPath: '/test/.kiro/specs/test' });

      expect(result).toBeNull();
      expect(mockCoordinator.getStatus).toHaveBeenCalledWith('/test/.kiro/specs/test');
    });

    it('should return serializable state (without timeoutId)', async () => {
      mockCoordinator.getStatus.mockReturnValue({
        specPath: '/test/.kiro/specs/test',
        specId: 'test',
        status: 'running',
        currentPhase: 'impl',
        executedPhases: ['requirements', 'design', 'tasks'],
        errors: [],
        startTime: 1000,
        lastActivityTime: 2000,
        timeoutId: setTimeout(() => {}, 0), // should be excluded
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.getStatus({ specPath: '/test/.kiro/specs/test' });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('running');
      expect('timeoutId' in result!).toBe(false);
    });

    it('should throw when coordinator is not initialized', async () => {
      mockServices.autoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.getStatus({ specPath: '/test' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Spec Auto Execution: getAllStatus
  // ============================================================

  describe('getAllStatus', () => {
    it('should return empty object when no executions exist', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.getAllStatus();

      expect(result).toEqual({});
    });

    it('should serialize Map to Record with timeoutId removed', async () => {
      const statuses = new Map();
      statuses.set('/test/.kiro/specs/spec-a', {
        specPath: '/test/.kiro/specs/spec-a',
        specId: 'spec-a',
        status: 'running',
        currentPhase: 'impl',
        executedPhases: [],
        errors: [],
        startTime: 1000,
        lastActivityTime: 2000,
        timeoutId: setTimeout(() => {}, 0),
      });
      statuses.set('/test/.kiro/specs/spec-b', {
        specPath: '/test/.kiro/specs/spec-b',
        specId: 'spec-b',
        status: 'completed',
        currentPhase: null,
        executedPhases: ['requirements', 'design'],
        errors: [],
        startTime: 1000,
        lastActivityTime: 3000,
      });
      mockCoordinator.getAllStatuses.mockReturnValue(statuses);

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.getAllStatus();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['/test/.kiro/specs/spec-a'].status).toBe('running');
      expect(result['/test/.kiro/specs/spec-b'].status).toBe('completed');
      // Verify timeoutId excluded
      expect('timeoutId' in result['/test/.kiro/specs/spec-a']).toBe(false);
    });

    it('should throw when coordinator is not initialized', async () => {
      mockServices.autoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.getAllStatus())
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Spec Auto Execution: retryFrom
  // ============================================================

  describe('retryFrom', () => {
    it('should retry from a specified phase', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.retryFrom({
        specPath: '/test/.kiro/specs/test',
        phase: 'design',
      });

      expect(result.ok).toBe(true);
      expect(mockCoordinator.retryFrom).toHaveBeenCalledWith('/test/.kiro/specs/test', 'design');
    });

    it('should return error when retry fails', async () => {
      mockCoordinator.retryFrom.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_EXECUTING', specId: 'test' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.retryFrom({
        specPath: '/test/.kiro/specs/test',
        phase: 'impl',
      });

      expect(result.ok).toBe(false);
    });

    it('should serialize result (exclude timeoutId)', async () => {
      mockCoordinator.retryFrom.mockResolvedValue({
        ok: true,
        value: {
          specPath: '/test',
          specId: 'test',
          status: 'running',
          currentPhase: 'design',
          executedPhases: [],
          errors: [],
          startTime: 1000,
          lastActivityTime: 2000,
          timeoutId: setTimeout(() => {}, 0),
        },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.retryFrom({
        specPath: '/test',
        phase: 'design',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect('timeoutId' in result.value).toBe(false);
      }
    });

    it('should throw when coordinator is not initialized', async () => {
      mockServices.autoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.retryFrom({ specPath: '/test', phase: 'impl' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Spec Auto Execution: reset (E2E)
  // ============================================================

  describe('reset', () => {
    it('should reset all executions', async () => {
      const caller = createTestCaller(mockServices);
      await caller.autoExecution.reset();

      expect(mockCoordinator.resetAll).toHaveBeenCalled();
    });

    it('should throw when coordinator is not initialized', async () => {
      mockServices.autoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.reset())
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Spec Auto Execution: setMockEnv (E2E)
  // ============================================================

  describe('setMockEnv', () => {
    it('should set allowed mock environment variable', async () => {
      const caller = createTestCaller(mockServices);
      await caller.autoExecution.setMockEnv({
        key: 'E2E_MOCK_DOC_REVIEW_RESULT',
        value: 'pass',
      });

      expect(process.env.E2E_MOCK_DOC_REVIEW_RESULT).toBe('pass');

      // Cleanup
      delete process.env.E2E_MOCK_DOC_REVIEW_RESULT;
    });

    it('should reject disallowed environment variable keys', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.setMockEnv({
        key: 'PATH',
        value: '/malicious',
      })).rejects.toThrow();
    });

    it('should accept E2E_MOCK_TASKS_COMPLETE', async () => {
      const caller = createTestCaller(mockServices);
      await caller.autoExecution.setMockEnv({
        key: 'E2E_MOCK_TASKS_COMPLETE',
        value: 'true',
      });

      expect(process.env.E2E_MOCK_TASKS_COMPLETE).toBe('true');

      // Cleanup
      delete process.env.E2E_MOCK_TASKS_COMPLETE;
    });

    it('should accept E2E_MOCK_CLAUDE_DELAY', async () => {
      const caller = createTestCaller(mockServices);
      await caller.autoExecution.setMockEnv({
        key: 'E2E_MOCK_CLAUDE_DELAY',
        value: '1000',
      });

      expect(process.env.E2E_MOCK_CLAUDE_DELAY).toBe('1000');

      // Cleanup
      delete process.env.E2E_MOCK_CLAUDE_DELAY;
    });

    it('should validate input - empty key should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.setMockEnv({
        key: '',
        value: 'test',
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // Spec Auto Execution: resetImplRetry
  // ============================================================

  describe('resetImplRetry', () => {
    it('should reset impl retry count for a spec', async () => {
      const caller = createTestCaller(mockServices);
      await caller.autoExecution.resetImplRetry({ specPath: '/test/.kiro/specs/test' });

      expect(mockCoordinator.resetImplRetryCount).toHaveBeenCalledWith('/test/.kiro/specs/test');
    });

    it('should throw when coordinator is not initialized', async () => {
      mockServices.autoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.resetImplRetry({ specPath: '/test' }))
        .rejects.toThrow();
    });

    it('should validate input - empty specPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.resetImplRetry({ specPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Bug Auto Execution: bugStart
  // ============================================================

  describe('bugStart', () => {
    it('should start bug auto execution and return serializable state', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugStart({
        projectPath: '/test/project',
        bugPath: '/test/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        options: {
          permissions: {
            analyze: true,
            fix: true,
            verify: true,
          },
        },
        lastCompletedPhase: null,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        expect('timeoutId' in result.value).toBe(false);
      }
      expect(mockBugCoordinator.start).toHaveBeenCalledWith(
        '/test/project',
        '/test/.kiro/bugs/test-bug',
        'test-bug',
        expect.objectContaining({ permissions: expect.any(Object) }),
        null,
      );
    });

    it('should throw when bug coordinator is not initialized', async () => {
      mockServices.bugAutoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugStart({
        projectPath: '/test/project',
        bugPath: '/test/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        options: {
          permissions: {
            analyze: true,
            fix: true,
            verify: true,
          },
        },
        lastCompletedPhase: null,
      })).rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugStart({
        projectPath: '',
        bugPath: '/test',
        bugName: 'test',
        options: { permissions: { analyze: true, fix: true, verify: true } },
        lastCompletedPhase: null,
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // Bug Auto Execution: bugStop
  // ============================================================

  describe('bugStop', () => {
    it('should stop bug auto execution', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugStop({ bugPath: '/test/.kiro/bugs/test-bug' });

      expect(result.ok).toBe(true);
      expect(mockBugCoordinator.stop).toHaveBeenCalledWith('/test/.kiro/bugs/test-bug');
    });

    it('should return error result when stop fails', async () => {
      mockBugCoordinator.stop.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_EXECUTING', bugName: 'test-bug' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugStop({ bugPath: '/test/.kiro/bugs/test-bug' });

      expect(result.ok).toBe(false);
    });

    it('should throw when bug coordinator is not initialized', async () => {
      mockServices.bugAutoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugStop({ bugPath: '/test' }))
        .rejects.toThrow();
    });

    it('should validate input - empty bugPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugStop({ bugPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Bug Auto Execution: bugGetStatus
  // ============================================================

  describe('bugGetStatus', () => {
    it('should return null when no execution exists', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugGetStatus({ bugPath: '/test/.kiro/bugs/test' });

      expect(result).toBeNull();
    });

    it('should return serializable state (without timeoutId)', async () => {
      mockBugCoordinator.getStatus.mockReturnValue({
        bugPath: '/test/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        status: 'running',
        currentPhase: 'fix',
        executedPhases: ['analyze'],
        errors: [],
        startTime: 1000,
        lastActivityTime: 2000,
        retryCount: 0,
        lastFailedPhase: null,
        timeoutId: setTimeout(() => {}, 0),
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugGetStatus({ bugPath: '/test/.kiro/bugs/test-bug' });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('running');
      expect('timeoutId' in result!).toBe(false);
    });

    it('should throw when bug coordinator is not initialized', async () => {
      mockServices.bugAutoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugGetStatus({ bugPath: '/test' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Bug Auto Execution: bugGetAllStatus
  // ============================================================

  describe('bugGetAllStatus', () => {
    it('should return empty object when no executions exist', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugGetAllStatus();

      expect(result).toEqual({});
    });

    it('should serialize Map to Record with timeoutId removed', async () => {
      const statuses = new Map();
      statuses.set('/test/.kiro/bugs/bug-a', {
        bugPath: '/test/.kiro/bugs/bug-a',
        bugName: 'bug-a',
        status: 'running',
        currentPhase: 'analyze',
        executedPhases: [],
        errors: [],
        startTime: 1000,
        lastActivityTime: 2000,
        retryCount: 0,
        lastFailedPhase: null,
        timeoutId: setTimeout(() => {}, 0),
      });
      mockBugCoordinator.getAllStatuses.mockReturnValue(statuses);

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugGetAllStatus();

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['/test/.kiro/bugs/bug-a'].status).toBe('running');
      expect('timeoutId' in result['/test/.kiro/bugs/bug-a']).toBe(false);
    });

    it('should throw when bug coordinator is not initialized', async () => {
      mockServices.bugAutoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugGetAllStatus())
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Bug Auto Execution: bugRetryFrom
  // ============================================================

  describe('bugRetryFrom', () => {
    it('should retry from a specified bug phase', async () => {
      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugRetryFrom({
        bugPath: '/test/.kiro/bugs/test-bug',
        phase: 'fix',
      });

      expect(result.ok).toBe(true);
      expect(mockBugCoordinator.retryFrom).toHaveBeenCalledWith('/test/.kiro/bugs/test-bug', 'fix');
    });

    it('should return error when retry fails', async () => {
      mockBugCoordinator.retryFrom.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_EXECUTING', bugName: 'test-bug' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.autoExecution.bugRetryFrom({
        bugPath: '/test/.kiro/bugs/test-bug',
        phase: 'verify',
      });

      expect(result.ok).toBe(false);
    });

    it('should throw when bug coordinator is not initialized', async () => {
      mockServices.bugAutoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugRetryFrom({ bugPath: '/test', phase: 'fix' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Bug Auto Execution: bugReset (E2E)
  // ============================================================

  describe('bugReset', () => {
    it('should reset all bug executions', async () => {
      const caller = createTestCaller(mockServices);
      await caller.autoExecution.bugReset();

      expect(mockBugCoordinator.resetAll).toHaveBeenCalled();
    });

    it('should throw when bug coordinator is not initialized', async () => {
      mockServices.bugAutoExecutionCoordinator = undefined;

      const caller = createTestCaller(mockServices);
      await expect(caller.autoExecution.bugReset())
        .rejects.toThrow();
    });
  });

  // ============================================================
  // Router registration
  // ============================================================

  describe('router registration', () => {
    it('should have autoExecution namespace accessible from appRouter', () => {
      const caller = createTestCaller(mockServices);
      expect(caller.autoExecution).toBeDefined();
    });

    it('should have all 14 procedures defined', () => {
      const caller = createTestCaller(mockServices);
      // Spec procedures (8)
      expect(typeof caller.autoExecution.start).toBe('function');
      expect(typeof caller.autoExecution.stop).toBe('function');
      expect(typeof caller.autoExecution.getStatus).toBe('function');
      expect(typeof caller.autoExecution.getAllStatus).toBe('function');
      expect(typeof caller.autoExecution.retryFrom).toBe('function');
      expect(typeof caller.autoExecution.reset).toBe('function');
      expect(typeof caller.autoExecution.setMockEnv).toBe('function');
      expect(typeof caller.autoExecution.resetImplRetry).toBe('function');
      // Bug procedures (6)
      expect(typeof caller.autoExecution.bugStart).toBe('function');
      expect(typeof caller.autoExecution.bugStop).toBe('function');
      expect(typeof caller.autoExecution.bugGetStatus).toBe('function');
      expect(typeof caller.autoExecution.bugGetAllStatus).toBe('function');
      expect(typeof caller.autoExecution.bugRetryFrom).toBe('function');
      expect(typeof caller.autoExecution.bugReset).toBe('function');
    });
  });

  // ============================================================
  // Zod schema validation
  // ============================================================

  describe('Zod schema validation', () => {
    it('should export startInputSchema with required permissions', async () => {
      const { startInputSchema } = await import('../routers/autoExecution');
      expect(startInputSchema).toBeDefined();

      // Valid input
      expect(startInputSchema.safeParse({
        projectPath: '/test',
        specPath: 'test-spec',
        specId: 'test-spec',
        options: {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: true,
            deploy: false,
          },
        },
      }).success).toBe(true);

      // Invalid: missing projectPath
      expect(startInputSchema.safeParse({
        specPath: 'test-spec',
        specId: 'test-spec',
        options: { permissions: {} },
      }).success).toBe(false);
    });

    it('should export stopInputSchema', async () => {
      const { stopInputSchema } = await import('../routers/autoExecution');
      expect(stopInputSchema).toBeDefined();

      expect(stopInputSchema.safeParse({ specPath: '/test' }).success).toBe(true);
      expect(stopInputSchema.safeParse({ specPath: '' }).success).toBe(false);
    });

    it('should export retryFromInputSchema with phase validation', async () => {
      const { retryFromInputSchema } = await import('../routers/autoExecution');
      expect(retryFromInputSchema).toBeDefined();

      expect(retryFromInputSchema.safeParse({
        specPath: '/test',
        phase: 'design',
      }).success).toBe(true);

      expect(retryFromInputSchema.safeParse({
        specPath: '',
        phase: 'design',
      }).success).toBe(false);
    });

    it('should export setMockEnvInputSchema', async () => {
      const { setMockEnvInputSchema } = await import('../routers/autoExecution');
      expect(setMockEnvInputSchema).toBeDefined();

      expect(setMockEnvInputSchema.safeParse({ key: 'E2E_MOCK', value: 'test' }).success).toBe(true);
      expect(setMockEnvInputSchema.safeParse({ key: '', value: 'test' }).success).toBe(false);
    });

    it('should export bugStartInputSchema', async () => {
      const { bugStartInputSchema } = await import('../routers/autoExecution');
      expect(bugStartInputSchema).toBeDefined();

      expect(bugStartInputSchema.safeParse({
        projectPath: '/test',
        bugPath: '/test/bug',
        bugName: 'test-bug',
        options: {
          permissions: { analyze: true, fix: true, verify: true },
        },
        lastCompletedPhase: null,
      }).success).toBe(true);

      // Invalid: empty projectPath
      expect(bugStartInputSchema.safeParse({
        projectPath: '',
        bugPath: '/test/bug',
        bugName: 'test-bug',
        options: { permissions: {} },
        lastCompletedPhase: null,
      }).success).toBe(false);
    });

    it('should export bugStopInputSchema', async () => {
      const { bugStopInputSchema } = await import('../routers/autoExecution');
      expect(bugStopInputSchema).toBeDefined();

      expect(bugStopInputSchema.safeParse({ bugPath: '/test' }).success).toBe(true);
      expect(bugStopInputSchema.safeParse({ bugPath: '' }).success).toBe(false);
    });

    it('should export bugRetryFromInputSchema', async () => {
      const { bugRetryFromInputSchema } = await import('../routers/autoExecution');
      expect(bugRetryFromInputSchema).toBeDefined();

      expect(bugRetryFromInputSchema.safeParse({
        bugPath: '/test',
        phase: 'fix',
      }).success).toBe(true);
    });
  });

  // ============================================================
  // Task 7.3: Integration tests migrated from legacy handler tests
  // Legacy sources: autoExecutionHandlers.test.ts, bugAutoExecutionHandlers.test.ts
  // Requirements: 6.4, 6.5
  // ============================================================

  describe('Integration: Legacy edge cases (Task 7.3)', () => {

    // --- From autoExecutionHandlers.test.ts: ALREADY_EXECUTING ---
    describe('Spec: ALREADY_EXECUTING error', () => {
      it('should return error when start is called for already executing spec', async () => {
        mockCoordinator.start.mockResolvedValueOnce({
          ok: true,
          value: {
            specPath: '/test/.kiro/specs/test',
            specId: 'test',
            status: 'running',
            currentPhase: 'requirements',
            executedPhases: [],
            errors: [],
            startTime: Date.now(),
            lastActivityTime: Date.now(),
          },
        }).mockResolvedValueOnce({
          ok: false,
          error: { type: 'ALREADY_EXECUTING', specId: 'test' },
        });

        const caller = createTestCaller(mockServices);
        // First call succeeds
        const first = await caller.autoExecution.start({
          projectPath: '/test/project',
          specPath: 'test-spec',
          specId: 'test-spec',
          options: {
            permissions: {
              requirements: true, design: true, tasks: true,
              'document-review': true, impl: true, inspection: true, deploy: false,
            },
          },
        });
        expect(first.ok).toBe(true);

        // Second call returns ALREADY_EXECUTING error
        const second = await caller.autoExecution.start({
          projectPath: '/test/project',
          specPath: 'test-spec',
          specId: 'test-spec',
          options: {
            permissions: {
              requirements: true, design: true, tasks: true,
              'document-review': true, impl: true, inspection: true, deploy: false,
            },
          },
        });
        expect(second.ok).toBe(false);
        if (!second.ok) {
          expect(second.error.type).toBe('ALREADY_EXECUTING');
        }
      });
    });

    // --- From autoExecutionHandlers.test.ts: NOT_EXECUTING error on stop ---
    describe('Spec: NOT_EXECUTING error on stop', () => {
      it('should return error when stopping non-existent execution', async () => {
        mockCoordinator.stop.mockResolvedValue({
          ok: false,
          error: { type: 'NOT_EXECUTING', specId: 'non-existent' },
        });

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.stop({ specPath: '/non-existent/spec' });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NOT_EXECUTING');
        }
      });
    });

    // --- From autoExecutionHandlers.test.ts: Multiple concurrent executions ---
    describe('Spec: Multiple concurrent executions in getAllStatus', () => {
      it('should handle multiple running executions with different phases', async () => {
        const statuses = new Map();
        statuses.set('/spec/1', {
          specPath: '/spec/1',
          specId: 'spec-1',
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: [],
          errors: [],
          startTime: 1000,
          lastActivityTime: 2000,
        });
        statuses.set('/spec/2', {
          specPath: '/spec/2',
          specId: 'spec-2',
          status: 'running',
          currentPhase: 'design',
          executedPhases: ['requirements'],
          errors: [],
          startTime: 1100,
          lastActivityTime: 2100,
        });
        statuses.set('/spec/3', {
          specPath: '/spec/3',
          specId: 'spec-3',
          status: 'error',
          currentPhase: null,
          executedPhases: ['requirements'],
          errors: ['phase failed'],
          startTime: 1200,
          lastActivityTime: 2200,
        });
        mockCoordinator.getAllStatuses.mockReturnValue(statuses);

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.getAllStatus();

        expect(Object.keys(result)).toHaveLength(3);
        expect(result['/spec/1'].status).toBe('running');
        expect(result['/spec/2'].currentPhase).toBe('design');
        expect(result['/spec/3'].status).toBe('error');
        expect(result['/spec/3'].errors).toContain('phase failed');
      });
    });

    // --- From autoExecutionHandlers.test.ts: Options with optional fields ---
    describe('Spec: Options with optional fields', () => {
      it('should accept minimal options (without timeoutMs, commandPrefix)', async () => {
        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.start({
          projectPath: '/test/project',
          specPath: 'test-spec',
          specId: 'test-spec',
          options: {
            permissions: {
              requirements: true, design: false, tasks: false,
              'document-review': false, impl: false, inspection: false, deploy: false,
            },
          },
        });

        expect(result.ok).toBe(true);
      });

      it('should accept options with all optional fields (timeoutMs, commandPrefix, approvals)', async () => {
        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.start({
          projectPath: '/test/project',
          specPath: 'test-spec-2',
          specId: 'test-spec-2',
          options: {
            permissions: {
              requirements: true, design: true, tasks: true,
              'document-review': true, impl: true, inspection: true, deploy: false,
            },
            timeoutMs: 600000,
            commandPrefix: 'kiro',
            approvals: {
              requirements: { generated: true, approved: true },
              design: { generated: true, approved: true },
              tasks: { generated: true, approved: true },
            },
            validationOptions: { gap: true, design: true, impl: true },
          },
        });

        expect(result.ok).toBe(true);
      });
    });

    // --- From autoExecutionHandlers.test.ts: Serializable results ---
    describe('Spec: Results must be JSON serializable', () => {
      it('should return JSON-serializable start result', async () => {
        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.start({
          projectPath: '/test/project',
          specPath: 'test-spec',
          specId: 'test-spec',
          options: {
            permissions: {
              requirements: true, design: true, tasks: true,
              'document-review': true, impl: true, inspection: true, deploy: false,
            },
          },
        });

        expect(() => JSON.stringify(result)).not.toThrow();
      });

      it('should return JSON-serializable getStatus result with timeoutId removed', async () => {
        mockCoordinator.getStatus.mockReturnValue({
          specPath: '/test',
          specId: 'test',
          status: 'running',
          currentPhase: 'impl',
          executedPhases: ['requirements', 'design', 'tasks'],
          errors: [],
          startTime: 1000,
          lastActivityTime: 2000,
          timeoutId: setTimeout(() => {}, 0),
          currentAgentId: 'agent-123',
        });

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.getStatus({ specPath: '/test' });

        expect(() => JSON.stringify(result)).not.toThrow();
        expect(result).not.toBeNull();
        expect(result!.currentAgentId).toBe('agent-123');
      });
    });

    // --- From autoExecutionHandlers.test.ts: retryFrom after stop ---
    describe('Spec: retryFrom after stop', () => {
      it('should retry from specified phase with correct parameters', async () => {
        mockCoordinator.retryFrom.mockResolvedValue({
          ok: true,
          value: {
            specPath: '/test/.kiro/specs/test',
            specId: 'test',
            status: 'running',
            currentPhase: 'design',
            executedPhases: ['requirements'],
            errors: [],
            startTime: Date.now(),
            lastActivityTime: Date.now(),
          },
        });

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.retryFrom({
          specPath: '/test/.kiro/specs/test',
          phase: 'design',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.status).toBe('running');
          expect(result.value.currentPhase).toBe('design');
          expect(result.value.executedPhases).toContain('requirements');
        }
      });
    });

    // --- From bugAutoExecutionHandlers.test.ts: Serialization edge cases ---
    describe('Bug: Serialization edge cases', () => {
      it('should handle state with complex timeoutId object', async () => {
        mockBugCoordinator.getStatus.mockReturnValue({
          bugPath: '/test/.kiro/bugs/test-bug',
          bugName: 'test-bug',
          status: 'running',
          currentPhase: 'fix',
          executedPhases: ['analyze'],
          errors: [],
          startTime: 1234567890,
          lastActivityTime: 1234567891,
          retryCount: 1,
          lastFailedPhase: 'analyze',
          timeoutId: { _idleTimeout: 1000 } as any, // complex object
        });

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.bugGetStatus({
          bugPath: '/test/.kiro/bugs/test-bug',
        });

        expect(result).not.toBeNull();
        expect(result!).not.toHaveProperty('timeoutId');
        expect(() => JSON.stringify(result)).not.toThrow();
        // Verify specific fields preserved
        expect(result!.retryCount).toBe(1);
        expect(result!.lastFailedPhase).toBe('analyze');
      });
    });

    // --- From bugAutoExecutionHandlers.test.ts: projectPath passing ---
    describe('Bug: projectPath is passed to coordinator.start()', () => {
      it('should pass projectPath as first argument to coordinator.start()', async () => {
        const caller = createTestCaller(mockServices);
        await caller.autoExecution.bugStart({
          projectPath: '/explicit/project/path',
          bugPath: '/explicit/project/path/.kiro/bugs/test-bug',
          bugName: 'test-bug',
          options: {
            permissions: { analyze: true, fix: true, verify: true },
          },
          lastCompletedPhase: null,
        });

        expect(mockBugCoordinator.start).toHaveBeenCalledWith(
          '/explicit/project/path',
          '/explicit/project/path/.kiro/bugs/test-bug',
          'test-bug',
          expect.objectContaining({
            permissions: expect.any(Object),
          }),
          null,
        );
      });

      it('should pass lastCompletedPhase to coordinator.start()', async () => {
        const caller = createTestCaller(mockServices);
        await caller.autoExecution.bugStart({
          projectPath: '/test/project',
          bugPath: '/test/.kiro/bugs/test-bug',
          bugName: 'test-bug',
          options: {
            permissions: { analyze: true, fix: true, verify: true },
          },
          lastCompletedPhase: 'analyze',
        });

        expect(mockBugCoordinator.start).toHaveBeenCalledWith(
          '/test/project',
          '/test/.kiro/bugs/test-bug',
          'test-bug',
          expect.any(Object),
          'analyze',
        );
      });
    });

    // --- From bugAutoExecutionHandlers.test.ts: Bug NOT_EXECUTING ---
    describe('Bug: NOT_EXECUTING error on stop', () => {
      it('should return error when stopping non-existent bug execution', async () => {
        mockBugCoordinator.stop.mockResolvedValue({
          ok: false,
          error: { type: 'NOT_EXECUTING', bugName: 'non-existent' },
        });

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.bugStop({
          bugPath: '/non-existent/bug',
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NOT_EXECUTING');
        }
      });
    });

    // --- Bug: Multiple concurrent bug executions ---
    describe('Bug: Multiple concurrent executions in bugGetAllStatus', () => {
      it('should handle multiple bug executions with different states', async () => {
        const statuses = new Map();
        statuses.set('/bugs/bug-a', {
          bugPath: '/bugs/bug-a',
          bugName: 'bug-a',
          status: 'running',
          currentPhase: 'analyze',
          executedPhases: [],
          errors: [],
          startTime: 1000,
          lastActivityTime: 2000,
          retryCount: 0,
          lastFailedPhase: null,
        });
        statuses.set('/bugs/bug-b', {
          bugPath: '/bugs/bug-b',
          bugName: 'bug-b',
          status: 'error',
          currentPhase: null,
          executedPhases: ['analyze'],
          errors: ['verification failed'],
          startTime: 1100,
          lastActivityTime: 2100,
          retryCount: 2,
          lastFailedPhase: 'fix',
        });
        mockBugCoordinator.getAllStatuses.mockReturnValue(statuses);

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.bugGetAllStatus();

        expect(Object.keys(result)).toHaveLength(2);
        expect(result['/bugs/bug-a'].status).toBe('running');
        expect(result['/bugs/bug-b'].status).toBe('error');
        expect(result['/bugs/bug-b'].errors).toContain('verification failed');
      });
    });

    // --- Bug: bugRetryFrom with specific phase and error return ---
    describe('Bug: bugRetryFrom error cases', () => {
      it('should return NOT_EXECUTING error when retrying for non-existent bug', async () => {
        mockBugCoordinator.retryFrom.mockResolvedValue({
          ok: false,
          error: { type: 'NOT_EXECUTING', bugName: 'non-existent' },
        });

        const caller = createTestCaller(mockServices);
        const result = await caller.autoExecution.bugRetryFrom({
          bugPath: '/non-existent/bug',
          phase: 'fix',
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NOT_EXECUTING');
        }
      });
    });

    // --- Schema validation: edge cases ---
    describe('Schema validation edge cases', () => {
      it('should reject start with specPath that is empty string', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.start({
          projectPath: '/test',
          specPath: '',
          specId: 'test',
          options: {
            permissions: {
              requirements: true, design: true, tasks: true,
              'document-review': true, impl: true, inspection: true, deploy: false,
            },
          },
        })).rejects.toThrow();
      });

      it('should reject start with specId that is empty string', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.start({
          projectPath: '/test',
          specPath: 'test',
          specId: '',
          options: {
            permissions: {
              requirements: true, design: true, tasks: true,
              'document-review': true, impl: true, inspection: true, deploy: false,
            },
          },
        })).rejects.toThrow();
      });

      it('should reject bugStart with bugPath that is empty string', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.bugStart({
          projectPath: '/test',
          bugPath: '',
          bugName: 'test',
          options: { permissions: { analyze: true, fix: true, verify: true } },
          lastCompletedPhase: null,
        })).rejects.toThrow();
      });

      it('should reject bugStart with bugName that is empty string', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.bugStart({
          projectPath: '/test',
          bugPath: '/test',
          bugName: '',
          options: { permissions: { analyze: true, fix: true, verify: true } },
          lastCompletedPhase: null,
        })).rejects.toThrow();
      });

      it('should reject retryFrom with empty phase', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.retryFrom({
          specPath: '/test',
          phase: '',
        })).rejects.toThrow();
      });

      it('should reject bugRetryFrom with empty phase', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.bugRetryFrom({
          bugPath: '/test',
          phase: '',
        })).rejects.toThrow();
      });

      it('should reject getStatus with empty specPath', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.getStatus({
          specPath: '',
        })).rejects.toThrow();
      });

      it('should reject bugGetStatus with empty bugPath', async () => {
        const caller = createTestCaller(mockServices);
        await expect(caller.autoExecution.bugGetStatus({
          bugPath: '',
        })).rejects.toThrow();
      });
    });
  });
});
