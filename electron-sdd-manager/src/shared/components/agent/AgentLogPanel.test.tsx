/**
 * Shared AgentLogPanel Component Tests
 * Tests for log display, stdin handling, and token aggregation
 *
 * Bug fix: agent-log-duplicate-input - stdin logs should not be displayed
 * because Claude CLI's type: 'user' event (stdout) already shows user input.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentLogPanel, type AgentLogInfo } from './AgentLogPanel';
import type { LogEntry } from '@shared/api/types';

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('Shared AgentLogPanel', () => {
  const baseAgent: AgentLogInfo = {
    agentId: 'agent-1',
    sessionId: 'session-123',
    phase: 'requirements',
    status: 'running',
    command: 'claude -p "/kiro:spec-requirements"',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should display "select agent" message when no agent provided', () => {
      render(<AgentLogPanel logs={[]} />);
      expect(screen.getByText('Agentを選択してください')).toBeInTheDocument();
    });

    it('should display empty logs message when agent has no logs', () => {
      render(<AgentLogPanel agent={{ ...baseAgent, command: '' }} logs={[]} />);
      expect(screen.getByText('ログがありません')).toBeInTheDocument();
    });

    it('should display agent phase in header', () => {
      render(<AgentLogPanel agent={baseAgent} logs={[]} />);
      expect(screen.getByText('requirements')).toBeInTheDocument();
    });

    it('should display session ID when showSessionId is true', () => {
      render(<AgentLogPanel agent={baseAgent} logs={[]} showSessionId={true} />);
      expect(screen.getByText(/session-123/)).toBeInTheDocument();
    });

    it('should display running indicator when agent is running', () => {
      render(<AgentLogPanel agent={baseAgent} logs={[]} />);
      expect(screen.getByTestId('running-indicator')).toBeInTheDocument();
    });

    it('should not display running indicator when agent is completed', () => {
      render(
        <AgentLogPanel
          agent={{ ...baseAgent, status: 'completed' }}
          logs={[]}
        />
      );
      expect(screen.queryByTestId('running-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Bug fix: stdin duplicate input prevention', () => {
    const stdinLog: LogEntry = {
      id: 'stdin-1',
      stream: 'stdin',
      data: 'User typed this input',
      timestamp: Date.now(),
    };

    const userEventLog: LogEntry = {
      id: 'stdout-user',
      stream: 'stdout',
      data: '{"type":"user","message":{"content":[{"type":"text","text":"User typed this input"}]}}',
      timestamp: Date.now() + 100,
    };

    const assistantLog: LogEntry = {
      id: 'stdout-assistant',
      stream: 'stdout',
      data: '{"type":"assistant","message":{"content":[{"type":"text","text":"Claude response"}]}}',
      timestamp: Date.now() + 200,
    };

    it('should NOT display stdin logs to prevent duplicate input display', () => {
      // When both stdin and stdout user event exist, only stdout should be displayed
      render(
        <AgentLogPanel
          agent={baseAgent}
          logs={[stdinLog, userEventLog, assistantLog]}
        />
      );

      // User input should appear exactly ONCE (from stdout user event)
      const userInputElements = screen.getAllByText('User typed this input');
      expect(userInputElements).toHaveLength(1);
    });

    it('should only show stdin input once even when both stdin and user event exist', () => {
      // This is the critical test - same input should not appear twice
      render(
        <AgentLogPanel
          agent={baseAgent}
          logs={[stdinLog, userEventLog]}
        />
      );

      // Count occurrences of the user input text
      const allText = screen.getByTestId('agent-log-panel').textContent || '';
      const matchCount = (allText.match(/User typed this input/g) || []).length;
      expect(matchCount).toBe(1);
    });

    it('should display user input from stdout user event', () => {
      // Without stdin, user event should still work
      render(
        <AgentLogPanel agent={baseAgent} logs={[userEventLog]} />
      );

      expect(screen.getByText('User typed this input')).toBeInTheDocument();
    });
  });

  describe('stderr handling', () => {
    it('should display stderr as error entries', () => {
      const stderrLog: LogEntry = {
        id: 'stderr-1',
        stream: 'stderr',
        data: 'Error message from stderr',
        timestamp: Date.now(),
      };

      render(<AgentLogPanel agent={baseAgent} logs={[stderrLog]} />);

      expect(screen.getByText('Error message from stderr')).toBeInTheDocument();
    });
  });

  describe('stdout parsing', () => {
    it('should parse and display Claude stream-json events', () => {
      const assistantLog: LogEntry = {
        id: 'stdout-1',
        stream: 'stdout',
        data: '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello from Claude"}]}}',
        timestamp: Date.now(),
      };

      render(<AgentLogPanel agent={baseAgent} logs={[assistantLog]} />);

      expect(screen.getByText('Hello from Claude')).toBeInTheDocument();
    });

    it('should display tool_use events', () => {
      const toolUseLog: LogEntry = {
        id: 'stdout-tool',
        stream: 'stdout',
        data: '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","id":"tool-1","input":{"file_path":"test.ts"}}]}}',
        timestamp: Date.now(),
      };

      render(<AgentLogPanel agent={baseAgent} logs={[toolUseLog]} />);

      expect(screen.getByText('Read')).toBeInTheDocument();
    });
  });

  describe('Token display', () => {
    it('should display token usage when showTokens is true', () => {
      const logWithTokens: LogEntry = {
        id: 'stdout-tokens',
        stream: 'stdout',
        data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
        timestamp: Date.now(),
      };

      render(
        <AgentLogPanel agent={baseAgent} logs={[logWithTokens]} showTokens={true} />
      );

      expect(screen.getByTestId('token-display')).toBeInTheDocument();
      // Check token display specifically contains formatted numbers
      expect(screen.getByText(/入力: 100/)).toBeInTheDocument();
      expect(screen.getByText(/出力: 50/)).toBeInTheDocument();
    });

    it('should not display tokens when showTokens is false', () => {
      const logWithTokens: LogEntry = {
        id: 'stdout-tokens',
        stream: 'stdout',
        data: '{"type":"assistant","message":{"usage":{"input_tokens":100,"output_tokens":50}}}',
        timestamp: Date.now(),
      };

      render(
        <AgentLogPanel agent={baseAgent} logs={[logWithTokens]} showTokens={false} />
      );

      expect(screen.queryByTestId('token-display')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onCopy when copy button is clicked', () => {
      const onCopy = vi.fn();
      const logs: LogEntry[] = [
        { id: 'log-1', stream: 'stdout', data: 'test', timestamp: Date.now() },
      ];
      render(<AgentLogPanel agent={baseAgent} logs={logs} onCopy={onCopy} />);

      const copyButton = screen.getByTitle('ログをコピー');
      fireEvent.click(copyButton);

      expect(onCopy).toHaveBeenCalled();
    });

    it('should call onClear when clear button is clicked', () => {
      const onClear = vi.fn();
      const logs: LogEntry[] = [
        { id: 'log-1', stream: 'stdout', data: 'test', timestamp: Date.now() },
      ];
      render(<AgentLogPanel agent={baseAgent} logs={logs} onClear={onClear} />);

      const clearButton = screen.getByTitle('ログをクリア');
      fireEvent.click(clearButton);

      expect(onClear).toHaveBeenCalled();
    });

    it('should disable buttons when logs are empty', () => {
      const onClear = vi.fn();
      render(<AgentLogPanel agent={baseAgent} logs={[]} onClear={onClear} />);

      expect(screen.getByTitle('ログをコピー')).toBeDisabled();
      expect(screen.getByTitle('ログをクリア')).toBeDisabled();
    });
  });

  describe('Command display', () => {
    it('should display command as system entry when provided', () => {
      render(<AgentLogPanel agent={baseAgent} logs={[]} />);

      // Command is shown in SessionInfoBlock
      expect(screen.getByText('作業ディレクトリ:')).toBeInTheDocument();
      expect(screen.getByText('claude -p "/kiro:spec-requirements"')).toBeInTheDocument();
    });
  });
});
