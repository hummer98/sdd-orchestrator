/**
 * Agent Store Tests
 * TDD: Testing agent state management and actions
 * Requirements: 5.1-5.8, 9.1-9.10
 *
 * agent-store-unification: This file tests the Facade implementation
 * which delegates to shared/agentStore (SSOT) and agentStoreAdapter (IPC)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAgentStore, resetAgentStore, type AgentInfo, type AgentStatus, type LogEntry } from './agentStore';
import { resetSharedAgentStore } from '@shared/stores/agentStore';
// Bug fix: agent-log-dynamic-import-issue - Import stores for state-based mocking
import { useSpecDetailStore } from './spec/specDetailStore';
// bugs-view-unification Task 6.1: Use shared bugStore
import { useSharedBugStore, resetSharedBugStore } from '../../shared/stores/bugStore';

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

describe('useAgentStore', () => {
  beforeEach(() => {
    // Reset both shared store and renderer store
    // agent-store-unification: Need to reset shared store first as Facade syncs from it
    resetSharedAgentStore();
    resetAgentStore();
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 29.1: Agent State Management
  // Requirements: 5.1, 5.2
  // ============================================================
  describe('Task 29.1: Agent state management', () => {
    describe('initial state', () => {
      it('should have empty agents Map initially', () => {
        const state = useAgentStore.getState();
        expect(state.agents).toBeInstanceOf(Map);
        expect(state.agents.size).toBe(0);
      });

      it('should have null selectedAgentId initially', () => {
        const state = useAgentStore.getState();
        expect(state.selectedAgentId).toBeNull();
      });

      it('should have isLoading false initially', () => {
        const state = useAgentStore.getState();
        expect(state.isLoading).toBe(false);
      });

      it('should have empty logs Map initially', () => {
        const state = useAgentStore.getState();
        expect(state.logs).toBeInstanceOf(Map);
        expect(state.logs.size).toBe(0);
      });

      it('should have skipPermissions false initially', () => {
        const state = useAgentStore.getState();
        expect(state.skipPermissions).toBe(false);
      });
    });

    describe('agents Map structure', () => {
      it('should store agents by specId', () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo, mockAgentInfo2]);
        agents.set('spec-2', [mockAgentInfo3]);

        useAgentStore.setState({ agents });

        const state = useAgentStore.getState();
        expect(state.agents.get('spec-1')).toHaveLength(2);
        expect(state.agents.get('spec-2')).toHaveLength(1);
      });

      it('should return agent list for specific specId', () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo, mockAgentInfo2]);

        useAgentStore.setState({ agents });

        const state = useAgentStore.getState();
        const specAgents = state.agents.get('spec-1');
        expect(specAgents?.[0].agentId).toBe('agent-1');
        expect(specAgents?.[1].agentId).toBe('agent-2');
      });
    });
  });

  // ============================================================
  // Task 29.2: Agent Operation Actions
  // Requirements: 5.1-5.8
  // ============================================================
  describe('Task 29.2: Agent operation actions', () => {
    describe('loadAgents', () => {
      it('should load agents from API and update state', async () => {
        const mockAgentsRecord: Record<string, AgentInfo[]> = {
          'spec-1': [mockAgentInfo, mockAgentInfo2],
          'spec-2': [mockAgentInfo3],
        };
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue(mockAgentsRecord);

        await useAgentStore.getState().loadAgents();

        const state = useAgentStore.getState();
        expect(state.agents.get('spec-1')).toHaveLength(2);
        expect(state.agents.get('spec-2')).toHaveLength(1);
      });

      it('should set isLoading during load', async () => {
        window.electronAPI.getAllAgents = vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ 'spec-1': [mockAgentInfo] }), 100)
            )
        );

        const loadPromise = useAgentStore.getState().loadAgents();

        expect(useAgentStore.getState().isLoading).toBe(true);

        await loadPromise;

        expect(useAgentStore.getState().isLoading).toBe(false);
      });

      it('should handle load error', async () => {
        window.electronAPI.getAllAgents = vi.fn().mockRejectedValue(new Error('Network error'));

        await useAgentStore.getState().loadAgents();

        const state = useAgentStore.getState();
        expect(state.error).toBe('Network error');
        expect(state.isLoading).toBe(false);
      });
    });

    describe('selectAgent', () => {
      it('should set selectedAgentId', async () => {
        await useAgentStore.getState().selectAgent('agent-1');

        const state = useAgentStore.getState();
        expect(state.selectedAgentId).toBe('agent-1');
      });

      it('should allow selecting null', async () => {
        await useAgentStore.getState().selectAgent('agent-1');

        await useAgentStore.getState().selectAgent(null);

        const state = useAgentStore.getState();
        expect(state.selectedAgentId).toBeNull();
      });

      it('should load logs when selecting an agent with no cached logs', async () => {
        // agent-store-unification: Facade delegates to adapter for log loading
        // Add agent to store first via addAgent (which updates shared store)
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        await useAgentStore.getState().selectAgent('agent-1');

        expect(agentOperations.loadAgentLogs).toHaveBeenCalledWith('spec-1', 'agent-1');
      });

      it('should not load logs if already cached', async () => {
        // Add agent to store first
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        // Add pre-cached logs via appendLog
        useAgentStore.getState().appendLog('agent-1', { id: 'log-1', stream: 'stdout', data: 'cached', timestamp: Date.now() });

        await useAgentStore.getState().selectAgent('agent-1');

        expect(agentOperations.loadAgentLogs).not.toHaveBeenCalled();
      });
    });

    describe('startAgent', () => {
      it('should call adapter and add agent to state', async () => {
        // agent-store-unification: Facade delegates to adapter, which returns agentId
        (agentOperations.startAgent as ReturnType<typeof vi.fn>).mockResolvedValue('agent-1');

        const result = await useAgentStore.getState().startAgent('spec-1', 'requirements', 'claude', ['-p']);

        // skip-permissions-main-process: skipPermissions is now auto-fetched in Main Process
        expect(agentOperations.startAgent).toHaveBeenCalledWith(
          'spec-1',
          'requirements',
          'claude',
          ['-p'],
          undefined,
          undefined
        );

        expect(result).toBe('agent-1');
      });

      it('should handle start error', async () => {
        (agentOperations.startAgent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Spawn failed'));

        await useAgentStore.getState().startAgent('spec-1', 'requirements', 'claude', ['-p']);

        const state = useAgentStore.getState();
        expect(state.error).toBe('Spawn failed');
      });
    });

    describe('stopAgent', () => {
      it('should call adapter to stop agent', async () => {
        // agent-store-unification: Facade delegates to adapter
        (agentOperations.stopAgent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await useAgentStore.getState().stopAgent('agent-1');

        expect(agentOperations.stopAgent).toHaveBeenCalledWith('agent-1');
      });

      it('should handle stop error', async () => {
        (agentOperations.stopAgent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Process not found'));

        await useAgentStore.getState().stopAgent('agent-1');

        const state = useAgentStore.getState();
        expect(state.error).toBe('Process not found');
      });
    });

    describe('resumeAgent', () => {
      it('should call adapter to resume agent', async () => {
        // agent-store-unification: Facade delegates to adapter
        (agentOperations.resumeAgent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await useAgentStore.getState().resumeAgent('agent-1');

        // skip-permissions-main-process: skipPermissions is now auto-fetched in Main Process
        expect(agentOperations.resumeAgent).toHaveBeenCalledWith('agent-1', undefined);
      });

      it('should handle resume error', async () => {
        (agentOperations.resumeAgent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Session not found'));

        await useAgentStore.getState().resumeAgent('agent-1');

        const state = useAgentStore.getState();
        expect(state.error).toBe('Session not found');
      });

      it('should append user input to logs when prompt is provided', async () => {
        // agent-store-unification: Facade delegates to adapter
        // main-process-log-parser Task 10.4: Mock needs to simulate adapter behavior
        // The adapter adds the stdin log before calling electronAPI.resumeAgent
        // Import shared store synchronously at test level for mock implementation
        const { useSharedAgentStore } = await import('@shared/stores/agentStore');

        (agentOperations.resumeAgent as ReturnType<typeof vi.fn>).mockImplementation(
          async (agentId: string, prompt?: string) => {
            // Simulate what the real adapter does: add stdin log if prompt provided
            if (prompt) {
              useSharedAgentStore.getState().addLog(agentId, {
                id: `stdin-mock-${Date.now()}`,
                type: 'input',
                timestamp: Date.now(),
                text: {
                  content: prompt,
                  role: 'user',
                },
              });
            }
          }
        );

        await useAgentStore.getState().resumeAgent('agent-1', 'カスタムプロンプト');

        // Check that user input was logged as ParsedLogEntry via the adapter mock
        // main-process-log-parser Task 10.4: Updated to check ParsedLogEntry fields
        // Use getLogsForAgent which delegates to shared store (SSOT)
        const logs = useAgentStore.getState().getLogsForAgent('agent-1');
        expect(logs).toBeDefined();
        expect(logs.length).toBe(1);
        expect(logs[0].type).toBe('input');
        expect(logs[0].text?.content).toBe('カスタムプロンプト');

        // skip-permissions-main-process: skipPermissions is now auto-fetched in Main Process
        expect(agentOperations.resumeAgent).toHaveBeenCalledWith('agent-1', 'カスタムプロンプト');
      });
    });

    describe('sendInput', () => {
      it('should call adapter to send input', async () => {
        // agent-store-unification: Facade delegates to adapter
        (agentOperations.sendInput as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await useAgentStore.getState().sendInput('agent-1', 'test input');

        expect(agentOperations.sendInput).toHaveBeenCalledWith('agent-1', 'test input');
      });

      it('should handle send input error', async () => {
        (agentOperations.sendInput as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Agent not found'));

        await useAgentStore.getState().sendInput('agent-1', 'test input');

        const state = useAgentStore.getState();
        expect(state.error).toBe('Agent not found');
      });
    });

    describe('updateAgentStatus', () => {
      it('should update agent status in state', () => {
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        useAgentStore.getState().updateAgentStatus('agent-1', 'completed');

        const state = useAgentStore.getState();
        const agent = state.agents.get('spec-1')?.find((a) => a.agentId === 'agent-1');
        expect(agent?.status).toBe('completed');
      });

      it('should not throw for unknown agent', () => {
        expect(() => {
          useAgentStore.getState().updateAgentStatus('unknown-agent', 'completed');
        }).not.toThrow();
      });
    });
  });

  // ============================================================
  // Task 29.3: Log Management
  // Requirements: 9.1-9.10
  // ============================================================
  describe('Task 29.3: Log management', () => {
    describe('logs Map structure', () => {
      it('should store logs by agentId', () => {
        // agent-store-unification: Use appendLog to add logs
        useAgentStore.getState().appendLog('agent-1', { id: '1', stream: 'stdout', data: 'test', timestamp: Date.now() });

        const state = useAgentStore.getState();
        expect(state.logs.get('agent-1')).toHaveLength(1);
      });
    });

    describe('appendLog', () => {
      it('should add log entry for agent', () => {
        const entry: LogEntry = {
          id: 'log-1',
          stream: 'stdout',
          data: 'Hello World',
          timestamp: Date.now(),
        };

        useAgentStore.getState().appendLog('agent-1', entry);

        const state = useAgentStore.getState();
        const agentLogs = state.logs.get('agent-1');
        expect(agentLogs).toHaveLength(1);
        expect(agentLogs?.[0].data).toBe('Hello World');
      });

      it('should append to existing logs', () => {
        // agent-store-unification: Use appendLog to add logs
        useAgentStore.getState().appendLog('agent-1', {
          id: 'log-1',
          stream: 'stdout',
          data: 'First',
          timestamp: Date.now(),
        });

        const newEntry: LogEntry = {
          id: 'log-2',
          stream: 'stdout',
          data: 'Second',
          timestamp: Date.now(),
        };
        useAgentStore.getState().appendLog('agent-1', newEntry);

        const state = useAgentStore.getState();
        expect(state.logs.get('agent-1')).toHaveLength(2);
      });

      it('should handle stderr entries', () => {
        const entry: LogEntry = {
          id: 'log-1',
          stream: 'stderr',
          data: 'Error message',
          timestamp: Date.now(),
        };

        useAgentStore.getState().appendLog('agent-1', entry);

        const state = useAgentStore.getState();
        expect(state.logs.get('agent-1')?.[0].stream).toBe('stderr');
      });
    });

    describe('clearLogs', () => {
      it('should clear logs for specific agent', () => {
        // agent-store-unification: Use appendLog to add logs
        useAgentStore.getState().appendLog('agent-1', { id: '1', stream: 'stdout', data: 'test', timestamp: Date.now() });
        useAgentStore.getState().appendLog('agent-2', { id: '2', stream: 'stdout', data: 'test2', timestamp: Date.now() });

        useAgentStore.getState().clearLogs('agent-1');

        const state = useAgentStore.getState();
        // agent-store-unification: clearLogs removes the logs (may return empty array or undefined)
        const agent1Logs = state.logs.get('agent-1');
        expect(!agent1Logs || agent1Logs.length === 0).toBe(true);
        expect(state.logs.get('agent-2')).toHaveLength(1);
      });

      it('should handle clearing non-existent agent logs', () => {
        expect(() => {
          useAgentStore.getState().clearLogs('non-existent');
        }).not.toThrow();
      });
    });

    describe('getLogsForAgent', () => {
      it('should return logs for specific agent', () => {
        // agent-store-unification: Use appendLog to add logs
        useAgentStore.getState().appendLog('agent-1', { id: '1', stream: 'stdout', data: 'test', timestamp: Date.now() });

        const agentLogs = useAgentStore.getState().getLogsForAgent('agent-1');
        expect(agentLogs).toHaveLength(1);
      });

      it('should return empty array for unknown agent', () => {
        const agentLogs = useAgentStore.getState().getLogsForAgent('unknown');
        expect(agentLogs).toEqual([]);
      });
    });
  });

  // ============================================================
  // Task 29.4: Event Listener Setup
  // Requirements: 9.1, 5.2
  // agent-store-unification: Event listeners are now handled by adapter
  // ============================================================
  describe('Task 29.4: Event listener setup', () => {
    describe('setupEventListeners', () => {
      it('should call setupAgentEventListeners from adapter', async () => {
        // agent-store-unification: Facade delegates to adapter for event setup
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(vi.fn());

        const cleanup = useAgentStore.getState().setupEventListeners();

        // The setupAgentEventListeners should have been called via the mock
        // Use dynamic import to access the mocked module
        const { setupAgentEventListeners } = await import('./agentStoreAdapter');
        expect(setupAgentEventListeners).toHaveBeenCalled();

        cleanup();
      });

      it('should register onAgentRecordChanged listener', () => {
        const mockCleanup = vi.fn();
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(mockCleanup);

        const cleanup = useAgentStore.getState().setupEventListeners();

        expect(window.electronAPI.onAgentRecordChanged).toHaveBeenCalled();

        cleanup();
        expect(mockCleanup).toHaveBeenCalled();
      });
    });

    describe('cleanup function', () => {
      it('should call all cleanup functions', () => {
        const cleanupRecordChanged = vi.fn();
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(cleanupRecordChanged);

        const cleanup = useAgentStore.getState().setupEventListeners();
        cleanup();

        expect(cleanupRecordChanged).toHaveBeenCalled();
      });
    });

    // ============================================================
    // Bug fix: agent-selection-scope-mismatch
    // Agent追加時の自動選択スコープ制御テスト
    // ============================================================
    // Bug fix: spec-agent-list-not-updating-on-auto-execution
    // Updated tests for new architecture where onAgentRecordChanged receives only event info
    // and loadAgents() is called to fetch full data
    describe('onAgentRecordChanged auto-selection scope (agent-selection-scope-mismatch)', () => {
      let recordChangedCallback: ((type: 'add' | 'change' | 'unlink', eventInfo: { agentId?: string; specId?: string }) => void) | null = null;

      beforeEach(() => {
        // Setup mock event listeners
        window.electronAPI.onAgentOutput = vi.fn().mockReturnValue(vi.fn());
        window.electronAPI.onAgentStatusChange = vi.fn().mockReturnValue(vi.fn());
        window.electronAPI.onAgentRecordChanged = vi.fn().mockImplementation((cb) => {
          recordChangedCallback = cb;
          return vi.fn();
        });
      });

      it('should auto-select Project Agent (specId="") regardless of selected spec', async () => {
        // Mock specStore - any spec selected
        vi.doMock('./specStore', () => ({
          useSpecStore: {
            getState: () => ({ selectedSpec: { name: 'some-spec', path: '/path' } }),
          },
        }));

        const projectAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'project-agent-1',
          specId: '', // Project Agent
        };

        // Mock getAllAgents to return the agent after loadAgents() is called
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue({
          '': [projectAgent],
        });

        useAgentStore.getState().setupEventListeners();

        // Trigger add event with only event info (new architecture)
        recordChangedCallback?.('add', { agentId: 'project-agent-1', specId: '' });

        // Wait for async operations (loadAgents + selectAgent)
        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          expect(state.selectedAgentId).toBe('project-agent-1');
        });
      });

      it('should auto-select agent when specId matches selected spec', async () => {
        // Bug fix: agent-log-dynamic-import-issue - Use state-based mocking instead of vi.doMock
        // Set specDetailStore state directly (specStore is a facade that delegates to specDetailStore)
        useSpecDetailStore.setState({
          selectedSpec: { name: 'spec-1', path: '/path/spec-1', phase: 'init', updatedAt: '', approvals: { requirements: { generated: false, approved: false }, design: { generated: false, approved: false }, tasks: { generated: false, approved: false } } },
        });

        const matchingAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'matching-agent',
          specId: 'spec-1', // Matches selected spec
        };

        // Mock getAllAgents to return the agent after loadAgents() is called
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue({
          'spec-1': [matchingAgent],
        });

        useAgentStore.getState().setupEventListeners();

        // Trigger add event with only event info (new architecture)
        recordChangedCallback?.('add', { agentId: 'matching-agent', specId: 'spec-1' });

        // Wait for async operations
        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          expect(state.selectedAgentId).toBe('matching-agent');
        });
      });

      it('should NOT auto-select agent when specId does not match selected spec', async () => {
        // Bug fix: agent-log-dynamic-import-issue - Use state-based mocking instead of vi.doMock
        useSpecDetailStore.setState({
          selectedSpec: { name: 'spec-A', path: '/path/spec-A', phase: 'init', updatedAt: '', approvals: { requirements: { generated: false, approved: false }, design: { generated: false, approved: false }, tasks: { generated: false, approved: false } } },
        });

        const nonMatchingAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'non-matching-agent',
          specId: 'spec-B', // Does NOT match selected spec
        };

        // Mock getAllAgents to return the agent after loadAgents() is called
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue({
          'spec-B': [nonMatchingAgent],
        });

        useAgentStore.getState().setupEventListeners();

        // Trigger add event with only event info (new architecture)
        recordChangedCallback?.('add', { agentId: 'non-matching-agent', specId: 'spec-B' });

        // Wait for loadAgents to complete
        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          // Agent should be added to Map but NOT selected
          expect(state.agents.get('spec-B')).toBeDefined();
        });

        const state = useAgentStore.getState();
        expect(state.selectedAgentId).toBeNull();
      });

      it('should NOT auto-select agent when no spec is selected', async () => {
        // Bug fix: agent-log-dynamic-import-issue - Use state-based mocking instead of vi.doMock
        useSpecDetailStore.setState({ selectedSpec: null });

        const agent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'orphan-agent',
          specId: 'spec-1',
        };

        // Mock getAllAgents to return the agent after loadAgents() is called
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue({
          'spec-1': [agent],
        });

        useAgentStore.getState().setupEventListeners();

        // Trigger add event with only event info (new architecture)
        recordChangedCallback?.('add', { agentId: 'orphan-agent', specId: 'spec-1' });

        // Wait for loadAgents to complete
        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          // Agent should be added but NOT selected
          expect(state.agents.get('spec-1')).toBeDefined();
        });

        const state = useAgentStore.getState();
        expect(state.selectedAgentId).toBeNull();
      });

      it('should auto-select Bug Agent when selected bug matches', async () => {
        // Bug fix: agent-log-dynamic-import-issue - Use state-based mocking instead of vi.doMock
        // Set specDetailStore state (no spec selected)
        useSpecDetailStore.setState({ selectedSpec: null });

        // bugs-view-unification Task 6.1: Use selectedBugId from shared store
        useSharedBugStore.setState({
          selectedBugId: 'my-bug',
        });

        const bugAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'bug-agent-1',
          specId: 'bug:my-bug', // Bug Agent format
        };

        // Mock getAllAgents to return the agent after loadAgents() is called
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue({
          'bug:my-bug': [bugAgent],
        });

        useAgentStore.getState().setupEventListeners();

        // Trigger add event with only event info (new architecture)
        recordChangedCallback?.('add', { agentId: 'bug-agent-1', specId: 'bug:my-bug' });

        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          expect(state.selectedAgentId).toBe('bug-agent-1');
        });
      });

      it('should NOT auto-select Bug Agent when selected bug does not match', async () => {
        // Bug fix: agent-log-dynamic-import-issue - Use state-based mocking instead of vi.doMock
        useSpecDetailStore.setState({ selectedSpec: null });
        // bugs-view-unification Task 6.1: Use selectedBugId from shared store
        useSharedBugStore.setState({
          selectedBugId: 'other-bug',
        });

        const bugAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'bug-agent-mismatch',
          specId: 'bug:my-bug', // Does NOT match selected bug
        };

        // Mock getAllAgents to return the agent after loadAgents() is called
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue({
          'bug:my-bug': [bugAgent],
        });

        useAgentStore.getState().setupEventListeners();

        // Trigger add event with only event info (new architecture)
        recordChangedCallback?.('add', { agentId: 'bug-agent-mismatch', specId: 'bug:my-bug' });

        // Wait for loadAgents to complete
        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          expect(state.agents.get('bug:my-bug')).toBeDefined();
        });

        const state = useAgentStore.getState();
        expect(state.selectedAgentId).toBeNull();
      });

      it('should still add agent to Map even when not auto-selected', async () => {
        // Bug fix: agent-log-dynamic-import-issue - Use state-based mocking instead of vi.doMock
        useSpecDetailStore.setState({ selectedSpec: null });

        const agent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'added-not-selected',
          specId: 'spec-xyz',
        };

        // Mock getAllAgents to return the agent after loadAgents() is called
        window.electronAPI.getAllAgents = vi.fn().mockResolvedValue({
          'spec-xyz': [agent],
        });

        useAgentStore.getState().setupEventListeners();

        // Trigger add event with only event info (new architecture)
        recordChangedCallback?.('add', { agentId: 'added-not-selected', specId: 'spec-xyz' });

        // Wait for loadAgents to complete
        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          expect(state.agents.get('spec-xyz')).toBeDefined();
        });

        const state = useAgentStore.getState();
        // Agent MUST be in the Map
        const specAgents = state.agents.get('spec-xyz');
        expect(specAgents).toBeDefined();
        expect(specAgents).toHaveLength(1);
        expect(specAgents?.[0].agentId).toBe('added-not-selected');
        // But NOT selected
        expect(state.selectedAgentId).toBeNull();
      });
    });
  });

  // ============================================================
  // Helper Methods
  // ============================================================
  describe('Helper methods', () => {
    describe('getAgentById', () => {
      it('should find agent by id across all specs', () => {
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-2', mockAgentInfo3);

        const agent = useAgentStore.getState().getAgentById('agent-3');
        expect(agent?.specId).toBe('spec-2');
      });

      it('should return undefined for unknown agent', () => {
        const agent = useAgentStore.getState().getAgentById('unknown');
        expect(agent).toBeUndefined();
      });
    });

    describe('getAgentsForSpec', () => {
      it('should return agents for specific spec', () => {
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo2);

        const specAgents = useAgentStore.getState().getAgentsForSpec('spec-1');
        expect(specAgents).toHaveLength(2);
      });

      it('should return empty array for unknown spec', () => {
        const specAgents = useAgentStore.getState().getAgentsForSpec('unknown');
        expect(specAgents).toEqual([]);
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        // agent-store-unification: Set error via setState - error is Facade-specific
        useAgentStore.setState({ error: 'Some error' });

        useAgentStore.getState().clearError();

        expect(useAgentStore.getState().error).toBeNull();
      });
    });

    // ============================================================
    // Task 4.1: getProjectAgents
    // Requirements: 4.2 (sidebar-refactor)
    // プロジェクトエージェント（specIdが空文字、null、undefined）を取得
    // ============================================================
    describe('getProjectAgents', () => {
      it('should return agents with empty string specId', () => {
        const projectAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'project-agent-1',
          specId: '', // 空文字列 = プロジェクトエージェント
          phase: 'project-task',
        };
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('', projectAgent);
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        const projectAgents = useAgentStore.getState().getProjectAgents();
        expect(projectAgents).toHaveLength(1);
        expect(projectAgents[0].agentId).toBe('project-agent-1');
      });

      it('should return empty array when no project agents exist', () => {
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-2', mockAgentInfo3);

        const projectAgents = useAgentStore.getState().getProjectAgents();
        expect(projectAgents).toEqual([]);
      });

      it('should return all project agents from empty specId key', () => {
        const projectAgent1: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'project-1',
          specId: '',
          phase: 'steering',
        };
        const projectAgent2: AgentInfo = {
          ...mockAgentInfo2,
          agentId: 'project-2',
          specId: '',
          phase: 'bug-fix',
        };
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('', projectAgent1);
        useAgentStore.getState().addAgent('', projectAgent2);

        const projectAgents = useAgentStore.getState().getProjectAgents();
        expect(projectAgents).toHaveLength(2);
        expect(projectAgents[0].agentId).toBe('project-1');
        expect(projectAgents[1].agentId).toBe('project-2');
      });

      it('should not include agents with non-empty specId', () => {
        const projectAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'project-1',
          specId: '',
          phase: 'project-task',
        };
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('', projectAgent);
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-2', mockAgentInfo3);

        const projectAgents = useAgentStore.getState().getProjectAgents();
        expect(projectAgents).toHaveLength(1);
        // spec-1やspec-2のエージェントは含まれない
        expect(projectAgents.some(a => a.specId === 'spec-1')).toBe(false);
        expect(projectAgents.some(a => a.specId === 'spec-2')).toBe(false);
      });
    });

    // ============================================================
    // skipPermissions control
    // Skip permissions flag for claude CLI (--dangerously-skip-permissions)
    // ============================================================
    describe('setSkipPermissions', () => {
      it('should set skipPermissions to true', () => {
        useAgentStore.getState().setSkipPermissions(true);

        const state = useAgentStore.getState();
        expect(state.skipPermissions).toBe(true);
      });

      it('should set skipPermissions to false', () => {
        useAgentStore.setState({ skipPermissions: true });

        useAgentStore.getState().setSkipPermissions(false);

        const state = useAgentStore.getState();
        expect(state.skipPermissions).toBe(false);
      });

      it('should toggle skipPermissions', () => {
        expect(useAgentStore.getState().skipPermissions).toBe(false);

        useAgentStore.getState().setSkipPermissions(true);
        expect(useAgentStore.getState().skipPermissions).toBe(true);

        useAgentStore.getState().setSkipPermissions(false);
        expect(useAgentStore.getState().skipPermissions).toBe(false);
      });
    });

    // ============================================================
    // Task 1.1 (execution-store-consolidation): AgentInfo型拡張テスト
    // Requirements: 2.1, 2.2, 2.3
    // ============================================================
    describe('AgentInfo extended fields (execution-store-consolidation)', () => {
      it('should support executionMode field in AgentInfo', () => {
        const agentWithMode: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'agent-with-mode',
          executionMode: 'auto',
        };

        useAgentStore.getState().addAgent('spec-1', agentWithMode);

        const state = useAgentStore.getState();
        const agent = state.agents.get('spec-1')?.find(a => a.agentId === 'agent-with-mode');
        expect(agent?.executionMode).toBe('auto');
      });

      it('should support retryCount field in AgentInfo', () => {
        const agentWithRetry: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'agent-with-retry',
          retryCount: 2,
        };

        useAgentStore.getState().addAgent('spec-1', agentWithRetry);

        const state = useAgentStore.getState();
        const agent = state.agents.get('spec-1')?.find(a => a.agentId === 'agent-with-retry');
        expect(agent?.retryCount).toBe(2);
      });

      it('should allow executionMode and retryCount to be undefined (backward compatible)', () => {
        // Existing AgentInfo without new fields should still work
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        const state = useAgentStore.getState();
        const agent = state.agents.get('spec-1')?.find(a => a.agentId === mockAgentInfo.agentId);
        expect(agent).toBeDefined();
        expect(agent?.executionMode).toBeUndefined();
        expect(agent?.retryCount).toBeUndefined();
      });
    });

// ============================================================
    // Task 7.3 (execution-store-consolidation): 派生値テスト
    // Requirements: 3.1, 3.2, 3.3, 3.4
    // ============================================================
    describe('Derived value computation for execution state (execution-store-consolidation)', () => {
      it('should return isRunning=true when at least one agent has status=running', () => {
        const runningAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'running-agent',
          specId: 'spec-1',
          status: 'running' as AgentStatus,
        };
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', runningAgent);

        const count = useAgentStore.getState().getRunningAgentCount('spec-1');
        expect(count).toBeGreaterThan(0);
        // isRunning = count > 0
        expect(count > 0).toBe(true);
      });

      it('should return isRunning=false when no agent is running', () => {
        const completedAgent: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'completed-agent',
          specId: 'spec-1',
          status: 'completed' as AgentStatus,
        };
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', completedAgent);

        const count = useAgentStore.getState().getRunningAgentCount('spec-1');
        expect(count).toBe(0);
      });

      it('should count multiple running agents correctly (Req 3.4)', () => {
        const runningAgent1: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'running-agent-1',
          specId: 'spec-1',
          status: 'running' as AgentStatus,
          phase: 'impl',
          startedAt: '2024-01-01T00:00:00Z',
        };
        const runningAgent2: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'running-agent-2',
          specId: 'spec-1',
          status: 'running' as AgentStatus,
          phase: 'design',
          startedAt: '2024-01-01T00:01:00Z',
        };
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', runningAgent1);
        useAgentStore.getState().addAgent('spec-1', runningAgent2);

        const count = useAgentStore.getState().getRunningAgentCount('spec-1');
        expect(count).toBe(2);
      });

      it('should isolate running agent counts per spec', () => {
        const runningAgentSpec1: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'running-spec1',
          specId: 'spec-1',
          status: 'running' as AgentStatus,
        };
        const completedAgentSpec2: AgentInfo = {
          ...mockAgentInfo,
          agentId: 'completed-spec2',
          specId: 'spec-2',
          status: 'completed' as AgentStatus,
        };
        // agent-store-unification: Use addAgent to add to shared store
        useAgentStore.getState().addAgent('spec-1', runningAgentSpec1);
        useAgentStore.getState().addAgent('spec-2', completedAgentSpec2);

        expect(useAgentStore.getState().getRunningAgentCount('spec-1')).toBe(1);
        expect(useAgentStore.getState().getRunningAgentCount('spec-2')).toBe(0);
      });
    });

    describe('addAgent duplicate handling', () => {
      it('should not create duplicate when adding same agentId twice', () => {
        // 同じagentIdで2回addAgentを呼び出しても重複しない
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        const state = useAgentStore.getState();
        const specAgents = state.agents.get('spec-1');
        expect(specAgents).toHaveLength(1);
        expect(specAgents?.[0].agentId).toBe('agent-1');
      });

      it('should update existing agent info when adding same agentId with different data', () => {
        // 同じagentIdで異なる情報を追加すると更新される
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);

        const updatedAgent: AgentInfo = {
          ...mockAgentInfo,
          status: 'completed' as AgentStatus,
          lastActivityAt: '2024-01-01T00:10:00Z',
        };
        useAgentStore.getState().addAgent('spec-1', updatedAgent);

        const state = useAgentStore.getState();
        const specAgents = state.agents.get('spec-1');
        expect(specAgents).toHaveLength(1);
        expect(specAgents?.[0].status).toBe('completed');
        expect(specAgents?.[0].lastActivityAt).toBe('2024-01-01T00:10:00Z');
      });

      it('should add different agents without duplication', () => {
        // 異なるagentIdは正しく追加される
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo);
        useAgentStore.getState().addAgent('spec-1', mockAgentInfo2);

        const state = useAgentStore.getState();
        const specAgents = state.agents.get('spec-1');
        expect(specAgents).toHaveLength(2);
        expect(specAgents?.[0].agentId).toBe('agent-1');
        expect(specAgents?.[1].agentId).toBe('agent-2');
      });
    });
  });
});
