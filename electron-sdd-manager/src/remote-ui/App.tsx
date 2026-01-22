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
import type { SpecMetadataWithPath, SpecDetail, BugMetadataWithPath, AutoExecutionOptions } from '../shared/api/types';
import { initBugAutoExecutionWebSocketListeners } from '../shared/stores/bugAutoExecutionStore';

// =============================================================================
// Types
// =============================================================================

type DocsTab = 'specs' | 'bugs';

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
      <div className="flex-1 overflow-y-auto">
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

function RightSidebar({
  activeTab,
  selectedSpec,
  specDetail,
  isAutoExecuting,
  onAutoExecution,
}: RightSidebarProps) {
  const apiClient = useApi();

  return (
    <div className="flex flex-col h-full">
      {/* Workflow Section */}
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

      {/* Agent Section */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Agents
          </h2>
        </div>
        <div className="max-h-32 overflow-y-auto">
          <AgentView apiClient={apiClient} />
        </div>
      </div>

      {/* Workflow Footer - 自動実行ボタン */}
      {activeTab === 'specs' && selectedSpec && specDetail && (
        <div className="shrink-0">
          <SpecWorkflowFooter
            isAutoExecuting={isAutoExecuting}
            hasRunningAgents={false}
            onAutoExecution={onAutoExecution}
            isOnMain={false}
            specJson={specDetail.specJson}
          />
        </div>
      )}
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
