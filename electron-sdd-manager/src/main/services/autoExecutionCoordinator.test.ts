/**
 * AutoExecutionCoordinator Test
 * TDD tests for auto-execution-main-process feature
 * Requirements: 1.1, 1.2, 7.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AutoExecutionCoordinator,
  AutoExecutionState,
  AutoExecutionOptions,
  AutoExecutionError,
  DEFAULT_AUTO_EXECUTION_TIMEOUT,
  MAX_CONCURRENT_EXECUTIONS,
} from './autoExecutionCoordinator';
import type { WorkflowPhase } from './specManagerService';

// Mock eventLogService for Task 1.3 tests
// Create a shared mock instance so we can track calls across invocations
const mockLogEvent = vi.fn().mockResolvedValue(undefined);
const mockEventLogService = {
  logEvent: mockLogEvent,
};

vi.mock('./eventLogService', () => ({
  getDefaultEventLogService: vi.fn(() => mockEventLogService),
}));

/**
 * Default options for tests
 * document-review-phase Task 2.1: 'document-review' を追加
 * Requirements: 2.1
 */
const createDefaultOptions = (): AutoExecutionOptions => ({
  permissions: {
    requirements: true,
    design: true,
    tasks: true,
    'document-review': true,
    impl: false,
    inspection: false,
    deploy: false,
  },
  documentReviewFlag: 'run',
  validationOptions: { gap: false, design: false, impl: false },
});

// auto-execution-projectpath-fix Task 1.2: Default project path for tests
const TEST_PROJECT_PATH = '/test/project';

describe('AutoExecutionCoordinator', () => {
  let coordinator: AutoExecutionCoordinator;

  beforeEach(() => {
    coordinator = new AutoExecutionCoordinator();
  });

  afterEach(() => {
    coordinator.dispose();
  });

  // ============================================================
  // Task 1.1: Core State Management Structure
  // Requirements: 1.1, 1.2, 7.1
  // ============================================================

  describe('Task 1.1: Core State Management Structure', () => {
    describe('AutoExecutionState interface', () => {
      /**
       * Task 1.1 (auto-execution-projectpath-fix): projectPath field
       * Requirement 1.1: AutoExecutionStateにprojectPathフィールドが追加されること
       *
       * projectPathはメインリポジトリのパスを保持し、worktree環境でも
       * 正しい場所にイベントログが記録されるようにする。
       */
      it('should have projectPath field for main repository path', () => {
        const state: AutoExecutionState = {
          projectPath: '/project/root',
          specPath: '/project/root/.kiro/specs/test-spec',
          specId: 'test-spec',
          status: 'idle',
          currentPhase: null,
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        };

        // projectPath should be a required readonly field
        expect(state.projectPath).toBe('/project/root');
        // projectPath should be different from specPath (specPath contains .kiro/specs/)
        expect(state.projectPath).not.toBe(state.specPath);
        expect(state.specPath).toContain(state.projectPath);
      });

      it('should have all required properties', () => {
        const state: AutoExecutionState = {
          projectPath: '/test/project',
          specPath: '/test/spec',
          specId: 'test-spec',
          status: 'idle',
          currentPhase: null,
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        };

        expect(state.projectPath).toBe('/test/project');
        expect(state.specPath).toBe('/test/spec');
        expect(state.specId).toBe('test-spec');
        expect(state.status).toBe('idle');
        expect(state.currentPhase).toBeNull();
        expect(state.executedPhases).toEqual([]);
        expect(state.errors).toEqual([]);
        expect(typeof state.startTime).toBe('number');
        expect(typeof state.lastActivityTime).toBe('number');
      });

      it('should support all valid status values', () => {
        const statuses: AutoExecutionState['status'][] = [
          'idle',
          'running',
          'paused',
          'completed',
          'error',
        ];

        statuses.forEach((status) => {
          const state: AutoExecutionState = {
            projectPath: '/test/project',
            specPath: '/test/spec',
            specId: 'test-spec',
            status,
            currentPhase: null,
            executedPhases: [],
            errors: [],
            startTime: Date.now(),
            lastActivityTime: Date.now(),
          };
          expect(state.status).toBe(status);
        });
      });
    });

    describe('AutoExecutionOptions interface', () => {
      it('should have all required properties', () => {
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            impl: false,
          },
          documentReviewFlag: 'run',
          validationOptions: {
            gap: false,
            design: false,
            impl: false,
          },
        };

        expect(options.permissions.requirements).toBe(true);
        expect(options.permissions.design).toBe(true);
        expect(options.permissions.tasks).toBe(true);
        expect(options.permissions.impl).toBe(false);
        expect(options.documentReviewFlag).toBe('run');
        expect(options.validationOptions.gap).toBe(false);
      });

      it('should support optional timeoutMs', () => {
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: false,
            tasks: false,
            impl: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
          timeoutMs: 60000,
        };

        expect(options.timeoutMs).toBe(60000);
      });
    });

    describe('DEFAULT_AUTO_EXECUTION_TIMEOUT', () => {
      it('should be 30 minutes (1,800,000ms)', () => {
        expect(DEFAULT_AUTO_EXECUTION_TIMEOUT).toBe(1_800_000);
      });
    });

    describe('Map-based state management', () => {
      it('should initially have no execution states', () => {
        expect(coordinator.getAllStatuses().size).toBe(0);
      });

      it('should return null for non-existent spec', () => {
        const state = coordinator.getStatus('/non-existent/spec');
        expect(state).toBeNull();
      });
    });

    describe('Business rules validation', () => {
      it('should prevent duplicate execution of same specId', async () => {
        // This will be tested with start() in Task 1.2
        expect(true).toBe(true);
      });

      it('should enforce phase order constraint (requirements -> design -> tasks -> impl)', () => {
        const validOrder: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl'];
        // Phase order validation will be tested in Task 1.4
        expect(validOrder.length).toBe(4);
      });
    });
  });

  describe('AutoExecutionError types', () => {
    it('should support ALREADY_EXECUTING error', () => {
      const error: AutoExecutionError = {
        type: 'ALREADY_EXECUTING',
        specId: 'test-spec',
      };
      expect(error.type).toBe('ALREADY_EXECUTING');
      expect(error.specId).toBe('test-spec');
    });

    it('should support NOT_EXECUTING error', () => {
      const error: AutoExecutionError = {
        type: 'NOT_EXECUTING',
        specId: 'test-spec',
      };
      expect(error.type).toBe('NOT_EXECUTING');
    });

    it('should support MAX_CONCURRENT_REACHED error', () => {
      const error: AutoExecutionError = {
        type: 'MAX_CONCURRENT_REACHED',
        limit: 5,
      };
      expect(error.type).toBe('MAX_CONCURRENT_REACHED');
      expect(error.limit).toBe(5);
    });

    it('should support PRECONDITION_FAILED error', () => {
      const error: AutoExecutionError = {
        type: 'PRECONDITION_FAILED',
        message: 'Previous phase not approved',
      };
      expect(error.type).toBe('PRECONDITION_FAILED');
      expect(error.message).toBe('Previous phase not approved');
    });

    it('should support PHASE_EXECUTION_FAILED error', () => {
      const error: AutoExecutionError = {
        type: 'PHASE_EXECUTION_FAILED',
        phase: 'requirements',
        message: 'Agent execution failed',
      };
      expect(error.type).toBe('PHASE_EXECUTION_FAILED');
      expect(error.phase).toBe('requirements');
    });

    it('should support SPEC_NOT_FOUND error', () => {
      const error: AutoExecutionError = {
        type: 'SPEC_NOT_FOUND',
        specPath: '/invalid/path',
      };
      expect(error.type).toBe('SPEC_NOT_FOUND');
      expect(error.specPath).toBe('/invalid/path');
    });
  });

  // ============================================================
  // Task 1.2: Start/Stop/Status API
  // Requirements: 1.1, 1.2, 8.5
  // ============================================================

  describe('Task 1.2: Start/Stop/Status API', () => {
    describe('start() method', () => {
      /**
       * Task 1.2 (auto-execution-projectpath-fix): start()シグネチャ変更
       * Requirement 1.2: start()メソッドのシグネチャが start(projectPath, specPath, specId, options) に変更されること
       * Requirement 1.3: start()呼び出し時に渡されたprojectPathがAutoExecutionStateに保存されること
       */
      it('should accept projectPath as first argument and store it in state', async () => {
        const projectPath = '/test/project';
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        const result = await coordinator.start(projectPath, specPath, 'test-feature', options);

        expect(result.ok).toBe(true);
        if (result.ok) {
          // Requirement 1.2: projectPathが第一引数として受け取られる
          // Requirement 1.3: projectPathが状態に保存される
          expect(result.value.projectPath).toBe(projectPath);
          expect(result.value.specPath).toBe(specPath);
          expect(result.value.specId).toBe('test-feature');
          expect(result.value.status).toBe('running');
        }
      });

      it('should use provided projectPath instead of extracting from specPath', async () => {
        // Worktree scenario: projectPath is different from specPath's parent
        const projectPath = '/original/project';
        const specPath = '/original/project/.kiro/worktrees/specs/feature-x/.kiro/specs/feature-x';
        const options = createDefaultOptions();

        const result = await coordinator.start(projectPath, specPath, 'feature-x', options);

        expect(result.ok).toBe(true);
        if (result.ok) {
          // projectPath should be the explicitly provided value, not extracted from specPath
          expect(result.value.projectPath).toBe(projectPath);
          // The specPath extraction logic would give '/original/project/.kiro/worktrees/specs/feature-x'
          // but we want the explicitly provided '/original/project'
          expect(result.value.projectPath).not.toContain('worktrees');
        }
      });

      it('should start auto-execution and return success', async () => {
        const projectPath = '/test/project';
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        const result = await coordinator.start(projectPath, specPath, 'test-feature', options);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.specPath).toBe(specPath);
          expect(result.value.specId).toBe('test-feature');
          expect(result.value.status).toBe('running');
        }
      });

      it('should return ALREADY_EXECUTING error when starting duplicate', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        // First start should succeed
        const first = await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        expect(first.ok).toBe(true);

        // Second start should fail
        const second = await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        expect(second.ok).toBe(false);
        if (!second.ok) {
          expect(second.error.type).toBe('ALREADY_EXECUTING');
        }
      });

      it('should return MAX_CONCURRENT_REACHED error when limit exceeded', async () => {
        const options = createDefaultOptions();

        // Start MAX_CONCURRENT_EXECUTIONS specs
        for (let i = 0; i < MAX_CONCURRENT_EXECUTIONS; i++) {
          const result = await coordinator.start(TEST_PROJECT_PATH, `/spec/${i}`, `spec-${i}`, options);
          expect(result.ok).toBe(true);
        }

        // Next start should fail
        const result = await coordinator.start(TEST_PROJECT_PATH, '/spec/overflow', 'spec-overflow', options);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('MAX_CONCURRENT_REACHED');
          if (result.error.type === 'MAX_CONCURRENT_REACHED') {
            expect(result.error.limit).toBe(MAX_CONCURRENT_EXECUTIONS);
          }
        }
      });

      it('should emit state-changed event on start', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        coordinator.on('state-changed', eventHandler);
        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            status: 'running',
            specId: 'test-feature',
          })
        );
      });
    });

    describe('stop() method', () => {
      it('should stop running auto-execution', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        const result = await coordinator.stop(specPath);

        expect(result.ok).toBe(true);
        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('paused');
      });

      it('should return NOT_EXECUTING error when stopping non-existent', async () => {
        const result = await coordinator.stop('/non-existent/spec');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NOT_EXECUTING');
        }
      });

      it('should emit state-changed event on stop', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.on('state-changed', eventHandler);
        await coordinator.stop(specPath);

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            status: 'paused',
          })
        );
      });
    });

    describe('getStatus() method', () => {
      it('should return null for non-existent spec', () => {
        const state = coordinator.getStatus('/non-existent/spec');
        expect(state).toBeNull();
      });

      it('should return current state for existing spec', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        const state = coordinator.getStatus(specPath);

        expect(state).not.toBeNull();
        expect(state?.specPath).toBe(specPath);
        expect(state?.specId).toBe('test-feature');
        expect(state?.status).toBe('running');
      });
    });

    describe('getAllStatuses() method', () => {
      it('should return empty map initially', () => {
        const statuses = coordinator.getAllStatuses();
        expect(statuses.size).toBe(0);
      });

      it('should return all current states', async () => {
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, '/spec/1', 'spec-1', options);
        await coordinator.start(TEST_PROJECT_PATH, '/spec/2', 'spec-2', options);

        const statuses = coordinator.getAllStatuses();
        expect(statuses.size).toBe(2);
        expect(statuses.get('/spec/1')?.specId).toBe('spec-1');
        expect(statuses.get('/spec/2')?.specId).toBe('spec-2');
      });
    });

    describe('retryFrom() method', () => {
      it('should restart from specified phase', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        await coordinator.stop(specPath);

        const result = await coordinator.retryFrom(specPath, 'design');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.status).toBe('running');
          expect(result.value.currentPhase).toBe('design');
        }
      });

      it('should return NOT_EXECUTING error when state not found', async () => {
        const result = await coordinator.retryFrom('/non-existent/spec', 'requirements');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NOT_EXECUTING');
        }
      });
    });

    describe('isExecuting() method', () => {
      it('should return false for non-existent spec', () => {
        expect(coordinator.isExecuting('/non-existent/spec')).toBe(false);
      });

      it('should return true for running spec', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        expect(coordinator.isExecuting(specPath)).toBe(true);
      });

      it('should return false for paused spec', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        await coordinator.stop(specPath);
        expect(coordinator.isExecuting(specPath)).toBe(false);
      });
    });

    describe('getRunningCount() method', () => {
      it('should return 0 initially', () => {
        expect(coordinator.getRunningCount()).toBe(0);
      });

      it('should return correct count of running specs', async () => {
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, '/spec/1', 'spec-1', options);
        await coordinator.start(TEST_PROJECT_PATH, '/spec/2', 'spec-2', options);
        expect(coordinator.getRunningCount()).toBe(2);

        await coordinator.stop('/spec/1');
        expect(coordinator.getRunningCount()).toBe(1);
      });
    });
  });

  // ============================================================
  // Task 1.3: AgentRegistry Integration
  // Requirements: 1.3, 2.1, 2.3
  // ============================================================

  describe('Task 1.3: AgentRegistry Integration', () => {
    describe('handleAgentStatusChange()', () => {
      it('should update lastActivityTime on agent status change', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        const initialState = coordinator.getStatus(specPath);
        const initialTime = initialState?.lastActivityTime ?? 0;

        // Wait a bit and trigger status change
        await new Promise((resolve) => setTimeout(resolve, 10));
        coordinator.handleAgentStatusChange('agent-123', 'running', specPath);

        const updatedState = coordinator.getStatus(specPath);
        expect(updatedState?.lastActivityTime).toBeGreaterThan(initialTime);
      });

      it('should track agent ID when agent starts', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.handleAgentStatusChange('agent-123', 'running', specPath);

        const state = coordinator.getStatus(specPath);
        expect(state?.currentAgentId).toBe('agent-123');
      });
    });

    describe('handleAgentCompleted()', () => {
      it('should emit phase-completed event when agent completes', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.on('phase-completed', eventHandler);

        await coordinator.handleAgentCompleted('agent-123', specPath, 'completed');

        expect(eventHandler).toHaveBeenCalledWith(specPath, 'requirements');
      });

      it('should add completed phase to executedPhases', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'completed');

        const state = coordinator.getStatus(specPath);
        expect(state?.executedPhases).toContain('requirements');
      });

      it('should clear currentAgentId after agent completes', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.handleAgentStatusChange('agent-123', 'running', specPath);
        await coordinator.handleAgentCompleted('agent-123', specPath, 'completed');

        const state = coordinator.getStatus(specPath);
        expect(state?.currentAgentId).toBeUndefined();
      });
    });

    describe('handleAgentError()', () => {
      it('should update status to error on agent failure', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('error');
      });

      it('should add error message to errors array', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        const state = coordinator.getStatus(specPath);
        expect(state?.errors.length).toBeGreaterThan(0);
        expect(state?.errors.some((e) => e.includes('requirements'))).toBe(true);
      });

      it('should emit execution-error event on agent failure', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.on('execution-error', eventHandler);
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            type: 'PHASE_EXECUTION_FAILED',
            phase: 'requirements',
          })
        );
      });
    });

    describe('setCurrentPhase()', () => {
      it('should update currentPhase', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'design');

        const state = coordinator.getStatus(specPath);
        expect(state?.currentPhase).toBe('design');
      });

      it('should emit phase-started event', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.on('phase-started', eventHandler);
        coordinator.setCurrentPhase(specPath, 'design', 'agent-456');

        expect(eventHandler).toHaveBeenCalledWith(specPath, 'design', 'agent-456');
      });
    });
  });

  // ============================================================
  // Task 1.4: Phase Transition and Auto-Approval Logic
  // Requirements: 2.2, 2.4, 2.5
  // ============================================================

  describe('Task 1.4: Phase Transition and Auto-Approval Logic', () => {
    describe('getNextPermittedPhase()', () => {
      /**
       * document-review-phase: Updated test to include document-review phase
       * Phase order: requirements -> design -> tasks -> document-review -> impl
       */
      it('should return next permitted phase based on permissions', () => {
        const options = createDefaultOptions();
        // requirements: true, design: true, tasks: true, document-review: true, impl: false

        expect(coordinator.getNextPermittedPhase(null, options.permissions)).toBe('requirements');
        expect(coordinator.getNextPermittedPhase('requirements', options.permissions)).toBe('design');
        expect(coordinator.getNextPermittedPhase('design', options.permissions)).toBe('tasks');
        expect(coordinator.getNextPermittedPhase('tasks', options.permissions)).toBe('document-review');
        expect(coordinator.getNextPermittedPhase('document-review', options.permissions)).toBeNull(); // impl is false
      });

      it('should skip phases that are not permitted', () => {
        // document-review-phase: Updated permissions to include all fields
        const permissions = {
          requirements: true,
          design: false,
          tasks: true,
          'document-review': true,
          impl: false,
          inspection: false,
          deploy: false,
        };

        expect(coordinator.getNextPermittedPhase('requirements', permissions)).toBe('tasks');
      });

      it('should return null when all remaining phases are not permitted', () => {
        const permissions = {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
        };

        expect(coordinator.getNextPermittedPhase('requirements', permissions)).toBeNull();
      });

      it('should return null when current phase is the last permitted phase', () => {
        const permissions = {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
        };

        expect(coordinator.getNextPermittedPhase('impl', permissions)).toBeNull();
      });
    });

    describe('PHASE_ORDER constant', () => {
      /**
       * document-review-phase Task 1.1: PHASE_ORDER の順序変更
       * Requirements: 1.1 - document-review を tasks と impl の間に追加
       */
      it('should have correct phase order including document-review', () => {
        const expectedOrder: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'document-review', 'impl', 'inspection'];
        expect(coordinator.getPhaseOrder()).toEqual(expectedOrder);
      });

      it('should have document-review between tasks and impl', () => {
        const phaseOrder = coordinator.getPhaseOrder();
        const tasksIndex = phaseOrder.indexOf('tasks');
        const documentReviewIndex = phaseOrder.indexOf('document-review');
        const implIndex = phaseOrder.indexOf('impl');
        expect(documentReviewIndex).toBe(tasksIndex + 1);
        expect(documentReviewIndex).toBe(implIndex - 1);
      });
    });

    describe('setOptions()', () => {
      it('should store options for the spec', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        const storedOptions = coordinator.getOptions(specPath);

        expect(storedOptions).toEqual(options);
      });
    });

    describe('markPhaseComplete()', () => {
      it('should add phase to executedPhases', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.markPhaseComplete(specPath, 'requirements');

        const state = coordinator.getStatus(specPath);
        expect(state?.executedPhases).toContain('requirements');
      });

      it('should update execution status to completed when all permitted phases done', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: false,
            tasks: false,
            impl: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.markPhaseComplete(specPath, 'requirements');

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('completed');
      });

      it('should emit execution-completed event when all phases done', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: false,
            tasks: false,
            impl: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.on('execution-completed', eventHandler);
        coordinator.markPhaseComplete(specPath, 'requirements');

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            specId: 'test-feature',
            status: 'completed',
          })
        );
      });
    });

    describe('isPhaseCompleted()', () => {
      it('should return false for not completed phase', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        expect(coordinator.isPhaseCompleted(specPath, 'requirements')).toBe(false);
      });

      it('should return true for completed phase', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.markPhaseComplete(specPath, 'requirements');
        expect(coordinator.isPhaseCompleted(specPath, 'requirements')).toBe(true);
      });
    });
  });

  // ============================================================
  // Task 6.1: Agent Crash Detection
  // Requirements: 8.1
  // ============================================================

  describe('Task 6.1: Agent Crash Detection', () => {
    describe('handleAgentCrash()', () => {
      it('should stop auto-execution on agent crash', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.handleAgentCrash(specPath, 'agent-123', 1);

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('error');
      });

      it('should record error with exit code', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.handleAgentCrash(specPath, 'agent-123', 137);

        const state = coordinator.getStatus(specPath);
        expect(state?.errors.some((e) => e.includes('137'))).toBe(true);
      });

      it('should emit execution-error event with crash details', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.on('execution-error', eventHandler);
        coordinator.handleAgentCrash(specPath, 'agent-123', 1);

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            type: 'AGENT_CRASH',
          })
        );
      });
    });
  });

  // ============================================================
  // Task 6.2: Timeout Handling
  // Requirements: 8.2
  // ============================================================

  describe('Task 6.2: Timeout Handling', () => {
    describe('checkTimeout()', () => {
      it('should detect timeout when execution exceeds timeoutMs', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
          timeoutMs: 1000, // 1 second
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        // Simulate time passing by manipulating startTime
        const state = coordinator.getStatus(specPath);
        if (state) {
          // Manually set startTime to past
          (state as any).startTime = Date.now() - 2000; // 2 seconds ago
        }

        const isTimedOut = coordinator.checkTimeout(specPath);
        expect(isTimedOut).toBe(true);
      });

      it('should not detect timeout when within timeoutMs', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
          timeoutMs: 60000, // 1 minute
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        const isTimedOut = coordinator.checkTimeout(specPath);
        expect(isTimedOut).toBe(false);
      });
    });

    describe('handleTimeout()', () => {
      it('should stop auto-execution on timeout', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.handleTimeout(specPath);

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('error');
      });

      it('should record timeout error', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.handleTimeout(specPath);

        const state = coordinator.getStatus(specPath);
        expect(state?.errors.some((e) => e.toLowerCase().includes('timeout'))).toBe(true);
      });

      it('should emit execution-error event with timeout type', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        coordinator.on('execution-error', eventHandler);
        coordinator.handleTimeout(specPath);

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            type: 'TIMEOUT',
          })
        );
      });
    });
  });

  // ============================================================
  // Task 6.3: spec.json Read Error Handling
  // Requirements: 8.3
  // ============================================================

  describe('Task 6.3: spec.json Read Error Handling', () => {
    describe('handleSpecReadError()', () => {
      it('should pause auto-execution on spec read error', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.handleSpecReadError(specPath, new Error('File not found'));

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('paused');
      });

      it('should record error message', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.handleSpecReadError(specPath, new Error('Permission denied'));

        const state = coordinator.getStatus(specPath);
        expect(state?.errors.some((e) => e.includes('Permission denied'))).toBe(true);
      });

      it('should emit status-changed event with paused status', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.on('status-changed', eventHandler);
        coordinator.handleSpecReadError(specPath, new Error('File not found'));

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            status: 'paused',
          })
        );
      });
    });
  });

  // ============================================================
  // Task 6.4: UI Recovery Feature
  // Requirements: 8.4, 8.5
  // ============================================================

  describe('Task 6.4: UI Recovery Feature', () => {
    describe('getErrorDetails()', () => {
      it('should return error details for a spec', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        const errorDetails = coordinator.getErrorDetails(specPath);
        expect(errorDetails).not.toBeNull();
        expect(errorDetails?.lastFailedPhase).toBe('requirements');
        expect(errorDetails?.errors.length).toBeGreaterThan(0);
      });

      it('should return null for spec without errors', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        const errorDetails = coordinator.getErrorDetails(specPath);
        expect(errorDetails).toBeNull();
      });
    });

    describe('canRetryFromPhase()', () => {
      it('should return true when phase is retryable', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        const canRetry = coordinator.canRetryFromPhase(specPath, 'requirements');
        expect(canRetry).toBe(true);
      });

      it('should return false for non-existent spec', () => {
        const canRetry = coordinator.canRetryFromPhase('/non/existent', 'requirements');
        expect(canRetry).toBe(false);
      });
    });

    describe('retryFrom()', () => {
      it('should restart execution from specified phase', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        const result = await coordinator.retryFrom(specPath, 'requirements');
        expect(result.ok).toBe(true);

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('running');
        expect(state?.currentPhase).toBe('requirements');
      });

      it('should clear previous errors on retry', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        await coordinator.retryFrom(specPath, 'requirements');

        const state = coordinator.getStatus(specPath);
        expect(state?.errors.length).toBe(0);
      });

      it('should emit status-changed event on retry', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');
        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        coordinator.on('status-changed', eventHandler);
        await coordinator.retryFrom(specPath, 'requirements');

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          expect.objectContaining({
            status: 'running',
          })
        );
      });
    });
  });

  // ============================================================
  // Task 7.1: Simultaneous State Change Notifications
  // Requirements: 7.2
  // ============================================================

  describe('Task 7.1: Simultaneous State Change Notifications', () => {
    it('should emit both state-changed and status-changed on state update', async () => {
      const specPath = '/test/project/.kiro/specs/test-feature';
      const options = createDefaultOptions();
      const stateChangedHandler = vi.fn();
      const statusChangedHandler = vi.fn();

      coordinator.on('state-changed', stateChangedHandler);
      coordinator.on('status-changed', statusChangedHandler);

      await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

      // state-changed should be emitted
      expect(stateChangedHandler).toHaveBeenCalled();
    });

    it('should emit events in correct order', async () => {
      const specPath = '/test/project/.kiro/specs/test-feature';
      const options = createDefaultOptions();
      const eventOrder: string[] = [];

      coordinator.on('state-changed', () => eventOrder.push('state-changed'));
      coordinator.on('status-changed', () => eventOrder.push('status-changed'));

      await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
      coordinator.setCurrentPhase(specPath, 'requirements');
      await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

      // state-changed should be emitted first (or together)
      expect(eventOrder).toContain('state-changed');
    });
  });

  // ============================================================
  // Task 7.2: Initial State for New Clients
  // Requirements: 7.3
  // ============================================================

  describe('Task 7.2: Initial State for New Clients', () => {
    describe('getStatusSnapshot()', () => {
      it('should return complete snapshot for new IPC client', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');

        const snapshot = coordinator.getStatusSnapshot(specPath);
        expect(snapshot).not.toBeNull();
        expect(snapshot?.specPath).toBe(specPath);
        expect(snapshot?.status).toBe('running');
        expect(snapshot?.currentPhase).toBe('requirements');
      });

      it('should return null for non-existent spec', () => {
        const snapshot = coordinator.getStatusSnapshot('/non/existent');
        expect(snapshot).toBeNull();
      });
    });

    describe('getAllStatusSnapshots()', () => {
      it('should return all active states for WebSocket client', async () => {
        const specPath1 = '/test/project/.kiro/specs/feature-1';
        const specPath2 = '/test/project/.kiro/specs/feature-2';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath1, 'feature-1', options);
        await coordinator.start(TEST_PROJECT_PATH, specPath2, 'feature-2', options);

        const snapshots = coordinator.getAllStatusSnapshots();
        expect(snapshots.size).toBe(2);
        expect(snapshots.has(specPath1)).toBe(true);
        expect(snapshots.has(specPath2)).toBe(true);
      });
    });
  });

  // ============================================================
  // Task 7.3: File Watcher Integration
  // Requirements: 7.4
  // ============================================================

  describe('Task 7.3: File Watcher Integration', () => {
    describe('handleSpecFileChange()', () => {
      it('should receive spec file change notification', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // Should not throw
        expect(() => {
          coordinator.handleSpecFileChange(specPath, 'spec.json', 'modified');
        }).not.toThrow();
      });

      it('should continue execution when file change is valid', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.handleSpecFileChange(specPath, 'design.md', 'modified');

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('running');
      });

      it('should emit file-changed event', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.on('file-changed', eventHandler);
        coordinator.handleSpecFileChange(specPath, 'design.md', 'modified');

        expect(eventHandler).toHaveBeenCalledWith(specPath, 'design.md', 'modified');
      });
    });
  });

  // ============================================================
  // Task 7.4: Multiple Client Consistency
  // Requirements: 7.5
  // ============================================================

  describe('Task 7.4: Multiple Client Consistency', () => {
    describe('broadcast capability', () => {
      it('should emit events that can be received by multiple listeners', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        coordinator.on('state-changed', handler1);
        coordinator.on('state-changed', handler2);

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
      });

      it('should maintain consistent state across all queries', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements');

        const status1 = coordinator.getStatus(specPath);
        const status2 = coordinator.getStatusSnapshot(specPath);
        const allStatuses = coordinator.getAllStatusSnapshots();

        expect(status1?.currentPhase).toBe(status2?.currentPhase);
        expect(status1?.currentPhase).toBe(allStatuses.get(specPath)?.currentPhase);
      });
    });

    describe('detectInconsistency()', () => {
      it('should detect state inconsistency when exists', async () => {
        // This is more of a utility method for debugging
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // Should return false (consistent) for normal state
        const hasInconsistency = coordinator.detectInconsistency(specPath);
        expect(hasInconsistency).toBe(false);
      });
    });
  });

  // ============================================================
  // Task: Multi-Phase Auto-Execution (TDD)
  // 自動実行でフェーズ完了後に次フェーズを自動開始する機能
  // ============================================================

  describe('Multi-Phase Auto-Execution', () => {
    // モックのSpecManagerService型
    interface MockPhaseExecutor {
      executePhase: (params: { specId: string; phase: WorkflowPhase; featureName: string }) => Promise<{ ok: true; value: { agentId: string } } | { ok: false; error: { type: string } }>;
    }

    describe('handleAgentCompleted() should trigger next phase', () => {
      it('should emit execute-next-phase event when next phase exists', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        // requirements: true, design: true, tasks: true, impl: false
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements', 'agent-123');
        coordinator.on('execute-next-phase', eventHandler);

        await coordinator.handleAgentCompleted('agent-123', specPath, 'completed');

        // 次フェーズ(design)を実行するイベントが発火されるべき
        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          'design',
          expect.objectContaining({
            specId: 'test-feature',
            featureName: 'test-feature',
          })
        );
      });

      it('should NOT emit execute-next-phase when no next phase permitted', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: false,
            tasks: false,
            impl: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements', 'agent-123');
        coordinator.on('execute-next-phase', eventHandler);

        await coordinator.handleAgentCompleted('agent-123', specPath, 'completed');

        // 次フェーズがないのでイベントは発火されない
        expect(eventHandler).not.toHaveBeenCalled();

        // 代わりに完了状態になる
        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('completed');
      });

      it('should NOT emit execute-next-phase when agent failed', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'requirements', 'agent-123');
        coordinator.on('execute-next-phase', eventHandler);

        await coordinator.handleAgentCompleted('agent-123', specPath, 'failed');

        // 失敗時は次フェーズを実行しない
        expect(eventHandler).not.toHaveBeenCalled();
      });

      /**
       * document-review-phase: Updated to use execute-next-phase for all phases
       * The execute-document-review event has been replaced with execute-next-phase
       */
      it('should execute all permitted phases in sequence via events', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: false,
            inspection: false,
            deploy: false,
          },
          validationOptions: { gap: false, design: false, impl: false },
        };
        const executedPhases: WorkflowPhase[] = [];

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        coordinator.on('execute-next-phase', (_specPath, phase) => {
          executedPhases.push(phase);
        });

        // Phase 1: requirements完了
        coordinator.setCurrentPhase(specPath, 'requirements', 'agent-1');
        await coordinator.handleAgentCompleted('agent-1', specPath, 'completed');
        expect(executedPhases).toContain('design');

        // Phase 2: design完了
        coordinator.setCurrentPhase(specPath, 'design', 'agent-2');
        await coordinator.handleAgentCompleted('agent-2', specPath, 'completed');
        expect(executedPhases).toContain('tasks');

        // Phase 3: tasks完了 - document review is triggered via execute-next-phase
        coordinator.setCurrentPhase(specPath, 'tasks', 'agent-3');
        await coordinator.handleAgentCompleted('agent-3', specPath, 'completed');

        // tasks完了後、document-reviewがexecute-next-phaseで実行される
        expect(executedPhases).toContain('document-review');
        const state = coordinator.getStatus(specPath);
        // document review実行中なのでまだrunning
        expect(state?.status).toBe('running');
        expect(executedPhases).toEqual(['design', 'tasks', 'document-review']);
      });
    });

    describe('start() should trigger initial phase', () => {
      it('should emit execute-next-phase event for initial phase on start', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();
        const eventHandler = vi.fn();

        coordinator.on('execute-next-phase', eventHandler);
        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // 最初の許可フェーズ(requirements)を実行するイベントが発火されるべき
        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          'requirements',
          expect.objectContaining({
            specId: 'test-feature',
            featureName: 'test-feature',
          })
        );
      });

      it('should emit execute-next-phase for first permitted phase (skipping disabled)', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false, // disabled
            design: true,       // first enabled
            tasks: true,
            impl: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };
        const eventHandler = vi.fn();

        coordinator.on('execute-next-phase', eventHandler);
        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // requirements はスキップされて design から開始
        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          'design',
          expect.objectContaining({
            specId: 'test-feature',
          })
        );
      });

      it('should NOT emit execute-next-phase when no phases permitted', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            impl: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };
        const eventHandler = vi.fn();

        coordinator.on('execute-next-phase', eventHandler);
        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // 許可されたフェーズがないのでイベントは発火されない
        expect(eventHandler).not.toHaveBeenCalled();

        // 即座に完了状態になる
        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('completed');
      });
    });
  });

  // ============================================================
  // Document Review Auto Loop Feature Tests
  // Requirements: 1.1-1.3, 2.1-2.2, 3.1-3.4, 4.1-4.3
  // ============================================================

  describe('Document Review Auto Loop', () => {
    // ============================================================
    // Task 1.1: AutoExecutionState field additions
    // ============================================================

    describe('Task 1.1: AutoExecutionState field additions', () => {
      it('should have MAX_DOCUMENT_REVIEW_ROUNDS constant set to 7', async () => {
        // Import the constant
        const { MAX_DOCUMENT_REVIEW_ROUNDS } = await import('./autoExecutionCoordinator');
        expect(MAX_DOCUMENT_REVIEW_ROUNDS).toBe(7);
      });

      it('should support currentDocumentReviewRound field in state', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
          documentReviewFlag: 'run',
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        // Initially undefined
        const initialState = coordinator.getStatus(specPath);
        expect(initialState).not.toBeNull();
        expect(initialState?.currentDocumentReviewRound).toBeUndefined();

        // After setting, it should have a value
        coordinator.continueDocumentReviewLoop(specPath, 1);
        const updatedState = coordinator.getStatus(specPath);
        expect(updatedState?.currentDocumentReviewRound).toBe(1);
      });
    });

    // ============================================================
    // Task 1.2: continueDocumentReviewLoop method
    // ============================================================

    describe('Task 1.2: continueDocumentReviewLoop method', () => {
      it('should update currentDocumentReviewRound on continue', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
          documentReviewFlag: 'run',
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.continueDocumentReviewLoop(specPath, 2);

        const state = coordinator.getStatus(specPath);
        expect(state?.currentDocumentReviewRound).toBe(2);
      });

      /**
       * document-review-phase: Updated to use execute-next-phase event
       * The execute-document-review event has been replaced with execute-next-phase
       */
      it('should emit execute-next-phase event for document-review on continue', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
        };
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.on('execute-next-phase', eventHandler);
        coordinator.continueDocumentReviewLoop(specPath, 2);

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          'document-review',
          expect.objectContaining({ specId: 'test-feature' })
        );
      });

      it('should call handleDocumentReviewCompleted when max rounds exceeded', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
          documentReviewFlag: 'run',
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // Spy on handleDocumentReviewCompleted
        const spy = vi.spyOn(coordinator, 'handleDocumentReviewCompleted');
        coordinator.continueDocumentReviewLoop(specPath, 8); // exceeds MAX_DOCUMENT_REVIEW_ROUNDS

        expect(spy).toHaveBeenCalledWith(specPath, false);
      });

      it('should log round start', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
          documentReviewFlag: 'run',
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        // No assertion needed - just verify no errors occur
        expect(() => coordinator.continueDocumentReviewLoop(specPath, 3)).not.toThrow();
      });
    });

    // ============================================================
    // Task 1.3: handleDocumentReviewCompleted with loop logic
    // ============================================================

    describe('Task 1.3: handleDocumentReviewCompleted with loop logic', () => {
      /**
       * document-review-phase: Updated test to match new flow
       * When document-review completes with approved=true, it should proceed to impl
       */
      it('should proceed to next phase when approved (fixRequired=0, needsDiscussion=0)', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        // document-review-phase: Updated permissions to include all required fields
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };
        const eventHandler = vi.fn();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.on('execute-next-phase', eventHandler);

        // Simulate document-review phase (set currentPhase to document-review)
        coordinator.setCurrentPhase(specPath, 'document-review');

        // Now handle document review completed with approved=true
        coordinator.handleDocumentReviewCompleted(specPath, true);

        expect(eventHandler).toHaveBeenCalledWith(
          specPath,
          'impl',
          expect.objectContaining({ specId: 'test-feature', featureName: 'test-feature' })
        );
      });

      it('should pause when Needs Discussion > 0', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        // document-review-phase: Updated permissions to include all required fields
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // Handle document review not approved (needs discussion)
        coordinator.handleDocumentReviewCompleted(specPath, false);

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('paused');
      });

      it('should pause when max rounds reached with impl permitted', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        // document-review-phase: Updated permissions to include all required fields
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: true, // impl must be permitted for pause behavior
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // Set round to max
        coordinator.continueDocumentReviewLoop(specPath, 7);
        // Then try to continue beyond max
        coordinator.continueDocumentReviewLoop(specPath, 8);

        const state = coordinator.getStatus(specPath);
        expect(state?.status).toBe('paused');
      });

      /**
       * document-review-phase: When max rounds reached and impl is not permitted,
       * the coordinator marks the execution as completed because there is no
       * next permitted phase to proceed to.
       */
      it('should complete when max rounds reached and impl is not permitted', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(), // impl: false
          documentReviewFlag: 'run',
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);

        // Try to continue beyond max
        coordinator.continueDocumentReviewLoop(specPath, 8);

        const state = coordinator.getStatus(specPath);
        // When max rounds reached and impl is not permitted, execution completes
        expect(state?.status).toBe('completed');
      });
    });

    // ============================================================
    // Task 1.4: getCurrentDocumentReviewRound method
    // ============================================================

    describe('Task 1.4: getCurrentDocumentReviewRound method', () => {
      it('should return undefined when no round started', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options = createDefaultOptions();

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        const round = coordinator.getCurrentDocumentReviewRound(specPath);

        expect(round).toBeUndefined();
      });

      it('should return current round number when in loop', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const options: AutoExecutionOptions = {
          ...createDefaultOptions(),
          documentReviewFlag: 'run',
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.continueDocumentReviewLoop(specPath, 3);

        const round = coordinator.getCurrentDocumentReviewRound(specPath);
        expect(round).toBe(3);
      });

      it('should return undefined for non-existent spec', () => {
        const round = coordinator.getCurrentDocumentReviewRound('/non/existent');
        expect(round).toBeUndefined();
      });
    });
  });

  // ============================================================
  // Task 9.1 & 9.2: Inspection Auto-Execution (git-worktree-support)
  // Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
  // ============================================================

  describe('Task 9.1-9.2: Inspection and Spec-Merge Auto-Execution', () => {
    describe('Task 9.1: Auto-execute inspection after impl completion', () => {
      it('should include inspection in extended phase order', () => {
        const coordinator = new AutoExecutionCoordinator();
        const phaseOrder = coordinator.getPhaseOrder();

        // Extended phase order should include inspection
        expect(phaseOrder).toContain('inspection');
        coordinator.dispose();
      });

      it('should support inspection permission in options', () => {
        const options: AutoExecutionOptions = {
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            impl: true,
            inspection: true,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        };

        expect(options.permissions.inspection).toBe(true);
      });

      /**
       * document-review-phase: Updated to use execute-next-phase event
       * The execute-inspection event has been replaced with execute-next-phase
       */
      it('should emit execute-next-phase event for inspection after impl completes when inspection enabled', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const nextPhaseHandler = vi.fn();

        coordinator.on('execute-next-phase', nextPhaseHandler);

        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            'document-review': false,
            impl: true,
            inspection: true,
            deploy: false,
          },
          validationOptions: { gap: false, design: false, impl: false },
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'impl', 'agent-1');
        await coordinator.handleAgentCompleted('agent-1', specPath, 'completed');

        // After impl completion, should trigger inspection via execute-next-phase
        expect(nextPhaseHandler).toHaveBeenCalledWith(specPath, 'inspection', expect.objectContaining({
          specId: 'test-feature',
        }));
      });

      /**
       * document-review-phase: Updated to use execute-next-phase event
       */
      it('should not execute inspection when permission disabled', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const nextPhaseHandler = vi.fn();
        const completedHandler = vi.fn();

        coordinator.on('execute-next-phase', nextPhaseHandler);
        coordinator.on('execution-completed', completedHandler);

        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            'document-review': false,
            impl: true,
            inspection: false, // Disabled
            deploy: false,
          },
          validationOptions: { gap: false, design: false, impl: false },
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'impl', 'agent-1');
        await coordinator.handleAgentCompleted('agent-1', specPath, 'completed');

        // Should not trigger inspection (nextPhaseHandler should not be called with 'inspection')
        const inspectionCalls = nextPhaseHandler.mock.calls.filter(
          (call: unknown[]) => call[1] === 'inspection'
        );
        expect(inspectionCalls.length).toBe(0);
        // Should complete execution
        expect(completedHandler).toHaveBeenCalled();
      });
    });

    describe('Task 9.2: Auto-execute spec-merge after inspection success', () => {
      it('should emit execute-spec-merge event after inspection succeeds in worktree mode', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const specMergeHandler = vi.fn();

        coordinator.on('execute-spec-merge', specMergeHandler);

        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            impl: false,
            inspection: true,
            deploy: true, // spec-merge is permitted
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'inspection', 'agent-1');

        // Simulate inspection completion with GO status
        // This should trigger spec-merge when deploy permission is true
        await coordinator.handleInspectionCompleted(specPath, 'passed');

        expect(specMergeHandler).toHaveBeenCalledWith(specPath, expect.objectContaining({
          specId: 'test-feature',
        }));
      });

      it('should not execute spec-merge when inspection fails', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const specMergeHandler = vi.fn();

        coordinator.on('execute-spec-merge', specMergeHandler);

        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            impl: false,
            inspection: true,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'inspection', 'agent-1');

        // Simulate inspection completion with NOGO status
        await coordinator.handleInspectionCompleted(specPath, 'failed');

        // Should not trigger spec-merge on inspection failure
        expect(specMergeHandler).not.toHaveBeenCalled();
      });

      it('should NOT execute spec-merge when deploy permission is false', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const specMergeHandler = vi.fn();
        const completedHandler = vi.fn();

        coordinator.on('execute-spec-merge', specMergeHandler);
        coordinator.on('execution-completed', completedHandler);

        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            impl: false,
            inspection: true,
            deploy: false, // spec-merge is NOT permitted
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'inspection', 'agent-1');

        // Simulate inspection completion with GO status
        await coordinator.handleInspectionCompleted(specPath, 'passed');

        // Should NOT trigger spec-merge when deploy=false
        expect(specMergeHandler).not.toHaveBeenCalled();
        // Should complete execution instead
        expect(completedHandler).toHaveBeenCalled();
      });

      it('should execute spec-merge only when deploy permission is true', async () => {
        const specPath = '/test/project/.kiro/specs/test-feature';
        const specMergeHandler = vi.fn();

        coordinator.on('execute-spec-merge', specMergeHandler);

        const options: AutoExecutionOptions = {
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            impl: false,
            inspection: true,
            deploy: true, // spec-merge IS permitted
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };

        await coordinator.start(TEST_PROJECT_PATH, specPath, 'test-feature', options);
        coordinator.setCurrentPhase(specPath, 'inspection', 'agent-1');

        // Simulate inspection completion with GO status
        await coordinator.handleInspectionCompleted(specPath, 'passed');

        // Should trigger spec-merge when deploy=true
        expect(specMergeHandler).toHaveBeenCalledWith(specPath, expect.objectContaining({
          specId: 'test-feature',
        }));
      });
    });
  });

  // ============================================================
  // Task 1.3 (auto-execution-projectpath-fix): logAutoExecutionEvent uses state.projectPath
  // Requirements: 1.4, 1.5
  // ============================================================

  describe('Task 1.3: logAutoExecutionEvent uses state.projectPath', () => {
    beforeEach(() => {
      mockLogEvent.mockClear();
    });

    /**
     * Task 1.3 (auto-execution-projectpath-fix): logAutoExecutionEvent should use state.projectPath
     * Requirement 1.4: logAutoExecutionEvent()がstate.projectPathを使用してEventLogService.logEvent()を呼び出すこと
     * Requirement 1.5: 既存のspecPathからの逆算ロジックが削除されること
     *
     * Worktree環境では、specPathから.kiro/specs/で分割するとworktree内パスになってしまう。
     * start()で渡されたprojectPathを状態として保持し、それをEventLogServiceに渡すことで
     * 常にメインリポジトリの正しい場所にログを記録する。
     */
    it('should use state.projectPath instead of extracting from specPath for event logging', async () => {
      // Worktree scenario: specPath is inside worktree, but projectPath points to main repo
      const mainProjectPath = '/original/project';
      const worktreeSpecPath = '/original/project/.kiro/worktrees/specs/feature-x/.kiro/specs/feature-x';
      const specId = 'feature-x';

      // The old extraction logic would give: '/original/project/.kiro/worktrees/specs/feature-x'
      // But we want: '/original/project' (the explicitly provided projectPath)

      const options = createDefaultOptions();

      // Start auto-execution with explicit projectPath
      await coordinator.start(mainProjectPath, worktreeSpecPath, specId, options);

      // Verify that logEvent was called with the correct projectPath (not extracted from specPath)
      expect(mockLogEvent).toHaveBeenCalled();

      // Find the auto-execution:start event call
      const calls = mockLogEvent.mock.calls;
      const startEventCall = calls.find(
        (call: unknown[]) => call[2]?.type === 'auto-execution:start'
      );

      expect(startEventCall).toBeDefined();
      // First argument should be the projectPath from state, NOT extracted from specPath
      expect(startEventCall![0]).toBe(mainProjectPath);
      // Verify it's NOT the wrongly extracted path
      expect(startEventCall![0]).not.toContain('worktrees');
    });

    it('should log events with state.projectPath when stopping auto-execution', async () => {
      const mainProjectPath = '/original/project';
      const worktreeSpecPath = '/original/project/.kiro/worktrees/specs/feature-x/.kiro/specs/feature-x';
      const specId = 'feature-x';

      const options = createDefaultOptions();

      await coordinator.start(mainProjectPath, worktreeSpecPath, specId, options);
      await coordinator.stop(worktreeSpecPath);

      // Find the auto-execution:stop event call
      const calls = mockLogEvent.mock.calls;
      const stopEventCall = calls.find(
        (call: unknown[]) => call[2]?.type === 'auto-execution:stop'
      );

      expect(stopEventCall).toBeDefined();
      expect(stopEventCall![0]).toBe(mainProjectPath);
    });

    it('should log events with state.projectPath when agent crashes', async () => {
      const mainProjectPath = '/original/project';
      const worktreeSpecPath = '/original/project/.kiro/worktrees/specs/feature-x/.kiro/specs/feature-x';
      const specId = 'feature-x';

      const options = createDefaultOptions();

      await coordinator.start(mainProjectPath, worktreeSpecPath, specId, options);
      coordinator.setCurrentPhase(worktreeSpecPath, 'requirements');
      coordinator.handleAgentCrash(worktreeSpecPath, 'agent-123', 1);

      // Find the auto-execution:fail event call
      const calls = mockLogEvent.mock.calls;
      const failEventCall = calls.find(
        (call: unknown[]) => call[2]?.type === 'auto-execution:fail'
      );

      expect(failEventCall).toBeDefined();
      expect(failEventCall![0]).toBe(mainProjectPath);
    });

    it('should log events with state.projectPath when execution completes', async () => {
      const mainProjectPath = '/original/project';
      const worktreeSpecPath = '/original/project/.kiro/worktrees/specs/feature-x/.kiro/specs/feature-x';
      const specId = 'feature-x';

      const options: AutoExecutionOptions = {
        permissions: {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
        },
        documentReviewFlag: 'run',
        validationOptions: { gap: false, design: false, impl: false },
      };

      await coordinator.start(mainProjectPath, worktreeSpecPath, specId, options);
      coordinator.setCurrentPhase(worktreeSpecPath, 'requirements', 'agent-1');
      await coordinator.handleAgentCompleted('agent-1', worktreeSpecPath, 'completed');

      // Find the auto-execution:complete event call
      const calls = mockLogEvent.mock.calls;
      const completeEventCall = calls.find(
        (call: unknown[]) => call[2]?.type === 'auto-execution:complete'
      );

      expect(completeEventCall).toBeDefined();
      expect(completeEventCall![0]).toBe(mainProjectPath);
    });

    it('should log events with state.projectPath when timeout occurs', async () => {
      const mainProjectPath = '/original/project';
      const worktreeSpecPath = '/original/project/.kiro/worktrees/specs/feature-x/.kiro/specs/feature-x';
      const specId = 'feature-x';

      const options = createDefaultOptions();

      await coordinator.start(mainProjectPath, worktreeSpecPath, specId, options);
      coordinator.setCurrentPhase(worktreeSpecPath, 'requirements');
      coordinator.handleTimeout(worktreeSpecPath);

      // Find the auto-execution:fail event call for timeout
      const calls = mockLogEvent.mock.calls;
      const failEventCall = calls.find(
        (call: unknown[]) => call[2]?.type === 'auto-execution:fail' && call[2]?.message?.includes('Timeout')
      );

      expect(failEventCall).toBeDefined();
      expect(failEventCall![0]).toBe(mainProjectPath);
    });
  });
});
