/**
 * AgentRegistry Service
 * Centralized management of SDD Agent state
 * Requirements: 5.1, 5.2
 */

export type AgentStatus = 'running' | 'completed' | 'interrupted' | 'hang' | 'failed';

export interface AgentInfo {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid: number;
  readonly sessionId: string;
  readonly status: AgentStatus;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly command: string;
}

/**
 * Registry for managing SDD Agent instances
 */
export class AgentRegistry {
  private agents: Map<string, AgentInfo> = new Map();

  /**
   * Register a new agent or update existing one
   */
  register(agent: AgentInfo): void {
    this.agents.set(agent.agentId, agent);
  }

  /**
   * Remove an agent from registry
   */
  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get an agent by ID
   */
  get(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents for a specific spec
   */
  getBySpec(specId: string): AgentInfo[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.specId === specId
    );
  }

  /**
   * Get all registered agents
   */
  getAll(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * Update agent status
   * Requirements: 5.2
   */
  updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.set(agentId, { ...agent, status });
    }
  }

  /**
   * Update agent's lastActivityAt timestamp
   * Requirements: 5.2
   */
  updateActivity(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.set(agentId, {
        ...agent,
        lastActivityAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Check for agents that have exceeded hang threshold
   * Requirements: 5.3, 5.4
   * @param thresholdMs Time threshold in milliseconds
   * @returns Array of agents that are hanging
   */
  checkHangAgents(thresholdMs: number): AgentInfo[] {
    const now = Date.now();
    return Array.from(this.agents.values()).filter((agent) => {
      // Only check running agents
      if (agent.status !== 'running') {
        return false;
      }

      const lastActivity = new Date(agent.lastActivityAt).getTime();
      return now - lastActivity > thresholdMs;
    });
  }
}

// Singleton instance
let agentRegistry: AgentRegistry | null = null;

export function getAgentRegistry(): AgentRegistry {
  if (!agentRegistry) {
    agentRegistry = new AgentRegistry();
  }
  return agentRegistry;
}
