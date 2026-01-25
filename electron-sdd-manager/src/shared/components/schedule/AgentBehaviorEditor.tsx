/**
 * AgentBehaviorEditor Component
 * Editor for configuring behavior when other agents are running
 *
 * Task 6.6: 他Agent動作中の挙動設定UIを作成
 * - 待機/スキップの選択
 *
 * Requirements: 2.2
 */

import { useCallback } from 'react';
import { clsx } from 'clsx';
import type { AgentBehavior } from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface AgentBehaviorEditorProps {
  /** Current behavior value */
  value: AgentBehavior;
  /** Called when the behavior changes */
  onChange: (behavior: AgentBehavior) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Agent behavior options with labels
 * Requirements: 2.2 - 他Agent動作中の挙動設定 (待機/スキップの選択)
 */
const AGENT_BEHAVIORS: { value: AgentBehavior; label: string }[] = [
  { value: 'wait', label: '待機してから実行' },
  { value: 'skip', label: 'スキップ' },
];

// =============================================================================
// AgentBehaviorEditor Component
// =============================================================================

/**
 * AgentBehaviorEditor - Editor for configuring behavior when other agents are running
 *
 * Allows users to select whether to wait for other agents to complete or skip
 * execution when other agents are running.
 *
 * @example
 * <AgentBehaviorEditor
 *   value="wait"
 *   onChange={(behavior) => setBehavior(behavior)}
 * />
 */
export function AgentBehaviorEditor({
  value,
  onChange,
  disabled = false,
  className,
}: AgentBehaviorEditorProps) {
  // Handle behavior radio change
  const handleBehaviorChange = useCallback(
    (behavior: AgentBehavior) => {
      if (disabled) return;
      onChange(behavior);
    },
    [onChange, disabled]
  );

  return (
    <div
      data-testid="agent-behavior-editor"
      className={clsx('space-y-2', className)}
    >
      {/* Section Header */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        他Agent動作中の挙動
      </label>

      {/* Behavior Selection */}
      <div className="space-y-2">
        {AGENT_BEHAVIORS.map(({ value: behaviorValue, label }) => (
          <label
            key={behaviorValue}
            className={clsx(
              'flex items-center gap-3 cursor-pointer',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <input
              type="radio"
              name="agent-behavior"
              data-testid={`agent-behavior-${behaviorValue}`}
              checked={value === behaviorValue}
              onChange={() => handleBehaviorChange(behaviorValue)}
              disabled={disabled}
              className={clsx(
                'w-4 h-4 border-gray-300 text-blue-600',
                'focus:ring-blue-500 focus:ring-offset-0',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default AgentBehaviorEditor;
