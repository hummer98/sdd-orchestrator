/**
 * BugAutoExecutionService
 * Manages auto-execution of bug workflow phases
 * bugs-workflow-auto-execution Task 2
 * Requirements: 1.1-1.6, 4.1-4.5, 5.1-5.5
 */

import { useBugStore } from '../stores/bugStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { notify } from '../stores/notificationStore';
import type { BugWorkflowPhase, BugDetail } from '../types/bug';
import { BUG_PHASE_COMMANDS, BUG_WORKFLOW_PHASES } from '../types/bug';
import type { BugAutoExecutionStatus, BugAutoExecutionState } from '../types/bugAutoExecution';
import { DEFAULT_BUG_AUTO_EXECUTION_STATE } from '../types/bugAutoExecution';

// Maximum retries before requiring manual intervention
const MAX_RETRIES = 3;
// Default timeout for agent execution (10 minutes)
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * BugAutoExecutionService Class
 * Requirements: 1.1, 1.2, 1.4, 4.1-4.5, 5.2, 5.4, 5.5
 */
export class BugAutoExecutionService {
  private unsubscribeIPC: (() => void) | null = null;
  private currentTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private trackedAgentIds: Set<string> = new Set();
  private pendingEvents: Map<string, string> = new Map();

  // Current auto-execution state
  private state: BugAutoExecutionState = { ...DEFAULT_BUG_AUTO_EXECUTION_STATE };

  // Retry counter
  private retryCount = 0;

  // Current executing bug name
  private currentExecutingBugName: string | null = null;

  constructor() {
    this.setupDirectIPCListener();
  }

  /**
   * Setup IPC listener for agent status changes
   * Requirements: 1.1
   */
  private setupDirectIPCListener(): void {
    this.unsubscribeIPC = window.electronAPI.onAgentStatusChange(
      (agentId: string, status: string) => {
        this.handleDirectStatusChange(agentId, status);
      }
    );
  }

  /**
   * Handle agent status change from IPC
   * Requirements: 4.1-4.5
   */
  private handleDirectStatusChange(agentId: string, status: string): void {
    console.log(`[BugAutoExecutionService] handleDirectStatusChange: agentId=${agentId}, status=${status}`);

    // Only process if auto-executing
    if (!this.state.isAutoExecuting) {
      console.log('[BugAutoExecutionService] Not auto-executing, ignoring status change');
      return;
    }

    // Check if this agent is tracked
    if (!this.trackedAgentIds.has(agentId)) {
      console.log(`[BugAutoExecutionService] AgentId ${agentId} not tracked, buffering status=${status}`);
      this.pendingEvents.set(agentId, status);
      return;
    }

    const currentPhase = this.state.currentAutoPhase;
    console.log(`[BugAutoExecutionService] Processing status change: agentId=${agentId}, status=${status}, currentPhase=${currentPhase}`);

    if (status === 'completed') {
      if (currentPhase) {
        this.handleAgentCompleted(currentPhase);
      }
    } else if (status === 'error' || status === 'failed') {
      if (currentPhase) {
        this.handleAgentFailed(currentPhase, 'Agent execution failed');
      }
    }
  }

  /**
   * Handle agent completion
   * Requirements: 4.1-4.5
   */
  private async handleAgentCompleted(completedPhase: BugWorkflowPhase): Promise<void> {
    console.log(`[BugAutoExecutionService] Phase ${completedPhase} completed`);

    this.clearTimeout();

    // Reset retry count on success
    this.retryCount = 0;

    // Refresh bug detail to get latest state
    const bugStore = useBugStore.getState();
    if (bugStore.selectedBug) {
      await bugStore.selectBug(bugStore.selectedBug, { silent: true });
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
  }

  /**
   * Handle agent failure
   * Requirements: 5.4, 5.5
   */
  private handleAgentFailed(phase: BugWorkflowPhase, error: string): void {
    console.error(`[BugAutoExecutionService] Phase ${phase} failed: ${error}`);

    this.clearTimeout();

    this.state = {
      ...this.state,
      autoExecutionStatus: 'error',
      lastFailedPhase: phase,
    };

    notify.error(`フェーズ "${phase}" でエラーが発生しました: ${error}`);
  }

  /**
   * Complete auto execution
   * Requirements: 2.4
   */
  private completeAutoExecution(): void {
    console.log('[BugAutoExecutionService] Auto execution completed');

    this.state = {
      ...this.state,
      autoExecutionStatus: 'completed',
      currentAutoPhase: null,
    };

    notify.success('Bug自動実行が完了しました');

    // Reset after a delay
    setTimeout(() => {
      this.resetState();
    }, 2000);
  }

  /**
   * Reset state to idle
   */
  private resetState(): void {
    this.state = { ...DEFAULT_BUG_AUTO_EXECUTION_STATE };
    this.currentExecutingBugName = null;
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();
  }

  /**
   * Clear timeout
   */
  private clearTimeout(): void {
    if (this.currentTimeoutId) {
      clearTimeout(this.currentTimeoutId);
      this.currentTimeoutId = null;
    }
  }

  /**
   * Setup timeout for phase execution
   */
  private setupTimeout(phase: BugWorkflowPhase): void {
    this.clearTimeout();

    this.currentTimeoutId = setTimeout(() => {
      console.error(`[BugAutoExecutionService] Phase ${phase} timed out`);
      this.handleAgentFailed(phase, 'Execution timed out');
    }, DEFAULT_TIMEOUT_MS);
  }

  /**
   * Execute a phase
   * Requirements: 1.1
   */
  private async executePhase(phase: BugWorkflowPhase): Promise<void> {
    const bugStore = useBugStore.getState();
    const selectedBug = bugStore.selectedBug;

    if (!selectedBug) {
      this.handleAgentFailed(phase, 'No bug selected');
      return;
    }

    console.log(`[BugAutoExecutionService] Executing phase: ${phase}`);

    // Update current phase
    this.state = {
      ...this.state,
      currentAutoPhase: phase,
      autoExecutionStatus: 'running',
    };

    // Setup timeout
    this.setupTimeout(phase);

    try {
      const commandTemplate = BUG_PHASE_COMMANDS[phase];
      if (!commandTemplate) {
        this.handleAgentFailed(phase, `No command for phase ${phase}`);
        return;
      }

      // Build the command
      let fullCommand: string;
      if (phase === 'deploy') {
        // Deploy uses /commit without bug name
        fullCommand = commandTemplate;
      } else {
        // Other phases append bug name
        fullCommand = `${commandTemplate} ${selectedBug.name}`;
      }

      const agentInfo = await window.electronAPI.startAgent(
        `bug:${selectedBug.name}`, // Use bug:{name} format for consistent AgentListPanel filtering
        phase,
        'claude',
        ['-p', fullCommand],
        undefined,
        undefined
      );

      if (agentInfo && agentInfo.agentId) {
        console.log(`[BugAutoExecutionService] executePhase returned agentId=${agentInfo.agentId}`);
        this.trackedAgentIds.add(agentInfo.agentId);

        // Process any buffered events
        const bufferedStatus = this.pendingEvents.get(agentInfo.agentId);
        if (bufferedStatus) {
          console.log(`[BugAutoExecutionService] Processing buffered status=${bufferedStatus}`);
          this.pendingEvents.delete(agentInfo.agentId);
          this.handleDirectStatusChange(agentInfo.agentId, bufferedStatus);
        }
      }
    } catch (error) {
      this.handleAgentFailed(
        phase,
        error instanceof Error ? error.message : 'Phase execution failed'
      );
    }
  }

  /**
   * Cleanup resources
   * Requirements: 1.5
   */
  dispose(): void {
    if (this.unsubscribeIPC) {
      this.unsubscribeIPC();
      this.unsubscribeIPC = null;
    }
    this.clearTimeout();
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();
    this.resetState();
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Get last completed phase from bug detail
   * Requirements: 1.2
   */
  getLastCompletedPhase(bugDetail: BugDetail): BugWorkflowPhase | null {
    // Check in reverse order: verify -> fix -> analyze -> report
    if (bugDetail.artifacts.verification?.exists) return 'verify';
    if (bugDetail.artifacts.fix?.exists) return 'fix';
    if (bugDetail.artifacts.analysis?.exists) return 'analyze';
    if (bugDetail.artifacts.report?.exists) return 'report';
    return null;
  }

  /**
   * Get next permitted phase after current phase
   * Requirements: 2.3
   */
  getNextPermittedPhase(currentPhase: BugWorkflowPhase | null): BugWorkflowPhase | null {
    const { bugAutoExecutionPermissions } = useWorkflowStore.getState();

    // Find starting index
    let startIndex = 0;
    if (currentPhase !== null) {
      const currentIndex = BUG_WORKFLOW_PHASES.indexOf(currentPhase);
      if (currentIndex === -1) return null;
      startIndex = currentIndex + 1;
    }

    // Find next permitted phase (only from auto-executable phases)
    for (let i = startIndex; i < BUG_WORKFLOW_PHASES.length; i++) {
      const phase = BUG_WORKFLOW_PHASES[i];
      // Skip report phase (not auto-executable)
      if (phase === 'report') continue;

      // Check if phase is permitted
      if (bugAutoExecutionPermissions[phase as keyof typeof bugAutoExecutionPermissions]) {
        // Note: deploy is skipped until /kiro:bug-deploy is implemented
        if (phase === 'deploy') {
          console.log('[BugAutoExecutionService] deploy phase skipped (not yet implemented)');
          continue;
        }
        return phase;
      }
    }

    return null;
  }

  /**
   * Start auto execution
   * Requirements: 1.1, 1.2
   */
  start(): boolean {
    const bugStore = useBugStore.getState();
    const selectedBug = bugStore.selectedBug;
    const bugDetail = bugStore.bugDetail;

    // Check if bug is selected
    if (!selectedBug) {
      console.error('[BugAutoExecutionService] No bug selected');
      return false;
    }

    // Check if bug detail is available
    if (!bugDetail) {
      console.error('[BugAutoExecutionService] Bug detail is not available');
      return false;
    }

    // Determine starting phase based on current progress
    const lastCompletedPhase = this.getLastCompletedPhase(bugDetail);
    const firstPhase = this.getNextPermittedPhase(lastCompletedPhase);

    if (!firstPhase) {
      console.error('[BugAutoExecutionService] No permitted phases to execute');
      return false;
    }

    console.log(`[BugAutoExecutionService] Starting from phase: ${firstPhase} (last completed: ${lastCompletedPhase || 'none'})`);

    // Initialize state
    this.state = {
      isAutoExecuting: true,
      currentAutoPhase: firstPhase,
      autoExecutionStatus: 'running',
      lastFailedPhase: null,
      failedRetryCount: 0,
    };
    this.currentExecutingBugName = selectedBug.name;
    this.retryCount = 0;

    // Start execution
    this.executePhase(firstPhase);

    return true;
  }

  /**
   * Stop auto execution
   * Requirements: 1.4
   */
  async stop(): Promise<void> {
    console.log('[BugAutoExecutionService] Stopping auto execution');

    this.clearTimeout();
    this.trackedAgentIds.clear();
    this.pendingEvents.clear();

    this.state = {
      ...DEFAULT_BUG_AUTO_EXECUTION_STATE,
    };
    this.currentExecutingBugName = null;
  }

  /**
   * Retry from a specific phase
   * Requirements: 5.2, 5.4
   */
  retryFrom(phase: BugWorkflowPhase): boolean {
    const bugStore = useBugStore.getState();
    const workflowStore = useWorkflowStore.getState();

    // Check if bug is selected
    if (!bugStore.selectedBug || !bugStore.bugDetail) {
      console.error('[BugAutoExecutionService] No bug selected');
      return false;
    }

    // Check if phase is permitted
    if (!workflowStore.bugAutoExecutionPermissions[phase as keyof typeof workflowStore.bugAutoExecutionPermissions]) {
      console.error(`[BugAutoExecutionService] Phase ${phase} is not permitted`);
      return false;
    }

    // Increment retry count
    this.retryCount++;

    // Check if max retries exceeded
    if (this.retryCount > MAX_RETRIES) {
      console.error('[BugAutoExecutionService] Max retries exceeded');
      notify.error('リトライ上限に達しました。手動での確認が必要です。');
      return false;
    }

    // Update state
    this.state = {
      isAutoExecuting: true,
      currentAutoPhase: phase,
      autoExecutionStatus: 'running',
      lastFailedPhase: null,
      failedRetryCount: this.retryCount,
    };
    this.currentExecutingBugName = bugStore.selectedBug.name;

    // Execute the phase
    this.executePhase(phase);

    return true;
  }

  /**
   * Get current auto execution status
   */
  getStatus(): BugAutoExecutionStatus {
    return this.state.autoExecutionStatus;
  }

  /**
   * Get current executing phase
   */
  getCurrentPhase(): BugWorkflowPhase | null {
    return this.state.currentAutoPhase;
  }

  /**
   * Get current auto execution state (for components)
   */
  getState(): BugAutoExecutionState {
    return { ...this.state };
  }

  /**
   * Get current executing bug name
   */
  getCurrentExecutingBugName(): string | null {
    return this.currentExecutingBugName;
  }

  /**
   * Get retry count
   */
  getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Get last failed phase
   */
  getLastFailedPhase(): BugWorkflowPhase | null {
    return this.state.lastFailedPhase;
  }

  /**
   * Check if auto-executing
   */
  isAutoExecuting(): boolean {
    return this.state.isAutoExecuting;
  }
}

// ============================================================
// Singleton instance management
// ============================================================

let bugAutoExecutionServiceInstance: BugAutoExecutionService | null = null;

export function getBugAutoExecutionService(): BugAutoExecutionService {
  if (!bugAutoExecutionServiceInstance) {
    bugAutoExecutionServiceInstance = new BugAutoExecutionService();
    // Expose for debugging
    if (typeof window !== 'undefined') {
      (window as any).__BUG_AUTO_EXECUTION_SERVICE__ = bugAutoExecutionServiceInstance;
    }
  }
  return bugAutoExecutionServiceInstance;
}

export function disposeBugAutoExecutionService(): void {
  if (bugAutoExecutionServiceInstance) {
    bugAutoExecutionServiceInstance.dispose();
    bugAutoExecutionServiceInstance = null;
  }
}
