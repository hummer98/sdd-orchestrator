/**
 * CreateBugButtonRemote Component
 *
 * Task 4.1: Bug作成ボタンのRemote UI実装
 *
 * Desktop版: タブヘッダー右側の通常ボタン
 * Smartphone版: 右下フローティングアクションボタン（FAB）
 *
 * Requirements: 1.1 (remote-ui-bug-advanced-features)
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

export interface CreateBugButtonRemoteProps {
  /** ボタンクリック時のコールバック */
  onClick: () => void;
  /** デバイスタイプ（desktop/smartphone） */
  deviceType: 'desktop' | 'smartphone';
  /** 無効化フラグ */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * CreateBugButtonRemote - Bug作成ボタン
 *
 * Desktop版: ヘッダー右側の通常ボタン
 * Smartphone版: 右下FAB（フローティングアクションボタン）
 */
export function CreateBugButtonRemote({
  onClick,
  deviceType,
  disabled = false,
}: CreateBugButtonRemoteProps): React.ReactElement {
  if (deviceType === 'smartphone') {
    // Smartphone: FAB (Floating Action Button)
    return (
      <button
        data-testid="create-bug-fab"
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          'fixed right-4 bottom-20 z-50',
          'w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'bg-blue-600 hover:bg-blue-700',
          'text-white shadow-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="新規バグを作成"
      >
        <Plus className="w-6 h-6" />
      </button>
    );
  }

  // Desktop: Normal button
  return (
    <button
      data-testid="create-bug-button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-1 px-3 py-1.5',
        'text-sm font-medium rounded-md',
        'bg-blue-600 hover:bg-blue-700',
        'text-white',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Plus className="w-4 h-4" />
      <span>新規バグ</span>
    </button>
  );
}

export default CreateBugButtonRemote;
