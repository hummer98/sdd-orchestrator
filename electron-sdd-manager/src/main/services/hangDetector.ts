/**
 * HangDetector Service
 * Periodically checks for hanging SDD Agents
 * Requirements: 5.3
 * agent-state-file-ssot: Now uses AgentRecordService as SSOT
 * agent-stale-recovery: Task 5.1 - Extended to call RecoveryEngine
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { AgentRecordService, AgentInfo } from './agentRecordService';
import { RecoveryEngine } from './stale-recovery/RecoveryEngine';

export type HangCallback = (agent: AgentInfo) => void;

/**
 * Service for detecting hanging agents
 * agent-state-file-ssot: Now uses AgentRecordService for file-based state
 * agent-stale-recovery: Extended with RecoveryEngine integration
 */
export class HangDetector {
  private recordService: AgentRecordService;
  private recoveryEngine: RecoveryEngine | null = null;
  private thresholdMs: number = 300000; // Default: 5 minutes (Requirements: 2.2)
  private intervalMs: number = 60000; // Default: 1 minute (Requirements: 2.1, 2.5)
  private timer: ReturnType<typeof setInterval> | null = null;
  private callbacks: HangCallback[] = [];

  constructor(recordService: AgentRecordService, recoveryEngine?: RecoveryEngine) {
    this.recordService = recordService;
    this.recoveryEngine = recoveryEngine || null;
  }

  /**
   * Set the recovery engine (optional - for dependency injection)
   * agent-stale-recovery: Task 5.1
   */
  setRecoveryEngine(recoveryEngine: RecoveryEngine): void {
    this.recoveryEngine = recoveryEngine;
  }

  /**
   * Set the hang threshold
   * @param thresholdMs Time in milliseconds after which an agent is considered hanging
   */
  setThreshold(thresholdMs: number): void {
    this.thresholdMs = thresholdMs;
  }

  /**
   * Register callback for hang detection
   */
  onHangDetected(callback: HangCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Start hang detection
   * @param thresholdMs Time threshold in milliseconds
   * @param intervalMs Check interval in milliseconds
   */
  start(thresholdMs?: number, intervalMs?: number): void {
    if (thresholdMs !== undefined) {
      this.thresholdMs = thresholdMs;
    }
    if (intervalMs !== undefined) {
      this.intervalMs = intervalMs;
    }

    // Stop existing timer if any
    this.stop();

    // Start new timer
    this.timer = setInterval(() => {
      this.checkForHangingAgents();
    }, this.intervalMs);
  }

  /**
   * Stop hang detection
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Check for hanging agents and update their status
   * agent-state-file-ssot: Now async, reads from files
   * agent-stale-recovery: Task 5.1 - Extended to call RecoveryEngine before hang transition
   * Requirements: 2.1, 2.2, 2.3
   * Note: Made public for testing purposes (fake timers cannot await internal async callbacks)
   */
  async checkForHangingAgents(): Promise<void> {
    const allRecords = await this.recordService.readAllRecords();
    const now = Date.now();

    for (const record of allRecords) {
      // Only check running agents
      // Requirements: 2.2
      if (record.status !== 'running') {
        continue;
      }

      const lastActivity = new Date(record.lastActivityAt).getTime();
      // Requirements: 2.2 - 5 minutes threshold (default thresholdMs = 300000)
      if (now - lastActivity > this.thresholdMs) {
        // Stale agent detected

        // Try recovery if RecoveryEngine is available
        // Requirements: 2.3
        if (this.recoveryEngine) {
          try {
            const result = await this.recoveryEngine.recoverAgent(record);
            console.log(
              `[HangDetector] Recovery attempted for ${record.agentId}: ${result.action}` +
                (result.reason ? ` (${result.reason})` : '')
            );

            // If recovery succeeded, skip hang transition
            if (result.action === 'completed' || result.action === 'resumed') {
              continue;
            }
            // If recovery failed or limit exceeded, fall through to hang transition
          } catch (error) {
            // Recovery failed, fall through to hang transition
            console.error(`[HangDetector] Recovery failed for ${record.agentId}:`, error);
          }
        }

        // Agent is hanging - update status
        await this.recordService.updateRecord(record.specId, record.agentId, {
          status: 'hang',
        });

        // Notify callbacks
        const agentInfo: AgentInfo = {
          agentId: record.agentId,
          specId: record.specId,
          phase: record.phase,
          pid: record.pid,
          sessionId: record.sessionId,
          status: 'hang',
          startedAt: record.startedAt,
          lastActivityAt: record.lastActivityAt,
          command: record.command,
          engineId: record.engineId,
        };
        this.callbacks.forEach((cb) => cb(agentInfo));
      }
    }
  }
}
