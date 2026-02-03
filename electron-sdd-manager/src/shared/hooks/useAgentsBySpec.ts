/**
 * Agent Selector Hooks
 *
 * zustand-agent-selector-hooks: Task 1.1, 1.2, 1.3
 * Requirements: 1.1, 1.2, 1.3
 *
 * These hooks provide reactive access to agent state from the shared agent store.
 * They use proper Zustand selector patterns to ensure re-rendering when state changes.
 *
 * Design Decision DD-003: useAgentsBySpec is the foundation hook,
 * other hooks delegate to it.
 */

import { useMemo } from 'react';
import { useSharedAgentStore } from '../stores/agentStore';
import type { AgentInfo } from '../api/types';

// =============================================================================
// useAgentsBySpec
// Requirements: 1.1
// =============================================================================

/**
 * useAgentsBySpec - Reactively get agents for a specific specId
 *
 * This hook subscribes to the agents Map directly, ensuring re-rendering
 * when agents are added, removed, or their status changes.
 *
 * @param specId - Target specId (empty string '' for Project Agents)
 * @returns Sorted AgentInfo[] (running first, then by startedAt descending)
 *
 * @example
 * ```typescript
 * const agents = useAgentsBySpec('my-feature');
 * const projectAgents = useAgentsBySpec(''); // Project-level agents
 * ```
 */
export function useAgentsBySpec(specId: string): AgentInfo[] {
  // Subscribe to agents Map directly - this is the key to reactivity
  // When the Map changes, Zustand triggers a re-render
  const agents = useSharedAgentStore((state) => state.agents);

  // Memoize the filtered and sorted result
  return useMemo(() => {
    const agentList = agents.get(specId) || [];

    // Sort: running first, then by startedAt descending
    return [...agentList].sort((a, b) => {
      // Running agents first
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (a.status !== 'running' && b.status === 'running') return 1;

      // Then by startedAt descending (newest first)
      const aTime = typeof a.startedAt === 'number'
        ? a.startedAt
        : new Date(a.startedAt as string).getTime();
      const bTime = typeof b.startedAt === 'number'
        ? b.startedAt
        : new Date(b.startedAt as string).getTime();

      return bTime - aTime;
    });
  }, [agents, specId]);
}

// =============================================================================
// useProjectAgents
// Requirements: 1.2
// =============================================================================

/**
 * useProjectAgents - Reactively get project-level agents
 *
 * Convenience hook that delegates to useAgentsBySpec('').
 * Project agents are those with specId = '' (empty string).
 *
 * @returns Sorted AgentInfo[] for project-level agents
 *
 * @example
 * ```typescript
 * const projectAgents = useProjectAgents();
 * ```
 */
export function useProjectAgents(): AgentInfo[] {
  return useAgentsBySpec('');
}

// =============================================================================
// useRunningAgentCount
// Requirements: 1.3
// =============================================================================

/**
 * useRunningAgentCount - Reactively get count of running agents for a specId
 *
 * Derives the count from useAgentsBySpec, filtering for status='running'.
 *
 * @param specId - Target specId
 * @returns Number of running agents (0 if none)
 *
 * @example
 * ```typescript
 * const runningCount = useRunningAgentCount('my-feature');
 * if (runningCount > 0) {
 *   // Show running indicator
 * }
 * ```
 */
export function useRunningAgentCount(specId: string): number {
  const agents = useAgentsBySpec(specId);

  return useMemo(() => {
    return agents.filter((agent) => agent.status === 'running').length;
  }, [agents]);
}
