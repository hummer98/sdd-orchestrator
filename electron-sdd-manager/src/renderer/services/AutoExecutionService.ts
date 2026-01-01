/**
 * AutoExecutionService
 * Manages auto-execution of workflow phases with parallel spec support
 * Requirements: 1.1-1.6, 2.1-2.6, 3.1-3.6, 4.1-4.5, 6.1-6.5, 7.1-7.5, 8.1-8.5
 *
 * NOTE: Updated for auto-execution-parallel-spec feature
 * - ExecutionContext per spec for parallel execution support
 * - Map-based internal state management
 * - AgentId to SpecId mapping for event routing
 */

import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';
import { notify } from '../stores/notificationStore';
import { ALL_WORKFLOW_PHASES, type WorkflowPhase, type ValidationType } from '../types/workflow';
import type { ApprovalStatus, SpecAutoExecutionState, SpecDetail } from '../types';
import { DEFAULT_SPEC_AUTO_EXECUTION_STATE, createSpecAutoExecutionState } from '../types';
import {
  createExecutionContext,
  disposeExecutionContext,
  MAX_CONCURRENT_SPECS,
  type ExecutionContext,
} from '../types/executionContext';

// ============================================================
// Task 3.1: Service Types
// Requirements: 3.1, 3.4
// ============================================================

export interface PreconditionResult {
  readonly valid: boolean;
  readonly requiresApproval: boolean;
  readonly waitingForAgent: boolean;
  readonly waitingForReview: boolean;
  readonly missingSpec: boolean;
  readonly error: string | null;
}

// Maximum retries before requiring manual intervention
const MAX_RETRIES = 3;
// Default timeout for agent execution (10 minutes)
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

// ============================================================
// auto-execution-parallel-spec: AutoExecutionService Class
// Requirements: 1.1-1.6, 2.1-2.6, 3.1-3.6, 4.1-4.5, 6.1-6.5, 7.1-7.5
// ============================================================

export class AutoExecutionService {
  private unsubscribeAgentStore: (() => void) | null = null;

  // ============================================================
  // Task 2.1: Map-based internal state management
  // Requirements: 1.1, 2.1
  // ============================================================
  private executionContexts: Map<string, ExecutionContext> = new Map();
  private agentToSpecMap: Map<string, string> = new Map();
  private pendingEventsMap: Map<string, { specId: string; status: string }> = new Map();

  // Legacy fields for backward compatibility (single spec tracking)
  private currentExecutingSpecId: string | null = null;

  // ============================================================
  // Task 1.1, 2.1: IPC Direct Subscription
  // Requirements: 1.1, 2.1, 2.4
  // ============================================================
  private unsubscribeIPC: (() => void) | null = null;
  private trackedAgentIds: Set<string> = new Set();
  private pendingEvents: Map<string, string> = new Map(); // agentId -> status (legacy)

  constructor() {
    this.setupDirectIPCListener();
    this.setupAgentListener();
  }

  // ============================================================
  // Task 2.1: Public API for parallel execution
  // Requirements: 1.1, 3.4, 3.5
  // ============================================================

  /**
   * Get ExecutionContext for a specific spec
   * Requirements: 1.1
   */
  getExecutionContext(specId: string): ExecutionContext | undefined {
    return this.executionContexts.get(specId);
  }

  /**
   * Get count of active executions
   * Requirements: 3.4
   */
  getActiveExecutionCount(): number {
    return this.executionContexts.size;
  }

  /**
   * Check if a specific spec is executing
   * Requirements: 3.1
   */
  isExecuting(specId: string): boolean {
    return this.executionContexts.has(specId);
  }

  /**
   * Get specId for a given agentId
   * Requirements: 2.3
   */
  getSpecIdForAgent(agentId: string): string | undefined {
    return this.agentToSpecMap.get(agentId);
  }

  // ============================================================
  // Task 7.3: dispose() - Clean up all contexts
  // Requirements: 6.4
  // ============================================================
  dispose(): void {
    if (this.unsubscribeAgentStore) {
      this.unsubscribeAgentStore();
      this.unsubscribeAgentStore = null;
    }
    if (this.unsubscribeIPC) {
      this.unsubscribeIPC();
      this.unsubscribeIPC = null;
    }

    // Clean up all execution contexts
    for (const [specId, context] of this.executionContexts) {
      disposeExecutionContext(context);
      useSpecStore.getState().stopAutoExecution(specId);
    }
    this.executionContexts.clear();
    this.agentToSpecMap.clear();
    this.pendingEventsMap.clear();

    // Legacy cleanup
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();
    this.currentExecutingSpecId = null;
  }

  // ============================================================
  // Task 7.4: forceCleanupAll() - Test utility
  // Requirements: 6.5
  // ============================================================
  forceCleanupAll(): void {
    // Clean up all execution contexts without disposing the service
    for (const [specId, context] of this.executionContexts) {
      disposeExecutionContext(context);
      useSpecStore.getState().stopAutoExecution(specId);
    }
    this.executionContexts.clear();
    this.agentToSpecMap.clear();
    this.pendingEventsMap.clear();
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();
    this.currentExecutingSpecId = null;
    console.log('[AutoExecutionService] Force cleanup completed');
  }

  // ============================================================
  // spec-scoped-auto-execution-state Task 2.1: Get spec autoExecution state
  // Requirements: 2.1, 2.2
  // ============================================================
  getSpecAutoExecutionState(): SpecAutoExecutionState | null {
    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;

    if (!specDetail) {
      return null;
    }

    const specJson = specDetail.specJson as any;

    // If autoExecution field doesn't exist, return default state
    if (!specJson.autoExecution) {
      return { ...DEFAULT_SPEC_AUTO_EXECUTION_STATE };
    }

    // Return the stored state, merged with defaults for any missing fields
    return createSpecAutoExecutionState(specJson.autoExecution);
  }

  // ============================================================
  // spec-scoped-auto-execution-state Task 2.2: Update spec autoExecution state
  // Requirements: 2.3, 3.1
  // ============================================================
  async updateSpecAutoExecutionState(state: SpecAutoExecutionState): Promise<boolean> {
    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;

    if (!specDetail) {
      console.error('[AutoExecutionService] Cannot update state: specDetail is not available');
      return false;
    }

    try {
      await window.electronAPI.updateSpecJson(specDetail.metadata.path, {
        autoExecution: state,
      });
      // Note: File watcher will automatically trigger specStore.updateSpecJson()
      // No need to manually call selectSpec here
      return true;
    } catch (error) {
      console.error('[AutoExecutionService] Failed to update spec autoExecution state:', error);
      return false;
    }
  }

  // ============================================================
  // spec-scoped-auto-execution-state Task 2.3: Sync from spec autoExecution
  // Requirements: 2.4, 2.5
  // ============================================================
  syncFromSpecAutoExecution(): void {
    const specState = this.getSpecAutoExecutionState();

    if (!specState) {
      console.log('[AutoExecutionService] No spec autoExecution state to sync');
      return;
    }

    const workflowStore = useWorkflowStore.getState();

    // Sync permissions
    workflowStore.setAutoExecutionPermissions(specState.permissions);

    // Sync document review options
    workflowStore.setDocumentReviewOptions({
      autoExecutionFlag: specState.documentReviewFlag,
    });

    // Sync validation options
    workflowStore.setValidationOptions(specState.validationOptions);

    console.log('[AutoExecutionService] Synced from spec autoExecution state');
  }

  // ============================================================
  // spec-scoped-auto-execution-state Task 2.4: Start with spec state
  // Requirements: 2.1, 4.1
  // ============================================================
  startWithSpecState(): boolean {
    const specState = this.getSpecAutoExecutionState();

    if (!specState) {
      console.error('[AutoExecutionService] Cannot start: no spec autoExecution state');
      return false;
    }

    if (!specState.enabled) {
      console.log('[AutoExecutionService] Spec autoExecution is not enabled');
      return false;
    }

    // Sync from spec state before starting
    this.syncFromSpecAutoExecution();

    // Start with the synced permissions
    return this.start();
  }

  // ============================================================
  // Bug Fix: Get last completed phase from approvals
  // Determines the starting point for auto-execution based on spec status
  // ============================================================
  getLastCompletedPhase(approvals: ApprovalStatus): WorkflowPhase | null {
    // Check in reverse order: tasks -> design -> requirements
    // Return the last phase that is either approved OR generated (will be auto-approved)
    if (approvals.tasks.approved || approvals.tasks.generated) return 'tasks';
    if (approvals.design.approved || approvals.design.generated) return 'design';
    if (approvals.requirements.approved || approvals.requirements.generated) return 'requirements';
    return null;
  }

  // ============================================================
  // Task 3.2: Next permitted phase logic
  // Requirements: 2.1, 2.2
  // ============================================================
  getNextPermittedPhase(currentPhase: WorkflowPhase | null): WorkflowPhase | null {
    const { autoExecutionPermissions } = useWorkflowStore.getState();

    // Find starting index
    let startIndex = 0;
    if (currentPhase !== null) {
      const currentIndex = ALL_WORKFLOW_PHASES.indexOf(currentPhase);
      if (currentIndex === -1) return null;
      startIndex = currentIndex + 1;
    }

    // Find next permitted phase
    for (let i = startIndex; i < ALL_WORKFLOW_PHASES.length; i++) {
      const phase = ALL_WORKFLOW_PHASES[i];
      if (autoExecutionPermissions[phase]) {
        return phase;
      }
    }

    return null;
  }

  // ============================================================
  // Task 5.1: Precondition validation with ExecutionContext support
  // Requirements: 3.1, 3.4, 4.1, 4.2
  // ============================================================
  async validatePreconditions(phase: WorkflowPhase, specDetailSnapshot?: SpecDetail): Promise<PreconditionResult> {
    const specStore = useSpecStore.getState();
    const agentStore = useAgentStore.getState();

    // Use snapshot if provided, otherwise use current specDetail
    const specDetail = specDetailSnapshot || specStore.specDetail;

    // Check specDetail availability
    if (!specDetail) {
      return {
        valid: false,
        requiresApproval: false,
        waitingForAgent: false,
        waitingForReview: false,
        missingSpec: true,
        error: 'specDetail is not available',
      };
    }

    // Read spec.json directly to get the latest state (avoid stale cache)
    const specJson = await window.electronAPI.readSpecJson(specDetail.metadata.path);

    // Check for running agents on this spec
    const specAgents = agentStore.getAgentsForSpec(specDetail.metadata.name);
    const hasRunningAgent = specAgents.some((agent) => agent.status === 'running');

    if (hasRunningAgent) {
      return {
        valid: false,
        requiresApproval: false,
        waitingForAgent: true,
        waitingForReview: false,
        missingSpec: false,
        error: null,
      };
    }

    // Requirements phase doesn't need previous approval
    if (phase === 'requirements') {
      return {
        valid: true,
        requiresApproval: false,
        waitingForAgent: false,
        waitingForReview: false,
        missingSpec: false,
        error: null,
      };
    }

    // Check previous phase approval for design/tasks phases
    const phaseIndex = ALL_WORKFLOW_PHASES.indexOf(phase);
    if (phaseIndex > 0 && phaseIndex < 3) {
      // design or tasks
      const prevPhase = ALL_WORKFLOW_PHASES[phaseIndex - 1] as 'requirements' | 'design';
      const prevApproval = specJson.approvals[prevPhase];

      if (!prevApproval.approved) {
        return {
          valid: prevApproval.generated, // Can proceed if we auto-approve
          requiresApproval: prevApproval.generated,
          waitingForAgent: false,
          waitingForReview: false,
          missingSpec: false,
          error: prevApproval.generated ? null : `${prevPhase} is not generated yet`,
        };
      }
    }

    // For impl phase, check tasks approval and document review status
    if (phase === 'impl') {
      const tasksApproval = specJson.approvals.tasks;
      if (!tasksApproval.approved) {
        return {
          valid: tasksApproval.generated,
          requiresApproval: tasksApproval.generated,
          waitingForAgent: false,
          waitingForReview: false,
          missingSpec: false,
          error: tasksApproval.generated ? null : 'tasks is not generated yet',
        };
      }

      // Check document review status (only in auto-execution mode)
      const { documentReviewOptions } = useWorkflowStore.getState();
      if (documentReviewOptions.autoExecutionFlag !== 'skip') {
        // Review is enabled, check if it's approved or skipped
        const reviewStatus = (specJson as any).documentReview?.status;
        if (reviewStatus !== 'approved' && reviewStatus !== 'skipped') {
          return {
            valid: false,
            requiresApproval: false,
            waitingForAgent: false,
            waitingForReview: true,
            missingSpec: false,
            error: 'Waiting for document review approval',
          };
        }
      }
    }

    return {
      valid: true,
      requiresApproval: false,
      waitingForAgent: false,
      waitingForReview: false,
      missingSpec: false,
      error: null,
    };
  }

  // ============================================================
  // Task 3.1: Start auto execution with ExecutionContext
  // Requirements: 1.1, 1.2, 1.5, 2.1, 3.1, 3.4, 3.5
  // ============================================================
  start(): boolean {
    const specStore = useSpecStore.getState();
    const workflowStore = useWorkflowStore.getState();

    // Check if specDetail is available
    if (!specStore.specDetail) {
      console.error('[AutoExecutionService] specDetail is not available');
      return false;
    }

    const specId = specStore.specDetail.metadata.name;
    const specDetail = specStore.specDetail;

    // Task 2.2: Check concurrent execution limit
    if (this.executionContexts.size >= MAX_CONCURRENT_SPECS) {
      console.error(`[AutoExecutionService] Maximum concurrent executions (${MAX_CONCURRENT_SPECS}) reached`);
      notify.error(`同時実行可能なSpec数の上限（${MAX_CONCURRENT_SPECS}件）に達しています`);
      return false;
    }

    // Task 2.2: Prevent duplicate execution of same specId
    if (this.executionContexts.has(specId)) {
      console.error(`[AutoExecutionService] Spec ${specId} is already executing`);
      return false;
    }

    // Bug Fix: Determine starting phase based on current spec progress
    const approvals = specDetail.specJson.approvals;
    const lastCompletedPhase = this.getLastCompletedPhase(approvals);

    // Get next permitted phase after the last completed one
    const firstPhase = this.getNextPermittedPhase(lastCompletedPhase);
    if (!firstPhase) {
      console.error('[AutoExecutionService] No permitted phases to execute');
      return false;
    }

    console.log(`[AutoExecutionService] Starting from phase: ${firstPhase} (last completed: ${lastCompletedPhase || 'none'})`);

    // Task 3.1: Create ExecutionContext with specDetail snapshot
    const context = createExecutionContext({
      specId,
      specDetail,
    });
    this.executionContexts.set(specId, context);

    // Legacy: Set currentExecutingSpecId for backward compatibility
    this.currentExecutingSpecId = specId;

    // Update store state
    specStore.startAutoExecution(specId);
    workflowStore.resetFailedRetryCount();
    workflowStore.setLastFailedPhase(null);
    workflowStore.setExecutionSummary(null);

    // Start execution from first phase
    this.executePhaseForContext(context, firstPhase);

    return true;
  }

  // ============================================================
  // Task 7.2: Stop auto execution with specId parameter
  // Requirements: 1.2, 5.2, 6.3, 7.1
  // ============================================================
  async stop(specId?: string): Promise<void> {
    const specStore = useSpecStore.getState();

    // If specId not provided, use currentExecutingSpecId (backward compatibility)
    const targetSpecId = specId || this.currentExecutingSpecId;

    if (!targetSpecId) {
      console.log('[AutoExecutionService] No spec to stop');
      return;
    }

    const context = this.executionContexts.get(targetSpecId);

    if (context) {
      // Clean up context timeout
      disposeExecutionContext(context);

      // Remove context from map
      this.executionContexts.delete(targetSpecId);

      // Clean up agentToSpecMap entries for this spec
      for (const [agentId, mappedSpecId] of this.agentToSpecMap) {
        if (mappedSpecId === targetSpecId) {
          this.agentToSpecMap.delete(agentId);
          this.trackedAgentIds.delete(agentId);
        }
      }

      // Generate summary if we executed anything
      if (context.executedPhases.length > 0) {
        this.generateSummaryFromContext(context);
      }
    }

    // Stop auto execution in store
    specStore.stopAutoExecution(targetSpecId);

    // Update currentExecutingSpecId if we stopped it
    if (this.currentExecutingSpecId === targetSpecId) {
      this.currentExecutingSpecId = null;
    }
  }

  // ============================================================
  // Task 8.1: Retry from failed phase with specId parameter
  // Requirements: 6.2, 7.1, 8.3
  // ============================================================
  retryFrom(fromPhase: WorkflowPhase, specId?: string): boolean {
    const workflowStore = useWorkflowStore.getState();
    const specStore = useSpecStore.getState();

    // If specId not provided, use current specDetail (backward compatibility)
    const targetSpecId = specId || specStore.specDetail?.metadata.name;

    if (!targetSpecId) {
      console.error('[AutoExecutionService] specDetail is not available');
      return false;
    }

    // Check if phase is permitted
    if (!workflowStore.autoExecutionPermissions[fromPhase]) {
      console.error(`[AutoExecutionService] Phase ${fromPhase} is not permitted`);
      return false;
    }

    // Increment retry count
    workflowStore.incrementFailedRetryCount();

    // Check if max retries exceeded
    if (workflowStore.failedRetryCount >= MAX_RETRIES) {
      console.error('[AutoExecutionService] Max retries exceeded');
      notify.error('リトライ上限に達しました。手動での確認が必要です。');
      return false;
    }

    // Get or create execution context
    let context = this.executionContexts.get(targetSpecId);
    if (!context && specStore.specDetail) {
      context = createExecutionContext({
        specId: targetSpecId,
        specDetail: specStore.specDetail,
      });
      this.executionContexts.set(targetSpecId, context);
    }

    if (!context) {
      console.error('[AutoExecutionService] Cannot create execution context');
      return false;
    }

    // Update context status
    context.executionStatus = 'running';

    // Update currentExecutingSpecId for backward compatibility
    this.currentExecutingSpecId = targetSpecId;

    // Start execution for the spec
    specStore.startAutoExecution(targetSpecId);

    this.executePhaseForContext(context, fromPhase);

    return true;
  }

  // ============================================================
  // Task 1.1: IPC Direct Subscription Setup
  // Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 3.1, 3.2, 3.3
  // ============================================================
  private setupDirectIPCListener(): void {
    // IPC direct subscription for agent status changes
    this.unsubscribeIPC = window.electronAPI.onAgentStatusChange(
      (agentId: string, status: string) => {
        this.handleDirectStatusChange(agentId, status);
      }
    );
  }

  // ============================================================
  // Task 4.1: Direct Status Change Handler with AgentId-SpecId resolution
  // Requirements: 1.2, 1.3, 1.4, 2.3, 2.4, 3.1, 3.2, 3.3
  // ============================================================
  private handleDirectStatusChange(agentId: string, status: string): void {
    console.log(`[AutoExecutionService] handleDirectStatusChange: agentId=${agentId}, status=${status}`);

    // Task 4.1: Resolve specId from agentToSpecMap
    const specId = this.agentToSpecMap.get(agentId);

    if (!specId) {
      // Task 2.4: Buffer events for unknown agentIds
      console.log(`[AutoExecutionService] AgentId ${agentId} not mapped, buffering status=${status}`);
      this.pendingEvents.set(agentId, status);
      return;
    }

    const context = this.executionContexts.get(specId);
    if (!context) {
      console.log(`[AutoExecutionService] No context for specId=${specId}, ignoring status change`);
      return;
    }

    const specStore = useSpecStore.getState();
    const runtime = specStore.getAutoExecutionRuntime(specId);
    if (!runtime.isAutoExecuting) {
      console.log(`[AutoExecutionService] Spec ${specId} not auto-executing, ignoring status change`);
      return;
    }

    // Check if agent is tracked in this context
    if (!context.trackedAgentIds.has(agentId)) {
      console.log(`[AutoExecutionService] AgentId ${agentId} not tracked in context ${specId}, buffering`);
      this.pendingEvents.set(agentId, status);
      return;
    }

    const currentPhase = context.currentPhase;
    console.log(`[AutoExecutionService] Processing status change: agentId=${agentId}, status=${status}, specId=${specId}, currentPhase=${currentPhase}`);

    // Task 4.2: Handle completion event for the specific context
    if (status === 'completed') {
      const agent = useAgentStore.getState().getAgentById(agentId);
      console.log(`[AutoExecutionService] Completed: agent?.phase=${agent?.phase}, currentPhase=${currentPhase}`);
      if (agent?.phase === 'document-review') {
        this.handleDocumentReviewCompletedForContext(context);
      } else if (agent?.phase === 'document-review-reply') {
        this.handleDocumentReviewReplyCompletedForContext(context);
      } else if (currentPhase) {
        this.handleAgentCompletedForContext(context, currentPhase);
      } else {
        console.warn('[AutoExecutionService] No currentPhase set, cannot handle completion');
      }
    } else if (status === 'error' || status === 'failed') {
      // Task 4.3: Error handling for specific context
      const agent = useAgentStore.getState().getAgentById(agentId);
      if (agent?.phase === 'document-review' || agent?.phase === 'document-review-reply') {
        this.handleDocumentReviewFailedForContext(context, agent.phase, 'Agent execution failed');
      } else if (currentPhase) {
        this.handleAgentFailedForContext(context, currentPhase, 'Agent execution failed');
      }
    }
  }

  // ============================================================
  // Task 2.1: AgentId Tracking - Public method for testing
  // Requirements: 2.1, 2.3
  // ============================================================
  isTrackedAgent(agentId: string): boolean {
    return this.trackedAgentIds.has(agentId) || this.agentToSpecMap.has(agentId);
  }

  // ============================================================
  // E2E Debug: Expose internal state for debugging
  // ============================================================
  getDebugInfo(): {
    trackedAgentIds: string[];
    pendingEvents: [string, string][];
    ipcListenerRegistered: boolean;
    executionContexts: string[];
    agentToSpecMap: [string, string][];
  } {
    return {
      trackedAgentIds: Array.from(this.trackedAgentIds),
      pendingEvents: Array.from(this.pendingEvents.entries()),
      ipcListenerRegistered: !!this.unsubscribeIPC,
      executionContexts: Array.from(this.executionContexts.keys()),
      agentToSpecMap: Array.from(this.agentToSpecMap.entries()),
    };
  }

  // ============================================================
  // E2E/Test: Reset internal state for test isolation
  // ============================================================
  resetForTest(): void {
    this.forceCleanupAll();
    console.log('[AutoExecutionService] State reset for test');
  }

  // ============================================================
  // Helper: Get current executing specId (backward compatibility)
  // ============================================================
  getCurrentExecutingSpecId(): string | null {
    return this.currentExecutingSpecId;
  }

  // ============================================================
  // Bug Fix: Track manual document-review agent for one-set execution
  // document-review -> document-review-reply should always run as a set
  // ============================================================
  /**
   * Track a manually executed document-review agent.
   * This enables document-review-reply to automatically run after document-review completes,
   * even when executed manually (not through auto-execution).
   */
  trackManualDocumentReviewAgent(agentId: string, specId: string): void {
    // Get or create ExecutionContext for this spec
    let context = this.executionContexts.get(specId);
    if (!context) {
      const specStore = useSpecStore.getState();
      if (!specStore.specDetail || specStore.specDetail.metadata.name !== specId) {
        console.warn(`[AutoExecutionService] Cannot track agent: specDetail not available for ${specId}`);
        return;
      }
      context = createExecutionContext({
        specId,
        specDetail: specStore.specDetail,
      });
      this.executionContexts.set(specId, context);
    }

    // Track the agent
    this.agentToSpecMap.set(agentId, specId);
    context.trackedAgentIds.add(agentId);
    this.trackedAgentIds.add(agentId);

    console.log(`[AutoExecutionService] Tracking manual document-review agent: ${agentId} -> ${specId}`);

    // Process any buffered events for this agent
    const bufferedStatus = this.pendingEvents.get(agentId);
    if (bufferedStatus) {
      console.log(`[AutoExecutionService] Processing buffered status=${bufferedStatus} for manual agent ${agentId}`);
      this.pendingEvents.delete(agentId);
      this.handleDirectStatusChange(agentId, bufferedStatus);
    }
  }

  // ============================================================
  // Helper: Set auto execution status for a specific spec
  // ============================================================
  private setStatusForSpec(specId: string, status: import('../types').AutoExecutionStatus): void {
    const context = this.executionContexts.get(specId);
    if (context) {
      context.executionStatus = status;
    }
    useSpecStore.getState().setAutoExecutionStatus(specId, status);
  }

  // ============================================================
  // Helper: Set auto execution phase for a specific spec
  // ============================================================
  private setPhaseForSpec(specId: string, phase: WorkflowPhase | null): void {
    const context = this.executionContexts.get(specId);
    if (context) {
      context.currentPhase = phase;
    }
    useSpecStore.getState().setAutoExecutionPhase(specId, phase);
  }

  // ============================================================
  // Task 5.1: Agent state monitoring (DEPRECATED)
  // Requirements: 6.1, 6.3
  // ============================================================
  private setupAgentListener(): void {
    // DEPRECATED: Completion detection now uses IPC direct subscription
    this.unsubscribeAgentStore = useAgentStore.subscribe(() => {
      // No-op: Completion detection moved to IPC direct subscription
    });
  }

  // ============================================================
  // Task 4.2: Agent completion handling for ExecutionContext
  // Requirements: 1.3, 2.3, 6.2
  // ============================================================
  private handleAgentCompletedForContext(context: ExecutionContext, completedPhase: WorkflowPhase): void {
    console.log(`[AutoExecutionService] Phase ${completedPhase} completed for spec ${context.specId}`);

    // Clear timeout for this context
    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
    }

    context.executedPhases.push(completedPhase);

    // Auto-approve the completed phase
    this.autoApproveCompletedPhaseForContext(context, completedPhase).then(() => {
      // Check for validation after this phase
      this.executeValidationIfEnabledForContext(context, completedPhase).then(() => {
        // After tasks phase, check if we should execute document review
        if (completedPhase === 'tasks') {
          this.handleTasksCompletedForDocumentReviewForContext(context);
          return;
        }

        // Get next phase
        const nextPhase = this.getNextPermittedPhase(completedPhase);

        if (nextPhase) {
          // Continue to next phase
          this.executePhaseForContext(context, nextPhase);
        } else {
          // All phases completed
          this.completeAutoExecutionForContext(context);
        }
      });
    });
  }

  // ============================================================
  // Task 4.3: Agent failure handling for ExecutionContext
  // Requirements: 3.2, 3.3
  // ============================================================
  private handleAgentFailedForContext(context: ExecutionContext, phase: WorkflowPhase, error: string): void {
    console.error(`[AutoExecutionService] Phase ${phase} failed for spec ${context.specId}: ${error}`);

    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
    }

    context.errors.push(error);
    context.executionStatus = 'error';

    const workflowStore = useWorkflowStore.getState();
    this.setStatusForSpec(context.specId, 'error');
    workflowStore.setLastFailedPhase(phase);

    notify.error(`フェーズ "${phase}" でエラーが発生しました: ${error}`);

    this.generateSummaryFromContext(context);
  }

  // ============================================================
  // Document Review Workflow Integration for ExecutionContext
  // ============================================================

  private async handleTasksCompletedForDocumentReviewForContext(context: ExecutionContext): Promise<void> {
    const workflowStore = useWorkflowStore.getState();
    const { documentReviewOptions } = workflowStore;

    if (documentReviewOptions.autoExecutionFlag === 'skip') {
      console.log('[AutoExecutionService] Document review skipped');
      const nextPhase = this.getNextPermittedPhase('tasks');
      if (nextPhase) {
        this.executePhaseForContext(context, nextPhase);
      } else {
        this.completeAutoExecutionForContext(context);
      }
      return;
    }

    await this.executeDocumentReviewForContext(context);
  }

  private async executeDocumentReviewForContext(context: ExecutionContext): Promise<void> {
    const workflowStore = useWorkflowStore.getState();

    try {
      console.log(`[AutoExecutionService] Executing document review for spec ${context.specId}`);
      const agentInfo = await window.electronAPI.executeDocumentReview(
        context.specId,
        context.specId,
        workflowStore.commandPrefix
      );

      // Track the agent
      if (agentInfo?.agentId) {
        this.agentToSpecMap.set(agentInfo.agentId, context.specId);
        context.trackedAgentIds.add(agentInfo.agentId);
        this.trackedAgentIds.add(agentInfo.agentId);
      }
    } catch (error) {
      this.handleDocumentReviewFailedForContext(
        context,
        'document-review',
        error instanceof Error ? error.message : 'Document review execution failed'
      );
    }
  }

  private async handleDocumentReviewCompletedForContext(context: ExecutionContext): Promise<void> {
    console.log(`[AutoExecutionService] Document review completed for spec ${context.specId}`);

    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
    }

    // Bug Fix: document-review -> document-review-reply should always run as a set
    // regardless of autoExecutionFlag setting
    await this.executeDocumentReviewReplyForContext(context);
  }

  private async executeDocumentReviewReplyForContext(context: ExecutionContext): Promise<void> {
    const workflowStore = useWorkflowStore.getState();

    // Get current round number from spec.json
    const specJson = await window.electronAPI.readSpecJson(context.specPath);
    const currentRound = (specJson as any).documentReview?.currentRound || 1;

    try {
      console.log(`[AutoExecutionService] Executing document review reply for round ${currentRound}, spec ${context.specId}`);
      const agentInfo = await window.electronAPI.executeDocumentReviewReply(
        context.specId,
        context.specId,
        currentRound,
        workflowStore.commandPrefix,
        true // autofix=true in auto-execution mode
      );

      // Track the agent
      if (agentInfo?.agentId) {
        this.agentToSpecMap.set(agentInfo.agentId, context.specId);
        context.trackedAgentIds.add(agentInfo.agentId);
        this.trackedAgentIds.add(agentInfo.agentId);
      }
    } catch (error) {
      this.handleDocumentReviewFailedForContext(
        context,
        'document-review-reply',
        error instanceof Error ? error.message : 'Document review reply execution failed'
      );
    }
  }

  private async handleDocumentReviewReplyCompletedForContext(context: ExecutionContext): Promise<void> {
    console.log(`[AutoExecutionService] Document review reply completed for spec ${context.specId}`);

    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
    }

    const workflowStore = useWorkflowStore.getState();

    try {
      // Get current round from spec.json
      const specJson = await window.electronAPI.readSpecJson(context.specPath);
      const currentRound = (specJson as any).documentReview?.currentRound || 1;

      console.log(`[AutoExecutionService] Parsing reply file for round ${currentRound}`);

      // Parse reply file to get fixRequiredCount
      const parseResult = await window.electronAPI.parseReplyFile(context.specPath, currentRound);

      console.log(`[AutoExecutionService] parseReplyFile result: fixRequiredCount=${parseResult.fixRequiredCount}`);

      if (parseResult.fixRequiredCount === 0) {
        // Auto-approve document review
        console.log('[AutoExecutionService] No fixes required, auto-approving document review');
        await window.electronAPI.approveDocumentReview(context.specPath);

        notify.success('ドキュメントレビューが自動承認されました（修正不要）');

        // Check if we should continue to impl phase
        const { autoExecutionPermissions } = workflowStore;
        if (autoExecutionPermissions.impl) {
          console.log('[AutoExecutionService] Continuing to impl phase');
          this.setStatusForSpec(context.specId, 'running');
          this.executePhaseForContext(context, 'impl');
        } else {
          console.log('[AutoExecutionService] impl not permitted, completing auto-execution');
          this.completeAutoExecutionForContext(context);
        }
      } else {
        // Fixes required, pause for user confirmation
        console.log(`[AutoExecutionService] ${parseResult.fixRequiredCount} fixes required, waiting for user confirmation`);
        this.setStatusForSpec(context.specId, 'paused');
        workflowStore.setPendingReviewConfirmation(true);
      }
    } catch (error) {
      console.error('[AutoExecutionService] Error parsing reply file, falling back to pendingReviewConfirmation', error);
      this.setStatusForSpec(context.specId, 'paused');
      workflowStore.setPendingReviewConfirmation(true);
    }
  }

  private handleDocumentReviewFailedForContext(context: ExecutionContext, phase: string, error: string): void {
    console.error(`[AutoExecutionService] ${phase} failed for spec ${context.specId}: ${error}`);

    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
    }

    context.errors.push(error);
    context.executionStatus = 'error';

    this.setStatusForSpec(context.specId, 'error');
    notify.error(`${phase}でエラーが発生しました: ${error}`);

    this.generateSummaryFromContext(context);
  }

  /**
   * Continue to next review round (called by user action)
   */
  continueToNextReviewRound(): void {
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setPendingReviewConfirmation(false);

    // Find the first paused context and continue
    for (const [specId, context] of this.executionContexts) {
      if (context.executionStatus === 'paused') {
        this.setStatusForSpec(specId, 'running');
        this.executeDocumentReviewForContext(context);
        break;
      }
    }
  }

  /**
   * Approve review and continue to impl phase (called by user action)
   */
  async approveReviewAndContinue(): Promise<void> {
    const workflowStore = useWorkflowStore.getState();

    // Find the first paused context
    for (const [specId, context] of this.executionContexts) {
      if (context.executionStatus === 'paused') {
        try {
          await window.electronAPI.approveDocumentReview(context.specPath);
          workflowStore.setPendingReviewConfirmation(false);
          this.setStatusForSpec(specId, 'running');

          // Continue to next phase (impl)
          const nextPhase = this.getNextPermittedPhase('tasks');
          if (nextPhase) {
            this.executePhaseForContext(context, nextPhase);
          } else {
            this.completeAutoExecutionForContext(context);
          }
        } catch (error) {
          notify.error('ドキュメントレビューの承認に失敗しました');
        }
        break;
      }
    }
  }

  // ============================================================
  // Task 5.2: Auto-approve completed phase for ExecutionContext
  // Requirements: 2.5, 4.4
  // ============================================================
  private async autoApproveCompletedPhaseForContext(context: ExecutionContext, phase: WorkflowPhase): Promise<void> {
    // Only requirements, design, tasks phases have approval status
    if (!['requirements', 'design', 'tasks'].includes(phase)) {
      return;
    }

    try {
      console.log(`[AutoExecutionService] Auto-approving completed phase: ${phase} for spec ${context.specId}`);
      await window.electronAPI.updateApproval(
        context.specPath,
        phase as 'requirements' | 'design' | 'tasks',
        true
      );
      // Note: File watcher will automatically trigger specStore.updateSpecJson()
      // No need to manually call selectSpec here
    } catch (error) {
      console.error(`[AutoExecutionService] Failed to auto-approve ${phase}:`, error);
      // Don't fail the execution, just log the error
    }
  }

  // ============================================================
  // Task 6.1: Timeout management for ExecutionContext
  // Requirements: 3.6
  // ============================================================
  private setupTimeoutForContext(context: ExecutionContext, phase: WorkflowPhase): void {
    // Clear any existing timeout
    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
    }

    context.timeoutId = setTimeout(() => {
      console.error(`[AutoExecutionService] Phase ${phase} timed out for spec ${context.specId}`);
      this.handleAgentFailedForContext(context, phase, 'Execution timed out');
    }, DEFAULT_TIMEOUT_MS);
  }

  // ============================================================
  // Auto-approval
  // Requirements: 2.5, 3.2
  // ============================================================
  private async autoApprovePhase(phase: 'requirements' | 'design' | 'tasks'): Promise<boolean> {
    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;

    if (!specDetail) return false;

    try {
      await window.electronAPI.updateApproval(specDetail.metadata.path, phase, true);
      // Note: File watcher will automatically trigger specStore.updateSpecJson()
      // No need to manually call selectSpec here
      return true;
    } catch (error) {
      console.error(`[AutoExecutionService] Failed to auto-approve ${phase}:`, error);
      return false;
    }
  }

  // ============================================================
  // Validation execution for ExecutionContext
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  private async executeValidationIfEnabledForContext(context: ExecutionContext, phase: WorkflowPhase): Promise<void> {
    const { validationOptions } = useWorkflowStore.getState();

    let validationType: ValidationType | null = null;

    // Determine which validation to run based on completed phase
    if (phase === 'requirements' && validationOptions.gap) {
      validationType = 'gap';
    } else if (phase === 'design' && validationOptions.design) {
      validationType = 'design';
    }

    if (validationType) {
      try {
        console.log(`[AutoExecutionService] Executing validation: ${validationType} for spec ${context.specId}`);
        this.setStatusForSpec(context.specId, 'paused');

        await window.electronAPI.executeValidation(
          context.specId,
          validationType,
          context.specId
        );

        // Wait for validation to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        this.setStatusForSpec(context.specId, 'running');
      } catch (error) {
        console.error(`[AutoExecutionService] Validation ${validationType} failed:`, error);
        context.errors.push(`Validation ${validationType} failed`);
      }
    }
  }

  // ============================================================
  // Task 7.1: Complete auto execution for ExecutionContext
  // Requirements: 1.4, 6.1
  // ============================================================
  private completeAutoExecutionForContext(context: ExecutionContext): void {
    console.log(`[AutoExecutionService] Auto execution completed for spec ${context.specId}`);

    context.executionStatus = 'completed';
    this.setStatusForSpec(context.specId, 'completed');

    this.generateSummaryFromContext(context);

    // Show completion notification
    const workflowStore = useWorkflowStore.getState();
    const summary = workflowStore.executionSummary;
    if (summary) {
      notify.showCompletionSummary(summary);
    }

    // Task 6.1: Clean up after a delay
    const specId = context.specId;
    setTimeout(() => {
      this.cleanupCompletedContext(specId);
    }, 2000);
  }

  /**
   * Clean up a completed context
   */
  private cleanupCompletedContext(specId: string): void {
    const context = this.executionContexts.get(specId);
    if (context) {
      disposeExecutionContext(context);
      this.executionContexts.delete(specId);

      // Clean up agentToSpecMap entries
      for (const [agentId, mappedSpecId] of this.agentToSpecMap) {
        if (mappedSpecId === specId) {
          this.agentToSpecMap.delete(agentId);
          this.trackedAgentIds.delete(agentId);
        }
      }
    }

    useSpecStore.getState().stopAutoExecution(specId);

    if (this.currentExecutingSpecId === specId) {
      this.currentExecutingSpecId = null;
    }
  }

  // ============================================================
  // Generate execution summary from ExecutionContext
  // Requirements: 5.4
  // ============================================================
  private generateSummaryFromContext(context: ExecutionContext): void {
    const totalDuration = Date.now() - context.startTime;

    useWorkflowStore.getState().setExecutionSummary({
      executedPhases: [...context.executedPhases],
      executedValidations: [], // TODO: Track validations per context
      totalDuration,
      errors: [...context.errors],
    });
  }

  // ============================================================
  // Task 3.2: Execute phase for ExecutionContext
  // Requirements: 2.1, 2.2, 4.3
  // ============================================================
  private async executePhaseForContext(context: ExecutionContext, phase: WorkflowPhase): Promise<void> {
    console.log(`[AutoExecutionService] Executing phase: ${phase} for spec ${context.specId}`);

    // Validate preconditions using snapshot
    const precondition = await this.validatePreconditions(phase, context.specDetailSnapshot);

    // Bug Fix: Handle auto-approval regardless of precondition.valid
    // When requiresApproval is true, we need to auto-approve the previous phase
    // even if valid is true (valid means "can proceed if we auto-approve")
    if (precondition.requiresApproval) {
      const prevPhase = ALL_WORKFLOW_PHASES[ALL_WORKFLOW_PHASES.indexOf(phase) - 1];
      if (prevPhase && ['requirements', 'design', 'tasks'].includes(prevPhase)) {
        console.log(`[AutoExecutionService] Auto-approving ${prevPhase} before executing ${phase}`);
        const approved = await this.autoApprovePhase(
          prevPhase as 'requirements' | 'design' | 'tasks'
        );
        if (!approved) {
          this.handleAgentFailedForContext(context, phase, `Failed to auto-approve ${prevPhase}`);
          return;
        }
      }
    } else if (!precondition.valid) {
      if (precondition.waitingForAgent) {
        this.setStatusForSpec(context.specId, 'paused');
        return;
      } else {
        this.handleAgentFailedForContext(context, phase, precondition.error || 'Precondition validation failed');
        return;
      }
    }

    // Update current phase
    context.currentPhase = phase;
    this.setPhaseForSpec(context.specId, phase);

    // Setup timeout
    this.setupTimeoutForContext(context, phase);

    try {
      // Execute the phase and get agent info with agentId
      const agentInfo = await window.electronAPI.executePhase(
        context.specId,
        phase,
        context.specId
      );

      // Task 3.2: Register agentId to specId mapping
      if (agentInfo && agentInfo.agentId) {
        console.log(`[AutoExecutionService] executePhase returned agentId=${agentInfo.agentId}, mapping to specId=${context.specId}`);
        this.agentToSpecMap.set(agentInfo.agentId, context.specId);
        context.trackedAgentIds.add(agentInfo.agentId);
        this.trackedAgentIds.add(agentInfo.agentId);

        // Process any buffered events for this agentId
        const bufferedStatus = this.pendingEvents.get(agentInfo.agentId);
        if (bufferedStatus) {
          console.log(`[AutoExecutionService] Processing buffered status=${bufferedStatus} for agentId=${agentInfo.agentId}`);
          this.pendingEvents.delete(agentInfo.agentId);
          this.handleDirectStatusChange(agentInfo.agentId, bufferedStatus);
        }
      } else {
        console.warn('[AutoExecutionService] executePhase did not return agentId', agentInfo);
      }
    } catch (error) {
      this.handleAgentFailedForContext(
        context,
        phase,
        error instanceof Error ? error.message : 'Phase execution failed'
      );
    }
  }
}

// Singleton instance
let autoExecutionServiceInstance: AutoExecutionService | null = null;

/**
 * Get the singleton AutoExecutionService instance.
 *
 * @deprecated This Renderer-based AutoExecutionService will be replaced by
 * Main Process-based AutoExecutionCoordinator. Use useAutoExecution hook
 * for new code, which communicates with Main Process via IPC.
 * See: auto-execution-main-process feature (Task 4.3)
 */
export function getAutoExecutionService(): AutoExecutionService {
  if (!autoExecutionServiceInstance) {
    // Log deprecation warning in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[AutoExecutionService] DEPRECATED: This Renderer-based service will be replaced by ' +
        'Main Process-based AutoExecutionCoordinator. Use useAutoExecution hook for new code.'
      );
    }
    autoExecutionServiceInstance = new AutoExecutionService();
    // E2E debug: Expose service instance for debugging
    if (typeof window !== 'undefined') {
      (window as any).__AUTO_EXECUTION_SERVICE__ = autoExecutionServiceInstance;
    }
  }
  return autoExecutionServiceInstance;
}

/**
 * Dispose the singleton AutoExecutionService instance.
 *
 * @deprecated This Renderer-based AutoExecutionService will be replaced by
 * Main Process-based AutoExecutionCoordinator. Use useAutoExecution hook
 * for new code, which communicates with Main Process via IPC.
 * See: auto-execution-main-process feature (Task 4.3)
 */
export function disposeAutoExecutionService(): void {
  if (autoExecutionServiceInstance) {
    autoExecutionServiceInstance.dispose();
    autoExecutionServiceInstance = null;
  }
}
