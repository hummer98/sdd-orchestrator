/**
 * Agent Store Tests
 * TDD: Testing agent state management and actions
 * Requirements: 5.1-5.8, 9.1-9.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAgentStore, type AgentInfo, type AgentStatus, type LogEntry } from './agentStore';

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
    // Reset store state
    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
    });
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
        useAgentStore.setState({ selectedAgentId: 'agent-1' });

        await useAgentStore.getState().selectAgent(null);

        const state = useAgentStore.getState();
        expect(state.selectedAgentId).toBeNull();
      });

      it('should load logs when selecting an agent with no cached logs', async () => {
        // Set up mock
        const mockLogs = [
          { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout' as const, data: 'test output' },
        ];
        window.electronAPI.getAgentLogs = vi.fn().mockResolvedValue(mockLogs);

        // Add agent to state first
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        useAgentStore.setState({ agents });

        await useAgentStore.getState().selectAgent('agent-1');

        expect(window.electronAPI.getAgentLogs).toHaveBeenCalledWith('spec-1', 'agent-1');

        const state = useAgentStore.getState();
        const logs = state.logs.get('agent-1');
        expect(logs).toHaveLength(1);
        expect(logs?.[0].data).toBe('test output');
      });

      it('should not load logs if already cached', async () => {
        window.electronAPI.getAgentLogs = vi.fn().mockResolvedValue([]);

        // Add agent and pre-cached logs to state
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        const logs = new Map<string, LogEntry[]>();
        logs.set('agent-1', [{ id: 'log-1', stream: 'stdout', data: 'cached', timestamp: Date.now() }]);
        useAgentStore.setState({ agents, logs });

        await useAgentStore.getState().selectAgent('agent-1');

        expect(window.electronAPI.getAgentLogs).not.toHaveBeenCalled();
      });
    });

    describe('startAgent', () => {
      it('should call API and add agent to state', async () => {
        window.electronAPI.startAgent = vi.fn().mockResolvedValue(mockAgentInfo);

        await useAgentStore.getState().startAgent('spec-1', 'requirements', 'claude', ['-p']);

        expect(window.electronAPI.startAgent).toHaveBeenCalledWith(
          'spec-1',
          'requirements',
          'claude',
          ['-p'],
          undefined,
          undefined,
          false // skipPermissions default
        );

        const state = useAgentStore.getState();
        const specAgents = state.agents.get('spec-1');
        expect(specAgents).toHaveLength(1);
        expect(specAgents?.[0].agentId).toBe('agent-1');
      });

      it('should pass skipPermissions=true when enabled', async () => {
        window.electronAPI.startAgent = vi.fn().mockResolvedValue(mockAgentInfo);

        // Enable skipPermissions
        useAgentStore.getState().setSkipPermissions(true);

        await useAgentStore.getState().startAgent('spec-1', 'requirements', 'claude', ['-p']);

        expect(window.electronAPI.startAgent).toHaveBeenCalledWith(
          'spec-1',
          'requirements',
          'claude',
          ['-p'],
          undefined,
          undefined,
          true // skipPermissions enabled
        );
      });

      it('should add agent to existing spec agents', async () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        useAgentStore.setState({ agents });

        window.electronAPI.startAgent = vi.fn().mockResolvedValue(mockAgentInfo2);

        await useAgentStore.getState().startAgent('spec-1', 'design', 'claude', ['-p']);

        const state = useAgentStore.getState();
        expect(state.agents.get('spec-1')).toHaveLength(2);
      });

      it('should handle start error', async () => {
        window.electronAPI.startAgent = vi.fn().mockRejectedValue(new Error('Spawn failed'));

        await useAgentStore.getState().startAgent('spec-1', 'requirements', 'claude', ['-p']);

        const state = useAgentStore.getState();
        expect(state.error).toBe('Spawn failed');
      });
    });

    describe('stopAgent', () => {
      it('should call API and update agent status', async () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        useAgentStore.setState({ agents });

        window.electronAPI.stopAgent = vi.fn().mockResolvedValue(undefined);

        await useAgentStore.getState().stopAgent('agent-1');

        expect(window.electronAPI.stopAgent).toHaveBeenCalledWith('agent-1');
      });

      it('should handle stop error', async () => {
        window.electronAPI.stopAgent = vi.fn().mockRejectedValue(new Error('Process not found'));

        await useAgentStore.getState().stopAgent('agent-1');

        const state = useAgentStore.getState();
        expect(state.error).toBe('Process not found');
      });
    });

    describe('resumeAgent', () => {
      it('should call API and update agent in state', async () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [{ ...mockAgentInfo, status: 'interrupted' as AgentStatus }]);
        useAgentStore.setState({ agents, skipPermissions: false });

        const resumedAgent: AgentInfo = {
          ...mockAgentInfo,
          status: 'running' as AgentStatus,
          pid: 99999,
        };
        window.electronAPI.resumeAgent = vi.fn().mockResolvedValue(resumedAgent);

        await useAgentStore.getState().resumeAgent('agent-1');

        // skipPermissions defaults to false in initial state
        expect(window.electronAPI.resumeAgent).toHaveBeenCalledWith('agent-1', undefined, false);

        const state = useAgentStore.getState();
        const agent = state.agents.get('spec-1')?.find((a) => a.agentId === 'agent-1');
        expect(agent?.status).toBe('running');
        expect(agent?.pid).toBe(99999);
      });

      it('should handle resume error', async () => {
        window.electronAPI.resumeAgent = vi
          .fn()
          .mockRejectedValue(new Error('Session not found'));

        await useAgentStore.getState().resumeAgent('agent-1');

        const state = useAgentStore.getState();
        expect(state.error).toBe('Session not found');
      });

      it('should append user input to logs when prompt is provided', async () => {
        const agents = new Map<string, AgentInfo[]>([
          ['spec-1', [mockAgentInfo]],
        ]);
        useAgentStore.setState({ agents, logs: new Map(), skipPermissions: false });

        const resumedAgent: AgentInfo = {
          ...mockAgentInfo,
          status: 'running' as AgentStatus,
        };
        window.electronAPI.resumeAgent = vi.fn().mockResolvedValue(resumedAgent);

        await useAgentStore.getState().resumeAgent('agent-1', 'カスタムプロンプト');

        // Check that user input was logged as stdin
        const state = useAgentStore.getState();
        const logs = state.logs.get('agent-1');
        expect(logs).toBeDefined();
        expect(logs?.length).toBe(1);
        expect(logs?.[0].stream).toBe('stdin');
        expect(logs?.[0].data).toBe('カスタムプロンプト');

        // Check that API was called with prompt (skipPermissions defaults to false)
        expect(window.electronAPI.resumeAgent).toHaveBeenCalledWith('agent-1', 'カスタムプロンプト', false);
      });
    });

    describe('sendInput', () => {
      it('should call API to send input', async () => {
        window.electronAPI.sendAgentInput = vi.fn().mockResolvedValue(undefined);

        await useAgentStore.getState().sendInput('agent-1', 'test input');

        expect(window.electronAPI.sendAgentInput).toHaveBeenCalledWith('agent-1', 'test input');
      });

      it('should handle send input error', async () => {
        window.electronAPI.sendAgentInput = vi.fn().mockRejectedValue(new Error('Agent not found'));

        await useAgentStore.getState().sendInput('agent-1', 'test input');

        const state = useAgentStore.getState();
        expect(state.error).toBe('Agent not found');
      });
    });

    describe('updateAgentStatus', () => {
      it('should update agent status in state', () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        useAgentStore.setState({ agents });

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
        const logs = new Map<string, LogEntry[]>();
        logs.set('agent-1', [
          { id: '1', stream: 'stdout', data: 'test', timestamp: Date.now() },
        ]);

        useAgentStore.setState({ logs });

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
        const existingEntry: LogEntry = {
          id: 'log-1',
          stream: 'stdout',
          data: 'First',
          timestamp: Date.now(),
        };
        const logs = new Map<string, LogEntry[]>();
        logs.set('agent-1', [existingEntry]);
        useAgentStore.setState({ logs });

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
        const logs = new Map<string, LogEntry[]>();
        logs.set('agent-1', [
          { id: '1', stream: 'stdout', data: 'test', timestamp: Date.now() },
        ]);
        logs.set('agent-2', [
          { id: '2', stream: 'stdout', data: 'test2', timestamp: Date.now() },
        ]);
        useAgentStore.setState({ logs });

        useAgentStore.getState().clearLogs('agent-1');

        const state = useAgentStore.getState();
        expect(state.logs.get('agent-1')).toEqual([]);
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
        const logs = new Map<string, LogEntry[]>();
        logs.set('agent-1', [
          { id: '1', stream: 'stdout', data: 'test', timestamp: Date.now() },
        ]);
        useAgentStore.setState({ logs });

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
  // ============================================================
  describe('Task 29.4: Event listener setup', () => {
    describe('setupEventListeners', () => {
      it('should register onAgentOutput listener', () => {
        const mockCleanup = vi.fn();
        window.electronAPI.onAgentOutput = vi.fn().mockReturnValue(mockCleanup);
        window.electronAPI.onAgentStatusChange = vi.fn().mockReturnValue(vi.fn());
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(vi.fn());

        const cleanup = useAgentStore.getState().setupEventListeners();

        expect(window.electronAPI.onAgentOutput).toHaveBeenCalled();

        cleanup();
        expect(mockCleanup).toHaveBeenCalled();
      });

      it('should register onAgentStatusChange listener', () => {
        const mockCleanup = vi.fn();
        window.electronAPI.onAgentOutput = vi.fn().mockReturnValue(vi.fn());
        window.electronAPI.onAgentStatusChange = vi.fn().mockReturnValue(mockCleanup);
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(vi.fn());

        const cleanup = useAgentStore.getState().setupEventListeners();

        expect(window.electronAPI.onAgentStatusChange).toHaveBeenCalled();

        cleanup();
        expect(mockCleanup).toHaveBeenCalled();
      });

      it('should append log when onAgentOutput callback is invoked', () => {
        let outputCallback: ((agentId: string, stream: 'stdout' | 'stderr', data: string) => void) | null = null;
        window.electronAPI.onAgentOutput = vi.fn().mockImplementation((cb) => {
          outputCallback = cb;
          return vi.fn();
        });
        window.electronAPI.onAgentStatusChange = vi.fn().mockReturnValue(vi.fn());
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(vi.fn());

        useAgentStore.getState().setupEventListeners();

        // Invoke the callback
        outputCallback?.('agent-1', 'stdout', 'Hello from agent');

        const state = useAgentStore.getState();
        const agentLogs = state.logs.get('agent-1');
        expect(agentLogs).toBeDefined();
        expect(agentLogs?.length).toBeGreaterThan(0);
        expect(agentLogs?.[0].data).toBe('Hello from agent');
      });

      it('should update agent status when onAgentStatusChange callback is invoked', () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        useAgentStore.setState({ agents });

        let statusCallback: ((agentId: string, status: AgentStatus) => void) | null = null;
        window.electronAPI.onAgentOutput = vi.fn().mockReturnValue(vi.fn());
        window.electronAPI.onAgentStatusChange = vi.fn().mockImplementation((cb) => {
          statusCallback = cb;
          return vi.fn();
        });
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(vi.fn());

        useAgentStore.getState().setupEventListeners();

        // Invoke the callback
        statusCallback?.('agent-1', 'completed');

        const state = useAgentStore.getState();
        const agent = state.agents.get('spec-1')?.find((a) => a.agentId === 'agent-1');
        expect(agent?.status).toBe('completed');
      });
    });

    describe('cleanup function', () => {
      it('should call both cleanup functions', () => {
        const cleanupOutput = vi.fn();
        const cleanupStatus = vi.fn();
        const cleanupRecordChanged = vi.fn();
        window.electronAPI.onAgentOutput = vi.fn().mockReturnValue(cleanupOutput);
        window.electronAPI.onAgentStatusChange = vi.fn().mockReturnValue(cleanupStatus);
        window.electronAPI.onAgentRecordChanged = vi.fn().mockReturnValue(cleanupRecordChanged);

        const cleanup = useAgentStore.getState().setupEventListeners();
        cleanup();

        expect(cleanupOutput).toHaveBeenCalled();
        expect(cleanupStatus).toHaveBeenCalled();
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
        // Mock specStore with matching spec selected
        vi.doMock('./specStore', () => ({
          useSpecStore: {
            getState: () => ({ selectedSpec: { name: 'spec-1', path: '/path/spec-1' } }),
          },
        }));

        // Clear dynamic import cache
        vi.resetModules();

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

        // Wait for async dynamic import
        await vi.waitFor(() => {
          const state = useAgentStore.getState();
          expect(state.selectedAgentId).toBe('matching-agent');
        });
      });

      it('should NOT auto-select agent when specId does not match selected spec', async () => {
        // Mock specStore with different spec selected
        vi.doMock('./specStore', () => ({
          useSpecStore: {
            getState: () => ({ selectedSpec: { name: 'spec-A', path: '/path/spec-A' } }),
          },
        }));

        vi.resetModules();

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
        // Mock specStore with no spec selected
        vi.doMock('./specStore', () => ({
          useSpecStore: {
            getState: () => ({ selectedSpec: null }),
          },
        }));

        vi.resetModules();

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
        // Mock specStore (no spec selected)
        vi.doMock('./specStore', () => ({
          useSpecStore: {
            getState: () => ({ selectedSpec: null }),
          },
        }));

        // Mock bugStore with matching bug selected
        vi.doMock('./bugStore', () => ({
          useBugStore: {
            getState: () => ({ selectedBug: { name: 'my-bug', path: '/path/my-bug' } }),
          },
        }));

        vi.resetModules();

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
        // Mock specStore (no spec selected)
        vi.doMock('./specStore', () => ({
          useSpecStore: {
            getState: () => ({ selectedSpec: null }),
          },
        }));

        // Mock bugStore with different bug selected
        vi.doMock('./bugStore', () => ({
          useBugStore: {
            getState: () => ({ selectedBug: { name: 'other-bug', path: '/path/other-bug' } }),
          },
        }));

        vi.resetModules();

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
        // Mock specStore with no spec selected
        vi.doMock('./specStore', () => ({
          useSpecStore: {
            getState: () => ({ selectedSpec: null }),
          },
        }));

        vi.resetModules();

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
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        agents.set('spec-2', [mockAgentInfo3]);
        useAgentStore.setState({ agents });

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
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo, mockAgentInfo2]);
        useAgentStore.setState({ agents });

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
        const agents = new Map<string, AgentInfo[]>();
        agents.set('', [projectAgent]);
        agents.set('spec-1', [mockAgentInfo]);
        useAgentStore.setState({ agents });

        const projectAgents = useAgentStore.getState().getProjectAgents();
        expect(projectAgents).toHaveLength(1);
        expect(projectAgents[0].agentId).toBe('project-agent-1');
      });

      it('should return empty array when no project agents exist', () => {
        const agents = new Map<string, AgentInfo[]>();
        agents.set('spec-1', [mockAgentInfo]);
        agents.set('spec-2', [mockAgentInfo3]);
        useAgentStore.setState({ agents });

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
        const agents = new Map<string, AgentInfo[]>();
        agents.set('', [projectAgent1, projectAgent2]);
        useAgentStore.setState({ agents });

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
        const agents = new Map<string, AgentInfo[]>();
        agents.set('', [projectAgent]);
        agents.set('spec-1', [mockAgentInfo]);
        agents.set('spec-2', [mockAgentInfo3]);
        useAgentStore.setState({ agents });

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
