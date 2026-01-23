/**
 * Metrics Types
 * Type definitions and Zod schemas for metrics records
 * Task 1.1: Metrics record schema and types
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */

import { z } from 'zod';

// =============================================================================
// Workflow Phase Type
// =============================================================================

/**
 * Workflow phases that can be measured
 * Requirements: 1.3
 */
export const WorkflowPhaseSchema = z.enum(['requirements', 'design', 'tasks', 'impl']);
export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>;

// =============================================================================
// AI Metric Record
// Requirements: 4.3 - AI execution time record format
// =============================================================================

/**
 * AI execution time metric record
 * Format: {"type":"ai","spec":"...","phase":"...","start":"...","end":"...","ms":...}
 */
export const AiMetricRecordSchema = z.object({
  /** Record type discriminator */
  type: z.literal('ai'),
  /** Spec identifier */
  spec: z.string().min(1),
  /** Workflow phase */
  phase: WorkflowPhaseSchema,
  /** Start timestamp in ISO8601 format (Requirement 4.5) */
  start: z.string(),
  /** End timestamp in ISO8601 format (Requirement 4.5) */
  end: z.string(),
  /** Duration in milliseconds (Requirement 4.6) */
  ms: z.number().int().nonnegative(),
});

export type AiMetricRecord = z.infer<typeof AiMetricRecordSchema>;

// =============================================================================
// Human Metric Record
// Requirements: 4.4 - Human consumption time record format
// =============================================================================

/**
 * Human consumption time metric record
 * Format: {"type":"human","spec":"...","start":"...","end":"...","ms":...}
 */
export const HumanMetricRecordSchema = z.object({
  /** Record type discriminator */
  type: z.literal('human'),
  /** Spec identifier */
  spec: z.string().min(1),
  /** Start timestamp in ISO8601 format (Requirement 4.5) */
  start: z.string(),
  /** End timestamp in ISO8601 format (Requirement 4.5) */
  end: z.string(),
  /** Duration in milliseconds (Requirement 4.6) */
  ms: z.number().int().nonnegative(),
});

export type HumanMetricRecord = z.infer<typeof HumanMetricRecordSchema>;

// =============================================================================
// Lifecycle Metric Record
// Requirements: 3.1, 3.2, 3.3 - Total elapsed time tracking
// =============================================================================

/**
 * Spec lifecycle event record
 * Format: {"type":"lifecycle","spec":"...","event":"start"|"complete","timestamp":"...","totalMs":...}
 */
export const LifecycleMetricRecordSchema = z.object({
  /** Record type discriminator */
  type: z.literal('lifecycle'),
  /** Spec identifier */
  spec: z.string().min(1),
  /** Lifecycle event type */
  event: z.enum(['start', 'complete']),
  /** Event timestamp in ISO8601 format (Requirement 4.5) */
  timestamp: z.string(),
  /** Total elapsed time in milliseconds (only for complete event) */
  totalMs: z.number().int().nonnegative().optional(),
});

export type LifecycleMetricRecord = z.infer<typeof LifecycleMetricRecordSchema>;

// =============================================================================
// Union Type
// Requirements: 4.1 - SSOT for metrics.jsonl
// =============================================================================

/**
 * Union schema for all metric record types
 * Used for parsing JSONL entries from metrics.jsonl
 */
export const MetricRecordSchema = z.discriminatedUnion('type', [
  AiMetricRecordSchema,
  HumanMetricRecordSchema,
  LifecycleMetricRecordSchema,
]);

export type MetricRecord = z.infer<typeof MetricRecordSchema>;

// =============================================================================
// Human Session Data (IPC payload)
// Requirements: 2.12
// =============================================================================

/**
 * Human session data for IPC transmission
 * Sent from Renderer to Main process when a human session ends
 */
export interface HumanSessionData {
  readonly specId: string;
  readonly start: string;  // ISO8601
  readonly end: string;    // ISO8601
  readonly ms: number;
}

// =============================================================================
// Session Temp Data (for recovery)
// Requirements: 7.1, 7.2, 7.3
// =============================================================================

/**
 * Active AI session data for recovery
 */
export interface ActiveAiSession {
  readonly specId: string;
  readonly phase: WorkflowPhase;
  readonly start: string;  // ISO8601
}

/**
 * Active human session data for recovery
 */
export interface ActiveHumanSession {
  readonly specId: string;
  readonly start: string;  // ISO8601
  readonly lastActivity: string;  // ISO8601
}

/**
 * Session temp file format for crash recovery
 * Stored in .kiro/.metrics-session.tmp
 */
export interface SessionTempData {
  readonly activeAiSessions: ActiveAiSession[];
  readonly activeHumanSession?: ActiveHumanSession;
}

// =============================================================================
// Aggregated Metrics Types
// Requirements: 5.1-5.6, 6.1-6.4
// =============================================================================

/**
 * Phase metrics status
 */
export type PhaseStatus = 'pending' | 'in-progress' | 'completed';

/**
 * Metrics for a single phase
 */
export interface PhaseMetrics {
  readonly aiTimeMs: number;
  readonly humanTimeMs: number;
  readonly status: PhaseStatus;
}

/**
 * Phase metrics map
 */
export type PhaseMetricsMap = Record<WorkflowPhase, PhaseMetrics>;

/**
 * Spec metrics status
 */
export type SpecMetricsStatus = 'in-progress' | 'completed';

/**
 * Aggregated metrics for a single spec
 */
export interface SpecMetrics {
  readonly specId: string;
  readonly totalAiTimeMs: number;
  readonly totalHumanTimeMs: number;
  readonly totalElapsedMs: number | null;  // null if lifecycle not complete
  readonly phaseMetrics: PhaseMetricsMap;
  readonly status: SpecMetricsStatus;
}

/**
 * Project-wide aggregated metrics (optional feature)
 * Requirements: 8.1, 8.2, 8.3
 */
export interface ProjectMetrics {
  readonly totalAiTimeMs: number;
  readonly totalHumanTimeMs: number;
  readonly completedSpecCount: number;
  readonly inProgressSpecCount: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Metrics file path relative to project root
 * Requirements: 4.1 - SSOT
 */
export const METRICS_FILE_PATH = '.kiro/metrics.jsonl';

/**
 * Session temp file path relative to project root
 * Requirements: 7.1
 */
export const SESSION_TEMP_FILE_PATH = '.kiro/.metrics-session.tmp';

/**
 * Idle timeout for human activity tracking in milliseconds
 * Requirements: 2.8, 2.9
 */
export const IDLE_TIMEOUT_MS = 45_000;  // 45 seconds
