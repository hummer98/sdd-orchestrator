/**
 * SpecStoreFacade Tests
 * TDD: Testing facade that combines all decomposed stores
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 * execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1, 7.2)
 * agent-store-unification: agentStore is now a Facade that syncs with shared/agentStore
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoExecutionStore } from './autoExecutionStore';
// execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1)
// import { useSpecManagerExecutionStore } from './specManagerExecutionStore';
import { useAgentStore, resetAgentStore } from '../agentStore';
import { useSharedAgentStore, resetSharedAgentStore } from '@shared/stores/agentStore';
import type { SpecMetadata } from '../../types';

// trpc-full-migration Task 4.3: Mock tRPC vanilla client for file operations
// Task 9.2: Added events namespace for tRPC Subscription mocks
const mockVanillaClient = {
  file: {
    readSpecJson: { query: vi.fn() },
    readArtifact: { query: vi.fn() },
    readSpecs: { query: vi.fn() },
    listMarkdownFilesInSpec: { query: vi.fn().mockResolvedValue([]) },
  },
  // trpc-full-migration Task 5.3: Mock spec procedures
  spec: {
    syncDocumentReview: { mutate: vi.fn() },
    execute: { mutate: vi.fn() },
    stopSpecsWatcher: { mutate: vi.fn() },
  },
  events: {
    onSpecsChanged: {
      subscribe: () => ({ unsubscribe: vi.fn() }),
    },
    onAgentRecordChanged: {
      subscribe: () => ({ unsubscribe: vi.fn() }),
    },
  },
};
vi.mock('../../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

// Mock agentStoreAdapter for agentStore tests
vi.mock('../agentStoreAdapter', () => ({
  agentOperations: {
    startAgent: vi.fn(),
    stopAgent: vi.fn(),
    resumeAgent: vi.fn(),
    removeAgent: vi.fn(),
    sendInput: vi.fn(),
    loadAgentLogs: vi.fn(),
  },
  setupAgentEventListeners: vi.fn(() => vi.fn()),
  skipPermissionsOperations: {
    setSkipPermissions: vi.fn(),
    loadSkipPermissions: vi.fn().mockResolvedValue(false),
  },
}));

import { useSpecStoreFacade, initSpecStoreFacade, setupAgentStoreSubscription } from './specStoreFacade';
import { useSpecListStore } from './specListStore';
import { useSpecDetailStore } from './specDetailStore';

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
    // agent-store-unification: Reset both shared store and renderer store
    resetSharedAgentStore();
    resetAgentStore();
    // Set up agentStore subscription for derived state tests
    setupAgentStoreSubscription();
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
    // agent-store-unification: Use addAgent to properly add agents through the Facade
    it('should derive specManagerExecution from agentStore', () => {
      // Set up a selected spec first
      useSpecDetailStore.setState({ selectedSpec: mockSpecs[0] });

      // Add a running agent for the selected spec using addAgent
      // agent-store-unification: This adds to shared store and syncs to Facade
      useAgentStore.getState().addAgent('feature-a', {
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
      });

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
        mockVanillaClient.file.readSpecJson.query.mockResolvedValue(mockSpecJson);
        mockVanillaClient.file.readArtifact.query.mockResolvedValue('');
        mockVanillaClient.spec.syncDocumentReview.mutate.mockResolvedValue(false);

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
        mockVanillaClient.file.readSpecJson.query.mockResolvedValue(mockSpecJson);
        mockVanillaClient.file.readArtifact.query.mockResolvedValue('');
        mockVanillaClient.spec.syncDocumentReview.mutate.mockResolvedValue(false);

        await useSpecStoreFacade.getState().refreshSpecDetail();

        expect(mockVanillaClient.file.readSpecJson.query).toHaveBeenCalled();
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
      it('should call tRPC for executeSpecManagerGeneration', async () => {
        // trpc-full-migration Task 5.3: execute via tRPC
        mockVanillaClient.spec.execute.mutate.mockResolvedValue(undefined);

        await useSpecStoreFacade.getState().executeSpecManagerGeneration(
          'test-spec',
          'design',
          'test-feature',
          undefined,
          'manual'
        );

        expect(mockVanillaClient.spec.execute.mutate).toHaveBeenCalledWith({
          type: 'design',
          specId: 'test-spec',
          featureName: 'test-feature',
        });
      });

      // execution-store-consolidation: handleCheckImplResult REMOVED (Req 6.4)
      // Task completion state is managed via TaskProgress from tasks.md

      it('should clear error in agentStore via clearSpecManagerError', () => {
        // agent-facade-action-only: error is now on SSOT (useSharedAgentStore)
        useSharedAgentStore.setState({ error: 'Some error' });

        useSpecStoreFacade.getState().clearSpecManagerError();

        // clearError delegates to SSOT
        expect(useSharedAgentStore.getState().error).toBeNull();
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
    // Task 9.2: Now uses tRPC Subscription instead of window.electronAPI.onSpecsChanged
    it('should delegate startWatching to watcher service', async () => {
      // Initialize facade first
      initSpecStoreFacade();

      await useSpecStoreFacade.getState().startWatching();

      expect(useSpecStoreFacade.getState().isWatching).toBe(true);
    });

    it('should delegate stopWatching to watcher service', async () => {
      // trpc-full-migration Task 5.3: stopSpecsWatcher via tRPC
      mockVanillaClient.spec.stopSpecsWatcher.mutate.mockResolvedValue(undefined);

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
