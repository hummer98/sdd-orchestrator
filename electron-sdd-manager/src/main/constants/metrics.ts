/**
 * Metrics Constants
 * Move to leaf module to avoid circular dependencies
 */

/**
 * Metrics file path relative to project root
 */
export const METRICS_FILE_PATH = '.kiro/metrics.jsonl';

/**
 * Session temp file path relative to project root
 */
export const SESSION_TEMP_FILE_PATH = '.kiro/.metrics-session.tmp';

/**
 * Idle timeout for human activity tracking in milliseconds
 */
export const IDLE_TIMEOUT_MS = 45_000;  // 45 seconds
