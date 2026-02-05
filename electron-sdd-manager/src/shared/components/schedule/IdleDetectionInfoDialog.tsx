/**
 * IdleDetectionInfoDialog Component
 * Information dialog explaining how idle detection works
 *
 * Displays details about:
 * - User activity detection (UI operations during Spec viewing)
 * - Agent activity monitoring
 * - Sync mechanism between Renderer and Main process
 *
 * Note: Window focus is NOT used for idle detection.
 * Only actual UI operations are tracked.
 */

import React from 'react';
import { clsx } from 'clsx';
import { Info, X, MousePointer2, Bot, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

// =============================================================================
// Types
// =============================================================================

export interface IdleDetectionInfoDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface DetectionMethodCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function DetectionMethodCard({ icon, title, children }: DetectionMethodCardProps) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-blue-500 dark:text-blue-400">
          {icon}
        </div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </h4>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * IdleDetectionInfoDialog - Information dialog about idle detection mechanism
 *
 * Usage:
 * ```tsx
 * <IdleDetectionInfoDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 * />
 * ```
 */
export function IdleDetectionInfoDialog({
  isOpen,
  onClose,
}: IdleDetectionInfoDialogProps): React.ReactElement | null {
  if (!isOpen) {
    return null;
  }

  const dialogTitleId = 'idle-detection-info-title';

  return (
    <div
      data-testid="idle-detection-info-dialog"
      className="fixed inset-0 z-[60] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        data-testid="dialog-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className={clsx(
          'relative z-10 w-full max-w-lg mx-4 p-6',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-xl',
          'max-h-[80vh] overflow-y-auto'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <h3
              id={dialogTitleId}
              className="text-lg font-medium text-gray-900 dark:text-gray-100"
            >
              アイドル検出の仕組み
            </h3>
          </div>
          <button
            type="button"
            data-testid="dialog-close-button"
            onClick={onClose}
            className={clsx(
              'p-1.5 rounded-md',
              'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          「アイドル後に実行」オプションを有効にすると、
          ユーザーがアイドル状態と判定されたときにタスクを実行します。
        </p>

        {/* Detection Methods */}
        <div className="space-y-3 mb-5">
          {/* UI Activity - Primary */}
          <DetectionMethodCard
            icon={<MousePointer2 className="w-4 h-4" />}
            title="UI操作の検出（主要な判定基準）"
          >
            <p className="mb-1">
              Spec閲覧中の以下の操作を検出し、アクティビティとして記録します:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Spec選択・タブ切り替え</li>
              <li>ドキュメントのスクロール</li>
              <li>Agent ログの展開・スクロール</li>
              <li>承認ボタンのクリック</li>
              <li>リンクのクリック</li>
            </ul>
            <p className="mt-2 font-medium text-gray-700 dark:text-gray-300">
              これらの操作がない場合、アイドル状態と判定されます。
            </p>
          </DetectionMethodCard>

          {/* Spec Selection Note */}
          <DetectionMethodCard
            icon={<AlertCircle className="w-4 h-4" />}
            title="Spec未選択時の挙動"
          >
            <p>
              Specが選択されていない場合、UI操作の追跡が行われないため、
              <strong className="text-gray-700 dark:text-gray-300">常にアイドル状態</strong>
              として扱われます。
            </p>
            <p className="mt-1 text-gray-500 dark:text-gray-500">
              ※ ウィンドウがフォーカスされているだけではアクティブとは判定されません
            </p>
          </DetectionMethodCard>

          {/* Agent Activity */}
          <DetectionMethodCard
            icon={<Bot className="w-4 h-4" />}
            title="Agentの動作状況"
          >
            <p className="mb-1">
              「他Agent動作中の挙動」設定で、Agentの動作状態も考慮できます:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li><strong>待機</strong>: 実行中Agentがある場合、終了を待つ</li>
              <li><strong>スキップ</strong>: 実行中Agentがある場合、今回の実行をスキップ</li>
            </ul>
            <p className="mt-1 text-gray-500 dark:text-gray-500">
              ※ 回避ルール設定で特定の操作を避けることも可能
            </p>
          </DetectionMethodCard>

          {/* Sync Mechanism */}
          <DetectionMethodCard
            icon={<RefreshCw className="w-4 h-4" />}
            title="同期の仕組み"
          >
            <p className="mb-1">
              アクティビティ情報は以下のように同期されます:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Renderer（UI）: 10秒ごとに最終アクティビティ時刻をMain Processに報告</li>
              <li>Main Process: 1分ごとにアイドル時間をチェックし、タスク実行を判定</li>
              <li>アイドル閾値: 「アイドル後に実行」が有効な場合、1分以上のアイドル時間が必要</li>
            </ul>
          </DetectionMethodCard>
        </div>

        {/* Summary */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>まとめ:</strong> アイドル検出は「一定時間UI操作がない」状態を検知します。
            ウィンドウがフォーカスされているだけではアクティブとは判定されません。
            Spec閲覧中の実際の操作（スクロール、クリック等）のみがアクティビティとしてカウントされます。
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-end mt-5">
          <Button
            variant="primary"
            onClick={onClose}
            data-testid="dialog-ok-button"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IdleDetectionInfoDialog;
