/**
 * Inspection Types Tests
 * TDD: Testing inspection workflow type definitions
 * Feature: inspection-workflow-ui Task 1
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect } from 'vitest';
import {
  INSPECTION_STATUS,
  INSPECTION_AUTO_EXECUTION_FLAG,
  INSPECTION_PROGRESS_INDICATOR_STATE,
  isInspectionRoundDetail,
  isMultiRoundInspectionState,
  createInitialMultiRoundInspectionState,
  getLatestRoundDetail,
  getInspectionProgressIndicatorState,
  type InspectionStatus,
  type InspectionAutoExecutionFlag,
  type InspectionProgressIndicatorState,
  type InspectionRoundDetail,
  type MultiRoundInspectionState,
} from './inspection';

describe('Inspection Types', () => {
  // ============================================================
  // Task 1: InspectionStatus type and constants
  // Requirements: 2.1
  // ============================================================
  describe('Task 1: InspectionStatus type and constants', () => {
    describe('INSPECTION_STATUS constants', () => {
      it('should define all inspection status values', () => {
        expect(INSPECTION_STATUS.PENDING).toBe('pending');
        expect(INSPECTION_STATUS.IN_PROGRESS).toBe('in_progress');
        expect(INSPECTION_STATUS.COMPLETED).toBe('completed');
      });

      it('should have exactly 3 status values', () => {
        expect(Object.keys(INSPECTION_STATUS)).toHaveLength(3);
      });
    });

    describe('InspectionStatus type', () => {
      it('should allow valid status values', () => {
        const pending: InspectionStatus = 'pending';
        const inProgress: InspectionStatus = 'in_progress';
        const completed: InspectionStatus = 'completed';

        expect(pending).toBe('pending');
        expect(inProgress).toBe('in_progress');
        expect(completed).toBe('completed');
      });
    });
  });

  // ============================================================
  // Task 1: InspectionAutoExecutionFlag type and constants
  // Requirements: 2.3
  // ============================================================
  describe('Task 1: InspectionAutoExecutionFlag type and constants', () => {
    describe('INSPECTION_AUTO_EXECUTION_FLAG constants', () => {
      it('should define run, pause, and skip values', () => {
        expect(INSPECTION_AUTO_EXECUTION_FLAG.RUN).toBe('run');
        expect(INSPECTION_AUTO_EXECUTION_FLAG.PAUSE).toBe('pause');
        expect(INSPECTION_AUTO_EXECUTION_FLAG.SKIP).toBe('skip');
      });

      it('should have exactly 3 flag values', () => {
        expect(Object.keys(INSPECTION_AUTO_EXECUTION_FLAG)).toHaveLength(3);
      });
    });

    describe('InspectionAutoExecutionFlag type', () => {
      it('should allow valid flag values', () => {
        const run: InspectionAutoExecutionFlag = 'run';
        const pause: InspectionAutoExecutionFlag = 'pause';
        const skip: InspectionAutoExecutionFlag = 'skip';

        expect(run).toBe('run');
        expect(pause).toBe('pause');
        expect(skip).toBe('skip');
      });
    });
  });

  // ============================================================
  // Task 1: InspectionProgressIndicatorState type and constants
  // Requirements: 2.4
  // ============================================================
  describe('Task 1: InspectionProgressIndicatorState type and constants', () => {
    describe('INSPECTION_PROGRESS_INDICATOR_STATE constants', () => {
      it('should define all progress indicator states', () => {
        expect(INSPECTION_PROGRESS_INDICATOR_STATE.CHECKED).toBe('checked');
        expect(INSPECTION_PROGRESS_INDICATOR_STATE.UNCHECKED).toBe('unchecked');
        expect(INSPECTION_PROGRESS_INDICATOR_STATE.EXECUTING).toBe('executing');
        expect(INSPECTION_PROGRESS_INDICATOR_STATE.SKIP_SCHEDULED).toBe('skip-scheduled');
      });

      it('should have exactly 4 indicator states', () => {
        expect(Object.keys(INSPECTION_PROGRESS_INDICATOR_STATE)).toHaveLength(4);
      });
    });

    describe('InspectionProgressIndicatorState type', () => {
      it('should allow valid indicator state values', () => {
        const checked: InspectionProgressIndicatorState = 'checked';
        const unchecked: InspectionProgressIndicatorState = 'unchecked';
        const executing: InspectionProgressIndicatorState = 'executing';
        const skipScheduled: InspectionProgressIndicatorState = 'skip-scheduled';

        expect(checked).toBe('checked');
        expect(unchecked).toBe('unchecked');
        expect(executing).toBe('executing');
        expect(skipScheduled).toBe('skip-scheduled');
      });
    });
  });

  // ============================================================
  // Task 1: InspectionRoundDetail type
  // Requirements: 2.2
  // ============================================================
  describe('Task 1: InspectionRoundDetail type', () => {
    describe('valid InspectionRoundDetail objects', () => {
      it('should have required fields (roundNumber, passed)', () => {
        const detail: InspectionRoundDetail = {
          roundNumber: 1,
          passed: true,
        };

        expect(detail.roundNumber).toBe(1);
        expect(detail.passed).toBe(true);
      });

      it('should allow optional fixApplied field', () => {
        const detail: InspectionRoundDetail = {
          roundNumber: 1,
          passed: false,
          fixApplied: true,
        };

        expect(detail.fixApplied).toBe(true);
      });

      it('should allow optional completedAt field', () => {
        const detail: InspectionRoundDetail = {
          roundNumber: 1,
          passed: true,
          completedAt: '2025-12-27T12:00:00Z',
        };

        expect(detail.completedAt).toBe('2025-12-27T12:00:00Z');
      });

      it('should allow all optional fields together', () => {
        const detail: InspectionRoundDetail = {
          roundNumber: 2,
          passed: false,
          fixApplied: true,
          completedAt: '2025-12-27T13:00:00Z',
        };

        expect(detail.roundNumber).toBe(2);
        expect(detail.passed).toBe(false);
        expect(detail.fixApplied).toBe(true);
        expect(detail.completedAt).toBe('2025-12-27T13:00:00Z');
      });
    });

    describe('isInspectionRoundDetail type guard', () => {
      it('should return true for valid InspectionRoundDetail', () => {
        const validDetail = {
          roundNumber: 1,
          passed: true,
        };
        expect(isInspectionRoundDetail(validDetail)).toBe(true);
      });

      it('should return true for detail with optional fields', () => {
        const detailWithOptional = {
          roundNumber: 2,
          passed: false,
          fixApplied: true,
          completedAt: '2025-12-27T12:00:00Z',
        };
        expect(isInspectionRoundDetail(detailWithOptional)).toBe(true);
      });

      it('should return false for missing roundNumber', () => {
        const invalid = { passed: true };
        expect(isInspectionRoundDetail(invalid)).toBe(false);
      });

      it('should return false for missing passed', () => {
        const invalid = { roundNumber: 1 };
        expect(isInspectionRoundDetail(invalid)).toBe(false);
      });

      it('should return false for non-object values', () => {
        expect(isInspectionRoundDetail(null)).toBe(false);
        expect(isInspectionRoundDetail(undefined)).toBe(false);
        expect(isInspectionRoundDetail('string')).toBe(false);
        expect(isInspectionRoundDetail(123)).toBe(false);
      });

      it('should return false for invalid roundNumber type', () => {
        const invalid = { roundNumber: 'one', passed: true };
        expect(isInspectionRoundDetail(invalid)).toBe(false);
      });

      it('should return false for invalid passed type', () => {
        const invalid = { roundNumber: 1, passed: 'true' };
        expect(isInspectionRoundDetail(invalid)).toBe(false);
      });
    });
  });

  // ============================================================
  // Task 1: MultiRoundInspectionState type
  // Requirements: 2.1, 2.2
  // ============================================================
  describe('Task 1: MultiRoundInspectionState type', () => {
    describe('valid MultiRoundInspectionState objects', () => {
      it('should have all required fields', () => {
        const state: MultiRoundInspectionState = {
          status: 'pending',
          rounds: 0,
          currentRound: null,
          roundDetails: [],
        };

        expect(state.status).toBe('pending');
        expect(state.rounds).toBe(0);
        expect(state.currentRound).toBeNull();
        expect(state.roundDetails).toEqual([]);
      });

      it('should allow state with completed rounds', () => {
        const state: MultiRoundInspectionState = {
          status: 'completed',
          rounds: 2,
          currentRound: null,
          roundDetails: [
            { roundNumber: 1, passed: false, fixApplied: true, completedAt: '2025-12-27T12:00:00Z' },
            { roundNumber: 2, passed: true, completedAt: '2025-12-27T13:00:00Z' },
          ],
        };

        expect(state.status).toBe('completed');
        expect(state.rounds).toBe(2);
        expect(state.roundDetails).toHaveLength(2);
      });

      it('should allow state in progress', () => {
        const state: MultiRoundInspectionState = {
          status: 'in_progress',
          rounds: 0,
          currentRound: 1,
          roundDetails: [],
        };

        expect(state.status).toBe('in_progress');
        expect(state.currentRound).toBe(1);
      });
    });

    describe('isMultiRoundInspectionState type guard', () => {
      it('should return true for valid MultiRoundInspectionState', () => {
        const validState = {
          status: 'pending',
          rounds: 0,
          currentRound: null,
          roundDetails: [],
        };
        expect(isMultiRoundInspectionState(validState)).toBe(true);
      });

      it('should return true for state with rounds', () => {
        const stateWithRounds = {
          status: 'completed',
          rounds: 2,
          currentRound: null,
          roundDetails: [
            { roundNumber: 1, passed: false, fixApplied: true },
            { roundNumber: 2, passed: true },
          ],
        };
        expect(isMultiRoundInspectionState(stateWithRounds)).toBe(true);
      });

      it('should return false for invalid status', () => {
        const invalidState = {
          status: 'invalid_status',
          rounds: 0,
          currentRound: null,
          roundDetails: [],
        };
        expect(isMultiRoundInspectionState(invalidState)).toBe(false);
      });

      it('should return false for missing rounds', () => {
        const invalidState = {
          status: 'pending',
          currentRound: null,
          roundDetails: [],
        };
        expect(isMultiRoundInspectionState(invalidState)).toBe(false);
      });

      it('should return false for missing roundDetails', () => {
        const invalidState = {
          status: 'pending',
          rounds: 0,
          currentRound: null,
        };
        expect(isMultiRoundInspectionState(invalidState)).toBe(false);
      });

      it('should return false for non-object values', () => {
        expect(isMultiRoundInspectionState(null)).toBe(false);
        expect(isMultiRoundInspectionState(undefined)).toBe(false);
        expect(isMultiRoundInspectionState('string')).toBe(false);
        expect(isMultiRoundInspectionState(123)).toBe(false);
      });

      it('should return false for roundDetails with invalid items', () => {
        const invalidState = {
          status: 'pending',
          rounds: 1,
          currentRound: null,
          roundDetails: [{ invalid: 'item' }],
        };
        expect(isMultiRoundInspectionState(invalidState)).toBe(false);
      });
    });

    describe('createInitialMultiRoundInspectionState', () => {
      it('should create initial state with pending status', () => {
        const state = createInitialMultiRoundInspectionState();

        expect(state.status).toBe('pending');
        expect(state.rounds).toBe(0);
        expect(state.currentRound).toBeNull();
        expect(state.roundDetails).toEqual([]);
      });

      it('should create a new object each time', () => {
        const state1 = createInitialMultiRoundInspectionState();
        const state2 = createInitialMultiRoundInspectionState();

        expect(state1).not.toBe(state2);
        expect(state1.roundDetails).not.toBe(state2.roundDetails);
      });
    });
  });

  // ============================================================
  // Task 1: Helper functions
  // Requirements: 2.1, 2.2
  // ============================================================
  describe('Task 1: Helper functions', () => {
    describe('getLatestRoundDetail', () => {
      it('should return null for empty roundDetails', () => {
        const state: MultiRoundInspectionState = {
          status: 'pending',
          rounds: 0,
          currentRound: null,
          roundDetails: [],
        };

        expect(getLatestRoundDetail(state)).toBeNull();
      });

      it('should return the last round detail', () => {
        const state: MultiRoundInspectionState = {
          status: 'completed',
          rounds: 2,
          currentRound: null,
          roundDetails: [
            { roundNumber: 1, passed: false, fixApplied: true },
            { roundNumber: 2, passed: true },
          ],
        };

        const latest = getLatestRoundDetail(state);
        expect(latest).toEqual({ roundNumber: 2, passed: true });
      });

      it('should return null for null state', () => {
        expect(getLatestRoundDetail(null)).toBeNull();
      });

      it('should return null for undefined state', () => {
        expect(getLatestRoundDetail(undefined)).toBeNull();
      });
    });

    describe('getInspectionProgressIndicatorState', () => {
      it('should return skip-scheduled when autoExecutionFlag is skip', () => {
        const state: MultiRoundInspectionState = {
          status: 'pending',
          rounds: 0,
          currentRound: null,
          roundDetails: [],
        };

        expect(getInspectionProgressIndicatorState(state, false, 'skip')).toBe('skip-scheduled');
      });

      it('should return executing when isExecuting is true', () => {
        const state: MultiRoundInspectionState = {
          status: 'in_progress',
          rounds: 0,
          currentRound: 1,
          roundDetails: [],
        };

        expect(getInspectionProgressIndicatorState(state, true, 'run')).toBe('executing');
      });

      it('should return executing when status is in_progress', () => {
        const state: MultiRoundInspectionState = {
          status: 'in_progress',
          rounds: 0,
          currentRound: 1,
          roundDetails: [],
        };

        expect(getInspectionProgressIndicatorState(state, false, 'run')).toBe('executing');
      });

      it('should return checked when rounds >= 1', () => {
        const state: MultiRoundInspectionState = {
          status: 'completed',
          rounds: 1,
          currentRound: null,
          roundDetails: [{ roundNumber: 1, passed: true }],
        };

        expect(getInspectionProgressIndicatorState(state, false, 'run')).toBe('checked');
      });

      it('should return unchecked when no rounds completed', () => {
        const state: MultiRoundInspectionState = {
          status: 'pending',
          rounds: 0,
          currentRound: null,
          roundDetails: [],
        };

        expect(getInspectionProgressIndicatorState(state, false, 'run')).toBe('unchecked');
      });

      it('should return unchecked when state is null', () => {
        expect(getInspectionProgressIndicatorState(null, false, 'run')).toBe('unchecked');
      });

      it('should return unchecked when state is undefined', () => {
        expect(getInspectionProgressIndicatorState(undefined, false, 'run')).toBe('unchecked');
      });
    });
  });
});
