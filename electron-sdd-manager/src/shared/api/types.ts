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
} from '@renderer/types';

import type { BugMetadata, BugDetail, BugAction } from '@renderer/types/bug';

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
 */
export type AgentStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'error';

/**
 * Agent information for tracking running agents
 */
export interface AgentInfo {
  /** Unique agent identifier */
  id: string;
  /** Spec ID or 'global' for project-level agents */
  specId: string;
  /** Current agent phase */
  phase: string;
  /** Agent status */
  status: AgentStatus;
  /** Start timestamp (ISO string or unix ms) */
  startedAt: string | number;
  /** End timestamp (if completed, ISO string or unix ms) */
  endedAt?: string | number;
  /** Agent output buffer */
  output?: string;
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
 */
export interface AutoExecutionState {
  status: AutoExecutionStatus;
  currentPhase?: WorkflowPhase;
  completedPhases: WorkflowPhase[];
  error?: ApiError;
}

// =============================================================================
// Event Types
// =============================================================================

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
   */
  executeBugPhase(bugName: string, action: BugAction): Promise<Result<AgentInfo, ApiError>>;

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
   * @param specPath - Full path to spec directory
   * @param specId - Spec identifier
   * @param options - Auto execution options
   */
  startAutoExecution(
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

// Workflow types for shared components
export type { RendererWorkflowPhase as WorkflowPhaseType, RendererPhaseStatus as PhaseStatusType };
