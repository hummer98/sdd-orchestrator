/**
 * Remote UI Root Application Component
 *
 * Task 9.1-9.3: Remote UIアプリケーション統合
 * Task 13.8: ビュー統合とタブ切り替え
 * Task 7.1: WebSocketイベントリスナー登録統合 (remote-ui-bug-advanced-features)
 *
 * Requirements: 2.4, 4.1, 7.1, 7.2
 *
 * Entry point for the Remote UI application:
 * - ApiClientProvider (WebSocketApiClient) - API abstraction layer
 * - PlatformProvider (Web platform capabilities) - Platform-specific features
 * - Device-responsive layout (MobileLayout / DesktopLayout)
 * - Tab-based navigation for Specs, Bugs, Agent views
 */

import { useState, useCallback, useEffect } from 'react';
import { ApiClientProvider, PlatformProvider, useDeviceType, useApi } from '../shared';
import { MobileLayout, DesktopLayout, type MobileTab } from './layouts';
import { SpecsView, SpecDetailView, SpecActionsView, BugsView, BugDetailView, AgentView, ProjectAgentView } from './views';
import type { SpecMetadataWithPath, SpecDetail, BugMetadataWithPath } from '../shared/api/types';
import { initBugAutoExecutionWebSocketListeners } from '../shared/stores/bugAutoExecutionStore';

/**
 * MainContent props
 */
interface MainContentProps {
  /** Current active tab */
  activeTab: MobileTab;
  /** Callback when tab changes */
  onTabChange: (tab: MobileTab) => void;
}

/**
 * MainContent - Tab-based content area with views
 */
function MainContent({ activeTab, onTabChange }: MainContentProps) {
  const apiClient = useApi();
  const [selectedSpec, setSelectedSpec] = useState<SpecMetadataWithPath | null>(null);
  const [selectedSpecDetail, setSelectedSpecDetail] = useState<SpecDetail | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugMetadataWithPath | null>(null);

  // Handle spec selection
  // spec-path-ssot-refactor: Remote UI receives SpecMetadataWithPath from WebSocket
  const handleSelectSpec = useCallback(async (spec: SpecMetadataWithPath) => {
    setSelectedSpec(spec);
    // Load spec detail
    const result = await apiClient.getSpecDetail(spec.name);
    if (result.ok) {
      setSelectedSpecDetail(result.value);
    }
  }, [apiClient]);

  // Handle bug selection
  // spec-path-ssot-refactor: Remote UI receives BugMetadataWithPath from WebSocket
  const handleSelectBug = useCallback((bug: BugMetadataWithPath) => {
    setSelectedBug(bug);
  }, []);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setSelectedSpec(null);
    setSelectedSpecDetail(null);
    setSelectedBug(null);
  }, []);

  // Handle tab change - use the prop callback
  const handleTabChange = useCallback((tab: MobileTab) => {
    onTabChange(tab);
    // Clear selections when changing tabs
    setSelectedSpec(null);
    setSelectedSpecDetail(null);
    setSelectedBug(null);
  }, [onTabChange]);

  // Render content based on active tab
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
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 overflow-y-auto">
                  <SpecDetailView
                    spec={selectedSpec}
                    apiClient={apiClient}
                  />
                </div>
                <div className="md:w-80 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <SpecActionsView
                    specDetail={selectedSpecDetail}
                    apiClient={apiClient}
                  />
                </div>
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
                <BugDetailView
                  bug={selectedBug}
                  apiClient={apiClient}
                />
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
        return (
          <AgentView
            apiClient={apiClient}
          />
        );

      case 'project':
        return (
          <ProjectAgentView
            apiClient={apiClient}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation (for desktop, mobile uses layout tabs) */}
      <div className="hidden md:flex border-b border-gray-200 dark:border-gray-700">
        {(['specs', 'bugs', 'agent', 'project'] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            data-testid={`remote-tab-${tab}`}
            aria-selected={activeTab === tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'specs' ? 'Specs' : tab === 'bugs' ? 'Bugs' : tab === 'agent' ? 'Agent' : 'Project'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

/**
 * AppContent - Main content component that uses device type to select layout
 *
 * This component must be inside providers to use useDeviceType hook.
 * Manages tab state and passes it to both layout and content components.
 */
function AppContent() {
  const { isMobile } = useDeviceType();
  const [activeTab, setActiveTab] = useState<MobileTab>('specs');
  const apiClient = useApi();

  // Task 7.1: Initialize WebSocket event listeners for bug auto execution
  useEffect(() => {
    // Initialize bug auto execution WebSocket listeners
    const cleanup = initBugAutoExecutionWebSocketListeners(apiClient);

    // Cleanup on unmount
    return cleanup;
  }, [apiClient]);

  // Handle tab change from either layout or content
  const handleTabChange = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
  }, []);

  if (isMobile) {
    return (
      <MobileLayout activeTab={activeTab} onTabChange={handleTabChange}>
        <div className="h-screen bg-gray-50 dark:bg-gray-900">
          <MainContent activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout>
      <div className="h-screen bg-gray-50 dark:bg-gray-900">
        <MainContent activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </DesktopLayout>
  );
}

/**
 * App - Root component with providers
 *
 * Provider nesting order:
 * 1. ApiClientProvider - outermost, provides API client
 * 2. PlatformProvider - provides platform capabilities
 * 3. AppContent - uses providers and renders layout
 */
export default function App() {
  return (
    <ApiClientProvider>
      <PlatformProvider>
        <AppContent />
      </PlatformProvider>
    </ApiClientProvider>
  );
}
