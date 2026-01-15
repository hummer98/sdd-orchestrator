import type {
  KiroValidation,
  SpecMetadata,
  SpecJson,
  Phase,
  BugMetadata,
  BugDetail,
  BugsChangeEvent,
  SelectProjectResult,
  VersionCheckResult,
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
export type ExecutionGroup = 'doc' | 'impl';

/**
 * Workflow phase type
 */
export type WorkflowPhase = 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy';

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
  // Cloudflare Tunnel fields (Task 9.2, 9.3)
  readonly tunnelUrl?: string;
  readonly tunnelQrCodeDataUrl?: string;
  readonly accessToken?: string;
}

/**
 * Cloudflare settings
 * Requirements: 2.1, 2.4, 9.1
 */
export interface CloudflareSettings {
  readonly hasTunnelToken: boolean;
  readonly accessToken: string | null;
  readonly publishToCloudflare: boolean;
  readonly cloudflaredPath: string | null;
}

/**
 * Refresh access token result
 * Requirements: 9.4
 */
export interface RefreshAccessTokenResult {
  readonly accessToken: string;
  readonly tunnelQrCodeDataUrl?: string;
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

/**
 * Auto execution state
 * (auto-execution-main-process feature)
 */
export interface AutoExecutionState {
  specPath: string;
  specId: string;
  status: 'idle' | 'running' | 'paused' | 'completing' | 'completed' | 'error';
  currentPhase: WorkflowPhase | null;
  executedPhases: WorkflowPhase[];
  errors: string[];
  startTime: number;
  lastActivityTime: number;
}

/**
 * Auto execution error
 */
export type AutoExecutionError =
  | { type: 'ALREADY_EXECUTING'; specId: string }
  | { type: 'NOT_EXECUTING'; specId: string }
  | { type: 'MAX_CONCURRENT_REACHED'; limit: number }
  | { type: 'PRECONDITION_FAILED'; message: string }
  | { type: 'PHASE_EXECUTION_FAILED'; phase: WorkflowPhase; message?: string }
  | { type: 'SPEC_NOT_FOUND'; specPath: string };

/**
 * Auto execution summary
 */
export interface AutoExecutionSummary {
  specId: string;
  executedPhases: WorkflowPhase[];
  totalDuration: number;
  errors: string[];
  status: 'completed' | 'error' | 'paused';
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

  // spec-scoped-auto-execution-state: Update spec.json with arbitrary fields
  updateSpecJson(specPath: string, updates: Record<string, unknown>): Promise<void>;

  // Agent Management (Task 27.1)
  // Requirements: 5.1-5.8
  startAgent(
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: ExecutionGroup,
    sessionId?: string,
    skipPermissions?: boolean
  ): Promise<AgentInfo>;
  stopAgent(agentId: string): Promise<void>;
  resumeAgent(agentId: string, prompt?: string, skipPermissions?: boolean): Promise<AgentInfo>;
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
  executeSpecStatus(specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  executeTaskImpl(specId: string, featureName: string, taskId: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;

  // Spec Init (Task 5.2 sidebar-refactor)
  // Launch spec-init agent with description only
  // Returns AgentInfo immediately without waiting for completion
  // commandPrefix determines the slash command: /kiro:spec-init or /spec-manager:init
  executeSpecInit(projectPath: string, description: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;

  // ============================================================
  // Spec Plan (spec-plan-ui-integration feature)
  // ============================================================

  /**
   * Execute spec-plan agent for interactive requirements generation
   * Launches interactive dialogue to generate requirements.md with Decision Log
   * @param projectPath Project root path
   * @param description Initial idea/description for planning dialogue
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeSpecPlan(
    projectPath: string,
    description: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo>;

  // Bug Create: Launch bug-create agent with description only
  // Returns AgentInfo immediately without waiting for completion
  // Bug name is auto-generated by Claude from description per bug-create.md spec
  executeBugCreate(projectPath: string, description: string): Promise<AgentInfo>;

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
  executeAskProject(
    projectPath: string,
    prompt: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo>;

  /**
   * Execute Spec Ask agent with custom prompt
   * Loads steering files and spec files as context
   * @param specId Spec directory name
   * @param featureName Feature name
   * @param prompt User's custom prompt
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo on success
   */
  executeAskSpec(
    specId: string,
    featureName: string,
    prompt: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo>;

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
  // Bug fix: spec-agent-list-not-updating-on-auto-execution
  // Simplified to only receive event info (specId, agentId) - renderer fetches full data via loadAgents()
  onAgentRecordChanged(
    callback: (type: 'add' | 'change' | 'unlink', eventInfo: { agentId?: string; specId?: string }) => void
  ): () => void;

  // agent-watcher-optimization Task 4.2: Switch watch scope for specific spec/bug
  // Bug fix: bugs-agent-list-not-updating
  // Called when spec/bug is selected to focus file watcher on that directory
  switchAgentWatchScope(scopeId: string | null): Promise<void>;

  // agent-watcher-optimization Task 2.2: Get running agent counts per spec
  // Requirements: 2.1 - Lightweight agent count retrieval for SpecList badges
  getRunningAgentCounts(): Promise<Record<string, number>>;

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
  // options.skipTimestamp: If true, do not update updated_at (used for UI auto-correction)
  syncSpecPhase(specPath: string, completedPhase: 'impl' | 'impl-complete', options?: { skipTimestamp?: boolean }): Promise<void>;

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

  // Cloudflare Tunnel Settings (Task 8.1, 9.1, 9.4)
  getCloudflareSettings(): Promise<CloudflareSettings>;
  setCloudfareTunnelToken(token: string): Promise<void>;
  refreshAccessToken(): Promise<RefreshAccessTokenResult>;

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
  executeDocumentReviewReply(specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager', autofix?: boolean): Promise<AgentInfo>;
  executeDocumentReviewFix(specId: string, featureName: string, reviewNumber: number, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;
  approveDocumentReview(specPath: string): Promise<void>;
  skipDocumentReview(specPath: string): Promise<void>;

  // Task 2.2: parseReplyFile IPC (auto-execution-document-review-autofix)
  parseReplyFile(specPath: string, roundNumber: number): Promise<{ fixRequiredCount: number }>;

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

  // Skip Permissions Config (bug fix: persist-skip-permission-per-project)
  loadSkipPermissions(projectPath: string): Promise<boolean>;
  saveSkipPermissions(projectPath: string, skipPermissions: boolean): Promise<void>;

  // Profile Badge (header-profile-badge feature)
  // Requirements: 1.1, 1.2, 1.3
  loadProfile(projectPath: string): Promise<{ name: string; installedAt: string } | null>;

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

  // ============================================================
  // Project Log (project-log-separation feature)
  // Requirements: 6.1, 6.2, 6.3, 6.4
  // ============================================================

  /**
   * Get project log file path
   * Returns null if no project is selected
   * @returns Log file path or null
   */
  getProjectLogPath(): Promise<string | null>;

  /**
   * Open log directory in system file browser
   * Opens Finder (macOS) / Explorer (Windows) / File Manager (Linux)
   * @throws Error if no project is selected or directory doesn't exist
   */
  openLogInBrowser(): Promise<void>;

  // ============================================================
  // Auto Execution (auto-execution-main-process feature)
  // ============================================================

  /**
   * Start auto-execution for a spec
   */
  autoExecutionStart(params: {
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
      timeoutMs?: number;
      /** Current approvals status from spec.json (used to skip completed phases) */
      approvals?: {
        requirements: { generated: boolean; approved: boolean };
        design: { generated: boolean; approved: boolean };
        tasks: { generated: boolean; approved: boolean };
      };
    };
  }): Promise<{ ok: true; value: AutoExecutionState } | { ok: false; error: AutoExecutionError }>;

  /**
   * Stop auto-execution for a spec
   */
  autoExecutionStop(params: { specPath: string }): Promise<{ ok: true; value: void } | { ok: false; error: AutoExecutionError }>;

  /**
   * Get auto-execution status for a spec
   */
  autoExecutionStatus(params: { specPath: string }): Promise<AutoExecutionState | null>;

  /**
   * Get all auto-execution statuses
   */
  autoExecutionAllStatus(): Promise<Record<string, AutoExecutionState>>;

  /**
   * Retry auto-execution from a specific phase
   */
  autoExecutionRetryFrom(params: { specPath: string; phase: WorkflowPhase }): Promise<{ ok: true; value: AutoExecutionState } | { ok: false; error: AutoExecutionError }>;

  /**
   * Reset auto-execution coordinator state (E2E test support)
   * WARNING: This API is intended for E2E tests only.
   */
  autoExecutionReset(): Promise<void>;

  /**
   * Subscribe to auto-execution status changes
   */
  onAutoExecutionStatusChanged(callback: (data: { specPath: string; state: AutoExecutionState }) => void): () => void;

  /**
   * Subscribe to auto-execution phase completed events
   */
  onAutoExecutionPhaseCompleted(callback: (data: { specPath: string; phase: WorkflowPhase }) => void): () => void;

  /**
   * Subscribe to auto-execution error events
   */
  onAutoExecutionError(callback: (data: { specPath: string; error: AutoExecutionError }) => void): () => void;

  /**
   * Subscribe to auto-execution completed events
   */
  onAutoExecutionCompleted(callback: (data: { specPath: string; summary: AutoExecutionSummary }) => void): () => void;

  // ============================================================
  // Inspection Workflow (inspection-workflow-ui feature)
  // ============================================================

  /**
   * Execute inspection agent
   */
  executeInspection(specId: string, featureName: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;

  /**
   * Execute inspection fix agent
   */
  executeInspectionFix(specId: string, featureName: string, roundNumber: number, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>;

  /**
   * Set inspection auto execution flag
   */
  setInspectionAutoExecutionFlag(specPath: string, flag: 'run' | 'pause' | 'skip'): Promise<void>;

  // ============================================================
  // Git Worktree Support (git-worktree-support feature)
  // Requirements: 1.1, 1.3, 1.6, 6.1, 9.1-9.9
  // ============================================================

  /**
   * Execute spec-merge command for worktree mode
   * Merges the worktree branch back to main and cleans up the worktree
   * @param specId Spec ID
   * @param featureName Feature name
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @returns AgentInfo for the spawned agent
   */
  executeSpecMerge(
    specId: string,
    featureName: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo>;

  /**
   * Check if currently on main/master branch
   * Task 14.3: Used to validate before worktree creation
   * @param projectPath Project root path
   * @returns Result with isMain flag and current branch name
   */
  worktreeCheckMain(projectPath: string): Promise<{
    ok: true;
    value: { isMain: boolean; currentBranch: string };
  } | {
    ok: false;
    error: { type: string; message?: string };
  }>;

  /**
   * Create a worktree for a feature
   * @param projectPath Project root path
   * @param featureName Feature name (will create branch feature/{featureName})
   * @returns Result with WorktreeInfo on success
   */
  worktreeCreate(projectPath: string, featureName: string): Promise<{
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
  }>;

  /**
   * Remove a worktree and its associated branch
   * @param projectPath Project root path
   * @param featureName Feature name of the worktree to remove
   * @returns Result with void on success
   */
  worktreeRemove(projectPath: string, featureName: string): Promise<{
    ok: true;
    value: void;
  } | {
    ok: false;
    error: { type: string; message?: string };
  }>;

  /**
   * Resolve a relative worktree path to absolute path
   * @param projectPath Project root path
   * @param relativePath Relative path from spec.json
   * @returns Result with absolutePath on success
   */
  worktreeResolvePath(projectPath: string, relativePath: string): Promise<{
    ok: true;
    value: { absolutePath: string };
  } | {
    ok: false;
    error: { type: string; path?: string; reason?: string };
  }>;

  /**
   * Start impl in worktree mode
   * Task 14.3: Create worktree and prepare for impl execution
   * Requirements: 9.5, 9.6, 9.7
   * @param projectPath Project root path
   * @param specPath Spec directory path
   * @param featureName Feature name
   * @returns Result with worktree info on success
   */
  worktreeImplStart(
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
  }>;

  // ============================================================
  // Bugs Worktree Support (bugs-worktree-support feature)
  // Requirements: 3.1, 3.3, 4.6, 8.5
  // ============================================================

  /**
   * Create a worktree for a bug fix
   * @param bugName Bug name (will create branch bugfix/{bugName})
   * @returns Result with worktree info on success
   */
  createBugWorktree(bugName: string): Promise<{
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
  }>;

  /**
   * Remove a bug worktree and its associated branch
   * @param bugName Bug name of the worktree to remove
   * @returns Result with void on success
   */
  removeBugWorktree(bugName: string): Promise<{
    ok: true;
    value: void;
  } | {
    ok: false;
    error?: { type: string; message?: string };
  }>;

  // ============================================================
  // Commandset Version Check (commandset-version-detection feature)
  // Requirements: 2.1
  // ============================================================

  /**
   * Check commandset versions for a project
   * Returns version status including update requirements
   */
  checkCommandsetVersions(projectPath: string): Promise<VersionCheckResult>;

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
  logRenderer(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    context?: Record<string, unknown>
  ): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
