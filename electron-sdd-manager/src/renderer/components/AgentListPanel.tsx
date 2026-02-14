/**
 * AgentListPanel Component
 * Displays list of SDD Agents for the selected spec or bug
 * Task 30.1-30.3: Agent list UI, continue button, stop button
 * Requirements: 5.1, 5.2, 5.7, 5.8
 * Bug fix: agent-list-panel-dry-violation - Props化による統合
 * git-worktree-support Task 5.1: Worktree indicator display (Requirements: 4.1, 4.2)
 */

import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Bot, GitBranch, MessageSquare } from 'lucide-react';
import { useAgentStore, type AgentInfo as RendererAgentInfo } from '../stores/agentStore';
import { useAgentsBySpec } from '@shared/hooks';
import { notify } from '../stores';
import { clsx } from 'clsx';
import { AskAgentDialog } from '@shared/components/project';
import { AgentList, type AgentItemInfo } from '@shared/components/agent';
import type { AgentInfo as SharedAgentInfo } from '@shared/api/types';
// trpc-full-migration Task 5.3: Use tRPC vanilla client for spec operations
import { getVanillaClient } from '../../shared/trpc/vanillaClient';

// =============================================================================
// Type Mapping
// =============================================================================

/**
 * zustand-agent-selector-hooks: Map shared AgentInfo to AgentItemInfo
 * Hook returns shared AgentInfo, convert to AgentItemInfo for AgentList component
 */
function mapAgentInfoToItemInfo(agent: SharedAgentInfo): AgentItemInfo {
  const startedAt = typeof agent.startedAt === 'number'
    ? new Date(agent.startedAt).toISOString()
    : agent.startedAt as string;
  return {
    agentId: agent.agentId,
    sessionId: agent.sessionId || '',
    phase: agent.phase,
    status: agent.status,
    startedAt,
    lastActivityAt: agent.lastActivityAt || startedAt,
  };
}

// =============================================================================
// Component Props
// =============================================================================

interface AgentListPanelProps {
  /** specId for filtering agents (spec name or 'bug:{bugName}') */
  specId: string;
  /** Spec/feature name for display and Spec Ask */
  specName?: string;
  /** data-testid attribute */
  testId?: string;
  /** Whether this is a bug panel (no Ask button for bugs) */
  isBugPanel?: boolean;
  /**
   * Worktree path if spec is in worktree mode
   * Requirements: 4.1, 4.2 (git-worktree-support)
   */
  worktreePath?: string | null;
}

export function AgentListPanel({ specId, specName, testId = 'agent-list-panel', isBugPanel = false, worktreePath }: AgentListPanelProps) {
  // zustand-selector-optimization: useShallow for state fields, individual selectors for actions
  const { selectedAgentId, agents, skipPermissions } = useAgentStore(
    useShallow(s => ({ selectedAgentId: s.selectedAgentId, agents: s.agents, skipPermissions: s.skipPermissions }))
  );
  const stopAgent = useAgentStore(s => s.stopAgent);
  const selectAgent = useAgentStore(s => s.selectAgent);
  const getAgentById = useAgentStore(s => s.getAgentById);
  const removeAgent = useAgentStore(s => s.removeAgent);
  const loadAgents = useAgentStore(s => s.loadAgents);
  const setSkipPermissions = useAgentStore(s => s.setSkipPermissions);
  const addAgent = useAgentStore(s => s.addAgent);
  // zustand-agent-selector-hooks: Use SharedAgentInfo since filteredAgents returns shared type
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState<SharedAgentInfo | null>(null);
  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);

  /**
   * zustand-agent-selector-hooks Task 5.2: Use useAgentsBySpec hook
   * Requirements: 4.3 - Replace getAgentsForSpec with hook
   * Hook returns agents sorted (running first, then by startedAt descending)
   */
  const filteredAgents = useAgentsBySpec(specId);

  // Load agents when component mounts or when agents map is empty
  useEffect(() => {
    if (agents.size === 0) {
      loadAgents();
    }
  }, [agents.size, loadAgents]);

  /**
   * zustand-agent-selector-hooks Task 5.2: Auto-select using hook result
   * Requirements: 4.3 - Use filteredAgents from useAgentsBySpec hook
   */
  useEffect(() => {
    if (!specId) return;

    // Skip auto-select if a project agent is currently selected
    // (Project agents have specId === '')
    if (selectedAgentId) {
      const currentAgent = getAgentById(selectedAgentId);
      if (currentAgent && currentAgent.specId === '') return;
    }

    // If an agent is already selected for this spec/bug, don't auto-select
    const currentSelectedAgent = filteredAgents.find(a => a.agentId === selectedAgentId);
    if (currentSelectedAgent) return;

    // Only auto-select if there's a running agent
    const runningAgent = filteredAgents.find(a => a.status === 'running');
    if (runningAgent) {
      selectAgent(runningAgent.agentId);
    } else if (filteredAgents.length === 0) {
      // Clear selection when moving to a spec with no agents
      // This prevents stale agent logs from previous spec being displayed
      selectAgent(null);
    }
  }, [specId, selectedAgentId, filteredAgents, getAgentById, selectAgent]);

  if (!specId) {
    return null;
  }

  const handleStop = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await stopAgent(agentId);
  };

  const handleRemoveClick = (agent: SharedAgentInfo, e: React.MouseEvent) => {
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

  // Spec Ask handlers
  const handleAskClick = () => {
    setIsAskDialogOpen(true);
  };

  const handleAskExecute = async (prompt: string) => {
    const featureName = specName || specId;

    try {
      // trpc-full-migration Task 5.3: Use tRPC for executeAskSpec
      // trpc-full-migration: Cast to AgentInfo (tRPC infers wider AgentStatus from server-side type)
      const agentInfo = await getVanillaClient().spec.executeAskSpec.mutate({
        specId,
        featureName,
        question: prompt,
      }) as unknown as RendererAgentInfo;
      addAgent(specId, agentInfo);
      selectAgent(agentInfo.agentId);
      notify.success('Spec Askを開始しました');
      setIsAskDialogOpen(false);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Spec Askの実行に失敗しました');
    }
  };

  const handleAskCancel = () => {
    setIsAskDialogOpen(false);
  };

  // Determine if Ask button should be shown (not for bugs)
  const showAskButton = !isBugPanel && specId && !specId.startsWith('bug:');

  return (
    <div data-testid={testId} className="h-full flex flex-col p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Agent一覧
        </h3>
        {filteredAgents.length > 0 && (
          <span className="text-xs text-gray-400">
            ({filteredAgents.length})
          </span>
        )}
        {/* Worktree indicator (git-worktree-support Task 5.1) */}
        {worktreePath && (
          <span
            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400"
            title={`Worktree: ${worktreePath}`}
            data-testid="worktree-indicator"
          >
            <GitBranch className="w-3 h-3" />
            <span className="hidden sm:inline">worktree</span>
          </span>
        )}
        <label
          className="ml-auto flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
          title="--dangerously-skip-permissions オプションを有効化"
        >
          <input
            type="checkbox"
            checked={skipPermissions}
            onChange={(e) => setSkipPermissions(e.target.checked)}
            className="w-3 h-3 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            aria-label="Skip Permissions"
          />
          <span className="select-none">Skip Permissions (非推奨)</span>
        </label>
        {/* Ask Button */}
        {showAskButton && (
          <button
            onClick={handleAskClick}
            className={clsx(
              'p-1 rounded-md transition-colors',
              'text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30'
            )}
            title="Spec Askを実行"
            aria-label="Spec Askを実行"
            data-testid="spec-ask-button"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      <AgentList
        agents={filteredAgents.map(mapAgentInfoToItemInfo)}
        selectedAgentId={selectedAgentId}
        onSelect={(agentId) => selectAgent(agentId)}
        onStop={(e, agentId) => handleStop(agentId, e)}
        onRemove={(e, agentId) => {
          const agent = filteredAgents.find(a => a.agentId === agentId);
          if (agent) handleRemoveClick(agent, e);
        }}
        className="flex-1 overflow-y-auto"
      />

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
      {showAskButton && (
        <AskAgentDialog
          isOpen={isAskDialogOpen}
          agentType="spec"
          specName={specName || specId}
          onExecute={handleAskExecute}
          onCancel={handleAskCancel}
        />
      )}
    </div>
  );
}

