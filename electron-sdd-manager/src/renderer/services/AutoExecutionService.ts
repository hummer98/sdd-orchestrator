/**
 * AutoExecutionService
 * Manages auto-execution of workflow phases
 * Requirements: 1.1-1.4, 2.1-2.5, 3.1-3.4, 4.1-4.4, 6.3-6.4, 8.1-8.5
 */

import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';
import { notify } from '../stores/notificationStore';
import { WORKFLOW_PHASES, type WorkflowPhase, type ValidationType } from '../types/workflow';
import type { ApprovalStatus } from '../types';

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

  constructor() {
    this.setupAgentListener();
  }

  // ============================================================
  // Task 3.1: Cleanup
  // ============================================================
  dispose(): void {
    if (this.unsubscribeAgentStore) {
      this.unsubscribeAgentStore();
      this.unsubscribeAgentStore = null;
    }
    this.clearTimeout();
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

    // Update store state
    workflowStore.startAutoExecution();
    workflowStore.setAutoExecutionStatus('running');
    workflowStore.resetFailedRetryCount();
    workflowStore.setLastFailedPhase(null);
    workflowStore.setExecutionSummary(null);

    // Start execution from first phase
    this.executePhase(firstPhase);

    return true;
  }

  // ============================================================
  // Task 4.2: Stop auto execution
  // Requirements: 1.2
  // ============================================================
  async stop(): Promise<void> {
    const workflowStore = useWorkflowStore.getState();

    this.clearTimeout();

    // Generate summary if we executed anything
    if (this.executedPhases.length > 0) {
      this.generateSummary();
    }

    workflowStore.stopAutoExecution();
    workflowStore.setAutoExecutionStatus('idle');
    workflowStore.setCurrentAutoPhase(null);
  }

  // ============================================================
  // Task 4.3: Retry from failed phase
  // Requirements: 8.3
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

    // Start execution
    workflowStore.startAutoExecution();
    workflowStore.setAutoExecutionStatus('running');

    this.executePhase(fromPhase);

    return true;
  }

  // ============================================================
  // Task 5.1: Agent state monitoring
  // Requirements: 6.1, 6.3
  // ============================================================
  private setupAgentListener(): void {
    // Subscribe to agent store changes
    this.unsubscribeAgentStore = useAgentStore.subscribe((state, prevState) => {
      // Only process if auto-executing
      if (!useWorkflowStore.getState().isAutoExecuting) return;

      const specDetail = useSpecStore.getState().specDetail;
      if (!specDetail) return;

      const currentPhase = useWorkflowStore.getState().currentAutoPhase;

      // Get agents for current spec
      const currentAgents = state.agents.get(specDetail.metadata.name) || [];
      const prevAgents = prevState.agents.get(specDetail.metadata.name) || [];

      // Find agent status changes
      for (const agent of currentAgents) {
        const prevAgent = prevAgents.find((a) => a.agentId === agent.agentId);

        // Check if agent just completed
        if (prevAgent?.status === 'running' && agent.status === 'completed') {
          // Task 7.2: Handle document review agent completion
          if (agent.phase === 'document-review') {
            this.handleDocumentReviewCompleted();
          } else if (agent.phase === 'document-review-reply') {
            this.handleDocumentReviewReplyCompleted();
          } else if (currentPhase) {
            this.handleAgentCompleted(currentPhase);
          }
        }

        // Check if agent failed
        if (prevAgent?.status === 'running' && agent.status === 'failed') {
          if (agent.phase === 'document-review' || agent.phase === 'document-review-reply') {
            this.handleDocumentReviewFailed(agent.phase, 'Agent execution failed');
          } else if (currentPhase) {
            this.handleAgentFailed(currentPhase, 'Agent execution failed');
          }
        }
      }
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
    const { documentReviewOptions } = workflowStore;

    // If autoExecutionFlag is 'run', auto-execute document-review-reply
    // If 'pause', wait for user to manually execute reply
    if (documentReviewOptions.autoExecutionFlag === 'run') {
      await this.executeDocumentReviewReply();
    } else {
      // Pause for user to manually execute reply
      workflowStore.setAutoExecutionStatus('paused');
    }
  }

  /**
   * Execute document-review-reply agent
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
      await window.electronAPI.executeDocumentReviewReply(
        specDetail.metadata.name,
        specDetail.metadata.name,
        currentRound,
        workflowStore.commandPrefix
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
   */
  private handleDocumentReviewReplyCompleted(): void {
    console.log('[AutoExecutionService] Document review reply completed');

    this.clearTimeout();

    const workflowStore = useWorkflowStore.getState();

    // Task 7.3: Pause for user confirmation
    workflowStore.setAutoExecutionStatus('paused');
    workflowStore.setPendingReviewConfirmation(true);
  }

  /**
   * Handle document review failure
   */
  private handleDocumentReviewFailed(phase: string, error: string): void {
    console.error(`[AutoExecutionService] ${phase} failed: ${error}`);

    this.clearTimeout();
    this.errors.push(error);

    const workflowStore = useWorkflowStore.getState();

    workflowStore.setAutoExecutionStatus('error');
    notify.error(`${phase}でエラーが発生しました: ${error}`);

    this.generateSummary();
  }

  /**
   * Continue to next review round (called by user action)
   */
  continueToNextReviewRound(): void {
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setPendingReviewConfirmation(false);
    workflowStore.setAutoExecutionStatus('running');

    this.executeDocumentReview();
  }

  /**
   * Approve review and continue to impl phase (called by user action)
   */
  async approveReviewAndContinue(): Promise<void> {
    const specDetail = useSpecStore.getState().specDetail;
    const workflowStore = useWorkflowStore.getState();

    if (!specDetail) return;

    try {
      await window.electronAPI.approveDocumentReview(specDetail.metadata.path);
      workflowStore.setPendingReviewConfirmation(false);
      workflowStore.setAutoExecutionStatus('running');

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
  // ============================================================
  private handleAgentFailed(phase: WorkflowPhase, error: string): void {
    console.error(`[AutoExecutionService] Phase ${phase} failed: ${error}`);

    this.clearTimeout();
    this.errors.push(error);

    const workflowStore = useWorkflowStore.getState();

    workflowStore.setAutoExecutionStatus('error');
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
    if (phase === 'requirements' && validationOptions.gap) {
      validationType = 'gap';
    } else if (phase === 'design' && validationOptions.design) {
      validationType = 'design';
    } else if (phase === 'impl' && validationOptions.impl) {
      validationType = 'impl';
    }

    if (validationType) {
      try {
        console.log(`[AutoExecutionService] Executing validation: ${validationType}`);
        useWorkflowStore.getState().setAutoExecutionStatus('paused');

        await window.electronAPI.executeValidation(
          specDetail.metadata.name,
          validationType,
          specDetail.metadata.name
        );

        this.executedValidations.push(validationType);

        // Wait for validation to complete (simplified - in real implementation we'd listen for agent completion)
        // For now, we'll continue after a short delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        useWorkflowStore.getState().setAutoExecutionStatus('running');
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
  // ============================================================
  private completeAutoExecution(): void {
    console.log('[AutoExecutionService] Auto execution completed');

    const workflowStore = useWorkflowStore.getState();

    workflowStore.setAutoExecutionStatus('completed');

    this.generateSummary();

    // Show completion notification
    const summary = workflowStore.executionSummary;
    if (summary) {
      notify.showCompletionSummary(summary);
    }

    // Reset after a delay
    setTimeout(() => {
      workflowStore.stopAutoExecution();
      workflowStore.setAutoExecutionStatus('idle');
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
  // ============================================================
  private async executePhase(phase: WorkflowPhase): Promise<void> {
    const workflowStore = useWorkflowStore.getState();
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
        // Wait for agent to complete
        workflowStore.setAutoExecutionStatus('paused');
        return;
      } else {
        this.handleAgentFailed(phase, precondition.error || 'Precondition validation failed');
        return;
      }
    }

    // Update current phase
    workflowStore.setCurrentAutoPhase(phase);

    // Setup timeout
    this.setupTimeout(phase);

    try {
      // Execute the phase
      await window.electronAPI.executePhase(
        specDetail.metadata.name,
        phase,
        specDetail.metadata.name
      );
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
  }
  return autoExecutionServiceInstance;
}

export function disposeAutoExecutionService(): void {
  if (autoExecutionServiceInstance) {
    autoExecutionServiceInstance.dispose();
    autoExecutionServiceInstance = null;
  }
}
