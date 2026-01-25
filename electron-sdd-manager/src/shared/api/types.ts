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
import type {
  SpecMetadata,
  SpecDetail,
  SpecJson,
  SpecPhase,
  Phase,
  LogEntry,
  AutoExecutionPermissions,
  DocumentReviewFlag,
  AutoExecutionStatus,
  SpecAutoExecutionState,
  ApprovalStatus,
} from '@renderer/types';

import type { WorktreeConfig } from '@shared/types/worktree';

import type { BugMetadata, BugDetail, BugAction } from '@renderer/types/bug';

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
 */
export type WorkflowPhase =
  | 'requirements'
  | 'design'
  | 'tasks'
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
 */
export interface AgentInfo {
  /** Unique agent identifier */
  id: string;
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
}

// =============================================================================
// Auto Execution Types
// =============================================================================

/**
 * Auto execution options for startAutoExecution
 */
export interface AutoExecutionOptions {
  permissions: AutoExecutionPermissions;
  documentReviewFlag: DocumentReviewFlag;
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
   * @param specId - Spec identifier
   * @param agentId - Agent identifier
   */
  getAgentLogs(specId: string, agentId: string): Promise<Result<LogEntry[], ApiError>>;

  /**
   * Execute a project-level command
   * release-button-api-fix: Task 5.1
   * Requirements: 1.1 - executeProjectCommand API
   * @param command - Command string to execute (e.g., '/release', '/kiro:project-ask "prompt"')
   * @param title - Display title for Agent list (e.g., 'release', 'ask')
   */
  executeProjectCommand(command: string, title: string): Promise<Result<AgentInfo, ApiError>>;

  /**
   * Execute project-level ask command (DEPRECATED)
   * release-button-api-fix: Kept for Remote UI backward compatibility
   * Remote UI migration is out of scope - this method will be removed in a future release
   * @deprecated Use executeProjectCommand with '/kiro:project-ask "${prompt}"' instead
   * @param prompt - Question/prompt to ask
   */
  executeAskProject?(prompt: string): Promise<Result<AgentInfo, ApiError>>;

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
   * Switch agent watch scope to a specific spec/bug
   * bugs-view-unification: Task 1.1
   * @param specId - Spec ID (feature name or bug:{name} format)
   */
  switchAgentWatchScope(specId: string): Promise<Result<void, ApiError>>;

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
  DocumentReviewFlag,
  SpecAutoExecutionState,
  BugMetadata,
  BugDetail,
  BugAction,
};

// bugs-view-unification: Re-export BugsChangeEvent
export type { BugsChangeEvent };

// Workflow types for shared components
export type { RendererWorkflowPhase as WorkflowPhaseType, RendererPhaseStatus as PhaseStatusType };
