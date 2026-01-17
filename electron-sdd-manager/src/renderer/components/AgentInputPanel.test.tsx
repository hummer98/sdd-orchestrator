/**
 * AgentInputPanel Component Tests
 * Session resume input UI with multiline support
 *
 * Updated: Session resume functionality
 * - Input is disabled when agent is running (can't send stdin)
 * - Input is enabled when agent is completed/error (can resume session)
 * - Supports multiline input with Option+Enter for newlines
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentInputPanel } from './AgentInputPanel';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';

// Mock the stores
vi.mock('../stores/agentStore');

const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;

describe('AgentInputPanel', () => {
  const mockResumeAgent = vi.fn();

  const baseAgentInfo: AgentInfo = {
    agentId: 'agent-1',
    specId: 'spec-1',
    phase: 'requirements',
    pid: 12345,
    sessionId: 'session-1',
    status: 'completed',
    startedAt: '2025-01-01T00:00:00Z',
    lastActivityAt: '2025-01-01T00:00:00Z',
    command: 'claude -p "/kiro:spec-requirements"',
  };

  // Helper to create mock store that supports Zustand selector pattern
  const createMockStore = (agent: AgentInfo | undefined, selectedAgentId: string | null) => {
    // Build agents Map from single agent (if provided)
    const agentsMap = new Map<string, AgentInfo[]>();
    if (agent) {
      agentsMap.set(agent.specId, [agent]);
    }

    const mockState = {
      selectedAgentId,
      agents: agentsMap,
      resumeAgent: mockResumeAgent,
    };

    // Return a function that can handle selector pattern
    return (selector: (state: typeof mockState) => unknown) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: completed agent with sessionId
    mockUseAgentStore.mockImplementation(createMockStore(baseAgentInfo, 'agent-1'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('セッション再開入力UI', () => {
    it('should render textarea input field', () => {
      render(<AgentInputPanel />);

      const textarea = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should render send button', () => {
      render(<AgentInputPanel />);

      expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
    });

    it('should render continue shortcut button', () => {
      render(<AgentInputPanel />);

      expect(screen.getByRole('button', { name: '続行を指示' })).toBeInTheDocument();
    });

    it('should call resumeAgent when send button is clicked', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      await userEvent.type(input, 'test input');

      const sendButton = screen.getByRole('button', { name: '送信' });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockResumeAgent).toHaveBeenCalledWith('agent-1', 'test input');
      });
    });

    it('should call resumeAgent when Enter key is pressed', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      await userEvent.type(input, 'test input{enter}');

      await waitFor(() => {
        expect(mockResumeAgent).toHaveBeenCalledWith('agent-1', 'test input');
      });
    });

    it('should clear input field after sending', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      await userEvent.type(input, 'test input{enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send empty input via send button', async () => {
      render(<AgentInputPanel />);

      const sendButton = screen.getByRole('button', { name: '送信' });
      fireEvent.click(sendButton);

      expect(mockResumeAgent).not.toHaveBeenCalled();
    });

    it('should call resumeAgent with 続けて when continue shortcut button is clicked', async () => {
      render(<AgentInputPanel />);

      const continueButton = screen.getByRole('button', { name: '続行を指示' });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockResumeAgent).toHaveBeenCalledWith('agent-1', '続けて');
      });
    });

    it('should disable input when no agent is selected', () => {
      mockUseAgentStore.mockImplementation(createMockStore(undefined, null));

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).toBeDisabled();
    });

    it('should disable input when agent is running', () => {
      const runningAgent = { ...baseAgentInfo, status: 'running' as const };
      mockUseAgentStore.mockImplementation(createMockStore(runningAgent, 'agent-1'));

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).toBeDisabled();
    });

    it('should enable input when agent is completed', () => {
      const completedAgent = { ...baseAgentInfo, status: 'completed' as const };
      mockUseAgentStore.mockImplementation(createMockStore(completedAgent, 'agent-1'));

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).not.toBeDisabled();
    });

    it('should enable input when agent has error', () => {
      const errorAgent = { ...baseAgentInfo, status: 'error' as const };
      mockUseAgentStore.mockImplementation(createMockStore(errorAgent, 'agent-1'));

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).not.toBeDisabled();
    });

    it('should disable input when agent has no sessionId', () => {
      const noSessionAgent = { ...baseAgentInfo, status: 'completed' as const, sessionId: '' };
      mockUseAgentStore.mockImplementation(createMockStore(noSessionAgent, 'agent-1'));

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).toBeDisabled();
    });
  });

  describe('複数行入力', () => {
    it('should not send on Alt+Enter (allows newline insertion)', async () => {
      render(<AgentInputPanel />);

      const textarea = screen.getByPlaceholderText(/追加の指示を入力/);

      // Type some content
      await userEvent.type(textarea, 'line 1');

      // Alt+Enter should NOT trigger send (default behavior should be preserved for newline)
      fireEvent.keyDown(textarea, { key: 'Enter', altKey: true });

      // resumeAgent should NOT be called - Alt+Enter is for inserting newlines
      expect(mockResumeAgent).not.toHaveBeenCalled();
      // Input should still contain the text (not cleared)
      expect(textarea).toHaveValue('line 1');
    });

    it('should not send on Enter when Alt is pressed', async () => {
      render(<AgentInputPanel />);

      const textarea = screen.getByPlaceholderText(/追加の指示を入力/);
      await userEvent.type(textarea, 'test');

      // Alt+Enter should not trigger send
      fireEvent.keyDown(textarea, { key: 'Enter', altKey: true });

      expect(mockResumeAgent).not.toHaveBeenCalled();
    });

    it('should send multiline text correctly', async () => {
      render(<AgentInputPanel />);

      const textarea = screen.getByPlaceholderText(/追加の指示を入力/) as HTMLTextAreaElement;

      // Set multiline value directly (simulating user typing with newlines)
      fireEvent.change(textarea, { target: { value: 'line 1\nline 2\nline 3' } });

      // Click send button
      const sendButton = screen.getByRole('button', { name: '送信' });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockResumeAgent).toHaveBeenCalledWith('agent-1', 'line 1\nline 2\nline 3');
      });
    });

    it('should have resize-none class to prevent manual resizing', () => {
      render(<AgentInputPanel />);

      const textarea = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(textarea).toHaveClass('resize-none');
    });
  });

  describe('agent-button-icon-unification: Regression tests (unchanged components)', () => {
    // Requirement 4.1: AgentInputPanel should NOT be changed
    it('should keep Play icon in "続行を指示" button (not changed to AgentIcon)', () => {
      render(<AgentInputPanel />);

      const continueButton = screen.getByRole('button', { name: '続行を指示' });
      // Play icon has class lucide-play (from lucide-react)
      const svg = continueButton.querySelector('svg');
      expect(svg).not.toBeNull();
      // Verify it's Play icon, not Bot icon
      const classNames = svg?.getAttribute('class') || '';
      expect(classNames).toContain('lucide-play');
      expect(classNames).not.toContain('lucide-bot');
    });

    it('should keep green color on "続行を指示" button', () => {
      render(<AgentInputPanel />);

      const continueButton = screen.getByRole('button', { name: '続行を指示' });
      // Button should have green background
      expect(continueButton.className).toContain('bg-green-500');
    });
  });
});
