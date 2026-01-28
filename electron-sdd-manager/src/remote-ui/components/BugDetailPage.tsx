/**
 * BugDetailPage Component
 *
 * Task 6.1: BugDetailPageのBug/Artifactサブタブ構造を実装する
 * - SubTabBarを使用したBug/Artifact切り替え
 * - activeSubTab状態管理
 * - 戻るボタン付きヘッダー
 * - onBackコールバックの接続
 *
 * Task 6.2: BugタブにAgentList（固定3項目高さ）を実装する
 * - 固定高さ（3項目分、h-36相当）のAgentListエリア
 * - overflow-y-autoによる独立スクロール
 * - AgentListItemのタップでAgentDetailDrawer表示
 * - BugのAgent一覧取得
 *
 * Task 6.3: BugタブにWorkflowAreaとBugWorkflowFooterを実装する
 * - BugWorkflowArea（ワークフロー進捗表示、スクロール可能）
 * - shared/components/bug/BugWorkflowFooterの使用
 * - 自動実行ボタン、Worktree変換ボタンの機能連携
 *
 * Requirements: 4.1, 2.3, 4.2, 4.3, 4.4, 4.6
 * Design: BugDetailPage component in design.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Bug } from 'lucide-react';
import { SubTabBar } from './SubTabBar';
import { AgentDetailDrawer } from './AgentDetailDrawer';
// Task 6.4: Import RemoteBugArtifactEditor for Artifact tab (Req 4.5)
import { RemoteBugArtifactEditor } from './RemoteBugArtifactEditor';
import { MobilePullToRefresh } from './MobilePullToRefresh';
import { RefreshButton } from './RefreshButton';
import { AgentList, type AgentItemInfo } from '@shared/components/agent';
// Task 6.3: Import BugWorkflowFooter for Bug tab (Req 4.6)
import { BugWorkflowFooter } from '@shared/components/bug';
import { useSharedAgentStore, type AgentInfo, type ParsedLogEntry } from '@shared/stores/agentStore';
import { useDeviceType } from '@shared/hooks/useDeviceType';
import type {
  ApiClient,
  BugMetadataWithPath,
  BugDetail,
} from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Sub-tab type for BugDetailPage
 * 'bug' - Shows workflow phases and agent list
 * 'artifact' - Shows artifact editor
 */
export type BugSubTab = 'bug' | 'artifact';

/**
 * BugDetailPage Props
 * Matches design.md BugDetailPageProps specification
 * Task 6.3: Added auto-execution and worktree props (Req 4.2, 4.6)
 * Task 8.2, 8.3: Added refresh functionality (Req 5.3, 6.3)
 */
export interface BugDetailPageProps {
  /** Selected Bug metadata */
  bug: BugMetadataWithPath;
  /** Bug detail information */
  bugDetail: BugDetail;
  /** API Client for data fetching */
  apiClient: ApiClient;
  /** Back button click callback */
  onBack: () => void;
  /** Auto execution status (Task 6.3: Req 4.6) */
  isAutoExecuting?: boolean;
  /** Auto execution toggle callback (Task 6.3: Req 4.6) */
  onAutoExecution?: () => void;
  /** Whether any agents are currently running (for button disable state) */
  hasRunningAgents?: boolean;
  /** Whether current branch is main/master (Task 6.3: Req 4.6) */
  isOnMain?: boolean;
  /** Callback for convert to worktree button click (Task 6.3: Req 4.6) */
  onConvertToWorktree?: () => void;
  /** Whether worktree conversion is in progress (Task 6.3: Req 4.6) */
  isConverting?: boolean;
  /** Callback to refresh agents (Task 8.2, 8.3: Req 5.3, 6.3) */
  onRefresh?: () => Promise<void>;
  /** Whether refresh is in progress (Task 8.2, 8.3: Req 5.4, 6.5) */
  isRefreshing?: boolean;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Tab Configuration
// =============================================================================

const BUG_SUBTABS = [
  { id: 'bug', label: 'Bug' },
  { id: 'artifact', label: 'Artifact' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * BugDetailPage - Bug detail display with Bug/Artifact sub-tabs
 *
 * Implements:
 * - Sub-tab navigation (Bug/Artifact) per Req 4.1
 * - Back button header per Req 2.3
 * - State-based sub-tab management
 */
export function BugDetailPage({
  bug,
  bugDetail,
  apiClient,
  onBack,
  isAutoExecuting = false,
  onAutoExecution,
  hasRunningAgents = false,
  isOnMain = false,
  onConvertToWorktree,
  isConverting = false,
  onRefresh,
  isRefreshing = false,
  testId,
}: BugDetailPageProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /**
   * Active sub-tab state (Req 4.1)
   * Defaults to 'bug' tab
   */
  const [activeSubTab, setActiveSubTab] = useState<BugSubTab>('bug');

  // Task 8.2, 8.3: Device type detection for conditional UI
  const { isMobile } = useDeviceType();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle sub-tab change
   */
  const handleSubTabChange = useCallback((tabId: string) => {
    setActiveSubTab(tabId as BugSubTab);
  }, []);

  /**
   * Handle refresh request (Task 8.2, 8.3)
   * Used by both MobilePullToRefresh and RefreshButton
   * Requirement 5.3, 6.3: Agent一覧再取得
   */
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid={testId}
      className="flex flex-col h-full bg-white dark:bg-gray-900"
    >
      {/* Header with Back Button (Req 2.3) and RefreshButton (Task 8.3: Req 6.3) */}
      <header
        data-testid="bug-detail-header"
        className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <button
          data-testid="bug-detail-back-button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <Bug className="w-5 h-5 text-red-500" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
          {bug.name}
        </h1>
        {/* Task 8.3: Desktop RefreshButton (Req 6.3, 6.4) - only shown on desktop */}
        {!isMobile && onRefresh && (
          <RefreshButton
            onRefresh={handleRefresh}
            isLoading={isRefreshing}
            testId="bug-refresh-button"
          />
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeSubTab === 'bug' ? (
            /* Task 8.2: Mobile版 MobilePullToRefresh wrapper (Req 5.3) */
            isMobile && onRefresh ? (
              <MobilePullToRefresh
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                testId="bug-pull-to-refresh"
              >
                <BugTabContent
                  bug={bug}
                  bugDetail={bugDetail}
                  apiClient={apiClient}
                  isAutoExecuting={isAutoExecuting}
                  onAutoExecution={onAutoExecution}
                  hasRunningAgents={hasRunningAgents}
                  isOnMain={isOnMain}
                  onConvertToWorktree={onConvertToWorktree}
                  isConverting={isConverting}
                />
              </MobilePullToRefresh>
            ) : (
              <BugTabContent
                bug={bug}
                bugDetail={bugDetail}
                apiClient={apiClient}
                isAutoExecuting={isAutoExecuting}
                onAutoExecution={onAutoExecution}
                hasRunningAgents={hasRunningAgents}
                isOnMain={isOnMain}
                onConvertToWorktree={onConvertToWorktree}
                isConverting={isConverting}
              />
            )
          ) : (
            <BugArtifactTabContent
              bug={bug}
              bugDetail={bugDetail}
              apiClient={apiClient}
            />
          )}
        </div>

        {/* SubTabBar at Bottom (Req 4.1) */}
        <SubTabBar
          tabs={BUG_SUBTABS}
          activeTab={activeSubTab}
          onTabChange={handleSubTabChange}
          testId="bug-detail-subtabs"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions (Task 6.2)
// =============================================================================

/**
 * Convert AgentInfo to AgentItemInfo format for AgentList component
 * Task 6.2: AgentList integration
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

// =============================================================================
// Sub-components (Task 6.2, 6.3, 6.4)
// =============================================================================

/**
 * BugTabContent - Bug tab content with AgentList, WorkflowArea, and BugWorkflowFooter
 * Task 6.2: AgentList implementation
 * Task 6.3: WorkflowArea and BugWorkflowFooter implementation
 *
 * Requirements:
 * - 4.2: Bug tab structure (AgentList + WorkflowArea + BugWorkflowFooter)
 * - 4.3: Fixed 3-item height AgentList with independent scroll
 * - 4.4: AgentListItem tap opens AgentDetailDrawer
 * - 4.6: BugWorkflowFooter with auto-execution and worktree conversion
 */
interface BugTabContentProps {
  bug: BugMetadataWithPath;
  bugDetail: BugDetail;
  apiClient: ApiClient;
  /** Auto execution status (Task 6.3: Req 4.6) */
  isAutoExecuting?: boolean;
  /** Auto execution toggle callback (Task 6.3: Req 4.6) */
  onAutoExecution?: () => void;
  /** Whether any agents are currently running */
  hasRunningAgents?: boolean;
  /** Whether current branch is main/master (Task 6.3: Req 4.6) */
  isOnMain?: boolean;
  /** Callback for convert to worktree button click (Task 6.3: Req 4.6) */
  onConvertToWorktree?: () => void;
  /** Whether worktree conversion is in progress (Task 6.3: Req 4.6) */
  isConverting?: boolean;
}

function BugTabContent({
  bug,
  bugDetail,
  apiClient,
  isAutoExecuting = false,
  onAutoExecution,
  hasRunningAgents = false,
  isOnMain = false,
  onConvertToWorktree,
  isConverting = false,
}: BugTabContentProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // State for AgentDetailDrawer (Task 6.2, Req 4.4)
  // ---------------------------------------------------------------------------

  /** Currently selected agent for drawer display */
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  /** Whether the drawer is open */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Agent Store Integration (Task 6.2)
  // ---------------------------------------------------------------------------

  /** Get agents map from the shared agent store */
  const agentsMap = useSharedAgentStore((state) => state.agents);

  /** Get agents for this bug from the agents map */
  const agents = useMemo(
    () => agentsMap.get(bug.name) ?? [],
    [agentsMap, bug.name]
  );

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
    () => agents.map(mapAgentInfoToItemInfo),
    [agents]
  );

  // ---------------------------------------------------------------------------
  // Handlers (Task 6.2)
  // ---------------------------------------------------------------------------

  /**
   * Handle agent selection - opens AgentDetailDrawer (Req 4.4)
   */
  const handleSelectAgent = useCallback((agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setIsDrawerOpen(true);
      useSharedAgentStore.getState().selectAgent(agentId);
    }
  }, [agents]);

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
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="bug-tab-content"
      className="flex flex-col h-full"
    >
      {/* AgentList Area - Fixed 3-item height with independent scroll (Req 4.2, 4.3) */}
      <div
        data-testid="bug-agent-list-container"
        className="h-36 overflow-y-auto shrink-0 border-b border-gray-200 dark:border-gray-700"
      >
        <AgentList
          agents={agentItems}
          selectedAgentId={selectedAgentId}
          onSelect={handleSelectAgent}
          onStop={handleStopAgent}
          onRemove={handleRemoveAgent}
          emptyMessage="Agentはありません"
          showHeader
          headerTitle="Agents"
          testId="bug-agent-list"
          className="p-2"
        />
      </div>

      {/* WorkflowArea - Scrollable workflow progress display (Task 6.3: Req 4.2) */}
      <div
        data-testid="bug-workflow-area"
        className="flex-1 overflow-y-auto p-4"
      >
        {/* Workflow progress will be rendered here */}
        {/* For now, show bug phase status */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Phase:</span> {bugDetail.metadata.phase ?? 'unknown'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Updated:</span> {bugDetail.metadata.updatedAt ?? 'unknown'}
          </div>
        </div>
      </div>

      {/* BugWorkflowFooter with auto-execution and worktree conversion (Task 6.3: Req 4.6) */}
      <BugWorkflowFooter
        isAutoExecuting={isAutoExecuting}
        hasRunningAgents={hasRunningAgents}
        onAutoExecution={onAutoExecution ?? (() => {})}
        isOnMain={isOnMain}
        bugJson={bugDetail.metadata ? {
          bug_name: bugDetail.metadata.name,
          created_at: bugDetail.metadata.reportedAt ?? bugDetail.metadata.updatedAt,
          updated_at: bugDetail.metadata.updatedAt,
          worktree: bugDetail.metadata.worktree,
        } : null}
        onConvertToWorktree={onConvertToWorktree ?? (() => {})}
        isConverting={isConverting}
      />

      {/* AgentDetailDrawer - Opens when agent is tapped (Req 4.4) */}
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
    </div>
  );
}

/**
 * BugArtifactTabContent - Artifact tab content with RemoteBugArtifactEditor
 * Task 6.4: BugDetailPageのArtifactタブを実装する
 *
 * Requirements:
 * - 4.5: Artifact sub-tab displays artifact file tabs (report.md, analysis.md, fix.md, verification.md)
 *        with edit/view functionality (same as SpecArtifactTab)
 *
 * Implementation:
 * - Uses RemoteBugArtifactEditor component (similar pattern to SpecDetailPage's ArtifactTabContent)
 * - Provides full artifact editing/viewing capabilities for bug documents
 * - Passes bug and bugDetail for artifact tab generation
 */
interface BugArtifactTabContentProps {
  bug: BugMetadataWithPath;
  bugDetail: BugDetail;
  apiClient: ApiClient;
}

function BugArtifactTabContent({
  bug,
  bugDetail,
  apiClient,
}: BugArtifactTabContentProps): React.ReactElement {
  return (
    <div
      data-testid="bug-artifact-tab-content"
      className="h-full flex flex-col"
    >
      {/* RemoteBugArtifactEditor - Bug artifact editor (Req 4.5) */}
      <RemoteBugArtifactEditor
        bug={bug}
        bugDetail={bugDetail}
        apiClient={apiClient}
        placeholder="Bugを選択してドキュメントを表示"
        testId="remote-bug-artifact-editor"
      />
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default BugDetailPage;
