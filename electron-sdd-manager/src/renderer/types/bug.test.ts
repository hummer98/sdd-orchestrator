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
  type BugPhase,
  type BugAction,
  type BugMetadata,
  type BugDetail,
  type BugsChangeEvent,
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
      expect(getNextAction('verified')).toBeNull();
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
  });

  describe('PHASE_COLORS', () => {
    it('should have colors for all phases', () => {
      expect(PHASE_COLORS.reported).toBeDefined();
      expect(PHASE_COLORS.analyzed).toBeDefined();
      expect(PHASE_COLORS.fixed).toBeDefined();
      expect(PHASE_COLORS.verified).toBeDefined();
    });
  });

  describe('BUG_PHASES', () => {
    it('should contain all phases in order', () => {
      expect(BUG_PHASES).toEqual(['reported', 'analyzed', 'fixed', 'verified']);
    });

    it('should be readonly', () => {
      // TypeScript compile-time check, runtime check for array length
      expect(BUG_PHASES.length).toBe(4);
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
});
