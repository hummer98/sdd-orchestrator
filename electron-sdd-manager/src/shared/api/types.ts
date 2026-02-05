/**
 * API Abstraction Layer Types
 *
 * This module defines the shared interface for API communication between
 * UI components and the backend. It abstracts both IPC (Electron) and
 * WebSocket (Remote UI) communication methods.
 *
 * Design Decision: DD-002 in design.md
 * - Provider Pattern + Dependency Injection for transparent communication switching
 * - All methods return Result<T, E> for consistent error handling
 */

// Re-export existing types from renderer
// document-review-phase Task 8.1: Removed DocumentReviewFlag import
import type {
  SpecMetadata,
  SpecDetail,
  SpecJson,
  SpecPhase,
  Phase,
  LogEntry,
  AutoExecutionPermissions,
  AutoExecutionStatus,
  SpecAutoExecutionState,
  ApprovalStatus,
} from '@renderer/types';

// main-process-log-parser Task 10.2: Export ParsedLogEntry for IPC API
import type { ParsedLogEntry } from '@shared/utils/parserTypes';

import type { WorktreeConfig } from '@shared/types/worktree';

import type { BugMetadata, BugDetail, BugAction } from '@renderer/types/bug';
import type { LLMEngineId } from '@shared/registry';

// agent-error-notification Task 7.1: Import AgentStartError for IpcApiClient
import type { AgentStartError } from '@shared/types/agentStartError';

// =============================================================================
// spec-path-ssot-refactor: Remote UI specific types with path
// Remote UI uses WebSocket which still provides paths
// =============================================================================

/**
 * SpecMetadata with path and additional fields for Remote UI use
 * WebSocket API returns extended information to avoid additional GET_SPEC_DETAIL calls
 * remote-ui-spec-list-optimization: Include phase, updatedAt, worktree, approvals
 */
export interface SpecMetadataWithPath extends SpecMetadata {
  readonly path: string;
  /** Spec phase from spec.json */
  readonly phase: SpecPhase;
  /** Last updated timestamp from spec.json */
  readonly updatedAt: string;
  /** Worktree configuration if enabled */
  readonly worktree?: WorktreeConfig;
  /** Approval status for each phase */
  readonly approvals?: ApprovalStatus;
}

/**
 * BugMetadata with path for Remote UI use
 * WebSocket API still returns path, so Remote UI needs this extended type
 */
export interface BugMetadataWithPath extends BugMetadata {
  readonly path: string;
}

/**
 * SpecDetail with path for Remote UI use
 * Extends SpecDetail but uses SpecMetadataWithPath
 */
export interface SpecDetailWithPath extends Omit<SpecDetail, 'metadata'> {
  metadata: SpecMetadataWithPath;
}

/**
 * BugDetail with path for Remote UI use
 * Extends BugDetail but uses BugMetadataWithPath
 */
export interface BugDetailWithPath extends Omit<BugDetail, 'metadata'> {
  metadata: BugMetadataWithPath;
}

// =============================================================================
// Result Type
// =============================================================================

/**
 * Result type for consistent error handling across all API methods
 * All API methods return this type to enable type-safe error handling
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// =============================================================================
// Error Types
// =============================================================================

/**
 * API error interface for all API operations
 * Used as the error type in Result<T, ApiError>
 */
export interface ApiError {
  /** Error type identifier */
  type: string;
  /** Human-readable error message */
  message: string;
  /** Optional error code for categorization */
  code?: string;
  /** Optional additional context */
  details?: unknown;
}

// =============================================================================
// Workflow Types
// =============================================================================

/**
 * Workflow phases that can be executed
 * Used for spec phase execution commands
 * Note: Must match the electron.d.ts WorkflowPhase definition
 * document-review-phase Task 1.1: 'document-review' を追加
 * Requirements: 1.2
 */
export type WorkflowPhase =
  | 'requirements'
  | 'design'
  | 'tasks'
  | 'document-review'
  | 'impl'
  | 'inspection'
  | 'deploy';


// =============================================================================
// Agent Types
// =============================================================================

/**
 * Agent status enumeration
 * agent-store-unification: Unified with renderer/types/electron.d.ts AgentStatus
 */
export type AgentStatus = 'running' | 'completed' | 'interrupted' | 'hang' | 'failed';

/**
 * Agent information for tracking running agents
 * agent-store-unification: Unified with renderer/stores/agentStore AgentInfo
 * agentId-unification: Changed 'id' to 'agentId' for SSOT consistency
 */
export interface AgentInfo {
  /** Unique agent identifier */
  agentId: string;
  /** Spec ID or '' for project-level agents */
  specId: string;
  /** Current agent phase */
  phase: string;
  /** Agent status */
  status: AgentStatus;
  /** Start timestamp (ISO string or unix ms) */
  startedAt: string | number;
  /** Command that started the agent */
  command?: string;
  /** Session ID for grouping related agents */
  sessionId?: string;
  /** Last activity timestamp */
  lastActivityAt?: string;
  /** End timestamp (if completed, ISO string or unix ms) */
  endedAt?: string | number;
  /** Agent output buffer */
  output?: string;
  // execution-store-consolidation: Extended fields (Req 2.1, 2.2)
  /** Execution mode: auto or manual */
  executionMode?: 'auto' | 'manual';
  /** Retry count for failed agents */
  retryCount?: number;
  // project-agent-release-footer: Task 2.3 - Args field for release detection
  // Requirements: 6.1, 6.2, 6.3
  /** Args/prompt used to start the agent (e.g., "/release" or "/kiro:project-ask ...") */
  args?: string;
  /**
   * LLM engine ID for parser selection and UI labels
   * llm-stream-log-parser: Task 6.1 - engineId in AgentInfo
   * Requirements: 4.1, 4.2
   */
  engineId?: LLMEngineId;
  // agent-lifecycle-management: Task 9.1 - Reattached and exit reason fields
  // Requirements: 6.2, 8.3
  /** Whether this agent was reattached after app restart (limited capabilities) */
  isReattached?: boolean;
  /** Reason for agent termination (completed, stopped_by_user, failed, etc.) */
  exitReason?: string;
}

// =============================================================================
// Auto Execution Types
// =============================================================================

/**
 * Auto execution options for startAutoExecution
 * document-review-phase Task 8.1: Removed documentReviewFlag
 * Requirements: 2.2, 2.5
 */
export interface AutoExecutionOptions {
  permissions: AutoExecutionPermissions;
  // documentReviewFlag removed - use permissions['document-review'] instead
}

/**
 * Auto execution state returned by auto execution APIs
 * auto-execution-projectpath-fix Requirement 4.2: Added projectPath field
 */
export interface AutoExecutionState {
  /** Project path (main repository) - used to ensure event logs are recorded in the correct location even in worktree environment */
  projectPath?: string;
  status: AutoExecutionStatus;
  currentPhase?: WorkflowPhase;
  completedPhases: WorkflowPhase[];
  error?: ApiError;
}

/**
 * Bug auto execution state returned by bug auto execution APIs
 * Requirements: 6.3 (bug-auto-execution-per-bug-state Task 6.2)
 */
export interface BugAutoExecutionState {
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
}

/**
 * Bug auto execution permissions for startBugAutoExecution
 * Requirements: 4.1 (remote-ui-bug-advanced-features Task 1.2)
 */
export interface BugAutoExecutionPermissions {
  analyze: boolean;
  fix: boolean;
  verify: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Bug change event type
 * bugs-view-unification: Task 1.1 - Re-export from renderer/types/bug
 * Requirements: 4.4
 * Note: Type is defined in renderer/types/bug.ts for backward compatibility
 */
import type { BugsChangeEvent } from '@renderer/types/bug';

/**
 * Auto execution status change event data
 */
export interface AutoExecutionStatusEvent {
  specPath: string;
  status: AutoExecutionStatus;
  currentPhase?: WorkflowPhase;
  completedPhases: WorkflowPhase[];
}

// =============================================================================
// ApiClient Interface
// =============================================================================

/**
 * API Client Interface
 *
 * This interface abstracts all communication between UI components and the backend.
 * Implementations:
 * - IpcApiClient: For Electron renderer (uses window.electronAPI)
 * - WebSocketApiClient: For Remote UI (uses WebSocket)
 *
 * All methods are async and return Result<T, ApiError> for consistent error handling.
 */
export interface ApiClient {
  // ===========================================================================
  // Project Operations
  // auto-execution-projectpath-fix Task 4.5: Added getProjectPath method
  // ===========================================================================

  /**
   * Get the current project path
   * Returns the project root path from the client's context.
   * - IpcApiClient: Gets from projectStore.currentProject
   * - WebSocketApiClient: Gets from INIT message projectPath
   * @returns Project path or empty string if not available
   */
  getProjectPath?(): string;

  // ===========================================================================
  // Spec Operations
  // ===========================================================================

  /**
   * Get all specs for the current project
   */
  getSpecs(): Promise<Result<SpecMetadata[], ApiError>>;

  /**
   * Get detailed information for a specific spec
   * @param specId - Spec identifier (feature name)
   */
  getSpecDetail(specId: string): Promise<Result<SpecDetail, ApiError>>;

  /**
   * Execute a workflow phase for a spec
   * @param specId - Spec identifier
   * @param phase - Phase to execute
   */
  executePhase(specId: string, phase: WorkflowPhase): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Update approval status for a spec phase
   * @param specPath - Full path to spec directory
   * @param phase - Phase to approve/reject
   * @param approved - Approval status
   */
  updateApproval(specPath: string, phase: Phase, approved: boolean): Promise<Result<void, ApiError>>;

  // ===========================================================================
  // Bug Operations
  // ===========================================================================

  /**
   * Get all bugs for the current project
   */
  getBugs(): Promise<Result<BugMetadata[], ApiError>>;

  /**
   * Get detailed information for a specific bug
   * @param bugPath - Full path to bug directory
   */
  getBugDetail(bugPath: string): Promise<Result<BugDetail, ApiError>>;

  /**
   * Execute a bug workflow phase
   * @param bugName - Bug name (directory name)
   * @param action - Bug action to execute
   * @param options - Optional execution options (useWorktree, etc.)
   */
  executeBugPhase(
    bugName: string,
    action: BugAction,
    options?: { useWorktree?: boolean }
  ): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Create a new bug
   * Requirements: 5.1 (remote-ui-bug-advanced-features Task 2.1)
   * @param name - Bug name (directory name)
   * @param description - Bug description
   */
  createBug?(name: string, description: string): Promise<Result<AgentInfo, ApiError>>;

  // ===========================================================================
  // Agent Operations
  // ===========================================================================

  /**
   * Get all agents (running and completed)
   */
  getAgents(): Promise<Result<AgentInfo[], ApiError>>;

  /**
   * Stop a running agent
   * @param agentId - Agent identifier
   */
  stopAgent(agentId: string): Promise<Result<void, ApiError>>;

  /**
   * Resume a paused agent
   * @param agentId - Agent identifier
   */
  resumeAgent(agentId: string): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Send input text to an agent
   * @param agentId - Agent identifier
   * @param text - Input text to send
   */
  sendAgentInput(agentId: string, text: string): Promise<Result<void, ApiError>>;

  /**
   * Get logs for a specific agent
   * main-process-log-parser Task 10.4: Changed return type to ParsedLogEntry[]
   * @param specId - Spec identifier
   * @param agentId - Agent identifier
   */
  getAgentLogs(specId: string, agentId: string): Promise<Result<ParsedLogEntry[], ApiError>>;

  /**
   * Execute a project-level command
   * release-button-api-fix: Task 5.1
   * websocket-command-unification: Unified API for all project-level commands
   * Requirements: 1.1 - executeProjectCommand API
   * @param command - Command string to execute (e.g., '/release', '/kiro:project-ask "prompt"')
   * @param title - Display title for Agent list (e.g., 'release', 'project-ask')
   */
  executeProjectCommand(command: string, title: string): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Execute a spec-level command
   * websocket-command-unification: Task 5.1 - New unified API for spec-level commands
   * Requirements: 5.5
   * @param specId - Spec identifier (feature name)
   * @param featureName - Feature name for context
   * @param command - Command string to execute (e.g., '/kiro:spec-ask "prompt"')
   * @param title - Display title for Agent list (e.g., 'spec-ask')
   */
  executeSpecCommand?(
    specId: string,
    featureName: string,
    command: string,
    title: string
  ): Promise<Result<AgentInfo, ApiError>>;

  // ===========================================================================
  // Review Operations
  // ===========================================================================

  /**
   * Execute document review for a spec
   * @param specId - Spec identifier
   */
  executeDocumentReview(specId: string): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Execute inspection for a spec
   * @param specId - Spec identifier
   */
  executeInspection(specId: string): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Update document review scheme for a spec
   * gemini-document-review: Remote UI scheme change support
   * @param specPath - Full path to spec directory
   * @param scheme - New reviewer scheme
   */
  updateDocumentReviewScheme?(
    specPath: string,
    scheme: string
  ): Promise<Result<void, ApiError>>;

  // ===========================================================================
  // Auto Execution Operations
  // ===========================================================================

  /**
   * Start auto execution for a spec
   * auto-execution-projectpath-fix: Task 4.4
   * @param projectPath - Project root path (main repository)
   * @param specPath - Full path to spec directory
   * @param specId - Spec identifier
   * @param options - Auto execution options
   */
  startAutoExecution(
    projectPath: string,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>>;

  /**
   * Stop auto execution for a spec
   * @param specPath - Full path to spec directory
   */
  stopAutoExecution(specPath: string): Promise<Result<void, ApiError>>;

  /**
   * Get auto execution status for a spec
   * @param specPath - Full path to spec directory
   */
  getAutoExecutionStatus(specPath: string): Promise<Result<AutoExecutionState | null, ApiError>>;

  /**
   * Get bug auto execution status
   * Requirements: 6.3 (bug-auto-execution-per-bug-state Task 6.2)
   * @param bugPath - Full path to bug directory
   */
  getBugAutoExecutionStatus?(bugPath: string): Promise<Result<BugAutoExecutionState | null, ApiError>>;

  /**
   * Start bug auto execution
   * Requirements: 4.1 (remote-ui-bug-advanced-features Task 1.2)
   * @param bugPath - Full path to bug directory
   * @param permissions - Permissions for each phase
   */
  startBugAutoExecution?(
    bugPath: string,
    permissions: BugAutoExecutionPermissions
  ): Promise<Result<BugAutoExecutionState, ApiError>>;

  /**
   * Stop bug auto execution
   * Requirements: 4.2 (remote-ui-bug-advanced-features Task 1.2)
   * @param bugPath - Full path to bug directory
   */
  stopBugAutoExecution?(bugPath: string): Promise<Result<void, ApiError>>;

  // ===========================================================================
  // File Operations
  // ===========================================================================

  /**
   * Save file content
   * For Electron: saves directly to file system
   * For Remote UI: sends save request via WebSocket to server
   * @param filePath - Full path to file
   * @param content - File content to save
   */
  saveFile(filePath: string, content: string): Promise<Result<void, ApiError>>;

  /**
   * Get artifact content
   * For Electron: reads from file system via IPC
   * For Remote UI: sends request via WebSocket to server
   * @param specId - Spec identifier (feature name)
   * @param artifactType - Artifact type (requirements, design, tasks, research, etc.)
   * @param entityType - Entity type (spec or bug), defaults to 'spec'
   */
  getArtifactContent?(
    specId: string,
    artifactType: string,
    entityType?: 'spec' | 'bug'
  ): Promise<Result<string, ApiError>>;

  // ===========================================================================
  // Project File Operations (project-config-editor)
  // Requirements: 3.1, 4.1, 6.2
  // ===========================================================================

  /**
   * List project files (CLAUDE.md and .kiro/steering/*.md)
   * project-config-editor Task 5.1/5.2
   * @returns ProjectFilesState with claudeMd and steeringFiles
   */
  listProjectFiles?(): Promise<Result<ProjectFilesState, ApiError>>;

  /**
   * Read project file content
   * project-config-editor Task 5.1/5.2
   * @param filePath - Relative path to file from project root
   * @returns File content as string
   */
  readProjectFile?(filePath: string): Promise<Result<string, ApiError>>;

  /**
   * Write project file content
   * project-config-editor Task 5.1/5.2
   * @param filePath - Relative path to file from project root
   * @param content - File content to write
   */
  writeProjectFile?(filePath: string, content: string): Promise<Result<void, ApiError>>;

  /**
   * Subscribe to project file change events
   * project-config-editor Task 5.1/5.2
   * @param listener - Callback receiving file path of changed file
   * @returns Unsubscribe function
   */
  onProjectFileChanged?(listener: (filePath: string) => void): () => void;

  // ===========================================================================
  // Event Subscriptions
  // ===========================================================================

  /**
   * Subscribe to specs list updates
   * @param callback - Callback function receiving updated specs
   * @returns Unsubscribe function
   */
  onSpecsUpdated(callback: (specs: SpecMetadata[]) => void): () => void;

  /**
   * Subscribe to bugs list updates
   * @param callback - Callback function receiving updated bugs
   * @returns Unsubscribe function
   */
  onBugsUpdated(callback: (bugs: BugMetadata[]) => void): () => void;

  /**
   * Subscribe to agent output
   * @param callback - Callback receiving agent output data
   * @returns Unsubscribe function
   */
  onAgentOutput(
    callback: (agentId: string, stream: 'stdout' | 'stderr' | 'stdin', data: string) => void
  ): () => void;

  /**
   * Subscribe to agent status changes
   * @param callback - Callback receiving agent status updates
   * @returns Unsubscribe function
   */
  onAgentStatusChange(callback: (agentId: string, status: AgentStatus) => void): () => void;

  /**
   * Subscribe to parsed agent log entries
   * main-process-log-parser Task 10.2: New event for Main process parsed logs
   * Requirements: 3.1
   * @param callback - Callback receiving parsed log entry
   * @returns Unsubscribe function
   */
  onAgentLog(callback: (agentId: string, log: ParsedLogEntry) => void): () => void;

  /**
   * Subscribe to auto execution status changes
   * @param callback - Callback receiving auto execution status updates
   * @returns Unsubscribe function
   */
  onAutoExecutionStatusChanged(callback: (data: AutoExecutionStatusEvent) => void): () => void;

  // ===========================================================================
  // Bug Monitoring Operations (bugs-view-unification)
  // Requirements: 4.1, 4.2, 4.3, 4.4
  // ===========================================================================

  /**
   * Start bugs watcher
   * bugs-view-unification: Task 1.1
   */
  startBugsWatcher(): Promise<Result<void, ApiError>>;

  /**
   * Stop bugs watcher
   * bugs-view-unification: Task 1.1
   */
  stopBugsWatcher(): Promise<Result<void, ApiError>>;

  /**
   * Subscribe to bug change events
   * bugs-view-unification: Task 1.1
   * @param listener - Event listener callback
   * @returns Unsubscribe function
   */
  onBugsChanged(listener: (event: BugsChangeEvent) => void): () => void;

  // ===========================================================================
  // Connection Management (Remote UI only)
  // ===========================================================================

  /**
   * Initialize connection (for WebSocket client)
   * No-op for IPC client
   */
  connect?(): Promise<Result<void, ApiError>>;

  /**
   * Close connection (for WebSocket client)
   * No-op for IPC client
   */
  disconnect?(): void;

  /**
   * Check if connected
   */
  isConnected?(): boolean;

  // ===========================================================================
  // Profile Operations (header-profile-badge feature)
  // Requirements: 3.1, 5.1
  // ===========================================================================

  /**
   * Get installed profile configuration
   * Optional: Only implemented for Remote UI (WebSocket client)
   * @returns ProfileConfig or null if not installed
   */
  getProfile?(): Promise<Result<{ name: string; installedAt: string } | null, ApiError>>;

  // ===========================================================================
  // Worktree Operations (convert-spec-to-worktree feature)
  // Requirements: 4.1, 4.2, 4.3
  // ===========================================================================

  /**
   * Convert a normal spec to worktree mode
   * Optional: Only implemented for Remote UI (WebSocket client)
   * @param specId - Spec identifier (feature name)
   * @param featureName - Feature name for branch naming
   * @returns WorktreeInfo with path, branch, and creation timestamp
   */
  convertToWorktree?(specId: string, featureName: string): Promise<Result<{
    path: string;
    absolutePath: string;
    branch: string;
    created_at: string;
  }, ApiError>>;

  /**
   * Rebase worktree branch from main
   * worktree-rebase-from-main: Task 5.1a, 5.1b
   * Requirements: 5.1, 8.2
   * @param specOrBugPath - Full path to spec or bug directory (e.g., '.kiro/specs/my-feature' or '.kiro/bugs/my-bug')
   * @returns Success with alreadyUpToDate flag, or conflict/error info
   */
  rebaseFromMain?(specOrBugPath: string): Promise<Result<{
    success: true;
    alreadyUpToDate?: boolean;
  } | {
    success: false;
    conflict?: boolean;
    error?: string;
  }, ApiError>>;

  // ===========================================================================
  // Spec Plan Operations (remote-ui-create-buttons feature)
  // Requirements: 3.1
  // ===========================================================================

  /**
   * Execute spec-plan to create a new spec via interactive dialogue
   * Optional: Only implemented for Remote UI (WebSocket client)
   * @param description - Spec description for planning dialogue
   * @param worktreeMode - Whether to create in worktree mode
   * @returns AgentInfo on success
   */
  executeSpecPlan?(
    description: string,
    worktreeMode: boolean
  ): Promise<Result<AgentInfo, ApiError>>;

  // ===========================================================================
  // Spec JSON Operations (auto-execution-ssot feature)
  // Requirements: SSOT for auto-execution permissions
  // ===========================================================================

  /**
   * Update spec.json with partial updates
   * auto-execution-ssot: Enable Remote UI to update spec.json directly
   * @param specId - Spec identifier (feature name)
   * @param updates - Partial spec.json updates to apply
   */
  updateSpecJson?(specId: string, updates: Record<string, unknown>): Promise<Result<void, ApiError>>;

  // ===========================================================================
  // Git Diff Viewer Operations (git-diff-viewer feature)
  // Requirements: 10.1, 10.2, 10.3, 10.4
  // ===========================================================================

  /**
   * Get git status for the current project
   * Returns list of changed files with status (A/M/D/??)
   * @param projectPath - Project root path (use empty string for current project)
   * @returns GitStatusResult with file list and mode
   */
  getGitStatus(projectPath: string): Promise<Result<GitStatusResult, ApiError>>;

  /**
   * Get git diff for a specific file
   * Returns unified diff format string
   * @param projectPath - Project root path (use empty string for current project)
   * @param filePath - File path relative to project root
   * @returns Diff content as string
   */
  getGitDiff(projectPath: string, filePath: string): Promise<Result<string, ApiError>>;

  /**
   * Start file watching for git changes
   * Main process will broadcast 'git:changes-detected' events on file changes
   * @param projectPath - Project root path (use empty string for current project)
   */
  startWatching(projectPath: string): Promise<Result<void, ApiError>>;

  /**
   * Stop file watching
   * @param projectPath - Project root path (use empty string for current project)
   */
  stopWatching(projectPath: string): Promise<Result<void, ApiError>>;

  // ===========================================================================
  // Git View Source Mode Operations (git-view-source-mode feature)
  // Requirements: 5.1, 5.2, 5.3
  // ===========================================================================

  /**
   * Read file content for Source view display
   * Returns file content with type detection for appropriate rendering
   * @param projectPath - Project root path
   * @param filePath - Relative file path from project root
   * @returns FileContentResult with content, isBase64, fileType, and optional language
   */
  readFileContent?(
    projectPath: string,
    filePath: string
  ): Promise<Result<FileContentResult, ApiError>>;
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

// Re-export workflow types
import type { WorkflowPhase as RendererWorkflowPhase, PhaseStatus as RendererPhaseStatus } from '@renderer/types/workflow';

export type {
  SpecMetadata,
  SpecDetail,
  SpecJson,
  SpecPhase,
  Phase,
  LogEntry,
  AutoExecutionPermissions,
  // DocumentReviewFlag removed - document-review-phase Task 8.1
  SpecAutoExecutionState,
  BugMetadata,
  BugDetail,
  BugAction,
  // main-process-log-parser Task 10.2: Export ParsedLogEntry
  ParsedLogEntry,
  // agent-error-notification Task 7.1: Export AgentStartError
  AgentStartError,
};

// bugs-view-unification: Re-export BugsChangeEvent
export type { BugsChangeEvent };

// Workflow types for shared components
export type { RendererWorkflowPhase as WorkflowPhaseType, RendererPhaseStatus as PhaseStatusType };

// =============================================================================
// Git Diff Viewer Types (Task 10.1)
// =============================================================================

/**
 * Git file change status
 * - 'A': Added
 * - 'M': Modified
 * - 'D': Deleted
 * - '??': Untracked
 */
export interface GitFileStatus {
  /** File path (relative to project root) */
  path: string;
  /** Change status */
  status: 'A' | 'M' | 'D' | '??';
}

/**
 * Git status result
 * Contains file list, base branch (for worktree), and detection mode
 */
export interface GitStatusResult {
  /** List of changed files */
  files: GitFileStatus[];
  /** Base branch (worktree only) */
  baseBranch?: string;
  /** Detection mode */
  mode: 'worktree' | 'normal';
}

// =============================================================================
// Git View Source Mode Types (git-view-source-mode feature)
// Requirements: 5.1, 5.2, 5.3
// =============================================================================

/**
 * File content result for Source view
 * Contains file content with type detection for appropriate rendering
 */
export interface FileContentResult {
  /** File content (text or base64 encoded for images) */
  content: string;
  /** Whether content is base64 encoded */
  isBase64: boolean;
  /** Detected file type for rendering selection */
  fileType: 'code' | 'markdown' | 'image' | 'binary';
  /** Programming language for syntax highlighting (code files only) */
  language?: string;
}

// =============================================================================
// Project Config Editor Types (project-config-editor feature)
// Requirements: 2.2, 2.3
// =============================================================================

/**
 * Project file group
 * 'claude' - CLAUDE.md file
 * 'steering' - .kiro/steering/*.md files
 */
export type ProjectFileGroup = 'claude' | 'steering';

/**
 * Project file information
 * project-config-editor Task 1.1
 * Requirements: 2.2, 2.3
 */
export interface ProjectFileInfo {
  /** File path (relative to project root) */
  relativePath: string;
  /** File name */
  fileName: string;
  /** File group (claude or steering) */
  group: ProjectFileGroup;
  /** Whether file exists */
  exists: boolean;
}

/**
 * Project files state
 * project-config-editor Task 1.1
 * Requirements: 2.1, 2.4, 2.5
 * project-docs-viewer Task 1.1: docsTree フィールド追加
 */
export interface ProjectFilesState {
  /** CLAUDE.md file info (null if not exists) */
  claudeMd: ProjectFileInfo | null;
  /** Steering files list */
  steeringFiles: ProjectFileInfo[];
  /** docs/ folder tree structure (project-docs-viewer) */
  docsTree: DocsTreeNode[];
  /** Whether loading */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
}

// =============================================================================
// Docs Tree Types (project-docs-viewer feature)
// Requirements: 1.1
// =============================================================================

/**
 * File extension types supported in docs folder
 * project-docs-viewer Task 1.1
 */
export type DocsFileExtension = 'md' | 'pdf' | 'html';

/**
 * Docs tree node representing a file or directory
 * project-docs-viewer Task 1.1
 * Requirements: 1.1
 */
export interface DocsTreeNode {
  /** Node name (file name or folder name) */
  name: string;
  /** Relative path from docs/ folder */
  relativePath: string;
  /** Node type */
  type: 'file' | 'directory';
  /** File extension (file type only) */
  extension?: DocsFileExtension;
  /** Child nodes (directory type only) */
  children?: DocsTreeNode[];
}
