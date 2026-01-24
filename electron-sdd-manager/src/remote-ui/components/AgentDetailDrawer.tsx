/**
 * AgentDetailDrawer Component
 *
 * Mobile-specific overlay drawer for displaying agent details and logs.
 * Slides up from the bottom of the screen.
 *
 * Task 3.1: AgentDetailDrawerコンポーネントを作成する
 * Task 3.2: AgentDetailDrawerのドラッグ高さ調整を実装する
 * Task 3.3: AgentDetailDrawerに追加指示入力とアクションボタンを実装する
 * Task 3.4: AgentDetailDrawerの閉じる操作を実装する
 * Requirements:
 * - 6.1: 下からスライドアップするオーバーレイDrawer
 * - 6.2: リアルタイムログ表示（AgentLogPanel使用）
 * - 6.3: ドラッグで高さ調整（最小25vh、最大90vh）
 * - 6.4: 追加指示入力フィールド
 * - 6.5: Sendボタン
 * - 6.6: Continueボタン
 * - 6.7: 外側タップ/下スワイプで閉じる
 * - 6.8: Desktop Webと内部レンダリング共有（AgentLogPanel使用）
 */

import React, { useState, useCallback, useRef } from 'react';
import { X, Loader2, Send, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { AgentLogPanel } from '@shared/components/agent';
import type { AgentInfo, LogEntry } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AgentDetailDrawer component
 * Design spec: design.md - AgentDetailDrawer section
 */
export interface AgentDetailDrawerProps {
  /** Agent to display */
  agent: AgentInfo;
  /** Log entries to display */
  logs: LogEntry[];
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer is closed */
  onClose: () => void;
  /** Callback to send additional instruction to agent */
  onSendInstruction: (instruction: string) => Promise<void>;
  /** Callback to continue agent execution */
  onContinue: () => Promise<void>;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Constants for height constraints (Task 3.2, Requirement 6.3)
// =============================================================================

/** Minimum drawer height in vh units */
const MIN_HEIGHT_VH = 25;

/** Maximum drawer height in vh units */
const MAX_HEIGHT_VH = 90;

/** Default drawer height in vh units */
const DEFAULT_HEIGHT_VH = 50;

// =============================================================================
// Constants for swipe-to-close (Task 3.4, Requirement 6.7)
// =============================================================================

/**
 * Swipe threshold in vh units to trigger close.
 * If user drags down more than this amount from initial height, drawer closes.
 */
const SWIPE_CLOSE_THRESHOLD_VH = 20;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get status display configuration
 */
function getStatusConfig(status: AgentInfo['status']): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'running':
      return {
        label: 'Running',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      };
    case 'interrupted':
      return {
        label: 'Interrupted',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      };
    case 'hang':
      return {
        label: 'Hang',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      };
    case 'failed':
      return {
        label: 'Failed',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
      };
    default:
      return {
        label: status,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      };
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * AgentDetailDrawer - Mobile overlay drawer for agent details
 *
 * Features:
 * - Slides up from bottom (requirement 6.1)
 * - Displays real-time logs via AgentLogPanel (requirement 6.2)
 * - Drag height adjustment with touch events (requirement 6.3)
 * - Shares rendering with Desktop Web (requirement 6.8)
 */
export function AgentDetailDrawer({
  agent,
  logs,
  isOpen,
  onClose,
  onSendInstruction,
  onContinue,
  testId = 'agent-detail-drawer',
}: AgentDetailDrawerProps): React.ReactElement | null {
  const statusConfig = getStatusConfig(agent.status);
  const isRunning = agent.status === 'running' || agent.status === 'hang';

  // ==========================================================================
  // Task 3.2: Drag height adjustment state (Requirement 6.3)
  // ==========================================================================

  /** Current drawer height in vh units */
  const [drawerHeight, setDrawerHeight] = useState(DEFAULT_HEIGHT_VH);

  /** Whether user is currently dragging the handle */
  const [isDragging, setIsDragging] = useState(false);

  /** Reference to track drag start Y position */
  const dragStartYRef = useRef<number | null>(null);

  /** Reference to track height at drag start */
  const dragStartHeightRef = useRef<number>(DEFAULT_HEIGHT_VH);

  /**
   * Clamp height value between MIN and MAX constraints
   */
  const clampHeight = useCallback((height: number): number => {
    return Math.min(MAX_HEIGHT_VH, Math.max(MIN_HEIGHT_VH, height));
  }, []);

  /**
   * Handle touch start on drag handle
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    dragStartYRef.current = touch.clientY;
    dragStartHeightRef.current = drawerHeight;
    setIsDragging(true);
  }, [drawerHeight]);

  /**
   * Handle touch move for drag tracking
   * Calculates delta from start and updates height
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || dragStartYRef.current === null) return;
    if (e.touches.length !== 1) return;

    // Prevent scrolling while dragging
    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = dragStartYRef.current - touch.clientY;

    // Convert pixel delta to vh units
    const deltaVh = (deltaY / window.innerHeight) * 100;

    // Calculate new height and clamp to constraints
    const newHeight = clampHeight(dragStartHeightRef.current + deltaVh);
    setDrawerHeight(newHeight);
  }, [isDragging, clampHeight]);

  /**
   * Handle touch end to finish dragging
   * Task 3.4: Implements swipe-to-close when user swipes down significantly
   */
  const handleTouchEnd = useCallback(() => {
    // Task 3.4: Check if user swiped down past threshold to close
    // Calculate how much the height decreased from the initial height
    const heightDecrease = dragStartHeightRef.current - drawerHeight;

    if (heightDecrease >= SWIPE_CLOSE_THRESHOLD_VH) {
      // User swiped down significantly - close the drawer
      setDrawerHeight(DEFAULT_HEIGHT_VH); // Reset height for next open
      onClose();
    }

    setIsDragging(false);
    dragStartYRef.current = null;
  }, [drawerHeight, onClose]);

  // ==========================================================================
  // Task 3.3: Additional instruction input and action buttons
  // Requirements: 6.4, 6.5, 6.6
  // ==========================================================================

  /** Instruction input value (Requirement 6.4) */
  const [instructionInput, setInstructionInput] = useState('');

  /** Whether send operation is in progress (Requirement 6.5) */
  const [isSending, setIsSending] = useState(false);

  /** Whether continue operation is in progress (Requirement 6.6) */
  const [isContinuing, setIsContinuing] = useState(false);

  /**
   * Check if agent can receive instructions
   * Agent must NOT be running and must have a sessionId
   */
  const canInteract = !isRunning && Boolean(agent.sessionId);

  /**
   * Handle send instruction (Requirement 6.5)
   */
  const handleSendInstruction = useCallback(async () => {
    if (!instructionInput.trim() || !canInteract || isSending) return;

    setIsSending(true);
    try {
      await onSendInstruction(instructionInput.trim());
      setInstructionInput(''); // Clear input after successful send
    } finally {
      setIsSending(false);
    }
  }, [instructionInput, canInteract, isSending, onSendInstruction]);

  /**
   * Handle continue agent execution (Requirement 6.6)
   */
  const handleContinue = useCallback(async () => {
    if (!canInteract || isContinuing) return;

    setIsContinuing(true);
    try {
      await onContinue();
    } finally {
      setIsContinuing(false);
    }
  }, [canInteract, isContinuing, onContinue]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={clsx(
          'fixed inset-0 z-40',
          'bg-black bg-opacity-50',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
        data-testid={`${testId}-backdrop`}
      />

      {/* Drawer container */}
      <div
        className={clsx(
          'fixed left-0 right-0 bottom-0 z-50',
          'bg-white dark:bg-gray-900',
          'rounded-t-2xl shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          'flex flex-col'
        )}
        style={{ height: `${drawerHeight}vh` }}
        data-testid={testId}
      >
        {/* Drag handle area - touch-none prevents scroll interference (Task 3.2) */}
        <div
          className={clsx(
            'flex justify-center py-2 cursor-grab touch-none',
            isDragging && 'cursor-grabbing'
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          data-testid={`${testId}-drag-handle`}
        >
          <div
            className={clsx(
              'w-12 h-1 rounded-full transition-colors',
              isDragging
                ? 'bg-blue-500 dark:bg-blue-400'
                : 'bg-gray-300 dark:bg-gray-600'
            )}
            data-dragging={isDragging || undefined}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Agent phase/name */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                Agent: {agent.phase}
              </span>
              {agent.id && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                  ({agent.id})
                </span>
              )}
            </div>

            {/* Status badge */}
            <div
              className={clsx(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                statusConfig.bgColor,
                statusConfig.color
              )}
            >
              {isRunning && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              <span>{statusConfig.label}</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className={clsx(
              'p-2 rounded-full',
              'text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
            aria-label="Close drawer"
            data-testid={`${testId}-close`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log panel container */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AgentLogPanel
            agent={{
              agentId: agent.id,
              sessionId: agent.sessionId,
              phase: agent.phase,
              status: agent.status,
              command: agent.command,
            }}
            logs={logs}
            showSessionId={false}
            noAgentMessage="Agentが選択されていません"
            emptyLogsMessage="ログがありません"
            testId={`${testId}-log-panel`}
          />
        </div>

        {/* Action area - Task 3.3 (Requirements 6.4, 6.5, 6.6) */}
        <div
          className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          data-testid={`${testId}-action-area`}
        >
          {/* Instruction input and buttons */}
          <div className="flex items-center gap-2">
            {/* Additional instruction input (Requirement 6.4) */}
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
              data-testid={`${testId}-instruction-input`}
            />

            {/* Send button (Requirement 6.5) */}
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

            {/* Continue button (Requirement 6.6) */}
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
      </div>
    </>
  );
}

export default AgentDetailDrawer;
