/**
 * Workflow Store Tests
 * TDD: Testing workflow state management
 * Requirements: 5.1-5.4, 6.1-6.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from './workflowStore';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    // Reset store state
    useWorkflowStore.setState({
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      validationOptions: {
        gap: false,
        design: false,
        impl: false,
      },
      isAutoExecuting: false,
      currentAutoPhase: null,
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
        expect(state.validationOptions.impl).toBe(false);
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

      it('should toggle impl validation option', () => {
        useWorkflowStore.getState().toggleValidationOption('impl');

        const state = useWorkflowStore.getState();
        expect(state.validationOptions.impl).toBe(true);
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
  // Task 2.3: Auto Execution State
  // Requirements: 6.1, 6.2, 6.3, 6.4
  // ============================================================
  describe('Task 2.3: Auto execution state', () => {
    describe('initial state', () => {
      it('should not be auto executing initially', () => {
        const state = useWorkflowStore.getState();
        expect(state.isAutoExecuting).toBe(false);
      });

      it('should have null current auto phase initially', () => {
        const state = useWorkflowStore.getState();
        expect(state.currentAutoPhase).toBeNull();
      });
    });

    describe('startAutoExecution', () => {
      it('should set isAutoExecuting to true', () => {
        useWorkflowStore.getState().startAutoExecution();

        const state = useWorkflowStore.getState();
        expect(state.isAutoExecuting).toBe(true);
      });
    });

    describe('stopAutoExecution', () => {
      it('should set isAutoExecuting to false', () => {
        useWorkflowStore.setState({ isAutoExecuting: true });

        useWorkflowStore.getState().stopAutoExecution();

        const state = useWorkflowStore.getState();
        expect(state.isAutoExecuting).toBe(false);
      });

      it('should clear currentAutoPhase', () => {
        useWorkflowStore.setState({
          isAutoExecuting: true,
          currentAutoPhase: 'design',
        });

        useWorkflowStore.getState().stopAutoExecution();

        const state = useWorkflowStore.getState();
        expect(state.currentAutoPhase).toBeNull();
      });
    });

    describe('setCurrentAutoPhase', () => {
      it('should set current auto phase', () => {
        useWorkflowStore.getState().setCurrentAutoPhase('design');

        const state = useWorkflowStore.getState();
        expect(state.currentAutoPhase).toBe('design');
      });

      it('should allow setting to null', () => {
        useWorkflowStore.setState({ currentAutoPhase: 'tasks' });

        useWorkflowStore.getState().setCurrentAutoPhase(null);

        const state = useWorkflowStore.getState();
        expect(state.currentAutoPhase).toBeNull();
      });
    });
  });

  // ============================================================
  // Task 2.4: Reset Settings
  // Requirements: 5.4
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

      it('should stop auto execution', () => {
        useWorkflowStore.setState({
          isAutoExecuting: true,
          currentAutoPhase: 'design',
        });

        useWorkflowStore.getState().resetSettings();

        const state = useWorkflowStore.getState();
        expect(state.isAutoExecuting).toBe(false);
        expect(state.currentAutoPhase).toBeNull();
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
});
