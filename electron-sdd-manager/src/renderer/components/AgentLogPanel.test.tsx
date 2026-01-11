/**
 * AgentLogPanel Component Tests
 * Task 31.1-31.2: Agent log display and operations
 * Requirements: 9.1, 9.2, 9.4, 9.7, 9.8, 9.9, 9.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentLogPanel } from './AgentLogPanel';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';
import type { LogEntry } from '../types';

// Mock the stores
vi.mock('../stores/agentStore');

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;

describe('AgentLogPanel - Task 31', () => {
  const mockClearLogs = vi.fn();

  const baseLogs: LogEntry[] = [
    { id: 'log-1', stream: 'stdout', data: 'Starting process...', timestamp: Date.now() - 2000 },
    { id: 'log-2', stream: 'stdout', data: 'Processing requirements...', timestamp: Date.now() - 1000 },
    { id: 'log-3', stream: 'stderr', data: 'Warning: Something happened', timestamp: Date.now() },
  ];

  const baseAgentInfo: AgentInfo = {
    agentId: 'agent-1',
    specId: 'spec-1',
    phase: 'requirements',
    pid: 12345,
    sessionId: 'session-1',
    status: 'running',
    startedAt: '2025-01-01T00:00:00Z',
    lastActivityAt: '2025-01-01T00:00:00Z',
    command: 'claude -p "/kiro:spec-requirements"',
  };

  // Helper to create mock store state for selector-based access
  const createMockState = (overrides: {
    selectedAgentId?: string | null;
    logs?: LogEntry[];
    agent?: AgentInfo | null;
  } = {}) => {
    const selectedAgentId = 'selectedAgentId' in overrides ? overrides.selectedAgentId : 'agent-1';
    const logs = overrides.logs ?? baseLogs;
    // Use null to explicitly indicate no agent, undefined means use default
    const agent = 'agent' in overrides ? overrides.agent : baseAgentInfo;

    const logsMap = new Map<string, LogEntry[]>();
    if (selectedAgentId && logs.length > 0) {
      logsMap.set(selectedAgentId, logs);
    }

    const agentsMap = new Map<string, AgentInfo[]>();
    if (agent) {
      agentsMap.set(agent.specId, [agent]);
    }

    return {
      selectedAgentId,
      clearLogs: mockClearLogs,
      logs: logsMap,
      agents: agentsMap,
    };
  };

  // Mock implementation that calls selector with state
  const setupMock = (state: ReturnType<typeof createMockState>) => {
    mockUseAgentStore.mockImplementation((selector: (state: ReturnType<typeof createMockState>) => unknown) => {
      return selector(state);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMock(createMockState());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 31.1: Agent単位ログ表示', () => {
    it('should display selected agent logs container', () => {
      render(<AgentLogPanel />);

      // Virtual scrolling doesn't render items without proper container size
      // We verify that the log panel is rendered and the agent info is displayed
      expect(screen.getByText('Agentログ')).toBeInTheDocument();
      expect(screen.getByText('requirements')).toBeInTheDocument();
    });

    it('should display agent phase in header', () => {
      render(<AgentLogPanel />);

      expect(screen.getByText('requirements')).toBeInTheDocument();
    });

    it('should display running indicator when agent is running', () => {
      render(<AgentLogPanel />);

      expect(screen.getByTestId('running-indicator')).toBeInTheDocument();
    });

    it('should not display running indicator when agent is completed', () => {
      setupMock(createMockState({
        agent: { ...baseAgentInfo, status: 'completed' },
      }));

      render(<AgentLogPanel />);

      expect(screen.queryByTestId('running-indicator')).not.toBeInTheDocument();
    });

    it('should have scroll container for logs', () => {
      render(<AgentLogPanel />);

      // Log container should be present
      const container = document.querySelector('.flex-1.overflow-auto');
      expect(container).toBeInTheDocument();
    });

    it('should show empty message when no agent is selected', () => {
      setupMock(createMockState({
        selectedAgentId: null,
        logs: [],
        agent: null,
      }));

      render(<AgentLogPanel />);

      expect(screen.getByText('Agentを選択してください')).toBeInTheDocument();
    });

    it('should show empty log message when logs are empty and no command', () => {
      // Agent without command field (e.g., old agent record)
      setupMock(createMockState({
        logs: [],
        agent: { ...baseAgentInfo, command: '' },
      }));

      render(<AgentLogPanel />);

      expect(screen.getByText('ログがありません')).toBeInTheDocument();
    });

    it('should show command line when logs are empty but command exists', () => {
      setupMock(createMockState({
        logs: [],
      }));

      render(<AgentLogPanel />);

      expect(screen.getByText('コマンド:')).toBeInTheDocument();
      expect(screen.getByText('claude -p "/kiro:spec-requirements"')).toBeInTheDocument();
    });
  });

  describe('Task 31.3: ヘッダーにagentId-sessionId表示', () => {
    it('should display agentId and sessionId in header', () => {
      render(<AgentLogPanel />);

      expect(screen.getByText('agent-1 - セッションID: session-1')).toBeInTheDocument();
    });

    it('should not display agentId-sessionId when no agent is selected', () => {
      setupMock(createMockState({
        selectedAgentId: null,
        logs: [],
        agent: null,
      }));

      render(<AgentLogPanel />);

      expect(screen.queryByText(/agent-1/)).not.toBeInTheDocument();
    });
  });

  describe('Task 31.2: ログ操作機能', () => {
    it('should have copy button', () => {
      render(<AgentLogPanel />);

      expect(screen.getByTitle('ログをコピー')).toBeInTheDocument();
    });

    it('should copy logs to clipboard when copy button is clicked', async () => {
      render(<AgentLogPanel />);

      const copyButton = screen.getByTitle('ログをコピー');
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalled();
    });

    it('should have clear button', () => {
      render(<AgentLogPanel />);

      expect(screen.getByTitle('ログをクリア')).toBeInTheDocument();
    });

    it('should call clearLogs when clear button is clicked', () => {
      render(<AgentLogPanel />);

      const clearButton = screen.getByTitle('ログをクリア');
      fireEvent.click(clearButton);

      expect(mockClearLogs).toHaveBeenCalledWith('agent-1');
    });

    it('should disable copy button when no logs', () => {
      setupMock(createMockState({
        logs: [],
      }));

      render(<AgentLogPanel />);

      const copyButton = screen.getByTitle('ログをコピー');
      expect(copyButton).toBeDisabled();
    });

    it('should disable clear button when no logs', () => {
      setupMock(createMockState({
        logs: [],
      }));

      render(<AgentLogPanel />);

      const clearButton = screen.getByTitle('ログをクリア');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Token aggregation in header', () => {
    it('should display aggregated tokens in header when logs contain token data', () => {
      const logsWithTokens: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
          timestamp: Date.now(),
        },
        {
          id: 'log-2',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":200,"output_tokens":100}}}',
          timestamp: Date.now(),
        },
      ];

      setupMock(createMockState({
        logs: logsWithTokens,
      }));

      render(<AgentLogPanel />);

      // Should display aggregated tokens (300 input + 150 output = 450 total)
      expect(screen.getByText(/300/)).toBeInTheDocument();
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('should not display token info when no token data in logs', () => {
      const logsWithoutTokens: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
          timestamp: Date.now(),
        },
      ];

      setupMock(createMockState({
        logs: logsWithoutTokens,
      }));

      render(<AgentLogPanel />);

      // Token display should not be present when there are no tokens
      expect(screen.queryByText(/入力:/)).not.toBeInTheDocument();
    });

    it('should display token icon when tokens are present', () => {
      const logsWithTokens: LogEntry[] = [
        {
          id: 'log-1',
          stream: 'stdout',
          data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
          timestamp: Date.now(),
        },
      ];

      setupMock(createMockState({
        logs: logsWithTokens,
      }));

      render(<AgentLogPanel />);

      expect(screen.getByTestId('token-display')).toBeInTheDocument();
    });
  });
});
