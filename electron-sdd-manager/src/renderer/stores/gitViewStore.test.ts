/**
 * GitView Store Tests
 * Requirements: 4.1, 4.2
 * Test-Driven Development: Tests written before implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGitViewStore } from './gitViewStore';
import type { ApiClient, GitStatusResult } from '@shared/api/types';
import type { Result, ApiError } from '@shared/types';

// Mock ApiClient
const createMockApiClient = (): ApiClient => ({
  getGitStatus: vi.fn(),
  getGitDiff: vi.fn(),
  startWatching: vi.fn(),
  stopWatching: vi.fn(),
  // Other required ApiClient methods (not used in these tests)
  getSpecs: vi.fn(),
  getSpecDetail: vi.fn(),
  executePhase: vi.fn(),
  updateApproval: vi.fn(),
  getBugs: vi.fn(),
  getBugDetail: vi.fn(),
  executeBugPhase: vi.fn(),
  getAgents: vi.fn(),
  stopAgent: vi.fn(),
  resumeAgent: vi.fn(),
  sendAgentInput: vi.fn(),
  getAgentLogs: vi.fn(),
  executeProjectCommand: vi.fn(),
  executeDocumentReview: vi.fn(),
  executeInspection: vi.fn(),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  getAutoExecutionStatus: vi.fn(),
  saveFile: vi.fn(),
  onSpecsUpdated: vi.fn(),
  onBugsUpdated: vi.fn(),
  onAgentOutput: vi.fn(),
  onAgentStatusChange: vi.fn(),
  onAutoExecutionStatusChanged: vi.fn(),
  switchAgentWatchScope: vi.fn(),
  startBugsWatcher: vi.fn(),
  stopBugsWatcher: vi.fn(),
  onBugsChanged: vi.fn(),
});

describe('gitViewStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useGitViewStore.getState();
    store.selectedFilePath = null;
    store.expandedDirs = new Map();
    store.diffMode = 'unified';
    store.fileTreeWidth = 300;
    store.cachedStatus = null;
    store.cachedDiffContent = null;
    store.isLoading = false;
    store.error = null;
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useGitViewStore.getState();

      expect(state.selectedFilePath).toBeNull();
      expect(state.expandedDirs).toBeInstanceOf(Map);
      expect(state.expandedDirs.size).toBe(0);
      expect(state.diffMode).toBe('unified');
      expect(state.fileTreeWidth).toBe(300);
      expect(state.cachedStatus).toBeNull();
      expect(state.cachedDiffContent).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('selectFile', () => {
    it('should select file and fetch diff content successfully', async () => {
      const mockApiClient = createMockApiClient();
      const mockDiff = 'diff --git a/file.ts b/file.ts\n+added line';

      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: true,
        value: mockDiff,
      });

      const store = useGitViewStore.getState();
      await store.selectFile(mockApiClient, 'src/file.ts');

      const state = useGitViewStore.getState();
      expect(state.selectedFilePath).toBe('src/file.ts');
      expect(state.cachedDiffContent).toBe(mockDiff);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockApiClient.getGitDiff).toHaveBeenCalledWith('', 'src/file.ts');
    });

    it('should handle getGitDiff error', async () => {
      const mockApiClient = createMockApiClient();
      const mockError: ApiError = {
        type: 'git_error',
        message: 'Failed to get diff',
      };

      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: false,
        error: mockError,
      });

      const store = useGitViewStore.getState();
      await store.selectFile(mockApiClient, 'src/file.ts');

      const state = useGitViewStore.getState();
      expect(state.selectedFilePath).toBe('src/file.ts');
      expect(state.cachedDiffContent).toBeNull();
      expect(state.error).toBe('Failed to get diff');
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading to true while fetching', async () => {
      const mockApiClient = createMockApiClient();

      // Create a promise that we can resolve manually
      let resolveGetDiff: (value: Result<string, ApiError>) => void;
      const getDiffPromise = new Promise<Result<string, ApiError>>((resolve) => {
        resolveGetDiff = resolve;
      });

      vi.mocked(mockApiClient.getGitDiff).mockReturnValue(getDiffPromise);

      const store = useGitViewStore.getState();
      const selectPromise = store.selectFile(mockApiClient, 'src/file.ts');

      // Check loading state immediately
      const loadingState = useGitViewStore.getState();
      expect(loadingState.isLoading).toBe(true);

      // Resolve the promise
      resolveGetDiff!({ ok: true, value: 'diff content' });
      await selectPromise;

      const finalState = useGitViewStore.getState();
      expect(finalState.isLoading).toBe(false);
    });
  });

  describe('toggleDir', () => {
    it('should toggle directory expansion state', () => {
      const store = useGitViewStore.getState();

      // Initially not expanded
      expect(store.expandedDirs.get('src')).toBeUndefined();

      // Toggle to expand
      store.toggleDir('src');
      let state = useGitViewStore.getState();
      expect(state.expandedDirs.get('src')).toBe(true);

      // Toggle to collapse
      store.toggleDir('src');
      state = useGitViewStore.getState();
      expect(state.expandedDirs.get('src')).toBe(false);
    });

    it('should handle multiple directories independently', () => {
      const store = useGitViewStore.getState();

      store.toggleDir('src');
      store.toggleDir('tests');

      const state = useGitViewStore.getState();
      expect(state.expandedDirs.get('src')).toBe(true);
      expect(state.expandedDirs.get('tests')).toBe(true);

      store.toggleDir('src');
      const updatedState = useGitViewStore.getState();
      expect(updatedState.expandedDirs.get('src')).toBe(false);
      expect(updatedState.expandedDirs.get('tests')).toBe(true);
    });
  });

  describe('setDiffMode', () => {
    it('should update diff mode to split', () => {
      const store = useGitViewStore.getState();
      store.setDiffMode('split');

      const state = useGitViewStore.getState();
      expect(state.diffMode).toBe('split');
    });

    it('should update diff mode to unified', () => {
      const store = useGitViewStore.getState();
      store.setDiffMode('split');
      store.setDiffMode('unified');

      const state = useGitViewStore.getState();
      expect(state.diffMode).toBe('unified');
    });
  });

  describe('setFileTreeWidth', () => {
    it('should update file tree width', () => {
      const store = useGitViewStore.getState();
      store.setFileTreeWidth(400);

      const state = useGitViewStore.getState();
      expect(state.fileTreeWidth).toBe(400);
    });
  });

  describe('refreshStatus', () => {
    it('should fetch and cache git status', async () => {
      const mockApiClient = createMockApiClient();
      const mockStatus: GitStatusResult = {
        files: [
          { path: 'src/file1.ts', status: 'M' },
          { path: 'src/file2.ts', status: 'A' },
        ],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });

      const store = useGitViewStore.getState();
      await store.refreshStatus(mockApiClient);

      const state = useGitViewStore.getState();
      expect(state.cachedStatus).toEqual(mockStatus);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockApiClient.getGitStatus).toHaveBeenCalledWith('');
    });

    it('should handle getGitStatus error', async () => {
      const mockApiClient = createMockApiClient();
      const mockError: ApiError = {
        type: 'git_error',
        message: 'Not a git repository',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: false,
        error: mockError,
      });

      const store = useGitViewStore.getState();
      await store.refreshStatus(mockApiClient);

      const state = useGitViewStore.getState();
      expect(state.cachedStatus).toBeNull();
      expect(state.error).toBe('Not a git repository');
      expect(state.isLoading).toBe(false);
    });

    it('should clear selected file if it no longer exists in new status', async () => {
      const mockApiClient = createMockApiClient();
      const initialStatus: GitStatusResult = {
        files: [
          { path: 'src/file1.ts', status: 'M' },
          { path: 'src/file2.ts', status: 'A' },
        ],
        mode: 'normal',
      };

      // Set initial state with selected file
      const store = useGitViewStore.getState();
      store.selectedFilePath = 'src/file2.ts';
      store.cachedStatus = initialStatus;

      // New status without the previously selected file
      const newStatus: GitStatusResult = {
        files: [
          { path: 'src/file1.ts', status: 'M' },
        ],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: newStatus,
      });

      await store.refreshStatus(mockApiClient);

      const state = useGitViewStore.getState();
      expect(state.selectedFilePath).toBeNull();
      expect(state.cachedDiffContent).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      const store = useGitViewStore.getState();
      store.error = 'Test error';

      store.clearError();

      const state = useGitViewStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
