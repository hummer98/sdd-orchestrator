/**
 * SpecStoreFacade Tests
 * TDD: Testing facade that combines all decomposed stores
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 * execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1, 7.2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSpecStoreFacade, initSpecStoreFacade } from './specStoreFacade';
import { useSpecListStore } from './specListStore';
import { useSpecDetailStore } from './specDetailStore';
import { useAutoExecutionStore } from './autoExecutionStore';
// execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1)
// import { useSpecManagerExecutionStore } from './specManagerExecutionStore';
import { useAgentStore } from '../agentStore';
import type { SpecMetadata } from '../../types';

const mockSpecs: SpecMetadata[] = [
  {
    name: 'feature-a',
    path: '/project/.kiro/specs/feature-a',
    phase: 'design-generated',
    updatedAt: '2024-01-15T10:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: false },
      tasks: { generated: false, approved: false },
    },
  },
  {
    name: 'feature-b',
    path: '/project/.kiro/specs/feature-b',
    phase: 'tasks-generated',
    updatedAt: '2024-01-16T10:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  },
];

const mockSpecJson = {
  feature_name: 'feature-a',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  language: 'ja' as const,
  phase: 'design-generated' as const,
  approvals: mockSpecs[0].approvals,
};

describe('useSpecStoreFacade', () => {
  beforeEach(() => {
    // Reset all child stores
    useSpecListStore.setState({
      specs: [],
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
    });
    useSpecDetailStore.setState({
      selectedSpec: null,
      specDetail: null,
      isLoading: false,
      error: null,
    });
    useAutoExecutionStore.setState({
      autoExecutionRuntimeMap: new Map(),
    });
    // execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1)
    // Reset agentStore instead
    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
      skipPermissions: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('state aggregation (Req 7.1, 7.2)', () => {
    it('should aggregate specs from SpecListStore', () => {
      useSpecListStore.setState({ specs: mockSpecs });

      const state = useSpecStoreFacade.getState();
      expect(state.specs).toHaveLength(2);
      expect(state.specs[0].name).toBe('feature-a');
    });

    it('should aggregate selectedSpec from SpecDetailStore', () => {
      useSpecDetailStore.setState({ selectedSpec: mockSpecs[0] });

      const state = useSpecStoreFacade.getState();
      expect(state.selectedSpec).toEqual(mockSpecs[0]);
    });

    it('should aggregate autoExecutionRuntimeMap from AutoExecutionStore', () => {
      useAutoExecutionStore.getState().startAutoExecution('test-spec');

      const state = useSpecStoreFacade.getState();
      expect(state.autoExecutionRuntimeMap.size).toBe(1);
    });

    // execution-store-consolidation: specManagerExecution derived from agentStore (Req 3.1)
    it('should derive specManagerExecution from agentStore', () => {
      // Set up a selected spec first
      useSpecDetailStore.setState({ selectedSpec: mockSpecs[0] });

      // Add a running agent for the selected spec
      const agents = new Map();
      agents.set('feature-a', [{
        agentId: 'agent-1',
        specId: 'feature-a',
        phase: 'design',
        pid: 123,
        sessionId: 'session-1',
        status: 'running' as const,
        startedAt: '2024-01-01T00:00:00Z',
        lastActivityAt: '2024-01-01T00:00:00Z',
        command: 'test',
        executionMode: 'manual' as const,
        retryCount: 0,
      }]);
      useAgentStore.setState({ agents });

      const state = useSpecStoreFacade.getState();
      expect(state.specManagerExecution.isRunning).toBe(true);
      expect(state.specManagerExecution.currentPhase).toBe('design');
    });
  });

  describe('action delegation (Req 7.3, 7.4)', () => {
    describe('SpecListStore actions', () => {
      // Note: loadSpecs test removed - loadSpecs was replaced by selectProject IPC

      it('should delegate setSpecs to SpecListStore', () => {
        useSpecStoreFacade.getState().setSpecs(mockSpecs);

        expect(useSpecListStore.getState().specs).toHaveLength(2);
      });

      it('should delegate setSortBy to SpecListStore', () => {
        useSpecStoreFacade.getState().setSortBy('name');

        expect(useSpecListStore.getState().sortBy).toBe('name');
      });

      it('should delegate getSortedFilteredSpecs to SpecListStore', () => {
        useSpecListStore.setState({ specs: mockSpecs });

        const result = useSpecStoreFacade.getState().getSortedFilteredSpecs();
        expect(result).toHaveLength(2);
      });
    });

    describe('SpecDetailStore actions', () => {
      it('should delegate selectSpec to SpecDetailStore', async () => {
        window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
        window.electronAPI.readArtifact = vi.fn().mockResolvedValue('');
        window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

        await useSpecStoreFacade.getState().selectSpec(mockSpecs[0]);

        expect(useSpecDetailStore.getState().selectedSpec).toEqual(mockSpecs[0]);
      });

      it('should delegate clearSelectedSpec to SpecDetailStore', () => {
        useSpecDetailStore.setState({ selectedSpec: mockSpecs[0] });

        useSpecStoreFacade.getState().clearSelectedSpec();

        expect(useSpecDetailStore.getState().selectedSpec).toBeNull();
      });

      it('should delegate refreshSpecDetail to SpecDetailStore', async () => {
        useSpecDetailStore.setState({ selectedSpec: mockSpecs[0] });
        window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
        window.electronAPI.readArtifact = vi.fn().mockResolvedValue('');
        window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

        await useSpecStoreFacade.getState().refreshSpecDetail();

        expect(window.electronAPI.readSpecJson).toHaveBeenCalled();
      });
    });

    describe('AutoExecutionStore actions', () => {
      it('should delegate getAutoExecutionRuntime to AutoExecutionStore', () => {
        useAutoExecutionStore.getState().startAutoExecution('test-spec');

        const runtime = useSpecStoreFacade.getState().getAutoExecutionRuntime('test-spec');
        expect(runtime.isAutoExecuting).toBe(true);
      });

      it('should delegate startAutoExecution to AutoExecutionStore', () => {
        useSpecStoreFacade.getState().startAutoExecution('test-spec');

        const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime('test-spec');
        expect(runtime.isAutoExecuting).toBe(true);
      });

      it('should delegate stopAutoExecution to AutoExecutionStore', () => {
        useAutoExecutionStore.getState().startAutoExecution('test-spec');
        useSpecStoreFacade.getState().stopAutoExecution('test-spec');

        const runtime = useAutoExecutionStore.getState().getAutoExecutionRuntime('test-spec');
        expect(runtime.isAutoExecuting).toBe(false);
      });
    });

    // execution-store-consolidation: SpecManagerExecutionStore actions (Req 4.2-4.6)
    // execute-method-unification: Updated to use new execute API
    describe('SpecManagerExecution actions (derived from agentStore)', () => {
      it('should call IPC for executeSpecManagerGeneration', async () => {
        window.electronAPI.execute = vi.fn().mockResolvedValue(undefined);

        await useSpecStoreFacade.getState().executeSpecManagerGeneration(
          'test-spec',
          'design',
          'test-feature',
          undefined,
          'manual'
        );

        expect(window.electronAPI.execute).toHaveBeenCalledWith({
          type: 'design',
          specId: 'test-spec',
          featureName: 'test-feature',
        });
      });

      // execution-store-consolidation: handleCheckImplResult REMOVED (Req 6.4)
      // Task completion state is managed via TaskProgress from tasks.md

      it('should clear error in agentStore via clearSpecManagerError', () => {
        useAgentStore.setState({ error: 'Some error' });

        useSpecStoreFacade.getState().clearSpecManagerError();

        expect(useAgentStore.getState().error).toBeNull();
      });
    });
  });

  describe('isWatching state (Req 7.5)', () => {
    it('should have isWatching state', () => {
      const state = useSpecStoreFacade.getState();
      expect(typeof state.isWatching).toBe('boolean');
    });
  });

  describe('watcher actions (Req 7.6)', () => {
    it('should delegate startWatching to watcher service', async () => {
      window.electronAPI.onSpecsChanged = vi.fn().mockReturnValue(vi.fn());

      // Initialize facade first
      initSpecStoreFacade();

      await useSpecStoreFacade.getState().startWatching();

      expect(useSpecStoreFacade.getState().isWatching).toBe(true);
    });

    it('should delegate stopWatching to watcher service', async () => {
      window.electronAPI.onSpecsChanged = vi.fn().mockReturnValue(vi.fn());
      window.electronAPI.stopSpecsWatcher = vi.fn().mockResolvedValue(undefined);

      // Initialize facade first
      initSpecStoreFacade();

      await useSpecStoreFacade.getState().startWatching();
      await useSpecStoreFacade.getState().stopWatching();

      expect(useSpecStoreFacade.getState().isWatching).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    it('should expose all expected state properties', () => {
      const state = useSpecStoreFacade.getState();

      // SpecListStore state
      expect('specs' in state).toBe(true);
      expect('sortBy' in state).toBe(true);
      expect('sortOrder' in state).toBe(true);
      expect('statusFilter' in state).toBe(true);

      // SpecDetailStore state
      expect('selectedSpec' in state).toBe(true);
      expect('specDetail' in state).toBe(true);

      // Common state
      expect('isLoading' in state).toBe(true);
      expect('error' in state).toBe(true);

      // AutoExecutionStore state
      expect('autoExecutionRuntimeMap' in state).toBe(true);

      // SpecManagerExecutionStore state
      expect('specManagerExecution' in state).toBe(true);

      // Watcher state
      expect('isWatching' in state).toBe(true);
    });

    it('should expose all expected action methods', () => {
      const actions = useSpecStoreFacade.getState();

      // SpecListStore actions
      // Note: loadSpecs removed - replaced by selectProject IPC
      expect(typeof actions.setSpecs).toBe('function');
      expect(typeof actions.setSortBy).toBe('function');
      expect(typeof actions.setSortOrder).toBe('function');
      expect(typeof actions.setStatusFilter).toBe('function');
      expect(typeof actions.getSortedFilteredSpecs).toBe('function');

      // SpecDetailStore actions
      expect(typeof actions.selectSpec).toBe('function');
      expect(typeof actions.clearSelectedSpec).toBe('function');
      expect(typeof actions.refreshSpecDetail).toBe('function');

      // AutoExecutionStore actions
      expect(typeof actions.getAutoExecutionRuntime).toBe('function');
      expect(typeof actions.setAutoExecutionRunning).toBe('function');
      expect(typeof actions.setAutoExecutionPhase).toBe('function');
      expect(typeof actions.setAutoExecutionStatus).toBe('function');
      expect(typeof actions.startAutoExecution).toBe('function');
      expect(typeof actions.stopAutoExecution).toBe('function');

      // SpecManagerExecution actions (derived from agentStore)
      // execution-store-consolidation: handleCheckImplResult REMOVED (Req 6.4)
      expect(typeof actions.executeSpecManagerGeneration).toBe('function');
      expect(typeof actions.updateImplTaskStatus).toBe('function');
      expect(typeof actions.clearSpecManagerError).toBe('function');

      // Watcher actions
      expect(typeof actions.startWatching).toBe('function');
      expect(typeof actions.stopWatching).toBe('function');

      // Sync actions
      expect(typeof actions.updateSpecJson).toBe('function');
      expect(typeof actions.updateArtifact).toBe('function');
      expect(typeof actions.syncDocumentReviewState).toBe('function');
      expect(typeof actions.syncInspectionState).toBe('function');
      expect(typeof actions.syncTaskProgress).toBe('function');
    });
  });
});
