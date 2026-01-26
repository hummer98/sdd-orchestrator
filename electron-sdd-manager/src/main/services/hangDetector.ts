/**
 * HangDetector Service
 * Periodically checks for hanging SDD Agents
 * Requirements: 5.3
 * agent-state-file-ssot: Now uses AgentRecordService as SSOT
 */

import { AgentRecordService, AgentInfo } from './agentRecordService';

export type HangCallback = (agent: AgentInfo) => void;

/**
 * Service for detecting hanging agents
 * agent-state-file-ssot: Now uses AgentRecordService for file-based state
 */
export class HangDetector {
  private recordService: AgentRecordService;
  private thresholdMs: number = 300000; // Default: 5 minutes
  private intervalMs: number = 60000; // Default: 1 minute
  private timer: ReturnType<typeof setInterval> | null = null;
  private callbacks: HangCallback[] = [];

  constructor(recordService: AgentRecordService) {
    this.recordService = recordService;
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
   * Note: Made public for testing purposes (fake timers cannot await internal async callbacks)
   */
  async checkForHangingAgents(): Promise<void> {
    const allRecords = await this.recordService.readAllRecords();
    const now = Date.now();

    for (const record of allRecords) {
      // Only check running agents
      if (record.status !== 'running') {
        continue;
      }

      const lastActivity = new Date(record.lastActivityAt).getTime();
      if (now - lastActivity > this.thresholdMs) {
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
