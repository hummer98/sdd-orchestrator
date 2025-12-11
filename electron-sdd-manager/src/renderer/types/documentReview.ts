/**
 * Document Review Types
 * Type definitions for document review workflow
 * Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 8.2
 */

// ============================================================
// Task 1.1: Review Status Constants
// Requirements: 5.4
// ============================================================

/** Review status constants */
export const REVIEW_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  SKIPPED: 'skipped',
} as const;

/** Valid review status values */
export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

// ============================================================
// Task 1.1: Round Status Constants
// Requirements: 5.4
// ============================================================

/** Round status constants */
export const ROUND_STATUS = {
  REVIEW_COMPLETE: 'review_complete',
  REPLY_COMPLETE: 'reply_complete',
  INCOMPLETE: 'incomplete',
} as const;

/** Valid round status values */
export type RoundStatus = (typeof ROUND_STATUS)[keyof typeof ROUND_STATUS];

// ============================================================
// Task 1.1: RoundDetail Type
// Requirements: 5.4
// ============================================================

/** Details of a single review round */
export interface RoundDetail {
  /** Round number (1-indexed) */
  roundNumber: number;
  /** Timestamp when review agent completed */
  reviewCompletedAt?: string;
  /** Timestamp when reply agent completed */
  replyCompletedAt?: string;
  /** Status of this round */
  status: RoundStatus;
  /** Whether fixes from this round's reply have been applied */
  fixApplied?: boolean;
}

// ============================================================
// Task 1.1: DocumentReviewState Type
// Requirements: 5.1, 5.2, 5.3, 5.4
// ============================================================

/** Document review state stored in spec.json */
export interface DocumentReviewState {
  /** Number of completed rounds */
  rounds: number;
  /** Overall review status */
  status: ReviewStatus;
  /** Current round number if review is in progress */
  currentRound?: number;
  /** Details for each round (optional) */
  roundDetails?: RoundDetail[];
}

// ============================================================
// Task 1.1: Type Guard
// Requirements: 5.3
// ============================================================

/**
 * Type guard to check if an object is a valid DocumentReviewState
 */
export function isDocumentReviewState(value: unknown): value is DocumentReviewState {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check required fields
  if (typeof obj.rounds !== 'number') {
    return false;
  }

  if (typeof obj.status !== 'string') {
    return false;
  }

  // Validate status value
  const validStatuses = Object.values(REVIEW_STATUS);
  if (!validStatuses.includes(obj.status as ReviewStatus)) {
    return false;
  }

  return true;
}

/**
 * Create initial review state
 * Requirements: 5.5
 */
export function createInitialReviewState(): DocumentReviewState {
  return {
    rounds: 0,
    status: 'pending',
  };
}

// ============================================================
// Task 1.2: ReviewError Type
// Requirements: 8.1, 8.2
// ============================================================

/** Error types for review operations */
export type ReviewError =
  | { type: 'PRECONDITION_FAILED'; message: string }
  | { type: 'AGENT_ERROR'; message: string }
  | { type: 'FILE_NOT_FOUND'; path: string }
  | { type: 'ALREADY_RUNNING' }
  | { type: 'ALREADY_APPROVED' };

// ============================================================
// Extended SpecJson with documentReview field
// Requirements: 5.1, 5.2
// ============================================================

import type { SpecJson } from './index';

/** Extended spec.json with documentReview field */
export interface SpecJsonWithReview extends SpecJson {
  /** Document review state (optional for backward compatibility) */
  documentReview?: DocumentReviewState;
}
