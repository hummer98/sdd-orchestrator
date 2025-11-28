/**
 * Main Application Component
 * Requirements: 1.1, 2.1, 3.1, 11.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import {
  ProjectSelector,
  SpecList,
  CreateSpecDialog,
  ArtifactEditor,
  NotificationProvider,
  UnsavedChangesDialog,
  ResizeHandle,
  // Task 30-33: Agent管理コンポーネント
  AgentListPanel,
  AgentLogPanel,
  AgentInputPanel,
  // SDD Hybrid Workflow: 右ペインを統合したWorkflowView
  WorkflowView,
} from './components';
import { useProjectStore, useSpecStore, useEditorStore, useAgentStore } from './stores';
import { clsx } from 'clsx';

// ペイン幅の制限値
const LEFT_PANE_MIN = 200;
const LEFT_PANE_MAX = 500;
const RIGHT_PANE_MIN = 250;
const RIGHT_PANE_MAX = 500;
const BOTTOM_PANE_MIN = 100;
const BOTTOM_PANE_MAX = 400;

export function App() {
  const { currentProject, kiroValidation, loadInitialProject, loadRecentProjects } = useProjectStore();
  const { selectedSpec, specDetail, loadSpecs } = useSpecStore();
  const { isDirty } = useEditorStore();
  const { setupEventListeners } = useAgentStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // ペインサイズの状態
  const [leftPaneWidth, setLeftPaneWidth] = useState(288); // w-72 = 18rem = 288px
  const [rightPaneWidth, setRightPaneWidth] = useState(320); // w-80 = 20rem = 320px
  const [bottomPaneHeight, setBottomPaneHeight] = useState(192); // h-48 = 12rem = 192px

  // リサイズハンドラー
  const handleLeftResize = useCallback((delta: number) => {
    setLeftPaneWidth((prev) => Math.min(LEFT_PANE_MAX, Math.max(LEFT_PANE_MIN, prev + delta)));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightPaneWidth((prev) => Math.min(RIGHT_PANE_MAX, Math.max(RIGHT_PANE_MIN, prev - delta)));
  }, []);

  const handleBottomResize = useCallback((delta: number) => {
    setBottomPaneHeight((prev) => Math.min(BOTTOM_PANE_MAX, Math.max(BOTTOM_PANE_MIN, prev - delta)));
  }, []);

  // Load initial project from command line argument and recent projects on mount
  const initialProjectLoaded = useRef(false);
  useEffect(() => {
    if (initialProjectLoaded.current) {
      return;
    }
    initialProjectLoaded.current = true;

    // Load recent projects first, then check for initial project
    loadRecentProjects().then(async () => {
      await loadInitialProject();
      // After loading initial project, load specs if project path was set
      const initialPath = await window.electronAPI.getInitialProjectPath();
      if (initialPath) {
        await loadSpecs(initialPath);
      }
    });
  }, [loadRecentProjects, loadInitialProject, loadSpecs]);

  // Setup agent event listeners on mount
  // useRefを使用してStrictModeでの二重実行を防止
  const eventListenersSetup = useRef(false);
  useEffect(() => {
    if (eventListenersSetup.current) {
      return;
    }
    eventListenersSetup.current = true;
    const cleanup = setupEventListeners();
    return () => {
      eventListenersSetup.current = false;
      cleanup();
    };
  }, [setupEventListeners]);

  // Handle beforeunload for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleConfirmNavigation = () => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  return (
    <NotificationProvider>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
        {/* Header - draggable for window movement on macOS */}
        <header className="titlebar-drag h-12 flex items-center pl-20 pr-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            SDD Orchestrator
          </h1>
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
            Electron
          </span>
          {/* Spec title in header */}
          {specDetail && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-gray-400">/</span>
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {specDetail.metadata.name}
              </span>
              <span className="text-sm text-gray-500">
                {specDetail.specJson.feature_name}
              </span>
            </div>
          )}
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Project & Spec list */}
          <aside
            style={{ width: leftPaneWidth }}
            className="shrink-0 flex flex-col bg-gray-50 dark:bg-gray-900"
          >
            <ProjectSelector />

            {/* New spec button */}
            {currentProject && kiroValidation?.exists && (
              <div className="px-4 py-2">
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md',
                    'bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  新規仕様を作成
                </button>
              </div>
            )}

            {/* Spec list */}
            {currentProject && kiroValidation?.exists && (
              <div className="flex-1 overflow-hidden">
                <SpecList />
              </div>
            )}
          </aside>

          {/* Left resize handle */}
          <ResizeHandle direction="horizontal" onResize={handleLeftResize} />

          {/* Main area */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {selectedSpec ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Center - Editor */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <ArtifactEditor />
                </div>

                {/* Right resize handle */}
                <ResizeHandle direction="horizontal" onResize={handleRightResize} />

                {/* Right sidebar - SDD Hybrid Workflow View */}
                <aside
                  style={{ width: rightPaneWidth }}
                  className="shrink-0 flex flex-col overflow-hidden"
                >
                  {/* Agent list panel */}
                  <AgentListPanel />
                  {/* SDD Hybrid Workflow: 6フェーズワークフロービュー */}
                  <div className="flex-1 overflow-hidden">
                    <WorkflowView />
                  </div>
                </aside>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                {currentProject ? (
                  kiroValidation?.exists ? (
                    '仕様を選択するか、新規仕様を作成してください'
                  ) : (
                    '.kiroディレクトリを初期化してください'
                  )
                ) : (
                  'プロジェクトを選択してください'
                )}
              </div>
            )}
          </main>
        </div>

        {/* Bottom resize handle */}
        <ResizeHandle direction="vertical" onResize={handleBottomResize} />

        {/* Task 33.3: Bottom - Agent Log panel (replaced LogPanel) */}
        <div style={{ height: bottomPaneHeight }} className="shrink-0 flex flex-col">
          <AgentLogPanel />
          {/* Task 32: Agent input panel */}
          <AgentInputPanel />
        </div>

        {/* Dialogs */}
        <CreateSpecDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />

        <UnsavedChangesDialog
          isOpen={showUnsavedDialog}
          onContinue={handleConfirmNavigation}
          onCancel={handleCancelNavigation}
        />
      </div>
    </NotificationProvider>
  );
}
