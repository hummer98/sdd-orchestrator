/**
 * SpecDetailPage Component
 *
 * Task 5.1: SpecDetailPageのSpec/Artifactサブタブ構造を実装する
 * - SubTabBarを使用したSpec/Artifact切り替え
 * - activeSubTab状態管理
 * - 戻るボタン付きヘッダー
 * - onBackコールバックの接続
 *
 * Task 5.3: SpecタブにWorkflowAreaとWorkflowFooterを実装する
 * - SpecWorkflowArea（ワークフロー進捗表示、スクロール可能）
 * - shared/components/workflow/SpecWorkflowFooterの使用
 * - 自動実行ボタンの機能連携
 *
 * Task 5.4: SpecDetailPageのArtifactタブを実装する
 * - アーティファクトファイルタブの表示（RemoteArtifactEditor使用）
 * - 編集/閲覧機能（Desktop Webと同一のコンポーネント共有）
 *
 * Requirements: 3.1, 2.3, 3.2, 3.5, 3.6, 3.7
 * Design: SpecDetailPage component in design.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { SubTabBar } from './SubTabBar';
import { AgentDetailDrawer } from './AgentDetailDrawer';
import { RemoteArtifactEditor } from './RemoteArtifactEditor';
import { MobilePullToRefresh } from './MobilePullToRefresh';
import { RefreshButton } from './RefreshButton';
import { RemoteWorkflowView } from '../views/RemoteWorkflowView';
import { AgentList, type AgentItemInfo } from '@shared/components/agent';
import { useSharedAgentStore, type AgentInfo, type LogEntry } from '@shared/stores/agentStore';
import { useDeviceType } from '@shared/hooks/useDeviceType';
import type {
  ApiClient,
  SpecMetadataWithPath,
  SpecDetail,
} from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Sub-tab type for SpecDetailPage
 * 'spec' - Shows workflow phases and agent list
 * 'artifact' - Shows artifact editor
 */
export type SpecSubTab = 'spec' | 'artifact';

/**
 * SpecDetailPage Props
 * Matches design.md SpecDetailPageProps specification
 * Task 7.2, 7.3: Added refresh functionality
 */
export interface SpecDetailPageProps {
  /** Selected Spec metadata */
  spec: SpecMetadataWithPath;
  /** Spec detail information */
  specDetail: SpecDetail;
  /** API Client for data fetching */
  apiClient: ApiClient;
  /** Back button click callback */
  onBack: () => void;
  /** Callback to refresh agents (Task 7.2, 7.3: Req 5.2, 6.2) */
  onRefresh?: () => Promise<void>;
  /** Whether refresh is in progress (Task 7.2, 7.3: Req 5.4, 6.5) */
  isRefreshing?: boolean;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Tab Configuration
// =============================================================================

const SPEC_SUBTABS = [
  { id: 'spec', label: 'Spec' },
  { id: 'artifact', label: 'Artifact' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * SpecDetailPage - Spec detail display with Spec/Artifact sub-tabs
 *
 * Implements:
 * - Sub-tab navigation (Spec/Artifact) per Req 3.1
 * - Back button header per Req 2.3
 * - State-based sub-tab management
 */
export function SpecDetailPage({
  spec,
  specDetail,
  apiClient,
  onBack,
  onRefresh,
  isRefreshing = false,
  testId,
}: SpecDetailPageProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /**
   * Active sub-tab state (Req 3.1)
   * Defaults to 'spec' tab
   */
  const [activeSubTab, setActiveSubTab] = useState<SpecSubTab>('spec');

  // Task 7.2, 7.3: Device type detection for conditional UI
  const { isMobile } = useDeviceType();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle sub-tab change
   */
  const handleSubTabChange = useCallback((tabId: string) => {
    setActiveSubTab(tabId as SpecSubTab);
  }, []);

  /**
   * Handle refresh request (Task 7.2, 7.3)
   * Used by both MobilePullToRefresh and RefreshButton
   * Requirement 5.2, 6.2: Agent一覧再取得
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
      {/* Header with Back Button (Req 2.3) and RefreshButton (Task 7.3: Req 6.2) */}
      <header
        data-testid="spec-detail-header"
        className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <button
          data-testid="spec-detail-back-button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <FileText className="w-5 h-5 text-blue-500" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
          {spec.name}
        </h1>
        {/* Task 7.3: Desktop RefreshButton (Req 6.2, 6.4) - only shown on desktop */}
        {!isMobile && onRefresh && (
          <RefreshButton
            onRefresh={handleRefresh}
            isLoading={isRefreshing}
            testId="spec-refresh-button"
          />
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeSubTab === 'spec' ? (
            /* Task 7.2: Mobile版 MobilePullToRefresh wrapper (Req 5.2) */
            isMobile && onRefresh ? (
              <MobilePullToRefresh
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                testId="spec-pull-to-refresh"
              >
                <SpecTabContent
                  spec={spec}
                  specDetail={specDetail}
                  apiClient={apiClient}
                />
              </MobilePullToRefresh>
            ) : (
              <SpecTabContent
                spec={spec}
                specDetail={specDetail}
                apiClient={apiClient}
              />
            )
          ) : (
            <ArtifactTabContent
              spec={spec}
              specDetail={specDetail}
              apiClient={apiClient}
            />
          )}
        </div>

        {/* SubTabBar at Bottom (Req 3.1) */}
        <SubTabBar
          tabs={SPEC_SUBTABS}
          activeTab={activeSubTab}
          onTabChange={handleSubTabChange}
          testId="spec-detail-subtabs"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions (Task 5.2)
// =============================================================================

/**
 * Convert AgentInfo to AgentItemInfo format for AgentList component
 * Task 5.2: AgentList integration
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
// Sub-components (Task 5.2, 5.3, 5.4)
// =============================================================================

/**
 * SpecTabContent - Spec tab content with AgentList, WorkflowArea, and WorkflowFooter
 * Task 5.2: AgentList implementation
 * Task 5.3: WorkflowArea and WorkflowFooter implementation
 *
 * Requirements:
 * - 3.2: Spec tab structure (AgentList + WorkflowArea + WorkflowFooter)
 * - 3.3: Fixed 3-item height AgentList with independent scroll
 * - 3.4: AgentListItem tap opens AgentDetailDrawer
 * - 3.7: WorkflowFooter with auto-execution button
 */
interface SpecTabContentProps {
  spec: SpecMetadataWithPath;
  specDetail: SpecDetail;
  apiClient: ApiClient;
}

function SpecTabContent({
  spec,
  specDetail,
  apiClient,
}: SpecTabContentProps): React.ReactElement {
  // ---------------------------------------------------------------------------
  // State for AgentDetailDrawer (Task 5.2, Req 3.4)
  // ---------------------------------------------------------------------------

  /** Currently selected agent for drawer display */
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  /** Whether the drawer is open */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Agent Store Integration (Task 5.2)
  // ---------------------------------------------------------------------------

  /** Get agents map from the shared agent store */
  const agentsMap = useSharedAgentStore((state) => state.agents);

  /** Get agents for this spec from the agents map */
  const agents = useMemo(
    () => agentsMap.get(spec.name) ?? [],
    [agentsMap, spec.name]
  );

  /** Get logs map from the store */
  const logsMap = useSharedAgentStore((state) => state.logs);

  /** Get logs for the selected agent */
  const logs: LogEntry[] = useMemo(
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
  // Handlers (Task 5.2)
  // ---------------------------------------------------------------------------

  /**
   * Handle agent selection - opens AgentDetailDrawer (Req 3.4)
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
      data-testid="spec-tab-content"
      className="flex flex-col h-full"
    >
      {/* AgentList Area - Fixed 3-item height with independent scroll (Req 3.2, 3.3) */}
      <div
        data-testid="spec-agent-list-container"
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
          testId="spec-agent-list"
          className="p-2"
        />
      </div>

      {/* WorkflowArea - Scrollable workflow progress display (Task 5.3: Req 3.2) */}
      {/* Mobile版でもDesktop版と同じRemoteWorkflowViewを使用 */}
      {/* overflow-hiddenでWorkflowViewCore内部のスクロールを有効化 */}
      <div
        data-testid="spec-workflow-area"
        className="flex-1 overflow-hidden"
      >
        <RemoteWorkflowView
          apiClient={apiClient}
          spec={spec}
          specDetail={specDetail}
          disableFooterSafeArea
        />
      </div>

      {/* AgentDetailDrawer - Opens when agent is tapped (Req 3.4) */}
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
 * ArtifactTabContent - Artifact tab content with RemoteArtifactEditor
 * Task 5.4: SpecDetailPageのArtifactタブを実装する
 *
 * Requirements:
 * - 3.5: Artifact sub-tab displays artifact file tabs at the top with edit/view functionality
 * - 3.6: Artifact sub-tab's edit/view components shall be shared with Desktop Web implementation
 *
 * Implementation:
 * - Uses RemoteArtifactEditor component (shared with Desktop Web)
 * - Provides full artifact editing/viewing capabilities
 * - Passes spec and specDetail for tab generation (including dynamic review/inspection tabs)
 */
interface ArtifactTabContentProps {
  spec: SpecMetadataWithPath;
  specDetail: SpecDetail;
  apiClient: ApiClient;
}

function ArtifactTabContent({
  spec,
  specDetail,
  apiClient,
}: ArtifactTabContentProps): React.ReactElement {
  return (
    <div
      data-testid="artifact-tab-content"
      className="h-full flex flex-col"
    >
      {/* RemoteArtifactEditor - Shared component with Desktop Web (Req 3.5, 3.6) */}
      <RemoteArtifactEditor
        spec={spec}
        specDetail={specDetail}
        apiClient={apiClient}
        placeholder="Specを選択してドキュメントを表示"
        testId="remote-artifact-editor"
      />
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default SpecDetailPage;
