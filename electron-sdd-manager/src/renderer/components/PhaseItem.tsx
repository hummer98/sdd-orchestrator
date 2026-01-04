/**
 * PhaseItem Component
 * Displays a single workflow phase with status and actions
 * Requirements: 2.1-2.5, 5.1, 5.2
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Play,
  Check,
  Ban,
  PlayCircle,
  Loader2,
  Info,
  Pause,
  Bot,
} from 'lucide-react';
import type { PhaseStatus, WorkflowPhase } from '../types/workflow';
import { InfoDialog } from './InfoDialog';

// ============================================================
// Task 3.1, 3.2, 3.3: PhaseItem Props
// Requirements: 2.1-2.5, 5.1, 5.2
// ============================================================

/** フェーズ種別ごとの説明 */
const PHASE_DESCRIPTIONS: Record<WorkflowPhase, string> = {
  requirements: '機能の要件を定義します。\n\nEARS形式で機能要件・非機能要件を明確化し、受け入れ基準を設定します。\n\n📝 実行するとrequirements.mdが生成され、ステータスが「生成完了」に変わります。',
  design: '技術設計を作成します。\n\n要件を実現するためのアーキテクチャ、データモデル、APIインターフェースなどを設計します。\n\n📝 実行するとdesign.mdが生成され、ステータスが「生成完了」に変わります。',
  tasks: '実装タスクを生成します。\n\n設計に基づいて、実装すべき具体的なタスクをTDD方式で分解します。\n\n📝 実行するとtasks.mdが生成され、ステータスが「生成完了」に変わります。',
  impl: 'タスクを実装します。\n\nテスト駆動開発(TDD)で、タスクごとにテスト→実装→リファクタリングを行います。\n\n📝 実行するとコードが生成・変更され、タスクの進捗が更新されます。',
  inspection: '品質検査を実施します。\n\n実装が要件・設計を満たしているか、テストカバレッジや品質基準を検証します。\n\n📝 実行するとステータスが「完了」に変わります。',
  deploy: '変更をコミットします。\n\n検査を通過した実装の変更をgitにコミットします。\n\n📝 /commit <feature-name> が実行され、変更がコミットされます。',
};

export interface PhaseItemProps {
  /** フェーズ種別 */
  phase: WorkflowPhase;
  /** フェーズ表示名 */
  label: string;
  /** フェーズ状態 */
  status: PhaseStatus;
  /** 前フェーズの状態（遷移可能判定用） */
  previousStatus: PhaseStatus | null;
  /** 自動実行許可フラグ */
  autoExecutionPermitted: boolean;
  /** 現在実行中かどうか */
  isExecuting: boolean;
  /** このフェーズが実行可能かどうか（順序制御・多重実行防止用） */
  canExecute: boolean;
  /** 自動実行中のハイライトフェーズかどうか */
  isAutoPhase?: boolean;
  /** 実行ボタンハンドラ */
  onExecute: () => void;
  /** 承認ボタンハンドラ */
  onApprove: () => void;
  /** 承認して実行ボタンハンドラ */
  onApproveAndExecute: () => void;
  /** 自動実行許可トグルハンドラ */
  onToggleAutoPermission: () => void;
  /** 生成完了リンクハンドラ（Agentログ表示） */
  onShowAgentLog?: () => void;
}

export function PhaseItem({
  phase,
  label,
  status,
  previousStatus,
  autoExecutionPermitted,
  isExecuting,
  canExecute,
  isAutoPhase = false,
  onExecute,
  onApprove,
  onApproveAndExecute,
  onToggleAutoPermission,
  onShowAgentLog,
}: PhaseItemProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Task 3.2: 承認して実行ボタンの表示条件
  const showApproveAndExecute =
    previousStatus === 'generated' && status === 'pending' && !isExecuting && canExecute;

  // 進捗アイコンのクリックハンドラ
  const handleProgressIconClick = () => {
    if (status === 'generated' && onShowAgentLog) {
      onShowAgentLog();
    }
  };

  // 進捗アイコンのレンダリング
  const renderProgressIcon = () => {
    if (isExecuting) {
      return (
        <Bot
          data-testid="progress-icon-executing"
          className="w-4 h-4 text-blue-500 animate-pulse"
        />
      );
    }
    switch (status) {
      case 'approved':
        return (
          <Check
            data-testid="progress-icon-approved"
            className="w-4 h-4 text-green-500"
          />
        );
      case 'generated':
        return (
          <Pause
            data-testid="progress-icon-generated"
            className="w-4 h-4 text-yellow-500"
          />
        );
      default:
        return (
          <Check
            data-testid="progress-icon-pending"
            className="w-4 h-4 text-gray-300 dark:text-gray-600"
          />
        );
    }
  };

  return (
    <>
    <div
      data-testid={`phase-item-${phase}`}
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-gray-50 dark:bg-gray-800',
        'transition-colors',
        // Task 10.2: Highlight current auto phase
        isAutoPhase && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900'
      )}
    >
      {/* 左側: 進捗アイコン + フェーズ名 + infoアイコン */}
      <div data-testid="phase-left-side" className="flex items-center gap-2">
        {/* Task 3.4: 進捗アイコン（左端） */}
        <button
          onClick={handleProgressIconClick}
          className={clsx(
            'p-1 rounded',
            status === 'generated' && 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600',
            status !== 'generated' && 'cursor-default'
          )}
          title={status === 'generated' ? 'Agentログを表示' : undefined}
        >
          {renderProgressIcon()}
        </button>

        {/* フェーズ名 */}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>

        {/* Infoアイコン */}
        <button
          onClick={() => setShowInfo(true)}
          className={clsx(
            'p-1 rounded',
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'transition-colors'
          )}
          title="詳細を表示"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* 右側: 自動実行許可アイコン + アクションボタン */}
      <div data-testid="phase-right-side" className="flex items-center gap-2">
        {/* Task 3.3: 自動実行許可アイコン（右側に移動） */}
        <button
          data-testid="auto-permission-toggle"
          onClick={onToggleAutoPermission}
          className={clsx(
            'p-1 rounded',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'transition-colors'
          )}
          title={autoExecutionPermitted ? '自動実行: 許可' : '自動実行: 禁止'}
        >
          {autoExecutionPermitted ? (
            <PlayCircle
              data-testid="auto-permitted-icon"
              className="w-4 h-4 text-green-500"
            />
          ) : (
            <Ban
              data-testid="auto-forbidden-icon"
              className="w-4 h-4 text-gray-400"
            />
          )}
        </button>

        {/* Task 3.1: 実行中表示 */}
        {isExecuting && (
          <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
            <Loader2 className="w-3 h-3 animate-spin" />
            実行中
          </span>
        )}

        {/* Task 3.1: pending状態 - 実行ボタン */}
        {status === 'pending' && !isExecuting && (
          <>
            {showApproveAndExecute ? (
              <button
                data-testid={`phase-button-approve-and-execute-${phase}`}
                onClick={onApproveAndExecute}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  'bg-green-500 text-white hover:bg-green-600',
                  'transition-colors'
                )}
              >
                <Check className="w-4 h-4" />
                承認して実行
              </button>
            ) : canExecute ? (
              <button
                data-testid={`phase-button-${phase}`}
                onClick={onExecute}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  'bg-blue-500 text-white hover:bg-blue-600',
                  'transition-colors'
                )}
              >
                <Play className="w-4 h-4" />
                実行
              </button>
            ) : (
              <button
                data-testid={`phase-button-${phase}`}
                disabled
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  'bg-gray-300 text-gray-500 cursor-not-allowed',
                  'dark:bg-gray-600 dark:text-gray-400'
                )}
              >
                <Play className="w-4 h-4" />
                実行
              </button>
            )}
          </>
        )}

        {/* Task 3.1: generated状態 - 承認ボタンのみ（進捗は左アイコンで表示） */}
        {status === 'generated' && !isExecuting && (
          <button
            onClick={onApprove}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
              'bg-green-500 text-white hover:bg-green-600',
              'transition-colors'
            )}
          >
            <Check className="w-4 h-4" />
            承認
          </button>
        )}
      </div>
    </div>

    {/* Info Dialog */}
    <InfoDialog
      isOpen={showInfo}
      title={label}
      description={PHASE_DESCRIPTIONS[phase]}
      onClose={() => setShowInfo(false)}
    />
    </>
  );
}
