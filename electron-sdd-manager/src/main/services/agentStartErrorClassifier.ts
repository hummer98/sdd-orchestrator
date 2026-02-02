/**
 * Agent Start Error Classifier Service
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5 (Error classification)
 *
 * agent-error-notification feature
 * Classifies agent startup errors for user-friendly notification.
 */

import type { AgentStartError } from '../../shared/types/agentStartError';

/**
 * Classify a spawn error into an AgentStartError
 *
 * @param error - Node.js ErrnoException from spawn
 * @param command - The command that was executed
 * @returns Classified AgentStartError
 */
export function classifySpawnError(error: NodeJS.ErrnoException, command: string): AgentStartError {
  // Requirement 2.1: ENOENT -> COMMAND_NOT_FOUND
  if (error.code === 'ENOENT') {
    return {
      type: 'COMMAND_NOT_FOUND',
      message: `Command not found: ${command} (ENOENT)`,
      details: {
        command,
      },
    };
  }

  // Other spawn errors -> SPAWN_ERROR
  return {
    type: 'SPAWN_ERROR',
    message: error.message,
    details: {
      command,
    },
  };
}

/**
 * Classify an immediate exit error based on stderr content
 *
 * @param exitCode - Process exit code
 * @param stderr - Standard error output
 * @param command - The command that was executed
 * @returns Classified AgentStartError
 */
export function classifyExitError(exitCode: number, stderr: string, command: string): AgentStartError {
  const stderrLower = stderr.toLowerCase();

  // Requirement 2.3: "not logged in" -> AUTH_REQUIRED
  if (stderrLower.includes('not logged in')) {
    return {
      type: 'AUTH_REQUIRED',
      message: 'Claude CLI authentication required',
      details: {
        exitCode,
        stderr,
        command,
      },
    };
  }

  // Requirement 2.4: "API key" -> API_KEY_MISSING
  if (stderrLower.includes('api key') || stderrLower.includes('api_key') || stderrLower.includes('anthropic_api_key')) {
    return {
      type: 'API_KEY_MISSING',
      message: 'API key not configured',
      details: {
        exitCode,
        stderr,
        command,
      },
    };
  }

  // Requirement 2.5: Unclassified -> UNKNOWN_ERROR
  return {
    type: 'UNKNOWN_ERROR',
    message: stderr || `Agent exited with code ${exitCode}`,
    details: {
      exitCode,
      stderr,
      command,
    },
  };
}
