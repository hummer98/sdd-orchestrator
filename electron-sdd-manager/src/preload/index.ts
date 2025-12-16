/**
 * Preload Script
 * Exposes safe API to renderer process via contextBridge
 * Requirements: 11.2, 13.1-13.3, 5.1-5.8, 9.1-9.10, 10.1-10.3
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipc/channels';
import type { Phase, CommandOutputEvent } from '../renderer/types';
import type { ExecutionGroup, WorkflowPhase, ValidationType } from '../main/services/specManagerService';
import type { AgentInfo, AgentStatus } from '../main/services/agentRegistry';
import type { SpecsChangeEvent } from '../main/services/specsWatcherService';
import type { FullCheckResult, FileCheckResult } from '../main/services/projectChecker';
import type { FullInstallResult, InstallResult, InstallError, Result, ClaudeMdInstallMode, ClaudeMdInstallResult } from '../main/services/commandInstallerService';
import type { AddPermissionsResult } from '../main/services/permissionsService';
import type { CliInstallStatus, CliInstallResult } from '../main/services/cliInstallerService';
import type { ServerStartResult, ServerStatus, ServerError } from '../main/services/remoteAccessServer';
import type { BugWorkflowInstallResult, BugWorkflowInstallStatus, InstallError as BugInstallError, Result as BugResult } from '../main/services/bugWorkflowInstaller';
import type { CcSddWorkflowInstallResult, CcSddWorkflowInstallStatus, InstallError as CcSddInstallError, Result as CcSddResult } from '../main/services/ccSddWorkflowInstaller';
import type { BugMetadata, BugDetail, BugsChangeEvent } from '../renderer/types';

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

  setProjectPath: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_PROJECT_PATH, projectPath),

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

  // Command Execution
  executeCommand: (command: string, workingDirectory: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_COMMAND, command, workingDirectory),

  cancelExecution: () => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_EXECUTION),

  onCommandOutput: (callback: (event: CommandOutputEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: CommandOutputEvent) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.COMMAND_OUTPUT, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.COMMAND_OUTPUT, handler);
    };
  },

  // Agent Management (Task 27.1, 28.1)
  // Requirements: 5.1-5.8
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

  resumeAgent: (agentId: string, prompt?: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId, prompt),

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

  // Task 5.2.2 (sidebar-refactor): spec-manager:init連携
  // Launch spec-manager:init agent with description only (specId='')
  // Returns the agentId immediately without waiting for completion
  executeSpecInit: (projectPath: string, description: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_INIT, projectPath, description),

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
  onAgentRecordChanged: (
    callback: (type: 'add' | 'change' | 'unlink', agent: AgentInfo | { agentId?: string; specId?: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      type: 'add' | 'change' | 'unlink',
      agent: AgentInfo | { agentId?: string; specId?: string }
    ) => {
      callback(type, agent);
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

  // Menu Events
  onMenuForceReinstall: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_FORCE_REINSTALL, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_FORCE_REINSTALL, handler);
    };
  },

  // Menu Events - Install CLAUDE.md
  onMenuInstallClaudeMd: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_CLAUDE_MD, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_CLAUDE_MD, handler);
    };
  },

  // Phase Sync - Auto-fix spec.json phase based on task completion
  syncSpecPhase: (specPath: string, completedPhase: 'impl' | 'impl-complete'): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_SPEC_PHASE, specPath, completedPhase),

  // Document Review Sync - Auto-fix spec.json documentReview based on file system
  syncDocumentReview: (specPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_DOCUMENT_REVIEW, specPath),

  // Permissions - Add shell permissions to project
  addShellPermissions: (projectPath: string): Promise<AddPermissionsResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_SHELL_PERMISSIONS, projectPath),

  // Permissions - Check required permissions
  checkRequiredPermissions: (projectPath: string): Promise<FileCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_REQUIRED_PERMISSIONS, projectPath),

  // Menu Events - Add Shell Permissions
  onMenuAddShellPermissions: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_ADD_SHELL_PERMISSIONS, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_ADD_SHELL_PERMISSIONS, handler);
    };
  },

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
  // Bug Workflow Install
  // ============================================================

  /**
   * Check bug workflow installation status
   * @param projectPath Project root path
   * @returns Installation status for commands, templates, and CLAUDE.md
   */
  checkBugWorkflowStatus: (projectPath: string): Promise<BugWorkflowInstallStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_BUG_WORKFLOW_STATUS, projectPath),

  /**
   * Install bug workflow (commands, templates, CLAUDE.md section)
   * @param projectPath Project root path
   * @returns Installation result
   */
  installBugWorkflow: (projectPath: string): Promise<BugResult<BugWorkflowInstallResult, BugInstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_BUG_WORKFLOW, projectPath),

  /**
   * Menu event - Install Bug Workflow
   */
  onMenuInstallBugWorkflow: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_BUG_WORKFLOW, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_BUG_WORKFLOW, handler);
    };
  },

  // ============================================================
  // CC-SDD Workflow Install (cc-sdd-command-installer feature)
  // ============================================================

  /**
   * Check cc-sdd workflow installation status
   * @param projectPath Project root path
   * @returns Installation status for commands, agents, and CLAUDE.md
   */
  checkCcSddWorkflowStatus: (projectPath: string): Promise<CcSddWorkflowInstallStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_CC_SDD_WORKFLOW_STATUS, projectPath),

  /**
   * Install cc-sdd workflow (commands, agents, CLAUDE.md section)
   * @param projectPath Project root path
   * @returns Installation result
   */
  installCcSddWorkflow: (projectPath: string): Promise<CcSddResult<CcSddWorkflowInstallResult, CcSddInstallError>> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_CC_SDD_WORKFLOW, projectPath),

  /**
   * Menu event - Install CC-SDD Workflow
   */
  onMenuInstallCcSddWorkflow: (callback: () => void): (() => void) => {
    const handler = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.MENU_INSTALL_CC_SDD_WORKFLOW, handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MENU_INSTALL_CC_SDD_WORKFLOW, handler);
    };
  },

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
   * @returns AgentInfo on success
   */
  executeDocumentReviewReply: (
    specId: string,
    featureName: string,
    reviewNumber: number,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_DOCUMENT_REVIEW_REPLY, specId, featureName, reviewNumber, commandPrefix),

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
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
