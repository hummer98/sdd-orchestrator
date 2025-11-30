/**
 * Main Application Component
 * Requirements: 1.1, 2.1, 3.1, 11.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
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
  // CLI Install
  CliInstallDialog,
  // CLAUDE.md Install
  ClaudeMdInstallDialog,
  // Task 3, 4 (sidebar-refactor): サイドバー改善コンポーネント
  SpecListHeader,
  GlobalAgentPanel,
  ErrorBanner,
} from './components';
import type { ClaudeMdInstallMode } from './types/electron';
import { useProjectStore, useSpecStore, useEditorStore, useAgentStore } from './stores';

// ペイン幅の制限値
const LEFT_PANE_MIN = 200;
const LEFT_PANE_MAX = 500;
const RIGHT_PANE_MIN = 250;
const RIGHT_PANE_MAX = 500;
const BOTTOM_PANE_MIN = 100;
const BOTTOM_PANE_MAX = 400;

export function App() {
  const { currentProject, kiroValidation, loadInitialProject, loadRecentProjects } = useProjectStore();
  const { selectedSpec, specDetail, specs, loadSpecs } = useSpecStore();
  const { isDirty } = useEditorStore();
  const { setupEventListeners } = useAgentStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [isCliInstallDialogOpen, setIsCliInstallDialogOpen] = useState(false);
  const [isClaudeMdDialogOpen, setIsClaudeMdDialogOpen] = useState(false);
  const [claudeMdExists, setClaudeMdExists] = useState(false);

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

  // Setup menu event listeners
  const { forceReinstallAll, addShellPermissions, selectProject } = useProjectStore();
  const menuListenersSetup = useRef(false);
  useEffect(() => {
    if (menuListenersSetup.current) {
      return;
    }
    menuListenersSetup.current = true;

    const cleanupForceReinstall = window.electronAPI.onMenuForceReinstall(() => {
      forceReinstallAll();
    });

    const cleanupAddPermissions = window.electronAPI.onMenuAddShellPermissions(async () => {
      const result = await addShellPermissions();
      if (result) {
        // Show a simple alert with results (could be improved with a notification system)
        if (result.added.length > 0) {
          console.log(`[App] Added ${result.added.length} shell permissions`);
        }
        if (result.alreadyExists.length > 0) {
          console.log(`[App] ${result.alreadyExists.length} permissions already existed`);
        }
      }
    });

    const cleanupOpenProject = window.electronAPI.onMenuOpenProject(async (projectPath: string) => {
      console.log(`[App] Opening project from menu: ${projectPath}`);
      await selectProject(projectPath);
      await loadSpecs(projectPath);
    });

    const cleanupCliInstall = window.electronAPI.onMenuInstallCliCommand(() => {
      setIsCliInstallDialogOpen(true);
    });

    const cleanupClaudeMdInstall = window.electronAPI.onMenuInstallClaudeMd(async () => {
      if (!currentProject) return;
      // Check if CLAUDE.md exists
      const exists = await window.electronAPI.checkClaudeMdExists(currentProject);
      setClaudeMdExists(exists);
      setIsClaudeMdDialogOpen(true);
    });

    return () => {
      menuListenersSetup.current = false;
      cleanupForceReinstall();
      cleanupAddPermissions();
      cleanupOpenProject();
      cleanupCliInstall();
      cleanupClaudeMdInstall();
    };
  }, [forceReinstallAll, addShellPermissions, selectProject, loadSpecs, currentProject]);

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
            SDD Orchestrator{import.meta.env.DEV && ' (dev)'}
          </h1>
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
            {/* Task 6.1 (sidebar-refactor): 新しいサイドバー構成 */}
            {/* Task 1.3: ProjectSelector削除済み - プロジェクト選択はメニューバー経由 */}

            {/* 1. ErrorBanner (問題がある場合のみ表示) */}
            <ErrorBanner />

            {/* 3. SpecListHeader (新規作成ボタン付き) */}
            {currentProject && (
              <SpecListHeader
                specCount={specs.length}
                onCreateClick={() => setIsCreateDialogOpen(true)}
                disabled={!kiroValidation?.exists}
              />
            )}

            {/* 4. Spec list (スクロール可能) */}
            {currentProject && kiroValidation?.exists && (
              <div className="flex-1 overflow-y-auto">
                <SpecList />
              </div>
            )}

            {/* 5. GlobalAgentPanel (下部固定) */}
            <GlobalAgentPanel />
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

        <CliInstallDialog
          isOpen={isCliInstallDialogOpen}
          onClose={() => setIsCliInstallDialogOpen(false)}
        />

        <ClaudeMdInstallDialog
          isOpen={isClaudeMdDialogOpen}
          claudeMdExists={claudeMdExists}
          projectPath={currentProject || ''}
          onClose={() => setIsClaudeMdDialogOpen(false)}
          onInstall={async (mode: ClaudeMdInstallMode) => {
            if (!currentProject) return;
            const result = await window.electronAPI.installClaudeMd(currentProject, mode);
            if (!result.ok) {
              throw result.error;
            }
            console.log(`[App] CLAUDE.md installed with mode: ${mode}`);
          }}
        />
      </div>
    </NotificationProvider>
  );
}
