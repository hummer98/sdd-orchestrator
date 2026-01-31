/**
 * AgentLogActionArea Tests
 *
 * mobile-agent-log-fullscreen: Task 2.1
 * Tests for the action area component with input, send, and continue functionality.
 *
 * Requirements:
 * - 4.1: アクションエリア固定
 * - 4.2: 追加指示入力
 * - 4.3: 送信ボタン
 * - 4.4: 続行ボタン
 * - 4.5: 実行中の無効化
 * - 4.6: sessionId無しの無効化
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentLogActionArea } from './AgentLogActionArea';
import type { AgentInfo, ApiClient } from '@shared/api/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockAgent = (overrides: Partial<AgentInfo> = {}): AgentInfo => ({
  agentId: 'agent-001',
  specId: 'test-spec',
  phase: 'requirements',
  status: 'completed',
  startedAt: '2024-01-01T00:00:00Z',
  command: 'claude -p "/kiro:spec-requirements"',
  sessionId: 'session-123',
  ...overrides,
});

const createMockApiClient = (): ApiClient => ({
  getSpecs: vi.fn(),
  getSpecDetail: vi.fn(),
  getBugs: vi.fn(),
  getBugDetail: vi.fn(),
  getAgents: vi.fn(),
  getAgentLogs: vi.fn(),
  stopAgent: vi.fn(),
  sendAgentInput: vi.fn().mockResolvedValue({ ok: true }),
  resumeAgent: vi.fn().mockResolvedValue({ ok: true }),
  onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
  onAgentLog: vi.fn().mockReturnValue(() => {}),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  onAutoExecutionUpdate: vi.fn().mockReturnValue(() => {}),
  executePhase: vi.fn(),
  approvePhase: vi.fn(),
  saveArtifact: vi.fn(),
  loadArtifact: vi.fn(),
  executeBugPhase: vi.fn(),
  approveBugPhase: vi.fn(),
  saveBugArtifact: vi.fn(),
  loadBugArtifact: vi.fn(),
  startBugAutoExecution: vi.fn(),
  stopBugAutoExecution: vi.fn(),
  onBugAutoExecutionUpdate: vi.fn().mockReturnValue(() => {}),
});

// =============================================================================
// Tests
// =============================================================================

describe('AgentLogActionArea', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('rendering (Req 4.1, 4.2, 4.3, 4.4)', () => {
    it('should render input field (Req 4.2)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('追加の指示を入力...')).toBeInTheDocument();
    });

    it('should render send button (Req 4.3)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-send-button')).toBeInTheDocument();
    });

    it('should render continue button (Req 4.4)', () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-continue-button')).toBeInTheDocument();
    });
  });

  describe('disabled state when running (Req 4.5)', () => {
    it('should disable input when agent is running', () => {
      const agent = createMockAgent({ status: 'running' });
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-input')).toBeDisabled();
    });

    it('should disable send button when agent is running', () => {
      const agent = createMockAgent({ status: 'running' });
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-send-button')).toBeDisabled();
    });

    it('should disable continue button when agent is running', () => {
      const agent = createMockAgent({ status: 'running' });
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-continue-button')).toBeDisabled();
    });

    it('should disable input when agent status is hang', () => {
      const agent = createMockAgent({ status: 'hang' });
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-input')).toBeDisabled();
    });
  });

  describe('disabled state when no sessionId (Req 4.6)', () => {
    it('should disable input when sessionId is undefined', () => {
      const agent = createMockAgent({ sessionId: undefined });
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-input')).toBeDisabled();
    });

    it('should disable send button when sessionId is undefined', () => {
      const agent = createMockAgent({ sessionId: undefined });
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-send-button')).toBeDisabled();
    });

    it('should disable continue button when sessionId is undefined', () => {
      const agent = createMockAgent({ sessionId: undefined });
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-continue-button')).toBeDisabled();
    });
  });

  describe('send functionality', () => {
    it('should call sendAgentInput when send button clicked with text', async () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      const input = screen.getByTestId('action-area-input');
      const sendButton = screen.getByTestId('action-area-send-button');

      fireEvent.change(input, { target: { value: 'Test instruction' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockApiClient.sendAgentInput).toHaveBeenCalledWith('agent-001', 'Test instruction');
      });
    });

    it('should clear input after successful send', async () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      const input = screen.getByTestId('action-area-input') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Test instruction' } });
      fireEvent.click(screen.getByTestId('action-area-send-button'));

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should not send when input is empty', async () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      fireEvent.click(screen.getByTestId('action-area-send-button'));

      expect(mockApiClient.sendAgentInput).not.toHaveBeenCalled();
    });

    it('should disable send button when input is empty', () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      expect(screen.getByTestId('action-area-send-button')).toBeDisabled();
    });
  });

  describe('continue functionality', () => {
    it('should call resumeAgent when continue button clicked', async () => {
      const agent = createMockAgent();
      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      fireEvent.click(screen.getByTestId('action-area-continue-button'));

      await waitFor(() => {
        expect(mockApiClient.resumeAgent).toHaveBeenCalledWith('agent-001');
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator on send button while sending', async () => {
      const agent = createMockAgent();
      mockApiClient.sendAgentInput = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      const input = screen.getByTestId('action-area-input');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(screen.getByTestId('action-area-send-button'));

      // During sending, button should show loading
      expect(screen.getByTestId('action-area-send-button')).toBeDisabled();
    });

    it('should show loading indicator on continue button while continuing', async () => {
      const agent = createMockAgent();
      mockApiClient.resumeAgent = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      render(
        <AgentLogActionArea
          agent={agent}
          apiClient={mockApiClient}
          testId="action-area"
        />
      );

      fireEvent.click(screen.getByTestId('action-area-continue-button'));

      // During continuing, button should be disabled
      expect(screen.getByTestId('action-area-continue-button')).toBeDisabled();
    });
  });
});
