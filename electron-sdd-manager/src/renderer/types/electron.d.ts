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
} from './index';

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
 * Bug Workflow CLAUDE.md update result
 */
export interface BugWorkflowClaudeMdResult {
  readonly action: 'created' | 'merged' | 'skipped';
  readonly reason?: 'already_exists';
}

/**
 * Bug Workflow install result
 */
export interface BugWorkflowInstallResult {
  readonly commands: InstallResult;
  readonly templates: InstallResult;
  readonly claudeMd: BugWorkflowClaudeMdResult;
}

/**
 * Bug Workflow install status
 */
export interface BugWorkflowInstallStatus {
  readonly commands: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly templates: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly claudeMd: {
    readonly exists: boolean;
    readonly hasBugSection: boolean;
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
  setProjectPath(projectPath: string): Promise<void>;
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
  // Launch spec-manager:init agent with description only
  // Returns AgentInfo immediately without waiting for completion
  executeSpecInit(projectPath: string, description: string): Promise<AgentInfo>;

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
  onMenuForceReinstall(callback: () => void): () => void;
  onMenuAddShellPermissions(callback: () => void): () => void;
  onMenuOpenProject(callback: (projectPath: string) => void): () => void;
  onMenuInstallClaudeMd(callback: () => void): () => void;

  // Phase Sync - Auto-fix spec.json phase based on task completion
  syncSpecPhase(specPath: string, completedPhase: 'impl' | 'impl-complete'): Promise<void>;

  // Document Review Sync - Auto-fix spec.json documentReview based on file system
  syncDocumentReview(specPath: string): Promise<boolean>;

  // Permissions - Add shell permissions to project
  addShellPermissions(projectPath: string): Promise<AddPermissionsResult>;

  // CLI Install
  getCliInstallStatus(): Promise<CliInstallStatus>;
  installCliCommand(): Promise<CliInstallResult & { instructions: CliInstallInstructions }>;
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

  // Bug Workflow Install
  checkBugWorkflowStatus(projectPath: string): Promise<BugWorkflowInstallStatus>;
  installBugWorkflow(projectPath: string): Promise<Result<BugWorkflowInstallResult, InstallError>>;
  onMenuInstallBugWorkflow(callback: () => void): () => void;

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
