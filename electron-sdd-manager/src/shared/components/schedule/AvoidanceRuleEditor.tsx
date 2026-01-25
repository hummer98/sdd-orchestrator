/**
 * AvoidanceRuleEditor Component
 * Editor for configuring avoidance rules in schedule tasks
 *
 * Task 6.4: AvoidanceRuleEditorを作成
 * - 回避対象の選択（spec-merge, commit, bug-merge, schedule-task）
 * - 回避時挙動の選択（待機/スキップ）
 *
 * Requirements: 6.1, 6.2
 */

import { useCallback } from 'react';
import { clsx } from 'clsx';
import type { AvoidanceRule, AvoidanceTarget, AvoidanceBehavior } from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface AvoidanceRuleEditorProps {
  /** Current avoidance rule value */
  value: AvoidanceRule;
  /** Called when the rule changes */
  onChange: (rule: AvoidanceRule) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Avoidance target options with labels
 * Requirements: 6.1 - 回避対象の選択
 */
const AVOIDANCE_TARGETS: { value: AvoidanceTarget; label: string }[] = [
  { value: 'spec-merge', label: 'Specマージ' },
  { value: 'commit', label: 'コミット' },
  { value: 'bug-merge', label: 'Bugマージ' },
  { value: 'schedule-task', label: '他のスケジュールタスク' },
];

/**
 * Avoidance behavior options with labels
 * Requirements: 6.2 - 回避時挙動の選択
 */
const AVOIDANCE_BEHAVIORS: { value: AvoidanceBehavior; label: string }[] = [
  { value: 'wait', label: '終了を待って実行' },
  { value: 'skip', label: 'スキップ' },
];

// =============================================================================
// AvoidanceRuleEditor Component
// =============================================================================

/**
 * AvoidanceRuleEditor - Editor for configuring avoidance rules
 *
 * Allows users to select which operations to avoid running during and what
 * behavior to use when avoidance is triggered.
 *
 * @example
 * <AvoidanceRuleEditor
 *   value={{ targets: ['spec-merge'], behavior: 'wait' }}
 *   onChange={(rule) => setRule(rule)}
 * />
 */
export function AvoidanceRuleEditor({
  value,
  onChange,
  disabled = false,
  className,
}: AvoidanceRuleEditorProps) {
  // Handle target checkbox change
  const handleTargetChange = useCallback(
    (target: AvoidanceTarget, checked: boolean) => {
      const newTargets = checked
        ? [...value.targets, target]
        : value.targets.filter((t) => t !== target);

      onChange({
        ...value,
        targets: newTargets as AvoidanceTarget[],
      });
    },
    [value, onChange]
  );

  // Handle behavior radio change
  const handleBehaviorChange = useCallback(
    (behavior: AvoidanceBehavior) => {
      onChange({
        ...value,
        behavior,
      });
    },
    [value, onChange]
  );

  return (
    <div
      data-testid="avoidance-rule-editor"
      className={clsx('space-y-4', className)}
    >
      {/* Target Selection Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          回避対象
        </label>
        <div className="space-y-2">
          {AVOIDANCE_TARGETS.map(({ value: targetValue, label }) => (
            <label
              key={targetValue}
              className={clsx(
                'flex items-center gap-3 cursor-pointer',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <input
                type="checkbox"
                data-testid={`avoidance-target-${targetValue}`}
                checked={value.targets.includes(targetValue)}
                onChange={(e) => handleTargetChange(targetValue, e.target.checked)}
                disabled={disabled}
                className={clsx(
                  'w-4 h-4 rounded border-gray-300 text-blue-600',
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

      {/* Behavior Selection Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          回避時の挙動
        </label>
        <div className="space-y-2">
          {AVOIDANCE_BEHAVIORS.map(({ value: behaviorValue, label }) => (
            <label
              key={behaviorValue}
              className={clsx(
                'flex items-center gap-3 cursor-pointer',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <input
                type="radio"
                name="avoidance-behavior"
                data-testid={`avoidance-behavior-${behaviorValue}`}
                checked={value.behavior === behaviorValue}
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
    </div>
  );
}

export default AvoidanceRuleEditor;
