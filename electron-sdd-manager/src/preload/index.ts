/**
 * Preload Script
 * Exposes safe API to renderer process via contextBridge
 * Requirements: 11.2, 13.1-13.3, 5.1-5.8, 9.1-9.10, 10.1-10.3
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipc/channels';
import type { Phase, SelectProjectResult } from '../renderer/types';
import type { ExecutionGroup, WorkflowPhase, ValidationType } from '../main/services/specManagerService';
import type { AgentInfo, AgentStatus } from '../main/services/agentRegistry';
import type { SpecsChangeEvent } from '../main/services/specsWatcherService';
import type { FullCheckResult, FileCheckResult } from '../main/services/projectChecker';
import type { FullInstallResult, InstallResult, InstallError, Result, ClaudeMdInstallMode, ClaudeMdInstallResult } from '../main/services/commandInstallerService';
import type { AddPermissionsResult } from '../main/services/permissionsService';
import type { CliInstallStatus, CliInstallResult } from '../main/services/cliInstallerService';
import type { ServerStartResult, ServerStatus, ServerError } from '../main/services/remoteAccessServer';
import type { CcSddWorkflowInstallResult, CcSddWorkflowInstallStatus, InstallError as CcSddInstallError, Result as CcSddResult } from '../main/services/ccSddWorkflowInstaller';
import type { ProfileName, UnifiedInstallResult, UnifiedInstallStatus } from '../main/services/unifiedCommandsetInstaller';
import type { BugMetadata, BugDetail, BugsChangeEvent } from '../renderer/types';
import type { LayoutValues } from '../main/services/layoutConfigService';
import type {
  ToolType,
  InstallOptions as ExperimentalInstallOptions,
  InstallResult as ExperimentalInstallResult,
  InstallError as ExperimentalInstallError,
  CheckResult as ExperimentalCheckResult,
  Result as ExperimentalResult,
} from '../main/services/experimentalToolsInstallerService';

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

  readSpecJson: (specPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_SPEC_JSON, specPath),

  readArtifact: (artifactPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_ARTIFACT, artifactPath),

  createSpec: (projectPath: string, specName: string, description: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SPEC, projectPath, specName, description),

  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),

  updateApproval: (specPath: string, phase: Phase, approved: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_APPROVAL, specPath, phase, approved),

  // spec-scoped-auto-execution-state: Update spec.json with arbitrary fields
  updateSpecJson: (specPath: string, updates: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SPEC_JSON, specPath, updates),

  // Agent Management (Task 27.1, 28.1)
  // Requirements: 5.1-5.8
  startAgent: (
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: ExecutionGroup,
    sessionId?: string,
    skipPermissions?: boolean
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_AGENT, specId, phase, command, args, group, sessionId, skipPermissions),

  stopAgent: (agentId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_AGENT, agentId),

  resumeAgent: (agentId: string, prompt?: string, skipPermissions?: boolean): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId, prompt, skipPermissions),

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
  executePhase: (specId: string, phase: WorkflowPhase, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_PHASE, specId, phase, featureName, commandPrefix),

  executeValidation: (specId: string, type: ValidationType, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_VALIDATION, specId, type, featureName, commandPrefix),

  executeSpecStatus: (specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_STATUS, specId, featureName, commandPrefix),

  executeTaskImpl: (specId: string, featureName: string, taskId: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_TASK_IMPL, specId, featureName, taskId, commandPrefix),

  // Task 5.2.2 (sidebar-refactor): spec-init連携
  // Launch spec-init agent with description only (specId='')
  // Returns the agentId immediately without waiting for completion
  // commandPrefix determines the slash command: /kiro:spec-init or /spec-manager:init
  executeSpecInit: (projectPath: string, description: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_INIT, projectPath, description, commandPrefix),

  // Bug Create: Launch bug-create agent with description only (specId='')
  // Returns the agentId immediately without waiting for completion
  // Bug name is auto-generated by Claude from description per bug-create.md spec
  executeBugCreate: (projectPath: string, description: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_BUG_CREATE, projectPath, description),

  // ============================================================
  // Ask Agent Execution (agent-ask-execution feature)
  // Requirements: 2.5, 3.1-3.4, 4.1-4.5, 5.1-5.6
  // ============================================================

  /**
   * Execute Project Ask agent with custom prompt
   * Loads steering files as context
   * @param projectPath Project root path
   * @param prompt User's custom prompt
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeAskProject: (
    projectPath: string,
    prompt: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_ASK_PROJECT, projectPath, prompt, commandPrefix),

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
  syncSpecPhase: (specPath: string, completedPhase: 'impl' | 'impl-complete', options?: { skipTimestamp?: boolean }): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_SPEC_PHASE, specPath, completedPhase, options),

  // Document Review Sync - Auto-fix spec.json documentReview based on file system
  syncDocumentReview: (specPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_DOCUMENT_REVIEW, specPath),

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
  readBugs: (projectPath: string): Promise<BugMetadata[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_BUGS, projectPath),

  /**
   * Read bug detail
   * @param bugPath Bug directory path
   * @returns Bug detail with artifacts
   */
  readBugDetail: (bugPath: string): Promise<BugDetail> =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_BUG_DETAIL, bugPath),

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

  /**
   * Parse a document-review-reply.md file to extract Fix Required count
   * Task 2.2: parseReplyFile IPC (auto-execution-document-review-autofix)
   * @param specPath Full path to spec directory
   * @param roundNumber Round number of the reply file
   * @returns ParseReplyResult with fixRequiredCount
   */
  parseReplyFile: (specPath: string, roundNumber: number): Promise<{ fixRequiredCount: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.PARSE_REPLY_FILE, specPath, roundNumber),

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
   * Load layout config from project
   * @param projectPath Project root path
   * @returns Layout values or null if not found
   */
  loadLayoutConfig: (projectPath: string): Promise<LayoutValues | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_LAYOUT_CONFIG, projectPath),

  /**
   * Save layout config to project
   * @param projectPath Project root path
   * @param layout Layout values to save
   */
  saveLayoutConfig: (projectPath: string, layout: LayoutValues): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_LAYOUT_CONFIG, projectPath, layout),

  /**
   * Reset layout config to default values
   * @param projectPath Project root path
   */
  resetLayoutConfig: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_LAYOUT_CONFIG, projectPath),

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
   * Install Plan command (experimental)
   * @param projectPath Project root path
   * @param options Install options (force: boolean)
   * @returns Installation result
   */
  installExperimentalPlan: (
    projectPath: string,
    options?: ExperimentalInstallOptions
  ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_EXPERIMENTAL_PLAN, projectPath, options),

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
   * Install Commit command (experimental)
   * @param projectPath Project root path
   * @param options Install options (force: boolean)
   * @returns Installation result
   */
  installExperimentalCommit: (
    projectPath: string,
    options?: ExperimentalInstallOptions
  ): Promise<ExperimentalResult<ExperimentalInstallResult, ExperimentalInstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_EXPERIMENTAL_COMMIT, projectPath, options),

  /**
   * Check if experimental tool target file exists
   * @param projectPath Project root path
   * @param toolType Tool type to check
   * @returns Check result with exists and path
   */
  checkExperimentalToolExists: (
    projectPath: string,
    toolType: ToolType
  ): Promise<ExperimentalCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_EXPERIMENTAL_TOOL_EXISTS, projectPath, toolType),

  /**
   * Subscribe to menu install experimental Plan command event
   * @param callback Function called when menu item is clicked
   * @returns Cleanup function to unsubscribe
   */
  onMenuInstallExperimentalPlan: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_PLAN, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_PLAN, handler);
    };
  },

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

  /**
   * Subscribe to menu install experimental Commit command event
   * @param callback Function called when menu item is clicked
   * @returns Cleanup function to unsubscribe
   */
  onMenuInstallExperimentalCommit: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_COMMIT, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_EXPERIMENTAL_COMMIT, handler);
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
   * @param params Start parameters (specPath, specId, options)
   * @returns Result with AutoExecutionState on success, or error
   */
  autoExecutionStart: (params: {
    specPath: string;
    specId: string;
    options: {
      permissions: {
        requirements: boolean;
        design: boolean;
        tasks: boolean;
        impl: boolean;
      };
      documentReviewFlag: 'run' | 'pause' | 'skip';
      validationOptions: {
        gap: boolean;
        design: boolean;
        impl: boolean;
      };
      timeoutMs?: number;
    };
  }): Promise<{ ok: true; value: {
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
   * @param flag Auto execution flag ('run' | 'pause' | 'skip')
   */
  setInspectionAutoExecutionFlag: (
    specPath: string,
    flag: 'run' | 'pause' | 'skip'
  ): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_INSPECTION_AUTO_EXECUTION_FLAG, specPath, flag),

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
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
