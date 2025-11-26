/**
 * HangDetector Service
 * Periodically checks for hanging SDD Agents
 * Requirements: 5.3
 */

import { AgentRegistry, AgentInfo } from './agentRegistry';

export type HangCallback = (agent: AgentInfo) => void;

/**
 * Service for detecting hanging agents
 */
export class HangDetector {
  private registry: AgentRegistry;
  private thresholdMs: number = 300000; // Default: 5 minutes
  private intervalMs: number = 60000; // Default: 1 minute
  private timer: ReturnType<typeof setInterval> | null = null;
  private callbacks: HangCallback[] = [];

  constructor(registry: AgentRegistry) {
    this.registry = registry;
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
   */
  private checkForHangingAgents(): void {
    const hangingAgents = this.registry.checkHangAgents(this.thresholdMs);

    for (const agent of hangingAgents) {
      // Update status to 'hang'
      this.registry.updateStatus(agent.agentId, 'hang');

      // Notify callbacks
      this.callbacks.forEach((cb) => cb(agent));
    }
  }
}
