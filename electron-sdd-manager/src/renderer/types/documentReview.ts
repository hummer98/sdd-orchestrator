/**
 * Document Review Types
 * Type definitions for document review workflow
 * Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 8.2
 * gemini-document-review: 3.1, 3.2, 3.3 - ReviewerScheme type
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
// fix-status-field-migration Task 1.1: FixStatus Type
// Requirements: 1.1, 1.2, 6.1
// ============================================================

/**
 * Fix status constants for document review rounds
 * - NOT_REQUIRED: No fixes or discussion needed, proceed to next process
 * - PENDING: Fixes or discussion needed, pause execution
 * - APPLIED: Fixes applied, re-review required
 */
export const FIX_STATUS = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  APPLIED: 'applied',
} as const;

/**
 * Fix status for document review rounds
 * - 'not_required': No fixes or discussion needed, proceed to next process
 * - 'pending': Fixes or discussion needed, pause execution
 * - 'applied': Fixes applied, re-review required
 */
export type FixStatus = (typeof FIX_STATUS)[keyof typeof FIX_STATUS];

// ============================================================
// gemini-document-review Task 1.1: ReviewerScheme Type
// Requirements: 3.1, 3.2, 3.3
// ============================================================

/**
 * Reviewer scheme for document review
 * - 'claude-code': Claude Code CLI (default)
 * - 'gemini-cli': Gemini CLI
 * - 'debatex': Debatex CLI
 */
export type ReviewerScheme = 'claude-code' | 'gemini-cli' | 'debatex';

/**
 * Default reviewer scheme
 */
export const DEFAULT_REVIEWER_SCHEME: ReviewerScheme = 'claude-code';

/**
 * Valid reviewer scheme values for validation
 */
const VALID_REVIEWER_SCHEMES = ['claude-code', 'gemini-cli', 'debatex'] as const;

/**
 * Type guard to check if a value is a valid ReviewerScheme
 */
export function isReviewerScheme(value: unknown): value is ReviewerScheme {
  return typeof value === 'string' && VALID_REVIEWER_SCHEMES.includes(value as ReviewerScheme);
}

// ============================================================
// Task 1.1: RoundDetail Type
// Requirements: 5.4, 6.2, 6.3 (fix-status-field-migration)
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
  /** Fix status determining next action (replaces fixApplied) */
  fixStatus?: FixStatus;
  /** Number of "Fix Required" items in this round's reply */
  fixRequired?: number;
  /** Number of "Needs Discussion" items in this round's reply */
  needsDiscussion?: number;
}

// ============================================================
// Task 1.1: DocumentReviewState Type
// Requirements: 5.1, 5.2, 5.3, 5.4
// ============================================================

/** Document review state stored in spec.json */
export interface DocumentReviewState {
  /** Overall review status */
  status: ReviewStatus;
  /** Current round number if review is in progress */
  currentRound?: number;
  /** Details for each round */
  roundDetails?: RoundDetail[];
  /** Reviewer CLI scheme (default: claude-code) - gemini-document-review Task 1.1 */
  scheme?: ReviewerScheme;
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

  // Check required field: status
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
    status: 'pending',
  };
}

/**
 * Get the number of completed rounds from roundDetails
 */
export function getRoundsCount(state: DocumentReviewState | null | undefined): number {
  return state?.roundDetails?.length ?? 0;
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
  | { type: 'ALREADY_APPROVED' }
  | { type: 'PARSE_ERROR'; message: string };

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
