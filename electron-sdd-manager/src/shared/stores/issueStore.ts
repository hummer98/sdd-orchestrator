/**
 * Shared issueStore
 *
 * github-issue-integration: Task 6.1
 * Requirements: 2.2, 2.3, 2.5, 2.6, 9.1
 *
 * Zustand vanilla store for GitHub Issue/PR state management.
 * Uses vanillaClient to call issueRouter tRPC procedures.
 * Provides:
 * - Issue/PR list caching (SSOT is GitHub API)
 * - Selected Issue/PR state
 * - Filter state (state, labels, assignee, milestone)
 * - Pagination (hasMore, currentPage)
 * - Polling control (60s interval, manual refresh, latest-wins concurrency)
 * - tRPC Subscription for real-time update notifications
 */

import { createStore } from 'zustand/vanilla';
import { getVanillaClient } from '../trpc/vanillaClient';
import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubComment,
  ConnectionStatus,
  IssueFilters,
} from '../types/github';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PER_PAGE = 30;
const POLLING_INTERVAL_MS = 60_000;

// =============================================================================
// Types
// =============================================================================

export interface IssueStoreState {
  // Data (cache from GitHub API)
  issues: GitHubIssue[];
  pullRequests: GitHubPullRequest[];
  selectedIssueNumber: number | null;
  selectedPRNumber: number | null;
  issueDetail: GitHubIssue | null;
  issueComments: GitHubComment[];
  prDetail: GitHubPullRequest | null;

  // Connection
  connectionStatus: ConnectionStatus;

  // Filters
  filters: IssueFilters;

  // Pagination
  hasMore: boolean;
  currentPage: number;

  // Loading
  isLoading: boolean;
  error: string | null;
}

export interface IssueStoreActions {
  loadIssues: (projectPath: string) => Promise<void>;
  loadMoreIssues: (projectPath: string) => Promise<void>;
  loadPullRequests: (projectPath: string) => Promise<void>;
  selectIssue: (number: number | null) => void;
  selectPR: (number: number | null) => void;
  setFilters: (filters: Partial<IssueFilters>) => void;
  refresh: (projectPath: string) => Promise<void>;
  checkConnection: (projectPath: string) => Promise<void>;
  startPolling: (projectPath: string) => void;
  stopPolling: () => void;
  reset: () => void;
}

export type IssueStore = IssueStoreState & IssueStoreActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: IssueStoreState = {
  issues: [],
  pullRequests: [],
  selectedIssueNumber: null,
  selectedPRNumber: null,
  issueDetail: null,
  issueComments: [],
  prDetail: null,
  connectionStatus: {
    configured: false,
    connected: false,
    user: null,
    repoInfo: null,
    error: null,
  },
  filters: {},
  hasMore: true,
  currentPage: 1,
  isLoading: false,
  error: null,
};

// =============================================================================
// Polling state (module-level)
// =============================================================================

let pollingTimer: ReturnType<typeof setInterval> | null = null;

// Concurrency control: increment on each load to discard stale responses
let loadRequestId = 0;

// =============================================================================
// Store
// =============================================================================

export const issueStore = createStore<IssueStore>((set, get) => ({
  ...initialState,

  // =========================================================================
  // loadIssues - Load first page, reset pagination
  // =========================================================================
  loadIssues: async (projectPath: string) => {
    const requestId = ++loadRequestId;
    const { filters } = get();

    set({ isLoading: true, error: null });

    try {
      const result = await getVanillaClient().issue.listIssues.query({
        projectPath,
        filters: { ...filters, page: 1, per_page: DEFAULT_PER_PAGE },
      });

      // Discard if a newer request has been issued
      if (requestId !== loadRequestId) return;

      const issues = result as GitHubIssue[];
      set({
        issues,
        currentPage: 1,
        hasMore: issues.length >= DEFAULT_PER_PAGE,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (requestId !== loadRequestId) return;
      set({
        error: error instanceof Error ? error.message : 'Failed to load issues',
        isLoading: false,
      });
    }
  },

  // =========================================================================
  // loadMoreIssues - Append next page
  // =========================================================================
  loadMoreIssues: async (projectPath: string) => {
    const { hasMore, isLoading, currentPage, filters, issues } = get();

    if (!hasMore || isLoading) return;

    const nextPage = currentPage + 1;
    set({ isLoading: true, error: null });

    try {
      const result = await getVanillaClient().issue.listIssues.query({
        projectPath,
        filters: { ...filters, page: nextPage, per_page: DEFAULT_PER_PAGE },
      });

      const newIssues = result as GitHubIssue[];
      set({
        issues: [...issues, ...newIssues],
        currentPage: nextPage,
        hasMore: newIssues.length >= DEFAULT_PER_PAGE,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load more issues',
        isLoading: false,
      });
    }
  },

  // =========================================================================
  // loadPullRequests
  // =========================================================================
  loadPullRequests: async (projectPath: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await getVanillaClient().issue.listPullRequests.query({
        projectPath,
      });

      set({
        pullRequests: result as GitHubPullRequest[],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load pull requests',
        isLoading: false,
      });
    }
  },

  // =========================================================================
  // selectIssue / selectPR
  // =========================================================================
  selectIssue: (number: number | null) => {
    set({
      selectedIssueNumber: number,
      selectedPRNumber: null,
      // Clear detail states when selection changes
      issueDetail: null,
      issueComments: [],
    });
  },

  selectPR: (number: number | null) => {
    set({
      selectedPRNumber: number,
      selectedIssueNumber: null,
      prDetail: null,
    });
  },

  // =========================================================================
  // setFilters - Merge partial filters, reset pagination
  // =========================================================================
  setFilters: (newFilters: Partial<IssueFilters>) => {
    const { filters } = get();
    set({
      filters: { ...filters, ...newFilters },
      currentPage: 1,
    });
  },

  // =========================================================================
  // refresh - Reload issues and PRs (manual refresh)
  // =========================================================================
  refresh: async (projectPath: string) => {
    const store = get();
    await Promise.all([
      store.loadIssues(projectPath),
      store.loadPullRequests(projectPath),
    ]);
  },

  // =========================================================================
  // checkConnection
  // =========================================================================
  checkConnection: async (projectPath: string) => {
    try {
      const status = await getVanillaClient().issue.getConnectionStatus.query({
        projectPath,
      });
      set({ connectionStatus: status as ConnectionStatus });
    } catch (error) {
      set({
        connectionStatus: {
          configured: false,
          connected: false,
          user: null,
          repoInfo: null,
          error: error instanceof Error ? error.message : 'Connection check failed',
        },
      });
    }
  },

  // =========================================================================
  // Polling control (60s interval)
  // =========================================================================
  startPolling: (projectPath: string) => {
    // Prevent multiple intervals
    if (pollingTimer !== null) return;

    pollingTimer = setInterval(() => {
      const store = get();
      store.loadIssues(projectPath);
      store.loadPullRequests(projectPath);
    }, POLLING_INTERVAL_MS);
  },

  stopPolling: () => {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  },

  // =========================================================================
  // reset
  // =========================================================================
  reset: () => {
    // Stop polling
    if (pollingTimer !== null) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }

    // Reset concurrency counter
    loadRequestId = 0;

    set(initialState);
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for tests)
 */
export function resetIssueStore(): void {
  if (pollingTimer !== null) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  loadRequestId = 0;
  issueStore.setState(initialState);
}

/**
 * Get current store state (for tests)
 */
export function getIssueStore(): IssueStore {
  return issueStore.getState();
}
