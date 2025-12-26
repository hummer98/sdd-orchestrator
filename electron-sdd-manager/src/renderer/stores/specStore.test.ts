/**
 * Spec Store Tests
 * TDD: Testing spec list and detail state management
 * Requirements: 2.1-2.6, 3.1-3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpecStore } from './specStore';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from './workflowStore';
import { getAutoExecutionService, disposeAutoExecutionService } from '../services/AutoExecutionService';
import type { SpecMetadata } from '../types';

const mockSpecs: SpecMetadata[] = [
  {
    name: 'feature-a',
    path: '/project/.kiro/specs/feature-a',
    phase: 'design-generated',
    updatedAt: '2024-01-15T10:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: false },
      tasks: { generated: false, approved: false },
    },
  },
  {
    name: 'feature-b',
    path: '/project/.kiro/specs/feature-b',
    phase: 'tasks-generated',
    updatedAt: '2024-01-16T10:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  },
  {
    name: 'feature-c',
    path: '/project/.kiro/specs/feature-c',
    phase: 'initialized',
    updatedAt: '2024-01-14T10:00:00Z',
    approvals: {
      requirements: { generated: false, approved: false },
      design: { generated: false, approved: false },
      tasks: { generated: false, approved: false },
    },
  },
];

describe('useSpecStore', () => {
  beforeEach(() => {
    // Reset store state
    useSpecStore.setState({
      specs: [],
      selectedSpec: null,
      specDetail: null,
      sortBy: 'name',
      sortOrder: 'asc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('loadSpecs', () => {
    it('should load specs from project', async () => {
      window.electronAPI.readSpecs = vi.fn().mockResolvedValue(mockSpecs);

      await useSpecStore.getState().loadSpecs('/project');

      const state = useSpecStore.getState();
      expect(state.specs).toHaveLength(3);
    });

    it('should set isLoading during load', async () => {
      window.electronAPI.readSpecs = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSpecs), 100))
      );

      const loadPromise = useSpecStore.getState().loadSpecs('/project');

      expect(useSpecStore.getState().isLoading).toBe(true);

      await loadPromise;

      expect(useSpecStore.getState().isLoading).toBe(false);
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      useSpecStore.setState({ specs: mockSpecs });
    });

    it('should sort by name ascending', () => {
      useSpecStore.getState().setSortBy('name');
      useSpecStore.getState().setSortOrder('asc');

      const sorted = useSpecStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-a');
      expect(sorted[2].name).toBe('feature-c');
    });

    it('should sort by name descending', () => {
      useSpecStore.getState().setSortBy('name');
      useSpecStore.getState().setSortOrder('desc');

      const sorted = useSpecStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-c');
      expect(sorted[2].name).toBe('feature-a');
    });

    it('should sort by updatedAt', () => {
      useSpecStore.getState().setSortBy('updatedAt');
      useSpecStore.getState().setSortOrder('desc');

      const sorted = useSpecStore.getState().getSortedFilteredSpecs();
      expect(sorted[0].name).toBe('feature-b'); // Most recent
      expect(sorted[2].name).toBe('feature-c'); // Oldest
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      useSpecStore.setState({ specs: mockSpecs });
    });

    it('should filter by phase', () => {
      useSpecStore.getState().setStatusFilter('initialized');

      const filtered = useSpecStore.getState().getSortedFilteredSpecs();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('feature-c');
    });

    it('should show all specs when filter is "all"', () => {
      useSpecStore.getState().setStatusFilter('all');

      const filtered = useSpecStore.getState().getSortedFilteredSpecs();
      expect(filtered).toHaveLength(3);
    });
  });

  describe('selectSpec', () => {
    it('should set selected spec and load details', async () => {
      const mockSpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      const state = useSpecStore.getState();
      expect(state.selectedSpec).toEqual(mockSpecs[0]);
      expect(state.specDetail).toBeTruthy();
    });
  });

  // ============================================================
  // spec-scoped-auto-execution-state Task 4: UI integration
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  describe('Spec-Scoped Auto Execution State Integration', () => {
    beforeEach(() => {
      // Reset workflow store
      useWorkflowStore.setState({
        autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
        validationOptions: { gap: false, design: false, impl: false },
        documentReviewOptions: { autoExecutionFlag: 'run' },
        isAutoExecuting: false,
        currentAutoPhase: null,
        autoExecutionStatus: 'idle',
        lastFailedPhase: null,
        failedRetryCount: 0,
        executionSummary: null,
        pendingReviewConfirmation: false,
      });
      // Dispose and re-create AutoExecutionService
      disposeAutoExecutionService();
    });

    it('should sync autoExecution state when selecting a spec with autoExecution', async () => {
      const mockSpecJson = {
        feature_name: 'feature-auto',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
        autoExecution: {
          enabled: true,
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
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
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      // Verify workflow store is synced with spec autoExecution
      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(true);
      expect(workflowState.autoExecutionPermissions.design).toBe(true);
      expect(workflowState.autoExecutionPermissions.tasks).toBe(true);
      expect(workflowState.autoExecutionPermissions.impl).toBe(false);
      expect(workflowState.documentReviewOptions.autoExecutionFlag).toBe('run');
      expect(workflowState.validationOptions.gap).toBe(true);
    });

    it('should not modify workflowStore when spec has no autoExecution', async () => {
      const mockSpecJson = {
        feature_name: 'feature-no-auto',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
        // No autoExecution field
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);

      // Set some initial values
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: false,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      // Verify workflow store uses defaults (not synced from spec)
      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(false);
      expect(workflowState.documentReviewOptions.autoExecutionFlag).toBe('skip');
    });
  });

  // ============================================================
  // spec-scoped-auto-execution-state Task 4.3: refreshSpecDetail
  // Requirements: 6.3
  // ============================================================
  describe('refreshSpecDetail', () => {
    it('should reload spec.json and update specDetail when called', async () => {
      // First select a spec
      const mockSpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      // Verify initial state
      const initialDetail = useSpecStore.getState().specDetail;
      expect(initialDetail?.specJson.phase).toBe('design-generated');

      // Simulate external change - spec.json updated with new phase
      const updatedSpecJson = {
        ...mockSpecJson,
        phase: 'tasks-generated',
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
          validationOptions: { gap: true, design: false, impl: false },
        },
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(updatedSpecJson);

      // Call refreshSpecDetail
      await useSpecStore.getState().refreshSpecDetail();

      // Verify specDetail is updated with new values
      const refreshedDetail = useSpecStore.getState().specDetail;
      expect(refreshedDetail?.specJson.phase).toBe('tasks-generated');
      expect(refreshedDetail?.specJson.autoExecution?.enabled).toBe(true);
    });

    it('should do nothing when no spec is selected', async () => {
      // Ensure no spec is selected
      useSpecStore.setState({ selectedSpec: null, specDetail: null });

      // Call refreshSpecDetail - should not throw
      await useSpecStore.getState().refreshSpecDetail();

      // State should remain unchanged
      expect(useSpecStore.getState().selectedSpec).toBeNull();
      expect(useSpecStore.getState().specDetail).toBeNull();
    });

    it('should sync autoExecution state to workflowStore after refresh', async () => {
      // Reset workflow store
      useWorkflowStore.setState({
        autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
        validationOptions: { gap: false, design: false, impl: false },
        documentReviewOptions: { autoExecutionFlag: 'skip' },
      });

      // First select a spec without autoExecution
      const mockSpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      // Simulate external change - autoExecution added
      const updatedSpecJson = {
        ...mockSpecJson,
        autoExecution: {
          enabled: true,
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            impl: false,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
          validationOptions: { gap: true, design: true, impl: false },
        },
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(updatedSpecJson);
      disposeAutoExecutionService(); // Reset service to ensure fresh sync

      // Call refreshSpecDetail
      await useSpecStore.getState().refreshSpecDetail();

      // Verify workflowStore is synced with updated autoExecution
      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(true);
      expect(workflowState.autoExecutionPermissions.design).toBe(true);
      expect(workflowState.autoExecutionPermissions.tasks).toBe(true);
      expect(workflowState.documentReviewOptions.autoExecutionFlag).toBe('run');
      expect(workflowState.validationOptions.gap).toBe(true);
      expect(workflowState.validationOptions.design).toBe(true);
    });

    it('should handle errors gracefully during refresh', async () => {
      // First select a spec
      const mockSpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      // Mock error on refresh
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.electronAPI.readSpecJson = vi.fn().mockRejectedValue(new Error('Read error'));

      // Call refreshSpecDetail - should not throw
      await useSpecStore.getState().refreshSpecDetail();

      // Original specDetail should be preserved (graceful failure)
      expect(useSpecStore.getState().specDetail?.specJson.phase).toBe('design-generated');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================
  // spec-scoped-auto-execution-state Task 7.1-7.3: FileWatcher Integration
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================
  describe('FileWatcher Integration', () => {
    it('should refresh specs on file change event (via refreshSpecs)', async () => {
      // Mock readSpecs for initial load
      window.electronAPI.readSpecs = vi.fn().mockResolvedValue(mockSpecs);

      // Set up initial state
      useSpecStore.setState({ specs: mockSpecs, selectedSpec: mockSpecs[0] });

      // Mock readSpecJson for the refresh
      const updatedSpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-16T10:00:00Z',
        language: 'ja',
        phase: 'tasks-generated',
        approvals: mockSpecs[0].approvals,
        autoExecution: {
          enabled: true,
          permissions: { requirements: true, design: true, tasks: false, impl: false, inspection: false, deploy: false },
          documentReviewFlag: 'run',
          validationOptions: { gap: false, design: false, impl: false },
        },
      };
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(updatedSpecJson);

      // Need to mock projectStore for refreshSpecs
      vi.doMock('./projectStore', async () => {
        return {
          useProjectStore: {
            getState: () => ({ currentProject: '/project' }),
          },
        };
      });

      // refreshSpecs is called when FileWatcher detects changes
      // This simulates what happens when onSpecsChanged callback is invoked
      await useSpecStore.getState().refreshSpecs();

      // readSpecs should have been called to refresh the list
      expect(window.electronAPI.readSpecs).toHaveBeenCalledWith('/project');
    });

    it('should update specDetail when selected spec changes externally', async () => {
      // Initial setup
      const mockSpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'design-generated',
        approvals: mockSpecs[0].approvals,
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      // Verify initial state
      expect(useSpecStore.getState().specDetail?.specJson.phase).toBe('design-generated');

      // Now simulate external change detected by FileWatcher
      const updatedSpecJson = {
        ...mockSpecJson,
        phase: 'tasks-generated',
        autoExecution: {
          enabled: true,
          permissions: { requirements: true, design: true, tasks: true, impl: false, inspection: false, deploy: false },
          documentReviewFlag: 'run',
          validationOptions: { gap: true, design: false, impl: false },
        },
      };
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(updatedSpecJson);

      // This is what happens when FileWatcher detects a change
      await useSpecStore.getState().refreshSpecDetail();

      // specDetail should be updated with external changes
      expect(useSpecStore.getState().specDetail?.specJson.phase).toBe('tasks-generated');
      expect(useSpecStore.getState().specDetail?.specJson.autoExecution?.enabled).toBe(true);

      // workflowStore should be synced
      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionPermissions.requirements).toBe(true);
      expect(workflowState.autoExecutionPermissions.design).toBe(true);
      expect(workflowState.autoExecutionPermissions.tasks).toBe(true);
      expect(workflowState.validationOptions.gap).toBe(true);
    });
  });

  // ============================================================
  // spec-inspection: inspection フィールドありの spec.json 読み込みテスト
  // Requirements: 12.4, 12.5
  // ============================================================
  describe('Inspection Report Loading', () => {
    it('should load inspection artifact when spec.json has inspection field', async () => {
      const mockSpecJson = {
        feature_name: 'feature-inspected',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'implementation-complete',
        approvals: mockSpecs[0].approvals,
        inspection: {
          passed: true,
          inspected_at: '2024-01-15T12:00:00Z',
          report_file: 'inspection-1.md',
        },
      };

      const mockInspectionContent = '# Inspection Report #1\n\n## Summary\n**Judgment**: GO';

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockImplementation((path: string) => {
        if (path.endsWith('inspection-1.md')) {
          return Promise.resolve(mockInspectionContent);
        }
        return Promise.reject(new Error('Not found'));
      });

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      const state = useSpecStore.getState();
      expect(state.specDetail).toBeTruthy();
      expect(state.specDetail?.artifacts.inspection).toBeTruthy();
      expect(state.specDetail?.artifacts.inspection?.exists).toBe(true);
      expect(state.specDetail?.artifacts.inspection?.content).toBe(mockInspectionContent);
    });

    it('should set inspection artifact to null when spec.json has no inspection field', async () => {
      const mockSpecJson = {
        feature_name: 'feature-no-inspection',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'tasks-generated',
        approvals: mockSpecs[0].approvals,
        // No inspection field
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockRejectedValue(new Error('Not found'));

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      const state = useSpecStore.getState();
      expect(state.specDetail).toBeTruthy();
      expect(state.specDetail?.artifacts.inspection).toBeNull();
    });

    it('should handle inspection artifact file read error gracefully', async () => {
      const mockSpecJson = {
        feature_name: 'feature-inspected-missing',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'implementation-complete',
        approvals: mockSpecs[0].approvals,
        inspection: {
          passed: true,
          inspected_at: '2024-01-15T12:00:00Z',
          report_file: 'inspection-1.md',
        },
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockRejectedValue(new Error('File not found'));

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      const state = useSpecStore.getState();
      expect(state.specDetail).toBeTruthy();
      // inspection artifact should be null when file read fails
      expect(state.specDetail?.artifacts.inspection).toBeNull();
    });

    it('should include inspection field in specJson when present', async () => {
      const mockSpecJson = {
        feature_name: 'feature-inspected',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        language: 'ja',
        phase: 'implementation-complete',
        approvals: mockSpecs[0].approvals,
        inspection: {
          passed: true,
          inspected_at: '2024-01-15T12:00:00Z',
          report_file: 'inspection-1.md',
        },
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockRejectedValue(new Error('Not found'));

      await useSpecStore.getState().selectSpec(mockSpecs[0]);

      const state = useSpecStore.getState();
      expect(state.specDetail?.specJson.inspection).toBeTruthy();
      expect(state.specDetail?.specJson.inspection?.passed).toBe(true);
      expect(state.specDetail?.specJson.inspection?.report_file).toBe('inspection-1.md');
    });
  });

  // ============================================================
  // spec-scoped-auto-execution-state: Spec毎の自動実行Runtime State
  // This tests the new per-spec runtime state management in specStore
  // ============================================================
  describe('Spec毎の自動実行Runtime State', () => {
    const TEST_SPEC_ID = 'test-feature';

    describe('initial state', () => {
      it('should have empty autoExecutionRuntimeMap initially', () => {
        const state = useSpecStore.getState();
        expect(state.autoExecutionRuntimeMap.size).toBe(0);
      });
    });

    describe('getAutoExecutionRuntime', () => {
      it('should return default state for unknown specId', () => {
        const runtime = useSpecStore.getState().getAutoExecutionRuntime('unknown-spec');
        expect(runtime.isAutoExecuting).toBe(false);
        expect(runtime.currentAutoPhase).toBeNull();
        expect(runtime.autoExecutionStatus).toBe('idle');
      });

      it('should return stored state for known specId', () => {
        useSpecStore.getState().startAutoExecution(TEST_SPEC_ID);
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.isAutoExecuting).toBe(true);
        expect(runtime.autoExecutionStatus).toBe('running');
      });
    });

    describe('setAutoExecutionRunning', () => {
      it('should set isAutoExecuting to true for specific spec', () => {
        useSpecStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.isAutoExecuting).toBe(true);
      });

      it('should set isAutoExecuting to false for specific spec', () => {
        useSpecStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
        useSpecStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, false);
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.isAutoExecuting).toBe(false);
      });

      it('should not affect other specs', () => {
        useSpecStore.getState().setAutoExecutionRunning(TEST_SPEC_ID, true);
        const otherRuntime = useSpecStore.getState().getAutoExecutionRuntime('other-spec');
        expect(otherRuntime.isAutoExecuting).toBe(false);
      });
    });

    describe('setAutoExecutionPhase', () => {
      it('should set currentAutoPhase for specific spec', () => {
        useSpecStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.currentAutoPhase).toBe('design');
      });

      it('should allow setting to null', () => {
        useSpecStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'tasks');
        useSpecStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, null);
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.currentAutoPhase).toBeNull();
      });
    });

    describe('setAutoExecutionStatus', () => {
      it('should set autoExecutionStatus to running for specific spec', () => {
        useSpecStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'running');
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.autoExecutionStatus).toBe('running');
      });

      it('should set autoExecutionStatus to paused for specific spec', () => {
        useSpecStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'paused');
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.autoExecutionStatus).toBe('paused');
      });

      it('should set autoExecutionStatus to completed for specific spec', () => {
        useSpecStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'completed');
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.autoExecutionStatus).toBe('completed');
      });

      it('should set autoExecutionStatus to error for specific spec', () => {
        useSpecStore.getState().setAutoExecutionStatus(TEST_SPEC_ID, 'error');
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.autoExecutionStatus).toBe('error');
      });
    });

    describe('startAutoExecution', () => {
      it('should set isAutoExecuting to true and status to running for specific spec', () => {
        useSpecStore.getState().startAutoExecution(TEST_SPEC_ID);
        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.isAutoExecuting).toBe(true);
        expect(runtime.autoExecutionStatus).toBe('running');
      });

      it('should allow multiple specs to be executing simultaneously', () => {
        useSpecStore.getState().startAutoExecution(TEST_SPEC_ID);
        useSpecStore.getState().startAutoExecution('another-spec');

        const runtime1 = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        const runtime2 = useSpecStore.getState().getAutoExecutionRuntime('another-spec');

        expect(runtime1.isAutoExecuting).toBe(true);
        expect(runtime2.isAutoExecuting).toBe(true);
      });
    });

    describe('stopAutoExecution', () => {
      it('should reset auto execution state for specific spec', () => {
        // First start auto execution
        useSpecStore.getState().startAutoExecution(TEST_SPEC_ID);
        useSpecStore.getState().setAutoExecutionPhase(TEST_SPEC_ID, 'design');

        // Then stop
        useSpecStore.getState().stopAutoExecution(TEST_SPEC_ID);

        const runtime = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        expect(runtime.isAutoExecuting).toBe(false);
        expect(runtime.currentAutoPhase).toBeNull();
        expect(runtime.autoExecutionStatus).toBe('idle');
      });

      it('should not affect other specs when stopping one', () => {
        // Start both specs
        useSpecStore.getState().startAutoExecution(TEST_SPEC_ID);
        useSpecStore.getState().startAutoExecution('another-spec');

        // Stop only one
        useSpecStore.getState().stopAutoExecution(TEST_SPEC_ID);

        const runtime1 = useSpecStore.getState().getAutoExecutionRuntime(TEST_SPEC_ID);
        const runtime2 = useSpecStore.getState().getAutoExecutionRuntime('another-spec');

        expect(runtime1.isAutoExecuting).toBe(false);
        expect(runtime2.isAutoExecuting).toBe(true);
      });
    });
  });
});
