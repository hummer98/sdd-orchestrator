/**
 * Tests for useAgentsBySpec, useProjectAgents, and useRunningAgentCount hooks
 *
 * zustand-agent-selector-hooks: Task 2.1, 2.2, 2.3
 * Requirements: 5.1 - Unit tests for new hooks
 *
 * Tests cover:
 * - useAgentsBySpec: Returning correct agents, re-rendering on Map changes, empty array for non-existent specId, sorting order
 * - useProjectAgents: Delegation to useAgentsBySpec('')
 * - useRunningAgentCount: Count calculation for running agents
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentsBySpec, useProjectAgents, useRunningAgentCount } from './useAgentsBySpec';
import { useSharedAgentStore, resetSharedAgentStore } from '../stores/agentStore';
import type { AgentInfo } from '../api/types';

// =============================================================================
// Test Data
// =============================================================================

const createMockAgent = (overrides: Partial<AgentInfo> = {}): AgentInfo => ({
  agentId: `agent-${Math.random().toString(36).substring(7)}`,
  specId: 'test-spec',
  phase: 'requirements',
  status: 'running',
  startedAt: new Date().toISOString(),
  command: 'claude',
  sessionId: 'session-1',
  lastActivityAt: new Date().toISOString(),
  ...overrides,
});

// =============================================================================
// useAgentsBySpec Tests
// =============================================================================

describe('useAgentsBySpec', () => {
  beforeEach(() => {
    resetSharedAgentStore();
  });

  it('should return correct agents for a specId', () => {
    // Arrange: Add agents to store
    const agent1 = createMockAgent({ agentId: 'agent-1', specId: 'my-spec', status: 'running' });
    const agent2 = createMockAgent({ agentId: 'agent-2', specId: 'my-spec', status: 'completed' });
    const agent3 = createMockAgent({ agentId: 'agent-3', specId: 'other-spec', status: 'running' });

    useSharedAgentStore.getState().addAgent('my-spec', agent1);
    useSharedAgentStore.getState().addAgent('my-spec', agent2);
    useSharedAgentStore.getState().addAgent('other-spec', agent3);

    // Act
    const { result } = renderHook(() => useAgentsBySpec('my-spec'));

    // Assert
    expect(result.current).toHaveLength(2);
    expect(result.current.map((a) => a.agentId)).toContain('agent-1');
    expect(result.current.map((a) => a.agentId)).toContain('agent-2');
    expect(result.current.map((a) => a.agentId)).not.toContain('agent-3');
  });

  it('should return empty array when no agents exist for specId', () => {
    // Arrange: Add agent to different spec
    const agent = createMockAgent({ agentId: 'agent-1', specId: 'other-spec' });
    useSharedAgentStore.getState().addAgent('other-spec', agent);

    // Act
    const { result } = renderHook(() => useAgentsBySpec('non-existent-spec'));

    // Assert
    expect(result.current).toHaveLength(0);
    expect(result.current).toEqual([]);
  });

  it('should re-render when agents Map changes', () => {
    // Arrange
    const { result } = renderHook(() => useAgentsBySpec('my-spec'));
    expect(result.current).toHaveLength(0);

    // Act: Add agent
    act(() => {
      const agent = createMockAgent({ agentId: 'agent-1', specId: 'my-spec' });
      useSharedAgentStore.getState().addAgent('my-spec', agent);
    });

    // Assert
    expect(result.current).toHaveLength(1);
    expect(result.current[0].agentId).toBe('agent-1');
  });

  it('should sort agents with running first, then by startedAt descending', () => {
    // Arrange: Create agents with different statuses and times
    const now = Date.now();
    const agent1 = createMockAgent({
      agentId: 'oldest-completed',
      specId: 'my-spec',
      status: 'completed',
      startedAt: new Date(now - 3000).toISOString(),
    });
    const agent2 = createMockAgent({
      agentId: 'newest-completed',
      specId: 'my-spec',
      status: 'completed',
      startedAt: new Date(now - 1000).toISOString(),
    });
    const agent3 = createMockAgent({
      agentId: 'oldest-running',
      specId: 'my-spec',
      status: 'running',
      startedAt: new Date(now - 2000).toISOString(),
    });
    const agent4 = createMockAgent({
      agentId: 'newest-running',
      specId: 'my-spec',
      status: 'running',
      startedAt: new Date(now).toISOString(),
    });

    useSharedAgentStore.getState().addAgent('my-spec', agent1);
    useSharedAgentStore.getState().addAgent('my-spec', agent2);
    useSharedAgentStore.getState().addAgent('my-spec', agent3);
    useSharedAgentStore.getState().addAgent('my-spec', agent4);

    // Act
    const { result } = renderHook(() => useAgentsBySpec('my-spec'));

    // Assert: Running agents first (newest to oldest), then completed (newest to oldest)
    expect(result.current).toHaveLength(4);
    expect(result.current[0].agentId).toBe('newest-running');
    expect(result.current[1].agentId).toBe('oldest-running');
    expect(result.current[2].agentId).toBe('newest-completed');
    expect(result.current[3].agentId).toBe('oldest-completed');
  });

  it('should handle numeric startedAt values for sorting', () => {
    // Arrange: Create agents with numeric startedAt
    const now = Date.now();
    const agent1 = createMockAgent({
      agentId: 'agent-1',
      specId: 'my-spec',
      status: 'completed',
      startedAt: now - 2000,
    } as AgentInfo);
    const agent2 = createMockAgent({
      agentId: 'agent-2',
      specId: 'my-spec',
      status: 'running',
      startedAt: now - 1000,
    } as AgentInfo);

    useSharedAgentStore.getState().addAgent('my-spec', agent1 as AgentInfo);
    useSharedAgentStore.getState().addAgent('my-spec', agent2 as AgentInfo);

    // Act
    const { result } = renderHook(() => useAgentsBySpec('my-spec'));

    // Assert: Running first
    expect(result.current[0].agentId).toBe('agent-2');
    expect(result.current[1].agentId).toBe('agent-1');
  });
});

// =============================================================================
// useProjectAgents Tests
// =============================================================================

describe('useProjectAgents', () => {
  beforeEach(() => {
    resetSharedAgentStore();
  });

  it('should delegate to useAgentsBySpec with empty string', () => {
    // Arrange: Add project agents (specId = '')
    const projectAgent = createMockAgent({ agentId: 'project-agent', specId: '' });
    const specAgent = createMockAgent({ agentId: 'spec-agent', specId: 'some-spec' });

    useSharedAgentStore.getState().addAgent('', projectAgent);
    useSharedAgentStore.getState().addAgent('some-spec', specAgent);

    // Act
    const { result } = renderHook(() => useProjectAgents());

    // Assert
    expect(result.current).toHaveLength(1);
    expect(result.current[0].agentId).toBe('project-agent');
  });

  it('should return empty array when no project agents exist', () => {
    // Arrange: Add only spec agents
    const specAgent = createMockAgent({ agentId: 'spec-agent', specId: 'some-spec' });
    useSharedAgentStore.getState().addAgent('some-spec', specAgent);

    // Act
    const { result } = renderHook(() => useProjectAgents());

    // Assert
    expect(result.current).toHaveLength(0);
  });

  it('should re-render when project agents change', () => {
    // Arrange
    const { result } = renderHook(() => useProjectAgents());
    expect(result.current).toHaveLength(0);

    // Act: Add project agent
    act(() => {
      const agent = createMockAgent({ agentId: 'new-project-agent', specId: '' });
      useSharedAgentStore.getState().addAgent('', agent);
    });

    // Assert
    expect(result.current).toHaveLength(1);
  });
});

// =============================================================================
// useRunningAgentCount Tests
// =============================================================================

describe('useRunningAgentCount', () => {
  beforeEach(() => {
    resetSharedAgentStore();
  });

  it('should return count of running agents for specId', () => {
    // Arrange
    const runningAgent1 = createMockAgent({ agentId: 'running-1', specId: 'my-spec', status: 'running' });
    const runningAgent2 = createMockAgent({ agentId: 'running-2', specId: 'my-spec', status: 'running' });
    const completedAgent = createMockAgent({ agentId: 'completed', specId: 'my-spec', status: 'completed' });

    useSharedAgentStore.getState().addAgent('my-spec', runningAgent1);
    useSharedAgentStore.getState().addAgent('my-spec', runningAgent2);
    useSharedAgentStore.getState().addAgent('my-spec', completedAgent);

    // Act
    const { result } = renderHook(() => useRunningAgentCount('my-spec'));

    // Assert
    expect(result.current).toBe(2);
  });

  it('should return 0 when no running agents exist', () => {
    // Arrange
    const completedAgent = createMockAgent({ agentId: 'completed', specId: 'my-spec', status: 'completed' });
    const failedAgent = createMockAgent({ agentId: 'failed', specId: 'my-spec', status: 'failed' });

    useSharedAgentStore.getState().addAgent('my-spec', completedAgent);
    useSharedAgentStore.getState().addAgent('my-spec', failedAgent);

    // Act
    const { result } = renderHook(() => useRunningAgentCount('my-spec'));

    // Assert
    expect(result.current).toBe(0);
  });

  it('should return 0 when specId does not exist', () => {
    // Act
    const { result } = renderHook(() => useRunningAgentCount('non-existent'));

    // Assert
    expect(result.current).toBe(0);
  });

  it('should update when agent status changes', () => {
    // Arrange
    const agent = createMockAgent({ agentId: 'agent-1', specId: 'my-spec', status: 'running' });
    useSharedAgentStore.getState().addAgent('my-spec', agent);

    const { result } = renderHook(() => useRunningAgentCount('my-spec'));
    expect(result.current).toBe(1);

    // Act: Update status to completed
    act(() => {
      useSharedAgentStore.getState().updateAgentStatus('agent-1', 'completed');
    });

    // Assert
    expect(result.current).toBe(0);
  });

  it('should only count agents with status "running"', () => {
    // Arrange: Add agents with various statuses
    const running = createMockAgent({ agentId: 'running', specId: 'my-spec', status: 'running' });
    const completed = createMockAgent({ agentId: 'completed', specId: 'my-spec', status: 'completed' });
    const failed = createMockAgent({ agentId: 'failed', specId: 'my-spec', status: 'failed' });
    const interrupted = createMockAgent({ agentId: 'interrupted', specId: 'my-spec', status: 'interrupted' });

    useSharedAgentStore.getState().addAgent('my-spec', running);
    useSharedAgentStore.getState().addAgent('my-spec', completed);
    useSharedAgentStore.getState().addAgent('my-spec', failed);
    useSharedAgentStore.getState().addAgent('my-spec', interrupted);

    // Act
    const { result } = renderHook(() => useRunningAgentCount('my-spec'));

    // Assert: Only 'running' status counts
    expect(result.current).toBe(1);
  });
});
