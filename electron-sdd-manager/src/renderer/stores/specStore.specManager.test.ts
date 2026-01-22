/**
 * Spec Store - spec-manager Extensions Tests
 * TDD: Testing spec-manager state management
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
 *
 * execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1)
 * specManagerExecution state is now derived from agentStore via specStoreFacade
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSpecStore } from './specStore';
import { useAgentStore } from './agentStore';
import { useSpecDetailStore } from './spec/specDetailStore';
import { setupAgentStoreSubscription } from './spec/specStoreFacade';
import { useSharedAgentStore } from '@shared/stores/agentStore';

describe('useSpecStore - spec-manager Extensions (execution-store-consolidation)', () => {
  beforeEach(() => {
    // Reset store to initial state via actions instead of setState (for Facade compatibility)
    useSpecStore.getState().clearSelectedSpec();
    useSpecStore.getState().setSpecs([]);
    // Reset agentStore - must reset sharedAgentStore as well since agentStore delegates to it
    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
      skipPermissions: false,
    });
    // Also reset sharedAgentStore (the SSOT)
    useSharedAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      selectedAgentIdBySpec: new Map(),
      logs: new Map(),
      isLoading: false,
      error: null,
    });
    // Set up agentStore subscription for derived state tests
    setupAgentStoreSubscription();
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 7.1: spec-manager用状態管理 (derived from agentStore)
  // execution-store-consolidation: Req 3.1, 3.2, 3.3, 3.4
  // ============================================================
  describe('Task 7.1: specManagerExecution state (derived from agentStore)', () => {
    describe('initial state', () => {
      it('should have isRunning as false initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.isRunning).toBe(false);
      });

      it('should have currentPhase as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.currentPhase).toBeNull();
      });

      it('should have currentSpecId as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.currentSpecId).toBeNull();
      });

      // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)

      it('should have error as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.error).toBeNull();
      });

      it('should have implTaskStatus as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.implTaskStatus).toBeNull();
      });

      it('should have retryCount as 0 initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.retryCount).toBe(0);
      });

      it('should have executionMode as null initially', () => {
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.executionMode).toBeNull();
      });
    });

    // execution-store-consolidation: specManagerExecution is now derived from agentStore (Req 3.1)
    describe('derived state from agentStore', () => {
      it('should derive isRunning from agentStore running agents', () => {
        // Set up a selected spec first
        const mockSpec = {
          name: 'test-spec',
          path: '/test/.kiro/specs/test-spec',
          phase: 'design-generated' as const,
          updatedAt: '2024-01-01T00:00:00Z',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: false },
            tasks: { generated: false, approved: false },
          },
        };
        useSpecDetailStore.setState({ selectedSpec: mockSpec });

        // Add a running agent to sharedAgentStore (SSOT)
        // agentStore.getAgentsForSpec delegates to sharedAgentStore
        const sharedAgents = new Map();
        sharedAgents.set('test-spec', [{
          id: 'agent-1',
          specId: 'test-spec',
          phase: 'design',
          sessionId: 'session-1',
          status: 'running' as const,
          startedAt: '2024-01-01T00:00:00Z',
          lastActivityAt: '2024-01-01T00:00:00Z',
          command: 'test',
          executionMode: 'manual' as const,
          retryCount: 0,
        }]);
        useSharedAgentStore.setState({ agents: sharedAgents });

        // Also update agentStore to trigger its subscription
        // This ensures specStoreFacade.getAggregatedState() picks up the change
        useAgentStore.setState({ agents: new Map(sharedAgents) });

        const state = useSpecStore.getState();
        expect(state.specManagerExecution.isRunning).toBe(true);
        expect(state.specManagerExecution.currentPhase).toBe('design');
        expect(state.specManagerExecution.executionMode).toBe('manual');
      });

      it('should derive implTaskStatus from agent status', () => {
        const mockSpec = {
          name: 'test-spec',
          path: '/test/.kiro/specs/test-spec',
          phase: 'impl' as const,
          updatedAt: '2024-01-01T00:00:00Z',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };
        useSpecDetailStore.setState({ selectedSpec: mockSpec });

        // Add a completed agent to sharedAgentStore (SSOT)
        const sharedAgents = new Map();
        sharedAgents.set('test-spec', [{
          id: 'agent-1',
          specId: 'test-spec',
          phase: 'impl',
          sessionId: 'session-1',
          status: 'completed' as const,
          startedAt: '2024-01-01T00:00:00Z',
          lastActivityAt: '2024-01-01T00:00:00Z',
          command: 'test',
        }]);
        useSharedAgentStore.setState({ agents: sharedAgents });

        // Note: completed agents are not "running", so isRunning should be false
        const state = useSpecStore.getState();
        expect(state.specManagerExecution.isRunning).toBe(false);
      });
    });

    describe('executeSpecManagerGeneration action', () => {
      it('should call execute IPC with unified API', async () => {
        window.electronAPI.execute = vi.fn().mockResolvedValue(undefined);

        await useSpecStore.getState().executeSpecManagerGeneration(
          'test-spec',
          'requirements',
          'test-feature',
          undefined,
          'manual'
        );

        expect(window.electronAPI.execute).toHaveBeenCalledWith({
          type: 'requirements',
          specId: 'test-spec',
          featureName: 'test-feature',
        });
      });

      it('should handle impl phase with taskId', async () => {
        window.electronAPI.execute = vi.fn().mockResolvedValue(undefined);

        await useSpecStore.getState().executeSpecManagerGeneration(
          'test-spec',
          'impl',
          'test-feature',
          '1.1',
          'manual'
        );

        expect(window.electronAPI.execute).toHaveBeenCalledWith({
          type: 'impl',
          specId: 'test-spec',
          featureName: 'test-feature',
          taskId: '1.1',
        });
      });
    });

    // execution-store-consolidation: handleCheckImplResult REMOVED (Req 6.4)

    describe('clearSpecManagerError action', () => {
      it('should clear error in agentStore', () => {
        useAgentStore.setState({ error: 'Some error occurred' });

        useSpecStore.getState().clearSpecManagerError();

        expect(useAgentStore.getState().error).toBeNull();
      });
    });
  });
});

// Test ImplTaskStatus type
describe('ImplTaskStatus type', () => {
  it('should allow updating implTaskStatus (deprecated - now derived)', () => {
    // execution-store-consolidation: updateImplTaskStatus is deprecated
    // Status is now derived from agentStore
    // This test verifies the deprecation warning is logged
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    useSpecStore.getState().updateImplTaskStatus('running');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[specStoreFacade] updateImplTaskStatus is deprecated - status is derived from agentStore'
    );

    consoleSpy.mockRestore();
  });
});
