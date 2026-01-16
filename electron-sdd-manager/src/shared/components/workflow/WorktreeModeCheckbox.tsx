/**
 * WorktreeModeCheckbox Component
 * worktree-execution-ui: Task 3.1
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.4
 *
 * Checkbox component for selecting worktree mode in impl flow.
 * - Shows lock icon with tooltip when disabled
 * - Reflects checked state immediately
 */

import React from 'react';
import { clsx } from 'clsx';
import { Lock, GitBranch } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

/** Lock reasons for the checkbox */
export type WorktreeLockReason =
  | 'impl-started' // Implementation has started (branch exists)
  | 'worktree-exists'; // Worktree already exists (path exists)

export interface WorktreeModeCheckboxProps {
  /** Whether the checkbox is checked (worktree mode selected) */
  checked: boolean;
  /** Callback when checkbox is toggled */
  onChange: (checked: boolean) => void;
  /** Whether the checkbox is disabled (locked) */
  disabled: boolean;
  /** Reason for being locked (shown in tooltip) */
  lockReason: WorktreeLockReason | null;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Lock reason messages (Japanese)
// =============================================================================

const LOCK_REASON_MESSAGES: Record<WorktreeLockReason, string> = {
  'impl-started': '実装開始後は変更できません',
  'worktree-exists': 'Worktreeが既に存在するため変更できません',
};

// =============================================================================
// Component
// =============================================================================

/**
 * WorktreeModeCheckbox - Checkbox for selecting worktree mode
 *
 * Visual states:
 * - Unchecked (normal mode): Standard checkbox
 * - Checked (worktree mode): Highlighted with purple accent
 * - Disabled: Shows lock icon with reason tooltip
 */
export function WorktreeModeCheckbox({
  checked,
  onChange,
  disabled,
  lockReason,
  className,
}: WorktreeModeCheckboxProps): React.ReactElement {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const tooltipText = disabled && lockReason
    ? LOCK_REASON_MESSAGES[lockReason]
    : checked
      ? 'Worktreeモードで実装します'
      : 'カレントブランチで実装します';

  return (
    <div
      data-testid="worktree-mode-checkbox-container"
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        'transition-colors select-none',
        checked && !disabled && 'bg-violet-50 dark:bg-violet-900/20',
        disabled && 'opacity-70 cursor-not-allowed',
        className
      )}
      title={tooltipText}
    >
      {/* Checkbox input */}
      <input
        type="checkbox"
        data-testid="worktree-mode-checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        aria-label="Worktreeモードを使用"
        aria-disabled={disabled}
        className={clsx(
          'w-4 h-4 rounded border-2 appearance-none cursor-pointer',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
          checked
            ? 'bg-violet-500 border-violet-500 dark:bg-violet-600 dark:border-violet-600'
            : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-500',
          checked && 'focus:ring-violet-500',
          !checked && 'focus:ring-gray-400',
          disabled && 'cursor-not-allowed'
        )}
        style={{
          // Custom checkmark for checked state
          backgroundImage: checked
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E")`
            : 'none',
          backgroundSize: '12px 12px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* GitBranch icon */}
      <GitBranch
        className={clsx(
          'w-4 h-4 shrink-0',
          checked ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400'
        )}
      />

      {/* Label */}
      <span
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={clsx(
          'text-sm font-medium',
          checked ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300',
          !disabled && 'cursor-pointer'
        )}
      >
        Worktreeモード
      </span>

      {/* Lock icon when disabled */}
      {disabled && (
        <Lock
          data-testid="lock-icon"
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0"
        />
      )}
    </div>
  );
}
