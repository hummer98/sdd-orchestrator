/**
 * AgentListItem Component (Shared)
 *
 * Task 4.5: Agent関連コンポーネントを共有化する
 *
 * このコンポーネントはエージェント一覧の1項目を表示します。
 * props-driven設計で、ストア非依存。Electron版とRemote UI版で共有可能。
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle, StopCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

/**
 * エージェントステータス
 */
export type AgentItemStatus = 'running' | 'completed' | 'interrupted' | 'hang' | 'failed';

/**
 * エージェント情報（props用、ストア非依存）
 */
export interface AgentItemInfo {
  /** エージェントID */
  agentId: string;
  /** セッションID */
  sessionId: string;
  /** 実行フェーズ名 */
  phase: string;
  /** ステータス */
  status: AgentItemStatus;
  /** 開始時刻（ISO文字列） */
  startedAt: string;
  /** 最終アクティビティ時刻（ISO文字列） */
  lastActivityAt: string;
}

/**
 * AgentListItemのprops
 */
export interface AgentListItemProps {
  /** エージェント情報 */
  agent: AgentItemInfo;
  /** 選択中かどうか */
  isSelected: boolean;
  /** 選択時のコールバック */
  onSelect: () => void;
  /** 停止時のコールバック */
  onStop: (e: React.MouseEvent) => void;
  /** 削除時のコールバック */
  onRemove: (e: React.MouseEvent) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * ISO日時文字列を「MM/DD HH:mm」形式に変換
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * ミリ秒の期間を「Xm Ys」または「Xs」形式に変換
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<
  AgentItemStatus,
  { label: string; icon: React.ReactNode; iconClassName: string }
> = {
  running: {
    label: '実行中',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    iconClassName: 'text-blue-500',
  },
  completed: {
    label: '完了',
    icon: <CheckCircle className="w-4 h-4" />,
    iconClassName: 'text-green-500',
  },
  interrupted: {
    label: '中断',
    icon: <AlertCircle className="w-4 h-4" />,
    iconClassName: 'text-yellow-500',
  },
  hang: {
    label: '応答なし',
    icon: <AlertCircle className="w-4 h-4" />,
    iconClassName: 'text-red-500',
  },
  failed: {
    label: '失敗',
    icon: <XCircle className="w-4 h-4" />,
    iconClassName: 'text-red-500',
  },
};

// =============================================================================
// Component
// =============================================================================

export function AgentListItem({
  agent,
  isSelected,
  onSelect,
  onStop,
  onRemove,
}: AgentListItemProps) {
  const statusConfig = STATUS_CONFIG[agent.status];
  const showStopButton = agent.status === 'running' || agent.status === 'hang';
  const showRemoveButton = agent.status !== 'running' && agent.status !== 'hang';
  const isRunning = agent.status === 'running';

  // 実行中エージェントの経過時間を動的に更新
  const [elapsed, setElapsed] = useState(() => {
    return Date.now() - new Date(agent.startedAt).getTime();
  });

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(agent.startedAt).getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, agent.startedAt]);

  // 経過時間を計算
  const duration = isRunning
    ? elapsed
    : new Date(agent.lastActivityAt).getTime() - new Date(agent.startedAt).getTime();

  const handleStopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStop(e);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(e);
  };

  return (
    <li
      data-testid={`agent-item-${agent.agentId}`}
      title={`${agent.agentId} / ${agent.sessionId}`}
      onClick={onSelect}
      className={clsx(
        'p-2 rounded-md cursor-pointer transition-colors',
        'border border-gray-200 dark:border-gray-700',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={clsx('shrink-0', statusConfig.iconClassName)}
            title={statusConfig.label}
          >
            {statusConfig.icon}
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {agent.phase}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatDateTime(agent.startedAt)} ({formatDuration(duration)}
            {isRunning && '...'})
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          {showStopButton && (
            <button
              onClick={handleStopClick}
              className={clsx(
                'p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30',
                'text-red-600 dark:text-red-400'
              )}
              title="停止"
              aria-label="停止"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}

          {showRemoveButton && (
            <button
              onClick={handleRemoveClick}
              className={clsx(
                'p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
              title="削除"
              aria-label="削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
