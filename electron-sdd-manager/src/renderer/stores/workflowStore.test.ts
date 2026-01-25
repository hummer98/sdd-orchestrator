/**
 * Workflow Store Tests
 * TDD: Testing workflow state management
 * Requirements: 5.1-5.4, 6.1-6.6, 7.1-7.4, 8.1-8.5
 * spec-scoped-auto-execution-state Task 5.1: workflowStore simplification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from './workflowStore';
import type { ExecutionSummary } from './workflowStore';
import { DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS } from '../types/bugAutoExecution';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    // Reset store state
    // Note: isAutoExecuting, currentAutoPhase, autoExecutionStatus have been removed
    // as part of spec-scoped-auto-execution-state Task 5.1 migration
    // inspection-permission-unification: inspectionAutoExecutionFlag removed
    useWorkflowStore.setState({
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,
      // Reset document review options to default 'pause'
      documentReviewOptions: { autoExecutionFlag: 'pause' },
      // bugs-workflow-auto-execution: Reset bug auto execution permissions
      bugAutoExecutionPermissions: { ...DEFAULT_BUG_AUTO_EXECUTION_PERMISSIONS },
      // inspection-permission-unification: inspectionAutoExecutionFlag removed from state
    });
  });

  // ============================================================
  // spec-scoped-auto-execution-state Task 5.1: Field Removal Tests
  // Requirements: 5.3
  // These tests verify that deprecated fields have been removed from workflowStore
  // ============================================================
  describe('Task 5.1: Deprecated field removal', () => {
    it('should NOT have isAutoExecuting field (migrated to spec.json)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('isAutoExecuting');
    });

    it('should NOT have currentAutoPhase field (migrated to spec.json)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('currentAutoPhase');
    });

    it('should NOT have autoExecutionStatus field (migrated to spec.json)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('autoExecutionStatus');
    });

    it('should still have autoExecutionPermissions (global default setting)', () => {
      const state = useWorkflowStore.getState();
      expect(state).toHaveProperty('autoExecutionPermissions');
      expect(state.autoExecutionPermissions).toBeDefined();
    });

    it('should NOT have startAutoExecution action (deprecated)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('startAutoExecution');
    });

    it('should NOT have stopAutoExecution action (deprecated)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('stopAutoExecution');
    });

    it('should NOT have setCurrentAutoPhase action (deprecated)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('setCurrentAutoPhase');
    });

    it('should NOT have setAutoExecutionStatus action (deprecated)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('setAutoExecutionStatus');
    });
  });

  // ============================================================
  // Task 2.1: Auto Execution Permissions
  // Requirements: 5.1, 5.2, 5.3
  // inspection-permission-unification: inspection default changed to true
  // ============================================================
  describe('Task 2.1: Auto execution permissions', () => {
    describe('initial state', () => {
      it('should have requirements permitted by default', () => {
        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.requirements).toBe(true);
      });

      // inspection-permission-unification: inspection is now true by default
      it('should have inspection permitted by default (inspection-permission-unification)', () => {
        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.inspection).toBe(true);
      });

      it('should have other phases not permitted by default', () => {
        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.design).toBe(false);
        expect(state.autoExecutionPermissions.tasks).toBe(false);
        expect(state.autoExecutionPermissions.impl).toBe(false);
        // inspection is now true by default - tested separately above
        expect(state.autoExecutionPermissions.deploy).toBe(false);
      });
    });

    describe('toggleAutoPermission', () => {
      it('should toggle permission for a phase', () => {
        useWorkflowStore.getState().toggleAutoPermission('design');

        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.design).toBe(true);
      });

      it('should toggle permission back to false', () => {
        useWorkflowStore.getState().toggleAutoPermission('requirements');

        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.requirements).toBe(false);
      });

      it('should only toggle the specified phase', () => {
        useWorkflowStore.getState().toggleAutoPermission('tasks');

        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.requirements).toBe(true);
        expect(state.autoExecutionPermissions.tasks).toBe(true);
        expect(state.autoExecutionPermissions.design).toBe(false);
      });
    });
  });

  // ============================================================
  // Task 2.3: Auto Execution State (DEPRECATED)
  // Note: isAutoExecuting, currentAutoPhase, autoExecutionStatus have been
  // migrated to spec.json as part of spec-scoped-auto-execution-state feature.
  // Tests for these fields are now in Task 5.1: Deprecated field removal.
  // ============================================================

  // ============================================================
  // Task 2.4: Reset Settings
  // Requirements: 5.4
  // Note: Updated to reflect simplified workflowStore (no auto execution state)
  // ============================================================
  describe('Task 2.4: Reset settings', () => {
    describe('resetSettings', () => {
      it('should reset auto execution permissions to defaults', () => {
        useWorkflowStore.setState({
          autoExecutionPermissions: {
            requirements: false,
            design: true,
            tasks: true,
            impl: true,
            inspection: true,
            deploy: true,
          },
        });

        useWorkflowStore.getState().resetSettings();

        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions).toEqual(DEFAULT_AUTO_EXECUTION_PERMISSIONS);
      });

      it('should reset failed state', () => {
        useWorkflowStore.setState({
          lastFailedPhase: 'design',
          failedRetryCount: 3,
        });

        useWorkflowStore.getState().resetSettings();

        const state = useWorkflowStore.getState();
        expect(state.lastFailedPhase).toBeNull();
        expect(state.failedRetryCount).toBe(0);
      });
    });
  });

  // ============================================================
  // Helper Methods
  // ============================================================
  describe('Helper methods', () => {
    describe('isPhaseAutoPermitted', () => {
      it('should return true for permitted phase', () => {
        const result = useWorkflowStore.getState().isPhaseAutoPermitted('requirements');
        expect(result).toBe(true);
      });

      it('should return false for non-permitted phase', () => {
        const result = useWorkflowStore.getState().isPhaseAutoPermitted('design');
        expect(result).toBe(false);
      });
    });

    describe('getNextAutoPhase', () => {
      it('should return the next phase after current', () => {
        const result = useWorkflowStore.getState().getNextAutoPhase('requirements');
        expect(result).toBe('design');
      });

      it('should return null if current is deploy', () => {
        const result = useWorkflowStore.getState().getNextAutoPhase('deploy');
        expect(result).toBeNull();
      });

      it('should return requirements if current is null', () => {
        const result = useWorkflowStore.getState().getNextAutoPhase(null);
        expect(result).toBe('requirements');
      });
    });
  });

  // ============================================================
  // Task 1.1: Auto execution status extension (UPDATED)
  // Requirements: 7.4
  // Note: autoExecutionStatus and isAutoExecuting have been migrated to spec.json
  // Only lastFailedPhase, failedRetryCount, executionSummary remain in workflowStore
  // ============================================================
  describe('Task 1.1: Auto execution state (simplified)', () => {
    describe('initial state', () => {
      it('should have null lastFailedPhase', () => {
        const state = useWorkflowStore.getState();
        expect(state.lastFailedPhase).toBeNull();
      });

      it('should have zero failedRetryCount', () => {
        const state = useWorkflowStore.getState();
        expect(state.failedRetryCount).toBe(0);
      });

      it('should have null executionSummary', () => {
        const state = useWorkflowStore.getState();
        expect(state.executionSummary).toBeNull();
      });
    });
  });

  // ============================================================
  // Task 1.2: State update actions (UPDATED)
  // Requirements: 7.1, 7.3
  // Note: setAutoExecutionStatus removed (migrated to spec.json)
  // ============================================================
  describe('Task 1.2: State update actions (simplified)', () => {
    describe('setLastFailedPhase', () => {
      it('should set last failed phase', () => {
        useWorkflowStore.getState().setLastFailedPhase('design');
        expect(useWorkflowStore.getState().lastFailedPhase).toBe('design');
      });

      it('should allow setting to null', () => {
        useWorkflowStore.getState().setLastFailedPhase('tasks');
        useWorkflowStore.getState().setLastFailedPhase(null);
        expect(useWorkflowStore.getState().lastFailedPhase).toBeNull();
      });
    });

    describe('incrementFailedRetryCount', () => {
      it('should increment retry count', () => {
        useWorkflowStore.getState().incrementFailedRetryCount();
        expect(useWorkflowStore.getState().failedRetryCount).toBe(1);
      });

      it('should increment multiple times', () => {
        useWorkflowStore.getState().incrementFailedRetryCount();
        useWorkflowStore.getState().incrementFailedRetryCount();
        useWorkflowStore.getState().incrementFailedRetryCount();
        expect(useWorkflowStore.getState().failedRetryCount).toBe(3);
      });
    });

    describe('resetFailedRetryCount', () => {
      it('should reset retry count to zero', () => {
        useWorkflowStore.getState().incrementFailedRetryCount();
        useWorkflowStore.getState().incrementFailedRetryCount();
        useWorkflowStore.getState().resetFailedRetryCount();
        expect(useWorkflowStore.getState().failedRetryCount).toBe(0);
      });
    });

    describe('setExecutionSummary', () => {
      it('should set execution summary', () => {
        const summary: ExecutionSummary = {
          executedPhases: ['requirements', 'design'],
          executedValidations: ['gap'],
          totalDuration: 5000,
          errors: [],
        };
        useWorkflowStore.getState().setExecutionSummary(summary);
        expect(useWorkflowStore.getState().executionSummary).toEqual(summary);
      });

      it('should allow setting to null', () => {
        const summary: ExecutionSummary = {
          executedPhases: ['requirements'],
          executedValidations: [],
          totalDuration: 1000,
          errors: [],
        };
        useWorkflowStore.getState().setExecutionSummary(summary);
        useWorkflowStore.getState().setExecutionSummary(null);
        expect(useWorkflowStore.getState().executionSummary).toBeNull();
      });

      it('should set execution summary with errors', () => {
        const summary: ExecutionSummary = {
          executedPhases: ['requirements', 'design'],
          executedValidations: [],
          totalDuration: 3000,
          errors: ['Design failed', 'Validation error'],
        };
        useWorkflowStore.getState().setExecutionSummary(summary);
        expect(useWorkflowStore.getState().executionSummary?.errors).toHaveLength(2);
      });
    });
  });

  // ============================================================
  // Task 1.3: Persistence exclusion for runtime state (UPDATED)
  // Requirements: 7.2, 7.4
  // Note: isAutoExecuting and autoExecutionStatus have been removed from workflowStore
  // ============================================================
  describe('Task 1.3: Persistence exclusion', () => {
    it('should not persist lastFailedPhase', () => {
      useWorkflowStore.setState({ lastFailedPhase: 'design' });

      const partialState = {
        autoExecutionPermissions: useWorkflowStore.getState().autoExecutionPermissions,
      };

      expect(partialState).not.toHaveProperty('lastFailedPhase');
    });

    it('should not persist failedRetryCount', () => {
      useWorkflowStore.setState({ failedRetryCount: 3 });

      const partialState = {
        autoExecutionPermissions: useWorkflowStore.getState().autoExecutionPermissions,
      };

      expect(partialState).not.toHaveProperty('failedRetryCount');
    });

    it('should persist autoExecutionPermissions', () => {
      const permissions = useWorkflowStore.getState().autoExecutionPermissions;
      expect(permissions).toBeDefined();
      expect(permissions.requirements).toBe(true);
    });
  });

  // ============================================================
  // bugs-workflow-auto-execution Task 1.1, 1.2, 1.3: Bug Auto Execution Settings
  // Requirements: 2.1, 2.2, 7.1-7.4
  // ============================================================
  describe('Bug Auto Execution Settings', () => {
    describe('initial state', () => {
      it('should have bugAutoExecutionPermissions with defaults', () => {
        const state = useWorkflowStore.getState();
        expect(state.bugAutoExecutionPermissions).toBeDefined();
        expect(state.bugAutoExecutionPermissions.analyze).toBe(true);
        expect(state.bugAutoExecutionPermissions.fix).toBe(true);
        expect(state.bugAutoExecutionPermissions.verify).toBe(true);
        expect(state.bugAutoExecutionPermissions.deploy).toBe(false);
      });
    });

    describe('toggleBugAutoPermission', () => {
      it('should toggle permission for a phase', () => {
        useWorkflowStore.getState().toggleBugAutoPermission('analyze');
        const state = useWorkflowStore.getState();
        expect(state.bugAutoExecutionPermissions.analyze).toBe(false);
      });

      it('should toggle permission back to true', () => {
        useWorkflowStore.getState().toggleBugAutoPermission('analyze');
        useWorkflowStore.getState().toggleBugAutoPermission('analyze');
        const state = useWorkflowStore.getState();
        expect(state.bugAutoExecutionPermissions.analyze).toBe(true);
      });

      it('should only toggle the specified phase', () => {
        useWorkflowStore.getState().toggleBugAutoPermission('deploy');
        const state = useWorkflowStore.getState();
        expect(state.bugAutoExecutionPermissions.deploy).toBe(true);
        expect(state.bugAutoExecutionPermissions.analyze).toBe(true);
        expect(state.bugAutoExecutionPermissions.fix).toBe(true);
      });
    });

    describe('setBugAutoExecutionPermissions', () => {
      it('should set all permissions at once', () => {
        useWorkflowStore.getState().setBugAutoExecutionPermissions({
          analyze: false,
          fix: false,
          verify: true,
          deploy: true,
        });
        const state = useWorkflowStore.getState();
        expect(state.bugAutoExecutionPermissions.analyze).toBe(false);
        expect(state.bugAutoExecutionPermissions.fix).toBe(false);
        expect(state.bugAutoExecutionPermissions.verify).toBe(true);
        expect(state.bugAutoExecutionPermissions.deploy).toBe(true);
      });
    });

    describe('getBugAutoExecutionPermissions', () => {
      it('should return current permissions', () => {
        const permissions = useWorkflowStore.getState().getBugAutoExecutionPermissions();
        expect(permissions.analyze).toBe(true);
        expect(permissions.fix).toBe(true);
        expect(permissions.verify).toBe(true);
        expect(permissions.deploy).toBe(false);
      });
    });

    describe('persistence', () => {
      it('should include bugAutoExecutionPermissions in partialize', () => {
        // The persist middleware should include bugAutoExecutionPermissions
        const state = useWorkflowStore.getState();
        expect(state.bugAutoExecutionPermissions).toBeDefined();
      });
    });
  });

  // ============================================================
  // worktree-mode-spec-scoped: Worktree Mode Selection State REMOVED
  // Requirements: 4.1, 4.2, 4.3, 4.4, 4.5 (worktree-mode-spec-scoped)
  // worktreeModeSelection has been moved to spec.json.worktree.enabled
  // ============================================================
  describe('worktree-mode-spec-scoped: Worktree mode state removed', () => {
    it('should NOT have worktreeModeSelection field (migrated to spec.json)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('worktreeModeSelection');
    });

    it('should NOT have setWorktreeModeSelection action (deprecated)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('setWorktreeModeSelection');
    });

    it('should NOT have resetWorktreeModeSelection action (deprecated)', () => {
      const state = useWorkflowStore.getState();
      expect(state).not.toHaveProperty('resetWorktreeModeSelection');
    });
  });

  // ============================================================
  // document-review-phase Task 9.1: Document Review via permissions['document-review']
  // Requirements: 6.1, 6.2 (document-review-phase)
  // ============================================================
  describe('document-review-phase: Document review permission state', () => {
    describe('deprecated field removal', () => {
      // Note: documentReviewOptions may still exist due to localStorage persistence
      // but it is no longer part of the WorkflowState interface
      it('should NOT have setDocumentReviewAutoExecutionFlag action (deprecated)', () => {
        const state = useWorkflowStore.getState();
        expect(state).not.toHaveProperty('setDocumentReviewAutoExecutionFlag');
      });

      it('should NOT have setDocumentReviewOptions action (deprecated)', () => {
        const state = useWorkflowStore.getState();
        expect(state).not.toHaveProperty('setDocumentReviewOptions');
      });
    });

    describe('document-review permission via autoExecutionPermissions', () => {
      it('should have document-review permission set to true by default', () => {
        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions['document-review']).toBe(true);
      });

      it('should toggle document-review permission', () => {
        // Initial: true
        expect(useWorkflowStore.getState().autoExecutionPermissions['document-review']).toBe(true);

        // Toggle to false
        useWorkflowStore.getState().toggleAutoPermission('document-review');
        expect(useWorkflowStore.getState().autoExecutionPermissions['document-review']).toBe(false);

        // Toggle back to true
        useWorkflowStore.getState().toggleAutoPermission('document-review');
        expect(useWorkflowStore.getState().autoExecutionPermissions['document-review']).toBe(true);
      });
    });
  });

  // ============================================================
  // inspection-permission-unification Task 9.1: Inspection Permission Unification Tests
  // Requirements: 9.1, 9.2, 9.3
  // ============================================================
  describe('inspection-permission-unification: Inspection permission state', () => {
    describe('deprecated field removal', () => {
      it('should NOT have inspectionAutoExecutionFlag field (deprecated)', () => {
        const state = useWorkflowStore.getState();
        expect(state).not.toHaveProperty('inspectionAutoExecutionFlag');
      });

      it('should NOT have setInspectionAutoExecutionFlag action (deprecated)', () => {
        const state = useWorkflowStore.getState();
        expect(state).not.toHaveProperty('setInspectionAutoExecutionFlag');
      });
    });

    describe('permissions.inspection default value', () => {
      it('should have inspection true by default in DEFAULT_AUTO_EXECUTION_PERMISSIONS', () => {
        expect(DEFAULT_AUTO_EXECUTION_PERMISSIONS.inspection).toBe(true);
      });

      it('should use permissions.inspection for auto execution control', () => {
        const state = useWorkflowStore.getState();
        // Initial state should have inspection permission as true
        expect(state.autoExecutionPermissions.inspection).toBe(true);

        // Toggle to false
        state.toggleAutoPermission('inspection');
        expect(useWorkflowStore.getState().autoExecutionPermissions.inspection).toBe(false);

        // Toggle back to true
        useWorkflowStore.getState().toggleAutoPermission('inspection');
        expect(useWorkflowStore.getState().autoExecutionPermissions.inspection).toBe(true);
      });
    });
  });
});
