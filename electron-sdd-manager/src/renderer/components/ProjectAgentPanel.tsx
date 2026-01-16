/**
 * ProjectAgentPanel Component
 * Displays list of project-level SDD Agents (agents not bound to a specific spec)
 * Task 4.2, 4.3 (sidebar-refactor)
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6
 */

import { Bot, StopCircle, PlayCircle, Loader2, CheckCircle, XCircle, AlertCircle, Trash2, MessageSquare } from 'lucide-react';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';
import { useProjectStore, notify } from '../stores';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { AskAgentDialog } from './AskAgentDialog';

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

type AgentStatus = AgentInfo['status'];

const STATUS_CONFIG: Record<AgentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  running: {
    label: '実行中',
    className: 'bg-blue-100 text-blue-700',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  completed: {
    label: '完了',
    className: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  interrupted: {
    label: '中断',
    className: 'bg-yellow-100 text-yellow-700',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  hang: {
    label: '応答なし',
    className: 'bg-red-100 text-red-700',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  failed: {
    label: '失敗',
    className: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
};

export function ProjectAgentPanel() {
  const { selectedAgentId, stopAgent, resumeAgent, selectAgent, getProjectAgents, removeAgent, addAgent, selectForProjectAgents } = useAgentStore();
  const { currentProject } = useProjectStore();
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState<AgentInfo | null>(null);
  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);

  const projectAgents = getProjectAgents()
    // Sort: running first, then by startedAt descending (newest first)
    .sort((a, b) => {
      // Running agents first
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (a.status !== 'running' && b.status === 'running') return 1;
      // Then by startedAt descending
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });

  // project-agent-panel-always-visible feature: 0件でもパネルを表示（return nullを削除）

  const handleStop = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await stopAgent(agentId);
  };

  const handleResume = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await resumeAgent(agentId);
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

  // Ask Agent execution handlers
  const handleAskClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAskDialogOpen(true);
  };

  const handleAskExecute = async (prompt: string) => {
    if (!currentProject) return;

    try {
      const agentInfo = await window.electronAPI.executeAskProject(currentProject, prompt);
      addAgent('', agentInfo);
      selectForProjectAgents();
      selectAgent(agentInfo.agentId);
      notify.success('Project Askを開始しました');
      setIsAskDialogOpen(false);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Project Askの実行に失敗しました');
    }
  };

  const handleAskCancel = () => {
    setIsAskDialogOpen(false);
  };

  return (
    <div
      data-testid="project-agent-panel"
      className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
    >
      {/* Header */}
      <div
        data-testid="project-agent-panel-header"
        className="flex items-center gap-2 px-4 py-2"
      >
        <Bot className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Project Agent
        </span>
        <span className="text-xs text-gray-400">
          ({projectAgents.length})
        </span>
        {/* Ask Button */}
        <div className="flex-1" />
        <button
          onClick={handleAskClick}
          disabled={!currentProject}
          className={clsx(
            'p-1 rounded-md transition-colors',
            'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Askを実行"
          aria-label="Project Askを実行"
          data-testid="project-ask-button"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Agent List or Empty State */}
      {projectAgents.length === 0 ? (
        <div
          data-testid="project-agent-panel-empty"
          className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
        >
          プロジェクトエージェントなし
        </div>
      ) : (
        <ul className="px-2 pb-2 space-y-1">
          {projectAgents.map((agent) => (
            <ProjectAgentListItem
              key={agent.agentId}
              agent={agent}
              isSelected={selectedAgentId === agent.agentId}
              onSelect={() => selectAgent(agent.agentId)}
              onStop={(e) => handleStop(agent.agentId, e)}
              onResume={(e) => handleResume(agent.agentId, e)}
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

      {/* Ask Agent Dialog */}
      <AskAgentDialog
        isOpen={isAskDialogOpen}
        agentType="project"
        onExecute={handleAskExecute}
        onCancel={handleAskCancel}
      />
    </div>
  );
}

interface ProjectAgentListItemProps {
  agent: AgentInfo;
  isSelected: boolean;
  onSelect: () => void;
  onStop: (e: React.MouseEvent) => void;
  onResume: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}

function ProjectAgentListItem({ agent, isSelected, onSelect, onStop, onResume, onRemove }: ProjectAgentListItemProps) {
  const statusConfig = STATUS_CONFIG[agent.status];
  const showStopButton = agent.status === 'running' || agent.status === 'hang';
  const showResumeButton = agent.status === 'interrupted';
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
      data-testid={`project-agent-item-${agent.agentId}`}
      title={`${agent.agentId} / ${agent.sessionId}`}
      onClick={onSelect}
      className={clsx(
        'p-2 rounded-md cursor-pointer transition-colors',
        'border border-gray-200 dark:border-gray-700',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {agent.phase}
          </span>
          <span
            className={clsx(
              'flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full',
              statusConfig.className
            )}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
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

          {showResumeButton && (
            <button
              onClick={onResume}
              className={clsx(
                'p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30',
                'text-green-600 dark:text-green-400'
              )}
              title="続けて"
              aria-label="続けて"
            >
              <PlayCircle className="w-4 h-4" />
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
