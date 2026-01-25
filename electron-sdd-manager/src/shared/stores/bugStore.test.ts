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
import type { ApiClient, AgentInfo, BugMetadata, BugDetail, BugsChangeEvent } from '../api/types';

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
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: null }),
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
    // bugs-view-unification: Bug monitoring methods
    switchAgentWatchScope: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    startBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    stopBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onBugsChanged: vi.fn(() => () => {}),
    executeAskProject: vi.fn(),
    ...overrides,
  } as ApiClient;
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

    // Reset
    resetSharedBugStore();

    // Check all state is reset
    const state = useSharedBugStore.getState();
    expect(state.bugs).toEqual([]);
    expect(state.selectedBugId).toBeNull();
    expect(state.bugDetail).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.useWorktree).toBe(false);
    expect(state.isCreating).toBe(false);
    expect(state.isWatching).toBe(false);
  });
});

// =============================================================================
// Task 2.1: bugDetail management tests (bugs-view-unification)
// Requirements: 3.1, 3.2, 3.8
// =============================================================================

describe('bugStore - selectBug with bugDetail', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should fetch bugDetail when selecting a bug', async () => {
    const mockBugDetail = {
      metadata: {
        name: 'test-bug',
        phase: 'reported' as const,
        updatedAt: '2026-01-22T00:00:00Z',
        reportedAt: '2026-01-22T00:00:00Z',
      },
      artifacts: {
        report: { exists: true, path: '/path/to/report.md', updatedAt: '2026-01-22T00:00:00Z' },
        analysis: null,
        fix: null,
        verification: null,
      },
    };

    const mockApiClient = createMockApiClient({
      getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: mockBugDetail }),
      switchAgentWatchScope: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    });

    await useSharedBugStore.getState().selectBug(mockApiClient, 'test-bug');

    expect(useSharedBugStore.getState().selectedBugId).toBe('test-bug');
    expect(useSharedBugStore.getState().bugDetail).toEqual(mockBugDetail);
    expect(mockApiClient.getBugDetail).toHaveBeenCalledWith('test-bug');
    expect(mockApiClient.switchAgentWatchScope).toHaveBeenCalledWith('bug:test-bug');
  });

  it('should handle selectBug with null to clear selection', async () => {
    // First select a bug
    const mockApiClient = createMockApiClient({
      getBugDetail: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          metadata: { name: 'test-bug', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z' },
          artifacts: { report: null, analysis: null, fix: null, verification: null },
        },
      }),
      switchAgentWatchScope: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    });

    await useSharedBugStore.getState().selectBug(mockApiClient, 'test-bug');
    expect(useSharedBugStore.getState().selectedBugId).toBe('test-bug');

    // Then clear selection
    await useSharedBugStore.getState().selectBug(mockApiClient, null);

    expect(useSharedBugStore.getState().selectedBugId).toBeNull();
    expect(useSharedBugStore.getState().bugDetail).toBeNull();
  });

  it('should handle getBugDetail error', async () => {
    const mockApiClient = createMockApiClient({
      getBugDetail: vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', message: 'Bug not found' },
      }),
      switchAgentWatchScope: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    });

    await useSharedBugStore.getState().selectBug(mockApiClient, 'nonexistent-bug');

    expect(useSharedBugStore.getState().error).toBe('Bug not found');
    expect(useSharedBugStore.getState().bugDetail).toBeNull();
  });
});

describe('bugStore - clearSelectedBug', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should clear selectedBugId and bugDetail', () => {
    // Set initial state
    useSharedBugStore.setState({
      selectedBugId: 'test-bug',
      bugDetail: {
        metadata: { name: 'test-bug', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
        artifacts: { report: null, analysis: null, fix: null, verification: null },
      },
    });

    useSharedBugStore.getState().clearSelectedBug();

    expect(useSharedBugStore.getState().selectedBugId).toBeNull();
    expect(useSharedBugStore.getState().bugDetail).toBeNull();
  });
});

describe('bugStore - refreshBugDetail', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should refresh bugDetail for currently selected bug', async () => {
    const initialDetail = {
      metadata: { name: 'test-bug', phase: 'reported' as const, updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
      artifacts: { report: null, analysis: null, fix: null, verification: null },
    };

    const updatedDetail = {
      metadata: { name: 'test-bug', phase: 'analyzed' as const, updatedAt: '2026-01-23T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
      artifacts: {
        report: { exists: true, path: '/path/to/report.md', updatedAt: '2026-01-22T00:00:00Z' },
        analysis: { exists: true, path: '/path/to/analysis.md', updatedAt: '2026-01-23T00:00:00Z' },
        fix: null,
        verification: null,
      },
    };

    useSharedBugStore.setState({
      selectedBugId: 'test-bug',
      bugDetail: initialDetail,
    });

    const mockApiClient = createMockApiClient({
      getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: updatedDetail }),
    });

    await useSharedBugStore.getState().refreshBugDetail(mockApiClient);

    expect(useSharedBugStore.getState().bugDetail).toEqual(updatedDetail);
    expect(mockApiClient.getBugDetail).toHaveBeenCalledWith('test-bug');
  });

  it('should do nothing if no bug is selected', async () => {
    const mockApiClient = createMockApiClient();

    await useSharedBugStore.getState().refreshBugDetail(mockApiClient);

    expect(mockApiClient.getBugDetail).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Task 2.2: handleBugsChanged tests (bugs-view-unification)
// Requirements: 3.3, 3.4, 3.5, 3.6
// =============================================================================

describe('bugStore - handleBugsChanged', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should add new bug on "add" event', async () => {
    const existingBugs: BugMetadata[] = [
      { name: 'bug-1', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
    ];

    useSharedBugStore.setState({ bugs: existingBugs });

    const mockApiClient = createMockApiClient({
      getBugs: vi.fn().mockResolvedValue({
        ok: true,
        value: [
          ...existingBugs,
          { name: 'bug-2', phase: 'reported', updatedAt: '2026-01-23T00:00:00Z', reportedAt: '2026-01-23T00:00:00Z' },
        ],
      }),
    });

    await useSharedBugStore.getState().handleBugsChanged(mockApiClient, {
      type: 'add',
      path: '/path/to/bug-2',
      bugName: 'bug-2',
    });

    expect(useSharedBugStore.getState().bugs).toHaveLength(2);
    expect(useSharedBugStore.getState().bugs.find(b => b.name === 'bug-2')).toBeDefined();
  });

  it('should update bug metadata on "change" event', async () => {
    const existingBugs: BugMetadata[] = [
      { name: 'bug-1', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
    ];

    useSharedBugStore.setState({ bugs: existingBugs });

    const updatedBugs: BugMetadata[] = [
      { name: 'bug-1', phase: 'analyzed', updatedAt: '2026-01-23T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
    ];

    const mockApiClient = createMockApiClient({
      getBugs: vi.fn().mockResolvedValue({ ok: true, value: updatedBugs }),
    });

    await useSharedBugStore.getState().handleBugsChanged(mockApiClient, {
      type: 'change',
      path: '/path/to/bug-1',
      bugName: 'bug-1',
    });

    expect(useSharedBugStore.getState().bugs[0].phase).toBe('analyzed');
  });

  it('should refresh bugDetail if selected bug is changed', async () => {
    const initialBug: BugMetadata = { name: 'bug-1', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' };
    const initialDetail = {
      metadata: initialBug,
      artifacts: { report: null, analysis: null, fix: null, verification: null },
    };

    useSharedBugStore.setState({
      bugs: [initialBug],
      selectedBugId: 'bug-1',
      bugDetail: initialDetail,
    });

    const updatedDetail = {
      metadata: { ...initialBug, phase: 'analyzed' as const, updatedAt: '2026-01-23T00:00:00Z' },
      artifacts: {
        report: { exists: true, path: '/path/to/report.md', updatedAt: '2026-01-22T00:00:00Z' },
        analysis: { exists: true, path: '/path/to/analysis.md', updatedAt: '2026-01-23T00:00:00Z' },
        fix: null,
        verification: null,
      },
    };

    const mockApiClient = createMockApiClient({
      getBugs: vi.fn().mockResolvedValue({
        ok: true,
        value: [{ ...initialBug, phase: 'analyzed', updatedAt: '2026-01-23T00:00:00Z' }],
      }),
      getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: updatedDetail }),
    });

    await useSharedBugStore.getState().handleBugsChanged(mockApiClient, {
      type: 'change',
      path: '/path/to/bug-1',
      bugName: 'bug-1',
    });

    expect(mockApiClient.getBugDetail).toHaveBeenCalledWith('bug-1');
    expect(useSharedBugStore.getState().bugDetail).toEqual(updatedDetail);
  });

  it('should remove bug and clear selection on "unlinkDir" event', async () => {
    const existingBugs: BugMetadata[] = [
      { name: 'bug-1', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
      { name: 'bug-2', phase: 'analyzed', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
    ];

    useSharedBugStore.setState({
      bugs: existingBugs,
      selectedBugId: 'bug-1',
      bugDetail: {
        metadata: existingBugs[0],
        artifacts: { report: null, analysis: null, fix: null, verification: null },
      },
    });

    const mockApiClient = createMockApiClient();

    await useSharedBugStore.getState().handleBugsChanged(mockApiClient, {
      type: 'unlinkDir',
      path: '/path/to/bug-1',
      bugName: 'bug-1',
    });

    expect(useSharedBugStore.getState().bugs).toHaveLength(1);
    expect(useSharedBugStore.getState().bugs[0].name).toBe('bug-2');
    expect(useSharedBugStore.getState().selectedBugId).toBeNull();
    expect(useSharedBugStore.getState().bugDetail).toBeNull();
  });

  it('should not clear selection if different bug is deleted', async () => {
    const existingBugs: BugMetadata[] = [
      { name: 'bug-1', phase: 'reported', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
      { name: 'bug-2', phase: 'analyzed', updatedAt: '2026-01-22T00:00:00Z', reportedAt: '2026-01-22T00:00:00Z' },
    ];

    useSharedBugStore.setState({
      bugs: existingBugs,
      selectedBugId: 'bug-1',
      bugDetail: {
        metadata: existingBugs[0],
        artifacts: { report: null, analysis: null, fix: null, verification: null },
      },
    });

    const mockApiClient = createMockApiClient();

    await useSharedBugStore.getState().handleBugsChanged(mockApiClient, {
      type: 'unlinkDir',
      path: '/path/to/bug-2',
      bugName: 'bug-2',
    });

    expect(useSharedBugStore.getState().bugs).toHaveLength(1);
    expect(useSharedBugStore.getState().selectedBugId).toBe('bug-1');
    expect(useSharedBugStore.getState().bugDetail).not.toBeNull();
  });
});

// =============================================================================
// Task 2.3: startWatching/stopWatching tests (bugs-view-unification)
// Requirements: 3.7
// =============================================================================

describe('bugStore - startWatching/stopWatching', () => {
  beforeEach(() => {
    resetSharedBugStore();
  });

  it('should set isWatching to true and subscribe to events', () => {
    const unsubscribeMock = vi.fn();
    const mockApiClient = createMockApiClient({
      startBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      onBugsChanged: vi.fn().mockReturnValue(unsubscribeMock),
    });

    useSharedBugStore.getState().startWatching(mockApiClient);

    expect(useSharedBugStore.getState().isWatching).toBe(true);
    // Note: startBugsWatcher is NOT called here - Watcher is started by Main Process in SELECT_PROJECT IPC handler
    // Renderer side only registers event listener (same pattern as specWatcherService)
    expect(mockApiClient.startBugsWatcher).not.toHaveBeenCalled();
    expect(mockApiClient.onBugsChanged).toHaveBeenCalled();
  });

  it('should set isWatching to false and unsubscribe', () => {
    const unsubscribeMock = vi.fn();
    const mockApiClient = createMockApiClient({
      startBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      stopBugsWatcher: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      onBugsChanged: vi.fn().mockReturnValue(unsubscribeMock),
    });

    // Start watching first
    useSharedBugStore.getState().startWatching(mockApiClient);
    expect(useSharedBugStore.getState().isWatching).toBe(true);

    // Stop watching
    useSharedBugStore.getState().stopWatching(mockApiClient);

    expect(useSharedBugStore.getState().isWatching).toBe(false);
    expect(mockApiClient.stopBugsWatcher).toHaveBeenCalled();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
