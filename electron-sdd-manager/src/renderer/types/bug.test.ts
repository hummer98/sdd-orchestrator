/**
 * Bug Workflow Types Test
 * Requirements: 3.1, 5.6, 6.1
 */

import { describe, it, expect } from 'vitest';
import {
  determineBugPhase,
  getNextAction,
  isActionAvailable,
  PHASE_LABELS,
  PHASE_COLORS,
  BUG_PHASES,
  // Task 1.1: bugs-pane-integration新規型
  BUG_WORKFLOW_PHASES,
  BUG_DOCUMENT_TABS,
  BUG_WORKFLOW_PHASE_LABELS,
  BUG_PHASE_COMMANDS,
  type BugPhase,
  type BugAction,
  type BugMetadata,
  type BugDetail,
  type BugsChangeEvent,
  // Task 1.1: bugs-pane-integration新規型
  type BugWorkflowPhase,
  type BugPhaseStatus,
  type BugDocumentTab,
} from './bug';

describe('Bug Types', () => {
  describe('determineBugPhase', () => {
    it('should return "reported" when only report exists', () => {
      const artifacts: BugDetail['artifacts'] = {
        report: { exists: true, path: '/test/report.md', updatedAt: null },
        analysis: null,
        fix: null,
        verification: null,
      };
      expect(determineBugPhase(artifacts)).toBe('reported');
    });

    it('should return "analyzed" when analysis exists', () => {
      const artifacts: BugDetail['artifacts'] = {
        report: { exists: true, path: '/test/report.md', updatedAt: null },
        analysis: { exists: true, path: '/test/analysis.md', updatedAt: null },
        fix: null,
        verification: null,
      };
      expect(determineBugPhase(artifacts)).toBe('analyzed');
    });

    it('should return "fixed" when fix exists', () => {
      const artifacts: BugDetail['artifacts'] = {
        report: { exists: true, path: '/test/report.md', updatedAt: null },
        analysis: { exists: true, path: '/test/analysis.md', updatedAt: null },
        fix: { exists: true, path: '/test/fix.md', updatedAt: null },
        verification: null,
      };
      expect(determineBugPhase(artifacts)).toBe('fixed');
    });

    it('should return "verified" when verification exists', () => {
      const artifacts: BugDetail['artifacts'] = {
        report: { exists: true, path: '/test/report.md', updatedAt: null },
        analysis: { exists: true, path: '/test/analysis.md', updatedAt: null },
        fix: { exists: true, path: '/test/fix.md', updatedAt: null },
        verification: { exists: true, path: '/test/verification.md', updatedAt: null },
      };
      expect(determineBugPhase(artifacts)).toBe('verified');
    });

    it('should return "reported" when artifacts is all null', () => {
      const artifacts: BugDetail['artifacts'] = {
        report: null,
        analysis: null,
        fix: null,
        verification: null,
      };
      expect(determineBugPhase(artifacts)).toBe('reported');
    });
  });

  describe('getNextAction', () => {
    it('should return "analyze" for reported phase', () => {
      expect(getNextAction('reported')).toBe('analyze');
    });

    it('should return "fix" for analyzed phase', () => {
      expect(getNextAction('analyzed')).toBe('fix');
    });

    it('should return "verify" for fixed phase', () => {
      expect(getNextAction('fixed')).toBe('verify');
    });

    it('should return null for verified phase', () => {
      // bug-deploy-phase: Requirements 8.4 - deploy is manual trigger
      expect(getNextAction('verified')).toBeNull();
    });

    // bug-deploy-phase: Requirements 8.4 - workflow complete
    it('should return null for deployed phase', () => {
      expect(getNextAction('deployed')).toBeNull();
    });
  });

  describe('isActionAvailable', () => {
    it('should return true for analyze when phase is reported', () => {
      expect(isActionAvailable('reported', 'analyze')).toBe(true);
    });

    it('should return false for fix when phase is reported', () => {
      expect(isActionAvailable('reported', 'fix')).toBe(false);
    });

    it('should return false for verify when phase is reported', () => {
      expect(isActionAvailable('reported', 'verify')).toBe(false);
    });

    it('should return true for fix when phase is analyzed', () => {
      expect(isActionAvailable('analyzed', 'fix')).toBe(true);
    });

    it('should return true for verify when phase is fixed', () => {
      expect(isActionAvailable('fixed', 'verify')).toBe(true);
    });

    it('should return false for any action when phase is verified', () => {
      expect(isActionAvailable('verified', 'analyze')).toBe(false);
      expect(isActionAvailable('verified', 'fix')).toBe(false);
      expect(isActionAvailable('verified', 'verify')).toBe(false);
    });
  });

  describe('PHASE_LABELS', () => {
    it('should have labels for all phases', () => {
      expect(PHASE_LABELS.reported).toBe('報告済');
      expect(PHASE_LABELS.analyzed).toBe('分析済');
      expect(PHASE_LABELS.fixed).toBe('修正済');
      expect(PHASE_LABELS.verified).toBe('検証済');
    });

    // bug-deploy-phase: Requirements 1.1, 3.1
    it('should have label for deployed phase', () => {
      expect(PHASE_LABELS.deployed).toBe('デプロイ完了');
    });
  });

  describe('PHASE_COLORS', () => {
    it('should have colors for all phases', () => {
      expect(PHASE_COLORS.reported).toBeDefined();
      expect(PHASE_COLORS.analyzed).toBeDefined();
      expect(PHASE_COLORS.fixed).toBeDefined();
      expect(PHASE_COLORS.verified).toBeDefined();
    });

    // bug-deploy-phase: Requirements 1.1, 3.2
    it('should have purple color for deployed phase', () => {
      expect(PHASE_COLORS.deployed).toBe('bg-purple-100 text-purple-700');
    });
  });

  describe('BUG_PHASES', () => {
    it('should contain all phases in order including deployed', () => {
      // bug-deploy-phase: Requirements 1.1, 1.2
      expect(BUG_PHASES).toEqual(['reported', 'analyzed', 'fixed', 'verified', 'deployed']);
    });

    it('should be readonly', () => {
      // TypeScript compile-time check, runtime check for array length
      // bug-deploy-phase: 5 phases (added deployed)
      expect(BUG_PHASES.length).toBe(5);
    });
  });

  describe('Type definitions', () => {
    it('should allow valid BugMetadata', () => {
      const metadata: BugMetadata = {
        name: 'test-bug',
        path: '/project/.kiro/bugs/test-bug',
        phase: 'reported',
        updatedAt: '2025-01-01T00:00:00Z',
        reportedAt: '2025-01-01T00:00:00Z',
      };
      expect(metadata.name).toBe('test-bug');
    });

    it('should allow valid BugsChangeEvent', () => {
      const event: BugsChangeEvent = {
        type: 'add',
        path: '/project/.kiro/bugs/test-bug/report.md',
        bugName: 'test-bug',
      };
      expect(event.type).toBe('add');
    });
  });

  // Task 1.1: bugs-pane-integration - BugWorkflowPhase, BugPhaseStatus, BugDocumentTab型テスト
  // Requirements: 2.2, 3.2
  describe('BugWorkflowPhase type', () => {
    it('should define 5 workflow phases', () => {
      expect(BUG_WORKFLOW_PHASES).toEqual(['report', 'analyze', 'fix', 'verify', 'deploy']);
    });

    it('should be readonly array', () => {
      expect(BUG_WORKFLOW_PHASES.length).toBe(5);
    });
  });

  describe('BugPhaseStatus type', () => {
    it('should have all status values', () => {
      // TypeScript compile-time check for valid values
      const statuses: BugPhaseStatus[] = ['pending', 'completed', 'executing'];
      expect(statuses).toHaveLength(3);
    });
  });

  describe('BugDocumentTab type', () => {
    it('should define 4 document tabs', () => {
      expect(BUG_DOCUMENT_TABS).toEqual(['report', 'analysis', 'fix', 'verification']);
    });

    it('should be readonly array', () => {
      expect(BUG_DOCUMENT_TABS.length).toBe(4);
    });
  });

  describe('BUG_WORKFLOW_PHASE_LABELS', () => {
    it('should have labels for all workflow phases', () => {
      expect(BUG_WORKFLOW_PHASE_LABELS.report).toBe('Report');
      expect(BUG_WORKFLOW_PHASE_LABELS.analyze).toBe('Analyze');
      expect(BUG_WORKFLOW_PHASE_LABELS.fix).toBe('Fix');
      expect(BUG_WORKFLOW_PHASE_LABELS.verify).toBe('Verify');
      expect(BUG_WORKFLOW_PHASE_LABELS.deploy).toBe('Deploy');
    });
  });

  describe('BUG_PHASE_COMMANDS', () => {
    it('should map phases to commands correctly', () => {
      expect(BUG_PHASE_COMMANDS.report).toBeNull(); // No command for report
      expect(BUG_PHASE_COMMANDS.analyze).toBe('/kiro:bug-analyze');
      expect(BUG_PHASE_COMMANDS.fix).toBe('/kiro:bug-fix');
      expect(BUG_PHASE_COMMANDS.verify).toBe('/kiro:bug-verify');
      expect(BUG_PHASE_COMMANDS.deploy).toBe('/commit');
    });
  });
});
