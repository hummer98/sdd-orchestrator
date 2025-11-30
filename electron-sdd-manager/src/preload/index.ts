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
import type { FullCheckResult } from '../main/services/projectChecker';
import type { FullInstallResult, InstallResult, InstallError, Result } from '../main/services/commandInstallerService';
import type { AddPermissionsResult } from '../main/services/permissionsService';
import type { CliInstallStatus, CliInstallResult } from '../main/services/cliInstallerService';

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

  resumeAgent: (agentId: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId),

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
  executePhase: (specId: string, phase: WorkflowPhase, featureName: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_PHASE, specId, phase, featureName),

  executeValidation: (specId: string, type: ValidationType, featureName: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_VALIDATION, specId, type, featureName),

  executeSpecStatus: (specId: string, featureName: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_SPEC_STATUS, specId, featureName),

  executeTaskImpl: (specId: string, featureName: string, taskId: string): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_TASK_IMPL, specId, featureName, taskId),

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

  // Phase Sync - Auto-fix spec.json phase based on task completion
  syncSpecPhase: (specPath: string, completedPhase: 'impl' | 'impl-complete'): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_SPEC_PHASE, specPath, completedPhase),

  // Permissions - Add shell permissions to project
  addShellPermissions: (projectPath: string): Promise<AddPermissionsResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_SHELL_PERMISSIONS, projectPath),

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
  getCliInstallStatus: (): Promise<CliInstallStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CLI_INSTALL_STATUS),

  installCliCommand: (): Promise<CliInstallResult & {
    instructions: {
      title: string;
      steps: string[];
      command: string;
      usage: {
        title: string;
        examples: Array<{ command: string; description: string }>;
      };
    };
  }> =>
    ipcRenderer.invoke(IPC_CHANNELS.INSTALL_CLI_COMMAND),

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
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
