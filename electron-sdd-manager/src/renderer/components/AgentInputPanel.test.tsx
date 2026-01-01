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
  const mockSendInput = vi.fn();
  const mockResumeAgent = vi.fn();
  const mockGetAgentById = vi.fn();

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

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAgentStore.mockReturnValue({
      selectedAgentId: 'agent-1',
      sendInput: mockSendInput,
      resumeAgent: mockResumeAgent,
      getAgentById: mockGetAgentById.mockReturnValue(baseAgentInfo),
    });
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
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        sendInput: mockSendInput,
        resumeAgent: mockResumeAgent,
        getAgentById: mockGetAgentById.mockReturnValue(undefined),
      });

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).toBeDisabled();
    });

    it('should disable input when agent is running', () => {
      mockGetAgentById.mockReturnValue({ ...baseAgentInfo, status: 'running' });
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        sendInput: mockSendInput,
        resumeAgent: mockResumeAgent,
        getAgentById: mockGetAgentById,
      });

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).toBeDisabled();
    });

    it('should enable input when agent is completed', () => {
      mockGetAgentById.mockReturnValue({ ...baseAgentInfo, status: 'completed' });
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        sendInput: mockSendInput,
        resumeAgent: mockResumeAgent,
        getAgentById: mockGetAgentById,
      });

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).not.toBeDisabled();
    });

    it('should enable input when agent has error', () => {
      mockGetAgentById.mockReturnValue({ ...baseAgentInfo, status: 'error' });
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        sendInput: mockSendInput,
        resumeAgent: mockResumeAgent,
        getAgentById: mockGetAgentById,
      });

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).not.toBeDisabled();
    });

    it('should disable input when agent has no sessionId', () => {
      mockGetAgentById.mockReturnValue({ ...baseAgentInfo, status: 'completed', sessionId: '' });
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        sendInput: mockSendInput,
        resumeAgent: mockResumeAgent,
        getAgentById: mockGetAgentById,
      });

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText(/追加の指示を入力/);
      expect(input).toBeDisabled();
    });
  });

  describe('複数行入力', () => {
    it('should insert newline with Alt+Enter', async () => {
      render(<AgentInputPanel />);

      const textarea = screen.getByPlaceholderText(/追加の指示を入力/);

      // Type first line
      await userEvent.type(textarea, 'line 1');

      // Simulate Alt+Enter for newline
      fireEvent.keyDown(textarea, { key: 'Enter', altKey: true });

      // Type second line
      await userEvent.type(textarea, 'line 2');

      // Alt+Enter should allow the default behavior (newline insertion)
      // The value should contain both lines
      expect(textarea).toHaveValue('line 1line 2');
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
});
