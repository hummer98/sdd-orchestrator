/**
 * Inspection Types Tests
 * TDD: Testing inspection workflow type definitions
 * Feature: inspection-workflow-ui Task 1
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * Bug fix: inspection-state-data-model - Updated to test new structure
 */

import { describe, it, expect } from 'vitest';
import {
  INSPECTION_AUTO_EXECUTION_FLAG,
  INSPECTION_PROGRESS_INDICATOR_STATE,
  isInspectionRound,
  isInspectionState,
  createInitialInspectionState,
  getLatestRound,
  getInspectionProgressIndicatorState,
  getRoundCount,
  needsFix,
  hasPassed,
  canStartNextInspection,
  normalizeInspectionState,
  // Legacy exports for backward compatibility
  INSPECTION_STATUS,
  isInspectionRoundDetail,
  isMultiRoundInspectionState,
  createInitialMultiRoundInspectionState,
  getLatestRoundDetail,
  type InspectionAutoExecutionFlag,
  type InspectionProgressIndicatorState,
  type InspectionRound,
  type InspectionState,
  type InspectionRoundDetail,
  type MultiRoundInspectionState,
} from './inspection';

describe('Inspection Types', () => {
  // ============================================================
  // New Structure Tests
  // Bug fix: inspection-state-data-model
  // ============================================================
  describe('New InspectionRound type', () => {
    describe('valid InspectionRound objects', () => {
      it('should have required fields (number, result, inspectedAt)', () => {
        const round: InspectionRound = {
          number: 1,
          result: 'go',
          inspectedAt: '2025-12-27T12:00:00Z',
        };

        expect(round.number).toBe(1);
        expect(round.result).toBe('go');
        expect(round.inspectedAt).toBe('2025-12-27T12:00:00Z');
      });

      it('should allow optional fixedAt field', () => {
        const round: InspectionRound = {
          number: 1,
          result: 'nogo',
          inspectedAt: '2025-12-27T12:00:00Z',
          fixedAt: '2025-12-27T13:00:00Z',
        };

        expect(round.fixedAt).toBe('2025-12-27T13:00:00Z');
      });
    });

    describe('isInspectionRound type guard', () => {
      it('should return true for valid InspectionRound', () => {
        const validRound = {
          number: 1,
          result: 'go',
          inspectedAt: '2025-12-27T12:00:00Z',
        };
        expect(isInspectionRound(validRound)).toBe(true);
      });

      it('should return true for round with fixedAt', () => {
        const roundWithFix = {
          number: 1,
          result: 'nogo',
          inspectedAt: '2025-12-27T12:00:00Z',
          fixedAt: '2025-12-27T13:00:00Z',
        };
        expect(isInspectionRound(roundWithFix)).toBe(true);
      });

      it('should return false for invalid result', () => {
        const invalid = { number: 1, result: 'invalid', inspectedAt: '2025-12-27T12:00:00Z' };
        expect(isInspectionRound(invalid)).toBe(false);
      });

      it('should return false for missing fields', () => {
        expect(isInspectionRound({ number: 1, result: 'go' })).toBe(false);
        expect(isInspectionRound({ number: 1, inspectedAt: '2025-12-27T12:00:00Z' })).toBe(false);
        expect(isInspectionRound({ result: 'go', inspectedAt: '2025-12-27T12:00:00Z' })).toBe(false);
      });

      it('should return false for non-object values', () => {
        expect(isInspectionRound(null)).toBe(false);
        expect(isInspectionRound(undefined)).toBe(false);
        expect(isInspectionRound('string')).toBe(false);
        expect(isInspectionRound(123)).toBe(false);
      });
    });
  });

  describe('New InspectionState type', () => {
    describe('valid InspectionState objects', () => {
      it('should have rounds array', () => {
        const state: InspectionState = {
          rounds: [],
        };

        expect(state.rounds).toEqual([]);
      });

      it('should allow state with completed rounds', () => {
        const state: InspectionState = {
          rounds: [
            { number: 1, result: 'nogo', inspectedAt: '2025-12-27T12:00:00Z', fixedAt: '2025-12-27T13:00:00Z' },
            { number: 2, result: 'go', inspectedAt: '2025-12-27T14:00:00Z' },
          ],
        };

        expect(state.rounds).toHaveLength(2);
      });
    });

    describe('isInspectionState type guard', () => {
      it('should return true for valid InspectionState', () => {
        const validState = { rounds: [] };
        expect(isInspectionState(validState)).toBe(true);
      });

      it('should return true for state with rounds', () => {
        const stateWithRounds = {
          rounds: [
            { number: 1, result: 'go', inspectedAt: '2025-12-27T12:00:00Z' },
          ],
        };
        expect(isInspectionState(stateWithRounds)).toBe(true);
      });

      it('should return false for missing rounds', () => {
        expect(isInspectionState({})).toBe(false);
      });

      it('should return false for non-array rounds', () => {
        expect(isInspectionState({ rounds: 'not-array' })).toBe(false);
      });

      it('should return false for invalid round items', () => {
        expect(isInspectionState({ rounds: [{ invalid: 'item' }] })).toBe(false);
      });

      it('should return false for non-object values', () => {
        expect(isInspectionState(null)).toBe(false);
        expect(isInspectionState(undefined)).toBe(false);
      });
    });

    describe('createInitialInspectionState', () => {
      it('should create initial state with empty rounds', () => {
        const state = createInitialInspectionState();

        expect(state.rounds).toEqual([]);
      });

      it('should create a new object each time', () => {
        const state1 = createInitialInspectionState();
        const state2 = createInitialInspectionState();

        expect(state1).not.toBe(state2);
        expect(state1.rounds).not.toBe(state2.rounds);
      });
    });
  });

  describe('New Helper functions', () => {
    describe('getLatestRound', () => {
      it('should return null for empty rounds', () => {
        const state: InspectionState = { rounds: [] };
        expect(getLatestRound(state)).toBeNull();
      });

      it('should return the last round', () => {
        const state: InspectionState = {
          rounds: [
            { number: 1, result: 'nogo', inspectedAt: '2025-12-27T12:00:00Z' },
            { number: 2, result: 'go', inspectedAt: '2025-12-27T13:00:00Z' },
          ],
        };

        const latest = getLatestRound(state);
        expect(latest).toEqual({ number: 2, result: 'go', inspectedAt: '2025-12-27T13:00:00Z' });
      });

      it('should return null for null/undefined state', () => {
        expect(getLatestRound(null)).toBeNull();
        expect(getLatestRound(undefined)).toBeNull();
      });
    });

    describe('getRoundCount', () => {
      it('should return 0 for empty rounds', () => {
        expect(getRoundCount({ rounds: [] })).toBe(0);
      });

      it('should return correct count', () => {
        const state: InspectionState = {
          rounds: [
            { number: 1, result: 'nogo', inspectedAt: '2025-12-27T12:00:00Z' },
            { number: 2, result: 'go', inspectedAt: '2025-12-27T13:00:00Z' },
          ],
        };
        expect(getRoundCount(state)).toBe(2);
      });

      it('should return 0 for null/undefined', () => {
        expect(getRoundCount(null)).toBe(0);
        expect(getRoundCount(undefined)).toBe(0);
      });
    });

    describe('needsFix', () => {
      it('should return false for no rounds', () => {
        expect(needsFix({ rounds: [] })).toBe(false);
      });

      it('should return false for GO result', () => {
        const state: InspectionState = {
          rounds: [{ number: 1, result: 'go', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(needsFix(state)).toBe(false);
      });

      it('should return true for NOGO without fixedAt', () => {
        const state: InspectionState = {
          rounds: [{ number: 1, result: 'nogo', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(needsFix(state)).toBe(true);
      });

      it('should return false for NOGO with fixedAt', () => {
        const state: InspectionState = {
          rounds: [{
            number: 1,
            result: 'nogo',
            inspectedAt: '2025-12-27T12:00:00Z',
            fixedAt: '2025-12-27T13:00:00Z',
          }],
        };
        expect(needsFix(state)).toBe(false);
      });
    });

    describe('hasPassed', () => {
      it('should return false for no rounds', () => {
        expect(hasPassed({ rounds: [] })).toBe(false);
      });

      it('should return true for GO result', () => {
        const state: InspectionState = {
          rounds: [{ number: 1, result: 'go', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(hasPassed(state)).toBe(true);
      });

      it('should return false for NOGO result', () => {
        const state: InspectionState = {
          rounds: [{ number: 1, result: 'nogo', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(hasPassed(state)).toBe(false);
      });
    });

    describe('canStartNextInspection', () => {
      it('should return true for no rounds', () => {
        expect(canStartNextInspection({ rounds: [] })).toBe(true);
      });

      it('should return true for GO result', () => {
        const state: InspectionState = {
          rounds: [{ number: 1, result: 'go', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(canStartNextInspection(state)).toBe(true);
      });

      it('should return false for NOGO without fixedAt', () => {
        const state: InspectionState = {
          rounds: [{ number: 1, result: 'nogo', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(canStartNextInspection(state)).toBe(false);
      });

      it('should return true for NOGO with fixedAt', () => {
        const state: InspectionState = {
          rounds: [{
            number: 1,
            result: 'nogo',
            inspectedAt: '2025-12-27T12:00:00Z',
            fixedAt: '2025-12-27T13:00:00Z',
          }],
        };
        expect(canStartNextInspection(state)).toBe(true);
      });
    });

    describe('getInspectionProgressIndicatorState', () => {
      // NOTE: skip-scheduled test removed - skip option is no longer available

      it('should return executing when isExecuting is true', () => {
        const state: InspectionState = { rounds: [] };
        expect(getInspectionProgressIndicatorState(state, true, 'run')).toBe('executing');
      });

      it('should return checked when rounds >= 1', () => {
        const state: InspectionState = {
          rounds: [{ number: 1, result: 'go', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(getInspectionProgressIndicatorState(state, false, 'run')).toBe('checked');
      });

      it('should return unchecked when no rounds completed', () => {
        const state: InspectionState = { rounds: [] };
        expect(getInspectionProgressIndicatorState(state, false, 'run')).toBe('unchecked');
      });

      it('should return unchecked when state is null/undefined', () => {
        expect(getInspectionProgressIndicatorState(null, false, 'run')).toBe('unchecked');
        expect(getInspectionProgressIndicatorState(undefined, false, 'run')).toBe('unchecked');
      });
    });
  });

  // ============================================================
  // Backward Compatibility Tests
  // ============================================================
  describe('Backward Compatibility', () => {
    describe('normalizeInspectionState', () => {
      it('should return null for null/undefined', () => {
        expect(normalizeInspectionState(null)).toBeNull();
        expect(normalizeInspectionState(undefined)).toBeNull();
      });

      it('should pass through new format unchanged', () => {
        const newState: InspectionState = {
          rounds: [{ number: 1, result: 'go', inspectedAt: '2025-12-27T12:00:00Z' }],
        };
        expect(normalizeInspectionState(newState)).toEqual(newState);
      });

      it('should convert legacy MultiRoundInspectionState', () => {
        const legacy: MultiRoundInspectionState = {
          status: 'completed',
          rounds: 1,
          currentRound: null,
          roundDetails: [{ roundNumber: 1, passed: true, completedAt: '2025-12-27T12:00:00Z' }],
        };

        const normalized = normalizeInspectionState(legacy);
        expect(normalized).toEqual({
          rounds: [{ number: 1, result: 'go', inspectedAt: '2025-12-27T12:00:00Z' }],
        });
      });

      it('should convert legacy with fixApplied', () => {
        const legacy: MultiRoundInspectionState = {
          status: 'completed',
          rounds: 1,
          currentRound: null,
          roundDetails: [{
            roundNumber: 1,
            passed: false,
            fixApplied: true,
            completedAt: '2025-12-27T12:00:00Z',
          }],
        };

        const normalized = normalizeInspectionState(legacy);
        expect(normalized?.rounds[0].result).toBe('nogo');
        expect(normalized?.rounds[0].fixedAt).toBeDefined();
      });

      it('should convert very old legacy format', () => {
        const veryOld = {
          status: 'passed',
          date: '2025-12-27T12:00:00Z',
          report: 'inspection-1.md',
        };

        const normalized = normalizeInspectionState(veryOld);
        expect(normalized?.rounds).toHaveLength(1);
        expect(normalized?.rounds[0].number).toBe(1);
        expect(normalized?.rounds[0].result).toBe('go');
      });
    });

    describe('Legacy constants (deprecated but maintained)', () => {
      it('should still export INSPECTION_STATUS', () => {
        expect(INSPECTION_STATUS.PENDING).toBe('pending');
        expect(INSPECTION_STATUS.IN_PROGRESS).toBe('in_progress');
        expect(INSPECTION_STATUS.COMPLETED).toBe('completed');
      });
    });

    describe('Legacy type guards (deprecated)', () => {
      it('isInspectionRoundDetail should work for legacy format', () => {
        const detail = { roundNumber: 1, passed: true };
        expect(isInspectionRoundDetail(detail)).toBe(true);
      });

      it('isMultiRoundInspectionState should work for legacy format', () => {
        const state = {
          status: 'pending',
          rounds: 0,
          currentRound: null,
          roundDetails: [],
        };
        expect(isMultiRoundInspectionState(state)).toBe(true);
      });
    });

    describe('Legacy helper functions (deprecated)', () => {
      it('createInitialMultiRoundInspectionState should create legacy format', () => {
        const state = createInitialMultiRoundInspectionState();
        expect(state.status).toBe('pending');
        expect(state.rounds).toBe(0);
        expect(state.roundDetails).toEqual([]);
      });

      it('getLatestRoundDetail should work with legacy format', () => {
        const state: MultiRoundInspectionState = {
          status: 'completed',
          rounds: 1,
          currentRound: null,
          roundDetails: [{ roundNumber: 1, passed: true }],
        };
        expect(getLatestRoundDetail(state)).toEqual({ roundNumber: 1, passed: true });
      });
    });
  });

  // ============================================================
  // Constants Tests
  // ============================================================
  describe('InspectionAutoExecutionFlag', () => {
    it('should define run and pause values (skip removed)', () => {
      expect(INSPECTION_AUTO_EXECUTION_FLAG.RUN).toBe('run');
      expect(INSPECTION_AUTO_EXECUTION_FLAG.PAUSE).toBe('pause');
    });

    it('should have exactly 2 flag values (skip removed)', () => {
      expect(Object.keys(INSPECTION_AUTO_EXECUTION_FLAG)).toHaveLength(2);
    });

    it('should allow valid flag type values', () => {
      const run: InspectionAutoExecutionFlag = 'run';
      const pause: InspectionAutoExecutionFlag = 'pause';

      expect(run).toBe('run');
      expect(pause).toBe('pause');
    });
  });

  describe('InspectionProgressIndicatorState', () => {
    it('should define all progress indicator states', () => {
      expect(INSPECTION_PROGRESS_INDICATOR_STATE.CHECKED).toBe('checked');
      expect(INSPECTION_PROGRESS_INDICATOR_STATE.UNCHECKED).toBe('unchecked');
      expect(INSPECTION_PROGRESS_INDICATOR_STATE.EXECUTING).toBe('executing');
    });

    it('should have exactly 3 indicator states (skip-scheduled removed)', () => {
      expect(Object.keys(INSPECTION_PROGRESS_INDICATOR_STATE)).toHaveLength(3);
    });

    it('should allow valid indicator state type values', () => {
      const checked: InspectionProgressIndicatorState = 'checked';
      const unchecked: InspectionProgressIndicatorState = 'unchecked';
      const executing: InspectionProgressIndicatorState = 'executing';

      expect(checked).toBe('checked');
      expect(unchecked).toBe('unchecked');
      expect(executing).toBe('executing');
    });
  });
});
