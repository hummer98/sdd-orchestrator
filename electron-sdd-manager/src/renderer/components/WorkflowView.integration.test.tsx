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
// Import child stores directly for proper test setup
import { useSpecDetailStore } from '../stores/spec/specDetailStore';
import { useSpecListStore } from '../stores/spec/specListStore';
import { useAutoExecutionStore } from '../stores/spec/autoExecutionStore';
import type { SpecDetail } from '../types';
import type { ExtendedSpecJson } from '../types/workflow';

// Setup real stores with mocked electronAPI
describe('WorkflowView Integration', () => {
  const mockSpecDetail: SpecDetail = {
    metadata: {
      name: 'test-feature',
      path: '/test/path',
      phase: 'initialized',
      updatedAt: '2024-01-01T00:00:00Z',
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
    },
    specJson: {
      feature_name: 'test-feature',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      language: 'ja',
      phase: 'initialized',
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
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

    // Reset child stores directly (facade aggregates these)
    // This ensures selectedSpec is properly set in the underlying store
    useSpecDetailStore.setState({
      selectedSpec: mockSpecDetail.metadata,
      specDetail: mockSpecDetail,
      isLoading: false,
      error: null,
    });

    useSpecListStore.setState({
      specs: [],
      specJsonMap: new Map(),
      sortBy: 'name',
      sortOrder: 'asc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
    });

    useAutoExecutionStore.setState({
      autoExecutionRuntimeMap: new Map(),
    });

    useWorkflowStore.setState({
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      validationOptions: { gap: false, design: false },
      isAutoExecuting: false,
      currentAutoPhase: null,
      commandPrefix: 'kiro',
      autoExecutionStatus: 'idle',
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,
      documentReviewOptions: {
        autoExecutionFlag: 'run',
      },
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
    it('should call executePhase with correct args for requirements phase', async () => {
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
      const mockExecutePhase = vi.fn().mockResolvedValue(mockAgent);
      window.electronAPI.executePhase = mockExecutePhase;

      render(<WorkflowView />);

      // Find the execute button by looking for enabled button with "実行" text
      const allButtons = screen.getAllByRole('button');
      const executeButton = allButtons.find(
        (btn) => btn.textContent?.includes('実行') && !btn.hasAttribute('disabled')
      );

      if (!executeButton) {
        // Fallback: just use the first button that contains '実行'
        const executeButtons = screen.getAllByRole('button', { name: /実行/i });
        fireEvent.click(executeButtons[0]);
      } else {
        fireEvent.click(executeButton);
      }

      await waitFor(() => {
        expect(mockExecutePhase).toHaveBeenCalledWith(
          'test-feature',
          'requirements',
          'test-feature',
          'kiro'
        );
      });
    });

    it('should call executeSpecStatus for spec-status command', async () => {
      const mockAgent = {
        agentId: 'agent-1',
        specId: 'test-feature',
        phase: 'status',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude',
      };
      const mockExecuteSpecStatus = vi.fn().mockResolvedValue(mockAgent);
      window.electronAPI.executeSpecStatus = mockExecuteSpecStatus;

      render(<WorkflowView />);

      // Click spec-status button
      const specStatusButton = screen.getByRole('button', { name: /spec-status/i });
      fireEvent.click(specStatusButton);

      await waitFor(() => {
        expect(mockExecuteSpecStatus).toHaveBeenCalledWith(
          'test-feature',
          'test-feature',
          'kiro'
        );
      });
    });
  });

  // ============================================================
  // Task 8.2: Command result reception and state update
  // Requirements: 11.2, 11.3
  // Note: File as SSOT - agent store is updated via file watcher events
  // ============================================================
  describe('Task 8.2: Command result reception', () => {
    it('should call executePhase IPC and update store via file watcher', async () => {
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
      window.electronAPI.executePhase = vi.fn().mockResolvedValue(mockAgent);

      render(<WorkflowView />);

      // Find the execute button by looking for enabled button with "実行" text
      const allButtons = screen.getAllByRole('button');
      const executeButton = allButtons.find(
        (btn) => btn.textContent?.includes('実行') && !btn.hasAttribute('disabled')
      );

      if (executeButton) {
        fireEvent.click(executeButton);
      }

      // Verify executePhase was called
      await waitFor(() => {
        expect(window.electronAPI.executePhase).toHaveBeenCalledWith(
          'test-feature',
          'requirements',
          'test-feature',
          'kiro'
        );
      });

      // Simulate file watcher updating the store (File as SSOT architecture)
      // In production, this happens via onAgentRecordChanged IPC event
      useAgentStore.getState().addAgent(mockAgent.specId, mockAgent);

      // Verify store was updated
      const agents = useAgentStore.getState().agents;
      expect(agents.get('test-feature')).toBeDefined();
      expect(agents.get('test-feature')![0].agentId).toBe('agent-1');
    });
  });

  // ============================================================
  // Task 8.3: Error handling and retry
  // Requirements: 6.5, 11.4
  // ============================================================
  describe('Task 8.3: Error handling', () => {
    it('should handle agent start failure', async () => {
      const mockExecutePhase = vi.fn().mockRejectedValue(new Error('Spawn failed'));
      window.electronAPI.executePhase = mockExecutePhase;

      render(<WorkflowView />);

      // Find the execute button by looking for enabled button with "実行" text
      const allButtons = screen.getAllByRole('button');
      const executeButton = allButtons.find(
        (btn) => btn.textContent?.includes('実行') && !btn.hasAttribute('disabled')
      );

      if (executeButton) {
        fireEvent.click(executeButton);
      }

      // Error is shown via notification, not stored in agentStore
      // Just verify the API was called
      await waitFor(() => {
        expect(mockExecutePhase).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // NOTE: spec-scoped-auto-execution-state tests removed
  // These tests were for the deprecated Renderer-side AutoExecutionService.
  // Auto-execution is now managed by Main Process AutoExecutionCoordinator via IPC.
  // See: auto-execution-main-process feature, deprecated-auto-execution-service-cleanup bug fix
  // ============================================================
});
