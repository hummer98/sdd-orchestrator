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
          undefined
        );

        const state = useAgentStore.getState();
        const specAgents = state.agents.get('spec-1');
        expect(specAgents).toHaveLength(1);
        expect(specAgents?.[0].agentId).toBe('agent-1');
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
        useAgentStore.setState({ agents });

        const resumedAgent: AgentInfo = {
          ...mockAgentInfo,
          status: 'running' as AgentStatus,
          pid: 99999,
        };
        window.electronAPI.resumeAgent = vi.fn().mockResolvedValue(resumedAgent);

        await useAgentStore.getState().resumeAgent('agent-1');

        expect(window.electronAPI.resumeAgent).toHaveBeenCalledWith('agent-1');

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

        const cleanup = useAgentStore.getState().setupEventListeners();

        expect(window.electronAPI.onAgentOutput).toHaveBeenCalled();

        cleanup();
        expect(mockCleanup).toHaveBeenCalled();
      });

      it('should register onAgentStatusChange listener', () => {
        const mockCleanup = vi.fn();
        window.electronAPI.onAgentOutput = vi.fn().mockReturnValue(vi.fn());
        window.electronAPI.onAgentStatusChange = vi.fn().mockReturnValue(mockCleanup);

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
        window.electronAPI.onAgentOutput = vi.fn().mockReturnValue(cleanupOutput);
        window.electronAPI.onAgentStatusChange = vi.fn().mockReturnValue(cleanupStatus);

        const cleanup = useAgentStore.getState().setupEventListeners();
        cleanup();

        expect(cleanupOutput).toHaveBeenCalled();
        expect(cleanupStatus).toHaveBeenCalled();
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
  });
});
