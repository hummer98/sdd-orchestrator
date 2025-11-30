/**
 * SpecListHeader Component
 * Header for spec list with count display and create button
 * Task 3.1, 3.2 (sidebar-refactor)
 * Requirements: 2.1, 2.2, 2.3, 2.4, 6.5
 */

import { FileText, Plus } from 'lucide-react';
import { clsx } from 'clsx';

interface SpecListHeaderProps {
  /** 仕様件数 */
  specCount: number;
  /** 新規作成ボタンクリックハンドラ */
  onCreateClick: () => void;
  /** ボタン無効化フラグ */
  disabled?: boolean;
}

export function SpecListHeader({ specCount, onCreateClick, disabled = false }: SpecListHeaderProps) {
  return (
    <div
      data-testid="spec-list-header"
      className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-500" />
        <h2 className="font-semibold text-gray-700 dark:text-gray-300">
          仕様一覧
        </h2>
        <span className="text-xs text-gray-500">
          {specCount} 件
        </span>
      </div>

      <button
        onClick={onCreateClick}
        disabled={disabled}
        title="新規仕様を作成"
        aria-label="新規仕様を作成"
        className={clsx(
          'p-1.5 rounded-md transition-colors',
          'bg-blue-500 hover:bg-blue-600 text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500'
        )}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
