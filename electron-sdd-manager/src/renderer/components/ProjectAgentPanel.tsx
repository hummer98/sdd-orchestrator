/**
 * ProjectAgentPanel Component
 * Displays list of project-level SDD Agents (agents not bound to a specific spec)
 * Task 4.2, 4.3 (sidebar-refactor)
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6
 */

import { Bot, MessageSquare } from 'lucide-react';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';
import { useProjectStore, notify } from '../stores';
import { clsx } from 'clsx';
import { useState } from 'react';
import { AskAgentDialog } from '@shared/components/project';
import { AgentList, type AgentItemInfo } from '@shared/components/agent';

// =============================================================================
// Type Mapping
// =============================================================================

/**
 * Electron版AgentInfoをshared版AgentItemInfoに変換
 */
function mapAgentInfoToItemInfo(agent: AgentInfo): AgentItemInfo {
  return {
    agentId: agent.agentId,
    sessionId: agent.sessionId,
    phase: agent.phase,
    status: agent.status,
    startedAt: agent.startedAt,
    lastActivityAt: agent.lastActivityAt,
  };
}

export function ProjectAgentPanel() {
  const { selectedAgentId, stopAgent, selectAgent, getProjectAgents, removeAgent, addAgent, selectForProjectAgents } = useAgentStore();
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

  const handleStop = async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    await stopAgent(agentId);
  };

  const handleRemoveClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    const agent = projectAgents.find(a => a.agentId === agentId);
    if (agent) {
      setConfirmDeleteAgent(agent);
    }
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

      {/* Agent List */}
      <div className="px-2 pb-2 max-h-48 overflow-y-auto">
        <AgentList
          agents={projectAgents.map(mapAgentInfoToItemInfo)}
          selectedAgentId={selectedAgentId}
          onSelect={(agentId) => selectAgent(agentId)}
          onStop={handleStop}
          onRemove={handleRemoveClick}
          emptyMessage="プロジェクトエージェントなし"
          testId="project-agent-list"
        />
      </div>

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

