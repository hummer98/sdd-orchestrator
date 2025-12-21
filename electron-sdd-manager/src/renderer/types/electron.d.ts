import type {
  KiroValidation,
  SpecMetadata,
  SpecJson,
  Phase,
  ExecutionResult,
  CommandOutputEvent,
  BugMetadata,
  BugDetail,
  BugsChangeEvent,
  SelectProjectResult,
} from './index';

/**
 * Layout values for pane-layout-persistence feature
 * Requirements: 1.1-1.4, 4.2-4.4
 * projectAgentPanelHeight: project-agent-panel-always-visible feature (optional for backward compatibility)
 * globalAgentPanelHeight: deprecated, kept for backward compatibility
 */
export interface LayoutValues {
  leftPaneWidth: number;
  rightPaneWidth: number;
  bottomPaneHeight: number;
  agentListHeight: number;
  projectAgentPanelHeight?: number;
  /** @deprecated Use projectAgentPanelHeight instead */
  globalAgentPanelHeight?: number;
}

/**
 * Experimental tools install result
 * Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4
 */
export interface ExperimentalInstallResult {
  readonly success: boolean;
  readonly installedFiles: readonly string[];
  readonly skippedFiles: readonly string[];
  readonly overwrittenFiles: readonly string[];
}

/**
 * Experimental install error types
 */
export type ExperimentalInstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'MERGE_ERROR'; message: string }
  | { type: 'CLAUDE_CLI_NOT_FOUND' }
  | { type: 'DIRECTORY_CREATE_ERROR'; path: string; message: string };

/**
 * Experimental check result
 */
export interface ExperimentalCheckResult {
  readonly exists: boolean;
  readonly path: string;
}

/**
 * Agent status type
 * Requirements: 5.2
 */
export type AgentStatus = 'running' | 'completed' | 'interrupted' | 'hang' | 'failed';

/**
 * Execution group type
 * Requirements: 6.1-6.5
 */
export type ExecutionGroup = 'doc' | 'validate' | 'impl';

/**
 * Workflow phase type
 */
export type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy';

/**
 * Validation type
 */
export type ValidationType = 'gap' | 'design' | 'impl';

/**
 * Specs change event type
 */
export interface SpecsChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  specId?: string;
}

/**
 * File check result for spec-manager files
 * Requirements: 4.1, 4.2
 */
export interface FileCheckResult {
  readonly allPresent: boolean;
  readonly missing: readonly string[];
  readonly present: readonly string[];
}

/**
 * Full check result for commands and settings
 * Requirements: 4.1, 4.2
 */
export interface FullCheckResult {
  readonly commands: FileCheckResult;
  readonly settings: FileCheckResult;
  readonly allPresent: boolean;
}

/**
 * Install result
 * Requirements: 4.3, 4.5
 */
export interface InstallResult {
  readonly installed: readonly string[];
  readonly skipped: readonly string[];
  readonly overwritten: readonly string[];
}

/**
 * Full install result
 * Requirements: 4.3, 4.5
 */
export interface FullInstallResult {
  readonly commands: InstallResult;
  readonly settings: InstallResult;
}

/**
 * Install error types
 * Requirements: 4.6
 */
export type InstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'MERGE_ERROR'; message: string };

/**
 * CLAUDE.md install mode
 */
export type ClaudeMdInstallMode = 'overwrite' | 'merge' | 'skip';

/**
 * CLAUDE.md install result
 */
export interface ClaudeMdInstallResult {
  readonly mode: ClaudeMdInstallMode;
  readonly existed: boolean;
}

/**
 * Result type for spec-manager operations
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Add permissions result
 */
export interface AddPermissionsResult {
  readonly added: readonly string[];
  readonly alreadyExists: readonly string[];
  readonly total: number;
}

/**
 * CLI install status
 */
export interface CliInstallStatus {
  readonly isInstalled: boolean;
  readonly symlinkPath: string;
  readonly scriptPath: string;
  readonly currentTarget?: string;
  readonly needsUpdate: boolean;
}

/**
 * CLI install result
 */
export interface CliInstallResult {
  readonly success: boolean;
  readonly message: string;
  readonly requiresSudo: boolean;
  readonly command?: string;
}

/**
 * CLI install instructions
 */
export interface CliInstallInstructions {
  readonly title: string;
  readonly steps: readonly string[];
  readonly command: string;
  readonly usage: {
    readonly title: string;
    readonly examples: ReadonlyArray<{ command: string; description: string }>;
  };
  readonly pathNote?: string;
}

/**
 * Server start result
 */
export interface ServerStartResult {
  readonly port: number;
  readonly url: string;
  readonly qrCodeDataUrl: string;
  readonly localIp: string;
}

/**
 * Server status
 */
export interface ServerStatus {
  readonly isRunning: boolean;
  readonly port: number | null;
  readonly url: string | null;
  readonly clientCount: number;
}

/**
 * Server error types
 */
export type ServerError =
  | { type: 'NO_AVAILABLE_PORT'; triedPorts: number[] }
  | { type: 'ALREADY_RUNNING'; port: number }
  | { type: 'NETWORK_ERROR'; message: string };

/**
 * cc-sdd Workflow CLAUDE.md update result
 */
export interface CcSddWorkflowClaudeMdResult {
  readonly action: 'created' | 'merged' | 'skipped';
  readonly reason?: 'already_exists';
}

/**
 * cc-sdd Workflow install result
 */
export interface CcSddWorkflowInstallResult {
  readonly commands: InstallResult;
  readonly agents: InstallResult;
  readonly settings: InstallResult;
  readonly claudeMd: CcSddWorkflowClaudeMdResult;
}

/**
 * cc-sdd Workflow install status
 */
export interface CcSddWorkflowInstallStatus {
  readonly commands: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly agents: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly settings: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly claudeMd: {
    readonly exists: boolean;
    readonly hasCcSddSection: boolean;
  };
}

/**
 * Agent information interface
 * Requirements: 5.1-5.8
 */
export interface AgentInfo {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid: number;
  readonly sessionId: string;
  readonly status: AgentStatus;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly command: string;
}

export interface ElectronAPI {
  // File System
  showOpenDialog(): Promise<string | null>;
  validateKiroDirectory(path: string): Promise<KiroValidation>;
  /**
   * @deprecated Use selectProject instead for unified project selection
   */
  setProjectPath(projectPath: string): Promise<void>;

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
  selectProject(projectPath: string): Promise<SelectProjectResult>;
  readSpecs(projectPath: string): Promise<SpecMetadata[]>;
  readSpecJson(specPath: string): Promise<SpecJson>;
  readArtifact(artifactPath: string): Promise<string>;
  createSpec(projectPath: string, specName: string, description: string): Promise<void>;
  writeFile(filePath: string, content: string): Promise<void>;
  updateApproval(specPath: string, phase: Phase, approved: boolean): Promise<void>;

  // Command Execution
  executeCommand(command: string, workingDirectory: string): Promise<ExecutionResult>;
  cancelExecution(): Promise<void>;
  onCommandOutput(callback: (event: CommandOutputEvent) => void): () => void;

  // Agent Management (Task 27.1)
  // Requirements: 5.1-5.8
  startAgent(
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: ExecutionGroup,
    sessionId?: string
  ): Promise<AgentInfo>;
  stopAgent(agentId: string): Promise<void>;
  resumeAgent(agentId: string, prompt?: string): Promise<AgentInfo>;
  deleteAgent(specId: string, agentId: string): Promise<void>;
  getAgents(specId: string): Promise<AgentInfo[]>;
  getAllAgents(): Promise<Record<string, AgentInfo[]>>;
  sendAgentInput(agentId: string, input: string): Promise<void>;
  getAgentLogs(
    specId: string,
    agentId: string
  ): Promise<Array<{ timestamp: string; stream: 'stdout' | 'stderr'; data: string }>>;

  // Phase Execution (high-level commands)
  executePhase(specId: string, phase: WorkflowPhase, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  executeValidation(specId: string, type: ValidationType, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  executeSpecStatus(specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  executeTaskImpl(specId: string, featureName: string, taskId: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;

  // Spec Init (Task 5.2 sidebar-refactor)
  // Launch spec-init agent with description only
  // Returns AgentInfo immediately without waiting for completion
  // commandPrefix determines the slash command: /kiro:spec-init or /spec-manager:init
  executeSpecInit(projectPath: string, description: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;

  // Agent Events (Task 27.2)
  // Requirements: 9.1-9.10
  onAgentOutput(
    callback: (agentId: string, stream: 'stdout' | 'stderr', data: string) => void
  ): () => void;
  onAgentStatusChange(
    callback: (agentId: string, status: AgentStatus) => void
  ): () => void;

  // Config
  getRecentProjects(): Promise<string[]>;
  addRecentProject(path: string): Promise<void>;

  // Config - Hang Threshold (Task 27.3)
  // Requirements: 13.1, 13.2
  getHangThreshold(): Promise<number>;
  setHangThreshold(thresholdMs: number): Promise<void>;

  // App
  getAppVersion(): Promise<string>;
  getPlatform(): NodeJS.Platform;
  getInitialProjectPath(): Promise<string | null>;

  // Specs Watcher
  startSpecsWatcher(): Promise<void>;
  stopSpecsWatcher(): Promise<void>;
  onSpecsChanged(callback: (event: SpecsChangeEvent) => void): () => void;

  // Agent Record Watcher
  onAgentRecordChanged(
    callback: (type: 'add' | 'change' | 'unlink', agent: AgentInfo | { agentId?: string; specId?: string }) => void
  ): () => void;

  // spec-manager Install (Requirements: 4.1-4.6)
  checkSpecManagerFiles(projectPath: string): Promise<FullCheckResult>;
  installSpecManagerCommands(
    projectPath: string,
    missingCommands: readonly string[]
  ): Promise<Result<InstallResult, InstallError>>;
  installSpecManagerSettings(
    projectPath: string,
    missingSettings: readonly string[]
  ): Promise<Result<InstallResult, InstallError>>;
  installSpecManagerAll(projectPath: string): Promise<Result<FullInstallResult, InstallError>>;
  forceReinstallSpecManagerAll(projectPath: string): Promise<Result<FullInstallResult, InstallError>>;

  // CLAUDE.md Install
  checkClaudeMdExists(projectPath: string): Promise<boolean>;
  installClaudeMd(projectPath: string, mode: ClaudeMdInstallMode): Promise<Result<ClaudeMdInstallResult, InstallError>>;

  // Menu Events
  onMenuOpenProject(callback: (projectPath: string) => void): () => void;

  // Phase Sync - Auto-fix spec.json phase based on task completion
  syncSpecPhase(specPath: string, completedPhase: 'impl' | 'impl-complete'): Promise<void>;

  // Document Review Sync - Auto-fix spec.json documentReview based on file system
  syncDocumentReview(specPath: string): Promise<boolean>;

  // Permissions - Add shell permissions to project
  addShellPermissions(projectPath: string): Promise<AddPermissionsResult>;
  // Permissions - Add specific missing permissions to project
  addMissingPermissions(projectPath: string, permissions: string[]): Promise<AddPermissionsResult>;
  // Permissions - Check required permissions
  checkRequiredPermissions(projectPath: string): Promise<FileCheckResult>;

  // CLI Install
  getCliInstallStatus(location?: 'user' | 'system'): Promise<CliInstallStatus>;
  installCliCommand(location?: 'user' | 'system'): Promise<CliInstallResult & { instructions: CliInstallInstructions }>;
  onMenuInstallCliCommand(callback: () => void): () => void;

  // Menu Events - Command Prefix
  onMenuSetCommandPrefix(callback: (prefix: 'kiro' | 'spec-manager') => void): () => void;

  // Menu Events - Toggle Remote Server
  onMenuToggleRemoteServer(callback: () => void): () => void;

  // Remote Access Server
  startRemoteServer(preferredPort?: number): Promise<Result<ServerStartResult, ServerError>>;
  stopRemoteServer(): Promise<void>;
  getRemoteServerStatus(): Promise<ServerStatus>;
  onRemoteServerStatusChanged(callback: (status: ServerStatus) => void): () => void;
  onRemoteClientCountChanged(callback: (count: number) => void): () => void;

  // cc-sdd Workflow Install
  checkCcSddWorkflowStatus(projectPath: string): Promise<CcSddWorkflowInstallStatus>;
  installCcSddWorkflow(projectPath: string): Promise<Result<CcSddWorkflowInstallResult, InstallError>>;

  // Unified Commandset Install
  onMenuInstallCommandset(callback: () => void): () => void;
  installCommandsetByProfile(projectPath: string, profileName: string, options?: { force?: boolean }): Promise<Result<{ summary: { totalInstalled: number; totalSkipped: number; totalFailed: number } }, { type: string; message: string }>>;

  // Agent Folder Management (commandset-profile-agent-cleanup)
  checkAgentFolderExists(projectPath: string): Promise<boolean>;
  deleteAgentFolder(projectPath: string): Promise<{ ok: true } | { ok: false; error: string }>;

  // Bug Management
  // Requirements: 3.1, 6.1, 6.3
  readBugs(projectPath: string): Promise<BugMetadata[]>;
  readBugDetail(bugPath: string): Promise<BugDetail>;

  // Bug Watcher
  // Requirements: 6.5
  startBugsWatcher(): Promise<void>;
  stopBugsWatcher(): Promise<void>;
  onBugsChanged(callback: (event: BugsChangeEvent) => void): () => void;

  // Document Review
  // Requirements: 6.1 - Document Review Workflow
  executeDocumentReview(specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  executeDocumentReviewReply(specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  executeDocumentReviewFix(specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  approveDocumentReview(specPath: string): Promise<void>;
  skipDocumentReview(specPath: string): Promise<void>;

  // SSH Remote Project
  // Requirements: 1.1, 2.1, 6.1, 7.1, 7.2, 8.1, 8.2
  sshConnect(uri: string): Promise<Result<void, { type: string; message: string }>>;
  sshDisconnect(): Promise<void>;
  getSSHStatus(): Promise<string>;
  getSSHConnectionInfo(): Promise<{ host: string; port: number; user: string; connectedAt: Date; bytesTransferred: number } | null>;
  getRecentRemoteProjects(): Promise<Array<{ uri: string; displayName: string; lastConnectedAt: string; connectionSuccessful: boolean }>>;
  removeRecentRemoteProject(uri: string): Promise<void>;
  onSSHStatusChanged(callback: (status: string) => void): () => void;

  // VSCode Integration
  openInVSCode(projectPath: string): Promise<void>;

  // Layout Config (pane-layout-persistence feature)
  // Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2
  loadLayoutConfig(projectPath: string): Promise<LayoutValues | null>;
  saveLayoutConfig(projectPath: string, layout: LayoutValues): Promise<void>;
  resetLayoutConfig(projectPath: string): Promise<void>;

  // Menu Events - Layout Reset
  onMenuResetLayout(callback: () => void): () => void;

  // Experimental Tools Install (experimental-tools-installer feature)
  // Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4
  installExperimentalPlan(projectPath: string, options?: { force?: boolean }): Promise<Result<ExperimentalInstallResult, ExperimentalInstallError>>;
  installExperimentalDebug(projectPath: string, options?: { force?: boolean }): Promise<Result<ExperimentalInstallResult, ExperimentalInstallError>>;
  installExperimentalCommit(projectPath: string, options?: { force?: boolean }): Promise<Result<ExperimentalInstallResult, ExperimentalInstallError>>;
  checkExperimentalToolExists(projectPath: string, toolType: 'plan' | 'debug' | 'commit'): Promise<ExperimentalCheckResult>;

  // Menu Events - Experimental Tools
  onMenuInstallExperimentalPlan(callback: () => void): () => void;
  onMenuInstallExperimentalDebug(callback: () => void): () => void;
  onMenuInstallExperimentalCommit(callback: () => void): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
