/**
 * ProjectAgentView Component Tests
 *
 * Task 13.7: Project Agent機能UIを実装する
 * TDD: RED phase - Write failing tests first
 *
 * Requirements: 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectAgentView } from './ProjectAgentView';
import type { ApiClient } from '@shared/api/types';

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: { id: 'agent-1', specId: 'global', phase: 'ask', status: 'running', startedAt: '2026-01-10T12:00:00Z' } }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    sendAgentInput: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    executeValidation: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    stopAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAutoExecutionStatus: vi.fn().mockResolvedValue({ ok: true, value: null }),
    saveFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onSpecsUpdated: vi.fn().mockReturnValue(() => {}),
    onBugsUpdated: vi.fn().mockReturnValue(() => {}),
    onAgentOutput: vi.fn().mockReturnValue(() => {}),
    onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
    onAutoExecutionStatusChanged: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ProjectAgentView', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Rendering', () => {
    it('renders project agent view', () => {
      render(<ProjectAgentView apiClient={mockApiClient} />);
      expect(screen.getByTestId('project-agent-view')).toBeInTheDocument();
    });

    it('renders ask button', () => {
      render(<ProjectAgentView apiClient={mockApiClient} />);
      expect(screen.getByTestId('project-agent-ask-button')).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(<ProjectAgentView apiClient={mockApiClient} />);
      expect(screen.getByText(/Steering files/)).toBeInTheDocument();
    });
  });

  describe('Ask Dialog', () => {
    it('opens ask dialog when ask button is clicked', async () => {
      render(<ProjectAgentView apiClient={mockApiClient} />);

      const askButton = screen.getByTestId('project-agent-ask-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      });
    });

    it('closes ask dialog when cancel is clicked', async () => {
      render(<ProjectAgentView apiClient={mockApiClient} />);

      // Open dialog
      const askButton = screen.getByTestId('project-agent-ask-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      });

      // Close dialog
      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('ask-agent-dialog')).not.toBeInTheDocument();
      });
    });

    it('displays project agent type in dialog', async () => {
      render(<ProjectAgentView apiClient={mockApiClient} />);

      const askButton = screen.getByTestId('project-agent-ask-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        // Dialog should show "Project Agent - Ask" in its title
        expect(screen.getByText(/Project Agent - Ask/)).toBeInTheDocument();
      });
    });
  });

  describe('Prompt Execution', () => {
    it('calls onExecute callback when prompt is submitted', async () => {
      const onExecute = vi.fn();
      render(<ProjectAgentView apiClient={mockApiClient} onExecute={onExecute} />);

      // Open dialog
      const askButton = screen.getByTestId('project-agent-ask-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
      });

      // Enter prompt
      const promptInput = screen.getByTestId('ask-prompt-input');
      fireEvent.change(promptInput, { target: { value: 'Test prompt' } });

      // Submit
      const executeButton = screen.getByRole('button', { name: /実行/ });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(onExecute).toHaveBeenCalledWith('Test prompt');
      });
    });
  });
});
