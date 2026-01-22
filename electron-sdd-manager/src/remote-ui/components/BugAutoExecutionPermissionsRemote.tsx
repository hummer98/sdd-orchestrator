/**
 * BugAutoExecutionPermissionsRemote Component
 *
 * Task 5.1: フェーズパーミッショントグルのRemote UI実装
 *
 * analyze/fix/verifyの3つのトグルスイッチを表示。
 * デフォルトで全てON。
 *
 * Requirements: 2.2 (remote-ui-bug-advanced-features)
 */

import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, Wrench, CheckCircle } from 'lucide-react';
import type { BugAutoExecutionPermissions } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface BugAutoExecutionPermissionsRemoteProps {
  /** 現在のパーミッション設定 */
  permissions: BugAutoExecutionPermissions;
  /** パーミッション変更時のコールバック */
  onChange: (permissions: BugAutoExecutionPermissions) => void;
  /** 無効化フラグ */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * BugAutoExecutionPermissionsRemote - フェーズパーミッション設定
 */
export function BugAutoExecutionPermissionsRemote({
  permissions,
  onChange,
  disabled = false,
}: BugAutoExecutionPermissionsRemoteProps): React.ReactElement {
  const handleToggle = (phase: keyof BugAutoExecutionPermissions) => {
    if (disabled) return;
    onChange({
      ...permissions,
      [phase]: !permissions[phase],
    });
  };

  const phases: Array<{
    key: keyof BugAutoExecutionPermissions;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: 'analyze', label: '分析', icon: <AlertCircle className="w-4 h-4" /> },
    { key: 'fix', label: '修正', icon: <Wrench className="w-4 h-4" /> },
    { key: 'verify', label: '検証', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  return (
    <div data-testid="bug-auto-execution-permissions" className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        実行フェーズ
      </p>
      <div className="flex flex-wrap gap-2">
        {phases.map(({ key, label, icon }) => (
          <button
            key={key}
            data-testid={`bug-permission-${key}`}
            onClick={() => handleToggle(key)}
            disabled={disabled}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              permissions[key]
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-pressed={permissions[key]}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default BugAutoExecutionPermissionsRemote;
