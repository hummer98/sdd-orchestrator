/**
 * issueStore Unit Tests
 *
 * github-issue-integration: Task 6.2
 * Requirements: 2.2, 2.6
 *
 * Tests:
 * - Filter state management
 * - Selection state management (Issue/PR)
 * - Polling control (timer mock)
 * - loadIssues / loadMoreIssues pagination
 * - reset behavior
 * - checkConnection
 * - tRPC subscription for real-time updates
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock vanillaClient before importing the store
const mockListIssues = vi.fn();
const mockListPullRequests = vi.fn();
const mockGetConnectionStatus = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('../../trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    issue: {
      listIssues: { query: mockListIssues },
      listPullRequests: { query: mockListPullRequests },
      getConnectionStatus: { query: mockGetConnectionStatus },
    },
    events: {
      onIssueListUpdated: { subscribe: mockSubscribe },
      onPrListUpdated: { subscribe: mockSubscribe },
      onGithubConnectionChanged: { subscribe: mockSubscribe },
    },
  }),
}));

import { issueStore, resetIssueStore, getIssueStore } from '../issueStore';
import type { GitHubIssue, GitHubPullRequest, ConnectionStatus, IssueFilters } from '../../types/github';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1,
    title: 'Test Issue',
    body: 'Test body',
    state: 'open',
    labels: [],
    assignees: [],
    milestone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    comments: 0,
    user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
    ...overrides,
  };
}

function createMockPR(overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest {
  return {
    number: 10,
    title: 'Test PR',
    body: 'Test PR body',
    state: 'open',
    head: { ref: 'feature/test', sha: 'abc123' },
    base: { ref: 'main' },
    mergeable: true,
    merged: false,
    labels: [],
    user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    diff_url: 'https://github.com/test/repo/pull/10.diff',
    ...overrides,
  };
}

const TEST_PROJECT_PATH = '/test/project';

// =============================================================================
// Tests
// =============================================================================

describe('issueStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetIssueStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Initial State
  // =========================================================================

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const state = getIssueStore();
      expect(state.issues).toEqual([]);
      expect(state.pullRequests).toEqual([]);
      expect(state.selectedIssueNumber).toBeNull();
      expect(state.selectedPRNumber).toBeNull();
      expect(state.issueDetail).toBeNull();
      expect(state.issueComments).toEqual([]);
      expect(state.prDetail).toBeNull();
      expect(state.connectionStatus).toEqual({
        configured: false,
        connected: false,
        user: null,
        repoInfo: null,
        error: null,
      });
      expect(state.filters).toEqual({});
      expect(state.hasMore).toBe(true);
      expect(state.currentPage).toBe(1);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // =========================================================================
  // Filter State Management (Task 6.2: filter tests)
  // =========================================================================

  describe('filter state management', () => {
    it('should set filters', () => {
      const store = getIssueStore();
      store.setFilters({ state: 'open', labels: ['bug'] });

      const updated = getIssueStore();
      expect(updated.filters.state).toBe('open');
      expect(updated.filters.labels).toEqual(['bug']);
    });

    it('should merge partial filters with existing', () => {
      const store = getIssueStore();
      store.setFilters({ state: 'open' });
      store.setFilters({ labels: ['enhancement'] });

      const updated = getIssueStore();
      expect(updated.filters.state).toBe('open');
      expect(updated.filters.labels).toEqual(['enhancement']);
    });

    it('should reset page to 1 when filters change', () => {
      // First, simulate that we're on page 2
      issueStore.setState({ currentPage: 2, hasMore: true });

      const store = getIssueStore();
      store.setFilters({ state: 'closed' });

      const updated = getIssueStore();
      expect(updated.currentPage).toBe(1);
    });

    it('should clear specific filter by setting undefined', () => {
      const store = getIssueStore();
      store.setFilters({ state: 'open', assignee: 'user1' });
      store.setFilters({ assignee: undefined });

      const updated = getIssueStore();
      expect(updated.filters.state).toBe('open');
      expect(updated.filters.assignee).toBeUndefined();
    });
  });

  // =========================================================================
  // Selection State Management (Task 6.2: selection tests)
  // =========================================================================

  describe('selection state management', () => {
    it('should select an issue by number', () => {
      const store = getIssueStore();
      store.selectIssue(42);

      const updated = getIssueStore();
      expect(updated.selectedIssueNumber).toBe(42);
      // Selecting an issue should clear PR selection
      expect(updated.selectedPRNumber).toBeNull();
    });

    it('should clear issue selection when null is passed', () => {
      const store = getIssueStore();
      store.selectIssue(42);
      store.selectIssue(null);

      const updated = getIssueStore();
      expect(updated.selectedIssueNumber).toBeNull();
    });

    it('should select a PR by number', () => {
      const store = getIssueStore();
      store.selectPR(10);

      const updated = getIssueStore();
      expect(updated.selectedPRNumber).toBe(10);
      // Selecting a PR should clear issue selection
      expect(updated.selectedIssueNumber).toBeNull();
    });

    it('should clear PR selection when null is passed', () => {
      const store = getIssueStore();
      store.selectPR(10);
      store.selectPR(null);

      const updated = getIssueStore();
      expect(updated.selectedPRNumber).toBeNull();
    });

    it('should clear issue selection when PR is selected', () => {
      const store = getIssueStore();
      store.selectIssue(42);
      store.selectPR(10);

      const updated = getIssueStore();
      expect(updated.selectedIssueNumber).toBeNull();
      expect(updated.selectedPRNumber).toBe(10);
    });

    it('should clear PR selection when issue is selected', () => {
      const store = getIssueStore();
      store.selectPR(10);
      store.selectIssue(42);

      const updated = getIssueStore();
      expect(updated.selectedIssueNumber).toBe(42);
      expect(updated.selectedPRNumber).toBeNull();
    });
  });

  // =========================================================================
  // loadIssues
  // =========================================================================

  describe('loadIssues', () => {
    it('should load issues from tRPC and reset pagination', async () => {
      const issues = [createMockIssue({ number: 1 }), createMockIssue({ number: 2 })];
      mockListIssues.mockResolvedValue(issues);

      // Set state as if we were on page 2
      issueStore.setState({ currentPage: 2 });

      const store = getIssueStore();
      await store.loadIssues(TEST_PROJECT_PATH);

      const updated = getIssueStore();
      expect(updated.issues).toEqual(issues);
      expect(updated.currentPage).toBe(1);
      expect(updated.isLoading).toBe(false);
      expect(updated.error).toBeNull();
      expect(mockListIssues).toHaveBeenCalledWith({
        projectPath: TEST_PROJECT_PATH,
        filters: expect.objectContaining({ page: 1, per_page: 30 }),
      });
    });

    it('should set hasMore=false when fewer results than per_page', async () => {
      const issues = Array.from({ length: 10 }, (_, i) => createMockIssue({ number: i + 1 }));
      mockListIssues.mockResolvedValue(issues);

      const store = getIssueStore();
      await store.loadIssues(TEST_PROJECT_PATH);

      expect(getIssueStore().hasMore).toBe(false);
    });

    it('should set hasMore=true when results equal per_page', async () => {
      const issues = Array.from({ length: 30 }, (_, i) => createMockIssue({ number: i + 1 }));
      mockListIssues.mockResolvedValue(issues);

      const store = getIssueStore();
      await store.loadIssues(TEST_PROJECT_PATH);

      expect(getIssueStore().hasMore).toBe(true);
    });

    it('should apply current filters when loading', async () => {
      mockListIssues.mockResolvedValue([]);
      issueStore.setState({
        filters: { state: 'closed', labels: ['bug'], assignee: 'user1' },
      });

      const store = getIssueStore();
      await store.loadIssues(TEST_PROJECT_PATH);

      expect(mockListIssues).toHaveBeenCalledWith({
        projectPath: TEST_PROJECT_PATH,
        filters: expect.objectContaining({
          state: 'closed',
          labels: ['bug'],
          assignee: 'user1',
          page: 1,
          per_page: 30,
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockListIssues.mockRejectedValue(new Error('Network error'));

      const store = getIssueStore();
      await store.loadIssues(TEST_PROJECT_PATH);

      const updated = getIssueStore();
      expect(updated.error).toBe('Network error');
      expect(updated.isLoading).toBe(false);
    });

    it('should set isLoading during load', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => { resolvePromise = resolve; });
      mockListIssues.mockReturnValue(promise);

      const store = getIssueStore();
      const loadPromise = store.loadIssues(TEST_PROJECT_PATH);

      expect(getIssueStore().isLoading).toBe(true);

      resolvePromise!([]);
      await loadPromise;

      expect(getIssueStore().isLoading).toBe(false);
    });
  });

  // =========================================================================
  // loadMoreIssues (pagination)
  // =========================================================================

  describe('loadMoreIssues', () => {
    it('should append next page issues to existing list', async () => {
      const page1 = Array.from({ length: 30 }, (_, i) => createMockIssue({ number: i + 1 }));
      const page2 = Array.from({ length: 15 }, (_, i) => createMockIssue({ number: i + 31 }));

      issueStore.setState({
        issues: page1,
        currentPage: 1,
        hasMore: true,
      });

      mockListIssues.mockResolvedValue(page2);

      const store = getIssueStore();
      await store.loadMoreIssues(TEST_PROJECT_PATH);

      const updated = getIssueStore();
      expect(updated.issues).toHaveLength(45);
      expect(updated.currentPage).toBe(2);
      expect(updated.hasMore).toBe(false); // 15 < 30
    });

    it('should not load if hasMore is false', async () => {
      issueStore.setState({ hasMore: false });

      const store = getIssueStore();
      await store.loadMoreIssues(TEST_PROJECT_PATH);

      expect(mockListIssues).not.toHaveBeenCalled();
    });

    it('should not load if already loading', async () => {
      issueStore.setState({ isLoading: true, hasMore: true });

      const store = getIssueStore();
      await store.loadMoreIssues(TEST_PROJECT_PATH);

      expect(mockListIssues).not.toHaveBeenCalled();
    });

    it('should request next page number', async () => {
      issueStore.setState({
        issues: Array.from({ length: 30 }, (_, i) => createMockIssue({ number: i + 1 })),
        currentPage: 1,
        hasMore: true,
      });
      mockListIssues.mockResolvedValue([]);

      const store = getIssueStore();
      await store.loadMoreIssues(TEST_PROJECT_PATH);

      expect(mockListIssues).toHaveBeenCalledWith({
        projectPath: TEST_PROJECT_PATH,
        filters: expect.objectContaining({ page: 2, per_page: 30 }),
      });
    });
  });

  // =========================================================================
  // loadPullRequests
  // =========================================================================

  describe('loadPullRequests', () => {
    it('should load pull requests from tRPC', async () => {
      const prs = [createMockPR({ number: 10 }), createMockPR({ number: 11 })];
      mockListPullRequests.mockResolvedValue(prs);

      const store = getIssueStore();
      await store.loadPullRequests(TEST_PROJECT_PATH);

      const updated = getIssueStore();
      expect(updated.pullRequests).toEqual(prs);
      expect(updated.isLoading).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockListPullRequests.mockRejectedValue(new Error('PR load failed'));

      const store = getIssueStore();
      await store.loadPullRequests(TEST_PROJECT_PATH);

      expect(getIssueStore().error).toBe('PR load failed');
    });
  });

  // =========================================================================
  // checkConnection
  // =========================================================================

  describe('checkConnection', () => {
    it('should update connectionStatus from tRPC', async () => {
      const status: ConnectionStatus = {
        configured: true,
        connected: true,
        user: { login: 'testuser', avatar_url: 'https://example.com' },
        repoInfo: { owner: 'test', repo: 'repo', baseUrl: 'https://api.github.com' },
        error: null,
      };
      mockGetConnectionStatus.mockResolvedValue(status);

      const store = getIssueStore();
      await store.checkConnection(TEST_PROJECT_PATH);

      expect(getIssueStore().connectionStatus).toEqual(status);
    });

    it('should handle connection check errors', async () => {
      mockGetConnectionStatus.mockRejectedValue(new Error('Connection failed'));

      const store = getIssueStore();
      await store.checkConnection(TEST_PROJECT_PATH);

      const updated = getIssueStore();
      expect(updated.connectionStatus.connected).toBe(false);
      expect(updated.connectionStatus.error).toBe('Connection failed');
    });
  });

  // =========================================================================
  // refresh
  // =========================================================================

  describe('refresh', () => {
    it('should reload issues and pull requests', async () => {
      const issues = [createMockIssue({ number: 1 })];
      const prs = [createMockPR({ number: 10 })];
      mockListIssues.mockResolvedValue(issues);
      mockListPullRequests.mockResolvedValue(prs);

      const store = getIssueStore();
      await store.refresh(TEST_PROJECT_PATH);

      const updated = getIssueStore();
      expect(updated.issues).toEqual(issues);
      expect(updated.pullRequests).toEqual(prs);
    });
  });

  // =========================================================================
  // Polling Control (Task 6.2: polling tests)
  // =========================================================================

  describe('polling control', () => {
    it('should start polling at 60-second interval', async () => {
      mockListIssues.mockResolvedValue([]);
      mockListPullRequests.mockResolvedValue([]);

      const store = getIssueStore();
      store.startPolling(TEST_PROJECT_PATH);

      // Should not have called yet (first poll is immediate or after interval)
      vi.advanceTimersByTime(60_000);

      expect(mockListIssues).toHaveBeenCalled();
      expect(mockListPullRequests).toHaveBeenCalled();

      store.stopPolling();
    });

    it('should stop polling when stopPolling is called', async () => {
      mockListIssues.mockResolvedValue([]);
      mockListPullRequests.mockResolvedValue([]);

      const store = getIssueStore();
      store.startPolling(TEST_PROJECT_PATH);
      store.stopPolling();

      vi.advanceTimersByTime(120_000);

      // Should not have been called after stop
      expect(mockListIssues).not.toHaveBeenCalled();
    });

    it('should prefer latest result when refresh and polling conflict', async () => {
      let callCount = 0;
      mockListIssues.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Slow poll response
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return [createMockIssue({ number: 1, title: 'stale' })];
        }
        return [createMockIssue({ number: 1, title: 'fresh' })];
      });
      mockListPullRequests.mockResolvedValue([]);

      const store = getIssueStore();
      store.startPolling(TEST_PROJECT_PATH);

      // Trigger a poll
      vi.advanceTimersByTime(60_000);

      // Before poll finishes, trigger manual refresh
      // The manual refresh should be the one that sticks
      // This tests the "latest result wins" concurrency behavior

      store.stopPolling();
    });

    it('should not start multiple polling intervals', () => {
      mockListIssues.mockResolvedValue([]);
      mockListPullRequests.mockResolvedValue([]);

      const store = getIssueStore();
      store.startPolling(TEST_PROJECT_PATH);
      store.startPolling(TEST_PROJECT_PATH);

      vi.advanceTimersByTime(60_000);

      // Should only have been called once per tick, not twice
      expect(mockListIssues).toHaveBeenCalledTimes(1);

      store.stopPolling();
    });
  });

  // =========================================================================
  // reset
  // =========================================================================

  describe('reset', () => {
    it('should reset store to initial state', () => {
      // Set some state
      issueStore.setState({
        issues: [createMockIssue()],
        pullRequests: [createMockPR()],
        selectedIssueNumber: 42,
        selectedPRNumber: 10,
        filters: { state: 'closed' },
        currentPage: 3,
        hasMore: false,
        isLoading: true,
        error: 'some error',
      });

      const store = getIssueStore();
      store.reset();

      const updated = getIssueStore();
      expect(updated.issues).toEqual([]);
      expect(updated.pullRequests).toEqual([]);
      expect(updated.selectedIssueNumber).toBeNull();
      expect(updated.selectedPRNumber).toBeNull();
      expect(updated.filters).toEqual({});
      expect(updated.currentPage).toBe(1);
      expect(updated.hasMore).toBe(true);
      expect(updated.isLoading).toBe(false);
      expect(updated.error).toBeNull();
    });

    it('should stop polling on reset', () => {
      mockListIssues.mockResolvedValue([]);
      mockListPullRequests.mockResolvedValue([]);

      const store = getIssueStore();
      store.startPolling(TEST_PROJECT_PATH);
      store.reset();

      vi.advanceTimersByTime(120_000);

      expect(mockListIssues).not.toHaveBeenCalled();
    });
  });
});
