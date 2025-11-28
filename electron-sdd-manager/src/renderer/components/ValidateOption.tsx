/**
 * ValidateOption Component
 * Displays validation options between workflow phases
 * Requirements: 4.1-4.5
 */

import { clsx } from 'clsx';
import { Play, Loader2 } from 'lucide-react';
import type { ValidationType } from '../types/workflow';

// ============================================================
// Task 4.1: ValidateOption Props
// Requirements: 4.4, 4.5
// ============================================================

export interface ValidateOptionProps {
  /** バリデーション種別 */
  type: ValidationType;
  /** バリデーション表示名 */
  label: string;
  /** チェック状態 */
  enabled: boolean;
  /** 実行中フラグ */
  isExecuting: boolean;
  /** チェック変更ハンドラ */
  onToggle: () => void;
  /** 即時実行ハンドラ */
  onExecute: () => void;
}

export function ValidateOption({
  type: _type,
  label,
  enabled,
  isExecuting,
  onToggle,
  onExecute,
}: ValidateOptionProps) {
  return (
    <div
      data-testid="validate-option"
      className={clsx(
        'flex items-center justify-between px-3 py-1',
        'bg-gray-100 dark:bg-gray-700',
        'rounded mx-4'
      )}
    >
      {/* 左側: チェックボックス + ラベル */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isExecuting}
          onChange={onToggle}
          className={clsx(
            'w-4 h-4 rounded',
            'text-blue-500 focus:ring-blue-500',
            'border-gray-300 dark:border-gray-600',
            isExecuting && 'opacity-50 cursor-not-allowed'
          )}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </label>

      {/* 右側: 実行ボタン / ローディング */}
      {isExecuting ? (
        <span
          data-testid="validation-loading"
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          実行中
        </span>
      ) : (
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
            'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
            'hover:bg-gray-300 dark:hover:bg-gray-500',
            'transition-colors',
            isExecuting && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Play className="w-3 h-3" />
          実行
        </button>
      )}
    </div>
  );
}
