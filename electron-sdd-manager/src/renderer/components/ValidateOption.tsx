/**
 * ValidateOption Component
 * Displays validation options between workflow phases
 * Requirements: 4.1-4.5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { Play, Loader2, Info } from 'lucide-react';
import type { ValidationType } from '../types/workflow';
import { InfoDialog } from './InfoDialog';

// ============================================================
// Task 4.1: ValidateOption Props
// Requirements: 4.4, 4.5
// ============================================================

/** バリデーション種別ごとの説明 */
const VALIDATION_DESCRIPTIONS: Record<ValidationType, string> = {
  gap: '要件と既存コードベース間の実装ギャップを分析します。\n\n新機能を既存のコードベースに統合する際に、要件を満たすために何が必要かを明確にします。\n\n🔍 分析のみ：ステータスは変更されません。',
  design: '技術設計の品質をレビューし、改善点を提案します。\n\n設計ドキュメントが要件を適切に満たしているか、アーキテクチャの妥当性を確認します。\n\n🔍 分析のみ：ステータスは変更されません。',
  impl: '実装が要件・設計・タスクに準拠しているか検証します。\n\n実装完了後に、仕様との整合性やテストの妥当性を確認します。\n\n🔍 分析のみ：ステータスは変更されません。',
};

export interface ValidateOptionProps {
  /** バリデーション種別 */
  type: ValidationType;
  /** バリデーション表示名 */
  label: string;
  /** チェック状態 */
  enabled: boolean;
  /** 実行中フラグ */
  isExecuting: boolean;
  /** 実行可能かどうか（多重実行防止用） */
  canExecute: boolean;
  /** チェック変更ハンドラ */
  onToggle: () => void;
  /** 即時実行ハンドラ */
  onExecute: () => void;
}

export function ValidateOption({
  type,
  label,
  enabled,
  isExecuting,
  canExecute,
  onToggle,
  onExecute,
}: ValidateOptionProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <div
        data-testid="validate-option"
        className={clsx(
          'flex items-center justify-between px-3 py-1',
          'bg-gray-100 dark:bg-gray-700',
          'rounded mx-4'
        )}
      >
        {/* 左側: チェックボックス + ラベル + infoアイコン */}
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowInfo(true)}
            className={clsx(
              'p-0.5 rounded',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-600',
              'transition-colors'
            )}
            title="詳細を表示"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

      {/* 右側: 実行ボタン / ローディング */}
      {isExecuting ? (
        <span
          data-testid="validation-loading"
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          実行中
        </span>
      ) : canExecute ? (
        <button
          onClick={onExecute}
          className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
            'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
            'hover:bg-gray-300 dark:hover:bg-gray-500',
            'transition-colors'
          )}
        >
          <Play className="w-3 h-3" />
          実行
        </button>
      ) : (
        <button
          disabled
          className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
            'bg-gray-300 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
            'cursor-not-allowed'
          )}
        >
          <Play className="w-3 h-3" />
          実行
        </button>
      )}
      </div>

      {/* Info Dialog */}
      <InfoDialog
        isOpen={showInfo}
        title={label}
        description={VALIDATION_DESCRIPTIONS[type]}
        onClose={() => setShowInfo(false)}
      />
    </>
  );
}
