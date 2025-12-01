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

// ============================================================
// Task 3.1: Service Types
// Requirements: 3.1, 3.4
// ============================================================

export interface PreconditionResult {
  readonly valid: boolean;
  readonly requiresApproval: boolean;
  readonly waitingForAgent: boolean;
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
    if (!specStore.specDetail || !specStore.specDetail.specJson) {
      return {
        valid: false,
        requiresApproval: false,
        waitingForAgent: false,
        missingSpec: true,
        error: 'specDetail or specJson is not available',
      };
    }

    const specDetail = specStore.specDetail;
    const specJson = specDetail.specJson;

    // Check for running agents on this spec
    const specAgents = agentStore.getAgentsForSpec(specDetail.metadata.name);
    const hasRunningAgent = specAgents.some((agent) => agent.status === 'running');

    if (hasRunningAgent) {
      return {
        valid: false,
        requiresApproval: false,
        waitingForAgent: true,
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
          missingSpec: false,
          error: prevApproval.generated ? null : `${prevPhase} is not generated yet`,
        };
      }
    }

    // For impl phase, check tasks approval
    if (phase === 'impl') {
      const tasksApproval = specJson.approvals.tasks;
      if (!tasksApproval.approved) {
        return {
          valid: tasksApproval.generated,
          requiresApproval: tasksApproval.generated,
          waitingForAgent: false,
          missingSpec: false,
          error: tasksApproval.generated ? null : 'tasks is not generated yet',
        };
      }
    }

    return {
      valid: true,
      requiresApproval: false,
      waitingForAgent: false,
      missingSpec: false,
      error: null,
    };
  }

  // ============================================================
  // Task 4.1: Start auto execution
  // Requirements: 1.1, 2.1
  // ============================================================
  start(): boolean {
    const specStore = useSpecStore.getState();
    const workflowStore = useWorkflowStore.getState();

    // Check if specDetail is available
    if (!specStore.specDetail) {
      console.error('[AutoExecutionService] specDetail is not available');
      return false;
    }

    // Get first permitted phase
    const firstPhase = this.getNextPermittedPhase(null);
    if (!firstPhase) {
      console.error('[AutoExecutionService] No permitted phases to execute');
      return false;
    }

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
      if (!currentPhase) return;

      // Get agents for current spec
      const currentAgents = state.agents.get(specDetail.metadata.name) || [];
      const prevAgents = prevState.agents.get(specDetail.metadata.name) || [];

      // Find agent status changes
      for (const agent of currentAgents) {
        const prevAgent = prevAgents.find((a) => a.agentId === agent.agentId);

        // Check if agent just completed
        if (prevAgent?.status === 'running' && agent.status === 'completed') {
          this.handleAgentCompleted(currentPhase);
        }

        // Check if agent failed
        if (prevAgent?.status === 'running' && agent.status === 'failed') {
          this.handleAgentFailed(currentPhase, 'Agent execution failed');
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

    // Check for validation after this phase
    this.executeValidationIfEnabled(completedPhase).then(() => {
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
