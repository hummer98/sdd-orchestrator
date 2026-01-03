/**
 * Inspection Workflow Types
 * Type definitions for inspection workflow UI
 * Feature: inspection-workflow-ui Task 1
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * Bug fix: inspection-state-data-model - Simplified data structure
 */

// ============================================================
// InspectionAutoExecutionFlag Constants
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
// InspectionProgressIndicatorState Constants
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
// InspectionRound Type (New Simplified Structure)
// Bug fix: inspection-state-data-model
// ============================================================

/** Result of an inspection round */
export type InspectionResult = 'go' | 'nogo';

/**
 * Details of a single inspection round (new simplified structure)
 * Bug fix: inspection-state-data-model
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
 * Type guard to check if an object is a valid InspectionRound
 */
export function isInspectionRound(value: unknown): value is InspectionRound {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.number !== 'number') {
    return false;
  }

  if (obj.result !== 'go' && obj.result !== 'nogo') {
    return false;
  }

  if (typeof obj.inspectedAt !== 'string') {
    return false;
  }

  // fixedAt is optional but must be string if present
  if (obj.fixedAt !== undefined && typeof obj.fixedAt !== 'string') {
    return false;
  }

  return true;
}

// ============================================================
// InspectionState Type (New Simplified Structure)
// Bug fix: inspection-state-data-model
// ============================================================

/**
 * Inspection state stored in spec.json (new simplified structure)
 * Bug fix: inspection-state-data-model
 *
 * Removed fields (now managed by AgentStore or computed):
 * - status: Execution state managed by AgentStore
 * - currentRound: Execution state managed by AgentStore
 * - rounds: Computed from rounds.length
 */
export interface InspectionState {
  /** Completed inspection rounds */
  rounds: InspectionRound[];
}

/**
 * Type guard to check if an object is a valid InspectionState
 */
export function isInspectionState(value: unknown): value is InspectionState {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.rounds)) {
    return false;
  }

  for (const round of obj.rounds) {
    if (!isInspectionRound(round)) {
      return false;
    }
  }

  return true;
}

/**
 * Create initial inspection state
 */
export function createInitialInspectionState(): InspectionState {
  return {
    rounds: [],
  };
}

// ============================================================
// Legacy Types (for backward compatibility)
// ============================================================

/** @deprecated Use InspectionRound instead */
export interface InspectionRoundDetail {
  roundNumber: number;
  passed: boolean;
  fixApplied?: boolean;
  completedAt?: string;
}

/** @deprecated Use InspectionState instead */
export interface MultiRoundInspectionState {
  status: 'pending' | 'in_progress' | 'completed';
  rounds: number;
  currentRound: number | null;
  roundDetails: InspectionRoundDetail[];
}

/** @deprecated Legacy inspection state from older spec.json files */
export interface LegacyInspectionState {
  status: string;
  date?: string;
  report?: string;
}

// Legacy status constants (deprecated but kept for compatibility)
/** @deprecated No longer used - execution state managed by AgentStore */
export const INSPECTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

/** @deprecated No longer used */
export type InspectionStatus = (typeof INSPECTION_STATUS)[keyof typeof INSPECTION_STATUS];

// ============================================================
// Backward Compatibility Functions
// ============================================================

/**
 * Check if value is legacy InspectionRoundDetail format
 */
function isLegacyRoundDetail(value: unknown): value is InspectionRoundDetail {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.roundNumber === 'number' && typeof obj.passed === 'boolean';
}

/**
 * Check if value is legacy MultiRoundInspectionState format
 */
function isLegacyMultiRoundState(value: unknown): value is MultiRoundInspectionState {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return 'roundDetails' in obj && Array.isArray(obj.roundDetails);
}

/**
 * Check if value is very old legacy format (status/date/report)
 */
function isVeryOldLegacyState(value: unknown): value is LegacyInspectionState {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.status === 'string' && !('rounds' in obj) && !('roundDetails' in obj);
}

/**
 * Convert legacy InspectionRoundDetail to new InspectionRound format
 */
function convertLegacyRoundDetail(detail: InspectionRoundDetail): InspectionRound {
  return {
    number: detail.roundNumber,
    result: detail.passed ? 'go' : 'nogo',
    inspectedAt: detail.completedAt || new Date().toISOString(),
    ...(detail.fixApplied ? { fixedAt: detail.completedAt || new Date().toISOString() } : {}),
  };
}

/**
 * Convert legacy MultiRoundInspectionState to new InspectionState format
 */
function convertLegacyMultiRoundState(legacy: MultiRoundInspectionState): InspectionState {
  return {
    rounds: legacy.roundDetails.map(convertLegacyRoundDetail),
  };
}

/**
 * Convert very old legacy format to new InspectionState format
 */
function convertVeryOldLegacyState(legacy: LegacyInspectionState): InspectionState {
  if (!legacy.report) {
    return { rounds: [] };
  }

  const reportMatch = legacy.report.match(/inspection-(\d+)\.md/);
  const roundNumber = reportMatch ? parseInt(reportMatch[1], 10) : 1;
  const passed = legacy.status === 'passed';

  return {
    rounds: [{
      number: roundNumber,
      result: passed ? 'go' : 'nogo',
      inspectedAt: legacy.date || new Date().toISOString(),
    }],
  };
}

/**
 * Normalize any inspection state format to new InspectionState
 * Supports: new format, legacy MultiRoundInspectionState, very old legacy format
 *
 * @param state Any inspection state format or null/undefined
 * @returns Normalized InspectionState or null
 */
export function normalizeInspectionState(
  state: InspectionState | MultiRoundInspectionState | LegacyInspectionState | null | undefined
): InspectionState | null {
  if (!state) {
    return null;
  }

  // Already in new format
  if (isInspectionState(state)) {
    return state;
  }

  // Legacy MultiRoundInspectionState format
  if (isLegacyMultiRoundState(state)) {
    return convertLegacyMultiRoundState(state);
  }

  // Very old legacy format
  if (isVeryOldLegacyState(state)) {
    return convertVeryOldLegacyState(state);
  }

  return null;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the latest round from inspection state
 * @param state Inspection state or null/undefined
 * @returns Latest round or null if no rounds exist
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
 * Check if inspection can proceed to next round
 * Returns true if: no rounds yet, latest is GO, or latest is NOGO with fix applied
 */
export function canStartNextInspection(state: InspectionState | null | undefined): boolean {
  const latest = getLatestRound(state);
  if (!latest) {
    return true; // No rounds yet
  }
  if (latest.result === 'go') {
    return true; // Last inspection passed
  }
  // NOGO case: can start next only if fix was applied
  return !!latest.fixedAt;
}

/**
 * Check if fix is required for the latest round
 * Returns true if latest is NOGO and no fix applied yet
 */
export function needsFix(state: InspectionState | null | undefined): boolean {
  const latest = getLatestRound(state);
  if (!latest) {
    return false;
  }
  return latest.result === 'nogo' && !latest.fixedAt;
}

/**
 * Check if inspection has passed (latest round is GO)
 */
export function hasPassed(state: InspectionState | null | undefined): boolean {
  const latest = getLatestRound(state);
  return latest?.result === 'go';
}

/**
 * Get the number of completed inspection rounds
 */
export function getRoundCount(state: InspectionState | null | undefined): number {
  return state?.rounds?.length ?? 0;
}

/**
 * Calculate the progress indicator state based on inspection state and execution flags
 * Requirements: 7.1, 7.2, 7.3, 7.4
 *
 * Priority order:
 * 1. skip-scheduled: when autoExecutionFlag is 'skip'
 * 2. executing: when isExecuting is true
 * 3. checked: when at least 1 round completed
 * 4. unchecked: otherwise
 */
export function getInspectionProgressIndicatorState(
  state: InspectionState | null | undefined,
  isExecuting: boolean,
  autoExecutionFlag: InspectionAutoExecutionFlag
): InspectionProgressIndicatorState {
  // Priority 1: skip-scheduled
  if (autoExecutionFlag === 'skip') {
    return 'skip-scheduled';
  }

  // Priority 2: executing
  if (isExecuting) {
    return 'executing';
  }

  // Priority 3: checked (1 or more rounds completed)
  if (getRoundCount(state) >= 1) {
    return 'checked';
  }

  // Priority 4: unchecked (default)
  return 'unchecked';
}

/**
 * Get the latest inspection report file name from inspection state
 * Report files follow the pattern: inspection-{number}.md
 *
 * @param state Inspection state or null/undefined
 * @returns Latest report file name (e.g., "inspection-1.md") or null if no rounds exist
 */
export function getLatestInspectionReportFile(
  state: InspectionState | null | undefined
): string | null {
  const latest = getLatestRound(state);
  if (!latest) {
    return null;
  }
  return `inspection-${latest.number}.md`;
}

// ============================================================
// Deprecated exports for backward compatibility
// ============================================================

/** @deprecated Use getLatestRound instead */
export function getLatestRoundDetail(
  state: MultiRoundInspectionState | null | undefined
): InspectionRoundDetail | null {
  if (!state || !state.roundDetails || state.roundDetails.length === 0) {
    return null;
  }
  return state.roundDetails[state.roundDetails.length - 1];
}

/** @deprecated Use isInspectionRound instead */
export function isInspectionRoundDetail(value: unknown): value is InspectionRoundDetail {
  return isLegacyRoundDetail(value);
}

/** @deprecated Use isInspectionState instead */
export function isMultiRoundInspectionState(value: unknown): value is MultiRoundInspectionState {
  return isLegacyMultiRoundState(value);
}

/** @deprecated Use isVeryOldLegacyState instead */
export function isLegacyInspectionState(value: unknown): value is LegacyInspectionState {
  return isVeryOldLegacyState(value);
}

/** @deprecated Use createInitialInspectionState instead */
export function createInitialMultiRoundInspectionState(): MultiRoundInspectionState {
  return {
    status: 'pending',
    rounds: 0,
    currentRound: null,
    roundDetails: [],
  };
}

/** @deprecated No longer needed - use normalizeInspectionState directly */
export function convertLegacyToMultiRound(legacy: LegacyInspectionState): MultiRoundInspectionState {
  const newState = convertVeryOldLegacyState(legacy);
  return {
    status: 'completed',
    rounds: newState.rounds.length,
    currentRound: null,
    roundDetails: newState.rounds.map(r => ({
      roundNumber: r.number,
      passed: r.result === 'go',
      completedAt: r.inspectedAt,
      ...(r.fixedAt ? { fixApplied: true } : {}),
    })),
  };
}
