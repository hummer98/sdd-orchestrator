/**
 * AgentInputPanel Component Tests
 * Task 32.1-32.2: stdin input UI and input history
 * Requirements: 10.1, 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentInputPanel } from './AgentInputPanel';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';

// Mock the stores
vi.mock('../stores/agentStore');

const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;

describe('AgentInputPanel - Task 32', () => {
  const mockSendInput = vi.fn();
  const mockGetAgentById = vi.fn();

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
      sendInput: mockSendInput,
      getAgentById: mockGetAgentById.mockReturnValue(baseAgentInfo),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 32.1: stdin入力UI', () => {
    it('should render input field', () => {
      render(<AgentInputPanel />);

      expect(screen.getByPlaceholderText('入力を送信...')).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<AgentInputPanel />);

      expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
    });

    it('should call sendInput when send button is clicked', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      await userEvent.type(input, 'test input');

      const sendButton = screen.getByRole('button', { name: '送信' });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockSendInput).toHaveBeenCalledWith('agent-1', 'test input');
      });
    });

    it('should call sendInput when Enter key is pressed', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      await userEvent.type(input, 'test input{enter}');

      await waitFor(() => {
        expect(mockSendInput).toHaveBeenCalledWith('agent-1', 'test input');
      });
    });

    it('should clear input field after sending', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      await userEvent.type(input, 'test input{enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send empty input', async () => {
      render(<AgentInputPanel />);

      const sendButton = screen.getByRole('button', { name: '送信' });
      fireEvent.click(sendButton);

      expect(mockSendInput).not.toHaveBeenCalled();
    });

    it('should disable input when no agent is selected', () => {
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: null,
        sendInput: mockSendInput,
        getAgentById: mockGetAgentById.mockReturnValue(undefined),
      });

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      expect(input).toBeDisabled();
    });

    it('should disable input when agent is not running', () => {
      mockGetAgentById.mockReturnValue({ ...baseAgentInfo, status: 'completed' });
      mockUseAgentStore.mockReturnValue({
        selectedAgentId: 'agent-1',
        sendInput: mockSendInput,
        getAgentById: mockGetAgentById,
      });

      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      expect(input).toBeDisabled();
    });
  });

  describe('Task 32.2: 入力履歴表示', () => {
    it('should show input history after sending', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      await userEvent.type(input, 'first input{enter}');

      await waitFor(() => {
        expect(screen.getByText('first input')).toBeInTheDocument();
      });
    });

    it('should add multiple history items', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');

      await userEvent.type(input, 'first input{enter}');
      await userEvent.type(input, 'second input{enter}');

      await waitFor(() => {
        expect(screen.getByText('first input')).toBeInTheDocument();
        expect(screen.getByText('second input')).toBeInTheDocument();
      });
    });

    it('should resend input when history item is clicked', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      await userEvent.type(input, 'test input{enter}');

      // Clear mock calls
      mockSendInput.mockClear();

      // Click on history item
      const historyItem = screen.getByText('test input');
      fireEvent.click(historyItem);

      await waitFor(() => {
        expect(mockSendInput).toHaveBeenCalledWith('agent-1', 'test input');
      });
    });

    it('should show history header', async () => {
      render(<AgentInputPanel />);

      const input = screen.getByPlaceholderText('入力を送信...');
      await userEvent.type(input, 'test input{enter}');

      await waitFor(() => {
        expect(screen.getByText('入力履歴')).toBeInTheDocument();
      });
    });

    it('should not show history section when no history exists', () => {
      render(<AgentInputPanel />);

      expect(screen.queryByText('入力履歴')).not.toBeInTheDocument();
    });
  });
});
