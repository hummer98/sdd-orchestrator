/**
 * Inspection Workflow Types
 * Type definitions for inspection workflow UI
 * Feature: inspection-workflow-ui Task 1
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

// ============================================================
// Task 1: InspectionStatus Constants
// Requirements: 2.1
// ============================================================

/** Inspection status constants */
export const INSPECTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

/** Valid inspection status values */
export type InspectionStatus = (typeof INSPECTION_STATUS)[keyof typeof INSPECTION_STATUS];

// ============================================================
// Task 1: InspectionAutoExecutionFlag Constants
// Requirements: 2.3
// ============================================================

/** Inspection auto execution flag constants */
export const INSPECTION_AUTO_EXECUTION_FLAG = {
  RUN: 'run',
  PAUSE: 'pause',
  SKIP: 'skip',
} as const;

/** Valid inspection auto execution flag values */
export type InspectionAutoExecutionFlag =
  (typeof INSPECTION_AUTO_EXECUTION_FLAG)[keyof typeof INSPECTION_AUTO_EXECUTION_FLAG];

// ============================================================
// Task 1: InspectionProgressIndicatorState Constants
// Requirements: 2.4
// ============================================================

/** Inspection progress indicator state constants */
export const INSPECTION_PROGRESS_INDICATOR_STATE = {
  CHECKED: 'checked',
  UNCHECKED: 'unchecked',
  EXECUTING: 'executing',
  SKIP_SCHEDULED: 'skip-scheduled',
} as const;

/** Valid inspection progress indicator state values */
export type InspectionProgressIndicatorState =
  (typeof INSPECTION_PROGRESS_INDICATOR_STATE)[keyof typeof INSPECTION_PROGRESS_INDICATOR_STATE];

// ============================================================
// Task 1: InspectionRoundDetail Type
// Requirements: 2.2
// ============================================================

/** Details of a single inspection round */
export interface InspectionRoundDetail {
  /** Round number (1-indexed) */
  roundNumber: number;
  /** GO/NOGO result (true=GO, false=NOGO) */
  passed: boolean;
  /** Fix applied flag (NOGO cases only) */
  fixApplied?: boolean;
  /** Inspection completion timestamp */
  completedAt?: string;
}

/**
 * Type guard to check if an object is a valid InspectionRoundDetail
 */
export function isInspectionRoundDetail(value: unknown): value is InspectionRoundDetail {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check required fields
  if (typeof obj.roundNumber !== 'number') {
    return false;
  }

  if (typeof obj.passed !== 'boolean') {
    return false;
  }

  return true;
}

// ============================================================
// Task 1: MultiRoundInspectionState Type (New Structure)
// Requirements: 2.1, 2.2
// ============================================================

/**
 * Multi-round inspection state stored in spec.json (new structure)
 * Note: This is separate from the legacy InspectionState (passed, inspected_at, report_file)
 * defined in index.ts. The legacy structure is maintained for backward compatibility.
 */
export interface MultiRoundInspectionState {
  /** Status: pending/in_progress/completed */
  status: InspectionStatus;
  /** Number of completed rounds */
  rounds: number;
  /** Current round number during execution (null when not executing) */
  currentRound: number | null;
  /** Round details array */
  roundDetails: InspectionRoundDetail[];
}

/**
 * Type guard to check if an object is a valid MultiRoundInspectionState
 */
export function isMultiRoundInspectionState(value: unknown): value is MultiRoundInspectionState {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check required fields
  if (typeof obj.status !== 'string') {
    return false;
  }

  // Validate status value
  const validStatuses = Object.values(INSPECTION_STATUS);
  if (!validStatuses.includes(obj.status as InspectionStatus)) {
    return false;
  }

  if (typeof obj.rounds !== 'number') {
    return false;
  }

  if (!Array.isArray(obj.roundDetails)) {
    return false;
  }

  // Validate each round detail
  for (const detail of obj.roundDetails) {
    if (!isInspectionRoundDetail(detail)) {
      return false;
    }
  }

  return true;
}

/**
 * Create initial multi-round inspection state
 * Requirements: 2.1
 */
export function createInitialMultiRoundInspectionState(): MultiRoundInspectionState {
  return {
    status: 'pending',
    rounds: 0,
    currentRound: null,
    roundDetails: [],
  };
}

// ============================================================
// Task 1: Helper Functions
// Requirements: 2.1, 2.2
// ============================================================

/**
 * Get the latest round detail from inspection state
 * @param state Multi-round inspection state or null/undefined
 * @returns Latest round detail or null if no rounds exist
 */
export function getLatestRoundDetail(
  state: MultiRoundInspectionState | null | undefined
): InspectionRoundDetail | null {
  if (!state || !state.roundDetails || state.roundDetails.length === 0) {
    return null;
  }
  return state.roundDetails[state.roundDetails.length - 1];
}

/**
 * Calculate the progress indicator state based on inspection state and execution flags
 * Requirements: 7.1, 7.2, 7.3, 7.4
 *
 * Priority order:
 * 1. skip-scheduled: when autoExecutionFlag is 'skip'
 * 2. executing: when isExecuting is true OR status is 'in_progress'
 * 3. checked: when rounds >= 1
 * 4. unchecked: otherwise
 */
export function getInspectionProgressIndicatorState(
  state: MultiRoundInspectionState | null | undefined,
  isExecuting: boolean,
  autoExecutionFlag: InspectionAutoExecutionFlag
): InspectionProgressIndicatorState {
  // Priority 1: skip-scheduled
  if (autoExecutionFlag === 'skip') {
    return 'skip-scheduled';
  }

  // Priority 2: executing
  if (isExecuting || (state?.status === 'in_progress')) {
    return 'executing';
  }

  // Priority 3: checked (1 or more rounds completed)
  if (state && state.rounds >= 1) {
    return 'checked';
  }

  // Priority 4: unchecked (default)
  return 'unchecked';
}
