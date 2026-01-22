/**
 * bugStore Tests
 *
 * Task 7.2: ユニットテスト実装
 * Requirements: 5.3 (remote-ui-bug-advanced-features)
 *
 * Tests for shared bugStore (createBug, setUseWorktree actions)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSharedBugStore, resetSharedBugStore } from './bugStore';
import type { ApiClient, AgentInfo, BugMetadata } from '../api/types';

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getSpecs: vi.fn(),
    getSpecDetail: vi.fn(),
    executePhase: vi.fn(),
    updateApproval: vi.fn(),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: vi.fn(),
    executeBugPhase: vi.fn(),
    getAgents: vi.fn(),
    stopAgent: vi.fn(),
    resumeAgent: vi.fn(),
    sendAgentInput: vi.fn(),
    getAgentLogs: vi.fn(),
    executeDocumentReview: vi.fn(),
    executeInspection: vi.fn(),
    startAutoExecution: vi.fn(),
    stopAutoExecution: vi.fn(),
    getAutoExecutionStatus: vi.fn(),
    saveFile: vi.fn(),
    onSpecsUpdated: vi.fn(() => () => {}),
    onBugsUpdated: vi.fn(() => () => {}),
    onAgentOutput: vi.fn(() => () => {}),
    onAgentStatusChange: vi.fn(() => () => {}),
    onAutoExecutionStatusChanged: vi.fn(() => () => {}),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('bugStore - createBug', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should create bug successfully via ApiClient', async () => {
    const mockAgentInfo: AgentInfo = {
      id: 'agent-1',
      specId: 'test-bug',
      phase: 'bug-create',
      status: 'running',
      startedAt: Date.now(),
    };

    const mockApiClient = createMockApiClient({
      createBug: vi.fn().mockResolvedValue({ ok: true, value: mockAgentInfo }),
    });

    const result = await useSharedBugStore.getState().createBug(mockApiClient, 'test-bug', 'Test bug description');

    expect(result).toBe(true);
    expect(mockApiClient.createBug).toHaveBeenCalledWith('test-bug', 'Test bug description');
    expect(useSharedBugStore.getState().isCreating).toBe(false);
    expect(useSharedBugStore.getState().error).toBeNull();
  });

  it('should handle createBug failure', async () => {
    const mockApiClient = createMockApiClient({
      createBug: vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'CREATE_ERROR', message: 'Failed to create bug' },
      }),
    });

    const result = await useSharedBugStore.getState().createBug(mockApiClient, 'test-bug', 'Test bug description');

    expect(result).toBe(false);
    expect(useSharedBugStore.getState().isCreating).toBe(false);
    expect(useSharedBugStore.getState().error).toBe('Failed to create bug');
  });

  it('should handle ApiClient without createBug method', async () => {
    const mockApiClient = createMockApiClient();
    // Remove createBug method
    delete (mockApiClient as Partial<ApiClient>).createBug;

    const result = await useSharedBugStore.getState().createBug(mockApiClient, 'test-bug', 'Test bug description');

    expect(result).toBe(false);
    expect(useSharedBugStore.getState().error).toBe('Bug creation not supported');
  });

  it('should set isCreating during creation', async () => {
    let resolvePromise: (value: { ok: boolean; value?: AgentInfo }) => void;
    const pendingPromise = new Promise<{ ok: boolean; value?: AgentInfo }>((resolve) => {
      resolvePromise = resolve;
    });

    const mockApiClient = createMockApiClient({
      createBug: vi.fn().mockReturnValue(pendingPromise),
    });

    const createPromise = useSharedBugStore.getState().createBug(mockApiClient, 'test-bug', 'Test bug description');

    // Check isCreating is true while creating
    expect(useSharedBugStore.getState().isCreating).toBe(true);

    // Resolve the promise
    resolvePromise!({ ok: true, value: { id: 'agent-1' } as AgentInfo });
    await createPromise;

    // Check isCreating is false after completion
    expect(useSharedBugStore.getState().isCreating).toBe(false);
  });
});

describe('bugStore - setUseWorktree', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should set useWorktree to true', () => {
    expect(useSharedBugStore.getState().useWorktree).toBe(false);

    useSharedBugStore.getState().setUseWorktree(true);

    expect(useSharedBugStore.getState().useWorktree).toBe(true);
  });

  it('should set useWorktree to false', () => {
    useSharedBugStore.getState().setUseWorktree(true);
    expect(useSharedBugStore.getState().useWorktree).toBe(true);

    useSharedBugStore.getState().setUseWorktree(false);
    expect(useSharedBugStore.getState().useWorktree).toBe(false);
  });

  it('should persist useWorktree value in store', () => {
    useSharedBugStore.getState().setUseWorktree(true);

    // Get store again and check value persists
    expect(useSharedBugStore.getState().useWorktree).toBe(true);
  });
});

describe('bugStore - loadBugs', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should load bugs via ApiClient', async () => {
    const mockBugs: BugMetadata[] = [
      { name: 'bug-1', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z' },
      { name: 'bug-2', phase: 'analyzed', updatedAt: '2026-01-22T00:00:00Z' },
    ];

    const mockApiClient = createMockApiClient({
      getBugs: vi.fn().mockResolvedValue({ ok: true, value: mockBugs }),
    });

    await useSharedBugStore.getState().loadBugs(mockApiClient);

    expect(useSharedBugStore.getState().bugs).toEqual(mockBugs);
    expect(useSharedBugStore.getState().isLoading).toBe(false);
    expect(useSharedBugStore.getState().error).toBeNull();
  });
});

describe('bugStore - resetSharedBugStore', () => {
  it('should reset all state including new fields', () => {
    // Set some state
    useSharedBugStore.getState().setUseWorktree(true);
    useSharedBugStore.getState().selectBug('test-bug');

    // Reset
    resetSharedBugStore();

    // Check all state is reset
    const state = useSharedBugStore.getState();
    expect(state.bugs).toEqual([]);
    expect(state.selectedBugId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.useWorktree).toBe(false);
    expect(state.isCreating).toBe(false);
  });
});
