/**
 * Remote UI Root Application Component
 *
 * Design Principle: DesktopLayoutはElectron版のレイアウトに準拠する
 * See: .kiro/steering/tech.md - Remote UI DesktopLayout設計原則
 *
 * Layout Structure (matching Electron App.tsx):
 * - Header: タイトル、プロジェクト名、ProfileBadge、接続状態 (DesktopLayout内蔵)
 * - Left Sidebar: Specs/Bugsタブ切り替え、一覧表示
 * - Main Panel: Artifact表示、ドキュメントタブ
 * - Right Sidebar: ワークフローパネル、Agent一覧
 * - Footer: Agentログエリア
 */

import { useState, useCallback, useEffect } from 'react';
import { ApiClientProvider, PlatformProvider, useDeviceType, useApi } from '../shared';
import { MobileLayout, DesktopLayout, type MobileTab as LayoutMobileTab } from './layouts';
import { SpecsView, BugsView, BugDetailView, RemoteWorkflowView } from './views';
import { AgentsTabView } from './components/AgentsTabView';
import { ToastContainer } from './components/ToastContainer';
import { RefreshButton } from './components/RefreshButton';
import { RemoteArtifactEditor } from './components/RemoteArtifactEditor';
import { SpecDetailPage } from './components/SpecDetailPage';
import { BugDetailPage } from './components/BugDetailPage';
import { SpecWorkflowFooter } from '../shared/components/workflow';
import { AgentList, type AgentItemInfo, type AgentItemStatus } from '../shared/components/agent';
import { AskAgentDialog } from '../shared/components/project';
import { ResizeHandle } from '../shared/components/ui';
import { Bot, Plus, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { CreateSpecDialogRemote } from './components/CreateSpecDialogRemote';
import { CreateBugDialogRemote } from './components/CreateBugDialogRemote';
import type { SpecMetadataWithPath, SpecDetail, BugMetadataWithPath, AutoExecutionOptions, AgentInfo, AgentStatus } from '../shared/api/types';
import { initBugAutoExecutionWebSocketListeners } from '../shared/stores/bugAutoExecutionStore';
import { useNavigationStack } from './hooks/useNavigationStack';
import { useAgentStoreInit } from './hooks/useAgentStoreInit';

// =============================================================================
// Types
// =============================================================================

type DocsTab = 'specs' | 'bugs';

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
    agentId: agent.id,
    sessionId: agent.specId,
    phase: agent.phase,
    status: mapAgentStatus(agent.status),
    startedAt,
    lastActivityAt: endedAt,
  };
}

// =============================================================================
// Left Sidebar Component - Spec/Bugsタブ + 一覧
// =============================================================================

// Dialog type for create dialogs
type CreateDialogType = 'spec' | 'bug' | null;

interface LeftSidebarProps {
  activeTab: DocsTab;
  onTabChange: (tab: DocsTab) => void;
  selectedSpecId?: string;
  selectedBugId?: string;
  onSelectSpec: (spec: SpecMetadataWithPath) => void;
  onSelectBug: (bug: BugMetadataWithPath) => void;
  deviceType: 'desktop' | 'smartphone';
  /** Task 7.3: Callback to refresh agents (Req 4.3) */
  onRefreshAgents?: () => Promise<void>;
  /** Task 7.3: Whether refresh is in progress (Req 6.5) */
  isRefreshingAgents?: boolean;
}

function LeftSidebar({
  activeTab,
  onTabChange,
  selectedSpecId,
  selectedBugId,
  onSelectSpec,
  onSelectBug,
  deviceType,
  onRefreshAgents,
  isRefreshingAgents = false,
}: LeftSidebarProps) {
  const apiClient = useApi();

  // Project Agent state
  const [projectAgents, setProjectAgents] = useState<AgentInfo[]>([]);
  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);

  // Create dialog state (Task 3.1)
  const [createDialogType, setCreateDialogType] = useState<CreateDialogType>(null);

  // Load project agents (specId === '')
  useEffect(() => {
    let isMounted = true;

    async function loadProjectAgents() {
      const result = await apiClient.getAgents();
      if (!isMounted) return;

      if (result.ok) {
        const filtered = result.value
          .filter((a) => a.specId === '')
          .sort((a, b) => {
            // Running first, then by startedAt descending
            if (a.status === 'running' && b.status !== 'running') return -1;
            if (a.status !== 'running' && b.status === 'running') return 1;
            const aTime = typeof a.startedAt === 'number' ? a.startedAt : new Date(a.startedAt).getTime();
            const bTime = typeof b.startedAt === 'number' ? b.startedAt : new Date(b.startedAt).getTime();
            return bTime - aTime;
          });
        setProjectAgents(filtered);
      }
    }

    loadProjectAgents();

    // Poll for updates
    const interval = setInterval(loadProjectAgents, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiClient]);

  // Subscribe to agent status changes
  useEffect(() => {
    const unsubscribe = apiClient.onAgentStatusChange((agentId, status) => {
      setProjectAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId ? { ...agent, status } : agent
        )
      );
    });
    return unsubscribe;
  }, [apiClient]);

  // Project Agent handlers
  const handleStopAgent = useCallback(async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    await apiClient.stopAgent(agentId);
  }, [apiClient]);

  const handleRemoveAgent = useCallback((e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    setProjectAgents((prev) => prev.filter((a) => a.id !== agentId));
  }, []);

  const handleAskExecute = useCallback(async (prompt: string) => {
    // release-button-api-fix: executeAskProject is optional (deprecated, kept for backward compatibility)
    if (!apiClient.executeAskProject) {
      console.warn('executeAskProject is not available');
      return;
    }
    const result = await apiClient.executeAskProject(prompt);
    if (result.ok) {
      setIsAskDialogOpen(false);
      // Refresh agents list
      const agentsResult = await apiClient.getAgents();
      if (agentsResult.ok) {
        const filtered = agentsResult.value.filter((a) => a.specId === '');
        setProjectAgents(filtered);
      }
    }
  }, [apiClient]);

  // Handle create button click
  const handleCreateClick = useCallback(() => {
    setCreateDialogType(activeTab === 'specs' ? 'spec' : 'bug');
  }, [activeTab]);

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setCreateDialogType(null);
  }, []);

  const isSmartphone = deviceType === 'smartphone';

  return (
    <div className="flex flex-col h-full">
      {/* Tabs - Electron版のDocsTabsに準拠 */}
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
          onClick={() => onTabChange('bugs')}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bugs'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Bugs
        </button>
        {/* Create button - Desktop only (Task 3.2) */}
        {!isSmartphone && (
          <button
            data-testid={activeTab === 'specs' ? 'create-spec-button' : 'create-bug-button'}
            onClick={handleCreateClick}
            className={clsx(
              'px-2 py-2 text-sm font-medium transition-colors',
              'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'rounded-md mx-1'
            )}
            title={activeTab === 'specs' ? '新規Specを作成' : '新規バグを作成'}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'specs' ? (
          <SpecsView
            apiClient={apiClient}
            selectedSpecId={selectedSpecId}
            onSelectSpec={onSelectSpec}
          />
        ) : (
          <BugsView
            apiClient={apiClient}
            selectedBugId={selectedBugId}
            onSelectBug={onSelectBug}
          />
        )}
      </div>

      {/* Project Agent Panel - Electron版と同じ位置 */}
      <div
        data-testid="project-agent-panel"
        className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2">
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
        <div className="px-2 pb-2 max-h-32 overflow-y-auto">
          <AgentList
            agents={projectAgents.map(mapAgentInfoToItemInfo)}
            selectedAgentId={null}
            onSelect={() => {}}
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
          aria-label={activeTab === 'specs' ? '新規Specを作成' : '新規バグを作成'}
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

      {/* Create Bug Dialog (Task 3.4) */}
      <CreateBugDialogRemote
        isOpen={createDialogType === 'bug'}
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
  selectedBug: BugMetadataWithPath | null;
}

function MainPanel({ activeTab, selectedSpec, specDetail, selectedBug }: MainPanelProps) {
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

  // Bug選択時: BugDetailViewを表示（従来通り）
  if (activeTab === 'bugs' && selectedBug) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <BugDetailView
            bug={selectedBug}
            apiClient={apiClient}
          />
        </div>
      </div>
    );
  }

  // Placeholder when nothing selected
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg">SpecまたはBugを選択</p>
        <p className="text-sm mt-2">してドキュメントを表示</p>
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
          agent.id === agentId ? { ...agent, status } : agent
        )
      );
    });
    return unsubscribe;
  }, [apiClient]);

  // Agent handlers
  const handleStopAgent = useCallback(async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    await apiClient.stopAgent(agentId);
  }, [apiClient]);

  const handleRemoveAgent = useCallback((e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    setSpecAgents((prev) => prev.filter((a) => a.id !== agentId));
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
              selectedAgentId={null}
              onSelect={() => {}}
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

function FooterContent() {
  // TODO: Implement agent log viewer
  return (
    <div className="h-full p-4 font-mono text-xs text-gray-500">
      Agent logs will be displayed here...
    </div>
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
  const [selectedBug, setSelectedBug] = useState<BugMetadataWithPath | null>(null);

  // Auto execution state
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);

  // Task 5.2: Initialize AgentStore with WebSocket events
  // Requirements: 1.2 - DesktopAppContentマウント時にloadAgents呼び出し
  // Task 7.3: Get refreshAgents and isLoading for RefreshButton
  const { refreshAgents, isLoading: isAgentRefreshing } = useAgentStoreInit(apiClient);

  // Initialize WebSocket listeners
  useEffect(() => {
    const cleanup = initBugAutoExecutionWebSocketListeners(apiClient);
    return cleanup;
  }, [apiClient]);

  // Handle spec selection
  const handleSelectSpec = useCallback(async (spec: SpecMetadataWithPath) => {
    setSelectedSpec(spec);
    setIsAutoExecuting(false); // Reset auto execution state on spec change
    const result = await apiClient.getSpecDetail(spec.name);
    if (result.ok) {
      setSelectedSpecDetail(result.value);
    }
  }, [apiClient]);

  // Handle bug selection
  const handleSelectBug = useCallback((bug: BugMetadataWithPath) => {
    setSelectedBug(bug);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: DocsTab) => {
    setActiveTab(tab);
    setSelectedSpec(null);
    setSelectedSpecDetail(null);
    setSelectedBug(null);
    setIsAutoExecuting(false);
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
          selectedBugId={selectedBug?.name}
          onSelectSpec={handleSelectSpec}
          onSelectBug={handleSelectBug}
          deviceType="desktop"
          onRefreshAgents={refreshAgents}
          isRefreshingAgents={isAgentRefreshing}
        />
      }
      rightSidebar={
        <RightSidebar
          activeTab={activeTab}
          selectedSpec={selectedSpec}
          specDetail={selectedSpecDetail}
          isAutoExecuting={isAutoExecuting}
          onAutoExecution={handleAutoExecution}
        />
      }
      footer={<FooterContent />}
    >
      <MainPanel
        activeTab={activeTab}
        selectedSpec={selectedSpec}
        specDetail={selectedSpecDetail}
        selectedBug={selectedBug}
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
  const {
    state: navigationState,
    setActiveTab,
    pushSpecDetail,
    pushBugDetail,
    popPage,
  } = useNavigationStack();

  // Extract state from navigation hook
  const { activeTab, detailContext, showTabBar } = navigationState;

  // Task 5.1: Initialize AgentStore with WebSocket events
  // Requirements: 1.1 - MobileAppContentマウント時にloadAgents呼び出し
  // Task 7.1, 7.2: Get refreshAgents and isLoading for Pull-to-Refresh
  const { refreshAgents, isLoading: isAgentRefreshing } = useAgentStoreInit(apiClient);

  useEffect(() => {
    const cleanup = initBugAutoExecutionWebSocketListeners(apiClient);
    return cleanup;
  }, [apiClient]);

  // Task 8.1: Spec選択ハンドラ - pushSpecDetailを使用
  const handleSelectSpec = useCallback(async (spec: SpecMetadataWithPath) => {
    const result = await apiClient.getSpecDetail(spec.name);
    if (result.ok) {
      pushSpecDetail(spec, result.value);
    }
  }, [apiClient, pushSpecDetail]);

  // Task 8.1: Bug選択ハンドラ - pushBugDetailを使用
  const handleSelectBug = useCallback(async (bug: BugMetadataWithPath) => {
    const result = await apiClient.getBugDetail(bug.name);
    if (result.ok) {
      pushBugDetail(bug, result.value);
    }
  }, [apiClient, pushBugDetail]);

  // Task 8.1: 戻るボタンハンドラ - popPageを使用
  const handleBackToList = useCallback(() => {
    popPage();
  }, [popPage]);

  // Task 8.1: タブ切替ハンドラ - setActiveTabを使用
  // setActiveTabは自動的にdetailContextをクリアする (Req 2.6)
  // Note: LayoutMobileTab includes legacy values, filter to valid 3-tab values
  const handleTabChange = useCallback((tab: LayoutMobileTab) => {
    // Only process the 3 valid tabs (specs/bugs/agents)
    if (tab === 'specs' || tab === 'bugs' || tab === 'agents') {
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
            testId="spec-detail-page"
          />
        );
      }

      // Task 8.3: BugDetailPageの表示 (Req 2.2)
      // - BugListのアイテムタップ時にpushBugDetailを呼び出し → handleSelectBugで実行済
      // - 戻るボタンでpopPageを呼び出し (Req 2.4) → onBack={handleBackToList}で接続
      if (detailContext.type === 'bug') {
        const { bug, bugDetail } = detailContext;
        return (
          <BugDetailPage
            bug={bug}
            bugDetail={bugDetail}
            apiClient={apiClient}
            onBack={handleBackToList}
            testId="bug-detail-page"
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

      case 'bugs':
        return (
          <BugsView
            apiClient={apiClient}
            selectedBugId={undefined}
            onSelectBug={handleSelectBug}
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
            onRefresh={refreshAgents}
            isRefreshing={isAgentRefreshing}
            testId="agents-tab-view"
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
      <div className="h-screen bg-gray-50 dark:bg-gray-900">
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
        <AppContent />
        {/* Task 1.2: ToastContainer for displaying notifications */}
        <ToastContainer />
      </PlatformProvider>
    </ApiClientProvider>
  );
}
