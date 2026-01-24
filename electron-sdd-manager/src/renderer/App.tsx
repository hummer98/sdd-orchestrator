/**
 * Main Application Component
 * Requirements: 1.1, 2.1, 3.1, 11.1
 * Task 8.2: ApiClientProvider, PlatformProvider integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Wifi } from 'lucide-react';
import {
  NotificationProvider,
  UnsavedChangesDialog,
  ResizeHandle,
  // Task 30-33: Agent管理コンポーネント
  AgentLogPanel,
  AgentInputPanel,
  // CLI Install
  CliInstallDialog,
  // Unified Commandset Install
  CommandsetInstallDialog,
  // Task 3, 4 (sidebar-refactor): サイドバー改善コンポーネント
  ProjectAgentPanel,
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
  ProjectValidationPanel,
  // Bug fix: bugs-tab-agent-list-missing - タブベースのペイン切り替え
  SpecPane,
  BugPane,
  // debatex-document-review Task 4.1: Project Settings Dialog
  ProjectSettingsDialog,
  // project-selection-view feature: プロジェクト選択画面
  ProjectSelectionView,
} from './components';
import type { DocsTab } from './components';
import type { ProfileName } from './components/CommandsetInstallDialog';
import { useProjectStore, useSpecStore, useEditorStore, useAgentStore, useWorkflowStore, useRemoteAccessStore, useNotificationStore, useConnectionStore, useSharedBugStore } from './stores';
import type { CommandPrefix, ProfileConfig } from './stores';
import { initAutoExecutionIpcListeners, cleanupAutoExecutionIpcListeners } from './stores/spec/autoExecutionStore';
// bug-auto-execution-per-bug-state: Import bug auto-execution IPC listeners
import { initBugAutoExecutionIpcListeners, cleanupBugAutoExecutionIpcListeners } from '../shared/stores/bugAutoExecutionStore';
// Task 8.2: Shared providers for API abstraction and platform capabilities
import { ApiClientProvider, PlatformProvider } from '../shared';
// header-profile-badge feature
import { ProfileBadge } from '../shared/components/ui';

// ペイン幅の制限値
const LEFT_PANE_MIN = 200;
const LEFT_PANE_MAX = 500;
const RIGHT_PANE_MIN = 250;
const RIGHT_PANE_MAX = 500;
const BOTTOM_PANE_MIN = 100;
// BOTTOM_PANE_MAX removed: no upper limit for agent log panel height
// 右ペイン内のAgent一覧パネルの高さ制限
const AGENT_LIST_MIN = 80;
const AGENT_LIST_MAX = 400;
// 左ペイン内のProjectAgentPanelの高さ制限（project-agent-panel-always-visible feature）
const PROJECT_AGENT_PANEL_MIN = 80;
const PROJECT_AGENT_PANEL_MAX = 300;

// デフォルトのレイアウト値（pane-layout-persistence feature）
// layoutConfigService.tsのDEFAULT_LAYOUTと同一の値
const DEFAULT_LAYOUT = {
  leftPaneWidth: 320,    // w-80 = 20rem = 320px
  rightPaneWidth: 360,   // 360px
  bottomPaneHeight: 240, // h-60 = 15rem = 240px
  agentListHeight: 200,  // Agent一覧パネルの高さ（右サイドバー）
  projectAgentPanelHeight: 160, // ProjectAgentPanelの高さ（左サイドバー）
};

export function App() {
  const { currentProject, kiroValidation, loadInitialProject, loadRecentProjects, selectProject, checkSpecManagerFiles, installedProfile } = useProjectStore();
  const { specDetail } = useSpecStore();
  const { isDirty } = useEditorStore();
  // bugs-view-unification Task 6.1: Use shared bugStore
  // Compute selectedBug from bugs + selectedBugId
  const { bugs, selectedBugId } = useSharedBugStore();
  const selectedBug = selectedBugId ? bugs.find(b => b.name === selectedBugId) : null;
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
  const [isRemoteAccessDialogOpen, setIsRemoteAccessDialogOpen] = useState(false);
  // Unified Commandset Install dialog
  const [isCommandsetInstallDialogOpen, setIsCommandsetInstallDialogOpen] = useState(false);
  // SSH Remote Project dialogs
  const [isSSHConnectDialogOpen, setIsSSHConnectDialogOpen] = useState(false);
  const [isSSHConnecting, setIsSSHConnecting] = useState(false);
  // Bug fix: bugs-tab-agent-list-missing - タブ状態をApp.tsxで管理
  const [activeTab, setActiveTab] = useState<DocsTab>('specs');
  // debatex-document-review Task 4.2: Project Settings Dialog
  const [isProjectSettingsDialogOpen, setIsProjectSettingsDialogOpen] = useState(false);

  // ペインサイズの状態（pane-layout-persistence feature）
  const [leftPaneWidth, setLeftPaneWidth] = useState(DEFAULT_LAYOUT.leftPaneWidth);
  const [rightPaneWidth, setRightPaneWidth] = useState(DEFAULT_LAYOUT.rightPaneWidth);
  const [bottomPaneHeight, setBottomPaneHeight] = useState(DEFAULT_LAYOUT.bottomPaneHeight);
  const [agentListHeight, setAgentListHeight] = useState(DEFAULT_LAYOUT.agentListHeight);
  // project-agent-panel-always-visible feature: ProjectAgentPanelの高さ状態
  const [projectAgentPanelHeight, setProjectAgentPanelHeight] = useState(DEFAULT_LAYOUT.projectAgentPanelHeight);

  // リサイズハンドラー
  const handleLeftResize = useCallback((delta: number) => {
    setLeftPaneWidth((prev) => Math.min(LEFT_PANE_MAX, Math.max(LEFT_PANE_MIN, prev + delta)));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightPaneWidth((prev) => Math.min(RIGHT_PANE_MAX, Math.max(RIGHT_PANE_MIN, prev - delta)));
  }, []);

  const handleBottomResize = useCallback((delta: number) => {
    setBottomPaneHeight((prev) => Math.max(BOTTOM_PANE_MIN, prev - delta));
  }, []);

  const handleAgentListResize = useCallback((delta: number) => {
    setAgentListHeight((prev) => Math.min(AGENT_LIST_MAX, Math.max(AGENT_LIST_MIN, prev + delta)));
  }, []);

  // project-agent-panel-always-visible feature: ProjectAgentPanelリサイズハンドラー
  // パネルは上方向にリサイズするため、deltaを負に（上へドラッグするとパネルが大きくなる）
  const handleProjectAgentPanelResize = useCallback((delta: number) => {
    setProjectAgentPanelHeight((prev) =>
      Math.min(PROJECT_AGENT_PANEL_MAX, Math.max(PROJECT_AGENT_PANEL_MIN, prev - delta))
    );
  }, []);

  // レイアウト保存関数（app-wide layout persistence）
  // 現在のペインサイズをアプリ設定に保存
  const saveLayout = useCallback(async () => {
    try {
      await window.electronAPI.saveLayoutConfig({
        leftPaneWidth,
        rightPaneWidth,
        bottomPaneHeight,
        agentListHeight,
        projectAgentPanelHeight,
      });
      console.log('[App] Layout config saved');
    } catch (error) {
      console.error('[App] Failed to save layout config:', error);
    }
  }, [leftPaneWidth, rightPaneWidth, bottomPaneHeight, agentListHeight, projectAgentPanelHeight]);

  // レイアウト復元関数（app-wide layout persistence）
  // アプリ設定からペインサイズを読み込む
  const loadLayout = useCallback(async () => {
    try {
      const config = await window.electronAPI.loadLayoutConfig();
      if (config) {
        setLeftPaneWidth(config.leftPaneWidth);
        setRightPaneWidth(config.rightPaneWidth);
        setBottomPaneHeight(config.bottomPaneHeight);
        setAgentListHeight(config.agentListHeight);
        // 後方互換性（存在しない場合はデフォルト値）
        setProjectAgentPanelHeight(config.projectAgentPanelHeight ?? DEFAULT_LAYOUT.projectAgentPanelHeight);
        console.log('[App] Layout config loaded:', config);
      } else {
        // 設定が存在しない場合はデフォルト値を使用
        console.log('[App] No layout config found, using defaults');
      }
    } catch (error) {
      console.error('[App] Failed to load layout config:', error);
    }
  }, []);

  // レイアウトリセット関数（app-wide layout persistence）
  // すべてのペインをデフォルト値に戻し、設定に保存
  const resetLayout = useCallback(async () => {
    setLeftPaneWidth(DEFAULT_LAYOUT.leftPaneWidth);
    setRightPaneWidth(DEFAULT_LAYOUT.rightPaneWidth);
    setBottomPaneHeight(DEFAULT_LAYOUT.bottomPaneHeight);
    setAgentListHeight(DEFAULT_LAYOUT.agentListHeight);
    setProjectAgentPanelHeight(DEFAULT_LAYOUT.projectAgentPanelHeight);

    try {
      await window.electronAPI.resetLayoutConfig();
      console.log('[App] Layout config reset to defaults');
    } catch (error) {
      console.error('[App] Failed to reset layout config:', error);
    }
  }, []);

  // Load initial project from command line argument and recent projects on mount
  const initialProjectLoaded = useRef(false);
  useEffect(() => {
    if (initialProjectLoaded.current) {
      return;
    }
    initialProjectLoaded.current = true;

    // Load recent projects first, then check for initial project
    // Also load app-wide layout config
    loadRecentProjects().then(async () => {
      await loadInitialProject();
      // Load app-wide layout config (no longer project-specific)
      await loadLayout();
    });
  }, [loadRecentProjects, loadInitialProject, loadLayout]);

  // Setup agent event listeners on mount
  // useRefを使用してStrictModeでの二重実行を防止
  const eventListenersSetup = useRef(false);
  useEffect(() => {
    if (eventListenersSetup.current) {
      return;
    }
    eventListenersSetup.current = true;
    const cleanup = setupEventListeners();

    // agent-exit-robustness: Register agent exit error listener
    // Requirements: 3.4, 3.5 - Notify user when agent exit processing fails
    const cleanupAgentExitError = window.electronAPI.onAgentExitError((data) => {
      console.error('[App] Agent exit error:', data);
      addNotification({
        type: 'error',
        message: `Agent終了処理でエラーが発生しました: ${data.agentId}`,
      });
    });

    return () => {
      eventListenersSetup.current = false;
      cleanup();
      cleanupAgentExitError();
    };
  }, [setupEventListeners, addNotification]);

  // Initialize remote access store on mount
  const remoteAccessInitialized = useRef(false);
  useEffect(() => {
    if (remoteAccessInitialized.current) {
      return;
    }
    remoteAccessInitialized.current = true;
    initializeRemoteAccess();
  }, [initializeRemoteAccess]);

  // Initialize auto-execution IPC listeners on mount
  // This enables specStore to receive state updates from Main Process (bug fix: auto-execution-state-sync)
  const autoExecutionIpcInitialized = useRef(false);
  useEffect(() => {
    if (autoExecutionIpcInitialized.current) {
      return;
    }
    autoExecutionIpcInitialized.current = true;
    initAutoExecutionIpcListeners();
    return () => {
      autoExecutionIpcInitialized.current = false;
      cleanupAutoExecutionIpcListeners();
    };
  }, []);

  // bug-auto-execution-per-bug-state Task 7.1: Initialize bug auto-execution IPC listeners
  // This enables bugAutoExecutionStore to receive state updates from Main Process
  const bugAutoExecutionIpcInitialized = useRef(false);
  useEffect(() => {
    if (bugAutoExecutionIpcInitialized.current) {
      return;
    }
    bugAutoExecutionIpcInitialized.current = true;
    initBugAutoExecutionIpcListeners();
    return () => {
      bugAutoExecutionIpcInitialized.current = false;
      cleanupBugAutoExecutionIpcListeners();
    };
  }, []);

  // Setup menu event listeners
  const menuListenersSetup = useRef(false);
  useEffect(() => {
    if (menuListenersSetup.current) {
      return;
    }
    menuListenersSetup.current = true;

    const cleanupOpenProject = window.electronAPI.onMenuOpenProject(async (projectPath: string) => {
      console.log(`[App] Opening project from menu: ${projectPath}`);
      await selectProject(projectPath);
      // Note: Layout is app-wide, no need to reload on project switch
    });

    const cleanupCliInstall = window.electronAPI.onMenuInstallCliCommand(() => {
      setIsCliInstallDialogOpen(true);
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

    // レイアウトリセットメニューイベントリスナー（pane-layout-persistence feature）
    const cleanupResetLayout = window.electronAPI.onMenuResetLayout(() => {
      console.log('[App] Reset layout from menu');
      resetLayout();
    });

    // Experimental Tools Install menu event listeners (experimental-tools-installer feature)
    // Note: Plan command is not yet implemented in the backend

    const cleanupExpDebug = window.electronAPI.onMenuInstallExperimentalDebug(async () => {
      if (!currentProject) {
        addNotification({
          type: 'warning',
          message: 'ツールをインストールするにはプロジェクトを選択してください',
        });
        return;
      }

      // Check if file exists
      const checkResult = await window.electronAPI.checkExperimentalToolExists(currentProject, 'debug');
      let shouldInstall = true;

      if (checkResult.exists) {
        shouldInstall = window.confirm('debug.mdは既に存在します。上書きしますか？');
        if (!shouldInstall) {
          addNotification({ type: 'info', message: 'Debugエージェントのインストールをキャンセルしました' });
          return;
        }
      }

      const result = await window.electronAPI.installExperimentalDebug(currentProject, { force: shouldInstall && checkResult.exists });

      if (result.ok) {
        if (result.value.installedFiles.length > 0) {
          addNotification({ type: 'success', message: 'Debugエージェントをインストールしました。CLAUDE.mdへのマージも実行されます。' });
        } else if (result.value.overwrittenFiles.length > 0) {
          addNotification({ type: 'success', message: 'Debugエージェントを上書きしました' });
        } else if (result.value.skippedFiles.length > 0) {
          addNotification({ type: 'info', message: 'Debugエージェントは既にインストール済みです' });
        }
      } else {
        addNotification({ type: 'error', message: `インストールに失敗しました: ${result.error.type}` });
      }
    });

    return () => {
      menuListenersSetup.current = false;
      cleanupOpenProject();
      cleanupCliInstall();
      cleanupCommandPrefix();
      cleanupToggleRemoteServer();
      cleanupCommandsetInstall();
      cleanupResetLayout();
      cleanupExpDebug();
    };
  }, [selectProject, currentProject, setCommandPrefix, startServer, stopServer, addNotification, resetLayout]);

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

  // Task 8.2: Wrap with ApiClientProvider and PlatformProvider
  // These providers enable shared components to use abstract API and platform capabilities
  return (
    <ApiClientProvider>
      <PlatformProvider>
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
                {/* header-profile-badge feature: show installed profile */}
                <ProfileBadge
                  profile={installedProfile?.name ?? null}
                  className="ml-2"
                />
              </div>
            )}
            {/* Spec title in header */}
            {specDetail && specDetail.specJson && (
              <div className="ml-4 flex items-center gap-2">
                <span className="text-gray-400">/</span>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {specDetail.specJson.feature_name || specDetail.metadata.name}
                </span>
              </div>
            )}
            {/* Bug title in header (when bug is selected and no spec is selected) */}
            {selectedBug && !specDetail && (
              <div className="ml-4 flex items-center gap-2">
                <span className="text-gray-400">/</span>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {selectedBug.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* debatex-document-review Task 4.2: Project Settings Button */}
            {currentProject && (
              <button
                onClick={() => setIsProjectSettingsDialogOpen(true)}
                className="titlebar-no-drag p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="プロジェクト設定"
                aria-label="プロジェクト設定"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
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
            {/* Remote Access Server Status Indicator */}
            {isRemoteServerRunning && (
              <button
                onClick={() => setIsRemoteAccessDialogOpen(true)}
                className="titlebar-no-drag p-1.5 text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="リモートアクセスサーバー稼働中"
                aria-label="リモートアクセスサーバー設定を開く"
              >
                <Wifi className="w-5 h-5" />
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
            {/* 1. ProjectValidationPanel (バリデーション表示のみ、問題がある場合に表示) */}
            <ProjectValidationPanel />

            {/* 2. ErrorBanner (問題がある場合のみ表示) */}
            <ErrorBanner />

            {/* 3. DocsTabs (Specs/Bugsタブ切り替え、新規作成ボタン含む) */}
            {currentProject && kiroValidation?.exists && (
              <div className="flex-1 overflow-hidden">
                <DocsTabs activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            )}

            {/* 4. ProjectAgentPanel用リサイズハンドル（上方向にリサイズ） - プロジェクト選択時のみ表示 */}
            {currentProject && (
              <>
                <ResizeHandle direction="vertical" onResize={handleProjectAgentPanelResize} onResizeEnd={saveLayout} />

                {/* 5. ProjectAgentPanel (下部固定、リサイズ可能) */}
                <div
                  style={{ height: projectAgentPanelHeight }}
                  className="shrink-0 overflow-hidden"
                  data-testid="project-agent-panel-container"
                >
                  <ProjectAgentPanel />
                </div>
              </>
            )}
          </aside>

          {/* Left resize handle */}
          <ResizeHandle direction="horizontal" onResize={handleLeftResize} onResizeEnd={saveLayout} />

          {/* Main area */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Bug fix: bugs-tab-agent-list-missing - タブ選択に応じてペインを切り替え */}
            {currentProject && kiroValidation?.exists ? (
              activeTab === 'specs' ? (
                <SpecPane
                  rightPaneWidth={rightPaneWidth}
                  agentListHeight={agentListHeight}
                  onRightResize={handleRightResize}
                  onAgentListResize={handleAgentListResize}
                  onResizeEnd={saveLayout}
                />
              ) : (
                <BugPane
                  rightPaneWidth={rightPaneWidth}
                  agentListHeight={agentListHeight}
                  onRightResize={handleRightResize}
                  onAgentListResize={handleAgentListResize}
                  onResizeEnd={saveLayout}
                />
              )
            ) : (
              /* 未選択時: プロジェクト選択画面 or .kiro初期化プロンプト */
              currentProject ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  .kiroディレクトリを初期化してください
                </div>
              ) : (
                /* project-selection-view feature: プロジェクト選択画面 */
                <ProjectSelectionView />
              )
            )}
          </main>
        </div>

        {/* Bottom resize handle */}
        <ResizeHandle direction="vertical" onResize={handleBottomResize} onResizeEnd={saveLayout} />

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

        <RemoteAccessDialog
          isOpen={isRemoteAccessDialogOpen}
          onClose={() => setIsRemoteAccessDialogOpen(false)}
        />

        {/* Unified Commandset Install Dialog */}
        <CommandsetInstallDialog
          isOpen={isCommandsetInstallDialogOpen}
          projectPath={currentProject || ''}
          onClose={() => setIsCommandsetInstallDialogOpen(false)}
          onInstall={async (profileName: ProfileName, _progressCallback) => {
            if (!currentProject) return;
            console.log(`[App] Installing commandset with profile: ${profileName}`);

            const result = await window.electronAPI.installCommandsetByProfile(
              currentProject,
              profileName,
              { force: true }
            );

            if (!result.ok) {
              throw new Error(result.error.message || result.error.type);
            }

            const { summary } = result.value;
            console.log(`[App] Commandset installed successfully:`, summary);

            // Refresh spec-manager files check to update UI (bug fix: commandset-install-warning-persists)
            await checkSpecManagerFiles(currentProject);

            // header-profile-badge feature: Reload profile after successful install
            // Requirements: 3.2, 3.3 - Auto-update profile badge after installation
            try {
              const profile = await window.electronAPI.loadProfile(currentProject);
              // Cast to ProfileConfig since we know the IPC returns the correct structure
              useProjectStore.setState({ installedProfile: profile as ProfileConfig | null });
              console.log('[App] Profile reloaded after commandset install:', profile);
            } catch (error) {
              console.error('[App] Failed to reload profile after install:', error);
            }

            // Return summary for the dialog to display
            return {
              totalInstalled: summary.totalInstalled,
              totalSkipped: summary.totalSkipped,
              totalFailed: summary.totalFailed,
            };
          }}
          onCheckAgentFolderExists={async (projectPath: string) => {
            return window.electronAPI.checkAgentFolderExists(projectPath);
          }}
          onDeleteAgentFolder={async (projectPath: string) => {
            return window.electronAPI.deleteAgentFolder(projectPath);
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

        {/* debatex-document-review Task 4.2: Project Settings Dialog */}
        <ProjectSettingsDialog
          isOpen={isProjectSettingsDialogOpen}
          onClose={() => setIsProjectSettingsDialogOpen(false)}
        />
          </div>
        </NotificationProvider>
      </PlatformProvider>
    </ApiClientProvider>
  );
}
