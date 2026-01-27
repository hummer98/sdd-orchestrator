/**
 * AgentWatchdog - Periodic health check for agent processes
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.3
 *
 * Monitors agent processes every 30 seconds to detect:
 * - Orphaned agents (running state but process not alive)
 * - Zombie processes (terminal state but process still alive)
 */

import type { AgentRegistry } from './agentRegistry';
import type { ProcessUtils } from './processUtils';
import type { AgentLifecycleManager } from './agentLifecycleManager';

/**
 * Result of health check operation
 */
export interface HealthCheckResult {
  checkedCount: number;
  orphansDetected: number;
  zombiesKilled: number;
  errors: string[];
}

/**
 * AgentWatchdog
 * Periodic health checker for agent processes
 * Requirement: 7.1, 7.5, 9.3
 */
export class AgentWatchdog {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 30000; // 30 seconds
  private registry: AgentRegistry;
  private processUtils: ProcessUtils;
  private lifecycleManager: AgentLifecycleManager;

  constructor(
    registry: AgentRegistry,
    processUtils: ProcessUtils,
    lifecycleManager: AgentLifecycleManager
  ) {
    this.registry = registry;
    this.processUtils = processUtils;
    this.lifecycleManager = lifecycleManager;
  }

  /**
   * Start the watchdog
   * Requirement: 7.1, 7.5
   */
  start(): void {
    if (this.intervalId) {
      console.warn('[AgentWatchdog] Already running');
      return;
    }

    console.log('[AgentWatchdog] Starting with 30 second interval');

    this.intervalId = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('[AgentWatchdog] Health check error:', error);
      }
    }, this.INTERVAL_MS);
  }

  /**
   * Stop the watchdog
   * Requirement: 7.5
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[AgentWatchdog] Stopped');
    }
  }

  /**
   * Perform health check on all agents
   * Requirements: 7.2, 7.3, 7.4
   * @returns Health check result
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const agents = this.registry.getAll();
    const result: HealthCheckResult = {
      checkedCount: agents.length,
      orphansDetected: 0,
      zombiesKilled: 0,
      errors: [],
    };

    for (const agent of agents) {
      try {
        const isAlive = this.processUtils.checkProcessAlive(agent.pid);

        // Requirement: 7.2 - Detect orphaned agents
        if (agent.state === 'running' && !isAlive) {
          console.warn(
            `[AgentWatchdog] Orphaned agent detected: ${agent.agentId} (PID ${agent.pid})`
          );
          result.orphansDetected++;

          // Mark as interrupted with orphaned exit reason
          agent.state = 'interrupted';
          agent.exitReason = 'orphaned';

          // Update record store
          const recordStore = (this.lifecycleManager as any).recordStore;
          if (recordStore) {
            await recordStore.updateRecord(agent.agentId, {
              status: 'interrupted',
              exitReason: 'orphaned',
              lastActivityAt: new Date().toISOString(),
            });
          }

          // Unregister from registry
          this.registry.unregister(agent.agentId);
        }

        // Requirement: 7.3 - Detect zombie processes
        const terminalStates = ['completed', 'failed', 'stopped', 'interrupted', 'terminal'];
        if (terminalStates.includes(agent.state) && isAlive) {
          console.warn(
            `[AgentWatchdog] Zombie process detected: ${agent.agentId} (PID ${agent.pid})`
          );
          result.zombiesKilled++;

          // Force kill zombie process
          await this.lifecycleManager.killAgent(agent.agentId);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AgentWatchdog] Error checking agent ${agent.agentId}:`, errorMessage);
        result.errors.push(`Agent ${agent.agentId}: ${errorMessage}`);
      }
    }

    // Requirement: 7.4 - Log only when anomalies detected
    if (result.orphansDetected > 0 || result.zombiesKilled > 0 || result.errors.length > 0) {
      console.log('[AgentWatchdog] Health check complete:', result);
    }

    return result;
  }
}
