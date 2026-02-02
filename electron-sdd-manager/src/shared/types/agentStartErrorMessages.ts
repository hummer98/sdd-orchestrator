/**
 * Agent Start Error Messages
 * Requirements: 3.4 (Japanese localized error messages)
 *
 * agent-error-notification feature
 * Provides Japanese localized messages for agent startup errors.
 */

import type { AgentStartError, AgentStartErrorType } from './agentStartError';

/**
 * Japanese error messages for each error type
 * Requirements: 3.4
 */
export const AGENT_START_ERROR_MESSAGES: Record<AgentStartErrorType, string> = {
  COMMAND_NOT_FOUND: 'claudeコマンドが見つかりません。インストールを確認してください',
  AUTH_REQUIRED: 'Claude CLIの認証が必要です。`claude login`を実行してください',
  API_KEY_MISSING: 'APIキーが設定されていません',
  SPAWN_ERROR: 'プロセスの起動に失敗しました',
  UNKNOWN_ERROR: 'エージェントの起動に失敗しました',
};

/**
 * Get the Japanese localized message for an agent start error
 *
 * For SPAWN_ERROR and UNKNOWN_ERROR, the error message is appended
 * to provide more context to the user.
 *
 * @param error - The agent start error object
 * @returns Japanese localized error message
 */
export function getAgentStartErrorMessage(error: AgentStartError): string {
  const baseMessage = AGENT_START_ERROR_MESSAGES[error.type];

  // For SPAWN_ERROR and UNKNOWN_ERROR, append the error message if available
  if ((error.type === 'SPAWN_ERROR' || error.type === 'UNKNOWN_ERROR') && error.message) {
    return `${baseMessage}: ${error.message}`;
  }

  return baseMessage;
}
