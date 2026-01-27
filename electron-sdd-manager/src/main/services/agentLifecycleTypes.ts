/**
 * Type definitions for Agent Lifecycle Management
 * Requirements: 2.1, 4.1, 8.1, 8.2
 */

/**
 * Agent state machine states
 * Requirement: 2.1
 */
export type AgentState =
  | 'spawning'
  | 'running'
  | 'timed_out'
  | 'stopping'
  | 'killing'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'interrupted'
  | 'terminal';

/**
 * Exit reasons for agent termination
 * Requirement: 8.1
 */
export type ExitReason =
  // Normal
  | 'completed' // exit code 0
  | 'stopped_by_user' // user requested stop
  // Abnormal (while app running)
  | 'failed' // exit code != 0
  | 'timed_out' // timeout exceeded
  | 'crashed' // unexpected termination
  // Abnormal (while app closed)
  | 'exited_while_app_closed' // process ended during app shutdown
  | 'pid_reused' // PID was reused by different process
  // Special
  | 'orphaned' // detected by watchdog
  | 'unknown'; // cannot determine

/**
 * Reasons for stopping an agent
 * Requirement: 1.5
 */
export type StopReason = 'user_request' | 'timeout' | 'phase_complete' | 'error';
