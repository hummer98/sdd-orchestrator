/**
 * RefreshButton Component
 *
 * Task 4.1: RefreshButtonコンポーネントの作成
 *
 * Requirements:
 * - 4.3: Desktop版でリフレッシュボタンクリック時に再取得
 * - 6.5: リフレッシュ中にボタンをローディング状態表示
 *
 * Design:
 * - Design.md DD-005: Desktop版リフレッシュUIの配置
 * - Agent一覧セクションのヘッダー右端にアイコンボタンを配置
 * - Lucide ReactのRefreshCwアイコンを使用
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '@shared/components/ui';

// =============================================================================
// Types
// =============================================================================

export interface RefreshButtonProps {
  /** Refresh callback */
  onRefresh: () => Promise<void>;
  /** Whether refresh is in progress */
  isLoading: boolean;
  /** Optional label (default: none, icon only) */
  label?: string;
  /** Test ID */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * RefreshButton - Desktop version refresh button
 *
 * Provides a button to manually refresh Agent list.
 * Shows spinner during loading and disables interaction.
 *
 * Features:
 * - Icon-only by default (matches Electron版 ProjectAgentPanel)
 * - Optional text label
 * - Loading state with spinner
 * - Disabled state during refresh
 */
export function RefreshButton({
  onRefresh,
  isLoading,
  label,
  testId = 'refresh-button',
}: RefreshButtonProps): React.ReactElement {
  const handleClick = async () => {
    if (isLoading) return;
    await onRefresh();
  };

  return (
    <button
      data-testid={testId}
      onClick={handleClick}
      disabled={isLoading}
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded-md',
        'text-sm font-medium',
        'transition-colors',
        isLoading
          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
      title="Agent一覧を更新"
      aria-label="Refresh agent list"
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      {label && <span>{label}</span>}
    </button>
  );
}

export default RefreshButton;
