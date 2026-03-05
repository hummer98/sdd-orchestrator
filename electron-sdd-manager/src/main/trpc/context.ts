/**
 * tRPC Context definition with Service DI
 * Task 1.1: tRPC Contextにサービスインスタンスを注入する仕組み
 * Requirements: 1.1, 1.2, 1.3
 * DD-006: tRPC Contextへのサービス注入
 *
 * Defines the context type shared across all tRPC procedures.
 * Services are injected via ctx.services.* for testability.
 *
 * handlers.tsの既存DIパターン（getCurrentProjectPath()ゲッター関数、
 * setProjectPath()等のmutable state）をContext経由で提供する。
 * テスト時にはモックサービスを注入可能。
 */

import type { FileService } from '../services/fileService';
import type { BugService } from '../services/bugService';
import type { SpecManagerService } from '../services/specManagerService';
import type { EventBus } from './services/eventBus';

/**
 * ConfigStore interface - subset used by routers.
 * Avoids importing the full configStore module (which has side effects).
 * Task 3.1: Extended with layout and tool path methods for config router.
 */
export interface ConfigStoreInterface {
  getRecentProjects(): string[];
  addRecentProject(path: string): void;
  removeRecentProject(path: string): void;
  getHangThreshold(): number;
  setHangThreshold(threshold: number): void;
  // Layout methods (Task 3.1: config router)
  getLayout(): { leftPaneWidth: number; rightPaneWidth: number; bottomPaneHeight: number; agentListHeight: number; projectAgentPanelHeight?: number; globalAgentPanelHeight?: number; viewMode?: 'artifacts' | 'git-diff' } | null;
  setLayout(layout: { leftPaneWidth: number; rightPaneWidth: number; bottomPaneHeight: number; agentListHeight: number; projectAgentPanelHeight?: number; globalAgentPanelHeight?: number; viewMode?: 'artifacts' | 'git-diff' }): void;
  resetLayout(): void;
  // Tool path methods (Task 3.1: config router)
  setToolPath(toolName: string, path: string | null): void;
  // Bug worktree default methods (Task 5.2: bug router)
  getBugsWorktreeDefault?(): boolean;
  setBugsWorktreeDefault?(value: boolean): void;
  // MCP settings methods (Task 10.3: mcp router)
  getMcpSettings?(): { enabled: boolean; port: number };
  setMcpSettings?(settings: { enabled: boolean; port: number }): void;
}

/**
 * LayoutConfigService interface - project-specific config operations.
 * Avoids importing the full layoutConfigService module.
 * Task 3.1: Added for config router (skipPermissions, projectDefaults, profile, remoteUiAutoStart).
 */
export interface LayoutConfigServiceInterface {
  loadSkipPermissions(projectPath: string): Promise<boolean>;
  saveSkipPermissions(projectPath: string, skipPermissions: boolean): Promise<void>;
  loadProjectDefaults(projectPath: string): Promise<{ documentReview?: { scheme?: string } } | undefined>;
  saveProjectDefaults(projectPath: string, defaults: { documentReview?: { scheme?: string } }): Promise<void>;
  loadProfile(projectPath: string): Promise<{ name: string; installedAt: string } | null>;
  loadRemoteUiAutoStart(projectPath: string): Promise<boolean>;
  saveRemoteUiAutoStart(projectPath: string, enabled: boolean): Promise<void>;
}

/**
 * EngineConfigService interface - LLM engine configuration.
 * Avoids importing the full engineConfigService module.
 * Task 3.1: Added for config router.
 */
export interface EngineConfigServiceInterface {
  loadEngineConfig(projectPath: string): Promise<Record<string, string | undefined>>;
  saveEngineConfig(projectPath: string, config: Record<string, string | undefined>): Promise<void>;
}

/**
 * ToolPathResolverService interface - tool path resolution.
 * Avoids importing the full toolPathResolverService module.
 * Task 3.1: Added for config router.
 */
export interface ToolPathResolverServiceInterface {
  getAllStatuses(): Array<{
    definition: { name: string; required: boolean; versionCommand: string; installGuidance: string };
    resolution: { resolved: boolean; path?: string; source?: string; error?: string };
  }>;
  resolveTool(toolName: string, options?: { forceResolve?: boolean }): Promise<{
    resolved: boolean; path?: string; source?: string; error?: string;
  }>;
  getStatus(toolName: string): {
    definition: { name: string; required: boolean; versionCommand: string; installGuidance: string };
    resolution: { resolved: boolean; path?: string; source?: string; error?: string };
  } | undefined;
}

/**
 * SettingsFileManager interface - settings file operations.
 * Avoids importing the full SettingsFileManager class.
 * Task 3.1: Added for config router (VCS scheme).
 */
export interface SettingsFileManagerInterface {
  getVcsScheme(projectPath: string): Promise<{ ok: true; value: string } | { ok: false; error: { type: string; path: string; message: string } }>;
  setVcsScheme(projectPath: string, scheme: string): Promise<{ ok: true; value: void } | { ok: false; error: { type: string; path: string; message: string } }>;
}

/**
 * SelectProjectResultLike - Minimal interface for selectProject return type.
 * Avoids importing from renderer/types to keep Main process clean.
 * Task 4.1: Added for project router.
 */
export interface SelectProjectResultLike {
  success: boolean;
  projectPath: string;
  kiroValidation: { exists: boolean; hasSpecs: boolean; hasSteering: boolean };
  specs: Array<{ name: string }>;
  bugs: Array<Record<string, unknown>>;
  specJsonMap: Record<string, Record<string, unknown>>;
  error?: Record<string, unknown>;
  bugWarnings?: string[];
}

/**
 * AutoExecutionCoordinatorInterface - subset used by autoExecution router.
 * Task 7.1: Added for autoExecution router.
 * Avoids importing the full AutoExecutionCoordinator class (which has side effects).
 */
export interface AutoExecutionCoordinatorInterface {
  start(projectPath: string, specPath: string, specId: string, options: Record<string, unknown>): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: Record<string, unknown> }>;
  stop(specPath: string): Promise<{ ok: true; value: void } | { ok: false; error: Record<string, unknown> }>;
  getStatus(specPath: string): Record<string, unknown> | null;
  getAllStatuses(): Map<string, Record<string, unknown>>;
  retryFrom(specPath: string, phase: string): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: Record<string, unknown> }>;
  resetAll(): void;
  resetImplRetryCount(specPath: string): void;
}

/**
 * BugAutoExecutionCoordinatorInterface - subset used by autoExecution router.
 * Task 7.1: Added for autoExecution router.
 * Avoids importing the full BugAutoExecutionCoordinator class (which has side effects).
 */
export interface BugAutoExecutionCoordinatorInterface {
  start(projectPath: string, bugPath: string, bugName: string, options: Record<string, unknown>, lastCompletedPhase: string | null): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: Record<string, unknown> }>;
  stop(bugPath: string): Promise<{ ok: true; value: void } | { ok: false; error: Record<string, unknown> }>;
  getStatus(bugPath: string): Record<string, unknown> | null;
  getAllStatuses(): Map<string, Record<string, unknown>>;
  retryFrom(bugPath: string, phase: string): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: Record<string, unknown> }>;
  resetAll(): void;
}

/**
 * CloudflareServiceInterface - Cloudflare Tunnel operations.
 * Avoids importing the full singleton services directly.
 * Task 10.1: Added for cloudflare router.
 */
export interface CloudflareServiceInterface {
  /** Get all Cloudflare settings (does not expose tunnel token) */
  getAllSettings: () => {
    hasTunnelToken: boolean;
    tunnelTokenSource: 'env' | 'stored' | 'none';
    accessToken: string | null;
    publishToCloudflare: boolean;
    cloudflaredPath: string | null;
  };
  /** Set the tunnel token */
  setTunnelToken: (token: string) => void;
  /** Refresh the access token and return new token */
  refreshAccessToken: () => string;
  /** Ensure access token exists (generate if missing) */
  ensureAccessToken: () => string;
  /** Check if cloudflared binary exists */
  checkBinary: () => Promise<{
    exists: boolean;
    path?: string;
    installInstructions?: {
      homebrew: string;
      macports: string;
      downloadUrl: string;
    };
  }>;
  /** Set publish to Cloudflare setting */
  setPublishToCloudflare: (enabled: boolean) => void;
  /** Set custom cloudflared binary path */
  setCloudflaredPath: (path: string | null) => void;
  /** Start the Cloudflare tunnel */
  startTunnel: (localPort: number) => Promise<
    | { ok: true; value: { url: string; pid: number } }
    | { ok: false; error: { type: string; message: string; url?: string; installInstructions?: { homebrew: string; macports: string; downloadUrl: string } } }
  >;
  /** Stop the Cloudflare tunnel */
  stopTunnel: () => Promise<
    | { ok: true }
    | { ok: false; error: { type: string; message: string } }
  >;
  /** Get current tunnel status */
  getTunnelStatus: () => {
    state: 'stopped' | 'starting' | 'running' | 'stopping';
    url: string | null;
    pid: number | null;
    error?: string;
  };
}

/**
 * ScheduleTaskServiceInterface - subset used by schedule router.
 * Avoids importing the full ScheduleTaskService class.
 * Task 10.4: Added for schedule router (CRUD operations).
 */
export interface ScheduleTaskServiceInterface {
  getAllTasks(projectPath: string): Promise<Record<string, unknown>[]>;
  getTask(projectPath: string, taskId: string): Promise<Record<string, unknown> | null>;
  createTask(projectPath: string, task: Record<string, unknown>): Promise<{ ok: boolean; value?: Record<string, unknown>; error?: Record<string, unknown> }>;
  updateTask(projectPath: string, taskId: string, updates: Record<string, unknown>): Promise<{ ok: boolean; value?: Record<string, unknown>; error?: Record<string, unknown> }>;
  deleteTask(projectPath: string, taskId: string): Promise<{ ok: boolean; value?: Record<string, unknown>; error?: Record<string, unknown> }>;
}

/**
 * ScheduleTaskCoordinatorInterface - subset used by schedule router.
 * Avoids importing the full ScheduleTaskCoordinator class.
 * Task 10.4: Added for schedule router (execution control).
 */
export interface ScheduleTaskCoordinatorInterface {
  executeImmediately(taskId: string, force?: boolean): Promise<{ ok: boolean; value?: Record<string, unknown>; error?: Record<string, unknown> }>;
  getQueuedTasks(): readonly Record<string, unknown>[];
  getRunningTasks(): readonly Record<string, unknown>[];
}

/**
 * McpServerServiceInterface - subset used by mcp router.
 * Avoids importing the full McpServerService class (which has side effects).
 * Task 10.3: Added for mcp router.
 */
export interface McpServerServiceInterface {
  start(preferredPort?: number): Promise<{ ok: true; value: { port: number; url: string } } | { ok: false; error: { type: string; message: string } }>;
  stop(): Promise<void>;
  getStatus(): { isRunning: boolean; port: number | null; url: string | null };
}

/**
 * ContextServices - All services available to tRPC procedures via ctx.services.
 *
 * Design:
 * - State getters/setters mirror handlers.ts DI patterns
 * - Service instances are provided for domain logic
 * - All properties are required in the full type but defaults are provided
 * - Tests can override any subset via Partial<ContextServices>
 */
export interface ContextServices {
  // ============================================================
  // Window Identity (multi-window-integration Task 2.3)
  // ============================================================

  /** Window ID for this context (undefined for legacy/test contexts without window binding) */
  windowId?: number;

  // ============================================================
  // State Getters/Setters (from handlers.ts global state)
  // ============================================================

  /** Get the currently selected project path (null if no project selected) */
  getCurrentProjectPath: () => string | null;

  /** Set the current project path and initialize related services */
  setProjectPath: (projectPath: string) => Promise<void>;

  /** Get the initial project path from CLI args */
  getInitialProjectPath: () => string | null;

  /** Set the initial project path from CLI args */
  setInitialProjectPath: (path: string | null) => void;

  // ============================================================
  // System Information (Task 2.1: app.getVersion(), process.platform, etc.)
  // ============================================================

  /** Get the application version (wraps app.getVersion()) */
  getAppVersion: () => string;

  /** Get the OS platform (wraps process.platform) */
  getPlatform: () => string;

  /** Get the application path (wraps app.getAppPath()) */
  getAppPath: () => string;

  /** Get the NODE_ENV environment variable */
  getNodeEnv: () => string;

  // ============================================================
  // Service Instances
  // ============================================================

  /** File service for reading/writing specs, bugs, and project files */
  fileService: FileService | null;

  /** Config store for app settings (electron-store) */
  configStore: ConfigStoreInterface | null;

  /** Bug service for bug CRUD operations */
  bugService: BugService | null;

  /** Get the SpecManagerService (throws if not initialized) */
  getSpecManagerService: () => SpecManagerService;

  // ============================================================
  // Config Domain Services (Task 3.1: config router)
  // ============================================================

  /** Layout config service for project-specific config (skip permissions, defaults, profile) */
  layoutConfigService: LayoutConfigServiceInterface | null;

  /** Engine config service for LLM engine configuration */
  engineConfigService: EngineConfigServiceInterface | null;

  /** Tool path resolver service for tool path resolution */
  toolPathResolverService: ToolPathResolverServiceInterface | null;

  /** Settings file manager for VCS scheme */
  settingsFileManager: SettingsFileManagerInterface | null;

  /** Get available LLM engines */
  getAvailableLlmEngines: () => Array<{ id: string; label: string }>;

  // ============================================================
  // File Domain Services (Task 4.2: file router - project file operations)
  // ============================================================

  /** List CLAUDE.md and steering files for a project */
  listProjectFiles: (projectPath: string) => Promise<{
    claudeMd: { relativePath: string; fileName: string; group: string; exists: boolean } | null;
    steeringFiles: Array<{ relativePath: string; fileName: string; group: string; exists: boolean }>;
    docsTree: unknown[];
    isLoading: boolean;
    error: string | null;
  }>;

  /** Read project file content (path must be within project directory) */
  readProjectFile: (projectPath: string, filePath: string) => Promise<string>;

  /** Write project file content (path must be within project directory) */
  writeProjectFile: (projectPath: string, filePath: string, content: string) => Promise<void>;

  // ============================================================
  // Project Domain Services (Task 4.1: project router)
  // ============================================================

  /** Unified project selection (validates path, loads specs/bugs, updates state) */
  selectProject: (projectPath: string) => Promise<SelectProjectResultLike>;

  /** Show native file open dialog and return selected directory path or null */
  showOpenDialog: () => Promise<string | null>;

  /** Create a new BrowserWindow */
  createNewWindow: () => Promise<void>;

  /** Check if app is running in E2E test mode */
  getIsE2ETest: () => boolean;

  // ============================================================
  // Bug Domain Services (Task 5.2: bug router)
  // ============================================================

  /** Start bugs watcher for the current project */
  bugsWatcherStart?: () => Promise<void>;

  /** Stop bugs watcher */
  bugsWatcherStop?: () => Promise<void>;

  /** Create a bug worktree (bugName -> Result) */
  bugWorktreeCreate?: (bugName: string) => Promise<{ ok: boolean; value?: unknown; error?: { type: string; message: string } }>;

  /** Remove a bug worktree (bugName -> Result) */
  bugWorktreeRemove?: (bugName: string) => Promise<{ ok: boolean; value?: unknown; error?: { type: string; message: string } }>;

  /** Auto execution with worktree for bug (bugName -> Result) */
  bugWorktreeAutoExecution?: (bugName: string) => Promise<{ ok: boolean; value?: unknown; error?: { type: string; message: string } }>;

  /** Convert bug to worktree mode (bugName -> Result) */
  bugConvertToWorktree?: (bugName: string) => Promise<{ ok: boolean; value?: unknown; error?: { type: string; message: string } }>;

  /** Validate that the project is on the main branch (for worktree mode) */
  validateWorktreeMainBranch?: (projectPath: string) => Promise<{ ok: boolean; error?: { message: string } }>;

  // ============================================================
  // Spec Domain Services (Task 5.1: spec router - confirm common commands)
  // ============================================================

  /** Confirm common commands installation with user decisions */
  confirmCommonCommands?: (projectPath: string, decisions: { name: string; action: 'skip' | 'overwrite' }[]) => Promise<{
    ok: true;
    value: {
      totalInstalled: number;
      totalSkipped: number;
      totalFailed: number;
      installedCommands: readonly string[];
      skippedCommands: readonly string[];
      failedCommands: readonly string[];
    };
  } | {
    ok: false;
    error: { type: string; path?: string; message?: string };
  }>;

  // ============================================================
  // Agent Domain Services (Task 6.1: agent router)
  // ============================================================

  /** Stop an agent (uses AgentLifecycleManager with fallback to SpecManagerService) */
  agentStop?: (agentId: string) => Promise<void>;

  /** Get parsed logs for an agent */
  agentGetLogs?: (specId: string, agentId: string) => Promise<unknown[]>;

  /** Get running agent counts per spec (returns Record<specId, count>) */
  agentGetRunningCounts?: () => Promise<Record<string, number>>;

  /** Check if agent folder (.claude/agents/kiro) exists in project */
  agentCheckFolderExists?: (projectPath: string) => Promise<boolean>;

  /** Delete agent folder (.claude/agents/kiro) from project */
  agentDeleteFolder?: (projectPath: string) => Promise<{ ok: true } | { ok: false; error: string }>;

  // ============================================================
  // Auto Execution Domain Services (Task 7.1: autoExecution router)
  // ============================================================

  /** AutoExecutionCoordinator for spec auto-execution */
  autoExecutionCoordinator?: AutoExecutionCoordinatorInterface;

  /** BugAutoExecutionCoordinator for bug auto-execution */
  bugAutoExecutionCoordinator?: BugAutoExecutionCoordinatorInterface;

  // ============================================================
  // Git Domain Services (Task 8.1: git router)
  // ============================================================

  /** Get git status for a project path (returns Result<GitStatusResult, ApiError>) */
  gitGetStatus?: (projectPath: string) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;

  /** Get diff for a specific file (returns Result<string, ApiError>) */
  gitGetDiff?: (projectPath: string, filePath: string) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;

  /** Start watching for file changes */
  gitWatchChanges?: (projectPath: string) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;

  /** Stop watching for file changes */
  gitUnwatchChanges?: (projectPath: string) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;

  /** Check if on main/master branch */
  worktreeCheckMain?: (projectPath: string) => Promise<{ ok: boolean; value?: { isMain: boolean; currentBranch: string }; error?: unknown }>;

  /** Create a new worktree for a feature */
  worktreeCreate?: (projectPath: string, featureName: string) => Promise<{ ok: boolean; value?: unknown; error?: unknown }>;

  /** Remove a worktree */
  worktreeRemove?: (projectPath: string, featureName: string) => Promise<{ ok: boolean; value?: unknown; error?: unknown }>;

  /** Resolve worktree relative path to absolute path */
  worktreeResolvePath?: (projectPath: string, relativePath: string) => Promise<{ ok: boolean; value?: { absolutePath: string }; error?: unknown }>;

  /** Start impl with automatic worktree creation */
  worktreeImplStart?: (projectPath: string, specPath: string, featureName: string) => Promise<{ ok: boolean; value?: unknown; error?: unknown }>;

  /** Start impl in normal mode (without worktree) */
  normalModeImplStart?: (projectPath: string, specPath: string) => Promise<{ ok: boolean; value?: unknown; error?: unknown }>;

  /** Rebase worktree from main branch */
  worktreeRebaseFromMain?: (projectPath: string, specOrBugPath: string) => Promise<{ ok: boolean; value?: unknown; error?: unknown }>;

  /** Check if spec can be converted to worktree mode */
  convertCheck?: (projectPath: string, specPath: string) => Promise<{ ok: boolean; value?: boolean; error?: unknown }>;

  /** Convert a normal spec to worktree mode */
  convertToWorktree?: (projectPath: string, specPath: string, featureName: string) => Promise<{ ok: boolean; value?: unknown; error?: unknown }>;

  // ============================================================
  // Install Domain Services (Task 10.2: install router)
  // ============================================================

  /** ProjectChecker for spec-manager file checks */
  installProjectChecker?: {
    checkAll(projectPath: string): Promise<{
      commands: { allPresent: boolean; missing: string[]; present: string[] };
      settings: { allPresent: boolean; missing: string[]; present: string[] };
      allPresent: boolean;
    }>;
  };

  /** CommandInstallerService for spec-manager installation */
  installCommandInstallerService?: {
    installCommands(projectPath: string, missingCommands: string[]): Promise<{
      ok: true; value: { installed: string[]; skipped: string[]; overwritten: string[] };
    } | {
      ok: false; error: { type: string; path?: string; message?: string };
    }>;
    installSettings(projectPath: string, missingSettings: string[]): Promise<{
      ok: true; value: { installed: string[]; skipped: string[]; overwritten: string[] };
    } | {
      ok: false; error: { type: string; path?: string; message?: string };
    }>;
    installAll(projectPath: string): Promise<{
      ok: true; value: { commands: { installed: string[]; skipped: string[]; overwritten: string[] }; settings: { installed: string[]; skipped: string[]; overwritten: string[] } };
    } | {
      ok: false; error: { type: string; path?: string; message?: string };
    }>;
    forceReinstallAll(projectPath: string): Promise<{
      ok: true; value: { commands: { installed: string[]; skipped: string[]; overwritten: string[] }; settings: { installed: string[]; skipped: string[]; overwritten: string[] } };
    } | {
      ok: false; error: { type: string; path?: string; message?: string };
    }>;
  };

  /** UnifiedCommandsetInstaller for profile-based installation */
  installUnifiedCommandsetInstaller?: {
    checkAllInstallStatus(projectPath: string): Promise<Record<string, { installed: boolean; version?: string }>>;
    installByProfile(
      projectPath: string,
      profileName: string,
      options?: { force?: boolean },
      progressCallback?: (current: number, total: number, currentCommandset: string) => void,
    ): Promise<{ ok: true; value: { installed: string[]; skipped: string[] } } | { ok: false; error: { type: string; message: string } }>;
  };

  /** ExperimentalToolsInstallerService for experimental tools */
  installExperimentalToolsInstaller?: {
    installDebugAgent(projectPath: string, options?: { force?: boolean }): Promise<{ ok: boolean; error?: string }>;
    checkTargetExists(projectPath: string, toolType: string): Promise<{ exists: boolean; path?: string }>;
    installGeminiDocumentReview(projectPath: string, options?: { force?: boolean }): Promise<{ ok: boolean; error?: string }>;
    checkGeminiDocumentReviewExists(projectPath: string): Promise<{ exists: boolean; path?: string }>;
  };

  /** CommandsetVersionService for version checking */
  installCommandsetVersionService?: {
    checkVersions(projectPath: string): Promise<{
      projectPath: string;
      commandsets: Array<{
        name: string;
        bundleVersion: string;
        installedVersion?: string;
        installedAt?: string;
        updateRequired: boolean;
      }>;
      anyUpdateRequired: boolean;
      hasCommandsets: boolean;
      legacyProject: boolean;
    }>;
  };

  /** Get CLI install status */
  installGetCliInstallStatus?: (location?: string) => Promise<{
    installed: boolean;
    path?: string;
    version?: string;
    location?: string;
  }>;

  /** Install CLI command */
  installInstallCliCommand?: (location?: string) => Promise<{
    success: boolean;
    message: string;
    requiresSudo: boolean;
    command?: string;
  }>;

  /** Get manual install instructions */
  installGetManualInstallInstructions?: (location?: string) => {
    title: string;
    steps: string[];
    command: string;
    usage: { title: string; examples: Array<{ command: string; description: string }> };
    pathNote?: string;
  };

  /** MigrationService for legacy runtime agent migration */
  installMigrationService?: {
    checkMigrationNeeded(specId: string): Promise<{ specId: string; fileCount: number; totalSize: number } | null>;
    migrateSpec(specId: string): Promise<{ success: boolean; migratedFiles?: number; error?: string }>;
    declineMigration(specId: string): void;
  };

  /** Check jj availability (returns ToolCheck-like result) */
  installCheckJjAvailability?: () => { name: string; available: boolean; installGuidance: string };

  /** Install jj */
  installInstallJj?: () => Promise<{ success: boolean; error?: string }>;

  /** Set jj install ignored flag */
  installIgnoreJjInstall?: (projectPath: string, ignored: boolean) => Promise<{ success: boolean; error?: string }>;

  // ============================================================
  // Cloudflare Domain Services (Task 10.1: cloudflare router)
  // ============================================================

  /** Cloudflare service for tunnel settings, binary check, tunnel management */
  cloudflareService?: CloudflareServiceInterface;

  // ============================================================
  // MCP Domain Services (Task 10.3: mcp router)
  // ============================================================

  /** MCP Server service for start/stop/status operations */
  mcpServerService?: McpServerServiceInterface;

  // ============================================================
  // Schedule Domain Services (Task 10.4: schedule router)
  // ============================================================

  /** Schedule task service for CRUD operations */
  scheduleTaskService?: ScheduleTaskServiceInterface;

  /** Schedule task coordinator for execution control (executeImmediately, getQueue, getRunning) */
  scheduleTaskCoordinator?: ScheduleTaskCoordinatorInterface;

  /** Report idle time from Renderer (sets last activity time) */
  reportIdleTime?: (lastActivityTime: number) => void;

  // ============================================================
  // Misc Domain Services (Task 10.5: misc router)
  // ============================================================

  /** Open project path in VSCode */
  openInVscode?: (projectPath: string) => Promise<void>;

  /** Copy text to clipboard */
  copyToClipboard?: (text: string) => void;

  /** Forward renderer log to main process logger */
  logRenderer?: (level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: unknown) => void;

  /** Record human activity session for metrics */
  recordHumanSession?: (session: { specId: string; start: string; end: string; ms: number }) => Promise<{ ok: true } | { ok: false; error: string }>;

  /** Get aggregated metrics for a spec */
  getSpecMetrics?: (specId: string) => Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: string }>;

  /** Get project-wide aggregated metrics */
  getProjectMetrics?: () => Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: string }>;

  /** Get the project log file path */
  getProjectLogPath?: () => string | null;

  /** Open log directory in system file browser */
  openLogInBrowser?: () => Promise<void>;

  /** Add shell permissions to a project's settings.local.json */
  addShellPermissions?: (projectPath: string) => Promise<{ ok: true; value: { added: string[]; alreadyExists: string[]; total: number } } | { ok: false; error: { type: string; message?: string } }>;

  /** Add missing permissions to a project's settings.local.json */
  addMissingPermissions?: (projectPath: string, permissions: string[]) => Promise<{ ok: true; value: { added: string[]; alreadyExists: string[]; total: number } } | { ok: false; error: { type: string; message?: string } }>;

  /** Check required permissions in a project */
  checkRequiredPermissions?: (projectPath: string) => Promise<{ allPresent: boolean; missing: string[]; present: string[] }>;

  /** Start the remote access server */
  startRemoteServer?: (preferredPort?: number) => Promise<{ ok: true; value: { port: number; url: string; accessToken: string; qrCodeDataUrl: string; localIp: string; tunnelUrl: string | null; tunnelQrCodeDataUrl: string | null } } | { ok: false; error: { type: 'ALREADY_RUNNING' | 'NETWORK_ERROR' | 'NO_AVAILABLE_PORT'; triedPorts?: number[]; port?: number; message?: string } }>;

  /** Stop the remote access server */
  stopRemoteServer?: () => Promise<void>;

  /** Get remote access server status */
  getRemoteServerStatus?: () => { running: boolean; port: number | null; url: string | null; clientCount: number; accessToken: string | null };

  /** Refresh remote access token */
  refreshAccessToken?: () => Promise<{ ok: true; value: { accessToken: string; tunnelQrCodeDataUrl?: string | null } } | { ok: false; error: { type: string; message: string } }>;

  /** Connect to SSH server via URI */
  sshConnect?: (uri: string) => Promise<{ ok: boolean; value?: unknown; error?: { type: string; message: string } }>;

  /** Disconnect from SSH server */
  sshDisconnect?: () => Promise<void>;

  /** Get current SSH connection status */
  sshGetStatus?: () => { connected: boolean; host: string | null };

  /** Get SSH connection info */
  sshGetConnectionInfo?: () => { host: string; port: number; user: string; connectedAt: string; bytesTransferred: number } | null;

  /** Get recent remote projects list */
  sshGetRecentRemoteProjects?: () => { uri: string; displayName: string; lastConnectedAt: string; connectionSuccessful: boolean }[];

  /** Add a project to recent remote projects */
  sshAddRecentRemoteProject?: (uri: string, displayName: string, connectionSuccessful: boolean) => void;

  /** Remove a project from recent remote projects */
  sshRemoveRecentRemoteProject?: (uri: string) => void;

  // ============================================================
  // Startup Project Selection (Pull model)
  // ============================================================

  /** Get cached initial project selection result (returns null if not cached or already consumed) */
  getInitialSelectResult: () => SelectProjectResultLike | null;

  /** Clear cached initial project selection result */
  clearInitialSelectResult: () => void;

  // ============================================================
  // Event Bus (Task 9.1: events router - Subscription)
  // ============================================================

  /** Centralized EventBus for tRPC Subscription event distribution */
  eventBus?: EventBus;
}

/**
 * Context type shared across all tRPC procedures.
 * All procedures access services via ctx.services.
 */
export interface Context {
  services: ContextServices;
}

/**
 * Default no-op implementations for ContextServices.
 * Used when no overrides are provided (production defaults
 * will be set up in handler.ts via createContextFactory).
 */
function createDefaultServices(): ContextServices {
  return {
    getCurrentProjectPath: () => null,
    setProjectPath: async () => {},
    getInitialProjectPath: () => null,
    setInitialProjectPath: () => {},
    getAppVersion: () => '0.0.0',
    getPlatform: () => process.platform,
    getAppPath: () => '',
    getNodeEnv: () => process.env.NODE_ENV || 'production',
    fileService: null,
    configStore: null,
    bugService: null,
    getSpecManagerService: () => {
      throw new Error('SpecManagerService not initialized. Call setProjectPath first.');
    },
    layoutConfigService: null,
    engineConfigService: null,
    toolPathResolverService: null,
    settingsFileManager: null,
    getAvailableLlmEngines: () => [],
    listProjectFiles: async () => ({ claudeMd: null, steeringFiles: [], docsTree: [], isLoading: false, error: null }),
    readProjectFile: async () => '',
    writeProjectFile: async () => {},
    selectProject: async () => ({
      success: false,
      projectPath: '',
      kiroValidation: { exists: false, hasSpecs: false, hasSteering: false },
      specs: [],
      bugs: [],
      specJsonMap: {},
      error: { type: 'INTERNAL_ERROR', message: 'selectProject not initialized' },
    }),
    showOpenDialog: async () => null,
    createNewWindow: async () => {},
    getIsE2ETest: () => false,
    getInitialSelectResult: () => null,
    clearInitialSelectResult: () => {},
  };
}

/**
 * Create a tRPC context with optional service overrides.
 *
 * @param overrides - Partial service overrides for DI (testing, custom setup)
 * @returns Context with services merged (overrides take precedence over defaults)
 *
 * Usage in production (handler.ts):
 *   createContext({ getCurrentProjectPath, setProjectPath, fileService, ... })
 *
 * Usage in tests:
 *   createContext({ getCurrentProjectPath: vi.fn().mockReturnValue('/test') })
 */
export function createContext(overrides?: Partial<ContextServices>): Context {
  const defaults = createDefaultServices();
  return {
    services: {
      ...defaults,
      ...overrides,
    },
  };
}
