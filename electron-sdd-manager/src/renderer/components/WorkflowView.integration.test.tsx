/**
 * WorkflowView Integration Tests
 * TDD: Testing IPC communication and error handling
 * Requirements: 3.1, 6.5, 11.1-11.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowView } from './WorkflowView';
import { useSpecStore } from '../stores/specStore';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import type { SpecDetail } from '../types';
import type { ExtendedSpecJson } from '../types/workflow';

// Setup real stores with mocked electronAPI
describe('WorkflowView Integration', () => {
  const mockSpecDetail: SpecDetail = {
    metadata: {
      name: 'test-feature',
      path: '/test/path',
      phase: 'init',
      updatedAt: '2024-01-01T00:00:00Z',
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
      readyForImplementation: false,
    },
    specJson: {
      feature_name: 'test-feature',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      language: 'ja',
      phase: 'init',
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
      ready_for_implementation: false,
    } as ExtendedSpecJson,
    artifacts: {
      requirements: null,
      design: null,
      tasks: null,
    },
    taskProgress: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset stores
    useSpecStore.setState({
      specs: [],
      selectedSpec: mockSpecDetail.metadata,
      specDetail: mockSpecDetail,
      sortBy: 'name',
      sortOrder: 'asc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
    });

    useWorkflowStore.setState({
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      validationOptions: { gap: false, design: false, impl: false },
      isAutoExecuting: false,
      currentAutoPhase: null,
    });

    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
    });
  });

  // ============================================================
  // Task 8.1: Phase execution command IPC
  // Requirements: 3.1, 11.1
  // ============================================================
  describe('Task 8.1: Phase execution command IPC', () => {
    it('should call startAgent with correct command for requirements phase', async () => {
      const mockStartAgent = vi.fn().mockResolvedValue({
        agentId: 'agent-1',
        specId: 'test-feature',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude',
      });
      window.electronAPI.startAgent = mockStartAgent;

      render(<WorkflowView />);

      // Click execute button for requirements phase
      const executeButtons = screen.getAllByRole('button', { name: /実行/i });
      fireEvent.click(executeButtons[0]);

      await waitFor(() => {
        expect(mockStartAgent).toHaveBeenCalledWith(
          'test-feature',
          'requirements',
          '/kiro:spec-requirements',
          ['test-feature'],
          'doc',
          undefined
        );
      });
    });

    it('should call startAgent for validation commands', async () => {
      const mockStartAgent = vi.fn().mockResolvedValue({
        agentId: 'agent-1',
        specId: 'test-feature',
        phase: 'validate-gap',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude',
      });
      window.electronAPI.startAgent = mockStartAgent;

      render(<WorkflowView />);

      // Find and click validate-gap execute button
      const validateGapSection = screen.getByText('validate-gap').closest('div');
      const executeButton = validateGapSection?.querySelector('button');
      if (executeButton) {
        fireEvent.click(executeButton);
      }

      await waitFor(() => {
        expect(mockStartAgent).toHaveBeenCalled();
      });
    });

    it('should call startAgent for spec-status command', async () => {
      const mockStartAgent = vi.fn().mockResolvedValue({
        agentId: 'agent-1',
        specId: 'test-feature',
        phase: 'status',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude',
      });
      window.electronAPI.startAgent = mockStartAgent;

      render(<WorkflowView />);

      // Click spec-status button
      const specStatusButton = screen.getByRole('button', { name: /spec-status/i });
      fireEvent.click(specStatusButton);

      await waitFor(() => {
        expect(mockStartAgent).toHaveBeenCalledWith(
          'test-feature',
          'status',
          '/kiro:spec-status',
          ['test-feature'],
          'doc',
          undefined
        );
      });
    });
  });

  // ============================================================
  // Task 8.2: Command result reception and state update
  // Requirements: 11.2, 11.3
  // ============================================================
  describe('Task 8.2: Command result reception', () => {
    it('should update agent store when agent starts', async () => {
      const mockAgent = {
        agentId: 'agent-1',
        specId: 'test-feature',
        phase: 'requirements',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude',
      };
      window.electronAPI.startAgent = vi.fn().mockResolvedValue(mockAgent);

      render(<WorkflowView />);

      const executeButtons = screen.getAllByRole('button', { name: /実行/i });
      fireEvent.click(executeButtons[0]);

      await waitFor(() => {
        const agents = useAgentStore.getState().agents;
        expect(agents.get('test-feature')).toBeDefined();
      });
    });
  });

  // ============================================================
  // Task 8.3: Error handling and retry
  // Requirements: 6.5, 11.4
  // ============================================================
  describe('Task 8.3: Error handling', () => {
    it('should handle agent start failure', async () => {
      window.electronAPI.startAgent = vi.fn().mockRejectedValue(new Error('Spawn failed'));

      render(<WorkflowView />);

      const executeButtons = screen.getAllByRole('button', { name: /実行/i });
      fireEvent.click(executeButtons[0]);

      await waitFor(() => {
        const error = useAgentStore.getState().error;
        expect(error).toBe('Spawn failed');
      });
    });
  });
});
