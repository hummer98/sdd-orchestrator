/**
 * Remote UI Root Application Component
 *
 * Design Principle: DesktopLayoutはElectron版のレイアウトに準拠する
 * See: .kiro/steering/tech.md - Remote UI DesktopLayout設計原則
 *
 * Layout Structure (matching Electron App.tsx):
 * - Header: タイトル、プロジェクト名、ProfileBadge、接続状態 (DesktopLayout内蔵)
 * - Left Sidebar: Specs/Issuesタブ切り替え、一覧表示
 * - Main Panel: Artifact表示、ドキュメントタブ
 * - Right Sidebar: ワークフローパネル、Agent一覧
 * - Footer: Agentログエリア
 */

import { useState, useCallback, useEffect } from 'react';
import { ApiClientProvider, useApi } from '../shared/api';
import { PlatformProvider } from '../shared/providers';
import { useDeviceType } from '../shared/hooks/useDeviceType';
import { MobileLayout, DesktopLayout, type MobileTab as LayoutMobileTab } from './layouts';
import { SpecsView, RemoteWorkflowView, ProjectView } from './views';
import { ProjectDetailPage } from './components/ProjectDetailPage';
import { RemoteProjectEditor } from './components/RemoteProjectEditor';
import { AgentsTabView } from './components/AgentsTabView';
import { ToastContainer } from './components/ToastContainer';
import { RefreshButton } from './components/RefreshButton';
import { RemoteArtifactEditor } from './components/RemoteArtifactEditor';
import { SpecDetailPage } from './components/SpecDetailPage';
import { AgentLogPage } from './components/AgentLogPage';
import { SpecWorkflowFooter } from '../shared/components/workflow';
import { AgentList, type AgentItemInfo, type AgentItemStatus, AgentLogPanel, type AgentLogInfo } from '../shared/components/agent';
import { AskAgentDialog } from '../shared/components/project';
// github-issue-integration: Task 12.2 - Import IssuePane from shared components
import { IssuePane } from '../shared/components/issue';
import { useSharedAgentStore } from '../shared/stores/agentStore';
import { useProjectAgents } from '../shared/hooks';
import { ResizeHandle } from '../shared/components/ui';
import { Bot, Plus, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { CreateSpecDialogRemote } from './components/CreateSpecDialogRemote';
// github-issue-integration: Task 12.3 - Issue creation dialog for Remote UI
import { CreateIssueDialogRemote } from './components/CreateIssueDialogRemote';
import type { SpecMetadataWithPath, SpecDetail, AutoExecutionOptions, AgentInfo as SharedAgentInfo, AgentStatus, ProjectFileInfo } from '../shared/api/types';

// mobile-agent-log-fullscreen: Re-export for local use
type AgentInfo = SharedAgentInfo;
// trpc-infrastructure: TRPCProvider for tRPC React hooks structure (Requirements 4.6)
import { TRPCProvider } from '../shared/trpc/provider';
import { useNavigationStack } from './hooks/useNavigationStack';
import { useAgentStoreInit } from './hooks/useAgentStoreInit';
// agent-log-store-unification Task 3.1: Shared log subscription hook
import { useAgentLogSubscription } from '../shared/hooks/useAgentLogSubscription';

// =============================================================================
// Types
// =============================================================================

// project-config-editor Task 8.1: Extended DocsTab to include 'project'
// github-issue-integration Task 12.2: Replaced 'bugs' with 'issues'
type DocsTab = 'specs' | 'issues' | 'project';

// =============================================================================
// Helper Functions for Project Agent
// =============================================================================

function mapAgentStatus(status: AgentStatus): AgentItemStatus {
  switch (status) {
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'interrupted':
      return 'interrupted';
    case 'hang':
      return 'hang';
    case 'failed':
      return 'failed';
    default:
      return 'completed';
  }
}

function mapAgentInfoToItemInfo(agent: AgentInfo): AgentItemInfo {
  const startedAt = typeof agent.startedAt === 'number'
    ? new Date(agent.startedAt).toISOString()
    : agent.startedAt;
  const endedAt = agent.endedAt
    ? (typeof agent.endedAt === 'number' ? new Date(agent.endedAt).toISOString() : agent.endedAt)
    : startedAt;

  return {
    agentId: agent.agentId,
    sessionId: agent.specId,
    phase: agent.phase,
    status: mapAgentStatus(agent.status),
    startedAt,
    lastActivityAt: endedAt,
  };
}

// =============================================================================
// Left Sidebar Component - Spec/Issuesタブ + 一覧
// =============================================================================

// Dialog type for create dialogs
// github-issue-integration Task 12.2: Replaced 'bug' with 'issue'
type CreateDialogType = 'spec' | 'issue' | null;

// Project Agent Panel height constraints (Electron parity)
const PROJECT_AGENT_PANEL_MIN = 80;
const PROJECT_AGENT_PANEL_MAX = 300;
const PROJECT_AGENT_PANEL_DEFAULT = 160;

interface LeftSidebarProps {
  activeTab: DocsTab;
  onTabChange: (tab: DocsTab) => void;
  selectedSpecId?: string;
  /** project-config-editor Task 8.1: Selected project file path */
  selectedProjectFilePath?: string;
  onSelectSpec: (spec: SpecMetadataWithPath) => void;
  /** project-config-editor Task 8.1: Handler for project file selection */
  onSelectProjectFile?: (file: ProjectFileInfo) => void;
  deviceType: 'desktop' | 'smartphone';
  /** Task 7.3: Callback to refresh agents (Req 4.3) */
  onRefreshAgents?: () => Promise<void>;
  /** Task 7.3: Whether refresh is in progress (Req 6.5) */
  isRefreshingAgents?: boolean;
  /** github-issue-integration Task 12.2: Project path for IssuePane */
  projectPath?: string;
}

function LeftSidebar({
  activeTab,
  onTabChange,
  selectedSpecId,
  selectedProjectFilePath,
  onSelectSpec,
  onSelectProjectFile,
  deviceType,
  onRefreshAgents,
  isRefreshingAgents = false,
  projectPath,
}: LeftSidebarProps) {
  const apiClient = useApi();

  /**
   * zustand-agent-selector-hooks Task 4.1: Use useProjectAgents hook
   * Requirements: 3.1 - use useProjectAgents() hook instead of getAgentsForSpec('')
   * - Hook returns sorted agents (running first, then by startedAt descending)
   * - Hook reactively subscribes to agents Map changes
   */
  // zustand-selector-optimization: individual selectors
  const selectAgent = useSharedAgentStore(s => s.selectAgent);
  const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);
  const removeAgent = useSharedAgentStore(s => s.removeAgent);
  const projectAgents = useProjectAgents();

  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);

  // Create dialog state (Task 3.1)
  const [createDialogType, setCreateDialogType] = useState<CreateDialogType>(null);

  // Project Agent Panel height state (Electron parity - ResizeHandle support)
  const [projectAgentPanelHeight, setProjectAgentPanelHeight] = useState(PROJECT_AGENT_PANEL_DEFAULT);

  // Resize handler for Project Agent Panel (上方向にリサイズ = deltaを反転)
  const handleProjectAgentPanelResize = useCallback((delta: number) => {
    setProjectAgentPanelHeight((prev) =>
      Math.min(PROJECT_AGENT_PANEL_MAX, Math.max(PROJECT_AGENT_PANEL_MIN, prev - delta))
    );
  }, []);

  /**
   * project-agent-store-unification Task 2.3: Simplified handleSelectAgent
   * Requirements: 3.1, 3.2, 3.3
   * - Removed addAgent workaround (agents already in SharedAgentStore)
   * - Just call selectAgent(agentId)
   */
  const handleSelectAgent = useCallback((agentId: string) => {
    selectAgent(agentId);
  }, [selectAgent]);

  const handleStopAgent = useCallback(async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    await apiClient.stopAgent(agentId);
  }, [apiClient]);

  /**
   * project-agent-store-unification: Use store's removeAgent
   * Agent removal now goes through SharedAgentStore
   */
  const handleRemoveAgent = useCallback((e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    removeAgent(agentId);
  }, [removeAgent]);

  const handleAskExecute = useCallback(async (prompt: string) => {
    // websocket-command-unification: Use unified executeProjectCommand API
    // Format: /kiro:project-ask "${prompt}" for project-level ask
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const command = `/kiro:project-ask "${escapedPrompt}"`;
    const result = await apiClient.executeProjectCommand(command, 'project-ask');
    if (result.ok) {
      setIsAskDialogOpen(false);
      // project-agent-store-unification: No manual refresh needed
      // SharedAgentStore is updated automatically via WebSocket events (useAgentStoreInit)
    }
  }, [apiClient]);

  // Handle create button click
  // github-issue-integration Task 12.2: Replaced 'bug' with 'issue'
  const handleCreateClick = useCallback(() => {
    setCreateDialogType(activeTab === 'specs' ? 'spec' : 'issue');
  }, [activeTab]);

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setCreateDialogType(null);
  }, []);

  const isSmartphone = deviceType === 'smartphone';

  return (
    <div className="flex flex-col h-full">
      {/* Tabs - Electron版のDocsTabsに準拠 */}
      {/* project-config-editor Task 8.1: Added Project tab */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onTabChange('specs')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'specs'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Specs
        </button>
        <button
          onClick={() => onTabChange('issues')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'issues'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Issues
        </button>
        {/* project-config-editor Task 8.1: Project tab for DesktopLayout (Req 6.1) */}
        <button
          onClick={() => onTabChange('project')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'project'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Project
        </button>
        {/* Create button - Desktop only (Task 3.2), hide for Project tab */}
        {!isSmartphone && activeTab !== 'project' && (
          <button
            data-testid={activeTab === 'specs' ? 'create-spec-button' : 'create-issue-button'}
            onClick={handleCreateClick}
            className={clsx(
              'px-2 py-2 text-sm font-medium transition-colors',
              'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'rounded-md mx-1'
            )}
            title={activeTab === 'specs' ? '新規Specを作成' : '新規Issueを作成'}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      {/* project-config-editor Task 8.1: Added ProjectView for project tab (Req 6.2) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'specs' && (
          <SpecsView
            apiClient={apiClient}
            selectedSpecId={selectedSpecId}
            onSelectSpec={onSelectSpec}
          />
        )}
        {activeTab === 'issues' && projectPath && (
          <IssuePane
            projectPath={projectPath}
          />
        )}
        {activeTab === 'project' && onSelectProjectFile && (
          <ProjectView
            apiClient={apiClient}
            selectedFilePath={selectedProjectFilePath}
            onSelectFile={onSelectProjectFile}
            testId="desktop-project-view"
          />
        )}
      </div>

      {/* ResizeHandle between SpecList and ProjectAgentPanel (Electron parity) */}
      <ResizeHandle direction="vertical" onResize={handleProjectAgentPanelResize} />

      {/* Project Agent Panel - Electron版と同じ位置、リサイズ可能 */}
      <div
        data-testid="project-agent-panel"
        style={{ height: projectAgentPanelHeight }}
        className="shrink-0 flex flex-col border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2">
          <Bot className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Project Agent
          </span>
          <span className="text-xs text-gray-400">
            ({projectAgents.length})
          </span>
          <div className="flex-1" />
          {/* Task 7.3: RefreshButton for Desktop (Req 4.3, 6.5) */}
          {onRefreshAgents && (
            <RefreshButton
              onRefresh={onRefreshAgents}
              isLoading={isRefreshingAgents}
              testId="project-agent-refresh-button"
            />
          )}
          <button
            onClick={() => setIsAskDialogOpen(true)}
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

        {/* Agent List */}
        <div className="flex-1 px-2 pb-2 overflow-y-auto">
          <AgentList
            agents={projectAgents.map(mapAgentInfoToItemInfo)}
            selectedAgentId={selectedAgentId}
            onSelect={handleSelectAgent}
            onStop={handleStopAgent}
            onRemove={handleRemoveAgent}
            emptyMessage="プロジェクトエージェントなし"
            testId="project-agent-list"
          />
        </div>

        {/* Ask Agent Dialog */}
        <AskAgentDialog
          isOpen={isAskDialogOpen}
          agentType="project"
          onExecute={handleAskExecute}
          onCancel={() => setIsAskDialogOpen(false)}
        />
      </div>

      {/* Smartphone FAB (Task 4.2) */}
      {isSmartphone && (
        <button
          data-testid="create-fab"
          onClick={handleCreateClick}
          className={clsx(
            'fixed right-4 bottom-20 z-50',
            'w-14 h-14 rounded-full',
            'flex items-center justify-center',
            'bg-blue-600 hover:bg-blue-700',
            'text-white shadow-lg',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
          aria-label={activeTab === 'specs' ? '新規Specを作成' : '新規Issueを作成'}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Create Spec Dialog (Task 3.3) */}
      <CreateSpecDialogRemote
        isOpen={createDialogType === 'spec'}
        onClose={handleDialogClose}
        apiClient={apiClient}
        deviceType={deviceType}
      />

      {/* github-issue-integration Task 12.3: Create Issue Dialog */}
      <CreateIssueDialogRemote
        isOpen={createDialogType === 'issue'}
        onClose={handleDialogClose}
        apiClient={apiClient}
        deviceType={deviceType}
      />
    </div>
  );
}

// =============================================================================
// Main Panel Component - Artifact表示/編集
// remote-ui-artifact-editor: Electron版と同じくArtifact編集画面を表示
// =============================================================================

interface MainPanelProps {
  activeTab: DocsTab;
  selectedSpec: SpecMetadataWithPath | null;
  specDetail: SpecDetail | null;
  // project-config-editor Task 8.2: Selected project file for editor display
  selectedProjectFile?: ProjectFileInfo | null;
}

function MainPanel({ activeTab, selectedSpec, specDetail, selectedProjectFile }: MainPanelProps) {
  const apiClient = useApi();

  // Spec選択時: RemoteArtifactEditorを表示
  if (activeTab === 'specs' && selectedSpec) {
    return (
      <div className="flex flex-col h-full">
        <RemoteArtifactEditor
          spec={selectedSpec}
          specDetail={specDetail}
          apiClient={apiClient}
          placeholder="Specを選択してドキュメントを表示"
          testId="remote-artifact-editor"
        />
      </div>
    );
  }

  // github-issue-integration Task 12.2: Issue detail is handled by IssuePane in LeftSidebar

  // project-config-editor Task 8.2: Project file selected - show RemoteProjectEditor
  // Requirements: 6.2 - DesktopLayout用ProjectViewの統合
  if (activeTab === 'project' && selectedProjectFile) {
    return (
      <div className="flex flex-col h-full">
        <RemoteProjectEditor
          file={selectedProjectFile}
          apiClient={apiClient}
          testId="desktop-remote-project-editor"
        />
      </div>
    );
  }

  // Placeholder when nothing selected
  // project-config-editor Task 8.2: Updated placeholder message
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg">
          {activeTab === 'project' ? 'ファイルを選択' : 'Specを選択'}
        </p>
        <p className="text-sm mt-2">
          {activeTab === 'project' ? 'してエディタを表示' : 'してドキュメントを表示'}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Right Sidebar Component - ワークフローパネル + Agent一覧 + WorkflowFooter
// =============================================================================

interface RightSidebarProps {
  activeTab: DocsTab;
  selectedSpec: SpecMetadataWithPath | null;
  specDetail: SpecDetail | null;
  /** 自動実行中かどうか */
  isAutoExecuting: boolean;
  /** 自動実行開始/停止ハンドラ */
  onAutoExecution: () => void;
}

// Agent一覧の高さ制限
const AGENT_LIST_MIN = 80;
const AGENT_LIST_MAX = 300;
const AGENT_LIST_DEFAULT = 160;

function RightSidebar({
  activeTab,
  selectedSpec,
  specDetail,
  isAutoExecuting,
  onAutoExecution,
}: RightSidebarProps) {
  const apiClient = useApi();
  // zustand-selector-optimization: individual selectors
  const selectAgent = useSharedAgentStore(s => s.selectAgent);
  const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);

  // Spec Agents state (filtered by selected spec)
  const [specAgents, setSpecAgents] = useState<AgentInfo[]>([]);

  // Agent一覧の高さ状態（リサイズ可能）
  const [agentListHeight, setAgentListHeight] = useState(AGENT_LIST_DEFAULT);

  // リサイズハンドラ（Agent一覧の下方向リサイズ）
  const handleAgentListResize = useCallback((delta: number) => {
    setAgentListHeight((prev) =>
      Math.min(AGENT_LIST_MAX, Math.max(AGENT_LIST_MIN, prev + delta))
    );
  }, []);

  // Load spec agents when spec changes
  useEffect(() => {
    if (!selectedSpec) {
      setSpecAgents([]);
      return;
    }

    // Capture spec name for use in async callback
    const specName = selectedSpec.name;
    let isMounted = true;

    async function loadSpecAgents() {
      const result = await apiClient.getAgents();
      if (!isMounted) return;

      if (result.ok) {
        const filtered = result.value
          .filter((a) => a.specId === specName)
          .sort((a, b) => {
            // Running first, then by startedAt descending
            if (a.status === 'running' && b.status !== 'running') return -1;
            if (a.status !== 'running' && b.status === 'running') return 1;
            const aTime = typeof a.startedAt === 'number' ? a.startedAt : new Date(a.startedAt).getTime();
            const bTime = typeof b.startedAt === 'number' ? b.startedAt : new Date(b.startedAt).getTime();
            return bTime - aTime;
          });
        setSpecAgents(filtered);
      }
    }

    loadSpecAgents();

    // Poll for updates
    const interval = setInterval(loadSpecAgents, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiClient, selectedSpec]);

  // Subscribe to agent status changes
  useEffect(() => {
    const unsubscribe = apiClient.onAgentStatusChange((agentId, status) => {
      setSpecAgents((prev) =>
        prev.map((agent) =>
          agent.agentId === agentId ? { ...agent, status } : agent
        )
      );
    });
    return unsubscribe;
  }, [apiClient]);

  /**
   * project-agent-store-unification Task 3.1: Simplified handleSelectAgent
   * Requirements: 3.1, 3.2, 3.3
   * - Removed addAgent workaround (agents already in SharedAgentStore via useAgentStoreInit)
   * - Just call selectAgent(agentId)
   */
  const handleSelectAgent = useCallback((agentId: string) => {
    selectAgent(agentId);
  }, [selectAgent]);

  const handleStopAgent = useCallback(async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    await apiClient.stopAgent(agentId);
  }, [apiClient]);

  const handleRemoveAgent = useCallback((e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    setSpecAgents((prev) => prev.filter((a) => a.agentId !== agentId));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Agent Section - 上部（Electron版と同じ順序） */}
      <div
        className="shrink-0 overflow-hidden"
        style={{ height: agentListHeight }}
      >
        <div className="h-full flex flex-col p-4">
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
          <div className="flex-1 overflow-y-auto">
            <AgentList
              agents={specAgents.map(mapAgentInfoToItemInfo)}
              selectedAgentId={selectedAgentId}
              onSelect={handleSelectAgent}
              onStop={handleStopAgent}
              onRemove={handleRemoveAgent}
              emptyMessage="エージェントなし"
              testId="spec-agent-list"
            />
          </div>
        </div>
      </div>

      {/* Agent一覧とWorkflow間のリサイズハンドル */}
      <ResizeHandle direction="vertical" onResize={handleAgentListResize} />

      {/* Workflow Section - 下部（Electron版と同じ順序） */}
      {/* remote-ui-artifact-editor: PhaseItemを統合したSpecActionsViewを表示 */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'specs' && selectedSpec && specDetail ? (
            <RemoteWorkflowView
              apiClient={apiClient}
              spec={selectedSpec}
              specDetail={specDetail}
            />
          ) : (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
              Select a spec to view workflow
            </div>
          )}
        </div>
      </div>

      {/* Workflow Footer - 自動実行ボタン（常に下部に固定） */}
      <div className="shrink-0">
        <SpecWorkflowFooter
          isAutoExecuting={isAutoExecuting}
          hasRunningAgents={specAgents.some((a) => a.status === 'running')}
          onAutoExecution={onAutoExecution}
          isOnMain={false}
          specJson={specDetail?.specJson ?? null}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Footer Component - Agentログエリア (仮)
// =============================================================================

/**
 * FooterContent - Agent log viewer for DesktopLayout
 * Uses shared AgentLogPanel component (Electron準拠)
 */
function FooterContent() {
  const apiClient = useApi();
  // zustand-selector-optimization: individual selectors
  const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);
  const getAgentById = useSharedAgentStore(s => s.getAgentById);
  const logs = useSharedAgentStore(s => s.logs);
  const ensureLogsLoaded = useSharedAgentStore(s => s.ensureLogsLoaded);
  const clearLogs = useSharedAgentStore(s => s.clearLogs);

  // Get selected agent info
  const selectedAgent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;

  // Get logs for selected agent
  const agentLogs = selectedAgentId ? logs.get(selectedAgentId) ?? [] : [];

  /**
   * project-agent-store-unification Task 4.1: Remove selectedAgent from deps
   * Requirements: 2.5
   * - Removed selectedAgent from dependency array (timing dependency eliminated)
   * - Added specIdHint='' for ProjectAgent support (specIdHint defaults to empty string)
   * - ensureLogsLoaded now works even when agent is not yet in store
   * agent-log-store-unification: Call ensureLogsLoaded to fetch past logs
   */
  useEffect(() => {
    if (selectedAgentId) {
      // project-agent-store-unification: Pass empty specIdHint for ProjectAgent fallback
      ensureLogsLoaded(apiClient, selectedAgentId, '');
    }
  }, [apiClient, selectedAgentId, ensureLogsLoaded]);

  // Transform AgentInfo to AgentLogInfo
  const agentLogInfo: AgentLogInfo | undefined = selectedAgent ? {
    agentId: selectedAgent.agentId,
    sessionId: selectedAgent.specId,
    phase: selectedAgent.phase,
    status: selectedAgent.status,
    command: selectedAgent.command,
    engineId: selectedAgent.engineId,
  } : undefined;

  // Handle copy logs
  const handleCopy = useCallback(async () => {
    if (!selectedAgent || !selectedAgentId) return;
    const result = await apiClient.getAgentLogs(selectedAgent.specId, selectedAgentId);
    if (result.ok && result.value.length > 0) {
      const logsText = result.value.map(entry =>
        typeof entry === 'string' ? entry : JSON.stringify(entry)
      ).join('\n');
      await navigator.clipboard.writeText(logsText);
    }
  }, [apiClient, selectedAgent, selectedAgentId]);

  // Handle clear logs
  const handleClear = useCallback(() => {
    if (selectedAgentId) {
      clearLogs(selectedAgentId);
    }
  }, [clearLogs, selectedAgentId]);

  return (
    <AgentLogPanel
      agent={agentLogInfo}
      logs={agentLogs}
      showTokens={true}
      onCopy={handleCopy}
      onClear={handleClear}
      noAgentMessage="エージェントが選択されていません"
      emptyLogsMessage="ログがありません"
      showSessionId={true}
      testId="remote-desktop-agent-log-panel"
    />
  );
}

// =============================================================================
// Desktop App Content - DesktopLayout使用
// =============================================================================

function DesktopAppContent() {
  const apiClient = useApi();
  const [activeTab, setActiveTab] = useState<DocsTab>('specs');
  const [selectedSpec, setSelectedSpec] = useState<SpecMetadataWithPath | null>(null);
  const [selectedSpecDetail, setSelectedSpecDetail] = useState<SpecDetail | null>(null);
  // project-config-editor Task 8.2: State for selected project file
  const [selectedProjectFile, setSelectedProjectFile] = useState<ProjectFileInfo | null>(null);

  // Auto execution state
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);

  // Task 5.2: Initialize AgentStore with WebSocket events
  // Requirements: 1.2 - DesktopAppContentマウント時にloadAgents呼び出し
  // Task 7.3: Get refreshAgents and isLoading for RefreshButton
  const { refreshAgents, isLoading: isAgentRefreshing } = useAgentStoreInit(apiClient);

  // agent-log-store-unification Task 3.1: Use shared log subscription hook
  // Requirements: 2.3 - アプリケーション初期化時にリアルタイムログ購読を開始
  useAgentLogSubscription(apiClient);

  // Handle spec selection
  const handleSelectSpec = useCallback(async (spec: SpecMetadataWithPath) => {
    setSelectedSpec(spec);
    setIsAutoExecuting(false); // Reset auto execution state on spec change
    const result = await apiClient.getSpecDetail(spec.name);
    if (result.ok) {
      setSelectedSpecDetail(result.value);
    }
  }, [apiClient]);

  // Handle tab change
  // project-config-editor Task 8.2: Clear project file on tab change
  const handleTabChange = useCallback((tab: DocsTab) => {
    setActiveTab(tab);
    setSelectedSpec(null);
    setSelectedSpecDetail(null);
    setSelectedProjectFile(null);
    setIsAutoExecuting(false);
  }, []);

  // project-config-editor Task 8.2: Handle project file selection
  const handleSelectProjectFile = useCallback((file: ProjectFileInfo) => {
    setSelectedProjectFile(file);
  }, []);

  // Handle auto execution start/stop
  // auto-execution-projectpath-fix Task 4.5: Pass projectPath to startAutoExecution
  const handleAutoExecution = useCallback(async () => {
    if (!selectedSpec || !selectedSpecDetail) return;

    if (isAutoExecuting) {
      // Stop auto execution
      await apiClient.stopAutoExecution(selectedSpec.path);
      setIsAutoExecuting(false);
    } else {
      // Start auto execution
      // document-review-phase Task 2.1: 'document-review' を追加
      const options: AutoExecutionOptions = {
        permissions: selectedSpecDetail.specJson?.autoExecution?.permissions ?? {
          requirements: true,
          design: true,
          tasks: true,
          'document-review': selectedSpecDetail.specJson?.autoExecution?.permissions?.['document-review'] ?? true,
          impl: false,
          inspection: false,
          deploy: false,
        },
        // document-review-phase: documentReviewFlag removed - use permissions['document-review'] instead
      };

      // auto-execution-projectpath-fix Task 4.5: Get projectPath from API client
      const projectPath = apiClient.getProjectPath?.() ?? '';
      const result = await apiClient.startAutoExecution(projectPath, selectedSpec.path, selectedSpec.name, options);
      if (result.ok) {
        setIsAutoExecuting(true);
      }
    }
  }, [apiClient, selectedSpec, selectedSpecDetail, isAutoExecuting]);

  return (
    <DesktopLayout
      leftSidebar={
        <LeftSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          selectedSpecId={selectedSpec?.name}
          selectedProjectFilePath={selectedProjectFile?.relativePath}
          onSelectSpec={handleSelectSpec}
          onSelectProjectFile={handleSelectProjectFile}
          deviceType="desktop"
          onRefreshAgents={refreshAgents}
          isRefreshingAgents={isAgentRefreshing}
          projectPath={apiClient.getProjectPath?.() ?? ''}
        />
      }
      rightSidebar={
        // project-config-editor Task 8.2: Hide right sidebar when project tab is active (Req 3.3)
        activeTab === 'project' ? undefined : (
          <RightSidebar
            activeTab={activeTab}
            selectedSpec={selectedSpec}
            specDetail={selectedSpecDetail}
            isAutoExecuting={isAutoExecuting}
            onAutoExecution={handleAutoExecution}
          />
        )
      }
      footer={<FooterContent />}
    >
      <MainPanel
        activeTab={activeTab}
        selectedSpec={selectedSpec}
        specDetail={selectedSpecDetail}
        selectedProjectFile={selectedProjectFile}
      />
    </DesktopLayout>
  );
}

// =============================================================================
// Mobile App Content - MobileLayout使用
// Task 8.1: useNavigationStack統合
// Task 8.2: SpecsタブでSpecDetailPageへのプッシュ遷移を実装
// Requirements:
// - 1.2: タブタップでコンテンツ切替
// - 2.1: Specタップでプッシュ遷移 (SpecDetailPage)
// - 2.4: 戻るボタンでpopPage
// - 2.6: React stateでナビ管理
// =============================================================================

function MobileAppContent() {
  const apiClient = useApi();

  // Task 8.1: useNavigationStack Hookの導入
  // Manages activeTab, detailContext, showTabBar states
  // mobile-agent-log-fullscreen: Added pushAgentLog for agent log page navigation
  // project-config-editor Task 7.2: Added pushProjectDetail for project file editing
  const {
    state: navigationState,
    setActiveTab,
    pushSpecDetail,
    pushAgentLog,
    pushProjectDetail,
    popPage,
  } = useNavigationStack();

  // Extract state from navigation hook
  const { activeTab, detailContext, showTabBar } = navigationState;

  // Task 5.1: Initialize AgentStore with WebSocket events
  // Requirements: 1.1 - MobileAppContentマウント時にloadAgents呼び出し
  // Task 7.1, 7.2: Get refreshAgents and isLoading for Pull-to-Refresh
  const { refreshAgents, isLoading: isAgentRefreshing } = useAgentStoreInit(apiClient);

  // agent-log-store-unification Task 3.1: Use shared log subscription hook
  // Requirements: 2.3 - アプリケーション初期化時にリアルタイムログ購読を開始
  useAgentLogSubscription(apiClient);

  // Task 8.1: Spec選択ハンドラ - pushSpecDetailを使用
  const handleSelectSpec = useCallback(async (spec: SpecMetadataWithPath) => {
    const result = await apiClient.getSpecDetail(spec.name);
    if (result.ok) {
      pushSpecDetail(spec, result.value);
    }
  }, [apiClient, pushSpecDetail]);

  // Task 8.1: 戻るボタンハンドラ - popPageを使用
  const handleBackToList = useCallback(() => {
    popPage();
  }, [popPage]);

  /**
   * mobile-agent-log-fullscreen Task 5.1, 5.2, 5.3: Agent選択ハンドラ
   * Creates handlers for different source types that navigate to AgentLogPage
   */
  const handleSelectAgentFromSpec = useCallback((agent: AgentInfo, specName: string) => {
    pushAgentLog(agent, 'spec', specName);
  }, [pushAgentLog]);

  const handleSelectAgentFromAgentsTab = useCallback((agent: AgentInfo) => {
    pushAgentLog(agent, 'agents');
  }, [pushAgentLog]);

  /**
   * project-config-editor Task 7.2: Project file selection handler
   * Requirements: 6.2 - Navigate to ProjectDetailPage
   */
  const handleSelectProjectFile = useCallback((file: ProjectFileInfo) => {
    pushProjectDetail(file);
  }, [pushProjectDetail]);

  // Task 8.1: タブ切替ハンドラ - setActiveTabを使用
  // setActiveTabは自動的にdetailContextをクリアする (Req 2.6)
  // project-config-editor Task 7.2: Added 'project' tab support
  const handleTabChange = useCallback((tab: LayoutMobileTab) => {
    // Process all valid tabs (specs/issues/agents/project)
    if (tab === 'specs' || tab === 'issues' || tab === 'agents' || tab === 'project') {
      setActiveTab(tab);
    }
  }, [setActiveTab]);

  const renderContent = () => {
    // Task 8.1: detailContextを使用した詳細画面表示判定
    // Task 8.2: SpecsタブでSpecDetailPageへのプッシュ遷移を実装
    if (detailContext) {
      // Task 8.2: SpecDetailPageの表示 (Req 2.1)
      // - SpecListのアイテムタップ時にpushSpecDetailを呼び出し → handleSelectSpecで実行済
      // - 戻るボタンでpopPageを呼び出し (Req 2.4) → onBack={handleBackToList}で接続
      if (detailContext.type === 'spec') {
        const { spec, specDetail } = detailContext;
        return (
          <SpecDetailPage
            spec={spec}
            specDetail={specDetail}
            apiClient={apiClient}
            onBack={handleBackToList}
            onSelectAgent={(agent) => handleSelectAgentFromSpec(agent, spec.name)}
            testId="spec-detail-page"
          />
        );
      }

      // github-issue-integration Task 12.2: Bug detail page removed - Issues handled by IssuePane

      // mobile-agent-log-fullscreen Task 4.1: AgentLogPageの表示 (Req 1.1)
      // - AgentListのアイテムタップ時にpushAgentLogを呼び出し
      // - 戻るボタンでpopPageを呼び出し → onBack={handleBackToList}で接続
      if (detailContext.type === 'agent-log') {
        const { agent, sourceType, sourceEntityId } = detailContext;
        return (
          <AgentLogPage
            agent={agent}
            sourceType={sourceType}
            sourceEntityId={sourceEntityId}
            apiClient={apiClient}
            onBack={handleBackToList}
            testId="agent-log-page"
          />
        );
      }

      // project-config-editor Task 7.2: ProjectDetailPageの表示 (Req 6.3)
      // - ProjectViewのファイルタップ時にpushProjectDetailを呼び出し
      // - 戻るボタンでpopPageを呼び出し → onBack={handleBackToList}で接続
      if (detailContext.type === 'project') {
        const { file } = detailContext;
        return (
          <ProjectDetailPage
            file={file}
            apiClient={apiClient}
            onBack={handleBackToList}
            testId="project-detail-page"
          />
        );
      }
    }

    // Task 8.1: リスト表示（detailContextがnull）
    switch (activeTab) {
      case 'specs':
        return (
          <SpecsView
            apiClient={apiClient}
            selectedSpecId={undefined}
            onSelectSpec={handleSelectSpec}
          />
        );

      // github-issue-integration Task 12.2: Issue tab using IssuePane
      case 'issues':
        return (
          <IssuePane
            projectPath={apiClient.getProjectPath?.() ?? ''}
          />
        );

      // Task 8.4: AgentsタブをMobileAppContentに統合する (Req 1.2)
      // AgentsTabViewを使用してプロジェクトレベルAgent一覧を表示
      // Task 7.1-7.3で実装されたAgentsTabViewコンポーネントを統合
      // Task 7.1, 7.2: Pass onRefresh and isRefreshing for Pull-to-Refresh (Req 4.2, 5.4)
      case 'agents':
        return (
          <AgentsTabView
            apiClient={apiClient}
            onSelectAgent={handleSelectAgentFromAgentsTab}
            onRefresh={refreshAgents}
            isRefreshing={isAgentRefreshing}
            testId="agents-tab-view"
          />
        );

      // project-config-editor Task 7.2: ProjectタブをMobileAppContentに統合
      // Requirements: 6.1, 6.2 - Mobile版タブ追加、ファイル一覧表示
      case 'project':
        return (
          <ProjectView
            apiClient={apiClient}
            onSelectFile={handleSelectProjectFile}
            testId="project-view"
          />
        );

      default:
        return null;
    }
  };

  return (
    <MobileLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showTabBar={showTabBar}
    >
      <div className="h-full bg-gray-50 dark:bg-gray-900">
        {renderContent()}
      </div>
    </MobileLayout>
  );
}

// =============================================================================
// AppContent - デバイスタイプに応じたレイアウト選択
// =============================================================================

function AppContent() {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <MobileAppContent />;
  }

  return <DesktopAppContent />;
}

// =============================================================================
// App - Root component with providers
// =============================================================================

export default function App() {
  return (
    <ApiClientProvider>
      <PlatformProvider>
        <TRPCProvider>
          <AppContent />
          {/* Task 1.2: ToastContainer for displaying notifications */}
          <ToastContainer />
        </TRPCProvider>
      </PlatformProvider>
    </ApiClientProvider>
  );
}
