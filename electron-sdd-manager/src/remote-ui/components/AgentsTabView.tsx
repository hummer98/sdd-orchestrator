/**
 * AgentsTabView Component
 *
 * Task 7.1: AgentsTabViewコンポーネントを作成する
 * Task 7.2: AgentsTabViewにrunning Agentカウントを表示する
 * Task 7.3: AgentsTabViewにAskボタンを実装する
 * Requirements:
 * - 5.1: プロジェクトレベルAgent一覧の表示（ProjectAgentPanelと同等機能）
 * - 5.2: AgentListItemタップでAgentDetailDrawer表示
 * - 5.3: running Agentカウントをヘッダーまたはバッジに表示
 * - 5.4: Askボタン表示とAskAgentDialog連携
 *
 * Method: AgentsTabView
 *
 * This component displays project-level agents (agents with specId='') in the
 * Agents tab of the mobile layout. It integrates with AgentDetailDrawer to
 * show agent logs and allow additional instructions.
 *
 * Design: AgentsTabView component in design.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { AgentDetailDrawer } from './AgentDetailDrawer';
import { MobilePullToRefresh } from './MobilePullToRefresh';
import { RefreshButton } from './RefreshButton';
import { AgentList, type AgentItemInfo } from '@shared/components/agent';
import { AskAgentDialog } from '@shared/components/project';
import { useSharedAgentStore, type AgentInfo, type ParsedLogEntry } from '@shared/stores/agentStore';
import { useDeviceType } from '@shared/hooks/useDeviceType';
import type { ApiClient } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * AgentsTabView Props
 * Matches design.md AgentsTabViewProps specification
 * Task 7.1, 7.2, 7.3: Added refresh functionality
 */
export interface AgentsTabViewProps {
  /** API Client for agent operations */
  apiClient: ApiClient;
  /** Callback to refresh agents (Task 7.1: Req 4.2, 4.3) */
  onRefresh?: () => Promise<void>;
  /** Whether refresh is in progress (Task 7.1: Req 5.4, 6.5) */
  isRefreshing?: boolean;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert AgentInfo to AgentItemInfo format for AgentList component
 * Matches the pattern used in SpecDetailPage and BugDetailPage
 */
function mapAgentInfoToItemInfo(agent: AgentInfo): AgentItemInfo {
  return {
    agentId: agent.id,
    sessionId: agent.sessionId ?? '',
    phase: agent.phase,
    status: agent.status,
    startedAt: typeof agent.startedAt === 'number'
      ? new Date(agent.startedAt).toISOString()
      : agent.startedAt,
    lastActivityAt: agent.lastActivityAt ?? (typeof agent.startedAt === 'number'
      ? new Date(agent.startedAt).toISOString()
      : agent.startedAt),
  };
}

/**
 * Sort agents: running first, then by startedAt descending (newest first)
 * Matches ProjectAgentPanel sorting logic
 */
function sortAgents(agents: AgentInfo[]): AgentInfo[] {
  return [...agents].sort((a, b) => {
    // Running agents first
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (a.status !== 'running' && b.status === 'running') return 1;
    // Then by startedAt descending
    const timeA = new Date(a.startedAt as string).getTime();
    const timeB = new Date(b.startedAt as string).getTime();
    return timeB - timeA;
  });
}

// =============================================================================
// Component
// =============================================================================

/**
 * AgentsTabView - Agents tab view for mobile layout
 *
 * Displays project-level agents (agents not bound to a specific spec/bug).
 * Provides functionality equivalent to ProjectAgentPanel in Electron renderer.
 *
 * Features:
 * - Project agent list display (Req 5.1)
 * - AgentDetailDrawer integration on tap (Req 5.2)
 * - Running agent count display in header badge (Req 5.3)
 * - Agent sorting (running first, then by startedAt)
 */
export function AgentsTabView({
  apiClient,
  onRefresh,
  isRefreshing = false,
  testId = 'agents-tab-view',
}: AgentsTabViewProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** Currently selected agent for drawer display */
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  /** Whether the drawer is open */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  /** Whether the AskAgentDialog is open (Req 5.4) */
  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);

  // Task 7.1: Device type detection for conditional UI
  const { isMobile } = useDeviceType();

  // ---------------------------------------------------------------------------
  // Agent Store Integration
  // ---------------------------------------------------------------------------

  /** Get agents map from the shared agent store */
  const agentsMap = useSharedAgentStore((state) => state.agents);

  /**
   * Get project-level agents (specId = '' or empty)
   * Project agents are agents not bound to any specific spec/bug
   * Requirement 5.1
   */
  const projectAgents = useMemo(() => {
    const agents = agentsMap.get('') ?? [];
    return sortAgents(agents);
  }, [agentsMap]);

  /** Get logs map from the store */
  const logsMap = useSharedAgentStore((state) => state.logs);

  /** Get logs for the selected agent (main-process-log-parser: now ParsedLogEntry[]) */
  const logs: ParsedLogEntry[] = useMemo(
    () => selectedAgent ? (logsMap.get(selectedAgent.id) ?? []) : [],
    [logsMap, selectedAgent]
  );

  /** Selected agent ID from store */
  const selectedAgentId = useSharedAgentStore((state) => state.selectedAgentId);

  /** Convert agents to AgentItemInfo format for AgentList */
  const agentItems: AgentItemInfo[] = useMemo(
    () => projectAgents.map(mapAgentInfoToItemInfo),
    [projectAgents]
  );

  /**
   * Count of running agents
   * Requirement 5.3: Display running agent count in header badge
   * Automatically updates when agent status changes via store subscription
   */
  const runningCount = useMemo(
    () => projectAgents.filter((agent) => agent.status === 'running').length,
    [projectAgents]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle agent selection - opens AgentDetailDrawer
   * Requirement 5.2
   */
  const handleSelectAgent = useCallback((agentId: string) => {
    const agent = projectAgents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setIsDrawerOpen(true);
      useSharedAgentStore.getState().selectAgent(agentId);
    }
  }, [projectAgents]);

  /**
   * Handle agent stop request
   */
  const handleStopAgent = useCallback(async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    await apiClient.stopAgent(agentId);
  }, [apiClient]);

  /**
   * Handle agent remove request
   */
  const handleRemoveAgent = useCallback((e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    useSharedAgentStore.getState().removeAgent(agentId);
  }, []);

  /**
   * Close the AgentDetailDrawer
   */
  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedAgent(null);
  }, []);

  /**
   * Send additional instruction to the selected agent
   */
  const handleSendInstruction = useCallback(async (instruction: string) => {
    if (!selectedAgent) return;
    await apiClient.sendAgentInput(selectedAgent.id, instruction);
  }, [selectedAgent, apiClient]);

  /**
   * Continue the selected agent execution
   */
  const handleContinue = useCallback(async () => {
    if (!selectedAgent) return;
    await apiClient.resumeAgent(selectedAgent.id);
  }, [selectedAgent, apiClient]);

  // ---------------------------------------------------------------------------
  // Ask Button Handlers (Req 5.4, Task 7.3)
  // ---------------------------------------------------------------------------

  /**
   * Open the AskAgentDialog
   * Requirement 5.4: Askボタン表示
   */
  const handleAskClick = useCallback(() => {
    setIsAskDialogOpen(true);
  }, []);

  /**
   * Execute project-level prompt
   * Requirement 5.4: プロジェクトレベルプロンプト実行機能
   * release-button-api-fix: executeAskProject is optional (deprecated, kept for backward compatibility)
   */
  const handleAskExecute = useCallback(async (prompt: string) => {
    try {
      if (!apiClient.executeAskProject) {
        console.warn('executeAskProject is not available');
        setIsAskDialogOpen(false);
        return;
      }
      const result = await apiClient.executeAskProject(prompt);
      if (result.ok) {
        // Add the new agent to the store with empty specId (project-level)
        const newAgent = result.value;
        useSharedAgentStore.getState().addAgent('', newAgent);
        useSharedAgentStore.getState().selectAgent(newAgent.id);
      }
      // Close dialog after execution (regardless of success/failure)
      setIsAskDialogOpen(false);
    } catch {
      // Close dialog even on error
      setIsAskDialogOpen(false);
    }
  }, [apiClient]);

  /**
   * Close the AskAgentDialog
   */
  const handleAskCancel = useCallback(() => {
    setIsAskDialogOpen(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Refresh Handler (Task 7.1, 7.2, 7.3)
  // ---------------------------------------------------------------------------

  /**
   * Handle refresh request
   * Used by both MobilePullToRefresh and RefreshButton
   * Requirement 4.2, 4.3: Agent一覧再取得
   */
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  /**
   * Agent List Content (extracted for reuse)
   * Task 7.2: Used by both mobile and desktop views
   */
  const agentListContent = (
    <div className="flex-1 overflow-y-auto p-2">
      <AgentList
        agents={agentItems}
        selectedAgentId={selectedAgentId}
        onSelect={handleSelectAgent}
        onStop={handleStopAgent}
        onRemove={handleRemoveAgent}
        emptyMessage="プロジェクトエージェントなし"
        testId="project-agent-list"
      />
    </div>
  );

  return (
    <div
      data-testid={testId}
      className="flex flex-col h-full bg-white dark:bg-gray-900"
    >
      {/* Header with Agent count, running badge, refresh button, and Ask button (Req 5.3, 5.4, 4.3) */}
      <div
        data-testid={`${testId}-header`}
        className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
      >
        <Bot className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Project Agent
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ({projectAgents.length})
        </span>
        {/* Running agent count badge - only shown when there are running agents */}
        {runningCount > 0 && (
          <span
            data-testid={`${testId}-running-count`}
            className="px-2 py-0.5 text-xs font-medium text-white bg-green-500 rounded-full"
          >
            {runningCount}
          </span>
        )}
        {/* Spacer to push buttons to the right */}
        <div className="flex-1" />
        {/* Task 7.3: Desktop Refresh Button (Req 4.3, 6.5) - only shown on desktop */}
        {!isMobile && onRefresh && (
          <RefreshButton
            onRefresh={handleRefresh}
            isLoading={isRefreshing}
            testId="agents-refresh-button"
          />
        )}
        {/* Ask Button - Req 5.4 */}
        <button
          onClick={handleAskClick}
          className={clsx(
            'p-1 rounded-md transition-colors',
            'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30'
          )}
          title="Askを実行"
          aria-label="Project Askを実行"
          data-testid="project-ask-button"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Task 7.1, 7.2: Agent List with conditional Pull-to-Refresh for mobile (Req 4.2, 5.4) */}
      {isMobile && onRefresh ? (
        <MobilePullToRefresh
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          testId="agents-pull-to-refresh"
        >
          {agentListContent}
        </MobilePullToRefresh>
      ) : (
        agentListContent
      )}

      {/* AgentDetailDrawer - Opens when agent is tapped (Req 5.2) */}
      {selectedAgent && (
        <AgentDetailDrawer
          agent={selectedAgent}
          logs={logs}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onSendInstruction={handleSendInstruction}
          onContinue={handleContinue}
          testId="agent-detail-drawer"
        />
      )}

      {/* AskAgentDialog - Opens when Ask button is clicked (Req 5.4) */}
      <AskAgentDialog
        isOpen={isAskDialogOpen}
        agentType="project"
        onExecute={handleAskExecute}
        onCancel={handleAskCancel}
      />
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default AgentsTabView;
