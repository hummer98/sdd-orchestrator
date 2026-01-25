/**
 * WorkflowModeEditor Component
 * Editor for schedule task workflow mode settings
 *
 * Task 6.5: workflowモード設定UIを作成
 * - 有効/無効トグル
 * - suffixモード選択（自動/カスタム）
 * - カスタムsuffix入力
 *
 * Requirements: 8.1, 8.4
 */

import { useCallback } from 'react';
import { clsx } from 'clsx';
import { GitBranch } from 'lucide-react';
import type { ScheduleWorkflowConfig, ScheduleSuffixMode } from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface WorkflowModeEditorProps {
  /** Current workflow configuration */
  value: ScheduleWorkflowConfig;
  /** Called when configuration changes */
  onChange: (config: ScheduleWorkflowConfig) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

// =============================================================================
// Toggle Component
// =============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
  testId: string;
}

function ToggleSwitch({ checked, onChange, ariaLabel, disabled, testId }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-testid={testId}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        'relative inline-flex h-5 w-9 items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        checked
          ? 'bg-blue-500 dark:bg-blue-600'
          : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

// =============================================================================
// WorkflowModeEditor Component
// =============================================================================

export function WorkflowModeEditor({
  value,
  onChange,
  disabled = false,
}: WorkflowModeEditorProps) {
  // Handle enabled toggle
  const handleEnabledChange = useCallback(() => {
    onChange({
      ...value,
      enabled: !value.enabled,
    });
  }, [value, onChange]);

  // Handle suffix mode change
  const handleSuffixModeChange = useCallback(
    (mode: ScheduleSuffixMode) => {
      onChange({
        ...value,
        suffixMode: mode,
      });
    },
    [value, onChange]
  );

  // Handle custom suffix change
  const handleCustomSuffixChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...value,
        customSuffix: e.target.value,
      });
    },
    [value, onChange]
  );

  return (
    <div data-testid="workflow-mode-editor" className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Worktreeモード
          </span>
        </div>
        <ToggleSwitch
          checked={value.enabled}
          onChange={handleEnabledChange}
          ariaLabel={`Worktreeモードを${value.enabled ? '無効' : '有効'}にする`}
          disabled={disabled}
          testId="workflow-mode-toggle"
        />
      </div>

      {/* Description text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {value.enabled
          ? 'worktree環境で実行します。命名規則: schedule/{task-name}/{suffix}'
          : '有効にすると、実行時に自動でworktreeとブランチを作成します。'}
      </p>

      {/* Suffix settings (only visible when enabled) */}
      {value.enabled && (
        <div
          data-testid="suffix-mode-selector"
          className="pl-6 space-y-3 border-l-2 border-gray-200 dark:border-gray-700"
        >
          {/* Suffix mode selection */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              サフィックス設定
            </span>

            <div className="space-y-2">
              {/* Auto option */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="suffix-mode"
                  data-testid="suffix-mode-auto"
                  checked={value.suffixMode === 'auto' || !value.suffixMode}
                  onChange={() => handleSuffixModeChange('auto')}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  自動（日時で生成）
                </span>
              </label>

              {/* Custom option */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="suffix-mode"
                  data-testid="suffix-mode-custom"
                  checked={value.suffixMode === 'custom'}
                  onChange={() => handleSuffixModeChange('custom')}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  カスタム
                </span>
              </label>
            </div>
          </div>

          {/* Custom suffix input (only visible when custom mode is selected) */}
          {value.suffixMode === 'custom' && (
            <div className="space-y-1">
              <input
                type="text"
                data-testid="custom-suffix-input"
                value={value.customSuffix ?? ''}
                onChange={handleCustomSuffixChange}
                disabled={disabled}
                placeholder="例: my-feature"
                className={clsx(
                  'w-full px-3 py-2 text-sm rounded-md',
                  'bg-gray-50 dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'border border-gray-200 dark:border-gray-700',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'disabled:opacity-50'
                )}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                入力値に日時サフィックスが自動付加されます（例: my-feature-20260125）
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkflowModeEditor;
