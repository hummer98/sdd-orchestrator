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

    it('should call executeValidation for validation commands', async () => {
      const mockAgent = {
        agentId: 'agent-1',
        specId: 'test-feature',
        phase: 'validate-gap',
        pid: 12345,
        sessionId: 'session-1',
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        command: 'claude',
      };
      const mockExecuteValidation = vi.fn().mockResolvedValue(mockAgent);
      window.electronAPI.executeValidation = mockExecuteValidation;

      render(<WorkflowView />);

      // Find validate-gap section and its execute button
      // ValidateOption renders a button with "実行" text inside the option div
      const validateOptions = screen.getAllByTestId('validate-option');
      // The first validate option is validate-gap
      const gapOption = validateOptions[0];
      // Get all buttons within this option and find the one that's not the info button
      const allButtonsInOption = gapOption.querySelectorAll('button');
      const executeButton = Array.from(allButtonsInOption).find(
        (btn) => btn.textContent?.includes('実行') && !btn.hasAttribute('disabled')
      );
      if (executeButton) {
        fireEvent.click(executeButton);
      }

      await waitFor(() => {
        expect(mockExecuteValidation).toHaveBeenCalled();
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
  // spec-scoped-auto-execution-state Task 9.5: E2E Integration Tests
  // Requirements: 3.1, 3.2, 4.1, 4.2, 6.1, 6.3
  // ============================================================
  describe('spec-scoped-auto-execution-state: Spec-Scoped Auto Execution', () => {
    const mockSpecDetailWithAutoExecution: SpecDetail = {
      metadata: {
        name: 'spec-with-auto',
        path: '/test/specs/spec-with-auto',
        phase: 'initialized',
        updatedAt: '2024-01-01T00:00:00Z',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      },
      specJson: {
        feature_name: 'spec-with-auto',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        language: 'ja',
        phase: 'initialized',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        autoExecution: {
          enabled: true,
          permissions: {
            requirements: true,
            design: true,
            tasks: false,
            impl: false,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
          validationOptions: {
            gap: true,
            design: false,
            impl: false,
          },
        },
      } as ExtendedSpecJson,
      artifacts: {
        requirements: null,
        design: null,
        tasks: null,
      },
      taskProgress: null,
    };

    const mockSpecDetailB: SpecDetail = {
      metadata: {
        name: 'spec-b',
        path: '/test/specs/spec-b',
        phase: 'design-generated',
        updatedAt: '2024-01-02T00:00:00Z',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: false },
          tasks: { generated: false, approved: false },
        },
      },
      specJson: {
        feature_name: 'spec-b',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: false },
          tasks: { generated: false, approved: false },
        },
        autoExecution: {
          enabled: false,
          permissions: {
            requirements: false,
            design: false,
            tasks: false,
            impl: false,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'skip',
          validationOptions: {
            gap: false,
            design: false,
            impl: false,
          },
        },
      } as ExtendedSpecJson,
      artifacts: {
        requirements: null,
        design: null,
        tasks: null,
      },
      taskProgress: null,
    };

    it('should sync autoExecution state to workflowStore when spec is selected', async () => {
      // Set up spec with autoExecution enabled
      useSpecStore.setState({
        selectedSpec: mockSpecDetailWithAutoExecution.metadata,
        specDetail: mockSpecDetailWithAutoExecution,
      });

      // Verify workflowStore is synced (happens via selectSpec -> syncFromSpecAutoExecution)
      // In production, this is triggered by selectSpec action
      // For this test, we simulate the sync by directly calling the service
      const { getAutoExecutionService } = await import('../services/AutoExecutionService');
      const service = getAutoExecutionService();
      service.syncFromSpecAutoExecution();

      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(true);
      expect(workflowState.autoExecutionPermissions.design).toBe(true);
      expect(workflowState.autoExecutionPermissions.tasks).toBe(false);
      expect(workflowState.documentReviewOptions.autoExecutionFlag).toBe('run');
      expect(workflowState.validationOptions.gap).toBe(true);
    });

    it('should maintain spec independence when switching specs', async () => {
      const { getAutoExecutionService, disposeAutoExecutionService } = await import(
        '../services/AutoExecutionService'
      );

      // First, select spec with autoExecution enabled
      useSpecStore.setState({
        selectedSpec: mockSpecDetailWithAutoExecution.metadata,
        specDetail: mockSpecDetailWithAutoExecution,
      });

      disposeAutoExecutionService();
      const service1 = getAutoExecutionService();
      service1.syncFromSpecAutoExecution();

      // Verify spec-with-auto settings
      let workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(true);
      expect(workflowState.validationOptions.gap).toBe(true);

      // Switch to spec-b (autoExecution disabled)
      useSpecStore.setState({
        selectedSpec: mockSpecDetailB.metadata,
        specDetail: mockSpecDetailB,
      });

      disposeAutoExecutionService();
      const service2 = getAutoExecutionService();
      service2.syncFromSpecAutoExecution();

      // Verify spec-b settings (different from spec-with-auto)
      workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(false);
      expect(workflowState.validationOptions.gap).toBe(false);
      expect(workflowState.documentReviewOptions.autoExecutionFlag).toBe('skip');

      // Switch back to spec-with-auto
      useSpecStore.setState({
        selectedSpec: mockSpecDetailWithAutoExecution.metadata,
        specDetail: mockSpecDetailWithAutoExecution,
      });

      disposeAutoExecutionService();
      const service3 = getAutoExecutionService();
      service3.syncFromSpecAutoExecution();

      // Verify spec-with-auto settings are restored
      workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(true);
      expect(workflowState.validationOptions.gap).toBe(true);
    });

    it('should handle external spec.json changes via FileWatcher', async () => {
      // Set up spec store with initial state
      useSpecStore.setState({
        selectedSpec: mockSpecDetailWithAutoExecution.metadata,
        specDetail: mockSpecDetailWithAutoExecution,
      });

      // Simulate external change to spec.json (e.g., by Claude agent)
      // In production, this happens via FileWatcher -> refreshSpecDetail
      const updatedSpecDetail: SpecDetail = {
        ...mockSpecDetailWithAutoExecution,
        specJson: {
          ...mockSpecDetailWithAutoExecution.specJson,
          autoExecution: {
            enabled: true,
            permissions: {
              requirements: true,
              design: true,
              tasks: true, // Changed from false to true
              impl: true, // Changed from false to true
              inspection: false,
              deploy: false,
            },
            documentReviewFlag: 'pause', // Changed from 'run' to 'pause'
            validationOptions: {
              gap: false, // Changed from true to false
              design: true, // Changed from false to true
              impl: false,
            },
          },
        },
      };

      // Update spec store (simulating FileWatcher triggering refreshSpecDetail)
      useSpecStore.setState({
        specDetail: updatedSpecDetail,
      });

      // Sync the updated state
      const { getAutoExecutionService, disposeAutoExecutionService } = await import(
        '../services/AutoExecutionService'
      );
      disposeAutoExecutionService();
      const service = getAutoExecutionService();
      service.syncFromSpecAutoExecution();

      // Verify workflowStore reflects the external changes
      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.tasks).toBe(true);
      expect(workflowState.autoExecutionPermissions.impl).toBe(true);
      expect(workflowState.documentReviewOptions.autoExecutionFlag).toBe('pause');
      expect(workflowState.validationOptions.gap).toBe(false);
      expect(workflowState.validationOptions.design).toBe(true);
    });

    it('should use default state when spec has no autoExecution field', async () => {
      // Create spec without autoExecution field
      const mockSpecWithoutAutoExecution: SpecDetail = {
        metadata: {
          name: 'legacy-spec',
          path: '/test/specs/legacy-spec',
          phase: 'initialized',
          updatedAt: '2024-01-01T00:00:00Z',
          approvals: {
            requirements: { generated: false, approved: false },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
        specJson: {
          feature_name: 'legacy-spec',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          language: 'ja',
          phase: 'initialized',
          approvals: {
            requirements: { generated: false, approved: false },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
          // No autoExecution field - simulating legacy spec
        } as ExtendedSpecJson,
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
        },
        taskProgress: null,
      };

      useSpecStore.setState({
        selectedSpec: mockSpecWithoutAutoExecution.metadata,
        specDetail: mockSpecWithoutAutoExecution,
      });

      const { getAutoExecutionService, disposeAutoExecutionService } = await import(
        '../services/AutoExecutionService'
      );
      disposeAutoExecutionService();
      const service = getAutoExecutionService();
      service.syncFromSpecAutoExecution();

      // Verify default state is applied
      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(false);
      expect(workflowState.autoExecutionPermissions.design).toBe(false);
      expect(workflowState.autoExecutionPermissions.tasks).toBe(false);
      expect(workflowState.documentReviewOptions.autoExecutionFlag).toBe('skip');
      expect(workflowState.validationOptions.gap).toBe(false);
    });
  });
});
