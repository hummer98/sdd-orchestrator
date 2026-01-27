/**
 * RecoveryEngine Service
 * agent-stale-recovery: Task 3.1, 3.2 - Recovery processing for stale/orphan agents
 * Requirements: 3.5, 4.1, 4.2, 4.4, 4.6, 4.7, 5.2, 5.3
 *
 * Executes recovery actions based on log analysis:
 * - Complete: Mark agent as completed
 * - Resume: Kill hanging process (if alive) and resume agent
 * - Fail: Mark agent as failed and notify user
 */

import { LogAnalyzer, RecoveryAction } from './LogAnalyzer';
import { AgentRecordService, AgentRecord } from '../agentRecordService';

/**
 * Recovery result type
 * agent-stale-recovery: Task 13.1 - RecoveryResult interface
 * Requirements: 3.1, 4.1
 */
export interface RecoveryResult {
  agentId: string;
  action: 'completed' | 'resumed' | 'failed' | 'limit_exceeded' | 'skipped';
  reason?: string;
}

/**
 * Recovery error class
 * agent-stale-recovery: Task 3.3 - RecoveryError definition
 * Requirements: 4.7
 */
export class RecoveryError extends Error {
  constructor(
    message: string,
    public readonly agentId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RecoveryError';
  }
}

/**
 * Notification function type
 */
type NotifyFunction = (message: string, type: 'error' | 'warning' | 'info') => void;

/**
 * Resume agent function type
 */
type ResumeAgentFunction = (agentId: string) => Promise<void>;

/**
 * RecoveryEngine Service
 * Requirements: 3.5, 4.1, 4.2, 4.4, 4.6, 4.7, 5.2, 5.3
 */
export class RecoveryEngine {
  private recordService: AgentRecordService;
  private logAnalyzer: LogAnalyzer;
  private notify: NotifyFunction;
  private resumeAgent: ResumeAgentFunction;
  private locks: Map<string, Promise<void>> = new Map();

  /**
   * Maximum auto-resume attempts before giving up
   * Requirements: 5.2
   */
  private readonly MAX_RESUME_ATTEMPTS = 3;

  constructor(
    recordService: AgentRecordService,
    logAnalyzer: LogAnalyzer,
    notify: NotifyFunction,
    resumeAgent: ResumeAgentFunction
  ) {
    this.recordService = recordService;
    this.logAnalyzer = logAnalyzer;
    this.notify = notify;
    this.resumeAgent = resumeAgent;
  }

  /**
   * Recover an agent based on log analysis
   * Requirements: 3.5, 4.1, 4.2, 4.4, 4.6, 4.7, 5.2, 5.3
   *
   * @param record - Agent record to recover
   * @returns Recovery result
   */
  async recoverAgent(record: AgentRecord): Promise<RecoveryResult> {
    const { agentId, specId, status } = record;

    // Skip recovery for user-interrupted agents
    // Requirements: 3.5
    if (status === 'interrupted') {
      return {
        agentId,
        action: 'skipped',
        reason: 'Agent was interrupted by user',
      };
    }

    // Acquire mutex lock for this agent
    // Requirements: 4.2 (Design.md mentions mutex lock for concurrency)
    const lockKey = `${specId}/${agentId}`;
    if (this.locks.has(lockKey)) {
      // Resume already in progress, skip
      return {
        agentId,
        action: 'skipped',
        reason: 'Recovery already in progress',
      };
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.locks.set(lockKey, lockPromise);

    try {
      // Analyze log to determine recovery action
      const recoveryAction: RecoveryAction = await this.logAnalyzer.analyzeLog(specId, agentId);

      switch (recoveryAction) {
        case 'complete':
          return await this.handleCompletion(record);

        case 'resume':
          return await this.handleInterrupted(record);

        case 'fail':
          return await this.handleError(record);

        default:
          throw new RecoveryError(`Unknown recovery action: ${recoveryAction}`, agentId);
      }
    } finally {
      this.locks.delete(lockKey);
      releaseLock!();
    }
  }

  /**
   * Handle completion recovery action
   * Requirements: 4.1
   */
  private async handleCompletion(record: AgentRecord): Promise<RecoveryResult> {
    const { agentId, specId } = record;

    // Update status to completed
    await this.recordService.updateRecord(specId, agentId, {
      status: 'completed',
    });

    return {
      agentId,
      action: 'completed',
    };
  }

  /**
   * Handle interrupted recovery action (resume)
   * Requirements: 4.2, 4.4, 5.1, 5.2
   */
  private async handleInterrupted(record: AgentRecord): Promise<RecoveryResult> {
    const { agentId, specId, pid } = record;
    const currentCount = record.autoResumeCount ?? 0;

    // Increment autoResumeCount first
    // Requirements: 5.1
    const newCount = currentCount + 1;
    await this.recordService.updateRecord(specId, agentId, {
      autoResumeCount: newCount,
    });

    // Check resume limit after incrementing
    // Requirements: 5.2
    if (newCount > this.MAX_RESUME_ATTEMPTS) {
      // Limit exceeded, mark as failed
      await this.recordService.updateRecord(specId, agentId, {
        status: 'failed',
      });

      // Notify user about limit exceeded
      // Requirements: 5.3
      this.notify(
        `自動回復の試行回数上限に達しました: ${agentId}`,
        'error'
      );

      return {
        agentId,
        action: 'limit_exceeded',
        reason: `Auto-resume attempts exceeded ${this.MAX_RESUME_ATTEMPTS}`,
      };
    }

    // Check if process is still alive
    // Requirements: 4.4
    const isAlive = this.recordService.checkProcessAlive(pid);

    if (isAlive) {
      // Kill the hanging process
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        // Process might have already terminated, continue with resume
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
          // Log error but don't fail recovery
          console.error(`Failed to kill process ${pid}:`, error);
        }
      }
    }

    // Resume the agent
    // Requirements: 4.5
    try {
      await this.resumeAgent(agentId);
    } catch (error) {
      throw new RecoveryError(`Failed to resume agent`, agentId, error as Error);
    }

    return {
      agentId,
      action: 'resumed',
    };
  }

  /**
   * Handle error recovery action
   * Requirements: 4.6, 4.7
   */
  private async handleError(record: AgentRecord): Promise<RecoveryResult> {
    const { agentId, specId } = record;

    // Update status to failed
    await this.recordService.updateRecord(specId, agentId, {
      status: 'failed',
    });

    // Notify user about agent failure
    // Requirements: 4.7, 6.2, 6.3
    this.notify(
      `Agent終了処理でエラーが発生しました: ${agentId}`,
      'error'
    );

    return {
      agentId,
      action: 'failed',
    };
  }
}
