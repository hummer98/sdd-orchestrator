/**
 * Shared AgentLogPanel Component Tests
 * Tests for log display and token aggregation
 *
 * main-process-log-parser Task 10.9: Updated to use ParsedLogEntry type
 * Logs are now pre-parsed by Main process - no more LogEntry with stream/data fields
 *
 * Bug fix notes:
 * - agent-log-duplicate-input: stdin handling no longer needed (Main process filters)
 * - agent-log-result-display: ResultBlock rendering tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentLogPanel, type AgentLogInfo } from './AgentLogPanel';
import type { ParsedLogEntry } from '@shared/api/types';

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Helper to create ParsedLogEntry
function createParsedLog(
  id: string,
  type: ParsedLogEntry['type'],
  overrides: Partial<ParsedLogEntry> = {}
): ParsedLogEntry {
  return {
    id,
    type,
    timestamp: Date.now(),
    engineId: 'claude',
    ...overrides,
  };
}

describe('Shared AgentLogPanel', () => {
  const baseAgent: AgentLogInfo = {
    agentId: 'agent-1',
    sessionId: 'session-123',
    phase: 'requirements',
    status: 'running',
    command: 'claude -p "/kiro:spec-requirements"',
    engineId: 'claude',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should display "select agent" message when no agent provided', () => {
      render(<AgentLogPanel logs={[]} />);
      expect(screen.getByText('Select an Agent')).toBeInTheDocument();
    });

    it('should display empty logs message when agent has no logs', () => {
      render(<AgentLogPanel agent={{ ...baseAgent, command: '' }} logs={[]} />);
      expect(screen.getByText('No logs available')).toBeInTheDocument();
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

    it('should display engine tag when engineId is provided', () => {
      render(
        <AgentLogPanel
          agent={{ ...baseAgent, engineId: 'claude' }}
          logs={[]}
        />
      );
      const engineTag = screen.getByTestId('engine-tag');
      expect(engineTag).toBeInTheDocument();
      expect(engineTag).toHaveTextContent('Claude');
      expect(engineTag).toHaveClass('bg-blue-100');
    });

    it('should display Gemini engine tag with correct styling', () => {
      render(
        <AgentLogPanel
          agent={{ ...baseAgent, engineId: 'gemini' }}
          logs={[]}
        />
      );
      const engineTag = screen.getByTestId('engine-tag');
      expect(engineTag).toBeInTheDocument();
      expect(engineTag).toHaveTextContent('Gemini');
      expect(engineTag).toHaveClass('bg-purple-100');
    });
  });

  describe('Text entry display', () => {
    it('should display assistant text entries', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('text-1', 'text', {
          text: { content: 'Hello from Claude', role: 'assistant' },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      expect(screen.getByText('Hello from Claude')).toBeInTheDocument();
    });

    it('should display user text entries', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('text-user', 'input', {
          text: { content: 'User typed this input', role: 'user' },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      expect(screen.getByText('User typed this input')).toBeInTheDocument();
    });

    it('should display multiple text entries', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('text-1', 'text', {
          text: { content: 'First message', role: 'assistant' },
        }),
        createParsedLog('text-2', 'text', {
          text: { content: 'Second message', role: 'assistant' },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });
  });

  describe('Tool events display', () => {
    it('should display tool_use events', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('tool-1', 'tool_use', {
          tool: { name: 'Read', toolUseId: 'tool-123', input: { file_path: 'test.ts' } },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('should display tool_result block', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('tool-result-1', 'tool_result', {
          toolResult: { toolUseId: 'tool-123', content: 'File content here', isError: false },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      // Tool result block should be displayed (collapsed by default)
      expect(screen.getByTestId('tool-result-block')).toBeInTheDocument();
    });

    it('should display tool_result error with error indicator', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('tool-error-1', 'tool_result', {
          toolResult: { toolUseId: 'tool-456', content: 'Error: File not found', isError: true },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      // Should have tool result block
      expect(screen.getByTestId('tool-result-block')).toBeInTheDocument();
      // Should have tool result indicator showing error
      expect(screen.getByTestId('tool-result-indicator')).toBeInTheDocument();
    });

    it('should show tool_result content when expanded', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('tool-error-2', 'tool_result', {
          toolResult: { toolUseId: 'tool-789', content: 'Error: Permission denied', isError: true },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      // Click to expand
      fireEvent.click(screen.getByTestId('tool-result-block'));

      // Content should now be visible
      expect(screen.getByTestId('tool-result-content')).toBeInTheDocument();
      expect(screen.getByText('Error: Permission denied')).toBeInTheDocument();
    });
  });

  describe('Result event display', () => {
    it('should display ResultBlock for successful result event', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('result-1', 'result', {
          result: {
            content: 'Task completed successfully',
            isError: false,
            durationMs: 5000,
            numTurns: 3,
            inputTokens: 100,
            outputTokens: 50,
          },
        }),
      ];

      render(<AgentLogPanel agent={{ ...baseAgent, status: 'completed' }} logs={logs} />);

      // Should display ResultBlock with success styling
      expect(screen.getByTestId('result-block')).toBeInTheDocument();
      expect(screen.getByTestId('result-success-icon')).toBeInTheDocument();
      expect(screen.getByText('Task completed successfully')).toBeInTheDocument();
    });

    it('should display ResultBlock for error result event', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('error-result-1', 'result', {
          result: {
            content: 'Error: Something went wrong',
            isError: true,
            durationMs: 2000,
          },
        }),
      ];

      render(<AgentLogPanel agent={{ ...baseAgent, status: 'failed' }} logs={logs} />);

      // Should display ResultBlock with error styling
      expect(screen.getByTestId('result-block')).toBeInTheDocument();
      expect(screen.getByTestId('result-error-icon')).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    it('should display result statistics (duration, turns, tokens)', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('result-stats', 'result', {
          result: {
            content: 'Done',
            isError: false,
            durationMs: 267132,
            numTurns: 8,
            inputTokens: 9,
            outputTokens: 1684,
          },
        }),
      ];

      render(<AgentLogPanel agent={{ ...baseAgent, status: 'completed' }} logs={logs} />);

      // Should display all statistics
      expect(screen.getByText(/267\.1/)).toBeInTheDocument(); // duration (approx)
      expect(screen.getByText(/8ターン/)).toBeInTheDocument(); // turns
    });
  });

  describe('System event display', () => {
    it('should display system init event with session info', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('system-init', 'system', {
          session: {
            cwd: '/path/to/project',
            model: 'claude-opus-4-5-20251101',
            version: '1.0.0',
          },
        }),
      ];

      render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      // Should display session info
      expect(screen.getByText(/\/path\/to\/project/)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onCopy when copy button is clicked', () => {
      const onCopy = vi.fn();
      const logs: ParsedLogEntry[] = [
        createParsedLog('log-1', 'text', { text: { content: 'test', role: 'assistant' } }),
      ];
      render(<AgentLogPanel agent={baseAgent} logs={logs} onCopy={onCopy} />);

      const copyButton = screen.getByTitle('Copy logs');
      fireEvent.click(copyButton);

      expect(onCopy).toHaveBeenCalled();
    });

    it('should call onClear when clear button is clicked', () => {
      const onClear = vi.fn();
      const logs: ParsedLogEntry[] = [
        createParsedLog('log-1', 'text', { text: { content: 'test', role: 'assistant' } }),
      ];
      render(<AgentLogPanel agent={baseAgent} logs={logs} onClear={onClear} />);

      const clearButton = screen.getByTitle('Clear logs');
      fireEvent.click(clearButton);

      expect(onClear).toHaveBeenCalled();
    });

    it('should disable buttons when logs are empty', () => {
      const onClear = vi.fn();
      render(<AgentLogPanel agent={baseAgent} logs={[]} onClear={onClear} />);

      expect(screen.getByTitle('Copy logs')).toBeDisabled();
      expect(screen.getByTitle('Clear logs')).toBeDisabled();
    });
  });

  describe('Command display', () => {
    it('should display command as system entry when provided', () => {
      render(<AgentLogPanel agent={baseAgent} logs={[]} />);

      // Command is shown in SessionInfoBlock
      expect(screen.getByText('Working Directory:')).toBeInTheDocument();
      expect(screen.getByText('claude -p "/kiro:spec-requirements"')).toBeInTheDocument();
    });
  });

  describe('Auto-scroll behavior', () => {
    it('should auto-scroll to bottom when user is near bottom and new logs arrive', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('log-1', 'text', { text: { content: 'Line 1', role: 'assistant' } }),
      ];

      const { rerender } = render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      // Get scroll container
      const scrollContainer = screen.getByTestId('agent-log-panel').querySelector('.overflow-auto');
      expect(scrollContainer).toBeTruthy();

      // Mock scroll properties - user is at bottom
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 500, configurable: true });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 450, writable: true, configurable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 100, configurable: true });

      // Simulate scroll event (user at bottom - within 50px threshold)
      fireEvent.scroll(scrollContainer!);

      // Add new log
      const newLogs: ParsedLogEntry[] = [
        ...logs,
        createParsedLog('log-2', 'text', { text: { content: 'Line 2', role: 'assistant' } }),
      ];

      // Update scrollHeight for new content
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 600, configurable: true });

      rerender(<AgentLogPanel agent={baseAgent} logs={newLogs} />);

      // Should auto-scroll to bottom (scrollTop should be set to scrollHeight)
      expect(scrollContainer!.scrollTop).toBe(600);
    });

    it('should NOT auto-scroll when user has scrolled up', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('log-1', 'text', { text: { content: 'Line 1', role: 'assistant' } }),
      ];

      const { rerender } = render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      // Get scroll container
      const scrollContainer = screen.getByTestId('agent-log-panel').querySelector('.overflow-auto');
      expect(scrollContainer).toBeTruthy();

      // Mock scroll properties - user has scrolled up (far from bottom)
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 500, configurable: true });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 100, writable: true, configurable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 100, configurable: true });

      // Simulate scroll event (user scrolled up - more than 50px from bottom)
      fireEvent.scroll(scrollContainer!);

      const originalScrollTop = scrollContainer!.scrollTop;

      // Add new log
      const newLogs: ParsedLogEntry[] = [
        ...logs,
        createParsedLog('log-2', 'text', { text: { content: 'Line 2', role: 'assistant' } }),
      ];

      rerender(<AgentLogPanel agent={baseAgent} logs={newLogs} />);

      // Should NOT auto-scroll - scrollTop should remain unchanged
      expect(scrollContainer!.scrollTop).toBe(originalScrollTop);
    });

    it('should resume auto-scroll when user scrolls back to bottom', () => {
      const logs: ParsedLogEntry[] = [
        createParsedLog('log-1', 'text', { text: { content: 'Line 1', role: 'assistant' } }),
      ];

      const { rerender } = render(<AgentLogPanel agent={baseAgent} logs={logs} />);

      // Get scroll container
      const scrollContainer = screen.getByTestId('agent-log-panel').querySelector('.overflow-auto');
      expect(scrollContainer).toBeTruthy();

      // First: user scrolls up
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 500, configurable: true });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 100, writable: true, configurable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 100, configurable: true });
      fireEvent.scroll(scrollContainer!);

      // Then: user scrolls back to bottom
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 420, writable: true, configurable: true });
      fireEvent.scroll(scrollContainer!);

      // Add new log
      const newLogs: ParsedLogEntry[] = [
        ...logs,
        createParsedLog('log-2', 'text', { text: { content: 'Line 2', role: 'assistant' } }),
      ];

      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 600, configurable: true });

      rerender(<AgentLogPanel agent={baseAgent} logs={newLogs} />);

      // Should auto-scroll again since user is back at bottom
      expect(scrollContainer!.scrollTop).toBe(600);
    });
  });
});
