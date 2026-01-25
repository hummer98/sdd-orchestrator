/**
 * BugAutoExecutionCoordinator Test
 * Tests for bug auto-execution coordinator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BugAutoExecutionCoordinator,
  BugAutoExecutionOptions,
  DEFAULT_BUG_AUTO_EXECUTION_TIMEOUT,
  MAX_CONCURRENT_BUG_EXECUTIONS,
  MAX_RETRIES,
} from './bugAutoExecutionCoordinator';
import type { BugWorkflowPhase } from '../../renderer/types/bug';

// Default options for tests
const createDefaultOptions = (): BugAutoExecutionOptions => ({
  permissions: {
    analyze: true,
    fix: true,
    verify: true,
    deploy: false,
  },
});

describe('BugAutoExecutionCoordinator', () => {
  let coordinator: BugAutoExecutionCoordinator;

  beforeEach(() => {
    coordinator = new BugAutoExecutionCoordinator();
  });

  afterEach(() => {
    coordinator.dispose();
  });

  // ============================================================
  // BugAutoExecutionState type - projectPath field (Task 2.1)
  // ============================================================

  describe('BugAutoExecutionState projectPath field', () => {
    it('should have projectPath field defined in BugAutoExecutionState type', async () => {
      // This test verifies that BugAutoExecutionState type has projectPath field
      // Type-level check: state.projectPath should be accessible
      const projectPath = '/test/project';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      const result = await coordinator.start(projectPath, bugPath, 'test-bug', options, null);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Task 2.1: BugAutoExecutionState should have projectPath field
        // At this point, projectPath is populated by the start() method
        // The field should exist in the interface (compilation check)
        // and should be a string (even if empty for now before task 2.2)
        expect('projectPath' in result.value).toBe(true);
        expect(typeof result.value.projectPath).toBe('string');
      }
    });

    it('should preserve projectPath in state retrieved by getStatus()', async () => {
      const projectPath = '/test/project';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      const state = coordinator.getStatus(bugPath);

      expect(state).not.toBeNull();
      if (state) {
        // projectPath should be accessible on the state
        expect('projectPath' in state).toBe(true);
        expect(typeof state.projectPath).toBe('string');
      }
    });
  });

  // ============================================================
  // start() method - projectPath parameter (Task 2.2)
  // ============================================================

  describe('start() method with projectPath parameter (Task 2.2)', () => {
    it('should accept projectPath as first parameter and save it to state', async () => {
      // Task 2.2: start() method signature should be start(projectPath, bugPath, bugName, options, lastCompletedPhase)
      const projectPath = '/test/project';
      const bugPath = '/test/project/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      const result = await coordinator.start(projectPath, bugPath, 'test-bug', options, null);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Requirement 2.2: projectPath should be saved to BugAutoExecutionState
        expect(result.value.projectPath).toBe(projectPath);
      }
    });

    it('should preserve projectPath correctly for worktree environment', async () => {
      // Requirement 2.3: Future event log extension - verify correct projectPath is saved
      // In worktree environment, bugPath contains worktree path but projectPath should be main repo
      const projectPath = '/main/project';
      const bugPath = '/main/project/.kiro/worktrees/specs/feature-x/.kiro/bugs/bug-1';
      const options = createDefaultOptions();

      const result = await coordinator.start(projectPath, bugPath, 'bug-1', options, null);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // projectPath should be the main repo path, not derived from bugPath
        expect(result.value.projectPath).toBe(projectPath);
        expect(result.value.bugPath).toBe(bugPath);
      }
    });

    it('should keep projectPath unchanged across retries', async () => {
      const projectPath = '/test/project';
      const bugPath = '/test/project/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      coordinator.setCurrentPhase(bugPath, 'analyze', 'agent-1');
      await coordinator.handleAgentCompleted('agent-1', bugPath, 'failed');

      const retryResult = await coordinator.retryFrom(bugPath, 'fix');

      expect(retryResult.ok).toBe(true);
      if (retryResult.ok) {
        // projectPath should be preserved after retry
        expect(retryResult.value.projectPath).toBe(projectPath);
      }
    });
  });

  // ============================================================
  // start() method
  // ============================================================

  describe('start() method', () => {
    it('should start auto-execution and set status to running', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      const result = await coordinator.start(projectPath, bugPath, 'test-bug', options, null);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        expect(result.value.bugName).toBe('test-bug');
      }
    });

    it('should return ALREADY_EXECUTING error when bug is already running', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      const result = await coordinator.start(projectPath, bugPath, 'test-bug', options, null);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_EXECUTING');
      }
    });

    it('should emit execute-next-phase event on start', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();
      const eventHandler = vi.fn();

      coordinator.on('execute-next-phase', eventHandler);
      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);

      expect(eventHandler).toHaveBeenCalledWith(
        bugPath,
        'analyze', // First permitted phase
        expect.objectContaining({ bugName: 'test-bug' })
      );
    });

    it('should skip to next phase after lastCompletedPhase', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();
      const eventHandler = vi.fn();

      coordinator.on('execute-next-phase', eventHandler);
      await coordinator.start(projectPath, bugPath, 'test-bug', options, 'analyze');

      expect(eventHandler).toHaveBeenCalledWith(
        bugPath,
        'fix', // Next phase after analyze
        expect.objectContaining({ bugName: 'test-bug' })
      );
    });
  });

  // ============================================================
  // stop() method
  // ============================================================

  describe('stop() method', () => {
    it('should stop running auto-execution and set status to idle', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      const result = await coordinator.stop(bugPath);

      expect(result.ok).toBe(true);
      // State should be removed (not just paused)
      const state = coordinator.getStatus(bugPath);
      expect(state).toBeNull();
    });

    it('should return NOT_EXECUTING error when stopping non-existent', async () => {
      const result = await coordinator.stop('/non-existent/bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_EXECUTING');
      }
    });

    it('should emit state-changed event with idle status on stop', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();
      const eventHandler = vi.fn();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      coordinator.on('state-changed', eventHandler);
      await coordinator.stop(bugPath);

      expect(eventHandler).toHaveBeenCalledWith(
        bugPath,
        expect.objectContaining({
          status: 'idle',
          currentPhase: null,
        })
      );
    });

    it('should clear timeout when stopping', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      await coordinator.stop(bugPath);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should remove state from executionStates after stop', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      expect(coordinator.getStatus(bugPath)).not.toBeNull();

      await coordinator.stop(bugPath);
      expect(coordinator.getStatus(bugPath)).toBeNull();
    });
  });

  // ============================================================
  // getStatus() and getAllStatuses() methods
  // ============================================================

  describe('getStatus() method', () => {
    it('should return null for non-existent bug', () => {
      const state = coordinator.getStatus('/non-existent/bug');
      expect(state).toBeNull();
    });

    it('should return current state for existing bug', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      const state = coordinator.getStatus(bugPath);

      expect(state).not.toBeNull();
      expect(state?.bugPath).toBe(bugPath);
      expect(state?.bugName).toBe('test-bug');
      expect(state?.status).toBe('running');
    });
  });

  describe('getAllStatuses() method', () => {
    it('should return empty map initially', () => {
      const statuses = coordinator.getAllStatuses();
      expect(statuses.size).toBe(0);
    });

    it('should return all current states', async () => {
      const projectPath = '/test';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, '/bug/1', 'bug-1', options, null);
      await coordinator.start(projectPath, '/bug/2', 'bug-2', options, null);

      const statuses = coordinator.getAllStatuses();
      expect(statuses.size).toBe(2);
      expect(statuses.get('/bug/1')?.bugName).toBe('bug-1');
      expect(statuses.get('/bug/2')?.bugName).toBe('bug-2');
    });
  });

  // ============================================================
  // retryFrom() method
  // ============================================================

  describe('retryFrom() method', () => {
    it('should restart from specified phase', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      // Simulate error state
      await coordinator.handleAgentCompleted('agent-1', bugPath, 'failed');

      const result = await coordinator.retryFrom(bugPath, 'fix');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        expect(result.value.currentPhase).toBe('fix');
        expect(result.value.retryCount).toBe(1);
      }
    });

    it('should return MAX_RETRIES_EXCEEDED after max retries', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);

      // Retry MAX_RETRIES times
      for (let i = 0; i < MAX_RETRIES; i++) {
        await coordinator.retryFrom(bugPath, 'fix');
      }

      // Next retry should fail
      const result = await coordinator.retryFrom(bugPath, 'fix');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MAX_RETRIES_EXCEEDED');
      }
    });
  });

  // ============================================================
  // handleAgentCompleted() method
  // ============================================================

  describe('handleAgentCompleted() method', () => {
    it('should update state on agent completion', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      coordinator.setCurrentPhase(bugPath, 'analyze', 'agent-1');

      await coordinator.handleAgentCompleted('agent-1', bugPath, 'completed');

      const state = coordinator.getStatus(bugPath);
      expect(state?.executedPhases).toContain('analyze');
    });

    it('should set error state on agent failure', async () => {
      const projectPath = '/test';
      const bugPath = '/test/.kiro/bugs/test-bug';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, bugPath, 'test-bug', options, null);
      coordinator.setCurrentPhase(bugPath, 'analyze', 'agent-1');

      await coordinator.handleAgentCompleted('agent-1', bugPath, 'failed');

      const state = coordinator.getStatus(bugPath);
      expect(state?.status).toBe('error');
      expect(state?.lastFailedPhase).toBe('analyze');
    });
  });

  // ============================================================
  // Concurrent execution limit
  // ============================================================

  describe('concurrent execution limit', () => {
    it('should return MAX_CONCURRENT_REACHED when limit exceeded', async () => {
      const projectPath = '/test';
      const options = createDefaultOptions();

      // Start MAX_CONCURRENT_BUG_EXECUTIONS bugs
      for (let i = 0; i < MAX_CONCURRENT_BUG_EXECUTIONS; i++) {
        await coordinator.start(projectPath, `/bug/${i}`, `bug-${i}`, options, null);
      }

      // Next one should fail
      const result = await coordinator.start(projectPath, '/bug/extra', 'bug-extra', options, null);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MAX_CONCURRENT_REACHED');
      }
    });
  });

  // ============================================================
  // resetAll() method
  // ============================================================

  describe('resetAll() method', () => {
    it('should clear all states', async () => {
      const projectPath = '/test';
      const options = createDefaultOptions();

      await coordinator.start(projectPath, '/bug/1', 'bug-1', options, null);
      await coordinator.start(projectPath, '/bug/2', 'bug-2', options, null);

      coordinator.resetAll();

      expect(coordinator.getAllStatuses().size).toBe(0);
    });
  });
});
