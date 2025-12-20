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
      it('should return pending when ready_for_implementation is true', () => {
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
});
