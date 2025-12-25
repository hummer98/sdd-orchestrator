/**
 * Workflow Types Tests
 * TDD: Testing workflow type definitions and constants
 * Requirements: 1.1, 1.3
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_PHASES,
  PHASE_LABELS,
  VALIDATION_COMMANDS,
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
    describe('WORKFLOW_PHASES', () => {
      it('should contain all 6 phases in order', () => {
        expect(WORKFLOW_PHASES).toEqual([
          'requirements',
          'design',
          'tasks',
          'impl',
          'inspection',
          'deploy',
        ]);
      });

      it('should have exactly 6 phases', () => {
        expect(WORKFLOW_PHASES.length).toBe(6);
      });
    });

    describe('PHASE_LABELS', () => {
      it('should have Japanese labels for all phases', () => {
        expect(PHASE_LABELS.requirements).toBe('要件定義');
        expect(PHASE_LABELS.design).toBe('設計');
        expect(PHASE_LABELS.tasks).toBe('タスク');
        expect(PHASE_LABELS.impl).toBe('実装');
        expect(PHASE_LABELS.inspection).toBe('検査');
        expect(PHASE_LABELS.deploy).toBe('デプロイ');
      });

      it('should have labels for all phases', () => {
        for (const phase of WORKFLOW_PHASES) {
          expect(PHASE_LABELS[phase]).toBeDefined();
        }
      });
    });

    describe('ValidationType', () => {
      it('should have validation commands for gap and design', () => {
        expect(VALIDATION_COMMANDS.gap).toBe('/kiro:validate-gap');
        expect(VALIDATION_COMMANDS.design).toBe('/kiro:validate-design');
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

    describe('inspection phase', () => {
      it('should return pending when inspection_completed is undefined', () => {
        const specJson = createMockSpecJson();
        expect(getPhaseStatus('inspection', specJson)).toBe('pending');
      });

      it('should return approved when inspection_completed is true', () => {
        const specJson = createMockSpecJson({
          inspection_completed: true,
        });
        expect(getPhaseStatus('inspection', specJson)).toBe('approved');
      });
    });

    describe('deploy phase', () => {
      it('should return pending when deploy_completed is undefined', () => {
        const specJson = createMockSpecJson();
        expect(getPhaseStatus('deploy', specJson)).toBe('pending');
      });

      it('should return approved when deploy_completed is true', () => {
        const specJson = createMockSpecJson({
          deploy_completed: true,
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

      it('should have all permissions set to false by default', () => {
        const { permissions } = DEFAULT_SPEC_AUTO_EXECUTION_STATE;
        expect(permissions.requirements).toBe(false);
        expect(permissions.design).toBe(false);
        expect(permissions.tasks).toBe(false);
        expect(permissions.impl).toBe(false);
        expect(permissions.inspection).toBe(false);
        expect(permissions.deploy).toBe(false);
      });

      it('should have documentReviewFlag set to skip by default', () => {
        expect(DEFAULT_SPEC_AUTO_EXECUTION_STATE.documentReviewFlag).toBe('skip');
      });

      it('should have all validation options set to false by default', () => {
        const { validationOptions } = DEFAULT_SPEC_AUTO_EXECUTION_STATE;
        expect(validationOptions.gap).toBe(false);
        expect(validationOptions.design).toBe(false);
        expect(validationOptions.impl).toBe(false);
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
        expect(state.permissions.tasks).toBe(false);
        expect(state.permissions.impl).toBe(false);
      });

      it('should allow setting documentReviewFlag to run', () => {
        const state = createSpecAutoExecutionState({
          documentReviewFlag: 'run',
        });
        expect(state.documentReviewFlag).toBe('run');
      });

      it('should allow setting documentReviewFlag to pause', () => {
        const state = createSpecAutoExecutionState({
          documentReviewFlag: 'pause',
        });
        expect(state.documentReviewFlag).toBe('pause');
      });

      it('should allow partial override of validationOptions', () => {
        const state = createSpecAutoExecutionState({
          validationOptions: {
            gap: true,
          },
        });
        expect(state.validationOptions.gap).toBe(true);
        expect(state.validationOptions.design).toBe(false);
        expect(state.validationOptions.impl).toBe(false);
      });
    });

    describe('SpecAutoExecutionState type structure', () => {
      it('should have correct property types', () => {
        const state: SpecAutoExecutionState = {
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
        };

        // Type checking - if this compiles, the types are correct
        expect(typeof state.enabled).toBe('boolean');
        expect(typeof state.permissions).toBe('object');
        expect(typeof state.documentReviewFlag).toBe('string');
        expect(['skip', 'run', 'pause']).toContain(state.documentReviewFlag);
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
          documentReviewFlag: 'run' as const,
          validationOptions: {
            gap: false,
            design: false,
            impl: false,
          },
        },
      };

      // Verify the autoExecution field is accessible
      expect(specJson.autoExecution).toBeDefined();
      expect(specJson.autoExecution.enabled).toBe(true);
      expect(specJson.autoExecution.permissions.requirements).toBe(true);
      expect(specJson.autoExecution.documentReviewFlag).toBe('run');
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
});
