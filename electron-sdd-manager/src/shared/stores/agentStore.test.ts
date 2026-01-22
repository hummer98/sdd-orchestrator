/**
 * Shared agentStore Tests
 * agent-store-unification feature
 * Requirements: 1.1-1.6 (data structure modification)
 * Also includes: agent-watcher-optimization (3.1, 3.2, 3.3, 3.4, 3.5)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSharedAgentStore,
  resetSharedAgentStore,
  getSharedAgentStore,
} from './agentStore';
import type { AgentInfo } from '../api/types';

describe('SharedAgentStore', () => {
  beforeEach(() => {
    resetSharedAgentStore();
  });

  // Helper to create mock AgentInfo
  const createAgent = (
    id: string,
    specId: string,
    status: 'running' | 'completed' | 'interrupted' | 'hang' | 'failed' = 'running',
    startedAt?: string
  ): AgentInfo => ({
    id,
    specId,
    status,
    startedAt: startedAt || new Date().toISOString(),
    command: 'test',
    phase: 'requirements',
    sessionId: `session-${id}`,
    lastActivityAt: new Date().toISOString(),
  });

  // =============================================================================
  // Task 1: agent-store-unification - データ構造修正
  // Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
  // =============================================================================
  describe('Task 1: Data structure unification (agent-store-unification)', () => {
    // -------------------------------------------------------------------------
    // Task 1.1: agentsフィールドのデータ構造変更
    // Requirements: 1.1
    // -------------------------------------------------------------------------
    describe('Task 1.1: agents field data structure', () => {
      it('should have agents as Map<string, AgentInfo[]> (specId -> agents)', () => {
        const store = getSharedAgentStore();
        expect(store.agents).toBeInstanceOf(Map);
      });

      it('should store multiple agents per specId', () => {
        const store = getSharedAgentStore();
        const agent1 = createAgent('agent-1', 'spec-a', 'running');
        const agent2 = createAgent('agent-2', 'spec-a', 'completed');

        store.addAgent('spec-a', agent1);
        store.addAgent('spec-a', agent2);

        const freshState = getSharedAgentStore();
        const specAgents = freshState.agents.get('spec-a');
        expect(specAgents).toBeDefined();
        expect(specAgents).toHaveLength(2);
      });

      it('should support empty string specId for Project Agents', () => {
        const store = getSharedAgentStore();
        const projectAgent = createAgent('project-agent-1', '', 'running');

        store.addAgent('', projectAgent);

        const freshState = getSharedAgentStore();
        const projectAgents = freshState.agents.get('');
        expect(projectAgents).toBeDefined();
        expect(projectAgents).toHaveLength(1);
        expect(projectAgents![0].id).toBe('project-agent-1');
      });
    });

    // -------------------------------------------------------------------------
    // Task 1.2: getAgentsForSpec(specId) メソッド
    // Requirements: 1.2
    // -------------------------------------------------------------------------
    describe('Task 1.2: getAgentsForSpec(specId)', () => {
      it('should return agents array for existing specId', () => {
        const store = getSharedAgentStore();
        const agent1 = createAgent('agent-1', 'spec-a', 'running');
        const agent2 = createAgent('agent-2', 'spec-a', 'completed');

        store.addAgent('spec-a', agent1);
        store.addAgent('spec-a', agent2);

        const agents = store.getAgentsForSpec('spec-a');
        expect(agents).toHaveLength(2);
        expect(agents[0].id).toBe('agent-1');
        expect(agents[1].id).toBe('agent-2');
      });

      it('should return empty array for non-existent specId', () => {
        const store = getSharedAgentStore();

        const agents = store.getAgentsForSpec('non-existent');
        expect(agents).toEqual([]);
      });

      it('should return empty array for empty store', () => {
        const store = getSharedAgentStore();

        const agents = store.getAgentsForSpec('any-spec');
        expect(agents).toEqual([]);
      });
    });

    // -------------------------------------------------------------------------
    // Task 1.3: getAgentById(agentId) メソッド修正
    // Requirements: 1.3
    // -------------------------------------------------------------------------
    describe('Task 1.3: getAgentById(agentId)', () => {
      it('should find agent across all specs', () => {
        const store = getSharedAgentStore();
        const agentA = createAgent('agent-a', 'spec-a', 'running');
        const agentB = createAgent('agent-b', 'spec-b', 'running');

        store.addAgent('spec-a', agentA);
        store.addAgent('spec-b', agentB);

        const foundAgent = store.getAgentById('agent-b');
        expect(foundAgent).toBeDefined();
        expect(foundAgent!.id).toBe('agent-b');
        expect(foundAgent!.specId).toBe('spec-b');
      });

      it('should return undefined for non-existent agentId', () => {
        const store = getSharedAgentStore();
        const agent = createAgent('agent-1', 'spec-a', 'running');
        store.addAgent('spec-a', agent);

        const foundAgent = store.getAgentById('non-existent');
        expect(foundAgent).toBeUndefined();
      });

      it('should find agent in empty string specId (Project Agent)', () => {
        const store = getSharedAgentStore();
        const projectAgent = createAgent('project-agent', '', 'running');
        store.addAgent('', projectAgent);

        const foundAgent = store.getAgentById('project-agent');
        expect(foundAgent).toBeDefined();
        expect(foundAgent!.specId).toBe('');
      });
    });

    // -------------------------------------------------------------------------
    // Task 1.4: addAgent(specId, agent) メソッド修正
    // Requirements: 1.4
    // -------------------------------------------------------------------------
    describe('Task 1.4: addAgent(specId, agent)', () => {
      it('should create new array for new specId', () => {
        const store = getSharedAgentStore();
        const agent = createAgent('agent-1', 'spec-a', 'running');

        store.addAgent('spec-a', agent);

        const freshState = getSharedAgentStore();
        expect(freshState.agents.has('spec-a')).toBe(true);
        expect(freshState.agents.get('spec-a')).toHaveLength(1);
      });

      it('should append to existing array for existing specId', () => {
        const store = getSharedAgentStore();
        const agent1 = createAgent('agent-1', 'spec-a', 'running');
        const agent2 = createAgent('agent-2', 'spec-a', 'completed');

        store.addAgent('spec-a', agent1);
        store.addAgent('spec-a', agent2);

        const freshState = getSharedAgentStore();
        expect(freshState.agents.get('spec-a')).toHaveLength(2);
      });

      it('should update existing agent if agentId already exists (duplicate check)', () => {
        const store = getSharedAgentStore();
        const agent = createAgent('agent-1', 'spec-a', 'running');
        const updatedAgent = createAgent('agent-1', 'spec-a', 'completed');

        store.addAgent('spec-a', agent);
        store.addAgent('spec-a', updatedAgent);

        const freshState = getSharedAgentStore();
        const specAgents = freshState.agents.get('spec-a');
        expect(specAgents).toHaveLength(1);
        expect(specAgents![0].status).toBe('completed');
      });

      it('should handle empty specId (Project Agent)', () => {
        const store = getSharedAgentStore();
        const projectAgent = createAgent('project-agent', '', 'running');

        store.addAgent('', projectAgent);

        const freshState = getSharedAgentStore();
        expect(freshState.agents.get('')).toBeDefined();
        expect(freshState.agents.get('')).toHaveLength(1);
      });
    });

    // -------------------------------------------------------------------------
    // Task 1.5: removeAgent(agentId) メソッド修正
    // Requirements: 1.5
    // -------------------------------------------------------------------------
    describe('Task 1.5: removeAgent(agentId)', () => {
      it('should remove agent from correct spec', () => {
        const store = getSharedAgentStore();
        const agent1 = createAgent('agent-1', 'spec-a', 'running');
        const agent2 = createAgent('agent-2', 'spec-a', 'completed');

        store.addAgent('spec-a', agent1);
        store.addAgent('spec-a', agent2);
        store.removeAgent('agent-1');

        const freshState = getSharedAgentStore();
        const specAgents = freshState.agents.get('spec-a');
        expect(specAgents).toHaveLength(1);
        expect(specAgents![0].id).toBe('agent-2');
      });

      it('should search across all specs to find and remove agent', () => {
        const store = getSharedAgentStore();
        const agentA = createAgent('agent-a', 'spec-a', 'running');
        const agentB = createAgent('agent-b', 'spec-b', 'running');

        store.addAgent('spec-a', agentA);
        store.addAgent('spec-b', agentB);
        store.removeAgent('agent-b');

        const freshState = getSharedAgentStore();
        expect(freshState.agents.get('spec-a')).toHaveLength(1);
        expect(freshState.agents.get('spec-b')).toHaveLength(0);
      });

      it('should keep empty array after removing last agent (not delete key)', () => {
        const store = getSharedAgentStore();
        const agent = createAgent('agent-1', 'spec-a', 'running');

        store.addAgent('spec-a', agent);
        store.removeAgent('agent-1');

        const freshState = getSharedAgentStore();
        // Empty array is kept, key is not deleted
        expect(freshState.agents.has('spec-a')).toBe(true);
        expect(freshState.agents.get('spec-a')).toHaveLength(0);
      });

      it('should clear selectedAgentId if removing selected agent', () => {
        const store = getSharedAgentStore();
        const agent = createAgent('agent-1', 'spec-a', 'running');

        store.addAgent('spec-a', agent);
        store.selectAgent('agent-1');
        store.removeAgent('agent-1');

        const freshState = getSharedAgentStore();
        expect(freshState.selectedAgentId).toBeNull();
      });

      it('should also remove logs for the agent', () => {
        const store = getSharedAgentStore();
        const agent = createAgent('agent-1', 'spec-a', 'running');

        store.addAgent('spec-a', agent);
        store.addLog('agent-1', { id: 'log-1', stream: 'stdout', data: 'test', timestamp: Date.now() });
        store.removeAgent('agent-1');

        const freshState = getSharedAgentStore();
        expect(freshState.logs.has('agent-1')).toBe(false);
      });

      it('should handle removing non-existent agent gracefully', () => {
        const store = getSharedAgentStore();

        // Should not throw
        expect(() => store.removeAgent('non-existent')).not.toThrow();
      });
    });

    // -------------------------------------------------------------------------
    // Task 1.6: updateAgentStatus(agentId, status) メソッド修正
    // Requirements: 1.6
    // -------------------------------------------------------------------------
    describe('Task 1.6: updateAgentStatus(agentId, status)', () => {
      it('should update agent status across all specs', () => {
        const store = getSharedAgentStore();
        const agent = createAgent('agent-1', 'spec-a', 'running');

        store.addAgent('spec-a', agent);
        store.updateAgentStatus('agent-1', 'completed');

        const freshState = getSharedAgentStore();
        const updatedAgent = freshState.getAgentById('agent-1');
        expect(updatedAgent!.status).toBe('completed');
      });

      it('should find agent in any spec and update', () => {
        const store = getSharedAgentStore();
        const agentA = createAgent('agent-a', 'spec-a', 'running');
        const agentB = createAgent('agent-b', 'spec-b', 'running');

        store.addAgent('spec-a', agentA);
        store.addAgent('spec-b', agentB);
        store.updateAgentStatus('agent-b', 'interrupted');

        const freshState = getSharedAgentStore();
        const updatedAgent = freshState.getAgentById('agent-b');
        expect(updatedAgent!.status).toBe('interrupted');
      });

      it('should handle non-existent agent gracefully', () => {
        const store = getSharedAgentStore();

        // Should not throw
        expect(() => store.updateAgentStatus('non-existent', 'completed')).not.toThrow();
      });

      it('should also update lastActivityAt when status changes', () => {
        const store = getSharedAgentStore();
        const oldTime = '2025-01-01T00:00:00Z';
        const agent = createAgent('agent-1', 'spec-a', 'running', oldTime);
        // Manually set lastActivityAt to old time
        agent.lastActivityAt = oldTime;

        store.addAgent('spec-a', agent);

        // Small delay to ensure time difference
        const beforeUpdate = new Date().toISOString();
        store.updateAgentStatus('agent-1', 'completed');

        const freshState = getSharedAgentStore();
        const updatedAgent = freshState.getAgentById('agent-1');
        // lastActivityAt should be updated to a newer time
        expect(new Date(updatedAgent!.lastActivityAt!).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeUpdate).getTime() - 1000 // Allow 1 second tolerance
        );
      });
    });
  });

  // =============================================================================
  // Task 3.1: Spec単位選択状態管理
  // Requirements: 3.3, 3.5
  // =============================================================================
  describe('Task 3.1: Spec-level selection state management', () => {
    it('should have selectedAgentIdBySpec as a Map', () => {
      const store = getSharedAgentStore();
      expect(store.selectedAgentIdBySpec).toBeInstanceOf(Map);
    });

    it('should initialize selectedAgentIdBySpec as empty Map', () => {
      const store = getSharedAgentStore();
      expect(store.selectedAgentIdBySpec.size).toBe(0);
    });

    it('setSelectedAgentForSpec should save agent selection per spec', () => {
      const store = getSharedAgentStore();

      store.setSelectedAgentForSpec('spec-a', 'agent-1');
      store.setSelectedAgentForSpec('spec-b', 'agent-2');

      // Get fresh state after mutations
      const freshState = getSharedAgentStore();
      expect(freshState.selectedAgentIdBySpec.get('spec-a')).toBe('agent-1');
      expect(freshState.selectedAgentIdBySpec.get('spec-b')).toBe('agent-2');
    });

    it('setSelectedAgentForSpec should allow null to clear selection', () => {
      const store = getSharedAgentStore();

      store.setSelectedAgentForSpec('spec-a', 'agent-1');
      store.setSelectedAgentForSpec('spec-a', null);

      // Get fresh state after mutations
      const freshState = getSharedAgentStore();
      expect(freshState.selectedAgentIdBySpec.get('spec-a')).toBeNull();
    });

    it('getSelectedAgentForSpec should return saved selection', () => {
      const store = getSharedAgentStore();

      store.setSelectedAgentForSpec('spec-a', 'agent-1');

      expect(store.getSelectedAgentForSpec('spec-a')).toBe('agent-1');
    });

    it('getSelectedAgentForSpec should return null for unknown spec', () => {
      const store = getSharedAgentStore();

      expect(store.getSelectedAgentForSpec('unknown-spec')).toBeNull();
    });
  });

  // =============================================================================
  // Task 3.2: autoSelectAgentForSpec メソッド
  // Bug fix: agent-log-auto-select-rule - 新しい自動選択ルール
  // =============================================================================
  describe('Task 3.2: autoSelectAgentForSpec method (agent-log-auto-select-rule)', () => {
    // -------------------------------------------------------------------------
    // Case 1: specId === null (未選択状態)
    // -------------------------------------------------------------------------
    describe('when specId is null (no spec/bug selected)', () => {
      it('should select most recent running agent globally', () => {
        const store = getSharedAgentStore();

        // Add running agents for different specs
        const olderAgent = createAgent('agent-old', 'spec-a', 'running', '2025-01-01T10:00:00Z');
        const newerAgent = createAgent('agent-new', 'spec-b', 'running', '2025-01-01T11:00:00Z');

        store.addAgent('spec-a', olderAgent);
        store.addAgent('spec-b', newerAgent);

        // Auto-select with null specId should choose newest running agent globally
        store.autoSelectAgentForSpec(null);

        const freshState = getSharedAgentStore();
        expect(freshState.selectedAgentId).toBe('agent-new');
      });

      it('should set selectedAgentId to null when no running agents globally', () => {
        const store = getSharedAgentStore();

        // Add only completed agents
        const completedAgent = createAgent('agent-1', 'spec-a', 'completed');
        store.addAgent('spec-a', completedAgent);

        // Auto-select with null specId should clear selection
        store.autoSelectAgentForSpec(null);

        expect(store.selectedAgentId).toBeNull();
      });

      it('should set selectedAgentId to null when no agents exist', () => {
        const store = getSharedAgentStore();

        // Auto-select with null specId on empty store
        store.autoSelectAgentForSpec(null);

        expect(store.selectedAgentId).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // Case 2: specId !== null (Spec/Bug選択状態)
    // -------------------------------------------------------------------------
    describe('when specId is provided (spec/bug selected)', () => {
      it('should select most recent running agent for that spec', () => {
        const store = getSharedAgentStore();

        // Add agents with different startedAt times
        const olderAgent = createAgent('agent-old', 'spec-a', 'running', '2025-01-01T10:00:00Z');
        const newerAgent = createAgent('agent-new', 'spec-a', 'running', '2025-01-01T11:00:00Z');

        store.addAgent('spec-a', olderAgent);
        store.addAgent('spec-a', newerAgent);

        // Auto-select should choose newest running agent
        store.autoSelectAgentForSpec('spec-a');

        const freshState = getSharedAgentStore();
        expect(freshState.selectedAgentId).toBe('agent-new');
      });

      it('should set selectedAgentId to null when no running agents for spec', () => {
        const store = getSharedAgentStore();

        // Add only completed agents for spec-a
        const completedAgent = createAgent('agent-1', 'spec-a', 'completed');
        store.addAgent('spec-a', completedAgent);

        // Auto-select should clear selection (not select non-running agent)
        store.autoSelectAgentForSpec('spec-a');

        expect(store.selectedAgentId).toBeNull();
      });

      it('should set selectedAgentId to null when spec has no agents', () => {
        const store = getSharedAgentStore();

        // Auto-select on empty spec
        store.autoSelectAgentForSpec('empty-spec');

        expect(store.selectedAgentId).toBeNull();
      });

      it('should select running agent even if completed agents exist', () => {
        const store = getSharedAgentStore();

        // Add mix of agents
        const completedAgent = createAgent('agent-completed', 'spec-a', 'completed');
        const runningAgent = createAgent('agent-running', 'spec-a', 'running');

        store.addAgent('spec-a', completedAgent);
        store.addAgent('spec-a', runningAgent);

        // Auto-select should choose running agent
        store.autoSelectAgentForSpec('spec-a');

        const freshState = getSharedAgentStore();
        expect(freshState.selectedAgentId).toBe('agent-running');
      });

      it('should update selectedAgentIdBySpec when auto-selecting', () => {
        const store = getSharedAgentStore();

        const agent = createAgent('agent-1', 'spec-a', 'running');
        store.addAgent('spec-a', agent);

        store.autoSelectAgentForSpec('spec-a');

        const freshState = getSharedAgentStore();
        // Should save the auto-selected agent to per-spec state
        expect(freshState.selectedAgentIdBySpec.get('spec-a')).toBe('agent-1');
      });

      it('should NOT restore saved selection (running agent takes priority)', () => {
        const store = getSharedAgentStore();

        // Add two running agents
        const olderAgent = createAgent('agent-old', 'spec-a', 'running', '2025-01-01T10:00:00Z');
        const newerAgent = createAgent('agent-new', 'spec-a', 'running', '2025-01-01T11:00:00Z');

        store.addAgent('spec-a', olderAgent);
        store.addAgent('spec-a', newerAgent);

        // Save selection for older agent (simulating previous manual selection)
        store.setSelectedAgentForSpec('spec-a', 'agent-old');

        // Clear current selection
        store.selectAgent(null);

        // Auto-select should choose newest running agent, NOT restore saved selection
        store.autoSelectAgentForSpec('spec-a');

        const freshState = getSharedAgentStore();
        expect(freshState.selectedAgentId).toBe('agent-new');
      });
    });
  });

  // =============================================================================
  // Task 3.3: selectAgent改修（Spec単位保存）
  // Requirements: 3.3, 3.5
  // =============================================================================
  describe('Task 3.3: selectAgent saves per-spec state', () => {
    it('should save selection to selectedAgentIdBySpec when selecting agent', () => {
      const store = getSharedAgentStore();

      // Add agent
      const agent = createAgent('agent-1', 'spec-a', 'running');
      store.addAgent('spec-a', agent);

      // Select agent
      store.selectAgent('agent-1');

      // Get fresh state after mutations
      const freshState = getSharedAgentStore();
      // Should be saved per spec
      expect(freshState.selectedAgentIdBySpec.get('spec-a')).toBe('agent-1');
    });

    it('should handle selecting agent from different specs', () => {
      const store = getSharedAgentStore();

      // Add agents for different specs
      const agentA = createAgent('agent-a', 'spec-a', 'running');
      const agentB = createAgent('agent-b', 'spec-b', 'running');

      store.addAgent('spec-a', agentA);
      store.addAgent('spec-b', agentB);

      // Select agent from spec-a
      store.selectAgent('agent-a');
      expect(getSharedAgentStore().selectedAgentIdBySpec.get('spec-a')).toBe('agent-a');

      // Select agent from spec-b
      store.selectAgent('agent-b');
      expect(getSharedAgentStore().selectedAgentIdBySpec.get('spec-b')).toBe('agent-b');

      // spec-a selection should be preserved
      expect(getSharedAgentStore().selectedAgentIdBySpec.get('spec-a')).toBe('agent-a');
    });

    it('should handle selecting null (clear selection)', () => {
      const store = getSharedAgentStore();

      // Add and select agent
      const agent = createAgent('agent-1', 'spec-a', 'running');
      store.addAgent('spec-a', agent);
      store.selectAgent('agent-1');

      // Clear selection
      store.selectAgent(null);

      // Get fresh state after mutations
      const freshState = getSharedAgentStore();
      // selectedAgentId should be null
      expect(freshState.selectedAgentId).toBeNull();
      // But per-spec selection should be preserved (for restore later)
      expect(freshState.selectedAgentIdBySpec.get('spec-a')).toBe('agent-1');
    });

    it('should not persist selection (memory only - Requirement 3.5)', () => {
      const store = getSharedAgentStore();

      // Add and select agent
      const agent = createAgent('agent-1', 'spec-a', 'running');
      store.addAgent('spec-a', agent);
      store.selectAgent('agent-1');

      // Reset store (simulates app restart)
      resetSharedAgentStore();

      // Selection should be cleared
      const freshStore = getSharedAgentStore();
      expect(freshStore.selectedAgentIdBySpec.size).toBe(0);
    });
  });
});
