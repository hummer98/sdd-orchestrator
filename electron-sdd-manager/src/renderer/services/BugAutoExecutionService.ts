/**
 * BugAutoExecutionService
 * IPC client for bug auto-execution via Main Process BugAutoExecutionCoordinator
 * bugs-workflow-auto-execution Task 2
 * Bug fix: bug-auto-execution-ipc-migration
 *
 * Architecture:
 * - Main Process: BugAutoExecutionCoordinator (SSoT for state)
 * - Renderer Process: BugAutoExecutionService (IPC client)
 *
 * Requirements: 1.1-1.6, 4.1-4.5, 5.1-5.5
 */

import { useBugStore } from '../stores/bugStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useProjectStore } from '../stores/projectStore';
import { notify } from '../stores/notificationStore';
import type { BugWorkflowPhase, BugDetail } from '../types/bug';
import { BUG_WORKFLOW_PHASES } from '../types/bug';
import type { BugAutoExecutionStatus, BugAutoExecutionState } from '../types/bugAutoExecution';
import { DEFAULT_BUG_AUTO_EXECUTION_STATE } from '../types/bugAutoExecution';
import type { BugAutoExecutionError } from '../types/electron';

// Default timeout for agent execution (10 minutes)
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

// ============================================================
// Types for IPC communication
// ============================================================

/**
 * Permissions for bug auto-execution phases
 */
interface BugAutoExecutionPermissions {
  analyze: boolean;
  fix: boolean;
  verify: boolean;
  deploy: boolean;
}

/**
 * State received from Main Process
 */
interface MainProcessState {
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
 * BugAutoExecutionService Class
 * IPC client that delegates state management to Main Process
 * Requirements: 1.1, 1.2, 1.4, 4.1-4.5, 5.2, 5.4, 5.5
 */
export class BugAutoExecutionService {
  // IPC event listener cleanup functions
  private cleanupFunctions: (() => void)[] = [];

  // Local cache of state (populated from Main Process events)
  private cachedState: BugAutoExecutionState = { ...DEFAULT_BUG_AUTO_EXECUTION_STATE };

  // Current bug path being tracked
  private currentBugPath: string | null = null;

  constructor() {
    this.setupIPCListeners();
  }

  /**
   * Setup IPC event listeners for Main Process notifications
   * Requirements: 1.1
   */
  private setupIPCListeners(): void {
    // Status changed
    const cleanupStatusChanged = window.electronAPI.onBugAutoExecutionStatusChanged(
      (data: { bugPath: string; state: MainProcessState }) => {
        this.handleStatusChanged(data.bugPath, data.state);
      }
    );
    this.cleanupFunctions.push(cleanupStatusChanged);

    // Phase completed
    const cleanupPhaseCompleted = window.electronAPI.onBugAutoExecutionPhaseCompleted(
      (data: { bugPath: string; phase: string }) => {
        this.handlePhaseCompleted(data.bugPath, data.phase as BugWorkflowPhase);
      }
    );
    this.cleanupFunctions.push(cleanupPhaseCompleted);

    // Execution completed
    const cleanupCompleted = window.electronAPI.onBugAutoExecutionCompleted(
      (data: { bugPath: string }) => {
        this.handleExecutionCompleted(data.bugPath);
      }
    );
    this.cleanupFunctions.push(cleanupCompleted);

    // Error
    const cleanupError = window.electronAPI.onBugAutoExecutionError(
      (data) => {
        this.handleError(data.bugPath, data.error);
      }
    );
    this.cleanupFunctions.push(cleanupError);

    // Execute phase (Main Process requests Renderer to execute agent)
    const cleanupExecutePhase = window.electronAPI.onBugAutoExecutionExecutePhase(
      (data: { bugPath: string; phase: string; bugName: string }) => {
        this.handleExecutePhase(data.bugPath, data.phase as BugWorkflowPhase, data.bugName);
      }
    );
    this.cleanupFunctions.push(cleanupExecutePhase);
  }

  /**
   * Handle status changed event from Main Process
   */
  private handleStatusChanged(bugPath: string, state: MainProcessState): void {
    console.log('[BugAutoExecutionService] Status changed from Main Process', { bugPath, status: state.status });

    if (bugPath !== this.currentBugPath) {
      return;
    }

    // Update cached state
    this.cachedState = {
      isAutoExecuting: state.status === 'running',
      currentAutoPhase: state.currentPhase as BugWorkflowPhase | null,
      autoExecutionStatus: state.status as BugAutoExecutionStatus,
      lastFailedPhase: state.lastFailedPhase as BugWorkflowPhase | null,
      failedRetryCount: state.retryCount,
    };
  }

  /**
   * Handle phase completed event from Main Process
   */
  private handlePhaseCompleted(bugPath: string, phase: BugWorkflowPhase): void {
    console.log(`[BugAutoExecutionService] Phase ${phase} completed`, { bugPath });

    if (bugPath !== this.currentBugPath) {
      return;
    }

    // Refresh bug detail to get latest state
    const bugStore = useBugStore.getState();
    if (bugStore.selectedBug) {
      bugStore.selectBug(bugStore.selectedBug, { silent: true });
    }
  }

  /**
   * Handle execution completed event from Main Process
   */
  private handleExecutionCompleted(bugPath: string): void {
    console.log('[BugAutoExecutionService] Execution completed', { bugPath });

    if (bugPath !== this.currentBugPath) {
      return;
    }

    notify.success('Bug自動実行が完了しました');

    // Reset state after delay
    setTimeout(() => {
      this.resetLocalState();
    }, 2000);
  }

  /**
   * Handle error event from Main Process
   */
  private handleError(bugPath: string, error: BugAutoExecutionError): void {
    console.error('[BugAutoExecutionService] Error from Main Process', { bugPath, error });

    if (bugPath !== this.currentBugPath) {
      return;
    }

    // Extract phase from error if present
    const phase = 'phase' in error ? error.phase : null;
    // Extract message from error if present
    const message = 'message' in error ? error.message : null;

    const errorMessage = phase
      ? `フェーズ "${phase}" でエラーが発生しました: ${message || error.type}`
      : `エラーが発生しました: ${message || error.type}`;
    notify.error(errorMessage);
  }

  /**
   * Handle execute phase event from Main Process
   * Main Process requests Renderer to execute agent for a phase
   */
  private async handleExecutePhase(bugPath: string, phase: BugWorkflowPhase, bugName: string): Promise<void> {
    console.log(`[BugAutoExecutionService] Execute phase requested by Main Process`, { bugPath, phase, bugName, currentBugPath: this.currentBugPath });

    if (bugPath !== this.currentBugPath) {
      console.warn(`[BugAutoExecutionService] Skipping execute phase - bugPath mismatch`, { bugPath, currentBugPath: this.currentBugPath });
      return;
    }

    try {
      const { BUG_PHASE_COMMANDS } = await import('../types/bug');
      const commandTemplate = BUG_PHASE_COMMANDS[phase];
      if (!commandTemplate) {
        console.error(`[BugAutoExecutionService] No command for phase ${phase}`);
        return;
      }

      const fullCommand = `${commandTemplate} ${bugName}`;

      // Execute agent
      const agentInfo = await window.electronAPI.startAgent(
        `bug:${bugName}`,
        phase,
        'claude',
        [fullCommand],
        undefined,
        undefined
      );

      console.log(`[BugAutoExecutionService] Agent started`, { agentId: agentInfo?.agentId, phase });
    } catch (error) {
      console.error(`[BugAutoExecutionService] Failed to execute phase ${phase}`, error);
    }
  }

  /**
   * Reset local state
   */
  private resetLocalState(): void {
    this.cachedState = { ...DEFAULT_BUG_AUTO_EXECUTION_STATE };
    this.currentBugPath = null;
  }

  /**
   * Cleanup resources
   * Requirements: 1.5
   */
  dispose(): void {
    for (const cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.cleanupFunctions = [];
    this.resetLocalState();
  }

  // ============================================================
  // Public API - Delegates to Main Process via IPC
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
        return phase;
      }
    }

    return null;
  }

  /**
   * Start auto execution via IPC to Main Process
   * Requirements: 1.1, 1.2
   */
  async start(): Promise<boolean> {
    const bugStore = useBugStore.getState();
    const workflowStore = useWorkflowStore.getState();
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

    console.log(`[BugAutoExecutionService] Starting via IPC from phase: ${firstPhase} (last completed: ${lastCompletedPhase || 'none'})`);

    // Build permissions object for Main Process
    const permissions: BugAutoExecutionPermissions = {
      analyze: workflowStore.bugAutoExecutionPermissions.analyze,
      fix: workflowStore.bugAutoExecutionPermissions.fix,
      verify: workflowStore.bugAutoExecutionPermissions.verify,
      deploy: workflowStore.bugAutoExecutionPermissions.deploy,
    };

    // Build bug path
    const projectStore = useProjectStore.getState();
    const projectPath = projectStore.currentProject || '';
    const bugPath = `${projectPath}/.kiro/bugs/${selectedBug.name}`;

    // Track this bug
    this.currentBugPath = bugPath;

    try {
      // Call Main Process to start auto-execution
      const result = await window.electronAPI.bugAutoExecutionStart({
        bugPath,
        bugName: selectedBug.name,
        options: {
          permissions,
          timeoutMs: DEFAULT_TIMEOUT_MS,
        },
        lastCompletedPhase,
      });

      if (!result.ok) {
        console.error('[BugAutoExecutionService] Failed to start auto-execution', result.error);
        this.currentBugPath = null;
        return false;
      }

      // Update cached state from result
      this.cachedState = {
        isAutoExecuting: result.value.status === 'running',
        currentAutoPhase: result.value.currentPhase as BugWorkflowPhase | null,
        autoExecutionStatus: result.value.status as BugAutoExecutionStatus,
        lastFailedPhase: result.value.lastFailedPhase as BugWorkflowPhase | null,
        failedRetryCount: result.value.retryCount,
      };

      return true;
    } catch (error) {
      console.error('[BugAutoExecutionService] IPC error', error);
      this.currentBugPath = null;
      return false;
    }
  }

  /**
   * Stop auto execution via IPC to Main Process
   * Requirements: 1.4
   */
  async stop(): Promise<void> {
    if (!this.currentBugPath) {
      console.log('[BugAutoExecutionService] No active execution to stop');
      return;
    }

    console.log('[BugAutoExecutionService] Stopping via IPC');

    try {
      const result = await window.electronAPI.bugAutoExecutionStop({
        bugPath: this.currentBugPath,
      });

      if (!result.ok) {
        console.error('[BugAutoExecutionService] Failed to stop auto-execution', result.error);
      }
    } catch (error) {
      console.error('[BugAutoExecutionService] IPC error during stop', error);
    }

    // Reset local state regardless of result
    this.resetLocalState();
  }

  /**
   * Retry from a specific phase via IPC to Main Process
   * Requirements: 5.2, 5.4
   */
  async retryFrom(phase: BugWorkflowPhase): Promise<boolean> {
    if (!this.currentBugPath) {
      const bugStore = useBugStore.getState();
      if (!bugStore.selectedBug) {
        console.error('[BugAutoExecutionService] No bug selected');
        return false;
      }
      const projectStore = useProjectStore.getState();
      const projectPath = projectStore.currentProject || '';
      this.currentBugPath = `${projectPath}/.kiro/bugs/${bugStore.selectedBug.name}`;
    }

    console.log(`[BugAutoExecutionService] Retrying from phase ${phase} via IPC`);

    try {
      const result = await window.electronAPI.bugAutoExecutionRetryFrom({
        bugPath: this.currentBugPath,
        phase,
      });

      if (!result.ok) {
        console.error('[BugAutoExecutionService] Failed to retry', result.error);
        if (result.error.type === 'MAX_RETRIES_EXCEEDED') {
          notify.error('リトライ上限に達しました。手動での確認が必要です。');
        }
        return false;
      }

      // Update cached state from result
      this.cachedState = {
        isAutoExecuting: result.value.status === 'running',
        currentAutoPhase: result.value.currentPhase as BugWorkflowPhase | null,
        autoExecutionStatus: result.value.status as BugAutoExecutionStatus,
        lastFailedPhase: result.value.lastFailedPhase as BugWorkflowPhase | null,
        failedRetryCount: result.value.retryCount,
      };

      return true;
    } catch (error) {
      console.error('[BugAutoExecutionService] IPC error during retry', error);
      return false;
    }
  }

  /**
   * Get current auto execution status
   */
  getStatus(): BugAutoExecutionStatus {
    return this.cachedState.autoExecutionStatus;
  }

  /**
   * Get current executing phase
   */
  getCurrentPhase(): BugWorkflowPhase | null {
    return this.cachedState.currentAutoPhase;
  }

  /**
   * Get current auto execution state (for components)
   */
  getState(): BugAutoExecutionState {
    return { ...this.cachedState };
  }

  /**
   * Get current executing bug name
   */
  getCurrentExecutingBugName(): string | null {
    if (!this.currentBugPath) return null;
    // Extract bug name from path: .kiro/bugs/{bugName}
    const match = this.currentBugPath.match(/\.kiro\/bugs\/([^/]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Get retry count
   */
  getRetryCount(): number {
    return this.cachedState.failedRetryCount;
  }

  /**
   * Get last failed phase
   */
  getLastFailedPhase(): BugWorkflowPhase | null {
    return this.cachedState.lastFailedPhase;
  }

  /**
   * Check if auto-executing
   */
  isAutoExecuting(): boolean {
    return this.cachedState.isAutoExecuting;
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
