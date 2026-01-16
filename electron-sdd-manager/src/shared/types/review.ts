/**
 * Review & Inspection Types for Shared Components
 *
 * Task 4.6: DocumentReview・Inspection・Validation関連コンポーネントを共有化する
 *
 * これらの型はElectron版のrenderer/types/からコピーし、
 * 共有コンポーネントで使用できるようにしています。
 */

// =============================================================================
// Document Review Types
// =============================================================================

/**
 * Review status constants
 */
export const REVIEW_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  SKIPPED: 'skipped',
} as const;

/**
 * Valid review status values
 */
export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

/**
 * Round status constants
 */
export const ROUND_STATUS = {
  REVIEW_COMPLETE: 'review_complete',
  REPLY_COMPLETE: 'reply_complete',
  INCOMPLETE: 'incomplete',
} as const;

/**
 * Valid round status values
 */
export type RoundStatus = (typeof ROUND_STATUS)[keyof typeof ROUND_STATUS];

/**
 * Details of a single review round
 */
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
  /** Number of "Fix Required" items in this round's reply */
  fixRequired?: number;
  /** Number of "Needs Discussion" items in this round's reply */
  needsDiscussion?: number;
}

/**
 * Document review state stored in spec.json
 */
export interface DocumentReviewState {
  /** Overall review status */
  status: ReviewStatus;
  /** Current round number if review is in progress */
  currentRound?: number;
  /** Details for each round */
  roundDetails?: RoundDetail[];
}

/**
 * Auto execution flag for document review (2 values - skip removed)
 */
export type DocumentReviewAutoExecutionFlag = 'run' | 'pause';

// =============================================================================
// Inspection Types
// =============================================================================

/**
 * Inspection auto execution flag constants
 */
export const INSPECTION_AUTO_EXECUTION_FLAG = {
  RUN: 'run',
  PAUSE: 'pause',
} as const;

/**
 * Valid inspection auto execution flag values
 */
export type InspectionAutoExecutionFlag =
  (typeof INSPECTION_AUTO_EXECUTION_FLAG)[keyof typeof INSPECTION_AUTO_EXECUTION_FLAG];

/**
 * Inspection progress indicator state constants
 */
export const INSPECTION_PROGRESS_INDICATOR_STATE = {
  CHECKED: 'checked',
  UNCHECKED: 'unchecked',
  EXECUTING: 'executing',
} as const;

/**
 * Valid inspection progress indicator state values
 */
export type InspectionProgressIndicatorState =
  (typeof INSPECTION_PROGRESS_INDICATOR_STATE)[keyof typeof INSPECTION_PROGRESS_INDICATOR_STATE];

/**
 * Result of an inspection round
 */
export type InspectionResult = 'go' | 'nogo';

/**
 * Details of a single inspection round
 */
export interface InspectionRound {
  /** Round number (1-indexed) */
  number: number;
  /** GO/NOGO result */
  result: InspectionResult;
  /** Inspection completion timestamp (ISO 8601) */
  inspectedAt: string;
  /** Fix completion timestamp (ISO 8601) - set by spec-impl agent after --inspection-fix */
  fixedAt?: string;
}

/**
 * Inspection state stored in spec.json
 */
export interface InspectionState {
  /** Completed inspection rounds */
  rounds: InspectionRound[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the latest round from inspection state
 */
export function getLatestRound(
  state: InspectionState | null | undefined
): InspectionRound | null {
  if (!state || !state.rounds || state.rounds.length === 0) {
    return null;
  }
  return state.rounds[state.rounds.length - 1];
}

/**
 * Get the number of completed inspection rounds
 */
export function getRoundCount(state: InspectionState | null | undefined): number {
  return state?.rounds?.length ?? 0;
}

/**
 * Check if fix is required for the latest round
 */
export function needsFix(state: InspectionState | null | undefined): boolean {
  const latest = getLatestRound(state);
  if (!latest) {
    return false;
  }
  return latest.result === 'nogo' && !latest.fixedAt;
}

/**
 * Calculate the progress indicator state based on inspection state and execution flags
 */
export function getInspectionProgressIndicatorState(
  state: InspectionState | null | undefined,
  isExecuting: boolean,
  _autoExecutionFlag: InspectionAutoExecutionFlag
): InspectionProgressIndicatorState {
  // Priority 1: executing
  if (isExecuting) {
    return 'executing';
  }

  // Priority 2: checked (1 or more rounds completed)
  if (getRoundCount(state) >= 1) {
    return 'checked';
  }

  // Priority 3: unchecked (default)
  return 'unchecked';
}
