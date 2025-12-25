/**
 * AutoExecutionService
 * Manages auto-execution of workflow phases
 * Requirements: 1.1-1.4, 2.1-2.5, 3.1-3.4, 4.1-4.4, 6.3-6.4, 8.1-8.5
 *
 * NOTE: Updated for spec-scoped-auto-execution-state Task 5.1
 * - Now uses specStore.autoExecutionRuntime instead of workflowStore
 * - isAutoExecuting, currentAutoPhase, autoExecutionStatus are now managed by specStore
 */

import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';
import { notify } from '../stores/notificationStore';
import { WORKFLOW_PHASES, type WorkflowPhase, type ValidationType } from '../types/workflow';
import type { ApprovalStatus, SpecAutoExecutionState } from '../types';
import { DEFAULT_SPEC_AUTO_EXECUTION_STATE, createSpecAutoExecutionState } from '../types';

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
// Task 3.1: AutoExecutionService Class
// Requirements: 2.1, 3.4
// ============================================================

export class AutoExecutionService {
  private unsubscribeAgentStore: (() => void) | null = null;
  private executionStartTime: number | null = null;
  private currentTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private executedPhases: WorkflowPhase[] = [];
  private executedValidations: ValidationType[] = [];
  private errors: string[] = [];

  // ============================================================
  // Task 1.1, 2.1: IPC Direct Subscription and AgentId Tracking
  // Requirements: 1.1, 2.1, 2.4
  // ============================================================
  private unsubscribeIPC: (() => void) | null = null;
  private trackedAgentIds: Set<string> = new Set();
  private pendingEvents: Map<string, string> = new Map(); // agentId -> status

  constructor() {
    this.setupDirectIPCListener();
    this.setupAgentListener();
  }

  // ============================================================
  // Task 3.1, 1.2: Cleanup (with IPC subscription cleanup)
  // Requirements: 1.5
  // ============================================================
  dispose(): void {
    if (this.unsubscribeAgentStore) {
      this.unsubscribeAgentStore();
      this.unsubscribeAgentStore = null;
    }
    // Task 1.2: Clean up IPC subscription
    if (this.unsubscribeIPC) {
      this.unsubscribeIPC();
      this.unsubscribeIPC = null;
    }
    this.clearTimeout();
    // Task 2.3: Clear tracked agentIds on dispose
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();
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
      // Refresh spec detail to reflect the updated state
      await specStore.selectSpec(specDetail.metadata);
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
      const currentIndex = WORKFLOW_PHASES.indexOf(currentPhase);
      if (currentIndex === -1) return null;
      startIndex = currentIndex + 1;
    }

    // Find next permitted phase
    for (let i = startIndex; i < WORKFLOW_PHASES.length; i++) {
      const phase = WORKFLOW_PHASES[i];
      if (autoExecutionPermissions[phase]) {
        return phase;
      }
    }

    return null;
  }

  // ============================================================
  // Task 3.3: Precondition validation
  // Requirements: 3.1, 3.4
  // ============================================================
  async validatePreconditions(phase: WorkflowPhase): Promise<PreconditionResult> {
    const specStore = useSpecStore.getState();
    const agentStore = useAgentStore.getState();

    // Check specDetail availability
    if (!specStore.specDetail) {
      return {
        valid: false,
        requiresApproval: false,
        waitingForAgent: false,
        waitingForReview: false,
        missingSpec: true,
        error: 'specDetail is not available',
      };
    }

    const specDetail = specStore.specDetail;

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
    const phaseIndex = WORKFLOW_PHASES.indexOf(phase);
    if (phaseIndex > 0 && phaseIndex < 3) {
      // design or tasks
      const prevPhase = WORKFLOW_PHASES[phaseIndex - 1] as 'requirements' | 'design';
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
  // Task 4.1: Start auto execution
  // Requirements: 1.1, 2.1
  // Bug Fix: Resume from current spec progress instead of starting from beginning
  // ============================================================
  start(): boolean {
    const specStore = useSpecStore.getState();
    const workflowStore = useWorkflowStore.getState();

    // Check if specDetail is available
    if (!specStore.specDetail) {
      console.error('[AutoExecutionService] specDetail is not available');
      return false;
    }

    // Bug Fix: Determine starting phase based on current spec progress
    // Instead of always starting from null (beginning), check which phases are already completed
    const approvals = specStore.specDetail.specJson.approvals;
    const lastCompletedPhase = this.getLastCompletedPhase(approvals);

    // Get next permitted phase after the last completed one
    const firstPhase = this.getNextPermittedPhase(lastCompletedPhase);
    if (!firstPhase) {
      console.error('[AutoExecutionService] No permitted phases to execute');
      return false;
    }

    console.log(`[AutoExecutionService] Starting from phase: ${firstPhase} (last completed: ${lastCompletedPhase || 'none'})`);


    // Reset execution tracking
    this.executionStartTime = Date.now();
    this.executedPhases = [];
    this.executedValidations = [];
    this.errors = [];

    // Update store state - Task 5.1: use specStore for auto execution state
    specStore.startAutoExecution();
    workflowStore.resetFailedRetryCount();
    workflowStore.setLastFailedPhase(null);
    workflowStore.setExecutionSummary(null);

    // Start execution from first phase
    this.executePhase(firstPhase);

    return true;
  }

  // ============================================================
  // Task 4.2: Stop auto execution
  // Requirements: 1.2, 5.2
  // Task 2.3: Clear tracked agentIds on stop
  // Task 5.1: Use specStore for auto execution state
  // ============================================================
  async stop(): Promise<void> {
    const specStore = useSpecStore.getState();

    this.clearTimeout();

    // Task 2.3: Clear tracked agentIds to prevent stale event handling
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();

    // Generate summary if we executed anything
    if (this.executedPhases.length > 0) {
      this.generateSummary();
    }

    // Task 5.1: use specStore for auto execution state
    specStore.stopAutoExecution();
  }

  // ============================================================
  // Task 4.3: Retry from failed phase
  // Requirements: 8.3
  // Task 5.1: Use specStore for auto execution state
  // ============================================================
  retryFrom(fromPhase: WorkflowPhase): boolean {
    const workflowStore = useWorkflowStore.getState();
    const specStore = useSpecStore.getState();

    // Check if specDetail is available
    if (!specStore.specDetail) {
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

    // Reset execution start time for this retry
    if (!this.executionStartTime) {
      this.executionStartTime = Date.now();
    }

    // Start execution - Task 5.1: use specStore for auto execution state
    specStore.startAutoExecution();

    this.executePhase(fromPhase);

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
  // Task 3.1: Direct Status Change Handler
  // Requirements: 1.2, 1.3, 1.4, 2.3, 3.1, 3.2, 3.3
  // Task 5.1: Use specStore for auto execution state
  // ============================================================
  private handleDirectStatusChange(agentId: string, status: string): void {
    console.log(`[AutoExecutionService] handleDirectStatusChange: agentId=${agentId}, status=${status}`);

    // Task 3.4: Only process if auto-executing - Task 5.1: use specStore
    const specStore = useSpecStore.getState();
    if (!specStore.autoExecutionRuntime.isAutoExecuting) {
      console.log('[AutoExecutionService] Not auto-executing, ignoring status change');
      return;
    }

    // Race condition fix: Always buffer events for unknown agentIds
    // They will be processed after executePhase returns with the agentId
    if (!this.trackedAgentIds.has(agentId)) {
      console.log(`[AutoExecutionService] AgentId ${agentId} not tracked, buffering status=${status}`);
      this.pendingEvents.set(agentId, status);
      return;
    }

    const currentPhase = specStore.autoExecutionRuntime.currentAutoPhase;
    console.log(`[AutoExecutionService] Processing status change: agentId=${agentId}, status=${status}, currentPhase=${currentPhase}`);

    // Task 3.1, 3.2: Status-based completion detection (not state-transition based)
    if (status === 'completed') {
      // Get agent info to determine the phase
      const agent = useAgentStore.getState().getAgentById(agentId);
      console.log(`[AutoExecutionService] Completed: agent?.phase=${agent?.phase}, currentPhase=${currentPhase}`);
      if (agent?.phase === 'document-review') {
        this.handleDocumentReviewCompleted();
      } else if (agent?.phase === 'document-review-reply') {
        this.handleDocumentReviewReplyCompleted();
      } else if (currentPhase) {
        // Only proceed with regular phase completion if currentPhase is set
        this.handleAgentCompleted(currentPhase);
      } else {
        console.warn('[AutoExecutionService] No currentPhase set, cannot handle completion');
      }
    } else if (status === 'error' || status === 'failed') {
      // Task 3.3: Error handling
      const agent = useAgentStore.getState().getAgentById(agentId);
      if (agent?.phase === 'document-review' || agent?.phase === 'document-review-reply') {
        this.handleDocumentReviewFailed(agent.phase, 'Agent execution failed');
      } else if (currentPhase) {
        this.handleAgentFailed(currentPhase, 'Agent execution failed');
      }
    }
    // Task 3.4: running, interrupted, hang are ignored (UI update is handled by AgentStore)
  }

  // ============================================================
  // Task 2.1: AgentId Tracking - Public method for testing
  // Requirements: 2.1, 2.3
  // ============================================================
  isTrackedAgent(agentId: string): boolean {
    return this.trackedAgentIds.has(agentId);
  }

  // ============================================================
  // E2E Debug: Expose internal state for debugging
  // ============================================================
  getDebugInfo(): {
    trackedAgentIds: string[];
    pendingEvents: [string, string][];
    ipcListenerRegistered: boolean;
  } {
    return {
      trackedAgentIds: Array.from(this.trackedAgentIds),
      pendingEvents: Array.from(this.pendingEvents.entries()),
      ipcListenerRegistered: !!this.unsubscribeIPC,
    };
  }

  // ============================================================
  // E2E/Test: Reset internal state for test isolation
  // ============================================================
  resetForTest(): void {
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();
    this.executedPhases = [];
    this.executedValidations = [];
    this.errors = [];
    this.executionStartTime = null;
    this.clearTimeout();
    console.log('[AutoExecutionService] State reset for test');
  }

  // ============================================================
  // Task 5.1: Agent state monitoring (DEPRECATED)
  // Requirements: 6.1, 6.3
  // Note: Completion detection has been moved to setupDirectIPCListener
  //       This method is now empty and kept for backward compatibility
  //       The UI updates are handled by AgentStore's onAgentStatusChange
  // ============================================================
  private setupAgentListener(): void {
    // DEPRECATED: Completion detection now uses IPC direct subscription
    // See setupDirectIPCListener() for the new implementation
    // This empty subscription is kept to maintain the unsubscribe pattern
    this.unsubscribeAgentStore = useAgentStore.subscribe(() => {
      // No-op: Completion detection moved to IPC direct subscription
    });
  }

  // ============================================================
  // Task 5.2: Agent completion handling
  // Requirements: 2.3, 6.2
  // ============================================================
  private handleAgentCompleted(completedPhase: WorkflowPhase): void {
    console.log(`[AutoExecutionService] Phase ${completedPhase} completed`);

    this.clearTimeout();
    this.executedPhases.push(completedPhase);

    // Auto-approve the completed phase so next phase doesn't get blocked by prompt checks
    this.autoApproveCompletedPhase(completedPhase).then(() => {
      // Check for validation after this phase
      this.executeValidationIfEnabled(completedPhase).then(() => {
        // Task 7.2: After tasks phase, check if we should execute document review
        if (completedPhase === 'tasks') {
          this.handleTasksCompletedForDocumentReview();
          return;
        }

        // Get next phase
        const nextPhase = this.getNextPermittedPhase(completedPhase);

        if (nextPhase) {
          // Continue to next phase
          this.executePhase(nextPhase);
        } else {
          // All phases completed
          this.completeAutoExecution();
        }
      });
    });
  }

  // ============================================================
  // Task 7.2: Document Review Workflow Integration
  // Requirements: 7.1, 7.2, 7.3
  // ============================================================

  /**
   * Handle tasks phase completion for document review
   * Executes document review if not skipped, otherwise continues to impl
   */
  private async handleTasksCompletedForDocumentReview(): Promise<void> {
    const workflowStore = useWorkflowStore.getState();
    const { documentReviewOptions } = workflowStore;

    // Check if document review should be skipped (autoExecutionFlag === 'skip')
    if (documentReviewOptions.autoExecutionFlag === 'skip') {
      console.log('[AutoExecutionService] Document review skipped');
      // Skip document review, continue to next phase
      const nextPhase = this.getNextPermittedPhase('tasks');
      if (nextPhase) {
        this.executePhase(nextPhase);
      } else {
        this.completeAutoExecution();
      }
      return;
    }

    // Execute document review
    await this.executeDocumentReview();
  }

  /**
   * Execute document review agent
   */
  private async executeDocumentReview(): Promise<void> {
    const specDetail = useSpecStore.getState().specDetail;
    const workflowStore = useWorkflowStore.getState();

    if (!specDetail) {
      this.handleDocumentReviewFailed('document-review', 'specDetail is not available');
      return;
    }

    try {
      console.log('[AutoExecutionService] Executing document review');
      await window.electronAPI.executeDocumentReview(
        specDetail.metadata.name,
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
    } catch (error) {
      this.handleDocumentReviewFailed(
        'document-review',
        error instanceof Error ? error.message : 'Document review execution failed'
      );
    }
  }

  /**
   * Handle document-review agent completion
   * Requirements: 7.2
   */
  private async handleDocumentReviewCompleted(): Promise<void> {
    console.log('[AutoExecutionService] Document review completed');

    this.clearTimeout();

    const workflowStore = useWorkflowStore.getState();
    const specStore = useSpecStore.getState();
    const { documentReviewOptions } = workflowStore;

    // If autoExecutionFlag is 'run', auto-execute document-review-reply
    // If 'pause', wait for user to manually execute reply
    if (documentReviewOptions.autoExecutionFlag === 'run') {
      await this.executeDocumentReviewReply();
    } else {
      // Pause for user to manually execute reply - Task 5.1: use specStore
      specStore.setAutoExecutionStatus('paused');
    }
  }

  /**
   * Execute document-review-reply agent
   * Requirements: auto-execution-document-review-autofix 1.3 - Pass autofix=true in auto-execution mode
   */
  private async executeDocumentReviewReply(): Promise<void> {
    const specDetail = useSpecStore.getState().specDetail;
    const workflowStore = useWorkflowStore.getState();

    if (!specDetail) {
      this.handleDocumentReviewFailed('document-review-reply', 'specDetail is not available');
      return;
    }

    // Get current round number from spec.json
    const specJson = await window.electronAPI.readSpecJson(specDetail.metadata.path);
    const currentRound = (specJson as any).documentReview?.currentRound || 1;

    try {
      console.log(`[AutoExecutionService] Executing document review reply for round ${currentRound}`);
      // In auto-execution mode, always pass autofix=true to enable automatic fixes
      await window.electronAPI.executeDocumentReviewReply(
        specDetail.metadata.name,
        specDetail.metadata.name,
        currentRound,
        workflowStore.commandPrefix,
        true // autofix=true in auto-execution mode (Requirements: auto-execution-document-review-autofix 1.3)
      );
    } catch (error) {
      this.handleDocumentReviewFailed(
        'document-review-reply',
        error instanceof Error ? error.message : 'Document review reply execution failed'
      );
    }
  }

  /**
   * Handle document-review-reply agent completion
   * Requirements: 7.5 - Pause for user confirmation after round completes
   * Requirements: auto-execution-document-review-autofix 2.1, 2.3, 2.4, 2.5, 4.1, 4.3
   *   - Parse reply file to extract fixRequiredCount
   *   - Auto-approve when fixRequiredCount === 0
   *   - Fallback to pendingReviewConfirmation on error or fixRequiredCount > 0
   * Task 5.1: Use specStore for auto execution state
   */
  private async handleDocumentReviewReplyCompleted(): Promise<void> {
    console.log('[AutoExecutionService] Document review reply completed');

    this.clearTimeout();

    const workflowStore = useWorkflowStore.getState();
    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;

    // Fallback to pendingReviewConfirmation if specDetail is not available
    if (!specDetail) {
      console.warn('[AutoExecutionService] specDetail not available, falling back to pendingReviewConfirmation');
      specStore.setAutoExecutionStatus('paused');
      workflowStore.setPendingReviewConfirmation(true);
      return;
    }

    try {
      // Get current round from spec.json
      const specJson = await window.electronAPI.readSpecJson(specDetail.metadata.path);
      const currentRound = (specJson as any).documentReview?.currentRound || 1;

      console.log(`[AutoExecutionService] Parsing reply file for round ${currentRound}`);

      // Parse reply file to get fixRequiredCount
      const parseResult = await window.electronAPI.parseReplyFile(specDetail.metadata.path, currentRound);

      console.log(`[AutoExecutionService] parseReplyFile result: fixRequiredCount=${parseResult.fixRequiredCount}`);

      if (parseResult.fixRequiredCount === 0) {
        // Auto-approve document review
        console.log('[AutoExecutionService] No fixes required, auto-approving document review');
        await window.electronAPI.approveDocumentReview(specDetail.metadata.path);

        notify.success('ドキュメントレビューが自動承認されました（修正不要）');

        // Check if we should continue to impl phase
        const { autoExecutionPermissions } = workflowStore;
        if (autoExecutionPermissions.impl) {
          console.log('[AutoExecutionService] Continuing to impl phase');
          specStore.setAutoExecutionStatus('running');
          this.executePhase('impl');
        } else {
          console.log('[AutoExecutionService] impl not permitted, completing auto-execution');
          this.completeAutoExecution();
        }
      } else {
        // Fixes required, pause for user confirmation
        console.log(`[AutoExecutionService] ${parseResult.fixRequiredCount} fixes required, waiting for user confirmation`);
        specStore.setAutoExecutionStatus('paused');
        workflowStore.setPendingReviewConfirmation(true);
      }
    } catch (error) {
      // Fallback to pendingReviewConfirmation on error
      console.error('[AutoExecutionService] Error parsing reply file, falling back to pendingReviewConfirmation', error);
      specStore.setAutoExecutionStatus('paused');
      workflowStore.setPendingReviewConfirmation(true);
    }
  }

  /**
   * Handle document review failure
   * Task 5.1: Use specStore for auto execution state
   */
  private handleDocumentReviewFailed(phase: string, error: string): void {
    console.error(`[AutoExecutionService] ${phase} failed: ${error}`);

    this.clearTimeout();
    this.errors.push(error);

    const specStore = useSpecStore.getState();

    specStore.setAutoExecutionStatus('error');
    notify.error(`${phase}でエラーが発生しました: ${error}`);

    this.generateSummary();
  }

  /**
   * Continue to next review round (called by user action)
   * Task 5.1: Use specStore for auto execution state
   */
  continueToNextReviewRound(): void {
    const workflowStore = useWorkflowStore.getState();
    const specStore = useSpecStore.getState();
    workflowStore.setPendingReviewConfirmation(false);
    specStore.setAutoExecutionStatus('running');

    this.executeDocumentReview();
  }

  /**
   * Approve review and continue to impl phase (called by user action)
   * Task 5.1: Use specStore for auto execution state
   */
  async approveReviewAndContinue(): Promise<void> {
    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;
    const workflowStore = useWorkflowStore.getState();

    if (!specDetail) return;

    try {
      await window.electronAPI.approveDocumentReview(specDetail.metadata.path);
      workflowStore.setPendingReviewConfirmation(false);
      specStore.setAutoExecutionStatus('running');

      // Continue to next phase (impl)
      const nextPhase = this.getNextPermittedPhase('tasks');
      if (nextPhase) {
        this.executePhase(nextPhase);
      } else {
        this.completeAutoExecution();
      }
    } catch (error) {
      notify.error('ドキュメントレビューの承認に失敗しました');
    }
  }

  // ============================================================
  // Task 5.2.1: Auto-approve completed phase
  // Requirements: 2.5 - Approve phase immediately after successful completion
  // ============================================================
  private async autoApproveCompletedPhase(phase: WorkflowPhase): Promise<void> {
    // Only requirements, design, tasks phases have approval status
    if (!['requirements', 'design', 'tasks'].includes(phase)) {
      return;
    }

    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;

    if (!specDetail) return;

    try {
      console.log(`[AutoExecutionService] Auto-approving completed phase: ${phase}`);
      await window.electronAPI.updateApproval(
        specDetail.metadata.path,
        phase as 'requirements' | 'design' | 'tasks',
        true
      );
      // Refresh spec detail to reflect the updated approval status
      await specStore.selectSpec(specDetail.metadata);
    } catch (error) {
      console.error(`[AutoExecutionService] Failed to auto-approve ${phase}:`, error);
      // Don't fail the execution, just log the error
    }
  }

  // ============================================================
  // Task 9.1: Error handling
  // Requirements: 8.1, 2.4
  // Task 5.1: Use specStore for auto execution state
  // ============================================================
  private handleAgentFailed(phase: WorkflowPhase, error: string): void {
    console.error(`[AutoExecutionService] Phase ${phase} failed: ${error}`);

    this.clearTimeout();
    this.errors.push(error);

    const specStore = useSpecStore.getState();
    const workflowStore = useWorkflowStore.getState();

    specStore.setAutoExecutionStatus('error');
    workflowStore.setLastFailedPhase(phase);

    notify.error(`フェーズ "${phase}" でエラーが発生しました: ${error}`);

    this.generateSummary();
  }

  // ============================================================
  // Task 5.3: Timeout handling
  // Requirements: 6.4
  // ============================================================
  private setupTimeout(phase: WorkflowPhase): void {
    this.clearTimeout();

    this.currentTimeoutId = setTimeout(() => {
      console.error(`[AutoExecutionService] Phase ${phase} timed out`);
      this.handleAgentFailed(phase, 'Execution timed out');
    }, DEFAULT_TIMEOUT_MS);
  }

  private clearTimeout(): void {
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId);
      this.currentTimeoutId = null;
    }
  }

  // ============================================================
  // Task 6.1: Auto-approval
  // Requirements: 2.5, 3.2
  // ============================================================
  private async autoApprovePhase(phase: 'requirements' | 'design' | 'tasks'): Promise<boolean> {
    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;

    if (!specDetail) return false;

    try {
      await window.electronAPI.updateApproval(specDetail.metadata.path, phase, true);
      // Refresh spec detail
      await specStore.selectSpec(specDetail.metadata);
      return true;
    } catch (error) {
      console.error(`[AutoExecutionService] Failed to auto-approve ${phase}:`, error);
      return false;
    }
  }

  // ============================================================
  // Task 7.1: Validation execution
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  private async executeValidationIfEnabled(phase: WorkflowPhase): Promise<void> {
    const { validationOptions } = useWorkflowStore.getState();
    const specDetail = useSpecStore.getState().specDetail;

    if (!specDetail) return;

    let validationType: ValidationType | null = null;

    // Determine which validation to run based on completed phase
    // Note: validate-impl is executed as inspection phase, not as validation option
    if (phase === 'requirements' && validationOptions.gap) {
      validationType = 'gap';
    } else if (phase === 'design' && validationOptions.design) {
      validationType = 'design';
    }

    if (validationType) {
      try {
        console.log(`[AutoExecutionService] Executing validation: ${validationType}`);
        // Task 5.1: use specStore for auto execution state
        useSpecStore.getState().setAutoExecutionStatus('paused');

        await window.electronAPI.executeValidation(
          specDetail.metadata.name,
          validationType,
          specDetail.metadata.name
        );

        this.executedValidations.push(validationType);

        // Wait for validation to complete (simplified - in real implementation we'd listen for agent completion)
        // For now, we'll continue after a short delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Task 5.1: use specStore for auto execution state
        useSpecStore.getState().setAutoExecutionStatus('running');
      } catch (error) {
        console.error(`[AutoExecutionService] Validation ${validationType} failed:`, error);
        this.errors.push(`Validation ${validationType} failed`);
        // Note: We don't stop on validation failure in this implementation
        // Task 7.2 would add more sophisticated handling
      }
    }
  }

  // ============================================================
  // Task 8.1: Complete auto execution
  // Requirements: 1.4
  // Task 5.1: Use specStore for auto execution state
  // ============================================================
  private completeAutoExecution(): void {
    console.log('[AutoExecutionService] Auto execution completed');

    const specStore = useSpecStore.getState();
    const workflowStore = useWorkflowStore.getState();

    specStore.setAutoExecutionStatus('completed');

    this.generateSummary();

    // Show completion notification
    const summary = workflowStore.executionSummary;
    if (summary) {
      notify.showCompletionSummary(summary);
    }

    // Reset after a delay
    setTimeout(() => {
      useSpecStore.getState().stopAutoExecution();
    }, 2000);
  }

  // ============================================================
  // Task 8.2: Generate execution summary
  // Requirements: 5.4
  // ============================================================
  private generateSummary(): void {
    const totalDuration = this.executionStartTime
      ? Date.now() - this.executionStartTime
      : 0;

    useWorkflowStore.getState().setExecutionSummary({
      executedPhases: [...this.executedPhases],
      executedValidations: [...this.executedValidations],
      totalDuration,
      errors: [...this.errors],
    });
  }

  // ============================================================
  // Private: Execute a phase
  // Task 2.2, 4.3: AgentId tracking and race condition prevention
  // Requirements: 2.1, 4.3
  // Task 5.1: Use specStore for auto execution state
  // ============================================================
  private async executePhase(phase: WorkflowPhase): Promise<void> {
    const specStore = useSpecStore.getState();
    const specDetail = specStore.specDetail;

    if (!specDetail) {
      this.handleAgentFailed(phase, 'specDetail is not available');
      return;
    }

    console.log(`[AutoExecutionService] Executing phase: ${phase}`);

    // Validate preconditions
    const precondition = await this.validatePreconditions(phase);

    if (!precondition.valid) {
      if (precondition.requiresApproval) {
        // Try auto-approval
        const prevPhase = WORKFLOW_PHASES[WORKFLOW_PHASES.indexOf(phase) - 1];
        if (prevPhase && ['requirements', 'design', 'tasks'].includes(prevPhase)) {
          const approved = await this.autoApprovePhase(
            prevPhase as 'requirements' | 'design' | 'tasks'
          );
          if (!approved) {
            this.handleAgentFailed(phase, `Failed to auto-approve ${prevPhase}`);
            return;
          }
        }
      } else if (precondition.waitingForAgent) {
        // Wait for agent to complete - Task 5.1: use specStore
        specStore.setAutoExecutionStatus('paused');
        return;
      } else {
        this.handleAgentFailed(phase, precondition.error || 'Precondition validation failed');
        return;
      }
    }

    // Update current phase - Task 5.1: use specStore
    specStore.setAutoExecutionPhase(phase);

    // Setup timeout
    this.setupTimeout(phase);

    try {
      // Execute the phase and get agent info with agentId
      const agentInfo = await window.electronAPI.executePhase(
        specDetail.metadata.name,
        phase,
        specDetail.metadata.name
      );

      // Task 2.2: Add agentId to tracked set immediately after getting the response
      if (agentInfo && agentInfo.agentId) {
        console.log(`[AutoExecutionService] executePhase returned agentId=${agentInfo.agentId}, adding to trackedAgentIds`);
        this.trackedAgentIds.add(agentInfo.agentId);

        // Race condition fix: Process any buffered events for this agentId
        // Events may have arrived before we knew the agentId
        const bufferedStatus = this.pendingEvents.get(agentInfo.agentId);
        console.log(`[AutoExecutionService] Checking pendingEvents for ${agentInfo.agentId}: bufferedStatus=${bufferedStatus}`);
        if (bufferedStatus) {
          console.log(`[AutoExecutionService] Processing buffered status=${bufferedStatus} for agentId=${agentInfo.agentId}`);
          this.pendingEvents.delete(agentInfo.agentId);
          // Process immediately since trackedAgentIds now contains this agentId
          this.handleDirectStatusChange(agentInfo.agentId, bufferedStatus);
        }
      } else {
        console.warn('[AutoExecutionService] executePhase did not return agentId', agentInfo);
      }
    } catch (error) {
      this.handleAgentFailed(
        phase,
        error instanceof Error ? error.message : 'Phase execution failed'
      );
    }
  }
}

// Singleton instance
let autoExecutionServiceInstance: AutoExecutionService | null = null;

export function getAutoExecutionService(): AutoExecutionService {
  if (!autoExecutionServiceInstance) {
    autoExecutionServiceInstance = new AutoExecutionService();
    // E2E debug: Expose service instance for debugging
    if (typeof window !== 'undefined') {
      (window as any).__AUTO_EXECUTION_SERVICE__ = autoExecutionServiceInstance;
    }
  }
  return autoExecutionServiceInstance;
}

export function disposeAutoExecutionService(): void {
  if (autoExecutionServiceInstance) {
    autoExecutionServiceInstance.dispose();
    autoExecutionServiceInstance = null;
  }
}
