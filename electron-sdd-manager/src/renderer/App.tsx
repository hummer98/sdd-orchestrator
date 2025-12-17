/**
 * Main Application Component
 * Requirements: 1.1, 2.1, 3.1, 11.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
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
  // Unified Commandset Install
  CommandsetInstallDialog,
  // Task 3, 4 (sidebar-refactor): サイドバー改善コンポーネント
  GlobalAgentPanel,
  ErrorBanner,
  // Remote Access Dialog
  RemoteAccessDialog,
  // Bug Workflow UI: DocsTabsでSpecListとBugListを統合
  DocsTabs,
  // SSH Remote Project
  SSHStatusIndicator,
  SSHConnectDialog,
  SSHAuthDialog,
  ProjectSwitchConfirmDialog,
  ProjectSelector,
} from './components';
import type { ClaudeMdInstallMode } from './types/electron';
import type { ProfileName, InstallResultSummary } from './components/CommandsetInstallDialog';
import { useProjectStore, useSpecStore, useEditorStore, useAgentStore, useWorkflowStore, useRemoteAccessStore, useNotificationStore, useConnectionStore } from './stores';
import type { CommandPrefix } from './stores';

// ペイン幅の制限値
const LEFT_PANE_MIN = 200;
const LEFT_PANE_MAX = 500;
const RIGHT_PANE_MIN = 250;
const RIGHT_PANE_MAX = 500;
const BOTTOM_PANE_MIN = 100;
const BOTTOM_PANE_MAX = 400;
// 右ペイン内のAgent一覧パネルの高さ制限
const AGENT_LIST_MIN = 80;
const AGENT_LIST_MAX = 400;

export function App() {
  const { currentProject, kiroValidation, loadInitialProject, loadRecentProjects, selectProject } = useProjectStore();
  const { selectedSpec, specDetail, loadSpecs } = useSpecStore();
  const { isDirty } = useEditorStore();
  const { setupEventListeners } = useAgentStore();
  const { setCommandPrefix } = useWorkflowStore();
  const { isRunning: isRemoteServerRunning, startServer, stopServer, initialize: initializeRemoteAccess } = useRemoteAccessStore();
  const { addNotification } = useNotificationStore();
  const {
    connectSSH,
    authDialog,
    submitAuth,
    cancelAuth,
    projectSwitchConfirm,
    confirmProjectSwitch,
    cancelProjectSwitch,
  } = useConnectionStore();

  // Use ref to track current remote server state for event handlers
  const isRemoteServerRunningRef = useRef(isRemoteServerRunning);
  useEffect(() => {
    isRemoteServerRunningRef.current = isRemoteServerRunning;
  }, [isRemoteServerRunning]);

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [isCliInstallDialogOpen, setIsCliInstallDialogOpen] = useState(false);
  const [isClaudeMdDialogOpen, setIsClaudeMdDialogOpen] = useState(false);
  const [claudeMdExists, setClaudeMdExists] = useState(false);
  const [isRemoteAccessDialogOpen, setIsRemoteAccessDialogOpen] = useState(false);
  // Unified Commandset Install dialog
  const [isCommandsetInstallDialogOpen, setIsCommandsetInstallDialogOpen] = useState(false);
  // SSH Remote Project dialogs
  const [isSSHConnectDialogOpen, setIsSSHConnectDialogOpen] = useState(false);
  const [isSSHConnecting, setIsSSHConnecting] = useState(false);

  // ペインサイズの状態
  const [leftPaneWidth, setLeftPaneWidth] = useState(288); // w-72 = 18rem = 288px
  const [rightPaneWidth, setRightPaneWidth] = useState(320); // w-80 = 20rem = 320px
  const [bottomPaneHeight, setBottomPaneHeight] = useState(192); // h-48 = 12rem = 192px
  const [agentListHeight, setAgentListHeight] = useState(160); // Agent一覧パネルの高さ

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

  const handleAgentListResize = useCallback((delta: number) => {
    setAgentListHeight((prev) => Math.min(AGENT_LIST_MAX, Math.max(AGENT_LIST_MIN, prev + delta)));
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

  // Initialize remote access store on mount
  const remoteAccessInitialized = useRef(false);
  useEffect(() => {
    if (remoteAccessInitialized.current) {
      return;
    }
    remoteAccessInitialized.current = true;
    initializeRemoteAccess();
  }, [initializeRemoteAccess]);

  // Setup menu event listeners
  const { forceReinstallAll, addShellPermissions } = useProjectStore();
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

    const cleanupCommandPrefix = window.electronAPI.onMenuSetCommandPrefix((prefix: CommandPrefix) => {
      console.log(`[App] Setting command prefix to: ${prefix}`);
      setCommandPrefix(prefix);
    });

    const cleanupToggleRemoteServer = window.electronAPI.onMenuToggleRemoteServer(async () => {
      // Always check actual server status to handle HMR/reload scenarios
      const actualStatus = await window.electronAPI.getRemoteServerStatus();
      console.log(`[App] Toggle remote server, actual status: ${actualStatus.isRunning}, ref state: ${isRemoteServerRunningRef.current}`);

      if (actualStatus.isRunning) {
        await stopServer();
        setIsRemoteAccessDialogOpen(false);
      } else {
        // Require project to be selected before starting server
        if (!currentProject) {
          addNotification({
            type: 'warning',
            message: 'リモートアクセスサーバーを起動するにはプロジェクトを選択してください',
          });
          return;
        }
        await startServer();
        // Show dialog with QR code and URL when server starts
        setIsRemoteAccessDialogOpen(true);
      }
    });

    const cleanupCcSddWorkflowInstall = window.electronAPI.onMenuInstallCcSddWorkflow(async () => {
      if (!currentProject) return;
      console.log('[App] Installing CC-SDD Workflow');
      try {
        const result = await window.electronAPI.installCcSddWorkflow(currentProject);
        if (result.ok) {
          const { commands, agents, settings, claudeMd } = result.value;
          const installedCount = commands.installed.length + agents.installed.length + settings.installed.length;
          const skippedCount = commands.skipped.length + agents.skipped.length + settings.skipped.length;

          let message = `cc-sdd Workflow をインストールしました: ${installedCount} ファイル`;
          if (skippedCount > 0) {
            message += ` (${skippedCount} ファイルはスキップ)`;
          }
          if (claudeMd.action === 'merged') {
            message += '、CLAUDE.md にセクションを追加';
          } else if (claudeMd.action === 'created') {
            message += '、CLAUDE.md を作成';
          } else if (claudeMd.action === 'skipped') {
            message += '、CLAUDE.md は既に設定済み';
          }

          addNotification({
            type: 'success',
            message,
          });
          console.log('[App] cc-sdd Workflow installed successfully', result.value);

          // Refresh project to update permissions check
          await selectProject(currentProject);
        } else {
          addNotification({
            type: 'error',
            message: `cc-sdd Workflow のインストールに失敗: ${result.error.type}`,
          });
          console.error('[App] cc-sdd Workflow installation failed', result.error);
        }
      } catch (error) {
        addNotification({
          type: 'error',
          message: `cc-sdd Workflow のインストールに失敗しました`,
        });
        console.error('[App] cc-sdd Workflow installation error', error);
      }
    });

    const cleanupCommandsetInstall = window.electronAPI.onMenuInstallCommandset(() => {
      if (!currentProject) {
        addNotification({
          type: 'warning',
          message: 'コマンドセットをインストールするにはプロジェクトを選択してください',
        });
        return;
      }
      setIsCommandsetInstallDialogOpen(true);
    });

    return () => {
      menuListenersSetup.current = false;
      cleanupForceReinstall();
      cleanupAddPermissions();
      cleanupOpenProject();
      cleanupCliInstall();
      cleanupClaudeMdInstall();
      cleanupCommandPrefix();
      cleanupToggleRemoteServer();
      cleanupCcSddWorkflowInstall();
      cleanupCommandsetInstall();
    };
  }, [forceReinstallAll, addShellPermissions, selectProject, loadSpecs, currentProject, setCommandPrefix, startServer, stopServer, addNotification]);

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

  // SSH connection handler
  const handleSSHConnect = async (uri: string) => {
    setIsSSHConnecting(true);
    try {
      await connectSSH(uri);
      setIsSSHConnectDialogOpen(false);
    } catch (error) {
      console.error('[App] SSH connection failed:', error);
      addNotification({
        type: 'error',
        message: `SSH接続に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSSHConnecting(false);
    }
  };

  return (
    <NotificationProvider>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
        {/* Header - draggable for window movement on macOS */}
        <header className="titlebar-drag h-12 flex items-center justify-between pl-20 pr-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              SDD Orchestrator{import.meta.env.DEV && ' (dev)'}
            </h1>
            {/* Project name in header */}
            {currentProject && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-gray-400">/</span>
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                  {currentProject.split('/').pop()}
                </span>
              </div>
            )}
            {/* Spec title in header */}
            {specDetail && specDetail.specJson && (
              <div className="ml-4 flex items-center gap-2">
                <span className="text-gray-400">/</span>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {specDetail.metadata.name}
                </span>
                <span className="text-sm text-gray-500">
                  {specDetail.specJson.feature_name || ''}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* VSCode Open Button */}
            {currentProject && (
              <button
                onClick={async () => {
                  try {
                    await window.electronAPI.openInVSCode(currentProject);
                  } catch (error) {
                    addNotification({
                      type: 'error',
                      message: `VSCodeを起動できませんでした: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    });
                  }
                }}
                className="titlebar-no-drag px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                VSCodeで開く
              </button>
            )}
            {/* SSH Status Indicator */}
            <SSHStatusIndicator />
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Project & Spec list */}
          <aside
            style={{ width: leftPaneWidth }}
            className="shrink-0 flex flex-col bg-gray-50 dark:bg-gray-900"
          >
            {/* Bug Workflow UI: 統合サイドバー構成 */}
            {/* 1. ProjectSelector (プロジェクト選択とパーミッションチェック) */}
            <ProjectSelector />

            {/* 2. ErrorBanner (問題がある場合のみ表示) */}
            <ErrorBanner />

            {/* 3. DocsTabs (Specs/Bugsタブ切り替え、新規作成ボタン含む) */}
            {currentProject && kiroValidation?.exists && (
              <div className="flex-1 overflow-hidden">
                <DocsTabs />
              </div>
            )}

            {/* 4. GlobalAgentPanel (下部固定) */}
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
                  <div style={{ height: agentListHeight }} className="shrink-0 overflow-hidden">
                    <AgentListPanel />
                  </div>
                  {/* Agent一覧とワークフロー間のリサイズハンドル */}
                  <ResizeHandle direction="vertical" onResize={handleAgentListResize} />
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

        <RemoteAccessDialog
          isOpen={isRemoteAccessDialogOpen}
          onClose={() => setIsRemoteAccessDialogOpen(false)}
        />

        {/* Unified Commandset Install Dialog */}
        <CommandsetInstallDialog
          isOpen={isCommandsetInstallDialogOpen}
          projectPath={currentProject || ''}
          onClose={() => setIsCommandsetInstallDialogOpen(false)}
          onInstall={async (profileName: ProfileName, progressCallback) => {
            if (!currentProject) return;
            console.log(`[App] Installing commandset with profile: ${profileName}`);

            const result = await window.electronAPI.installCommandsetByProfile(
              currentProject,
              profileName
            );

            if (!result.ok) {
              throw new Error(result.error.message || result.error.type);
            }

            const { summary } = result.value;
            console.log(`[App] Commandset installed successfully:`, summary);

            // Return summary for the dialog to display
            return {
              totalInstalled: summary.totalInstalled,
              totalSkipped: summary.totalSkipped,
              totalFailed: summary.totalFailed,
            };
          }}
        />

        {/* SSH Remote Project Dialogs */}
        <SSHConnectDialog
          isOpen={isSSHConnectDialogOpen}
          onConnect={handleSSHConnect}
          onCancel={() => setIsSSHConnectDialogOpen(false)}
          isConnecting={isSSHConnecting}
        />

        {/* SSH Auth Dialog (password, passphrase, host-key verification) */}
        <SSHAuthDialog
          isOpen={authDialog.isOpen}
          type={authDialog.type}
          host={authDialog.host}
          user={authDialog.user}
          keyPath={authDialog.keyPath}
          fingerprint={authDialog.fingerprint}
          isNewHost={authDialog.isNewHost}
          onSubmit={submitAuth}
          onCancel={cancelAuth}
        />

        {/* Project Switch Confirm Dialog */}
        {projectSwitchConfirm.targetProject && (
          <ProjectSwitchConfirmDialog
            isOpen={projectSwitchConfirm.isOpen}
            runningAgentsCount={projectSwitchConfirm.runningAgentsCount}
            targetProject={projectSwitchConfirm.targetProject}
            onConfirm={confirmProjectSwitch}
            onCancel={cancelProjectSwitch}
          />
        )}
      </div>
    </NotificationProvider>
  );
}
