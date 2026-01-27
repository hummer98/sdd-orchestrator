/**
 * Shared GitView Store Tests
 * Requirements: 4.1, 4.2, 10.3, 10.4, 12.3
 * TDD: Test-first development
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSharedGitViewStore, resetSharedGitViewStore } from './gitViewStore';
import type { ApiClient, GitStatusResult } from '@shared/api/types';

// Mock ApiClient
const mockApiClient: ApiClient = {
  getGitStatus: vi.fn(),
  getGitDiff: vi.fn(),
  startWatching: vi.fn(),
  stopWatching: vi.fn(),
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
  onSpecsUpdated: vi.fn(() => () => {}),
  onBugsUpdated: vi.fn(() => () => {}),
  onAgentOutput: vi.fn(() => () => {}),
  onAgentStatusChange: vi.fn(() => () => {}),
  onAutoExecutionStatusChanged: vi.fn(() => () => {}),
  switchAgentWatchScope: vi.fn(),
  startBugsWatcher: vi.fn(),
  stopBugsWatcher: vi.fn(),
  onBugsChanged: vi.fn(() => () => {}),
  getProjectPath: vi.fn(() => '/test/project'),
};

describe('Shared GitView Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSharedGitViewStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 4.1: gitViewStore creation', () => {
    it('should have initial state with null values', () => {
      const state = useSharedGitViewStore.getState();
      expect(state.selectedFilePath).toBe(null);
      expect(state.cachedStatus).toBe(null);
      expect(state.cachedDiffContent).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should have default diffMode as unified', () => {
      const state = useSharedGitViewStore.getState();
      expect(state.diffMode).toBe('unified');
    });

    it('should have default fileTreeWidth of 300', () => {
      const state = useSharedGitViewStore.getState();
      expect(state.fileTreeWidth).toBe(300);
    });
  });

  describe('Requirement 4.2: git diff data caching', () => {
    it('should cache status result after refreshStatus', async () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'src/file.ts', status: 'M' }],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });

      const store = useSharedGitViewStore.getState();
      await store.refreshStatus(mockApiClient);

      const newState = useSharedGitViewStore.getState();
      expect(newState.cachedStatus).toEqual(mockStatus);
    });

    it('should cache diff content after selectFile', async () => {
      const diffContent = 'diff --git a/file.ts b/file.ts...';

      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: true,
        value: diffContent,
      });

      const store = useSharedGitViewStore.getState();
      await store.selectFile(mockApiClient, 'src/file.ts');

      const newState = useSharedGitViewStore.getState();
      expect(newState.cachedDiffContent).toBe(diffContent);
      expect(newState.selectedFilePath).toBe('src/file.ts');
    });
  });

  describe('Requirement 10.3, 10.4: Shared store for Electron and Remote UI', () => {
    it('should be usable with different ApiClient implementations', async () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'src/file.ts', status: 'M' }],
        mode: 'normal',
      };

      // Simulate WebSocket ApiClient
      const webSocketApiClient: ApiClient = {
        ...mockApiClient,
        getGitStatus: vi.fn().mockResolvedValue({
          ok: true,
          value: mockStatus,
        }),
      };

      const store = useSharedGitViewStore.getState();
      await store.refreshStatus(webSocketApiClient);

      const newState = useSharedGitViewStore.getState();
      expect(newState.cachedStatus).toEqual(mockStatus);
      expect(webSocketApiClient.getGitStatus).toHaveBeenCalled();
    });
  });

  describe('Requirement 12.3: Lazy loading for diff fetching', () => {
    it('should NOT fetch diff content when refreshStatus is called', async () => {
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

      const store = useSharedGitViewStore.getState();
      await store.refreshStatus(mockApiClient);

      // getGitDiff should NOT have been called
      expect(mockApiClient.getGitDiff).not.toHaveBeenCalled();
    });

    it('should fetch diff content ONLY when selectFile is called', async () => {
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
      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: true,
        value: 'diff content for file1',
      });

      const store = useSharedGitViewStore.getState();

      // Step 1: Refresh status (should NOT fetch any diffs)
      await store.refreshStatus(mockApiClient);
      expect(mockApiClient.getGitDiff).not.toHaveBeenCalled();

      // Step 2: Select a file (should fetch diff for ONLY that file)
      await store.selectFile(mockApiClient, 'src/file1.ts');
      expect(mockApiClient.getGitDiff).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getGitDiff).toHaveBeenCalledWith('/test/project', 'src/file1.ts');
    });

    it('should fetch diff content for each file selection individually', async () => {
      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: true,
        value: 'diff content',
      });

      const store = useSharedGitViewStore.getState();

      // Select first file
      await store.selectFile(mockApiClient, 'src/file1.ts');
      expect(mockApiClient.getGitDiff).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getGitDiff).toHaveBeenLastCalledWith('/test/project', 'src/file1.ts');

      // Select second file (should trigger new fetch)
      await store.selectFile(mockApiClient, 'src/file2.ts');
      expect(mockApiClient.getGitDiff).toHaveBeenCalledTimes(2);
      expect(mockApiClient.getGitDiff).toHaveBeenLastCalledWith('/test/project', 'src/file2.ts');
    });
  });

  describe('toggleDir', () => {
    it('should toggle directory expansion state', () => {
      const store = useSharedGitViewStore.getState();

      // Initially not expanded
      expect(store.expandedDirs.get('src')).toBeUndefined();

      // Toggle to expand
      store.toggleDir('src');
      let state = useSharedGitViewStore.getState();
      expect(state.expandedDirs.get('src')).toBe(true);

      // Toggle to collapse
      store.toggleDir('src');
      state = useSharedGitViewStore.getState();
      expect(state.expandedDirs.get('src')).toBe(false);
    });
  });

  describe('setDiffMode', () => {
    it('should update diff mode', () => {
      const store = useSharedGitViewStore.getState();

      store.setDiffMode('split');
      let state = useSharedGitViewStore.getState();
      expect(state.diffMode).toBe('split');

      store.setDiffMode('unified');
      state = useSharedGitViewStore.getState();
      expect(state.diffMode).toBe('unified');
    });
  });

  describe('setFileTreeWidth', () => {
    it('should update file tree width', () => {
      const store = useSharedGitViewStore.getState();

      store.setFileTreeWidth(400);
      const state = useSharedGitViewStore.getState();
      expect(state.fileTreeWidth).toBe(400);
    });
  });

  describe('clearError', () => {
    it('should clear error message', async () => {
      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: false,
        error: { type: 'git_error', message: 'Test error' },
      });

      const store = useSharedGitViewStore.getState();
      await store.refreshStatus(mockApiClient);

      let state = useSharedGitViewStore.getState();
      expect(state.error).toBe('Test error');

      store.clearError();
      state = useSharedGitViewStore.getState();
      expect(state.error).toBe(null);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', async () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'src/file.ts', status: 'M' }],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });

      const store = useSharedGitViewStore.getState();
      await store.refreshStatus(mockApiClient);
      store.setDiffMode('split');
      store.setFileTreeWidth(500);

      // Reset
      store.reset();

      const state = useSharedGitViewStore.getState();
      expect(state.selectedFilePath).toBe(null);
      expect(state.cachedStatus).toBe(null);
      expect(state.cachedDiffContent).toBe(null);
      expect(state.diffMode).toBe('unified');
      expect(state.fileTreeWidth).toBe(300);
    });
  });
});
