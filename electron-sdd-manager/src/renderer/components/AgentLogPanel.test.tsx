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
  const mockGetLogsForAgent = vi.fn();
  const mockGetAgentById = vi.fn();

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

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAgentStore.mockReturnValue({
      selectedAgentId: 'agent-1',
      clearLogs: mockClearLogs,
      getLogsForAgent: mockGetLogsForAgent.mockReturnValue(baseLogs),
      getAgentById: mockGetAgentById.mockReturnValue(baseAgentInfo),
    });
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
      mockGetAgentById.mockReturnValue({ ...baseAgentInfo, status: 'completed' });
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        clearLogs: mockClearLogs,
        getLogsForAgent: mockGetLogsForAgent,
        getAgentById: mockGetAgentById,
      });

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
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        clearLogs: mockClearLogs,
        getLogsForAgent: mockGetLogsForAgent.mockReturnValue([]),
        getAgentById: mockGetAgentById.mockReturnValue(undefined),
      });

      render(<AgentLogPanel />);

      expect(screen.getByText('Agentを選択してください')).toBeInTheDocument();
    });

    it('should show empty log message when logs are empty', () => {
      mockGetLogsForAgent.mockReturnValue([]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        clearLogs: mockClearLogs,
        getLogsForAgent: mockGetLogsForAgent,
        getAgentById: mockGetAgentById,
      });

      render(<AgentLogPanel />);

      expect(screen.getByText('ログがありません')).toBeInTheDocument();
    });
  });

  describe('Task 31.3: ヘッダーにagentId-sessionId表示', () => {
    it('should display agentId and sessionId in header', () => {
      render(<AgentLogPanel />);

      expect(screen.getByText('agent-1 - session-1')).toBeInTheDocument();
    });

    it('should not display agentId-sessionId when no agent is selected', () => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        clearLogs: mockClearLogs,
        getLogsForAgent: mockGetLogsForAgent.mockReturnValue([]),
        getAgentById: mockGetAgentById.mockReturnValue(undefined),
      });

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
      mockGetLogsForAgent.mockReturnValue([]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        clearLogs: mockClearLogs,
        getLogsForAgent: mockGetLogsForAgent,
        getAgentById: mockGetAgentById,
      });

      render(<AgentLogPanel />);

      const copyButton = screen.getByTitle('ログをコピー');
      expect(copyButton).toBeDisabled();
    });

    it('should disable clear button when no logs', () => {
      mockGetLogsForAgent.mockReturnValue([]);
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        clearLogs: mockClearLogs,
        getLogsForAgent: mockGetLogsForAgent,
        getAgentById: mockGetAgentById,
      });

      render(<AgentLogPanel />);

      const clearButton = screen.getByTitle('ログをクリア');
      expect(clearButton).toBeDisabled();
    });
  });
});
