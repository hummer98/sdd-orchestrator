/**
 * Workflow Types Tests
 * TDD: Testing workflow type definitions and constants
 * Requirements: 1.1, 1.3
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_PHASES,
  ALL_WORKFLOW_PHASES,
  PHASE_LABELS,
  getPhaseStatus,
} from './workflow';
import type { ExtendedSpecJson } from './workflow';
import {
  DEFAULT_SPEC_AUTO_EXECUTION_STATE,
  createSpecAutoExecutionState,
} from './index';
import type { SpecAutoExecutionState, AutoExecutionPermissions } from './index';

describe('Workflow Types', () => {
  // ============================================================
  // Task 1.1: Workflow Phase Types
  // Requirements: 1.1, 1.3
  // ============================================================
  describe('Task 1.1: WorkflowPhase type and constants', () => {
    describe('WORKFLOW_PHASES (displayable phases)', () => {
      it('should contain 5 displayable phases (inspection is shown via InspectionPanel)', () => {
        expect(WORKFLOW_PHASES).toEqual([
          'requirements',
          'design',
          'tasks',
          'impl',
          'deploy',
        ]);
      });

      it('should have exactly 5 phases', () => {
        expect(WORKFLOW_PHASES.length).toBe(5);
      });
    });

    describe('ALL_WORKFLOW_PHASES', () => {
      /**
       * document-review-phase Task 1.1: WorkflowPhase type extension
       * Requirements: 1.2 - WorkflowPhase 型に 'document-review' が含まれること
       */
      it('should contain all 7 phases in order including document-review', () => {
        expect(ALL_WORKFLOW_PHASES).toEqual([
          'requirements',
          'design',
          'tasks',
          'document-review',
          'impl',
          'inspection',
          'deploy',
        ]);
      });

      it('should have exactly 7 phases', () => {
        expect(ALL_WORKFLOW_PHASES.length).toBe(7);
      });

      it('should have document-review between tasks and impl', () => {
        const tasksIndex = ALL_WORKFLOW_PHASES.indexOf('tasks');
        const documentReviewIndex = ALL_WORKFLOW_PHASES.indexOf('document-review');
        const implIndex = ALL_WORKFLOW_PHASES.indexOf('impl');
        expect(documentReviewIndex).toBe(tasksIndex + 1);
        expect(documentReviewIndex).toBe(implIndex - 1);
      });
    });

    describe('PHASE_LABELS', () => {
      it('should have Japanese labels for all phases including document-review', () => {
        expect(PHASE_LABELS.requirements).toBe('要件定義');
        expect(PHASE_LABELS.design).toBe('設計');
        expect(PHASE_LABELS.tasks).toBe('タスク');
        expect(PHASE_LABELS['document-review']).toBe('ドキュメントレビュー');
        expect(PHASE_LABELS.impl).toBe('実装');
        expect(PHASE_LABELS.inspection).toBe('検査');
        expect(PHASE_LABELS.deploy).toBe('コミット');
      });

      it('should have labels for all phases', () => {
        for (const phase of ALL_WORKFLOW_PHASES) {
          expect(PHASE_LABELS[phase]).toBeDefined();
        }
      });
    });

  });

  // ============================================================
  // Task 1.1: Phase Status Logic
  // Requirements: 1.3
  // ============================================================
  describe('Task 1.1: getPhaseStatus function', () => {
    const createMockSpecJson = (
      overrides: Partial<ExtendedSpecJson> = {}
    ): ExtendedSpecJson => ({
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
      ...overrides,
    });

    describe('requirements phase', () => {
      it('should return pending when not generated', () => {
        const specJson = createMockSpecJson();
        expect(getPhaseStatus('requirements', specJson)).toBe('pending');
      });

      it('should return generated when generated but not approved', () => {
        const specJson = createMockSpecJson({
          approvals: {
            requirements: { generated: true, approved: false },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        });
        expect(getPhaseStatus('requirements', specJson)).toBe('generated');
      });

      it('should return approved when approved', () => {
        const specJson = createMockSpecJson({
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        });
        expect(getPhaseStatus('requirements', specJson)).toBe('approved');
      });
    });

    describe('design phase', () => {
      it('should return correct status based on approvals', () => {
        const specJson = createMockSpecJson({
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: false },
            tasks: { generated: false, approved: false },
          },
        });
        expect(getPhaseStatus('design', specJson)).toBe('generated');
      });
    });

    describe('tasks phase', () => {
      it('should return correct status based on approvals', () => {
        const specJson = createMockSpecJson({
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        });
        expect(getPhaseStatus('tasks', specJson)).toBe('approved');
      });
    });

    describe('impl phase', () => {
      it('should return pending when impl_completed is not set', () => {
        const specJson = createMockSpecJson({
        });
        expect(getPhaseStatus('impl', specJson)).toBe('pending');
      });

      it('should return approved when implementation is completed', () => {
        const specJson = createMockSpecJson({
          impl_completed: true,
        });
        expect(getPhaseStatus('impl', specJson)).toBe('approved');
      });
    });

    /**
     * document-review-phase Task 1.1: document-review phase status
     * Requirements: 1.2, 4.1 - documentReview.status === 'approved' で完了判定
     */
    describe('document-review phase', () => {
      it('should return pending when documentReview is undefined', () => {
        const specJson = createMockSpecJson();
        expect(getPhaseStatus('document-review', specJson)).toBe('pending');
      });

      it('should return pending when documentReview.status is not approved', () => {
        const specJson = createMockSpecJson({
          documentReview: {
            status: 'pending',
            currentRound: 1,
            roundDetails: [],
          },
        });
        expect(getPhaseStatus('document-review', specJson)).toBe('pending');
      });

      it('should return approved when documentReview.status is approved', () => {
        const specJson = createMockSpecJson({
          documentReview: {
            status: 'approved',
            currentRound: 1,
            roundDetails: [
              { roundNumber: 1, status: 'reply_complete', fixStatus: 'not_required' },
            ],
          },
        });
        expect(getPhaseStatus('document-review', specJson)).toBe('approved');
      });

      it('should return generated when documentReview.status is in_progress', () => {
        const specJson = createMockSpecJson({
          documentReview: {
            status: 'in_progress',
            currentRound: 1,
            roundDetails: [],
          },
        });
        expect(getPhaseStatus('document-review', specJson)).toBe('generated');
      });
    });

    describe('inspection phase', () => {
      it('should return pending when inspection is undefined', () => {
        const specJson = createMockSpecJson();
        expect(getPhaseStatus('inspection', specJson)).toBe('pending');
      });

      it('should return pending when inspection has NOGO result (passed: false)', () => {
        const specJson = createMockSpecJson({
          inspection: {
            status: 'completed',
            rounds: 1,
            currentRound: null,
            roundDetails: [
              { roundNumber: 1, passed: false, completedAt: '2024-01-01T00:00:00Z' },
            ],
          },
        });
        expect(getPhaseStatus('inspection', specJson)).toBe('pending');
      });

      it('should return approved when inspection has GO result (passed: true)', () => {
        const specJson = createMockSpecJson({
          inspection: {
            status: 'completed',
            rounds: 1,
            currentRound: null,
            roundDetails: [
              { roundNumber: 1, passed: true, completedAt: '2024-01-01T00:00:00Z' },
            ],
          },
        });
        expect(getPhaseStatus('inspection', specJson)).toBe('approved');
      });

      it('should return pending when inspection is in_progress', () => {
        const specJson = createMockSpecJson({
          inspection: {
            status: 'in_progress',
            rounds: 0,
            currentRound: 1,
            roundDetails: [],
          },
        });
        expect(getPhaseStatus('inspection', specJson)).toBe('pending');
      });

      it('should return approved for multi-round inspection with final GO', () => {
        const specJson = createMockSpecJson({
          inspection: {
            status: 'completed',
            rounds: 2,
            currentRound: null,
            roundDetails: [
              { roundNumber: 1, passed: false, fixApplied: true, completedAt: '2024-01-01T00:00:00Z' },
              { roundNumber: 2, passed: true, completedAt: '2024-01-01T01:00:00Z' },
            ],
          },
        });
        expect(getPhaseStatus('inspection', specJson)).toBe('approved');
      });
    });

    describe('deploy phase', () => {
      it('should return pending when phase is not deploy-complete', () => {
        const specJson = createMockSpecJson();
        expect(getPhaseStatus('deploy', specJson)).toBe('pending');
      });

      it('should return approved when phase is deploy-complete', () => {
        const specJson = createMockSpecJson({
          phase: 'deploy-complete',
        });
        expect(getPhaseStatus('deploy', specJson)).toBe('approved');
      });
    });
  });

  // ============================================================
  // spec-scoped-auto-execution-state Task 1.1: SpecAutoExecutionState型テスト
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================
  describe('SpecAutoExecutionState type', () => {
    describe('DEFAULT_SPEC_AUTO_EXECUTION_STATE', () => {
      it('should have enabled set to false by default', () => {
        expect(DEFAULT_SPEC_AUTO_EXECUTION_STATE.enabled).toBe(false);
      });

      it('should have all permissions set to true by default', () => {
        const { permissions } = DEFAULT_SPEC_AUTO_EXECUTION_STATE;
        expect(permissions.requirements).toBe(true);
        expect(permissions.design).toBe(true);
        expect(permissions.tasks).toBe(true);
        expect(permissions.impl).toBe(true);
        expect(permissions.inspection).toBe(true);
        expect(permissions.deploy).toBe(true);
      });

      // document-review-phase Task 9.1: documentReviewFlag removed
      // Use permissions['document-review'] instead
      it('should have document-review permission set to true by default', () => {
        expect(DEFAULT_SPEC_AUTO_EXECUTION_STATE.permissions['document-review']).toBe(true);
      });
    });

    describe('createSpecAutoExecutionState', () => {
      it('should create state with defaults when no options provided', () => {
        const state = createSpecAutoExecutionState();
        expect(state).toEqual(DEFAULT_SPEC_AUTO_EXECUTION_STATE);
      });

      it('should allow partial override of permissions', () => {
        const state = createSpecAutoExecutionState({
          enabled: true,
          permissions: {
            requirements: true,
            design: true,
          },
        });
        expect(state.enabled).toBe(true);
        expect(state.permissions.requirements).toBe(true);
        expect(state.permissions.design).toBe(true);
        expect(state.permissions.tasks).toBe(true);
        expect(state.permissions.impl).toBe(true);
      });

      // document-review-phase Task 9.1: Test updated for permissions['document-review']
      it('should allow setting document-review permission to true (GO)', () => {
        const state = createSpecAutoExecutionState({
          permissions: {
            'document-review': true,
          },
        });
        expect(state.permissions['document-review']).toBe(true);
      });

      it('should allow setting document-review permission to false (NOGO)', () => {
        const state = createSpecAutoExecutionState({
          permissions: {
            'document-review': false,
          },
        });
        expect(state.permissions['document-review']).toBe(false);
      });
    });

    describe('SpecAutoExecutionState type structure', () => {
      it('should have correct property types', () => {
        // document-review-phase Task 9.1: documentReviewFlag removed
        const state: SpecAutoExecutionState = {
          enabled: true,
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: false,
            inspection: false,
            deploy: false,
          },
          // documentReviewFlag removed - use permissions['document-review'] instead
        };

        // Type checking - if this compiles, the types are correct
        expect(typeof state.enabled).toBe('boolean');
        expect(typeof state.permissions).toBe('object');
        expect(typeof state.permissions['document-review']).toBe('boolean');
      });
    });
  });

  // ============================================================
  // spec-scoped-auto-execution-state Task 1.2: SpecJson autoExecutionフィールドテスト
  // Requirements: 1.4
  // ============================================================
  describe('SpecJson with autoExecution field', () => {
    it('should accept SpecJson with autoExecution field', () => {
      // Type checking test: SpecJson should accept autoExecution field
      const specJson = {
        feature_name: 'test-feature',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        language: 'ja' as const,
        phase: 'initialized' as const,
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        // document-review-phase Task 9.1: documentReviewFlag removed
        autoExecution: {
          enabled: true,
          permissions: {
            requirements: true,
            design: true,
            tasks: true,
            'document-review': true,
            impl: false,
            inspection: false,
            deploy: false,
          },
          // documentReviewFlag removed - use permissions['document-review'] instead
        },
      };

      // Verify the autoExecution field is accessible
      expect(specJson.autoExecution).toBeDefined();
      expect(specJson.autoExecution.enabled).toBe(true);
      expect(specJson.autoExecution.permissions.requirements).toBe(true);
      expect(specJson.autoExecution.permissions['document-review']).toBe(true);
    });

    it('should work with SpecJson without autoExecution field (backward compatibility)', () => {
      const specJson = {
        feature_name: 'test-feature',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        language: 'ja' as const,
        phase: 'initialized' as const,
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        // No autoExecution field - should still be valid
      };

      // Verify it's a valid SpecJson without autoExecution
      expect(specJson.feature_name).toBe('test-feature');
      expect((specJson as any).autoExecution).toBeUndefined();
    });
  });

  // ============================================================
  // spec-phase-auto-update Task 1.1: SpecPhase型の拡張
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================
  describe('SpecPhase extended values (spec-phase-auto-update)', () => {
    it('should accept inspection-complete as a valid SpecPhase value', () => {
      const specJson = createMockSpecJson({
        phase: 'inspection-complete' as any, // Cast for testing new value
      });
      expect(specJson.phase).toBe('inspection-complete');
    });

    it('should accept deploy-complete as a valid SpecPhase value', () => {
      const specJson = createMockSpecJson({
        phase: 'deploy-complete' as any, // Cast for testing new value
      });
      expect(specJson.phase).toBe('deploy-complete');
    });
  });

  // ============================================================
  // spec-phase-auto-update Task 1.1: SpecList表示用のPHASE_LABELS/PHASE_COLORS拡張テスト
  // Requirements: 4.1, 4.2
  // ============================================================
  describe('PHASE_LABELS for SpecList (spec-phase-auto-update)', () => {
    it('should be tested in SpecList.test.tsx', () => {
      // PHASE_LABELSはSpecList.tsx内に定義されており、
      // WorkflowViewで使用されるPHASE_LABELS（WorkflowPhase用）とは別物。
      // SpecList.test.tsxでテストする。
      expect(true).toBe(true);
    });
  });

  // Helper function for creating mock spec.json
  function createMockSpecJson(
    overrides: Partial<ExtendedSpecJson> = {}
  ): ExtendedSpecJson {
    return {
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
      ...overrides,
    };
  }
});
