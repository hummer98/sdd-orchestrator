/**
 * Workflow Store Tests
 * TDD: Testing workflow state management
 * Requirements: 5.1-5.4, 6.1-6.6, 7.1-7.4, 8.1-8.5
 * spec-scoped-auto-execution-state Task 5.1: workflowStore simplification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from './workflowStore';
import type { ExecutionSummary } from './workflowStore';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    // Reset store state
    // Note: isAutoExecuting, currentAutoPhase, autoExecutionStatus have been removed
    // as part of spec-scoped-auto-execution-state Task 5.1 migration
    useWorkflowStore.setState({
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      validationOptions: {
        gap: false,
        design: false,
        impl: false,
      },
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,
      // Reset document review options to default 'pause'
      documentReviewOptions: { autoExecutionFlag: 'pause' },
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
  // ============================================================
  describe('Task 2.1: Auto execution permissions', () => {
    describe('initial state', () => {
      it('should have requirements permitted by default', () => {
        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.requirements).toBe(true);
      });

      it('should have other phases not permitted by default', () => {
        const state = useWorkflowStore.getState();
        expect(state.autoExecutionPermissions.design).toBe(false);
        expect(state.autoExecutionPermissions.tasks).toBe(false);
        expect(state.autoExecutionPermissions.impl).toBe(false);
        expect(state.autoExecutionPermissions.inspection).toBe(false);
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
  // Task 2.2: Validation Options
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  describe('Task 2.2: Validation options', () => {
    describe('initial state', () => {
      it('should have all validation options disabled by default', () => {
        const state = useWorkflowStore.getState();
        expect(state.validationOptions.gap).toBe(false);
        expect(state.validationOptions.design).toBe(false);
      });
    });

    describe('toggleValidationOption', () => {
      it('should toggle gap validation option', () => {
        useWorkflowStore.getState().toggleValidationOption('gap');

        const state = useWorkflowStore.getState();
        expect(state.validationOptions.gap).toBe(true);
      });

      it('should toggle design validation option', () => {
        useWorkflowStore.getState().toggleValidationOption('design');

        const state = useWorkflowStore.getState();
        expect(state.validationOptions.design).toBe(true);
      });

      it('should toggle option back to false', () => {
        useWorkflowStore.getState().toggleValidationOption('gap');
        useWorkflowStore.getState().toggleValidationOption('gap');

        const state = useWorkflowStore.getState();
        expect(state.validationOptions.gap).toBe(false);
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

      it('should reset validation options to disabled', () => {
        useWorkflowStore.setState({
          validationOptions: {
            gap: true,
            design: true,
            impl: true,
          },
        });

        useWorkflowStore.getState().resetSettings();

        const state = useWorkflowStore.getState();
        expect(state.validationOptions.gap).toBe(false);
        expect(state.validationOptions.design).toBe(false);
        expect(state.validationOptions.impl).toBe(false);
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
        validationOptions: useWorkflowStore.getState().validationOptions,
      };

      expect(partialState).not.toHaveProperty('lastFailedPhase');
    });

    it('should not persist failedRetryCount', () => {
      useWorkflowStore.setState({ failedRetryCount: 3 });

      const partialState = {
        autoExecutionPermissions: useWorkflowStore.getState().autoExecutionPermissions,
        validationOptions: useWorkflowStore.getState().validationOptions,
      };

      expect(partialState).not.toHaveProperty('failedRetryCount');
    });

    it('should persist autoExecutionPermissions', () => {
      const permissions = useWorkflowStore.getState().autoExecutionPermissions;
      expect(permissions).toBeDefined();
      expect(permissions.requirements).toBe(true);
    });

    it('should persist validationOptions', () => {
      const options = useWorkflowStore.getState().validationOptions;
      expect(options).toBeDefined();
      expect(options.gap).toBe(false);
    });
  });

  // ============================================================
  // Task 6.1: Document Review Auto Execution Flag
  // Requirements: 6.7, 6.8
  // ============================================================
  describe('Task 6.1: Document review auto execution flag', () => {
    describe('initial state', () => {
      it('should have autoExecutionFlag as pause by default', () => {
        const state = useWorkflowStore.getState();
        expect(state.documentReviewOptions.autoExecutionFlag).toBe('pause');
      });
    });

    describe('setDocumentReviewAutoExecutionFlag', () => {
      it('should set autoExecutionFlag to pause', () => {
        useWorkflowStore.getState().setDocumentReviewAutoExecutionFlag('pause');
        const state = useWorkflowStore.getState();
        expect(state.documentReviewOptions.autoExecutionFlag).toBe('pause');
      });

      it('should set autoExecutionFlag to skip', () => {
        useWorkflowStore.getState().setDocumentReviewAutoExecutionFlag('skip');
        const state = useWorkflowStore.getState();
        expect(state.documentReviewOptions.autoExecutionFlag).toBe('skip');
      });

      it('should set autoExecutionFlag to run', () => {
        useWorkflowStore.getState().setDocumentReviewAutoExecutionFlag('skip');
        useWorkflowStore.getState().setDocumentReviewAutoExecutionFlag('run');
        const state = useWorkflowStore.getState();
        expect(state.documentReviewOptions.autoExecutionFlag).toBe('run');
      });

      it('should cycle through all flags correctly', () => {
        // Start with pause (default)
        expect(useWorkflowStore.getState().documentReviewOptions.autoExecutionFlag).toBe('pause');

        // Set to skip
        useWorkflowStore.getState().setDocumentReviewAutoExecutionFlag('skip');
        expect(useWorkflowStore.getState().documentReviewOptions.autoExecutionFlag).toBe('skip');

        // Set to run
        useWorkflowStore.getState().setDocumentReviewAutoExecutionFlag('run');
        expect(useWorkflowStore.getState().documentReviewOptions.autoExecutionFlag).toBe('run');

        // Back to pause
        useWorkflowStore.getState().setDocumentReviewAutoExecutionFlag('pause');
        expect(useWorkflowStore.getState().documentReviewOptions.autoExecutionFlag).toBe('pause');
      });
    });
  });
});
