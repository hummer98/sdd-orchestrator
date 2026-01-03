/**
 * AutoExecutionStore Tests
 * TDD: Testing auto-execution runtime state management
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAutoExecutionStore } from './autoExecutionStore';
import { DEFAULT_AUTO_EXECUTION_RUNTIME } from './types';

const TEST_SPEC_ID = 'test-feature';

describe('useAutoExecutionStore', () => {
  beforeEach(() => {
    // Reset store state
    useAutoExecutionStore.setState({
      autoExecutionRuntimeMap: new Map(),
    });
  });

  describe('initial state (Req 5.1)', () => {
    it('should have empty autoExecutionRuntimeMap initially', () => {
      const state = useAutoExecutionStore.getState();
      expect(state.autoExecutionRuntimeMap.size).toBe(0);
    });
  });

  describe('getAutoExecutionRuntime (Req 5.2)', () => {
    it('should return default state for unknown specId (Req 5.8)', () => {
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime('unknown-spec');
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.currentAutoPhase).toBeNull();
      expect(runtime.autoExecutionStatus).toBe('idle');
    });

    it('should return stored state for known specId', () => {
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should return a copy, not a reference', () => {
      const runtime1 = useAutoExecutionStore.getState().getAutoExecutionRuntime('unknown-spec');
      const runtime2 = useAutoExecutionStore.getState().getAutoExecutionRuntime('unknown-spec');
      expect(runtime1).toEqual(runtime2);
      expect(runtime1).not.toBe(runtime2);
    });
  });

  describe('setAutoExecutionRunning (Req 5.3)', () => {
    it('should set isAutoExecuting to true for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
    });

    it('should set isAutoExecuting to false for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, false);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
    });

    it('should not affect other specs', () => {
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      const otherRuntime = useAutoExecutionStore.getState().getAutoExecutionRuntime('other-spec');
      expect(otherRuntime.isAutoExecuting).toBe(false);
    });

    it('should preserve other state fields', () => {
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');
      useAutoExecutionStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBe('design');
    });
  });

  describe('setAutoExecutionPhase (Req 5.4)', () => {
    it('should set currentAutoPhase for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBe('design');
    });

    it('should allow setting to null', () => {
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'tasks');
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, null);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBeNull();
    });

    it('should support all workflow phases', () => {
      const phases = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'] as const;
      for (const phase of phases) {
        useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, phase);
        const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.currentAutoPhase).toBe(phase);
      }
    });
  });

  describe('setAutoExecutionStatus (Req 5.5)', () => {
    it('should set autoExecutionStatus to running for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'running');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should set autoExecutionStatus to paused for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'paused');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('paused');
    });

    it('should set autoExecutionStatus to completed for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'completed');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('completed');
    });

    it('should set autoExecutionStatus to error for specific spec', () => {
      useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'error');
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.autoExecutionStatus).toBe('error');
    });

    it('should support all status values', () => {
      const statuses = ['idle', 'running', 'paused', 'completing', 'error', 'completed'] as const;
      for (const status of statuses) {
        useAutoExecutionStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, status);
        const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.autoExecutionStatus).toBe(status);
      }
    });
  });

  describe('startAutoExecution (Req 5.6)', () => {
    it('should set isAutoExecuting to true and status to running for specific spec', () => {
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(true);
      expect(runtime.autoExecutionStatus).toBe('running');
    });

    it('should reset currentAutoPhase to null', () => {
      // First set a phase
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');
      // Then start new auto execution
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.currentAutoPhase).toBeNull();
    });

    it('should allow multiple specs to be executing simultaneously', () => {
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().startAutoExecution('another-spec');

      const runtime1 = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      const runtime2 = useAutoExecutionStore.getState().getAutoExecutionRuntime('another-spec');

      expect(runtime1.isAutoExecuting).toBe(true);
      expect(runtime2.isAutoExecuting).toBe(true);
    });
  });

  describe('stopAutoExecution (Req 5.7)', () => {
    it('should reset auto execution state for specific spec', () => {
      // First start auto execution
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');

      // Then stop
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.currentAutoPhase).toBeNull();
      expect(runtime.autoExecutionStatus).toBe('idle');
    });

    it('should not affect other specs when stopping one', () => {
      // Start both specs
      useAutoExecutionStore.getState().startAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().startAutoExecution('another-spec');

      // Stop only one
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);

      const runtime1 = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      const runtime2 = useAutoExecutionStore.getState().getAutoExecutionRuntime('another-spec');

      expect(runtime1.isAutoExecuting).toBe(false);
      expect(runtime2.isAutoExecuting).toBe(true);
    });

    it('should be idempotent (calling on already stopped spec does not throw)', () => {
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);
      useAutoExecutionStore.getState().stopAutoExecution(TEST_SPEC_ID);

      const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
      expect(runtime.isAutoExecuting).toBe(false);
      expect(runtime.autoExecutionStatus).toBe('idle');
    });
  });

  describe('isolation between specs', () => {
    it('should maintain independent state for each spec', () => {
      // Set different states for different specs
      useAutoExecutionStore.getState().startAutoExecution('spec-a');
      useAutoExecutionStore.getState().setAutoExecutionPhase('spec-a', 'requirements');

      useAutoExecutionStore.getState().startAutoExecution('spec-b');
      useAutoExecutionStore.getState().setAutoExecutionPhase('spec-b', 'design');
      useAutoExecutionStore.getState().setAutoExecutionStatus('spec-b', 'paused');

      const runtimeA = useAutoExecutionStore.getState().getAutoExecutionRuntime('spec-a');
      const runtimeB = useAutoExecutionStore.getState().getAutoExecutionRuntime('spec-b');

      expect(runtimeA.currentAutoPhase).toBe('requirements');
      expect(runtimeA.autoExecutionStatus).toBe('running');

      expect(runtimeB.currentAutoPhase).toBe('design');
      expect(runtimeB.autoExecutionStatus).toBe('paused');
    });
  });
});
