/**
 * WorkflowState Types Tests
 *
 * workflow-view-unification: 共通ステート抽象化のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  canExecutePhase,
  getPreviousPhaseStatus,
  type WorkflowState,
  type PhaseStatus,
} from './workflowState';
import type { WorkflowPhase } from '@shared/api/types';

// =============================================================================
// Test Constants
// =============================================================================

const ALL_PHASES: readonly WorkflowPhase[] = [
  'requirements',
  'design',
  'tasks',
  'impl',
  'inspection',
  'deploy',
] as const;

// =============================================================================
// Helper Functions
// =============================================================================

function createDefaultPhaseStatuses(): Record<WorkflowPhase, PhaseStatus> {
  return {
    requirements: 'pending',
    design: 'pending',
    tasks: 'pending',
    impl: 'pending',
    inspection: 'pending',
    deploy: 'pending',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('WorkflowState Types', () => {
  // ============================================================
  // canExecutePhase
  // ============================================================
  describe('canExecutePhase', () => {
    describe('requirements phase', () => {
      it('should be executable when no agents are running', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(),
          phaseStatuses: createDefaultPhaseStatuses(),
        };
        expect(canExecutePhase(state, 'requirements', ALL_PHASES)).toBe(true);
      });

      it('should not be executable when agents are running', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(['requirements']),
          phaseStatuses: createDefaultPhaseStatuses(),
        };
        expect(canExecutePhase(state, 'requirements', ALL_PHASES)).toBe(false);
      });
    });

    describe('design phase', () => {
      it('should not be executable when requirements is pending', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(),
          phaseStatuses: createDefaultPhaseStatuses(),
        };
        expect(canExecutePhase(state, 'design', ALL_PHASES)).toBe(false);
      });

      it('should not be executable when requirements is generated', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(),
          phaseStatuses: {
            ...createDefaultPhaseStatuses(),
            requirements: 'generated',
          },
        };
        expect(canExecutePhase(state, 'design', ALL_PHASES)).toBe(false);
      });

      it('should be executable when requirements is approved', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(),
          phaseStatuses: {
            ...createDefaultPhaseStatuses(),
            requirements: 'approved',
          },
        };
        expect(canExecutePhase(state, 'design', ALL_PHASES)).toBe(true);
      });
    });

    describe('tasks phase', () => {
      it('should be executable when design is approved', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(),
          phaseStatuses: {
            ...createDefaultPhaseStatuses(),
            requirements: 'approved',
            design: 'approved',
          },
        };
        expect(canExecutePhase(state, 'tasks', ALL_PHASES)).toBe(true);
      });

      it('should not be executable when design is not approved', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(),
          phaseStatuses: {
            ...createDefaultPhaseStatuses(),
            requirements: 'approved',
            design: 'generated',
          },
        };
        expect(canExecutePhase(state, 'tasks', ALL_PHASES)).toBe(false);
      });
    });

    describe('impl phase', () => {
      it('should be executable when tasks is approved', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(),
          phaseStatuses: {
            ...createDefaultPhaseStatuses(),
            requirements: 'approved',
            design: 'approved',
            tasks: 'approved',
          },
        };
        expect(canExecutePhase(state, 'impl', ALL_PHASES)).toBe(true);
      });
    });

    describe('general behavior', () => {
      it('should not allow execution when any agent is running', () => {
        const state: Pick<WorkflowState, 'runningPhases' | 'phaseStatuses'> = {
          runningPhases: new Set(['design']),
          phaseStatuses: {
            ...createDefaultPhaseStatuses(),
            requirements: 'approved',
          },
        };
        expect(canExecutePhase(state, 'design', ALL_PHASES)).toBe(false);
        expect(canExecutePhase(state, 'requirements', ALL_PHASES)).toBe(false);
      });
    });
  });

  // ============================================================
  // getPreviousPhaseStatus
  // ============================================================
  describe('getPreviousPhaseStatus', () => {
    it('should return null for requirements (first phase)', () => {
      const phaseStatuses = createDefaultPhaseStatuses();
      expect(getPreviousPhaseStatus(phaseStatuses, 'requirements', ALL_PHASES)).toBeNull();
    });

    it('should return requirements status for design', () => {
      const phaseStatuses = {
        ...createDefaultPhaseStatuses(),
        requirements: 'approved' as PhaseStatus,
      };
      expect(getPreviousPhaseStatus(phaseStatuses, 'design', ALL_PHASES)).toBe('approved');
    });

    it('should return design status for tasks', () => {
      const phaseStatuses = {
        ...createDefaultPhaseStatuses(),
        design: 'generated' as PhaseStatus,
      };
      expect(getPreviousPhaseStatus(phaseStatuses, 'tasks', ALL_PHASES)).toBe('generated');
    });

    it('should return tasks status for impl', () => {
      const phaseStatuses = {
        ...createDefaultPhaseStatuses(),
        tasks: 'pending' as PhaseStatus,
      };
      expect(getPreviousPhaseStatus(phaseStatuses, 'impl', ALL_PHASES)).toBe('pending');
    });

    it('should return impl status for inspection', () => {
      const phaseStatuses = {
        ...createDefaultPhaseStatuses(),
        impl: 'approved' as PhaseStatus,
      };
      expect(getPreviousPhaseStatus(phaseStatuses, 'inspection', ALL_PHASES)).toBe('approved');
    });

    it('should return inspection status for deploy', () => {
      const phaseStatuses = {
        ...createDefaultPhaseStatuses(),
        inspection: 'approved' as PhaseStatus,
      };
      expect(getPreviousPhaseStatus(phaseStatuses, 'deploy', ALL_PHASES)).toBe('approved');
    });
  });

  // ============================================================
  // PhaseStatus type
  // ============================================================
  describe('PhaseStatus type', () => {
    it('should accept valid status values', () => {
      const pending: PhaseStatus = 'pending';
      const generated: PhaseStatus = 'generated';
      const approved: PhaseStatus = 'approved';

      expect(pending).toBe('pending');
      expect(generated).toBe('generated');
      expect(approved).toBe('approved');
    });
  });
});
