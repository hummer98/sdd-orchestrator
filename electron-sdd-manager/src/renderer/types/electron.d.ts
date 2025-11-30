import type {
  KiroValidation,
  SpecMetadata,
  SpecJson,
  Phase,
  ExecutionResult,
  CommandOutputEvent,
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
  | { type: 'PERMISSION_DENIED'; path: string };

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
  resumeAgent(agentId: string): Promise<AgentInfo>;
  getAgents(specId: string): Promise<AgentInfo[]>;
  getAllAgents(): Promise<Record<string, AgentInfo[]>>;
  sendAgentInput(agentId: string, input: string): Promise<void>;
  getAgentLogs(
    specId: string,
    agentId: string
  ): Promise<Array<{ timestamp: string; stream: 'stdout' | 'stderr'; data: string }>>;

  // Phase Execution (high-level commands)
  executePhase(specId: string, phase: WorkflowPhase, featureName: string): Promise<AgentInfo>;
  executeValidation(specId: string, type: ValidationType, featureName: string): Promise<AgentInfo>;
  executeSpecStatus(specId: string, featureName: string): Promise<AgentInfo>;
  executeTaskImpl(specId: string, featureName: string, taskId: string): Promise<AgentInfo>;

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

  // Menu Events
  onMenuForceReinstall(callback: () => void): () => void;
  onMenuAddShellPermissions(callback: () => void): () => void;
  onMenuOpenProject(callback: (projectPath: string) => void): () => void;

  // Phase Sync - Auto-fix spec.json phase based on task completion
  syncSpecPhase(specPath: string, completedPhase: 'impl' | 'impl-complete'): Promise<void>;

  // Permissions - Add shell permissions to project
  addShellPermissions(projectPath: string): Promise<AddPermissionsResult>;

  // CLI Install
  getCliInstallStatus(): Promise<CliInstallStatus>;
  installCliCommand(): Promise<CliInstallResult & { instructions: CliInstallInstructions }>;
  onMenuInstallCliCommand(callback: () => void): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
