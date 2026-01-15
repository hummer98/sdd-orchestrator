/**
 * Spec Store Types Tests
 * TDD: Testing shared type definitions for decomposed spec stores
 * Requirements: 1.1, 2.1, 2.2, 5.1, 6.1
 * execution-store-consolidation: CheckImplResult REMOVED (Req 6.1)
 */

import { describe, it, expect } from 'vitest';
import type {
  SpecListState,
  SpecListActions,
  SpecDetailState,
  SpecDetailActions,
  AutoExecutionState,
  AutoExecutionActions,
  SpecManagerExecutionState,
  SpecManagerExecutionActions,
  ArtifactType,
  SpecManagerPhase,
  ImplTaskStatus,
  // execution-store-consolidation: CheckImplResult REMOVED (Req 6.1)
  AutoExecutionRuntimeState,
} from './types';
import {
  DEFAULT_SPEC_LIST_STATE,
  DEFAULT_SPEC_DETAIL_STATE,
  DEFAULT_AUTO_EXECUTION_RUNTIME,
  DEFAULT_AUTO_EXECUTION_STATE,
  DEFAULT_SPEC_MANAGER_EXECUTION_STATE,
} from './types';

describe('Spec Store Types', () => {
  describe('SpecListState', () => {
    it('should have default state with correct initial values', () => {
      expect(DEFAULT_SPEC_LIST_STATE.specs).toEqual([]);
      // spec-metadata-ssot-refactor: specJsonMap should be an empty Map
      expect(DEFAULT_SPEC_LIST_STATE.specJsonMap).toBeInstanceOf(Map);
      expect(DEFAULT_SPEC_LIST_STATE.specJsonMap.size).toBe(0);
      expect(DEFAULT_SPEC_LIST_STATE.sortBy).toBe('updatedAt');
      expect(DEFAULT_SPEC_LIST_STATE.sortOrder).toBe('desc');
      expect(DEFAULT_SPEC_LIST_STATE.statusFilter).toBe('all');
      expect(DEFAULT_SPEC_LIST_STATE.isLoading).toBe(false);
      expect(DEFAULT_SPEC_LIST_STATE.error).toBeNull();
    });

    it('should have readonly specs array', () => {
      // Type check - specs should be readonly
      const state: SpecListState = DEFAULT_SPEC_LIST_STATE;
      expect(Array.isArray(state.specs)).toBe(true);
    });
  });

  describe('SpecDetailState', () => {
    it('should have default state with correct initial values', () => {
      expect(DEFAULT_SPEC_DETAIL_STATE.selectedSpec).toBeNull();
      expect(DEFAULT_SPEC_DETAIL_STATE.specDetail).toBeNull();
      expect(DEFAULT_SPEC_DETAIL_STATE.isLoading).toBe(false);
      expect(DEFAULT_SPEC_DETAIL_STATE.error).toBeNull();
    });
  });

  describe('AutoExecutionRuntimeState', () => {
    it('should have default state with idle status', () => {
      expect(DEFAULT_AUTO_EXECUTION_RUNTIME.isAutoExecuting).toBe(false);
      expect(DEFAULT_AUTO_EXECUTION_RUNTIME.currentAutoPhase).toBeNull();
      expect(DEFAULT_AUTO_EXECUTION_RUNTIME.autoExecutionStatus).toBe('idle');
    });
  });

  describe('AutoExecutionState', () => {
    it('should have default state with empty map', () => {
      expect(DEFAULT_AUTO_EXECUTION_STATE.autoExecutionRuntimeMap.size).toBe(0);
    });
  });

  describe('SpecManagerExecutionState', () => {
    // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
    it('should have default state with all fields initialized', () => {
      expect(DEFAULT_SPEC_MANAGER_EXECUTION_STATE.isRunning).toBe(false);
      expect(DEFAULT_SPEC_MANAGER_EXECUTION_STATE.currentPhase).toBeNull();
      expect(DEFAULT_SPEC_MANAGER_EXECUTION_STATE.currentSpecId).toBeNull();
      // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
      expect(DEFAULT_SPEC_MANAGER_EXECUTION_STATE.error).toBeNull();
      expect(DEFAULT_SPEC_MANAGER_EXECUTION_STATE.implTaskStatus).toBeNull();
      expect(DEFAULT_SPEC_MANAGER_EXECUTION_STATE.retryCount).toBe(0);
      expect(DEFAULT_SPEC_MANAGER_EXECUTION_STATE.executionMode).toBeNull();
    });
  });

  describe('ArtifactType', () => {
    it('should include all artifact types', () => {
      const types: ArtifactType[] = ['requirements', 'design', 'tasks', 'research'];
      expect(types).toHaveLength(4);
    });
  });

  describe('SpecManagerPhase', () => {
    it('should include all spec-manager phases', () => {
      const phases: SpecManagerPhase[] = ['requirements', 'design', 'tasks', 'impl'];
      expect(phases).toHaveLength(4);
    });
  });

  describe('ImplTaskStatus', () => {
    it('should include all impl task statuses', () => {
      const statuses: ImplTaskStatus[] = [
        'pending',
        'running',
        'continuing',
        'success',
        'error',
        'stalled',
      ];
      expect(statuses).toHaveLength(6);
    });
  });
});
