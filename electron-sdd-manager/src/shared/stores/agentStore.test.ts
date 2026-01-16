/**
 * Shared agentStore Tests
 * agent-watcher-optimization feature
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
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
