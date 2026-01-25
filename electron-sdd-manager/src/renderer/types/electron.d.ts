import type {
  KiroValidation,
  SpecMetadata,
  SpecJson,
  Phase,
  BugMetadata,
  BugDetail,
  BugsChangeEvent,
  ReadBugsResult,
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
 * Common command decision for conflict resolution
 * (common-commands-installer feature)
 * Requirements: 3.4, 3.5
 */
export interface CommonCommandDecision {
  readonly name: string;
  readonly action: 'skip' | 'overwrite';
}

/**
 * Common commands install result
 * (common-commands-installer feature)
 * Requirements: 3.4, 3.5
 */
export interface CommonCommandsInstallResult {
  readonly totalInstalled: number;
  readonly totalSkipped: number;
  readonly totalFailed: number;
  readonly installedCommands: readonly string[];
  readonly skippedCommands: readonly string[];
  readonly failedCommands: readonly string[];
}

/**
 * Common command conflict info
 * (common-commands-installer feature)
 * Requirements: 3.1, 3.2
 */
export interface CommonCommandConflict {
  readonly name: string;
  readonly existingPath: string;
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
 * project-agent-release-footer: Task 2.3 - Added args field
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
  // project-agent-release-footer: Task 2.3 - Args field for release detection
  // Requirements: 6.1, 6.2, 6.3
  readonly args?: string;
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

/**
 * Bug workflow phase type
 */
export type BugWorkflowPhase = 'report' | 'analyze' | 'fix' | 'verify' | 'deploy';

/**
 * Bug auto execution state
 * (bug fix: auto-execution-ui-state-dependency)
 */
export interface BugAutoExecutionState {
  bugPath: string;
  bugName: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentPhase: BugWorkflowPhase | null;
  executedPhases: BugWorkflowPhase[];
  errors: string[];
  startTime: number;
  lastActivityTime: number;
  retryCount: number;
  lastFailedPhase: BugWorkflowPhase | null;
}

/**
 * Bug auto execution error
 */
export type BugAutoExecutionError =
  | { type: 'ALREADY_EXECUTING'; bugName: string }
  | { type: 'NOT_EXECUTING'; bugName: string }
  | { type: 'MAX_CONCURRENT_REACHED'; limit: number }
  | { type: 'NO_BUG_SELECTED' }
  | { type: 'NO_BUG_DETAIL' }
  | { type: 'NO_PERMITTED_PHASES' }
  | { type: 'PHASE_EXECUTION_FAILED'; phase: BugWorkflowPhase; message?: string }
  | { type: 'TIMEOUT'; bugName: string; phase: BugWorkflowPhase | null }
  | { type: 'AGENT_CRASH'; agentId: string; exitCode: number; phase: BugWorkflowPhase | null }
  | { type: 'MAX_RETRIES_EXCEEDED'; bugName: string; retryCount: number };

/**
 * Bug auto execution summary
 */
export interface BugAutoExecutionSummary {
  bugName: string;
  executedPhases: BugWorkflowPhase[];
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
  // spec-path-ssot-refactor: Changed from specPath to specName
  readSpecJson(specName: string): Promise<SpecJson>;
  // spec-path-ssot-refactor: Changed from artifactPath to (specName, filename)
  // bug-artifact-content-not-displayed: Add entityType to support both specs and bugs
  readArtifact(name: string, filename: string, entityType?: 'spec' | 'bug'): Promise<string>;
  // Bug fix: worktree-artifact-save - writeArtifact uses path resolution like readArtifact
  writeArtifact(name: string, filename: string, content: string, entityType?: 'spec' | 'bug'): Promise<void>;
  createSpec(projectPath: string, specName: string, description: string): Promise<void>;
  writeFile(filePath: string, content: string): Promise<void>;
  // spec-path-ssot-refactor: Changed from specPath to specName
  updateApproval(specName: string, phase: Phase, approved: boolean): Promise<void>;

  // spec-scoped-auto-execution-state: Update spec.json with arbitrary fields
  // spec-path-ssot-refactor: Changed from specPath to specName
  updateSpecJson(specName: string, updates: Record<string, unknown>): Promise<void>;

  // Agent Management (Task 27.1)
  // Requirements: 5.1-5.8
  // skip-permissions-main-process: skipPermissions is now auto-fetched in Main Process
  startAgent(
    specId: string,
    phase: string,
    command: string,
    args: string[],
    group?: ExecutionGroup,
    sessionId?: string
  ): Promise<AgentInfo>;
  stopAgent(agentId: string): Promise<void>;
  // skip-permissions-main-process: skipPermissions is now auto-fetched in Main Process
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

  // ============================================================
  // execute-method-unification: Unified execute API
  // ============================================================
  /**
   * Execute a phase using the unified execute method
   * @param options ExecuteOptions with type discriminant
   * @returns AgentInfo for the started agent
   */
  execute(options: import('../../shared/types/executeOptions').ExecuteOptions): Promise<AgentInfo>;

  // Spec Init (Task 5.2 sidebar-refactor)
  // Launch spec-init agent with description only
  // Returns AgentInfo immediately without waiting for completion
  // commandPrefix determines the slash command: /kiro:spec-init or /spec-manager:init
  // spec-worktree-early-creation: worktreeMode parameter added
  executeSpecInit(
    projectPath: string,
    description: string,
    commandPrefix?: 'kiro' | 'spec-manager',
    worktreeMode?: boolean
  ): Promise<AgentInfo>;

  // ============================================================
  // Spec Plan (spec-plan-ui-integration feature)
  // ============================================================

  /**
   * Execute spec-plan agent for interactive requirements generation
   * Launches interactive dialogue to generate requirements.md with Decision Log
   * spec-worktree-early-creation: worktreeMode parameter added
   * @param projectPath Project root path
   * @param description Initial idea/description for planning dialogue
   * @param commandPrefix Command prefix ('kiro' or 'spec-manager')
   * @param worktreeMode Whether to create worktree at spec creation time
   * @returns AgentInfo on success
   */
  executeSpecPlan(
    projectPath: string,
    description: string,
    commandPrefix?: 'kiro' | 'spec-manager',
    worktreeMode?: boolean
  ): Promise<AgentInfo>;

  // Bug Create: Launch bug-create agent with description only
  // Returns AgentInfo immediately without waiting for completion
  // Bug name is auto-generated by Claude from description per bug-create.md spec
  // bug-create-dialog-unification: worktreeMode parameter added
  executeBugCreate(projectPath: string, description: string, worktreeMode?: boolean): Promise<AgentInfo>;

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
  executeAskSpec(
    specId: string,
    featureName: string,
    prompt: string,
    commandPrefix?: 'kiro' | 'spec-manager'
  ): Promise<AgentInfo>;

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
  executeProjectCommand(
    projectPath: string,
    command: string,
    title: string
  ): Promise<AgentInfo>;

  // Agent Events (Task 27.2)
  // Requirements: 9.1-9.10
  onAgentOutput(
    callback: (agentId: string, stream: 'stdout' | 'stderr', data: string) => void
  ): () => void;
  onAgentStatusChange(
    callback: (agentId: string, status: AgentStatus) => void
  ): () => void;

  /**
   * agent-exit-robustness: Subscribe to agent exit error events
   * Called when handleAgentExit encounters an error (e.g., readRecord failure)
   * Requirements: 3.4
   * @param callback Function called when agent exit error occurs
   * @returns Cleanup function to unsubscribe
   */
  onAgentExitError(
    callback: (data: { agentId: string; error: string }) => void
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
  // spec-path-ssot-refactor: Changed from specPath to specName
  syncSpecPhase(specName: string, completedPhase: 'impl' | 'impl-complete', options?: { skipTimestamp?: boolean }): Promise<void>;

  // ============================================================
  // Steering Verification (steering-verification-integration feature)
  // Requirements: 3.1, 3.2, 3.3
  // ============================================================

  /**
   * Check steering files (verification-commands.md exists)
   * @param projectPath Project root path
   * @returns SteeringCheckResult with verificationMdExists
   */
  checkSteeringFiles(projectPath: string): Promise<{ verificationMdExists: boolean }>;

  /**
   * Generate verification-commands.md file by launching steering-verification agent
   * Task 6.2: Returns AgentInfo for the launched agent
   * Requirements: 3.4 (ボタンクリックでエージェント起動)
   * @param projectPath Project root path
   * @returns AgentInfo of the launched steering-verification agent
   */
  generateVerificationMd(projectPath: string): Promise<AgentInfo>;

  // ============================================================
  // Release (steering-release-integration feature)
  // Requirements: 3.2, 3.4
  // ============================================================

  /**
   * Check release.md existence
   * @param projectPath Project root path
   * @returns ReleaseCheckResult with releaseMdExists
   */
  checkReleaseMd(projectPath: string): Promise<{ releaseMdExists: boolean }>;

  /**
   * Generate release.md file by launching steering-release agent
   * Requirements: 3.4 (ボタンクリックでエージェント起動)
   * @param projectPath Project root path
   * @returns AgentInfo of the launched steering-release agent
   */
  generateReleaseMd(projectPath: string): Promise<AgentInfo>;

  // Document Review Sync - Auto-fix spec.json documentReview based on file system
  // spec-path-ssot-refactor: Changed from specPath to specName
  syncDocumentReview(specName: string): Promise<boolean>;

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
  // Bug fix: empty bug directory handling - returns warnings for skipped directories
  readBugs(projectPath: string): Promise<ReadBugsResult>;
  // spec-path-ssot-refactor: Changed from bugPath to bugName
  readBugDetail(bugName: string): Promise<BugDetail>;

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

  // Layout Config (app-wide, moved from project-specific storage)
  // Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2
  loadLayoutConfig(): Promise<LayoutValues | null>;
  saveLayoutConfig(layout: LayoutValues): Promise<void>;
  resetLayoutConfig(): Promise<void>;

  // Skip Permissions Config (bug fix: persist-skip-permission-per-project)
  loadSkipPermissions(projectPath: string): Promise<boolean>;
  saveSkipPermissions(projectPath: string, skipPermissions: boolean): Promise<void>;

  // Project Defaults Config (debatex-document-review Task 3.3)
  // Requirements: 4.1
  loadProjectDefaults(projectPath: string): Promise<{ documentReview?: { scheme?: string } } | undefined>;
  saveProjectDefaults(projectPath: string, defaults: { documentReview?: { scheme?: string } }): Promise<void>;

  // Profile Badge (header-profile-badge feature)
  // Requirements: 1.1, 1.2, 1.3
  loadProfile(projectPath: string): Promise<{ name: string; installedAt: string } | null>;

  // Menu Events - Layout Reset
  onMenuResetLayout(callback: () => void): () => void;

  // Experimental Tools Install (experimental-tools-installer feature)
  // Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4
  installExperimentalDebug(projectPath: string, options?: { force?: boolean }): Promise<Result<ExperimentalInstallResult, ExperimentalInstallError>>;
  checkExperimentalToolExists(projectPath: string, toolType: 'debug'): Promise<ExperimentalCheckResult>;

  // Menu Events - Experimental Tools
  onMenuInstallExperimentalDebug(callback: () => void): () => void;

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
   * auto-execution-projectpath-fix: Task 6.1 - Added projectPath parameter
   * Requirements: 4.1
   */
  autoExecutionStart(params: {
    projectPath: string;
    specPath: string;
    specId: string;
    options: {
      permissions: {
        requirements: boolean;
        design: boolean;
        tasks: boolean;
        impl: boolean;
      };
      documentReviewFlag: 'run' | 'pause';
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
   * Set mock environment variable (E2E test support)
   * WARNING: This API is intended for E2E tests only.
   * Only allowed keys: E2E_MOCK_DOC_REVIEW_RESULT, E2E_MOCK_TASKS_COMPLETE, E2E_MOCK_CLAUDE_DELAY
   */
  setMockEnv(key: string, value: string): Promise<void>;

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
  setInspectionAutoExecutionFlag(specPath: string, flag: 'run' | 'pause'): Promise<void>;

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
  normalModeImplStart(
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

  /**
   * Update bug.json phase field
   * bug-deploy-phase: Requirements 2.4
   * @param bugName Bug name
   * @param phase New phase value
   * @returns Result with void on success
   */
  updateBugPhase(bugName: string, phase: import('./bug').BugPhase): Promise<{
    ok: true;
    value: void;
  } | {
    ok: false;
    error?: { type: string; message?: string };
  }>;

  /**
   * Convert a bug to worktree mode
   * bugs-workflow-footer: Requirements 12.1, 12.2
   * Creates worktree at ../{project}-worktrees/bugs/{bugName} and updates bug.json
   * @param bugName Bug name
   * @returns Result with worktree info on success, error on failure
   */
  convertBugToWorktree(bugName: string): Promise<{
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
  }>;

  /**
   * Get bugs worktree default setting
   * Requirements: 12.1 (bugs-worktree-support)
   * @returns true if worktree should be used by default for bugs
   */
  getBugsWorktreeDefault(): Promise<boolean>;

  /**
   * Create worktree for auto-execution
   * Uses the same logic as UI checkbox (DRY principle)
   * Requirements: 12.1, 12.2, 12.3, 12.4 (bugs-worktree-support)
   * @param bugName Bug name
   * @returns Result with worktree config if created, null if not needed
   */
  createBugWorktreeWithAutoExecution(bugName: string): Promise<{
    ok: true;
    value: {
      path: string;
      branch: string;
      created_at: string;
    } | null;
  } | {
    ok: false;
    error?: { type: string; currentBranch?: string; message?: string };
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

  // ============================================================
  // Bug Auto Execution (bug fix: auto-execution-ui-state-dependency)
  // Main Process側でBug自動実行の状態を管理
  // ============================================================

  /**
   * Start bug auto-execution
   * auto-execution-projectpath-fix: Task 6.1 - Added projectPath parameter
   * Requirements: 4.1
   */
  bugAutoExecutionStart(params: {
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
  }): Promise<{ ok: true; value: BugAutoExecutionState } | { ok: false; error: BugAutoExecutionError }>;

  /**
   * Stop bug auto-execution
   */
  bugAutoExecutionStop(params: { bugPath: string }): Promise<{ ok: true; value: void } | { ok: false; error: BugAutoExecutionError }>;

  /**
   * Get bug auto-execution status
   */
  bugAutoExecutionStatus(params: { bugPath: string }): Promise<BugAutoExecutionState | null>;

  /**
   * Get all bug auto-execution statuses
   */
  bugAutoExecutionAllStatus(): Promise<Record<string, BugAutoExecutionState>>;

  /**
   * Retry bug auto-execution from a specific phase
   */
  bugAutoExecutionRetryFrom(params: { bugPath: string; phase: string }): Promise<{ ok: true; value: BugAutoExecutionState } | { ok: false; error: BugAutoExecutionError }>;

  /**
   * Reset bug auto-execution coordinator state (E2E test support)
   */
  bugAutoExecutionReset(): Promise<void>;

  /**
   * Subscribe to bug auto-execution status changes
   */
  onBugAutoExecutionStatusChanged(callback: (data: { bugPath: string; state: BugAutoExecutionState }) => void): () => void;

  /**
   * Subscribe to bug auto-execution phase completed events
   */
  onBugAutoExecutionPhaseCompleted(callback: (data: { bugPath: string; phase: string }) => void): () => void;

  /**
   * Subscribe to bug auto-execution error events
   */
  onBugAutoExecutionError(callback: (data: { bugPath: string; error: BugAutoExecutionError }) => void): () => void;

  /**
   * Subscribe to bug auto-execution completed events
   */
  onBugAutoExecutionCompleted(callback: (data: { bugPath: string; summary: BugAutoExecutionSummary }) => void): () => void;

  /**
   * Subscribe to bug auto-execution execute phase events
   * Main Processが次のフェーズを実行するようRendererに通知
   */
  onBugAutoExecutionExecutePhase(callback: (data: { bugPath: string; phase: string; bugName: string }) => void): () => void;

  // ============================================================
  // Convert Spec to Worktree (convert-spec-to-worktree feature)
  // Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
  // ============================================================

  /**
   * Check if a spec can be converted to worktree mode
   * @param projectPath Project root path
   * @param specPath Spec directory path
   * @returns Result with true if convertible, error otherwise
   */
  convertCheck(
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
  }>;

  /**
   * Convert a normal spec to worktree mode
   * @param projectPath Project root path
   * @param specPath Spec directory path
   * @param featureName Feature name for branch naming
   * @returns Result with WorktreeInfo on success
   */
  convertToWorktree(
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
      currentBranch?: string;
      specPath?: string;
      message?: string;
    };
  }>;

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
  startImpl(
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
  }>;

  // ============================================================
  // Event Log (spec-event-log feature)
  // Requirements: 5.4
  // ============================================================

  /**
   * Get event log entries for a spec
   * @param specId Spec identifier
   * @returns Event log entries sorted by timestamp (newest first)
   */
  getEventLog(specId: string): Promise<{
    ok: true;
    value: import('../../shared/types').EventLogEntry[];
  } | {
    ok: false;
    error: import('../../shared/types').EventLogError;
  }>;

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
  confirmCommonCommands(
    projectPath: string,
    decisions: CommonCommandDecision[]
  ): Promise<{
    ok: true;
    value: CommonCommandsInstallResult;
  } | {
    ok: false;
    error: InstallError;
  }>;

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
  parseTasksForParallel(specName: string): Promise<import('../../main/services/taskParallelParser').ParseResult | null>;

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
  recordHumanSession(session: import('../../main/types/metrics').HumanSessionData): Promise<void>;

  /**
   * Get metrics for a specific spec
   * @param specId Spec identifier
   * @returns Aggregated metrics for the spec wrapped in Result type
   */
  getSpecMetrics(specId: string): Promise<
    | { ok: true; value: import('../../main/types/metrics').SpecMetrics }
    | { ok: false; error: string }
  >;

  // ============================================================
  // MCP Server (mcp-server-integration feature)
  // Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
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
    start(port?: number): Promise<{
      ok: true;
      value: { port: number; url: string };
    } | {
      ok: false;
      error: { type: string; triedPorts?: number[]; port?: number; message?: string };
    }>;

    /**
     * Stop the MCP server
     */
    stop(): Promise<void>;

    /**
     * Get current MCP server status
     * @returns Server status with isRunning, port, url
     */
    getStatus(): Promise<{
      isRunning: boolean;
      port: number | null;
      url: string | null;
    }>;

    /**
     * Get MCP settings from ConfigStore
     * @returns MCP settings (enabled, port)
     */
    getSettings(): Promise<{
      enabled: boolean;
      port: number;
    }>;

    /**
     * Enable or disable MCP server
     * Starts the server if enabling, stops if disabling
     * @param enabled Whether MCP server should be enabled
     */
    setEnabled(enabled: boolean): Promise<void>;

    /**
     * Set MCP server port
     * Restarts server if currently running
     * @param port Port number (1024-65535)
     */
    setPort(port: number): Promise<void>;
  };

  // ============================================================
  // Schedule Task (schedule-task-execution feature)
  // Task 3.3: preload APIを公開
  // Requirements: All IPC (design.md scheduleTaskHandlers API Contract)
  // ============================================================

  // Task 7.1: Idle Time Sync - Report last activity time to Main Process
  /**
   * Report last activity time to Main Process
   * Used by useIdleTimeSync hook to sync idle time with Main Process
   * @param lastActivityTime Unix timestamp in milliseconds
   */
  reportIdleTime(lastActivityTime: number): Promise<void>;

  /**
   * Get all schedule tasks for a project
   * @param projectPath Project root path
   * @returns Array of ScheduleTask
   */
  scheduleTaskGetAll(projectPath: string): Promise<import('../../shared/types/scheduleTask').ScheduleTask[]>;

  /**
   * Get a single schedule task by ID
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @returns ScheduleTask or null if not found
   */
  scheduleTaskGet(projectPath: string, taskId: string): Promise<import('../../shared/types/scheduleTask').ScheduleTask | null>;

  /**
   * Create a new schedule task
   * @param projectPath Project root path
   * @param task Task input data
   * @returns Result with created ScheduleTask on success, or validation error
   */
  scheduleTaskCreate(
    projectPath: string,
    task: import('../../shared/types/scheduleTask').ScheduleTaskInput
  ): Promise<
    | { ok: true; value: import('../../shared/types/scheduleTask').ScheduleTask }
    | { ok: false; error: import('../../shared/types/scheduleTask').ScheduleTaskServiceError }
  >;

  /**
   * Update an existing schedule task
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @param updates Partial task updates
   * @returns Result with updated ScheduleTask on success, or error
   */
  scheduleTaskUpdate(
    projectPath: string,
    taskId: string,
    updates: Partial<import('../../shared/types/scheduleTask').ScheduleTaskInput>
  ): Promise<
    | { ok: true; value: import('../../shared/types/scheduleTask').ScheduleTask }
    | { ok: false; error: import('../../shared/types/scheduleTask').ScheduleTaskServiceError }
  >;

  /**
   * Delete a schedule task
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @returns Result with void on success, or TaskNotFoundError
   */
  scheduleTaskDelete(
    projectPath: string,
    taskId: string
  ): Promise<
    | { ok: true; value: void }
    | { ok: false; error: import('../../shared/types/scheduleTask').TaskNotFoundError }
  >;

  /**
   * Execute a schedule task immediately
   * @param projectPath Project root path
   * @param taskId Task identifier
   * @param force Skip avoidance rules if true
   * @returns Result with ExecutionResult on success, or ExecutionError
   */
  scheduleTaskExecuteImmediately(
    projectPath: string,
    taskId: string,
    force?: boolean
  ): Promise<
    | { ok: true; value: import('../../shared/types/scheduleTask').ExecutionResult }
    | { ok: false; error: import('../../shared/types/scheduleTask').ExecutionError }
  >;

  /**
   * Get queued schedule tasks
   * @param projectPath Project root path
   * @returns Array of QueuedTask
   */
  scheduleTaskGetQueue(projectPath: string): Promise<import('../../shared/types/scheduleTask').QueuedTask[]>;

  /**
   * Get currently running schedule tasks
   * @param projectPath Project root path
   * @returns Array of RunningTaskInfo
   */
  scheduleTaskGetRunning(projectPath: string): Promise<import('../../shared/types/scheduleTask').RunningTaskInfo[]>;

  /**
   * Subscribe to schedule task status changes
   * @param callback Function called when status changes
   * @returns Cleanup function to unsubscribe
   */
  onScheduleTaskStatusChanged(
    callback: (event: import('../../shared/types/scheduleTask').ScheduleTaskStatusEvent) => void
  ): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
