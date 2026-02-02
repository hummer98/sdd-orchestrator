/**
 * Agent Start Error Types
 * Requirements: 2.6 (AgentStartError type definition)
 *
 * agent-error-notification feature
 * Defines types for agent startup error classification and notification.
 */

/**
 * Agent startup error types
 * - COMMAND_NOT_FOUND: claude command not found (ENOENT)
 * - AUTH_REQUIRED: Claude CLI authentication required
 * - API_KEY_MISSING: API key not configured
 * - SPAWN_ERROR: Process spawn failed (non-ENOENT errors)
 * - UNKNOWN_ERROR: Unclassified errors
 */
export type AgentStartErrorType =
  | 'COMMAND_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'API_KEY_MISSING'
  | 'SPAWN_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Agent startup error details
 * Optional additional context for debugging
 */
export interface AgentStartErrorDetails {
  /** Process exit code (if available) */
  exitCode?: number;
  /** Standard error output (if available) */
  stderr?: string;
  /** Command that was executed */
  command?: string;
}

/**
 * Agent startup error information
 * Used for error classification, logging, and user notification
 */
export interface AgentStartError {
  /** Error type classification */
  type: AgentStartErrorType;
  /** Human-readable error message (English) */
  message: string;
  /** Optional additional details for debugging */
  details?: AgentStartErrorDetails;
}
