/**
 * AgentRegistry - In-Memory agent state management (Runtime SSOT)
 * Requirements: 1.3, 5.4, 6.1
 */

import type { AgentHandle } from './agentHandle';
import { ReattachedAgentHandle } from './agentHandle';
import type { AgentRecord } from './agentRecordService';

/**
 * In-Memory registry for running agents
 * This is the runtime SSOT for agent state
 */
export class AgentRegistry {
  private agents: Map<string, AgentHandle> = new Map();

  /**
   * Register an agent
   * Requirement: 1.3
   */
  register(handle: AgentHandle): void {
    this.agents.set(handle.agentId, handle);
  }

  /**
   * Unregister an agent
   * Requirement: 1.3
   */
  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get an agent by ID
   * Requirement: 1.3
   */
  get(agentId: string): AgentHandle | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   * Requirement: 1.3
   */
  getAll(): AgentHandle[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by spec ID
   * Requirement: 1.3
   */
  getBySpec(specId: string): AgentHandle[] {
    return this.getAll().filter((handle) => handle.specId === specId);
  }

  /**
   * Register a reattached agent (limited capabilities mode)
   * Requirements: 5.4, 6.1
   *
   * Creates a ReattachedAgentHandle with limited capabilities:
   * - Can check PID liveness
   * - Can force kill (SIGKILL)
   * - Cannot receive stdout/stderr
   * - Cannot graceful shutdown
   */
  registerReattached(record: AgentRecord): void {
    const handle = new ReattachedAgentHandle(
      record.agentId,
      record.specId,
      record.phase,
      record.pid,
      record.sessionId,
      'running', // Reattached agents are assumed running
      record.startedAt,
      record.processStartTime || null,
      record.exitReason || null
    );

    this.register(handle);
  }

  /**
   * Clear all agents
   * Requirement: 1.3
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * Get agent count
   */
  size(): number {
    return this.agents.size;
  }
}

// Singleton instance
let defaultRegistry: AgentRegistry | null = null;

export function getAgentRegistry(): AgentRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new AgentRegistry();
  }
  return defaultRegistry;
}
