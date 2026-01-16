/**
 * Document Review Types Tests
 * TDD: Testing document review type definitions
 * Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 8.2
 */

import { describe, it, expect } from 'vitest';
import {
  REVIEW_STATUS,
  ROUND_STATUS,
  FIX_STATUS,
  type DocumentReviewState,
  type RoundDetail,
  type ReviewError,
  type FixStatus,
  isDocumentReviewState,
  createInitialReviewState,
} from './documentReview';

describe('Document Review Types', () => {
  // ============================================================
  // Task 1.1: DocumentReviewState type
  // Requirements: 5.1, 5.2, 5.3, 5.4
  // ============================================================
  describe('Task 1.1: DocumentReviewState type', () => {
    describe('REVIEW_STATUS constants', () => {
      it('should define all review status values', () => {
        expect(REVIEW_STATUS.PENDING).toBe('pending');
        expect(REVIEW_STATUS.IN_PROGRESS).toBe('in_progress');
        expect(REVIEW_STATUS.APPROVED).toBe('approved');
        expect(REVIEW_STATUS.SKIPPED).toBe('skipped');
      });
    });

    describe('ROUND_STATUS constants', () => {
      it('should define all round status values', () => {
        expect(ROUND_STATUS.REVIEW_COMPLETE).toBe('review_complete');
        expect(ROUND_STATUS.REPLY_COMPLETE).toBe('reply_complete');
        expect(ROUND_STATUS.INCOMPLETE).toBe('incomplete');
      });
    });

    describe('isDocumentReviewState type guard', () => {
      it('should return true for valid DocumentReviewState', () => {
        const validState: DocumentReviewState = {
          status: 'approved',
        };
        expect(isDocumentReviewState(validState)).toBe(true);
      });

      it('should return true for state with optional fields', () => {
        const stateWithOptional: DocumentReviewState = {
          status: 'in_progress',
          currentRound: 1,
          roundDetails: [
            {
              roundNumber: 1,
              reviewCompletedAt: '2025-12-11T01:00:00Z',
              status: 'review_complete',
            },
          ],
        };
        expect(isDocumentReviewState(stateWithOptional)).toBe(true);
      });

      it('should return false for invalid status', () => {
        const invalidState = {
          status: 'invalid_status',
        };
        expect(isDocumentReviewState(invalidState)).toBe(false);
      });

      it('should return false for missing status', () => {
        const invalidState = {
          roundDetails: [],
        };
        expect(isDocumentReviewState(invalidState)).toBe(false);
      });

      it('should return false for non-object values', () => {
        expect(isDocumentReviewState(null)).toBe(false);
        expect(isDocumentReviewState(undefined)).toBe(false);
        expect(isDocumentReviewState('string')).toBe(false);
        expect(isDocumentReviewState(123)).toBe(false);
      });
    });

    describe('createInitialReviewState', () => {
      it('should create initial state with status: pending', () => {
        const state = createInitialReviewState();
        expect(state.status).toBe('pending');
        expect(state.currentRound).toBeUndefined();
        expect(state.roundDetails).toBeUndefined();
      });
    });
  });

  // ============================================================
  // Task 1.2: ReviewError type
  // Requirements: 8.1, 8.2
  // ============================================================
  describe('Task 1.2: ReviewError type', () => {
    it('should allow PRECONDITION_FAILED error', () => {
      const error: ReviewError = {
        type: 'PRECONDITION_FAILED',
        message: 'Tasks phase not approved',
      };
      expect(error.type).toBe('PRECONDITION_FAILED');
      expect(error.message).toBe('Tasks phase not approved');
    });

    it('should allow AGENT_ERROR error', () => {
      const error: ReviewError = {
        type: 'AGENT_ERROR',
        message: 'Agent execution failed',
      };
      expect(error.type).toBe('AGENT_ERROR');
    });

    it('should allow FILE_NOT_FOUND error', () => {
      const error: ReviewError = {
        type: 'FILE_NOT_FOUND',
        path: '/path/to/file.md',
      };
      expect(error.type).toBe('FILE_NOT_FOUND');
      expect(error.path).toBe('/path/to/file.md');
    });

    it('should allow ALREADY_RUNNING error', () => {
      const error: ReviewError = {
        type: 'ALREADY_RUNNING',
      };
      expect(error.type).toBe('ALREADY_RUNNING');
    });

    it('should allow ALREADY_APPROVED error', () => {
      const error: ReviewError = {
        type: 'ALREADY_APPROVED',
      };
      expect(error.type).toBe('ALREADY_APPROVED');
    });
  });

  // ============================================================
  // Task 1.1: RoundDetail type
  // Requirements: 5.4
  // ============================================================
  describe('Task 1.1: RoundDetail type', () => {
    it('should have required fields', () => {
      const detail: RoundDetail = {
        roundNumber: 1,
        status: 'reply_complete',
      };
      expect(detail.roundNumber).toBe(1);
      expect(detail.status).toBe('reply_complete');
    });

    it('should allow optional timestamp fields', () => {
      const detail: RoundDetail = {
        roundNumber: 2,
        reviewCompletedAt: '2025-12-11T01:00:00Z',
        replyCompletedAt: '2025-12-11T01:30:00Z',
        status: 'reply_complete',
      };
      expect(detail.reviewCompletedAt).toBe('2025-12-11T01:00:00Z');
      expect(detail.replyCompletedAt).toBe('2025-12-11T01:30:00Z');
    });
  });

  // ============================================================
  // fix-status-field-migration Task 1.1: FixStatus type
  // Requirements: 1.1, 1.2, 6.1, 6.2, 6.3
  // ============================================================
  describe('fix-status-field-migration Task 1.1: FixStatus type', () => {
    it('should define FIX_STATUS constants with three values', () => {
      expect(FIX_STATUS.NOT_REQUIRED).toBe('not_required');
      expect(FIX_STATUS.PENDING).toBe('pending');
      expect(FIX_STATUS.APPLIED).toBe('applied');
    });

    it('should allow fixStatus field in RoundDetail', () => {
      const detail: RoundDetail = {
        roundNumber: 1,
        status: 'reply_complete',
        fixStatus: 'not_required',
      };
      expect(detail.fixStatus).toBe('not_required');
    });

    it('should allow all three fixStatus values', () => {
      const notRequired: RoundDetail = {
        roundNumber: 1,
        status: 'reply_complete',
        fixStatus: 'not_required',
      };
      const pending: RoundDetail = {
        roundNumber: 2,
        status: 'reply_complete',
        fixStatus: 'pending',
      };
      const applied: RoundDetail = {
        roundNumber: 3,
        status: 'reply_complete',
        fixStatus: 'applied',
      };
      expect(notRequired.fixStatus).toBe('not_required');
      expect(pending.fixStatus).toBe('pending');
      expect(applied.fixStatus).toBe('applied');
    });

    it('should not require fixApplied field (removed from type)', () => {
      // fixApplied has been removed, only fixStatus should be used
      const detail: RoundDetail = {
        roundNumber: 1,
        status: 'reply_complete',
        fixStatus: 'applied',
        fixRequired: 2,
        needsDiscussion: 0,
      };
      // TypeScript would fail if fixApplied was still required
      expect(detail.fixStatus).toBe('applied');
      expect((detail as { fixApplied?: boolean }).fixApplied).toBeUndefined();
    });
  });
});
