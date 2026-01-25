/**
 * Preload Script
 * Exposes safe API to renderer process via contextBridge
 * Requirements: 11.2, 13.1-13.3, 5.1-5.8, 9.1-9.10, 10.1-10.3
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipc/channels';
import type { Phase, SelectProjectResult } from '../renderer/types';
import type { ExecutionGroup } from '../main/services/specManagerService';
// agent-state-file-ssot: Import AgentInfo/AgentStatus from agentRecordService (SSOT)
import type { AgentInfo, AgentStatus } from '../main/services/agentRecordService';
import type { SpecsChangeEvent } from '../main/services/specsWatcherService';
import type { FullCheckResult, FileCheckResult } from '../main/services/projectChecker';
import type { FullInstallResult, InstallResult, InstallError, Result, ClaudeMdInstallMode, ClaudeMdInstallResult } from '../main/services/commandInstallerService';
import type { AddPermissionsResult } from '../main/services/permissionsService';
import type { CliInstallStatus, CliInstallResult } from '../main/services/cliInstallerService';
import type { ServerStartResult, ServerStatus, ServerError } from '../main/services/remoteAccessServer';
import type { CcSddWorkflowInstallResult, CcSddWorkflowInstallStatus, InstallError as CcSddInstallError, Result as CcSddResult } from '../main/services/ccSddWorkflowInstaller';
import type { ProfileName, UnifiedInstallResult, UnifiedInstallStatus } from '../main/services/unifiedCommandsetInstaller';
import type { BugDetail, BugsChangeEvent, ReadBugsResult } from '../renderer/types';
import type { LayoutValues } from '../main/services/configStore';
import type {
  InstallOptions as ExperimentalInstallOptions,
  InstallResult as ExperimentalInstallResult,
  InstallError as ExperimentalInstallError,
  CheckResult as ExperimentalCheckResult,
  Result as ExperimentalResult,
} from '../main/services/experimentalToolsInstallerService';
// runtime-agents-restructure: MigrationInfo is imported via type annotation below, no explicit import needed

/**
 * Exposed API to renderer process
 * window.electronAPI
 */
const electronAPI = {
  // File System
  showOpenDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG),

  validateKiroDirectory: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_KIRO_DIRECTORY, path),

  /**
   * Set project path (legacy API)
   * @deprecated Use selectProject instead for unified project selection
   */
  setProjectPath: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_PROJECT_PATH, projectPath),

  // ============================================================
  // Unified Project Selection (unified-project-selection feature)
  // Requirements: 1.1-1.6, 4.1-4.4, 5.1-5.4, 6.1-6.4
  // ============================================================

  /**
   * Select a project using unified selection mechanism
   * This is the recommended API for project selection.
   * Handles path validation, kiro directory detection, specs/bugs loading,
   * and file watcher initialization in a single call.
   *
   * @param projectPath - Absolute path to the project directory
   * @returns SelectProjectResult with project data or error information
   */
  selectProject: (projectPath: string): Promise<SelectProjectResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_PROJECT, projectPath),

  readSpecs: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_SPECS, projectPath),

  // spec-path-ssot-refactor Task 5.1: Change from specPath to specName
  readSpecJson: (specName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_SPEC_JSON, specName),

  // spec-path-ssot-refactor: Change from artifactPath to (specName, filename)
  // bug-artifact-content-not-displayed: Add entityType to support both specs and bugs
  readArtifact: (name: string, filename: string, entityType: 'spec' | 'bug' = 'spec') =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_ARTIFACT, name, filename, entityType),

  // Bug fix: worktree-artifact-save
  // writeArtifact uses path resolution like readArtifact
  // This ensures artifacts are saved to the correct location (worktree or main)
  writeArtifact: (name: string, filename: string, content: string, entityType: 'spec' | 'bug' = 'spec') =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_ARTIFACT, name, filename, content, entityType),

  createSpec: (projectPath: string, specName: string, description: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SPEC, projectPath, specName, description),

  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),

  // spec-path-ssot-refactor Task 5.2: Change from specPath to specName
  updateApproval: (specName: string, phase: Phase, approved: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_APPROVAL, specName, phase, approved),

  // spec-scoped-auto-execution-state: Update spec.json with arbitrary fields
  // spec-path-ssot-refactor Task 5.3: Change from specPath to specName
  updateSpecJson: (specName: string, updates: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SPEC_JSON, specName, updates),

  // Agent Management (Task 27.1, 28.1)
  // Requirements: 5.1-5.8
  // skip-permissions-main-process: skipPermissions is now auto-fetched in Main Process
  startAgent: (
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: ExecutionGroup,
    sessionId?: string
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_AGENT, specId, phase, command, args, group, sessionId),

  stopAgent: (agentId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_AGENT, agentId),

  // skip-permissions-main-process: skipPermissions is now auto-fetched in Main Process
  resumeAgent: (agentId: string, prompt?: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId, prompt),

  deleteAgent: (specId: string, agentId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_AGENT, specId, agentId),

  getAgents: (specId: string): Promise<AgentInfo[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AGENTS, specId),

  getAllAgents: (): Promise<Record<string, AgentInfo[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_AGENTS),

  sendAgentInput: (agentId: string, input: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_AGENT_INPUT, agentId, input),

  getAgentLogs: (
    specId: string,
    agentId: string
  ): Promise<Array<{ timestamp: string; stream: 'stdout' | 'stderr'; data: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AGENT_LOGS, specId, agentId),

  // Phase Execution (high-level commands)
  // These delegate command building to the service layer

  // ============================================================
  // execute-method-unification: Unified execute API
  // ============================================================
  /**
   * Execute a phase using the unified execute method
   * @param options ExecuteOptions with type discriminant
   * @returns AgentInfo for the started agent
   */
  execute: (options: import('../shared/types/executeOptions').ExecuteOptions): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE, options),

  // Task 5.2.2 (sidebar-refactor): spec-init連携
  // spec-worktree-early-creation: Task 4.2 - worktreeModeパラメータ追加
  // Launch spec-init agent with description only (specId='')
  // Returns the agentId immediately without waiting for completion
  // commandPrefix determines the slash command: /kiro:spec-init or /spec-manager:init
  executeSpecInit: (
    projectPath: string,
    description: string,
    commandPrefix?: 'kiro' | 'spec-manager',
    worktreeMode?: boolean
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_INIT, projectPath, description, commandPrefix, worktreeMode),

  // ============================================================
  // Spec Plan (spec-plan-ui-integration feature)
  // spec-worktree-early-creation: Task 4.2 - worktreeModeパラメータ追加
  // ============================================================

  /**
   * Execute spec-plan agent for interactive requirements generation
   * Launches interactive dialogue to generate requirements.md with Decision Log
   * @param projectPath Project root path
   * @param description Initial idea/description for planning dialogue
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @param worktreeMode Whether to create worktree at spec creation time
   * @returns AgentInfo on success
   */
  executeSpecPlan: (
    projectPath: string,
    description: string,
    commandPrefix?: 'kiro' | 'spec-manager',
    worktreeMode?: boolean
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_PLAN, projectPath, description, commandPrefix, worktreeMode),

  // Bug Create: Launch bug-create agent with description only (specId='')
  // Returns the agentId immediately without waiting for completion
  // Bug name is auto-generated by Claude from description per bug-create.md spec
  // bug-create-dialog-unification: worktreeMode parameter added
  executeBugCreate: (projectPath: string, description: string, worktreeMode?: boolean): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_BUG_CREATE, projectPath, description, worktreeMode),

  // ============================================================
  // Ask Agent Execution (agent-ask-execution feature)
  // Requirements: 2.5, 3.1-3.4, 4.1-4.5, 5.1-5.6
  // ============================================================

  /**
   * Execute Spec Ask agent with custom prompt
   * Loads steering files and spec files as context
   * @param specId Spec directory name
   * @param featureName Feature name
   * @param prompt User's custom prompt
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeAskSpec: (
    specId: string,
    featureName: string,
    prompt: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_ASK_SPEC, specId, featureName, prompt, commandPrefix),

  // ============================================================
  // release-button-api-fix: Project Command Execution
  // Requirements: 1.1, 4.3
  // ============================================================

  /**
   * Execute project-level command
   * @param projectPath Project root path
   * @param command Command string to execute (e.g., '/release', '/kiro:project-ask "prompt"')
   * @param title Display title for Agent list
   * @returns AgentInfo on success
   */
  executeProjectCommand: (
    projectPath: string,
    command: string,
    title: string
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_PROJECT_COMMAND, projectPath, command, title),

  // Agent Events (Task 27.2, 28.1)
  // Requirements: 9.1-9.10
  onAgentOutput: (
    callback: (agentId: string, stream: 'stdout' | 'stderr', data: string) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      agentId: string,
      stream: 'stdout' | 'stderr',
      data: string
    ) => {
      callback(agentId, stream, data);
    };
    ipcRenderer.on(IPC_CHANNELS.AGENT_OUTPUT, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_OUTPUT, handler);
    };
  },

  onAgentStatusChange: (
    callback: (agentId: string, status: AgentStatus) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      agentId: string,
      status: AgentStatus
    ) => {
      callback(agentId, status);
    };
    ipcRenderer.on(IPC_CHANNELS.AGENT_STATUS_CHANGE, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STATUS_CHANGE, handler);
    };
  },

  /**
   * agent-exit-robustness: Subscribe to agent exit error events
   * Called when handleAgentExit encounters an error (e.g., readRecord failure)
   * Requirements: 3.4
   * @param callback Function called when agent exit error occurs
   * @returns Cleanup function to unsubscribe
   */
  onAgentExitError: (
    callback: (data: { agentId: string; error: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; error: string }
    ) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.AGENT_EXIT_ERROR, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_EXIT_ERROR, handler);
    };
  },

  // Config
  getRecentProjects: () => ipcRenderer.invoke(IPC_CHANNELS.GET_RECENT_PROJECTS),

  addRecentProject: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_RECENT_PROJECT, path),

  // Config - Hang Threshold (Task 27.3, 28.2)
  // Requirements: 13.1, 13.2
  getHangThreshold: (): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_HANG_THRESHOLD),

  setHangThreshold: (thresholdMs: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_HANG_THRESHOLD, thresholdMs),

  // App
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),

  getPlatform: (): NodeJS.Platform => process.platform,

  getInitialProjectPath: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_INITIAL_PROJECT_PATH),

  // Specs Watcher
  startSpecsWatcher: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_SPECS_WATCHER),

  stopSpecsWatcher: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_SPECS_WATCHER),

  onSpecsChanged: (callback: (event: SpecsChangeEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changeEvent: SpecsChangeEvent) => {
      callback(changeEvent);
    };
    ipcRenderer.on(IPC_CHANNELS.SPECS_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SPECS_CHANGED, handler);
    };
  },

  // Agent Record Watcher
  // Bug fix: spec-agent-list-not-updating-on-auto-execution
  // Simplified to only receive event info (specId, agentId) - renderer fetches full data via loadAgents()
  onAgentRecordChanged: (
    callback: (type: 'add' | 'change' | 'unlink', eventInfo: { agentId?: string; specId?: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      type: 'add' | 'change' | 'unlink',
      eventInfo: { agentId?: string; specId?: string }
    ) => {
      callback(type, eventInfo);
    };
    ipcRenderer.on(IPC_CHANNELS.AGENT_RECORD_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_RECORD_CHANGED, handler);
    };
  },

  // agent-watcher-optimization Task 4.2: Switch watch scope for specific spec/bug
  // Bug fix: bugs-agent-list-not-updating
  // Called when spec/bug is selected to focus file watcher on that directory
  switchAgentWatchScope: (scopeId: string | null): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE, scopeId),

  // agent-watcher-optimization Task 2.2: Get running agent counts per spec
  // Requirements: 2.1 - Get running agent counts efficiently for SpecList badges
  getRunningAgentCounts: (): Promise<Record<string, number>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RUNNING_AGENT_COUNTS),

  // spec-manager Install (Requirements: 4.1-4.6)
  checkSpecManagerFiles: (projectPath: string): Promise<FullCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_SPEC_MANAGER_FILES, projectPath),

  installSpecManagerCommands: (
    projectPath: string,
    missingCommands: readonly string[]
  ): Promise<Result<InstallResult, InstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_SPEC_MANAGER_COMMANDS, projectPath, missingCommands),

  installSpecManagerSettings: (
    projectPath: string,
    missingSettings: readonly string[]
  ): Promise<Result<InstallResult, InstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_SPEC_MANAGER_SETTINGS, projectPath, missingSettings),

  installSpecManagerAll: (projectPath: string): Promise<Result<FullInstallResult, InstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_SPEC_MANAGER_ALL, projectPath),

  forceReinstallSpecManagerAll: (projectPath: string): Promise<Result<FullInstallResult, InstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.FORCE_REINSTALL_SPEC_MANAGER_ALL, projectPath),

  // CLAUDE.md Install
  checkClaudeMdExists: (projectPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_CLAUDE_MD_EXISTS, projectPath),

  installClaudeMd: (projectPath: string, mode: ClaudeMdInstallMode): Promise<Result<ClaudeMdInstallResult, InstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_CLAUDE_MD, projectPath, mode),

  // Phase Sync - Auto-fix spec.json phase based on task completion
  // options.skipTimestamp: If true, do not update updated_at (used for UI auto-correction)
  // spec-path-ssot-refactor Task 5.4: Change from specPath to specName
  syncSpecPhase: (specName: string, completedPhase: 'impl' | 'impl-complete', options?: { skipTimestamp?: boolean }): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_SPEC_PHASE, specName, completedPhase, options),

  // ============================================================
  // Steering Verification (steering-verification-integration feature)
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  // ============================================================

  /**
   * Check steering files (verification-commands.md exists)
   * @param projectPath Project root path
   * @returns SteeringCheckResult with verificationMdExists
   */
  checkSteeringFiles: (projectPath: string): Promise<{ verificationMdExists: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_STEERING_FILES, projectPath),

  /**
   * Generate verification-commands.md file
   * Uses template from settings and project analysis
   * @param projectPath Project root path
   */
  generateVerificationMd: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_VERIFICATION_MD, projectPath),

  // ============================================================
  // Release (steering-release-integration feature)
  // Requirements: 3.2, 3.4
  // ============================================================

  /**
   * Check release.md existence
   * @param projectPath Project root path
   * @returns ReleaseCheckResult with releaseMdExists
   */
  checkReleaseMd: (projectPath: string): Promise<{ releaseMdExists: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_RELEASE_MD, projectPath),

  /**
   * Generate release.md file by launching steering-release agent
   * @param projectPath Project root path
   */
  generateReleaseMd: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_RELEASE_MD, projectPath),

  // Document Review Sync - Auto-fix spec.json documentReview based on file system
  // spec-path-ssot-refactor: Change from specPath to specName
  syncDocumentReview: (specName: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_DOCUMENT_REVIEW, specName),

  // Permissions - Add shell permissions to project
  addShellPermissions: (projectPath: string): Promise<AddPermissionsResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_SHELL_PERMISSIONS, projectPath),

  // Permissions - Add specific missing permissions to project
  addMissingPermissions: (projectPath: string, permissions: string[]): Promise<AddPermissionsResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_MISSING_PERMISSIONS, projectPath, permissions),

  // Permissions - Check required permissions
  checkRequiredPermissions: (projectPath: string): Promise<FileCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_REQUIRED_PERMISSIONS, projectPath),

  // Menu Events - Open Project (from Recent Projects menu)
  onMenuOpenProject: (callback: (projectPath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, projectPath: string) => {
      callback(projectPath);
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_PROJECT, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_OPEN_PROJECT, handler);
    };
  },

  // CLI Install
  getCliInstallStatus: (location?: 'user' | 'system'): Promise<CliInstallStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CLI_INSTALL_STATUS, location),

  installCliCommand: (location?: 'user' | 'system'): Promise<CliInstallResult & {
    instructions: {
      title: string;
      steps: string[];
      command: string;
      usage: {
        title: string;
        examples: Array<{ command: string; description: string }>;
      };
      pathNote?: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_CLI_COMMAND, location),

  // Menu Events - CLI Install
  onMenuInstallCliCommand: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_CLI_COMMAND, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_CLI_COMMAND, handler);
    };
  },

  // Menu Events - Command Prefix
  onMenuSetCommandPrefix: (callback: (prefix: 'kiro' | 'spec-manager') => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, prefix: 'kiro' | 'spec-manager') => {
      callback(prefix);
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_SET_COMMAND_PREFIX, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_SET_COMMAND_PREFIX, handler);
    };
  },

  // Menu Events - Toggle Remote Server
  onMenuToggleRemoteServer: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_TOGGLE_REMOTE_SERVER, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_TOGGLE_REMOTE_SERVER, handler);
    };
  },

  // ============================================================
  // Remote Access Server (Requirements: 1.1, 1.2, 1.6)
  // ============================================================

  /**
   * Start the remote access server
   * @param preferredPort Optional preferred port (default: 8765)
   * @returns Result with server info on success, or error on failure
   */
  startRemoteServer: (preferredPort?: number): Promise<Result<ServerStartResult, ServerError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_REMOTE_SERVER, preferredPort),

  /**
   * Stop the remote access server
   */
  stopRemoteServer: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_REMOTE_SERVER),

  /**
   * Get current remote access server status
   */
  getRemoteServerStatus: (): Promise<ServerStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_REMOTE_SERVER_STATUS),

  /**
   * Subscribe to remote server status changes
   * @param callback Function called when status changes
   * @returns Cleanup function to unsubscribe
   */
  onRemoteServerStatusChanged: (callback: (status: ServerStatus) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: ServerStatus) => {
      callback(status);
    };
    ipcRenderer.on(IPC_CHANNELS.REMOTE_SERVER_STATUS_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.REMOTE_SERVER_STATUS_CHANGED, handler);
    };
  },

  /**
   * Subscribe to remote client count changes
   * @param callback Function called when client count changes
   * @returns Cleanup function to unsubscribe
   */
  onRemoteClientCountChanged: (callback: (count: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, count: number) => {
      callback(count);
    };
    ipcRenderer.on(IPC_CHANNELS.REMOTE_CLIENT_COUNT_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.REMOTE_CLIENT_COUNT_CHANGED, handler);
    };
  },

  // ============================================================
  // Cloudflare Tunnel Integration (cloudflare-tunnel-integration feature)
  // Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.4
  // ============================================================

  /**
   * Get Cloudflare settings (tunnel token, access token, publish setting, cloudflared path)
   * @returns CloudflareSettings object
   */
  getCloudflareSettings: (): Promise<{
    hasTunnelToken: boolean;
    accessToken: string | null;
    publishToCloudflare: boolean;
    cloudflaredPath: string | null;
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOUDFLARE_GET_SETTINGS),

  /**
   * Set Cloudflare Tunnel Token
   * @param token Tunnel token string
   */
  setCloudfareTunnelToken: (token: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOUDFLARE_SET_TUNNEL_TOKEN, token),

  /**
   * Refresh access token (generates a new one)
   * @returns New access token
   */
  refreshCloudflareAccessToken: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOUDFLARE_REFRESH_ACCESS_TOKEN),

  /**
   * Refresh access token and get updated QR code
   * Used by remoteAccessStore for UI updates (Task 9.4, Task 15.2.2)
   * @returns RefreshAccessTokenResult with accessToken and tunnelQrCodeDataUrl
   */
  refreshAccessToken: async (): Promise<{
    accessToken: string;
    tunnelQrCodeDataUrl?: string;
  } | null> => {
    // Task 15.2.2: Call RemoteAccessServer's refreshAccessToken which handles QR regeneration
    const result = await ipcRenderer.invoke(IPC_CHANNELS.REFRESH_ACCESS_TOKEN);
    return result;
  },

  /**
   * Ensure access token exists (generates if needed)
   * @returns Access token (existing or newly generated)
   */
  ensureCloudflareAccessToken: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOUDFLARE_ENSURE_ACCESS_TOKEN),

  /**
   * Check if cloudflared binary exists
   * @returns BinaryCheckResponse with exists, path, and installInstructions
   */
  checkCloudflareBinary: (): Promise<{
    exists: boolean;
    path?: string;
    installInstructions?: {
      homebrew: string;
      macports: string;
      downloadUrl: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOUDFLARE_CHECK_BINARY),

  /**
   * Set publish to Cloudflare setting
   * @param enabled Whether to publish via Cloudflare Tunnel
   */
  setCloudflarePublishToCloudflare: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE, enabled),

  /**
   * Set custom cloudflared path
   * @param path Custom path or null to use default
   */
  setCloudflaredPath: (path: string | null): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOUDFLARE_SET_CLOUDFLARED_PATH, path),

  /**
   * Subscribe to tunnel status changes
   * @param callback Function called when tunnel status changes
   * @returns Cleanup function to unsubscribe
   */
  onCloudflareTunnelStatusChanged: (callback: (status: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    tunnelUrl: string | null;
    error: string | null;
  }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: {
      status: 'disconnected' | 'connecting' | 'connected' | 'error';
      tunnelUrl: string | null;
      error: string | null;
    }) => {
      callback(status);
    };
    ipcRenderer.on(IPC_CHANNELS.CLOUDFLARE_TUNNEL_STATUS_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CLOUDFLARE_TUNNEL_STATUS_CHANGED, handler);
    };
  },

  // ============================================================
  // cc-sdd Workflow Install (cc-sdd-command-installer feature)
  // ============================================================

  /**
   * Check cc-sdd workflow installation status
   * @param projectPath Project root path
   * @returns Installation status for commands, agents, settings, and CLAUDE.md
   */
  checkCcSddWorkflowStatus: (projectPath: string): Promise<CcSddWorkflowInstallStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_CC_SDD_WORKFLOW_STATUS, projectPath),

  /**
   * Install cc-sdd workflow (commands, agents, settings, CLAUDE.md section)
   * Includes Bug Workflow integration
   * @param projectPath Project root path
   * @returns Installation result
   */
  installCcSddWorkflow: (projectPath: string): Promise<CcSddResult<CcSddWorkflowInstallResult, CcSddInstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_CC_SDD_WORKFLOW, projectPath),

  /**
   * Menu event - Install Commandset (Unified Installer)
   * Requirements: 10.1
   */
  onMenuInstallCommandset: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_COMMANDSET, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_COMMANDSET, handler);
    };
  },

  // ============================================================
  // Unified Commandset Install (commandset-unified-installer feature)
  // Requirements: 11.1
  // ============================================================

  /**
   * Check unified commandset installation status
   * @param projectPath Project root path
   * @returns Installation status for all commandsets
   */
  checkCommandsetStatus: (projectPath: string): Promise<UnifiedInstallStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_COMMANDSET_STATUS, projectPath),

  /**
   * Install commandsets by profile
   * @param projectPath Project root path
   * @param profileName Profile name ('minimal', 'standard', 'full', 'lightweight-bug-fix-only')
   * @param options Install options (force: boolean)
   * @returns Installation result
   */
  installCommandsetByProfile: (
    projectPath: string,
    profileName: ProfileName,
    options?: { force?: boolean }
  ): Promise<{ ok: true; value: UnifiedInstallResult } | { ok: false; error: { type: string; message: string } }> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_COMMANDSET_BY_PROFILE, projectPath, profileName, options),

  // ============================================================
  // Agent Folder Management (commandset-profile-agent-cleanup)
  // ============================================================

  /**
   * Check if agent folder exists
   * @param projectPath Project root path
   * @returns true if .claude/agents/kiro/ exists
   */
  checkAgentFolderExists: (projectPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_AGENT_FOLDER_EXISTS, projectPath),

  /**
   * Delete agent folder
   * @param projectPath Project root path
   * @returns Result indicating success or failure
   */
  deleteAgentFolder: (projectPath: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_AGENT_FOLDER, projectPath),

  // ============================================================
  // Bug Management (Requirements: 3.1, 6.1, 6.3, 6.5)
  // ============================================================

  /**
   * Read bugs from project
   * @param projectPath Project root path
   * @returns Array of bug metadata
   */
  // Bug fix: empty bug directory handling - returns warnings for skipped directories
  readBugs: (projectPath: string): Promise<ReadBugsResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_BUGS, projectPath),

  /**
   * Read bug detail
   * @param bugPath Bug directory path
   * @returns Bug detail with artifacts
   * spec-path-ssot-refactor Task 6.1: Change from bugPath to bugName
   */
  readBugDetail: (bugName: string): Promise<BugDetail> =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_BUG_DETAIL, bugName),

  /**
   * Start bugs watcher
   */
  startBugsWatcher: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_BUGS_WATCHER),

  /**
   * Stop bugs watcher
   */
  stopBugsWatcher: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_BUGS_WATCHER),

  /**
   * Subscribe to bugs changes
   * @param callback Function called when bugs change
   * @returns Cleanup function to unsubscribe
   */
  onBugsChanged: (callback: (event: BugsChangeEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changeEvent: BugsChangeEvent) => {
      callback(changeEvent);
    };
    ipcRenderer.on(IPC_CHANNELS.BUGS_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BUGS_CHANGED, handler);
    };
  },

  // ============================================================
  // Document Review Execution (Requirements: 6.1 - Document Review Workflow)
  // ============================================================

  /**
   * Execute document-review agent
   * @param specId Spec directory name
   * @param featureName Feature name for the review command
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeDocumentReview: (
    specId: string,
    featureName: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW, specId, featureName, commandPrefix),

  /**
   * Execute document-review-reply agent
   * @param specId Spec directory name
   * @param featureName Feature name for the review reply command
   * @param reviewNumber Review round number to reply to
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @param autofix When true, appends --autofix flag to command (Requirements: auto-execution-document-review-autofix 1.2)
   * @returns AgentInfo on success
   */
  executeDocumentReviewReply: (
    specId: string,
    featureName: string,
    reviewNumber: number,
    commandPrefix?: 'kiro' | 'spec-manager',
    autofix?: boolean
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_REPLY, specId, featureName, reviewNumber, commandPrefix, autofix),

  /**
   * Execute document-review-reply --fix agent (apply fixes from existing reply)
   * @param specId Spec directory name
   * @param featureName Feature name for the fix command
   * @param reviewNumber Review round number to apply fixes for
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeDocumentReviewFix: (
    specId: string,
    featureName: string,
    reviewNumber: number,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_FIX, specId, featureName, reviewNumber, commandPrefix),

  /**
   * Approve document review (set status to 'approved')
   * @param specPath Full path to spec directory
   */
  approveDocumentReview: (specPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APPROVE_DOCUMENT_REVIEW, specPath),

  /**
   * Skip document review (set status to 'skipped')
   * @param specPath Full path to spec directory
   */
  skipDocumentReview: (specPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SKIP_DOCUMENT_REVIEW, specPath),

  // ============================================================
  // SSH Remote Project (Requirements: 1.1, 2.1, 6.1, 7.1, 7.2, 8.1, 8.2, 8.5)
  // ============================================================

  /**
   * Connect to SSH remote project
   * @param uri SSH URI (ssh://user@host[:port]/path)
   */
  sshConnect: (uri: string): Promise<{ ok: true; value: undefined } | { ok: false; error: { type: string; message: string } }> =>
    ipcRenderer.invoke('ssh:connect', uri),

  /**
   * Disconnect from SSH remote project
   */
  sshDisconnect: (): Promise<void> =>
    ipcRenderer.invoke('ssh:disconnect'),

  /**
   * Get current SSH connection status
   */
  getSSHStatus: (): Promise<string> =>
    ipcRenderer.invoke('ssh:get-status'),

  /**
   * Get SSH connection information
   */
  getSSHConnectionInfo: (): Promise<{
    host: string;
    port: number;
    user: string;
    connectedAt: Date;
    bytesTransferred: number;
  } | null> =>
    ipcRenderer.invoke('ssh:get-connection-info'),

  /**
   * Get recent remote projects
   */
  getRecentRemoteProjects: (): Promise<Array<{
    uri: string;
    displayName: string;
    lastConnectedAt: string;
    connectionSuccessful: boolean;
  }>> =>
    ipcRenderer.invoke('ssh:get-recent-remote-projects'),

  /**
   * Remove recent remote project
   * @param uri SSH URI to remove
   */
  removeRecentRemoteProject: (uri: string): Promise<void> =>
    ipcRenderer.invoke('ssh:remove-recent-remote-project', uri),

  /**
   * Subscribe to SSH status changes
   * @param callback Function called when status changes
   * @returns Cleanup function to unsubscribe
   */
  onSSHStatusChanged: (callback: (status: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: string) => {
      callback(status);
    };
    ipcRenderer.on('ssh:status-changed', handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('ssh:status-changed', handler);
    };
  },

  // VSCode Integration
  /**
   * Open project folder in VSCode
   * @param projectPath Project folder path to open
   */
  openInVSCode: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_IN_VSCODE, projectPath),

  // ============================================================
  // Layout Config (pane-layout-persistence feature)
  // Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2
  // ============================================================

  /**
   * Load layout config (app-wide)
   * @returns Layout values or null if not found (use DEFAULT_LAYOUT)
   */
  loadLayoutConfig: (): Promise<LayoutValues | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_LAYOUT_CONFIG),

  /**
   * Save layout config (app-wide)
   * @param layout Layout values to save
   */
  saveLayoutConfig: (layout: LayoutValues): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_LAYOUT_CONFIG, layout),

  /**
   * Reset layout config to default values (app-wide)
   */
  resetLayoutConfig: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_LAYOUT_CONFIG),

  // ============================================================
  // Skip Permissions Config (bug fix: persist-skip-permission-per-project)
  // ============================================================

  /**
   * Load skipPermissions setting from project config
   * @param projectPath Project root path
   * @returns skipPermissions value (defaults to false if not set)
   */
  loadSkipPermissions: (projectPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_SKIP_PERMISSIONS, projectPath),

  /**
   * Save skipPermissions setting to project config
   * @param projectPath Project root path
   * @param skipPermissions Setting value
   */
  saveSkipPermissions: (projectPath: string, skipPermissions: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SKIP_PERMISSIONS, projectPath, skipPermissions),

  // ============================================================
  // Project Defaults (debatex-document-review Task 3.3)
  // Requirements: 4.1
  // ============================================================

  /**
   * Load project defaults from project config (sdd-orchestrator.json)
   * @param projectPath Project root path
   * @returns ProjectDefaults or undefined if not set
   */
  loadProjectDefaults: (projectPath: string): Promise<{ documentReview?: { scheme?: string } } | undefined> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_PROJECT_DEFAULTS, projectPath),

  /**
   * Save project defaults to project config
   * @param projectPath Project root path
   * @param defaults ProjectDefaults to save
   */
  saveProjectDefaults: (projectPath: string, defaults: { documentReview?: { scheme?: string } }): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROJECT_DEFAULTS, projectPath, defaults),

  // ============================================================
  // Profile Badge (header-profile-badge feature)
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================

  /**
   * Load profile configuration from project
   * @param projectPath Project root path
   * @returns ProfileConfig (name, installedAt) or null if not installed
   */
  loadProfile: (projectPath: string): Promise<{ name: string; installedAt: string } | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_PROFILE, projectPath),

  // ============================================================
  // LLM Engine Config (llm-engine-abstraction feature)
  // Requirements: 6.1
  // ============================================================

  /**
   * Load LLM engine configuration from project
   * @param projectPath Project root path
   * @returns EngineConfig with default and per-phase engine settings
   */
  loadEngineConfig: (projectPath: string): Promise<import('../main/services/engineConfigService').EngineConfig> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_ENGINE_CONFIG, projectPath),

  /**
   * Save LLM engine configuration to project
   * @param projectPath Project root path
   * @param config EngineConfig to save
   */
  saveEngineConfig: (projectPath: string, config: import('../main/services/engineConfigService').EngineConfig): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_ENGINE_CONFIG, projectPath, config),

  /**
   * Get list of available LLM engines
   * @returns Array of available engines with id and label
   */
  getAvailableLLMEngines: (): Promise<Array<{ id: string; label: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AVAILABLE_LLM_ENGINES),

  /**
   * Subscribe to menu reset layout event
   * @param callback Function called when reset layout menu item is clicked
   * @returns Cleanup function to unsubscribe
   */
  onMenuResetLayout: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_RESET_LAYOUT, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_RESET_LAYOUT, handler);
    };
  },

  // ============================================================
  // Experimental Tools Install (experimental-tools-installer feature)
  // Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4
  // ============================================================

  /**
   * Install Debug agent (experimental)
   * Includes semantic merge to CLAUDE.md
   * @param projectPath Project root path
   * @param options Install options (force: boolean)
   * @returns Installation result
   */
  installExperimentalDebug: (
    projectPath: string,
    options?: ExperimentalInstallOptions
  ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_EXPERIMENTAL_DEBUG, projectPath, options),

  /**
   * Check if experimental tool target file exists
   * @param projectPath Project root path
   * @param toolType Tool type to check
   * @returns Check result with exists and path
   */
  checkExperimentalToolExists: (
    projectPath: string,
    toolType: 'debug'
  ): Promise<ExperimentalCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_EXPERIMENTAL_TOOL_EXISTS, projectPath, toolType),

  /**
   * Subscribe to menu install experimental Debug agent event
   * @param callback Function called when menu item is clicked
   * @returns Cleanup function to unsubscribe
   */
  onMenuInstallExperimentalDebug: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_DEBUG, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_DEBUG, handler);
    };
  },

  // ============================================================
  // gemini-document-review Task 3.2: Gemini Document Review Install
  // Requirements: 1.2, 1.3, 1.4, 1.5, 1.6
  // ============================================================

  /**
   * Install Gemini document-review commands (experimental)
   * Installs TOML templates to .gemini/commands/kiro/
   * @param projectPath Project root path
   * @param options Install options (force: boolean)
   * @returns Installation result
   */
  installExperimentalGeminiDocReview: (
    projectPath: string,
    options?: ExperimentalInstallOptions
  ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, projectPath, options),

  /**
   * Check if Gemini document-review TOML files exist
   * @param projectPath Project root path
   * @returns Check result with exists and path
   */
  checkExperimentalGeminiDocReviewExists: (
    projectPath: string
  ): Promise<ExperimentalCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS, projectPath),

  /**
   * Subscribe to menu install Gemini document-review event
   * @param callback Function called when menu item is clicked
   * @returns Cleanup function to unsubscribe
   */
  onMenuInstallExperimentalGeminiDocReview: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, handler);
    };
  },

  // ============================================================
  // E2E Test Mode (for exposing stores in E2E tests)
  // ============================================================

  /**
   * Check if app is running in E2E test mode
   * @returns true if --e2e-test flag was passed
   */
  isE2ETest: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_IS_E2E_TEST),

  // ============================================================
  // Project Log (project-log-separation feature)
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================

  /**
   * Get project log file path
   * Returns null if no project is selected
   * @returns Log file path or null
   */
  getProjectLogPath: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_LOG_PATH),

  /**
   * Open log directory in system file browser
   * Opens Finder (macOS) / Explorer (Windows) / File Manager (Linux)
   * @throws Error if no project is selected or directory doesn't exist
   */
  openLogInBrowser: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOG_IN_BROWSER),

  // ============================================================
  // Auto Execution (auto-execution-main-process feature)
  // Requirements: 3.1, 3.4, 3.5, 4.1, 4.2, 4.3
  // ============================================================

  /**
   * Start auto-execution for a spec
   * Requirement 4.1: preload IPC呼び出しでprojectPath送信
   * @param params Start parameters (projectPath, specPath, specId, options)
   * @returns Result with AutoExecutionState on success, or error
   */
  autoExecutionStart: (params: {
    projectPath: string;
    specPath: string;
    specId: string;
    options: {
      permissions: {
        requirements: boolean;
        design: boolean;
        tasks: boolean;
        'document-review'?: boolean;
        impl: boolean;
        inspection?: boolean;
        deploy?: boolean;
      };
      // document-review-phase Task 4.1: documentReviewFlag removed
      // Use permissions['document-review'] instead
      validationOptions?: {
        gap: boolean;
        design: boolean;
        impl: boolean;
      };
      timeoutMs?: number;
    };
  }): Promise<{ ok: true; value: {
    projectPath: string;
    specPath: string;
    specId: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
  } } | { ok: false; error: { type: string; specId?: string; limit?: number; message?: string; phase?: string; specPath?: string } }> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTO_EXECUTION_START, params),

  /**
   * Stop auto-execution for a spec
   * @param params Stop parameters (specPath)
   * @returns Result with void on success, or error
   */
  autoExecutionStop: (params: { specPath: string }): Promise<{ ok: true; value: void } | { ok: false; error: { type: string; specId?: string } }> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTO_EXECUTION_STOP, params),

  /**
   * Get auto-execution status for a spec
   * @param params Status parameters (specPath)
   * @returns AutoExecutionState or null
   */
  autoExecutionStatus: (params: { specPath: string }): Promise<{
    specPath: string;
    specId: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
  } | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTO_EXECUTION_STATUS, params),

  /**
   * Get all auto-execution statuses
   * @returns Record of specPath to AutoExecutionState
   */
  autoExecutionAllStatus: (): Promise<Record<string, {
    specPath: string;
    specId: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
  }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS),

  /**
   * Retry auto-execution from a specific phase
   * @param params Retry parameters (specPath, phase)
   * @returns Result with AutoExecutionState on success, or error
   */
  autoExecutionRetryFrom: (params: { specPath: string; phase: string }): Promise<{ ok: true; value: {
    specPath: string;
    specId: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
  } } | { ok: false; error: { type: string; specId?: string } }> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM, params),

  /**
   * Reset auto-execution coordinator state (E2E test support)
   * WARNING: This API is intended for E2E tests only.
   * Do not use in production code.
   */
  autoExecutionReset: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTO_EXECUTION_RESET),

  /**
   * Set mock environment variable (E2E test support)
   * WARNING: This API is intended for E2E tests only.
   * Only allowed keys: E2E_MOCK_DOC_REVIEW_RESULT, E2E_MOCK_TASKS_COMPLETE, E2E_MOCK_CLAUDE_DELAY
   */
  setMockEnv: (key: string, value: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_MOCK_ENV, key, value),

  /**
   * Subscribe to auto-execution status changes
   * @param callback Function called when status changes
   * @returns Cleanup function to unsubscribe
   */
  onAutoExecutionStatusChanged: (callback: (data: { specPath: string; state: {
    specPath: string;
    specId: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
  } }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { specPath: string; state: unknown }) => {
      callback(data as { specPath: string; state: {
        specPath: string;
        specId: string;
        status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
        currentPhase: string | null;
        executedPhases: string[];
        errors: string[];
        startTime: number;
        lastActivityTime: number;
      } });
    };
    ipcRenderer.on(IPC_CHANNELS.AUTO_EXECUTION_STATUS_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_EXECUTION_STATUS_CHANGED, handler);
    };
  },

  /**
   * Subscribe to auto-execution phase completed events
   * @param callback Function called when a phase completes
   * @returns Cleanup function to unsubscribe
   */
  onAutoExecutionPhaseCompleted: (callback: (data: { specPath: string; phase: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { specPath: string; phase: string }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.AUTO_EXECUTION_PHASE_COMPLETED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_EXECUTION_PHASE_COMPLETED, handler);
    };
  },

  /**
   * Subscribe to auto-execution error events
   * @param callback Function called when an error occurs
   * @returns Cleanup function to unsubscribe
   */
  onAutoExecutionError: (callback: (data: { specPath: string; error: { type: string; message?: string } }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { specPath: string; error: { type: string; message?: string } }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.AUTO_EXECUTION_ERROR, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_EXECUTION_ERROR, handler);
    };
  },

  /**
   * Subscribe to auto-execution completed events
   * @param callback Function called when execution completes
   * @returns Cleanup function to unsubscribe
   */
  onAutoExecutionCompleted: (callback: (data: { specPath: string; summary: {
    specId: string;
    executedPhases: string[];
    totalDuration: number;
    errors: string[];
    status: 'completed' | 'error' | 'paused';
  } }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { specPath: string; summary: unknown }) => {
      callback(data as { specPath: string; summary: {
        specId: string;
        executedPhases: string[];
        totalDuration: number;
        errors: string[];
        status: 'completed' | 'error' | 'paused';
      } });
    };
    ipcRenderer.on(IPC_CHANNELS.AUTO_EXECUTION_COMPLETED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTO_EXECUTION_COMPLETED, handler);
    };
  },

  // ============================================================
  // Inspection Workflow (inspection-workflow-ui feature)
  // Requirements: 4.2, 4.3, 4.5
  // ============================================================

  /**
   * Execute inspection agent
   * @param specId Spec directory name
   * @param featureName Feature name for the inspection command
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeInspection: (
    specId: string,
    featureName: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_INSPECTION, specId, featureName, commandPrefix),

  /**
   * Execute inspection fix agent
   * @param specId Spec directory name
   * @param featureName Feature name for the inspection fix command
   * @param roundNumber Inspection round number to apply fixes for
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeInspectionFix: (
    specId: string,
    featureName: string,
    roundNumber: number,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_INSPECTION_FIX, specId, featureName, roundNumber, commandPrefix),

  /**
   * Set inspection auto execution flag
   * @param specPath Full path to spec directory
   * @param flag Auto execution flag ('run' | 'pause')
   */
  setInspectionAutoExecutionFlag: (
    specPath: string,
    flag: 'run' | 'pause'
  ): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_INSPECTION_AUTO_EXECUTION_FLAG, specPath, flag),

  // ============================================================
  // Spec Merge Execution (git-worktree-support feature)
  // Requirements: 5.1, 5.2
  // ============================================================

  /**
   * Execute spec-merge command for worktree mode
   * @param specId Spec ID
   * @param featureName Feature name
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo for the spawned agent
   */
  executeSpecMerge: (
    specId: string,
    featureName: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_MERGE, specId, featureName, commandPrefix),

  // ============================================================
  // Commandset Version Check (commandset-version-detection feature)
  // Requirements: 2.1
  // ============================================================

  /**
   * Check commandset versions for a project
   * @param projectPath Project root path
   * @returns VersionCheckResult with version status
   */
  checkCommandsetVersions: (projectPath: string): Promise<{
    projectPath: string;
    commandsets: readonly {
      name: string;
      bundleVersion: string;
      installedVersion?: string;
      installedAt?: string;
      updateRequired: boolean;
    }[];
    anyUpdateRequired: boolean;
    hasCommandsets: boolean;
    legacyProject: boolean;
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_COMMANDSET_VERSIONS, projectPath),

  // ============================================================
  // Renderer Logging (renderer-error-logging feature)
  // Fire-and-forget logging from renderer to main process
  // ============================================================

  /**
   * Log from renderer process (fire-and-forget)
   * Sends log to main process for writing to project/global log files
   * @param level Log level
   * @param message Log message
   * @param context Additional context (specId, bugName, etc.)
   */
  logRenderer: (
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    context?: Record<string, unknown>
  ): void => {
    ipcRenderer.send(IPC_CHANNELS.LOG_RENDERER, level, message, context);
  },

  // ============================================================
  // Git Worktree Support (git-worktree-support feature)
  // Requirements: 1.1, 1.3, 1.6
  // ============================================================

  /**
   * Check if currently on main/master branch
   * @param projectPath Project root path
   * @returns Result with isMain flag and current branch name
   */
  worktreeCheckMain: (projectPath: string): Promise<{
    ok: true;
    value: { isMain: boolean; currentBranch: string };
  } | {
    ok: false;
    error: { type: string; message?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_CHECK_MAIN, projectPath),

  /**
   * Create a worktree for a feature
   * @param projectPath Project root path
   * @param featureName Feature name (will create branch feature/{featureName})
   * @returns Result with WorktreeInfo on success
   */
  worktreeCreate: (projectPath: string, featureName: string): Promise<{
    ok: true;
    value: {
      path: string;
      absolutePath: string;
      branch: string;
      created_at: string;
    };
  } | {
    ok: false;
    error: { type: string; currentBranch?: string; path?: string; message?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_CREATE, projectPath, featureName),

  /**
   * Remove a worktree and its associated branch
   * @param projectPath Project root path
   * @param featureName Feature name of the worktree to remove
   * @returns Result with void on success
   */
  worktreeRemove: (projectPath: string, featureName: string): Promise<{
    ok: true;
    value: void;
  } | {
    ok: false;
    error: { type: string; message?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_REMOVE, projectPath, featureName),

  /**
   * Resolve a relative worktree path to absolute path
   * @param projectPath Project root path
   * @param relativePath Relative path from spec.json
   * @returns Result with absolutePath on success
   */
  worktreeResolvePath: (projectPath: string, relativePath: string): Promise<{
    ok: true;
    value: { absolutePath: string };
  } | {
    ok: false;
    error: { type: string; path?: string; reason?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_RESOLVE_PATH, projectPath, relativePath),

  /**
   * Start impl in worktree mode
   * Task 14.3: Create worktree and prepare for impl execution
   * Requirements: 9.5, 9.6, 9.7
   * @param projectPath Project root path
   * @param specPath Spec directory path
   * @param featureName Feature name
   * @returns Result with worktree info on success
   */
  worktreeImplStart: (
    projectPath: string,
    specPath: string,
    featureName: string
  ): Promise<{
    ok: true;
    value: {
      worktreePath: string;
      worktreeAbsolutePath: string;
      branch: string;
      worktreeConfig: {
        path: string;
        branch: string;
        created_at: string;
      };
    };
  } | {
    ok: false;
    error: {
      type: string;
      currentBranch?: string;
      path?: string;
      message?: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKTREE_IMPL_START, projectPath, specPath, featureName),

  // ============================================================
  // worktree-execution-ui Task 5.1: Normal Mode Impl Start
  // Requirements: 9.1, 9.2
  // ============================================================

  /**
   * Start impl in normal mode (without worktree)
   * Creates spec.json.worktree with { branch, created_at } only (no path)
   * @param projectPath Project root path
   * @param specPath Spec directory path
   * @returns Result with branch name on success
   */
  normalModeImplStart: (
    projectPath: string,
    specPath: string
  ): Promise<{
    ok: true;
    value: {
      branch: string;
    };
  } | {
    ok: false;
    error: {
      type: string;
      message?: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.NORMAL_MODE_IMPL_START, projectPath, specPath),

  // ============================================================
  // Convert Spec to Worktree (convert-spec-to-worktree feature)
  // Requirements: 3.1, 3.2, 3.3
  // ============================================================

  /**
   * Check if a spec can be converted to worktree mode
   * Validates: on main branch, spec exists, impl not started, not already worktree mode
   * @param projectPath Project root path
   * @param specPath Spec directory path
   * @returns Result with true if convertible, error otherwise
   */
  convertCheck: (
    projectPath: string,
    specPath: string
  ): Promise<{
    ok: true;
    value: boolean;
  } | {
    ok: false;
    error: {
      type: string;
      currentBranch?: string;
      specPath?: string;
      message?: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CONVERT_CHECK, projectPath, specPath),

  /**
   * Convert a normal spec to worktree mode
   * Creates worktree, moves spec files, creates symlinks, updates spec.json
   * @param projectPath Project root path
   * @param specPath Spec directory path
   * @param featureName Feature name
   * @returns Result with WorktreeInfo on success
   */
  convertToWorktree: (
    projectPath: string,
    specPath: string,
    featureName: string
  ): Promise<{
    ok: true;
    value: {
      path: string;
      absolutePath: string;
      branch: string;
      created_at: string;
    };
  } | {
    ok: false;
    error: {
      type: string;
      message?: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CONVERT_TO_WORKTREE, projectPath, specPath, featureName),

  // ============================================================
  // Bug Worktree Support (bugs-worktree-support feature)
  // Requirements: 3.1, 3.3, 4.6, 8.5, 12.1-12.4
  // ============================================================

  /**
   * Create a worktree for a bug fix
   * @param bugName Bug name (will create branch bugfix/{bugName})
   * @returns Result with worktree info on success
   */
  createBugWorktree: (bugName: string): Promise<{
    ok: true;
    value: {
      path: string;
      absolutePath: string;
      branch: string;
      created_at: string;
    };
  } | {
    ok: false;
    error?: { type: string; currentBranch?: string; path?: string; message?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_WORKTREE_CREATE, bugName),

  /**
   * Remove a bug worktree and its associated branch
   * @param bugName Bug name of the worktree to remove
   * @returns Result with void on success
   */
  removeBugWorktree: (bugName: string): Promise<{
    ok: true;
    value: void;
  } | {
    ok: false;
    error?: { type: string; message?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_WORKTREE_REMOVE, bugName),

  /**
   * Update bug.json phase field
   * bug-deploy-phase: Requirements 2.4
   * @param bugName Bug name
   * @param phase New phase value
   * @returns Result with void on success
   */
  updateBugPhase: (bugName: string, phase: string): Promise<{
    ok: true;
    value: void;
  } | {
    ok: false;
    error?: { type: string; message?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_PHASE_UPDATE, bugName, phase),

  /**
   * Convert a bug to worktree mode
   * bugs-workflow-footer: Requirements 5.1-5.8, 12.1, 12.2
   * Creates worktree at ../{project}-worktrees/bugs/{bugName} and updates bug.json
   * @param bugName Bug name
   * @returns Result with worktree info on success, error on failure
   */
  convertBugToWorktree: (bugName: string): Promise<{
    ok: true;
    value: {
      path: string;
      absolutePath: string;
      branch: string;
      created_at: string;
    };
  } | {
    ok: false;
    error: {
      type: 'NOT_ON_MAIN_BRANCH' | 'BUG_NOT_FOUND' | 'ALREADY_WORKTREE_MODE' | 'WORKTREE_CREATE_FAILED' | 'BUG_JSON_UPDATE_FAILED';
      currentBranch?: string;
      message?: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_CONVERT_TO_WORKTREE, bugName),

  /**
   * Get bugs worktree default setting
   * Requirements: 12.1 (bugs-worktree-support)
   * @returns true if worktree should be used by default for bugs
   */
  getBugsWorktreeDefault: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_BUGS_WORKTREE_DEFAULT_GET),

  /**
   * Create worktree for auto-execution
   * Uses the same logic as UI checkbox (DRY principle)
   * Requirements: 12.1, 12.2, 12.3, 12.4 (bugs-worktree-support)
   * @param bugName Bug name
   * @returns Result with worktree config if created, null if not needed
   */
  createBugWorktreeWithAutoExecution: (bugName: string): Promise<{
    ok: true;
    value: {
      path: string;
      branch: string;
      created_at: string;
    } | null;
  } | {
    ok: false;
    error?: { type: string; currentBranch?: string; message?: string };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_WORKTREE_AUTO_EXECUTION, bugName),

  // ============================================================
  // Bug Auto Execution (bug fix: auto-execution-ui-state-dependency)
  // Main Process側でBug自動実行の状態を管理
  // ============================================================

  /**
   * Start bug auto-execution
   * Requirement 4.1: preload IPC呼び出しでprojectPath送信
   * @param params Start parameters (projectPath, bugPath, bugName, options, lastCompletedPhase)
   * @returns Result with BugAutoExecutionState on success, or error
   */
  bugAutoExecutionStart: (params: {
    projectPath: string;
    bugPath: string;
    bugName: string;
    options: {
      permissions: {
        analyze: boolean;
        fix: boolean;
        verify: boolean;
        deploy: boolean;
      };
      timeoutMs?: number;
    };
    lastCompletedPhase: 'report' | 'analyze' | 'fix' | 'verify' | 'deploy' | null;
  }): Promise<{ ok: true; value: {
    projectPath: string;
    bugPath: string;
    bugName: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
    retryCount: number;
    lastFailedPhase: string | null;
  } } | { ok: false; error: { type: string; bugName?: string; limit?: number; message?: string; phase?: string } }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_AUTO_EXECUTION_START, params),

  /**
   * Stop bug auto-execution
   * @param params Stop parameters (bugPath)
   * @returns Result with void on success, or error
   */
  bugAutoExecutionStop: (params: { bugPath: string }): Promise<{ ok: true; value: void } | { ok: false; error: { type: string; bugName?: string } }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_AUTO_EXECUTION_STOP, params),

  /**
   * Get bug auto-execution status
   * @param params Status parameters (bugPath)
   * @returns BugAutoExecutionState or null
   */
  bugAutoExecutionStatus: (params: { bugPath: string }): Promise<{
    bugPath: string;
    bugName: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
    retryCount: number;
    lastFailedPhase: string | null;
  } | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS, params),

  /**
   * Get all bug auto-execution statuses
   * @returns Record of bugPath to BugAutoExecutionState
   */
  bugAutoExecutionAllStatus: (): Promise<Record<string, {
    bugPath: string;
    bugName: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
    retryCount: number;
    lastFailedPhase: string | null;
  }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_AUTO_EXECUTION_ALL_STATUS),

  /**
   * Retry bug auto-execution from a specific phase
   * @param params Retry parameters (bugPath, phase)
   * @returns Result with BugAutoExecutionState on success, or error
   */
  bugAutoExecutionRetryFrom: (params: { bugPath: string; phase: string }): Promise<{ ok: true; value: {
    bugPath: string;
    bugName: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
    retryCount: number;
    lastFailedPhase: string | null;
  } } | { ok: false; error: { type: string; bugName?: string } }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_AUTO_EXECUTION_RETRY_FROM, params),

  /**
   * Reset bug auto-execution coordinator state (E2E test support)
   */
  bugAutoExecutionReset: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUG_AUTO_EXECUTION_RESET),

  /**
   * Subscribe to bug auto-execution status changes
   * @param callback Function called when status changes
   * @returns Cleanup function to unsubscribe
   */
  onBugAutoExecutionStatusChanged: (callback: (data: { bugPath: string; state: {
    bugPath: string;
    bugName: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    currentPhase: string | null;
    executedPhases: string[];
    errors: string[];
    startTime: number;
    lastActivityTime: number;
    retryCount: number;
    lastFailedPhase: string | null;
  } }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { bugPath: string; state: unknown }) => {
      callback(data as { bugPath: string; state: {
        bugPath: string;
        bugName: string;
        status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
        currentPhase: string | null;
        executedPhases: string[];
        errors: string[];
        startTime: number;
        lastActivityTime: number;
        retryCount: number;
        lastFailedPhase: string | null;
      } });
    };
    ipcRenderer.on(IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS_CHANGED, handler);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS_CHANGED, handler);
    };
  },

  /**
   * Subscribe to bug auto-execution phase completed events
   * @param callback Function called when a phase completes
   * @returns Cleanup function to unsubscribe
   */
  onBugAutoExecutionPhaseCompleted: (callback: (data: { bugPath: string; phase: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { bugPath: string; phase: string }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.BUG_AUTO_EXECUTION_PHASE_COMPLETED, handler);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BUG_AUTO_EXECUTION_PHASE_COMPLETED, handler);
    };
  },

  /**
   * Subscribe to bug auto-execution error events
   * @param callback Function called when an error occurs
   * @returns Cleanup function to unsubscribe
   */
  onBugAutoExecutionError: (callback: (data: { bugPath: string; error: { type: string; message?: string } }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { bugPath: string; error: { type: string; message?: string } }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.BUG_AUTO_EXECUTION_ERROR, handler);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BUG_AUTO_EXECUTION_ERROR, handler);
    };
  },

  /**
   * Subscribe to bug auto-execution completed events
   * @param callback Function called when execution completes
   * @returns Cleanup function to unsubscribe
   */
  onBugAutoExecutionCompleted: (callback: (data: { bugPath: string; summary: {
    bugName: string;
    executedPhases: string[];
    totalDuration: number;
    errors: string[];
    status: 'completed' | 'error' | 'paused';
  } }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { bugPath: string; summary: unknown }) => {
      callback(data as { bugPath: string; summary: {
        bugName: string;
        executedPhases: string[];
        totalDuration: number;
        errors: string[];
        status: 'completed' | 'error' | 'paused';
      } });
    };
    ipcRenderer.on(IPC_CHANNELS.BUG_AUTO_EXECUTION_COMPLETED, handler);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BUG_AUTO_EXECUTION_COMPLETED, handler);
    };
  },

  /**
   * Subscribe to bug auto-execution execute phase events
   * Main Processが次のフェーズを実行するようRendererに通知
   * @param callback Function called when next phase should be executed
   * @returns Cleanup function to unsubscribe
   */
  onBugAutoExecutionExecutePhase: (callback: (data: { bugPath: string; phase: string; bugName: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { bugPath: string; phase: string; bugName: string }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.BUG_AUTO_EXECUTION_EXECUTE_PHASE, handler);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BUG_AUTO_EXECUTION_EXECUTE_PHASE, handler);
    };
  },

  // ============================================================
  // impl-start-unification: Unified impl start IPC
  // Requirements: 4.2, 4.4
  // ============================================================

  /**
   * Start impl phase using unified Main Process logic
   * Handles Worktree mode (main branch check, worktree creation) and
   * normal mode (branch/created_at saving) automatically.
   * @param specPath Spec directory path
   * @param featureName Feature name
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns ImplStartResult with agentId on success, or error
   */
  startImpl: (
    specPath: string,
    featureName: string,
    commandPrefix: string
  ): Promise<{
    ok: true;
    value: { agentId: string };
  } | {
    ok: false;
    error: {
      type: 'NOT_ON_MAIN_BRANCH' | 'WORKTREE_CREATE_FAILED' | 'SPEC_JSON_ERROR' | 'EXECUTE_FAILED';
      message?: string;
      currentBranch?: string;
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_IMPL, specPath, featureName, commandPrefix),

  // ============================================================
  // Event Log (spec-event-log feature)
  // Requirements: 5.4
  // ============================================================

  /**
   * Get event log entries for a spec
   * @param specId Spec identifier
   * @returns Event log entries sorted by timestamp (newest first)
   */
  getEventLog: (specId: string): Promise<{
    ok: true;
    value: import('../shared/types').EventLogEntry[];
  } | {
    ok: false;
    error: import('../shared/types').EventLogError;
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.EVENT_LOG_GET, specId),

  // ============================================================
  // Common Commands Install (common-commands-installer feature)
  // Requirements: 3.4, 3.5
  // ============================================================

  /**
   * Confirm common commands installation with user decisions
   * Called after profile installation when conflicts are detected
   * @param projectPath Project root path
   * @param decisions User decisions for each conflicting command (overwrite/skip)
   * @returns Installation result with counts
   */
  confirmCommonCommands: (
    projectPath: string,
    decisions: import('../main/services/experimentalToolsInstallerService').CommonCommandDecision[]
  ): Promise<{
    ok: true;
    value: import('../main/services/experimentalToolsInstallerService').CommonCommandsInstallResult;
  } | {
    ok: false;
    error: import('../main/services/ccSddWorkflowInstaller').InstallError;
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIRM_COMMON_COMMANDS, projectPath, decisions),

  // ============================================================
  // Parallel Task Execution (parallel-task-impl feature)
  // Requirements: 2.1 - Parse tasks.md for parallel execution
  // ============================================================

  /**
   * Parse tasks.md for parallel execution markers
   * Detects (P) markers and groups consecutive parallel tasks
   * @param specName Spec name (directory name)
   * @returns ParseResult with grouped tasks, or null if tasks.md not found
   */
  parseTasksForParallel: (
    specName: string
  ): Promise<import('../main/services/taskParallelParser').ParseResult | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.PARSE_TASKS_FOR_PARALLEL, specName),

  // ============================================================
  // Metrics (spec-productivity-metrics feature)
  // Task 3.2, 3.3: Human session recording IPC
  // Requirements: 2.12
  // ============================================================

  /**
   * Record a human session for metrics
   * Called by HumanActivityTracker when a session ends
   * @param session Human session data with specId, start, end, ms
   */
  recordHumanSession: (session: import('../main/types/metrics').HumanSessionData): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.RECORD_HUMAN_SESSION, session),

  /**
   * Get metrics for a specific spec
   * @param specId Spec identifier
   * @returns Aggregated metrics for the spec wrapped in Result type
   */
  getSpecMetrics: (specId: string): Promise<
    | { ok: true; value: import('../main/types/metrics').SpecMetrics }
    | { ok: false; error: string }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SPEC_METRICS, specId),

  // ============================================================
  // MCP Server (mcp-server-integration feature)
  // Requirements: 6.3, 6.4
  // ============================================================

  /**
   * MCP Server API object
   * Provides control methods for the MCP server
   */
  mcpServer: {
    /**
     * Start the MCP server
     * @param port Optional preferred port (default: 3001)
     * @returns Result with server info on success, or error
     */
    start: (port?: number): Promise<{
      ok: true;
      value: { port: number; url: string };
    } | {
      ok: false;
      error: { type: string; triedPorts?: number[]; port?: number; message?: string };
    }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_START, port),

    /**
     * Stop the MCP server
     */
    stop: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_STOP),

    /**
     * Get current MCP server status
     * @returns Server status with isRunning, port, url
     */
    getStatus: (): Promise<{
      isRunning: boolean;
      port: number | null;
      url: string | null;
    }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_GET_STATUS),

    /**
     * Get MCP settings from ConfigStore
     * @returns MCP settings (enabled, port)
     */
    getSettings: (): Promise<{
      enabled: boolean;
      port: number;
    }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_GET_SETTINGS),

    /**
     * Enable or disable MCP server
     * Starts the server if enabling, stops if disabling
     * @param enabled Whether MCP server should be enabled
     */
    setEnabled: (enabled: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_SET_ENABLED, enabled),

    /**
     * Set MCP server port
     * Restarts server if currently running
     * @param port Port number (1024-65535)
     */
    setPort: (port: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_SET_PORT, port),

    /**
     * Subscribe to MCP server status changes
     * @param callback Function called when status changes
     * @returns Cleanup function to unsubscribe
     */
    onStatusChanged: (callback: (status: { isRunning: boolean; port: number | null; url: string | null }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: { isRunning: boolean; port: number | null; url: string | null }) => {
        callback(status);
      };
      ipcRenderer.on(IPC_CHANNELS.MCP_STATUS_CHANGED, handler);

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.MCP_STATUS_CHANGED, handler);
      };
    },
  },

  // ============================================================
  // Schedule Task (schedule-task-execution feature)
  // Task 3.3: preload APIを公開
  // Requirements: All IPC (design.md scheduleTaskHandlers API Contract)
  // ============================================================

  // ============================================================
  // Idle Time Sync (Task 7.1)
  // Requirements: 4.3 (アイドル検出時キュー追加)
  // ============================================================

  /**
   * Report last activity time to Main Process
   * Used by useIdleTimeSync hook to sync idle time with Main Process
   * @param lastActivityTime Unix timestamp in milliseconds
   */
  reportIdleTime: (lastActivityTime: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_REPORT_IDLE_TIME, lastActivityTime),

  /**
   * Get all schedule tasks for a project
   * @param projectPath Project root path
   * @returns Array of ScheduleTask
   */
  scheduleTaskGetAll: (projectPath: string): Promise<import('../shared/types/scheduleTask').ScheduleTask[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_GET_ALL, { projectPath }),

  /**
   * Get a single schedule task by ID
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @returns ScheduleTask or null if not found
   */
  scheduleTaskGet: (projectPath: string, taskId: string): Promise<import('../shared/types/scheduleTask').ScheduleTask | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_GET, { projectPath, taskId }),

  /**
   * Create a new schedule task
   * @param projectPath Project root path
   * @param task Task input data
   * @returns Result with created ScheduleTask on success, or validation error
   */
  scheduleTaskCreate: (
    projectPath: string,
    task: import('../shared/types/scheduleTask').ScheduleTaskInput
  ): Promise<
    | { ok: true; value: import('../shared/types/scheduleTask').ScheduleTask }
    | { ok: false; error: import('../shared/types/scheduleTask').ScheduleTaskServiceError }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_CREATE, { projectPath, task }),

  /**
   * Update an existing schedule task
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @param updates Partial task updates
   * @returns Result with updated ScheduleTask on success, or error
   */
  scheduleTaskUpdate: (
    projectPath: string,
    taskId: string,
    updates: Partial<import('../shared/types/scheduleTask').ScheduleTaskInput>
  ): Promise<
    | { ok: true; value: import('../shared/types/scheduleTask').ScheduleTask }
    | { ok: false; error: import('../shared/types/scheduleTask').ScheduleTaskServiceError }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_UPDATE, { projectPath, taskId, updates }),

  /**
   * Delete a schedule task
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @returns Result with void on success, or TaskNotFoundError
   */
  scheduleTaskDelete: (
    projectPath: string,
    taskId: string
  ): Promise<
    | { ok: true; value: void }
    | { ok: false; error: import('../shared/types/scheduleTask').TaskNotFoundError }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_DELETE, { projectPath, taskId }),

  /**
   * Execute a schedule task immediately
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @param force Skip avoidance rules if true
   * @returns Result with ExecutionResult on success, or ExecutionError
   */
  scheduleTaskExecuteImmediately: (
    projectPath: string,
    taskId: string,
    force?: boolean
  ): Promise<
    | { ok: true; value: import('../shared/types/scheduleTask').ExecutionResult }
    | { ok: false; error: import('../shared/types/scheduleTask').ExecutionError }
  > =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_EXECUTE_IMMEDIATELY, { projectPath, taskId, force }),

  /**
   * Get queued schedule tasks
   * @param projectPath Project root path
   * @returns Array of QueuedTask
   */
  scheduleTaskGetQueue: (projectPath: string): Promise<import('../shared/types/scheduleTask').QueuedTask[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_GET_QUEUE, { projectPath }),

  /**
   * Get currently running schedule tasks
   * @param projectPath Project root path
   * @returns Array of RunningTaskInfo
   */
  scheduleTaskGetRunning: (projectPath: string): Promise<import('../shared/types/scheduleTask').RunningTaskInfo[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_TASK_GET_RUNNING, { projectPath }),

  /**
   * Subscribe to schedule task status changes
   * @param callback Function called when status changes
   * @returns Cleanup function to unsubscribe
   */
  onScheduleTaskStatusChanged: (
    callback: (event: import('../shared/types/scheduleTask').ScheduleTaskStatusEvent) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      statusEvent: import('../shared/types/scheduleTask').ScheduleTaskStatusEvent
    ) => {
      callback(statusEvent);
    };
    ipcRenderer.on(IPC_CHANNELS.SCHEDULE_TASK_STATUS_CHANGED, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCHEDULE_TASK_STATUS_CHANGED, handler);
    };
  },


  // Migration Service (runtime-agents-restructure feature)
  // Task 10.2, 10.3: Migration IPC handlers for legacy runtime agents
  // Requirements: 5.1, 5.2, 5.4
  // ============================================================

  /**
   * Check if migration is needed for legacy runtime agents for a specific spec/bug
   * @param projectPath Project root path
   * @param specId Spec ID (including 'bug:' prefix for bugs)
   * @returns MigrationInfo with fileCount and totalSize, or null if not needed
   */
  checkMigrationNeeded: (projectPath: string, specId: string): Promise<import('../main/services/migrationService').MigrationInfo | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_MIGRATION_NEEDED, projectPath, specId),

  /**
   * Accept migration and move legacy runtime agents to new structure for a specific spec/bug
   * @param projectPath Project root path
   * @param specId Spec ID (including 'bug:' prefix for bugs)
   * @returns Result with migrated count or error
   */
  acceptMigration: (projectPath: string, specId: string): Promise<{ ok: true; migratedCount: number } | { ok: false; error: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.ACCEPT_MIGRATION, projectPath, specId),

  /**
   * Decline migration for a specific spec (don't show dialog again this session)
   * @param projectPath Project root path
   * @param specId Spec ID (including 'bug:' prefix for bugs)
   * @returns Result success or error
   */
  declineMigration: (projectPath: string, specId: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.DECLINE_MIGRATION, projectPath, specId),
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
