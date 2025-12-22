/**
 * AgentListPanel Component
 * Displays list of SDD Agents for the selected spec
 * Task 30.1-30.3: Agent list UI, continue button, stop button
 * Requirements: 5.1, 5.2, 5.7, 5.8
 */

import { useState, useEffect } from 'react';
import { Bot, StopCircle, Loader2, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';
import { clsx } from 'clsx';

type AgentStatus = AgentInfo['status'];

/**
 * Format ISO date string to "MM/DD HH:mm"
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
 * Format duration in milliseconds to "Xm Ys" or "Xs"
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

const STATUS_CONFIG: Record<AgentStatus, { label: string; icon: React.ReactNode; iconClassName: string }> = {
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

export function AgentListPanel() {
  const { selectedSpec } = useSpecStore();
  const { selectedAgentId, stopAgent, selectAgent, getAgentsForSpec, getAgentById, removeAgent, loadAgents, agents } = useAgentStore();
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState<AgentInfo | null>(null);

  // Load agents when component mounts or when agents map is empty
  useEffect(() => {
    if (agents.size === 0) {
      loadAgents();
    }
  }, [agents.size, loadAgents]);

  // Get agents for this spec (sorted: running first, then by startedAt descending)
  const specName = selectedSpec?.name || '';
  const specAgents = getAgentsForSpec(specName)
    .sort((a, b) => {
      // Running agents first
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (a.status !== 'running' && b.status === 'running') return 1;
      // Then by startedAt descending
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });

  // Auto-select the most recent agent when spec changes
  // This improves UX by automatically linking spec selection with agent selection
  useEffect(() => {
    if (!selectedSpec) return;

    // Skip auto-select if a project agent is currently selected
    // (Project agents have specId === '')
    if (selectedAgentId) {
      const currentAgent = getAgentById(selectedAgentId);
      if (currentAgent && currentAgent.specId === '') return;
    }

    // Get fresh agents list for the new spec
    const specAgents = getAgentsForSpec(selectedSpec.name)
      .sort((a, b) => {
        if (a.status === 'running' && b.status !== 'running') return -1;
        if (a.status !== 'running' && b.status === 'running') return 1;
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });

    // If an agent is already selected for this spec, don't auto-select
    const currentSelectedAgent = specAgents.find(a => a.agentId === selectedAgentId);
    if (currentSelectedAgent) return;

    // Auto-select the first agent (running or most recent)
    if (specAgents.length > 0) {
      selectAgent(specAgents[0].agentId);
    }
  }, [selectedSpec?.name, selectedAgentId, getAgentsForSpec, getAgentById, selectAgent]);

  if (!selectedSpec) {
    return null;
  }

  const handleStop = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await stopAgent(agentId);
  };

  const handleRemoveClick = (agent: AgentInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteAgent(agent);
  };

  const handleConfirmRemove = () => {
    if (confirmDeleteAgent) {
      removeAgent(confirmDeleteAgent.agentId);
      setConfirmDeleteAgent(null);
    }
  };

  const handleCancelRemove = () => {
    setConfirmDeleteAgent(null);
  };

  return (
    <div data-testid="agent-list-panel" className="h-full flex flex-col p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Agent一覧
        </h3>
        {specAgents.length > 0 && (
          <span className="text-xs text-gray-400">
            ({specAgents.length})
          </span>
        )}
      </div>

      {specAgents.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">
          Agentはありません
        </p>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {specAgents.map((agent) => (
            <AgentListItem
              key={agent.agentId}
              agent={agent}
              isSelected={selectedAgentId === agent.agentId}
              onSelect={() => selectAgent(agent.agentId)}
              onStop={(e) => handleStop(agent.agentId, e)}
              onRemove={(e) => handleRemoveClick(agent, e)}
            />
          ))}
        </ul>
      )}

      {/* 削除確認ダイアログ */}
      {confirmDeleteAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm mx-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              セッションを削除しますか？
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="font-medium">{confirmDeleteAgent.phase}</span> のセッションを削除します。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelRemove}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AgentListItemProps {
  agent: AgentInfo;
  isSelected: boolean;
  onSelect: () => void;
  onStop: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}

function AgentListItem({ agent, isSelected, onSelect, onStop, onRemove }: AgentListItemProps) {
  const statusConfig = STATUS_CONFIG[agent.status];
  const showStopButton = agent.status === 'running' || agent.status === 'hang';
  const showRemoveButton = agent.status !== 'running' && agent.status !== 'hang';
  const isRunning = agent.status === 'running';

  // Dynamic elapsed time for running agents
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

  // Calculate duration
  const duration = isRunning
    ? elapsed
    : new Date(agent.lastActivityAt).getTime() - new Date(agent.startedAt).getTime();

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
          <span className={clsx('shrink-0', statusConfig.iconClassName)} title={statusConfig.label}>
            {statusConfig.icon}
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {agent.phase}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatDateTime(agent.startedAt)}
            {' '}
            ({formatDuration(duration)}{isRunning && '...'})
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          {showStopButton && (
            <button
              onClick={onStop}
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
              onClick={onRemove}
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
