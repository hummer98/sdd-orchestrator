/**
 * AgentLogActionArea Component
 *
 * mobile-agent-log-fullscreen: Task 2.1
 * Extracted action area with input field, send button, and continue button.
 * Used by AgentLogPage for the bottom fixed action area.
 *
 * Requirements:
 * - 4.1: アクションエリア固定表示
 * - 4.2: 追加指示入力フィールド
 * - 4.3: 送信ボタン
 * - 4.4: 続行ボタン
 * - 4.5: 実行中の無効化
 * - 4.6: sessionId無しの無効化
 *
 * Design: AgentLogActionArea component in design.md
 */

import React, { useState, useCallback } from 'react';
import { Loader2, Send, Play } from 'lucide-react';
import { clsx } from 'clsx';
import type { AgentInfo, ApiClient } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AgentLogActionArea component
 * Matches design.md AgentLogActionAreaProps specification
 */
export interface AgentLogActionAreaProps {
  /** Target agent */
  agent: AgentInfo;
  /** API Client for sending instructions and resuming */
  apiClient: ApiClient;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AgentLogActionArea - Action area with instruction input and control buttons
 *
 * Features:
 * - Additional instruction input field (Req 4.2)
 * - Send button for submitting instructions (Req 4.3)
 * - Continue button for resuming agent (Req 4.4)
 * - Disabled state when agent is running or hanging (Req 4.5)
 * - Disabled state when sessionId is missing (Req 4.6)
 */
export function AgentLogActionArea({
  agent,
  apiClient,
  testId = 'agent-log-action-area',
}: AgentLogActionAreaProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** Instruction input value (Req 4.2) */
  const [instructionInput, setInstructionInput] = useState('');

  /** Whether send operation is in progress */
  const [isSending, setIsSending] = useState(false);

  /** Whether continue operation is in progress */
  const [isContinuing, setIsContinuing] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  /** Check if agent is running or hanging (Req 4.5) */
  const isRunning = agent.status === 'running' || agent.status === 'hang';

  /**
   * Check if agent can receive instructions
   * Agent must NOT be running and must have a sessionId (Req 4.5, 4.6)
   */
  const canInteract = !isRunning && Boolean(agent.sessionId);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle send instruction (Req 4.3)
   */
  const handleSendInstruction = useCallback(async () => {
    if (!instructionInput.trim() || !canInteract || isSending) return;

    setIsSending(true);
    try {
      await apiClient.sendAgentInput(agent.agentId, instructionInput.trim());
      setInstructionInput(''); // Clear input after successful send
    } finally {
      setIsSending(false);
    }
  }, [instructionInput, canInteract, isSending, apiClient, agent.agentId]);

  /**
   * Handle continue agent execution (Req 4.4)
   */
  const handleContinue = useCallback(async () => {
    if (!canInteract || isContinuing) return;

    setIsContinuing(true);
    try {
      await apiClient.resumeAgent(agent.agentId);
    } finally {
      setIsContinuing(false);
    }
  }, [canInteract, isContinuing, apiClient, agent.agentId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
      data-testid={testId}
    >
      {/* Instruction input and buttons */}
      <div className="flex items-center gap-2">
        {/* Additional instruction input (Req 4.2) */}
        <input
          type="text"
          value={instructionInput}
          onChange={(e) => setInstructionInput(e.target.value)}
          placeholder="追加の指示を入力..."
          disabled={!canInteract || isSending}
          className={clsx(
            'flex-1 px-3 py-2 text-sm rounded-md',
            'bg-white dark:bg-gray-900',
            'text-gray-900 dark:text-gray-100',
            'border border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:bg-gray-100 dark:disabled:bg-gray-800',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500'
          )}
          data-testid={`${testId}-input`}
        />

        {/* Send button (Req 4.3) */}
        <button
          type="button"
          onClick={handleSendInstruction}
          disabled={!canInteract || !instructionInput.trim() || isSending}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 rounded-md',
            'text-sm font-medium',
            'bg-blue-500 text-white hover:bg-blue-600',
            'disabled:bg-gray-300 dark:disabled:bg-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors'
          )}
          data-testid={`${testId}-send-button`}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="sr-only sm:not-sr-only">送信</span>
        </button>

        {/* Continue button (Req 4.4) */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canInteract || isContinuing}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 rounded-md',
            'text-sm font-medium',
            'bg-green-500 text-white hover:bg-green-600',
            'disabled:bg-gray-300 dark:disabled:bg-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors'
          )}
          title="続けて"
          data-testid={`${testId}-continue-button`}
        >
          {isContinuing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span className="sr-only sm:not-sr-only">続行</span>
        </button>
      </div>
    </div>
  );
}

export default AgentLogActionArea;
