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
import { MobileLayout, DesktopLayout, type MobileTab } from './layouts';
import { SpecsView, SpecDetailView, SpecActionsView, BugsView, BugDetailView, AgentView, ProjectAgentView } from './views';
import { SpecWorkflowFooter } from '../shared/components/workflow';
import { AgentList, type AgentItemInfo, type AgentItemStatus } from '../shared/components/agent';
import { AskAgentDialog } from '../shared/components/project';
import { ResizeHandle } from '../shared/components/ui';
import { Bot } from 'lucide-react';
import { clsx } from 'clsx';
import type { SpecMetadataWithPath, SpecDetail, BugMetadataWithPath, AutoExecutionOptions, AgentInfo, AgentStatus } from '../shared/api/types';
import { initBugAutoExecutionWebSocketListeners } from '../shared/stores/bugAutoExecutionStore';

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

interface LeftSidebarProps {
  activeTab: DocsTab;
  onTabChange: (tab: DocsTab) => void;
  selectedSpecId?: string;
  selectedBugId?: string;
  onSelectSpec: (spec: SpecMetadataWithPath) => void;
  onSelectBug: (bug: BugMetadataWithPath) => void;
}

function LeftSidebar({
  activeTab,
  onTabChange,
  selectedSpecId,
  selectedBugId,
  onSelectSpec,
  onSelectBug,
}: LeftSidebarProps) {
  const apiClient = useApi();

  // Project Agent state
  const [projectAgents, setProjectAgents] = useState<AgentInfo[]>([]);
  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);

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
            <Bot className="w-4 h-4" />
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
    </div>
  );
}

// =============================================================================
// Main Panel Component - Artifact表示
// =============================================================================

interface MainPanelProps {
  activeTab: DocsTab;
  selectedSpec: SpecMetadataWithPath | null;
  selectedBug: BugMetadataWithPath | null;
  onBack: () => void;
}

function MainPanel({ activeTab, selectedSpec, selectedBug, onBack }: MainPanelProps) {
  const apiClient = useApi();

  if (activeTab === 'specs' && selectedSpec) {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 p-3 text-sm text-blue-500 hover:text-blue-600 border-b border-gray-200 dark:border-gray-700"
        >
          &larr; Spec一覧に戻る
        </button>
        <div className="flex-1 overflow-y-auto">
          <SpecDetailView
            spec={selectedSpec}
            apiClient={apiClient}
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'bugs' && selectedBug) {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 p-3 text-sm text-blue-500 hover:text-blue-600 border-b border-gray-200 dark:border-gray-700"
        >
          &larr; Bug一覧に戻る
        </button>
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
        <p className="text-lg">Select a spec or bug</p>
        <p className="text-sm mt-2">to view documents and artifacts</p>
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
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Workflow
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'specs' && selectedSpec && specDetail ? (
            <SpecActionsView
              specDetail={specDetail}
              apiClient={apiClient}
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

  // Handle back to list
  const handleBack = useCallback(() => {
    setSelectedSpec(null);
    setSelectedSpecDetail(null);
    setSelectedBug(null);
    setIsAutoExecuting(false);
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
  const handleAutoExecution = useCallback(async () => {
    if (!selectedSpec || !selectedSpecDetail) return;

    if (isAutoExecuting) {
      // Stop auto execution
      await apiClient.stopAutoExecution(selectedSpec.path);
      setIsAutoExecuting(false);
    } else {
      // Start auto execution
      const options: AutoExecutionOptions = {
        permissions: selectedSpecDetail.specJson?.autoExecution?.permissions ?? {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
        documentReviewFlag: selectedSpecDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run',
      };

      const result = await apiClient.startAutoExecution(selectedSpec.path, selectedSpec.name, options);
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
        selectedBug={selectedBug}
        onBack={handleBack}
      />
    </DesktopLayout>
  );
}

// =============================================================================
// Mobile App Content - MobileLayout使用 (既存維持)
// =============================================================================

function MobileAppContent() {
  const apiClient = useApi();
  const [activeTab, setActiveTab] = useState<MobileTab>('specs');
  const [selectedSpec, setSelectedSpec] = useState<SpecMetadataWithPath | null>(null);
  const [selectedSpecDetail, setSelectedSpecDetail] = useState<SpecDetail | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugMetadataWithPath | null>(null);

  useEffect(() => {
    const cleanup = initBugAutoExecutionWebSocketListeners(apiClient);
    return cleanup;
  }, [apiClient]);

  const handleSelectSpec = useCallback(async (spec: SpecMetadataWithPath) => {
    setSelectedSpec(spec);
    const result = await apiClient.getSpecDetail(spec.name);
    if (result.ok) {
      setSelectedSpecDetail(result.value);
    }
  }, [apiClient]);

  const handleSelectBug = useCallback((bug: BugMetadataWithPath) => {
    setSelectedBug(bug);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedSpec(null);
    setSelectedSpecDetail(null);
    setSelectedBug(null);
  }, []);

  const handleTabChange = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
    setSelectedSpec(null);
    setSelectedSpecDetail(null);
    setSelectedBug(null);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'specs':
        if (selectedSpec && selectedSpecDetail) {
          return (
            <div className="flex flex-col h-full">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 p-3 text-sm text-blue-500 hover:text-blue-600"
              >
                &larr; Spec一覧に戻る
              </button>
              <div className="flex-1 overflow-y-auto">
                <SpecDetailView spec={selectedSpec} apiClient={apiClient} />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <SpecActionsView specDetail={selectedSpecDetail} apiClient={apiClient} />
              </div>
            </div>
          );
        }
        return (
          <SpecsView
            apiClient={apiClient}
            selectedSpecId={selectedSpec?.name}
            onSelectSpec={handleSelectSpec}
          />
        );

      case 'bugs':
        if (selectedBug) {
          return (
            <div className="flex flex-col h-full">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 p-3 text-sm text-blue-500 hover:text-blue-600"
              >
                &larr; Bug一覧に戻る
              </button>
              <div className="flex-1 overflow-y-auto">
                <BugDetailView bug={selectedBug} apiClient={apiClient} />
              </div>
            </div>
          );
        }
        return (
          <BugsView
            apiClient={apiClient}
            selectedBugId={undefined}
            onSelectBug={handleSelectBug}
          />
        );

      case 'agent':
        return <AgentView apiClient={apiClient} />;

      case 'project':
        return <ProjectAgentView apiClient={apiClient} />;

      default:
        return null;
    }
  };

  return (
    <MobileLayout activeTab={activeTab} onTabChange={handleTabChange}>
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
      </PlatformProvider>
    </ApiClientProvider>
  );
}
