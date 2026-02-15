/**
 * Agent Store Tests (Action-Only Facade)
 * TDD: Testing agent actions and their effects on SSOT
 * Requirements: 5.1-5.8, 9.1-9.10
 * trpc-full-migration Task 6.2: Agent operations migrated to tRPC
 * agent-facade-action-only Task 6.2: Updated to action-only structure
 *
 * Architecture:
 * - useAgentStore: Action-only facade (no state fields)
 * - useSharedAgentStore: SSOT for all agent state
 * - Tests verify that actions correctly update SSOT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAgentStore, resetAgentStore, type AgentInfo, type AgentStatus } from './agentStore';
import { useSharedAgentStore, resetSharedAgentStore } from '@shared/stores/agentStore';
// Bug fix: agent-log-dynamic-import-issue - Import stores for state-based mocking
import { useSpecDetailStore } from './spec/specDetailStore';
// bugs-view-unification Task 6.1: Use shared bugStore
import { useSharedBugStore, resetSharedBugStore } from '../../shared/stores/bugStore';

// trpc-full-migration Task 6.2: Mock tRPC vanilla client for agent operations
// Task 9.2: Added events namespace for tRPC Subscription mocks
type SubscribeOptions = { onData?: (data: unknown) => void; onError?: (err: unknown) => void; onComplete?: () => void };
const eventSubscribers: Record<string, ((data: unknown) => void)[]> = {};

function createMockSubscription(eventName: string) {
  return {
    subscribe: (_input: unknown, opts?: SubscribeOptions) => {
      if (!eventSubscribers[eventName]) eventSubscribers[eventName] = [];
      if (opts?.onData) eventSubscribers[eventName].push(opts.onData);
      return { unsubscribe: vi.fn() };
    },
  };
}

function emitMockEvent(eventName: string, data: unknown) {
  (eventSubscribers[eventName] || []).forEach((cb) => cb(data));
}

const mockVanillaClient = {
  agent: {
    getAllAgents: { query: vi.fn() },
    getRunningAgentCounts: { query: vi.fn() },
    getLogs: { query: vi.fn() },
  },
  events: {
    onAgentRecordChanged: createMockSubscription('onAgentRecordChanged'),
  },
};
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

// Mock agentStoreAdapter
vi.mock('./agentStoreAdapter', () => ({
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

// Import mocked adapter
import { agentOperations, skipPermissionsOperations } from './agentStoreAdapter';

// Mock agent data
const mockAgentInfo: AgentInfo = {
  agentId: 'agent-1',
  specId: 'spec-1',
  phase: 'requirements',
  pid: 12345,
  sessionId: 'session-abc',
  status: 'running' as AgentStatus,
  startedAt: '2024-01-01T00:00:00Z',
  lastActivityAt: '2024-01-01T00:01:00Z',
  command: 'claude',
};

const mockAgentInfo2: AgentInfo = {
  agentId: 'agent-2',
  specId: 'spec-1',
  phase: 'design',
  pid: 12346,
  sessionId: 'session-def',
  status: 'completed' as AgentStatus,
  startedAt: '2024-01-01T00:02:00Z',
  lastActivityAt: '2024-01-01T00:03:00Z',
  command: 'claude',
};

const mockAgentInfo3: AgentInfo = {
  agentId: 'agent-3',
  specId: 'spec-2',
  phase: 'tasks',
  pid: 12347,
  sessionId: 'session-ghi',
  status: 'interrupted' as AgentStatus,
  startedAt: '2024-01-01T00:04:00Z',
  lastActivityAt: '2024-01-01T00:05:00Z',
  command: 'claude',
};

describe('useAgentStore (Action-Only Facade)', () => {
  beforeEach(() => {
    // Reset SSOT first, then facade
    resetSharedAgentStore();
    resetAgentStore();
    vi.clearAllMocks();
  });

  // ============================================================
  // agent-facade-action-only Task 6.2: Action-only structure verification
  // ============================================================
  describe('Action-only structure', () => {
    it('should have no state fields (action-only)', () => {
      const state = useAgentStore.getState();
      // Verify no state fields exist - only action methods
      expect(state.agents).toBeUndefined();
      expect(state.selectedAgentId).toBeUndefined();
      expect(state.logs).toBeUndefined();
      expect(state.isLoading).toBeUndefined();
      expect(state.error).toBeUndefined();
      expect(state.skipPermissions).toBeUndefined();
      expect(state.runningAgentCounts).toBeUndefined();
    });

    it('should have all action methods', () => {
      const state = useAgentStore.getState();
      // Verify action methods exist
      expect(typeof state.loadAgents).toBe('function');
      expect(typeof state.selectAgent).toBe('function');
      expect(typeof state.ensureLogsLoaded).toBe('function');
      expect(typeof state.addAgent).toBe('function');
      expect(typeof state.startAgent).toBe('function');
      expect(typeof state.stopAgent).toBe('function');
      expect(typeof state.resumeAgent).toBe('function');
      expect(typeof state.removeAgent).toBe('function');
      expect(typeof state.sendInput).toBe('function');
      expect(typeof state.updateAgentStatus).toBe('function');
      expect(typeof state.appendLog).toBe('function');
      expect(typeof state.clearLogs).toBe('function');
      expect(typeof state.getLogsForAgent).toBe('function');
      expect(typeof state.setupEventListeners).toBe('function');
      expect(typeof state.getAgentById).toBe('function');
      expect(typeof state.getSelectedAgent).toBe('function');
      expect(typeof state.findAgentById).toBe('function');
      expect(typeof state.clearError).toBe('function');
      expect(typeof state.selectForProjectAgents).toBe('function');
      expect(typeof state.setSkipPermissions).toBe('function');
      expect(typeof state.loadSkipPermissions).toBe('function');
    });
  });

  // ============================================================
  // Agent Operations - actions update SSOT
  // ============================================================
  describe('Agent operation actions (update SSOT)', () => {
    describe('loadAgents', () => {
      it('should load agents from tRPC and update SSOT', async () => {
        const mockAgentsRecord: Record<string, AgentInfo[]> = {
          'spec-1': [mockAgentInfo, mockAgentInfo2],
          'spec-2': [mockAgentInfo3],
        };
        mockVanillaClient.agent.getAllAgents.query.mockResolvedValue(mockAgentsRecord);

        await useAgentStore.getState().loadAgents();

        const ssot = useSharedAgentStore.getState();
        expect(ssot.agents.get('spec-1')).toHaveLength(2);
        expect(ssot.agents.get('spec-2')).toHaveLength(1);
      });

      it('should set isLoading in SSOT during load', async () => {
        mockVanillaClient.agent.getAllAgents.query.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ 'spec-1': [mockAgentInfo] }), 100)
            )
        );

        const loadPromise = useAgentStore.getState().loadAgents();

        expect(useSharedAgentStore.getState().isLoading).toBe(true);

        await loadPromise;

        expect(useSharedAgentStore.getState().isLoading).toBe(false);
      });

      it('should handle load error and update SSOT', async () => {
        mockVanillaClient.agent.getAllAgents.query.mockRejectedValue(new Error('Network error'));

        await useAgentStore.getState().loadAgents();

        const ssot = useSharedAgentStore.getState();
        expect(ssot.error).toBe('Network error');
        expect(ssot.isLoading).toBe(false);
      });
    });

    describe('selectAgent', () => {
      it('should set selectedAgentId in SSOT', async () => {
        await useAgentStore.getState().selectAgent('agent-1');

        expect(useSharedAgentStore.getState().selectedAgentId).toBe('agent-1');
      });

      it('should allow selecting null', async () => {
        await useAgentStore.getState().selectAgent('agent-1');
        await useAgentStore.getState().selectAgent(null);

        expect(useSharedAgentStore.getState().selectedAgentId).toBeNull();
      });

      it('should NOT call loadAgentLogs - selection only updates state', async () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        await useAgentStore.getState().selectAgent('agent-1');
        expect(agentOperations.loadAgentLogs).not.toHaveBeenCalled();
      });
    });

    describe('ensureLogsLoaded', () => {
      it('should load logs for completed agent even if some logs exist', async () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo2); // status: 'completed'
        useAgentStore.getState().appendLog('agent-2', {
          id: 'log-1',
          type: 'text',
          timestamp: Date.now(),
          text: { content: 'partial', role: 'assistant' },
        });

        mockVanillaClient.agent.getLogs.query.mockResolvedValue([
          { id: 'log-1', type: 'text', timestamp: Date.now(), text: { content: 'partial', role: 'assistant' } },
          { id: 'log-2', type: 'text', timestamp: Date.now(), text: { content: 'complete', role: 'assistant' } },
        ]);

        await useAgentStore.getState().ensureLogsLoaded('agent-2');

        expect(mockVanillaClient.agent.getLogs.query).toHaveBeenCalledWith({
          specId: 'spec-1',
          agentId: 'agent-2',
        });
      });

      it('should NOT load logs for running agent if some logs exist', async () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo); // status: 'running'
        useAgentStore.getState().appendLog('agent-1', {
          id: 'log-1',
          type: 'text',
          timestamp: Date.now(),
          text: { content: 'realtime', role: 'assistant' },
        });

        await useAgentStore.getState().ensureLogsLoaded('agent-1');

        expect(mockVanillaClient.agent.getLogs.query).not.toHaveBeenCalled();
      });

      it('should load logs for running agent if no logs exist', async () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo); // status: 'running'
        mockVanillaClient.agent.getLogs.query.mockResolvedValue([]);

        await useAgentStore.getState().ensureLogsLoaded('agent-1');

        expect(mockVanillaClient.agent.getLogs.query).toHaveBeenCalledWith({
          specId: 'spec-1',
          agentId: 'agent-1',
        });
      });
    });

    describe('startAgent', () => {
      it('should call adapter and return agentId', async () => {
        (agentOperations.startAgent as ReturnType<typeof vi.fn>).mockResolvedValue('agent-1');

        const result = await useAgentStore.getState().startAgent('spec-1', 'requirements', ['-p'], undefined, undefined, 'claude');

        expect(agentOperations.startAgent).toHaveBeenCalledWith(
          'spec-1', 'requirements', ['-p'], undefined, undefined, 'claude'
        );
        expect(result).toBe('agent-1');
      });

      it('should handle start error and update SSOT error', async () => {
        (agentOperations.startAgent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Spawn failed'));

        await useAgentStore.getState().startAgent('spec-1', 'requirements', ['-p'], undefined, undefined, 'claude');

        expect(useSharedAgentStore.getState().error).toBe('Spawn failed');
      });
    });

    describe('stopAgent', () => {
      it('should call adapter to stop agent', async () => {
        (agentOperations.stopAgent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await useAgentStore.getState().stopAgent('agent-1');

        expect(agentOperations.stopAgent).toHaveBeenCalledWith('agent-1');
      });

      it('should handle stop error and update SSOT', async () => {
        (agentOperations.stopAgent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Process not found'));

        await useAgentStore.getState().stopAgent('agent-1');

        expect(useSharedAgentStore.getState().error).toBe('Process not found');
      });
    });

    describe('resumeAgent', () => {
      it('should call adapter to resume agent', async () => {
        (agentOperations.resumeAgent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await useAgentStore.getState().resumeAgent('agent-1');

        expect(agentOperations.resumeAgent).toHaveBeenCalledWith('agent-1', undefined);
      });

      it('should handle resume error and update SSOT', async () => {
        (agentOperations.resumeAgent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Session not found'));

        await useAgentStore.getState().resumeAgent('agent-1');

        expect(useSharedAgentStore.getState().error).toBe('Session not found');
      });
    });

    describe('sendInput', () => {
      it('should call adapter to send input', async () => {
        (agentOperations.sendInput as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await useAgentStore.getState().sendInput('agent-1', 'test input');

        expect(agentOperations.sendInput).toHaveBeenCalledWith('agent-1', 'test input');
      });

      it('should handle send input error and update SSOT', async () => {
        (agentOperations.sendInput as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Agent not found'));

        await useAgentStore.getState().sendInput('agent-1', 'test input');

        expect(useSharedAgentStore.getState().error).toBe('Agent not found');
      });
    });

    describe('updateAgentStatus', () => {
      it('should update agent status in SSOT', () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        useAgentStore.getState().updateAgentStatus('agent-1', 'completed');

        const agent = useSharedAgentStore.getState().agents.get('spec-1')?.find((a) => a.agentId === 'agent-1');
        expect(agent?.status).toBe('completed');
      });

      it('should not throw for unknown agent', () => {
        expect(() => {
          useAgentStore.getState().updateAgentStatus('unknown-agent', 'completed');
        }).not.toThrow();
      });
    });

    describe('addAgent', () => {
      it('should add agent to SSOT', () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        const ssot = useSharedAgentStore.getState();
        const specAgents = ssot.agents.get('spec-1');
        expect(specAgents).toHaveLength(1);
        expect(specAgents?.[0].agentId).toBe('agent-1');
      });

      it('should not create duplicate when adding same agentId twice', () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        const specAgents = useSharedAgentStore.getState().agents.get('spec-1');
        expect(specAgents).toHaveLength(1);
      });

      it('should update existing agent info when adding same agentId with different data', () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        const updatedAgent: AgentInfo = {
          ...mockAgentInfo,
          status: 'completed' as AgentStatus,
          lastActivityAt: '2024-01-01T00:10:00Z',
        };
        useAgentStore.getState().addAgent('spec-1', updatedAgent);

        const specAgents = useSharedAgentStore.getState().agents.get('spec-1');
        expect(specAgents).toHaveLength(1);
        expect(specAgents?.[0].status).toBe('completed');
      });
    });
  });

  // ============================================================
  // Log Management
  // ============================================================
  describe('Log management', () => {
    describe('appendLog', () => {
      it('should add log entry to SSOT', () => {
        useAgentStore.getState().appendLog('agent-1', {
          id: 'log-1',
          type: 'text',
          timestamp: Date.now(),
          text: { content: 'Hello World', role: 'assistant' },
        });

        const logs = useSharedAgentStore.getState().logs.get('agent-1');
        expect(logs).toHaveLength(1);
      });

      it('should append to existing logs', () => {
        useAgentStore.getState().appendLog('agent-1', {
          id: 'log-1',
          type: 'text',
          timestamp: Date.now(),
          text: { content: 'First', role: 'assistant' },
        });
        useAgentStore.getState().appendLog('agent-1', {
          id: 'log-2',
          type: 'text',
          timestamp: Date.now(),
          text: { content: 'Second', role: 'assistant' },
        });

        const logs = useSharedAgentStore.getState().logs.get('agent-1');
        expect(logs).toHaveLength(2);
      });
    });

    describe('clearLogs', () => {
      it('should clear logs for specific agent in SSOT', () => {
        useAgentStore.getState().appendLog('agent-1', { id: '1', type: 'text', timestamp: Date.now() });
        useAgentStore.getState().appendLog('agent-2', { id: '2', type: 'text', timestamp: Date.now() });

        useAgentStore.getState().clearLogs('agent-1');

        const agent1Logs = useSharedAgentStore.getState().logs.get('agent-1');
        expect(!agent1Logs || agent1Logs.length === 0).toBe(true);
        expect(useSharedAgentStore.getState().logs.get('agent-2')).toHaveLength(1);
      });
    });

    describe('getLogsForAgent', () => {
      it('should return logs from SSOT', () => {
        useAgentStore.getState().appendLog('agent-1', { id: '1', type: 'text', timestamp: Date.now() });

        const logs = useAgentStore.getState().getLogsForAgent('agent-1');
        expect(logs).toHaveLength(1);
      });

      it('should return empty array for unknown agent', () => {
        const logs = useAgentStore.getState().getLogsForAgent('unknown');
        expect(logs).toEqual([]);
      });
    });
  });

  // ============================================================
  // Event Listeners
  // ============================================================
  describe('Event listener setup', () => {
    beforeEach(() => {
      Object.keys(eventSubscribers).forEach((key) => delete eventSubscribers[key]);
    });

    describe('setupEventListeners', () => {
      it('should call setupAgentEventListeners from adapter', async () => {
        const cleanup = useAgentStore.getState().setupEventListeners();

        const { setupAgentEventListeners } = await import('./agentStoreAdapter');
        expect(setupAgentEventListeners).toHaveBeenCalled();

        cleanup();
      });

      it('should subscribe to onAgentRecordChanged via tRPC', () => {
        const spy = vi.spyOn(mockVanillaClient.events.onAgentRecordChanged, 'subscribe');

        const cleanup = useAgentStore.getState().setupEventListeners();

        expect(spy).toHaveBeenCalled();

        cleanup();
      });
    });

    describe('onAgentRecordChanged auto-selection', () => {
      beforeEach(() => {
        Object.keys(eventSubscribers).forEach((key) => delete eventSubscribers[key]);
      });

      it('should auto-select Project Agent (specId="") regardless of selected spec', async () => {
        const projectAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'project-agent-1',
          specId: '',
        };

        mockVanillaClient.agent.getAllAgents.query.mockResolvedValue({
          '': [projectAgent],
        });

        useAgentStore.getState().setupEventListeners();
        emitMockEvent('onAgentRecordChanged', { type: 'add', data: { agentId: 'project-agent-1', specId: '' } });

        await vi.waitFor(() => {
          expect(useSharedAgentStore.getState().selectedAgentId).toBe('project-agent-1');
        });
      });

      it('should auto-select agent when specId matches selected spec', async () => {
        useSpecDetailStore.setState({
          selectedSpec: { name: 'spec-1', path: '/path/spec-1', phase: 'init', updatedAt: '', approvals: { requirements: { generated: false, approved: false }, design: { generated: false, approved: false }, tasks: { generated: false, approved: false } } },
        });

        const matchingAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'matching-agent',
          specId: 'spec-1',
        };

        mockVanillaClient.agent.getAllAgents.query.mockResolvedValue({
          'spec-1': [matchingAgent],
        });

        useAgentStore.getState().setupEventListeners();
        emitMockEvent('onAgentRecordChanged', { type: 'add', data: { agentId: 'matching-agent', specId: 'spec-1' } });

        await vi.waitFor(() => {
          expect(useSharedAgentStore.getState().selectedAgentId).toBe('matching-agent');
        });
      });

      it('should NOT auto-select agent when specId does not match selected spec', async () => {
        useSpecDetailStore.setState({
          selectedSpec: { name: 'spec-A', path: '/path/spec-A', phase: 'init', updatedAt: '', approvals: { requirements: { generated: false, approved: false }, design: { generated: false, approved: false }, tasks: { generated: false, approved: false } } },
        });

        mockVanillaClient.agent.getAllAgents.query.mockResolvedValue({
          'spec-B': [{ ...mockAgentInfo, agentId: 'non-matching', specId: 'spec-B' }],
        });

        useAgentStore.getState().setupEventListeners();
        emitMockEvent('onAgentRecordChanged', { type: 'add', data: { agentId: 'non-matching', specId: 'spec-B' } });

        await vi.waitFor(() => {
          expect(useSharedAgentStore.getState().agents.get('spec-B')).toBeDefined();
        });

        expect(useSharedAgentStore.getState().selectedAgentId).toBeNull();
      });

      it('should auto-select Bug Agent when selected bug matches', async () => {
        useSpecDetailStore.setState({ selectedSpec: null });
        useSharedBugStore.setState({ selectedBugId: 'my-bug' });

        mockVanillaClient.agent.getAllAgents.query.mockResolvedValue({
          'bug:my-bug': [{ ...mockAgentInfo, agentId: 'bug-agent-1', specId: 'bug:my-bug' }],
        });

        useAgentStore.getState().setupEventListeners();
        emitMockEvent('onAgentRecordChanged', { type: 'add', data: { agentId: 'bug-agent-1', specId: 'bug:my-bug' } });

        await vi.waitFor(() => {
          expect(useSharedAgentStore.getState().selectedAgentId).toBe('bug-agent-1');
        });
      });
    });
  });

  // ============================================================
  // Helper Methods
  // ============================================================
  describe('Helper methods', () => {
    describe('getAgentById', () => {
      it('should find agent by id from SSOT', () => {
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-2', mockAgentInfo3);

        const agent = useAgentStore.getState().getAgentById('agent-3');
        expect(agent?.specId).toBe('spec-2');
      });

      it('should return undefined for unknown agent', () => {
        expect(useAgentStore.getState().getAgentById('unknown')).toBeUndefined();
      });
    });

    describe('clearError', () => {
      it('should clear error in SSOT', () => {
        useSharedAgentStore.getState().setError('Some error');

        useAgentStore.getState().clearError();

        expect(useSharedAgentStore.getState().error).toBeNull();
      });
    });

    describe('selectForProjectAgents', () => {
      it('should set selectedAgentId to null in SSOT', () => {
        useSharedAgentStore.getState().selectAgent('agent-1');

        useAgentStore.getState().selectForProjectAgents();

        expect(useSharedAgentStore.getState().selectedAgentId).toBeNull();
      });
    });

    describe('setSkipPermissions', () => {
      it('should update skipPermissions in SSOT', () => {
        useAgentStore.getState().setSkipPermissions(true);

        expect(useSharedAgentStore.getState().skipPermissions).toBe(true);
      });

      it('should toggle skipPermissions via SSOT', () => {
        expect(useSharedAgentStore.getState().skipPermissions).toBe(false);

        useAgentStore.getState().setSkipPermissions(true);
        expect(useSharedAgentStore.getState().skipPermissions).toBe(true);

        useAgentStore.getState().setSkipPermissions(false);
        expect(useSharedAgentStore.getState().skipPermissions).toBe(false);
      });
    });

    describe('AgentInfo extended fields', () => {
      it('should support executionMode field in AgentInfo via SSOT', () => {
        const agentWithMode: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'agent-with-mode',
          executionMode: 'auto',
        };

        useAgentStore.getState().addAgent('spec-1', agentWithMode);

        const agent = useSharedAgentStore.getState().agents.get('spec-1')?.find(a => a.agentId === 'agent-with-mode');
        expect(agent?.executionMode).toBe('auto');
      });

      it('should support retryCount field in AgentInfo via SSOT', () => {
        const agentWithRetry: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'agent-with-retry',
          retryCount: 2,
        };

        useAgentStore.getState().addAgent('spec-1', agentWithRetry);

        const agent = useSharedAgentStore.getState().agents.get('spec-1')?.find(a => a.agentId === 'agent-with-retry');
        expect(agent?.retryCount).toBe(2);
      });
    });

    describe('Running agent count via SSOT', () => {
      it('should count running agents via SSOT getRunningAgentCount', () => {
        useAgentStore.getState().addAgent('spec-1', { ...mockAgentInfo, status: 'running' });

        const count = useSharedAgentStore.getState().getRunningAgentCount('spec-1');
        expect(count).toBe(1);
      });

      it('should return 0 when no agents are running', () => {
        useAgentStore.getState().addAgent('spec-1', { ...mockAgentInfo, status: 'completed' });

        const count = useSharedAgentStore.getState().getRunningAgentCount('spec-1');
        expect(count).toBe(0);
      });

      it('should isolate counts per spec', () => {
        useAgentStore.getState().addAgent('spec-1', { ...mockAgentInfo, agentId: 'r1', specId: 'spec-1', status: 'running' });
        useAgentStore.getState().addAgent('spec-2', { ...mockAgentInfo, agentId: 'c1', specId: 'spec-2', status: 'completed' });

        expect(useSharedAgentStore.getState().getRunningAgentCount('spec-1')).toBe(1);
        expect(useSharedAgentStore.getState().getRunningAgentCount('spec-2')).toBe(0);
      });
    });
  });
});
