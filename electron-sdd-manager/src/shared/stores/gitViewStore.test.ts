/**
 * Shared GitView Store Tests
 * Requirements: 4.1, 4.2, 10.3, 10.4, 12.3
 * TDD: Test-first development
 *
 * worktree-gitview-diff-bug: Added worktree mode tests
 * - Worktree status caching with baseBranch
 * - Override projectPath for worktree environments
 * - Diff fetching with explicit worktree path
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
  onAgentLog: vi.fn(() => () => {}),
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

  // ============================================================
  // worktree-gitview-diff-bug: Worktree Mode Tests
  // ============================================================
  describe('Worktree Mode Support', () => {
    const WORKTREE_PATH = '/test/project/.kiro/worktrees/specs/my-feature';

    describe('refreshStatus with overrideProjectPath', () => {
      it('should use overrideProjectPath instead of getProjectPath() when provided', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [{ path: 'src/feature.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });

        const store = useSharedGitViewStore.getState();
        await store.refreshStatus(mockApiClient, WORKTREE_PATH);

        // Should have been called with worktree path
        expect(mockApiClient.getGitStatus).toHaveBeenCalledWith(WORKTREE_PATH);
        // Should NOT have been called with default project path
        expect(mockApiClient.getGitStatus).not.toHaveBeenCalledWith('/test/project');
      });

      it('should cache worktree status with baseBranch', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [
            { path: 'src/feature.ts', status: 'A' },
            { path: 'src/oldFile.ts', status: 'D' },
          ],
          baseBranch: 'master',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });

        const store = useSharedGitViewStore.getState();
        await store.refreshStatus(mockApiClient, WORKTREE_PATH);

        const state = useSharedGitViewStore.getState();
        expect(state.cachedStatus).toEqual(mockWorktreeStatus);
        expect(state.cachedStatus?.mode).toBe('worktree');
        expect(state.cachedStatus?.baseBranch).toBe('master');
        expect(state.cachedStatus?.files).toHaveLength(2);
      });

      it('should fallback to getProjectPath() when overrideProjectPath is not provided', async () => {
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

        // Should have been called with default project path from getProjectPath()
        expect(mockApiClient.getGitStatus).toHaveBeenCalledWith('/test/project');
      });
    });

    describe('selectFile with overrideProjectPath', () => {
      it('should use overrideProjectPath for getGitDiff when provided', async () => {
        const mockDiffContent = 'diff --git a/src/feature.ts b/src/feature.ts\n...';

        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: true,
          value: mockDiffContent,
        });

        const store = useSharedGitViewStore.getState();
        await store.selectFile(mockApiClient, 'src/feature.ts', WORKTREE_PATH);

        // Should have been called with worktree path
        expect(mockApiClient.getGitDiff).toHaveBeenCalledWith(WORKTREE_PATH, 'src/feature.ts');
        // Should NOT have been called with default project path
        expect(mockApiClient.getGitDiff).not.toHaveBeenCalledWith('/test/project', 'src/feature.ts');
      });

      it('should cache diff content from worktree', async () => {
        const mockDiffContent = `diff --git a/src/feature.ts b/src/feature.ts
index abc123..def456 100644
--- a/src/feature.ts
+++ b/src/feature.ts
@@ -1,3 +1,5 @@
+// Worktree changes
 export function feature() {
   return true;
 }`;

        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: true,
          value: mockDiffContent,
        });

        const store = useSharedGitViewStore.getState();
        await store.selectFile(mockApiClient, 'src/feature.ts', WORKTREE_PATH);

        const state = useSharedGitViewStore.getState();
        expect(state.cachedDiffContent).toBe(mockDiffContent);
        expect(state.selectedFilePath).toBe('src/feature.ts');
      });

      it('should fallback to getProjectPath() when overrideProjectPath is not provided', async () => {
        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: true,
          value: 'diff content',
        });

        const store = useSharedGitViewStore.getState();
        await store.selectFile(mockApiClient, 'src/file.ts');

        // Should have been called with default project path
        expect(mockApiClient.getGitDiff).toHaveBeenCalledWith('/test/project', 'src/file.ts');
      });
    });

    describe('Worktree mode error handling', () => {
      it('should handle worktree status fetch error', async () => {
        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: false,
          error: { type: 'git_error', message: 'Worktree not found' },
        });

        const store = useSharedGitViewStore.getState();
        await store.refreshStatus(mockApiClient, WORKTREE_PATH);

        const state = useSharedGitViewStore.getState();
        expect(state.error).toBe('Worktree not found');
        expect(state.cachedStatus).toBeNull();
        expect(state.isLoading).toBe(false);
      });

      it('should handle worktree diff fetch error (baseBranch not found)', async () => {
        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: false,
          error: { type: 'git_error', message: 'Failed to get diff: baseBranch main not found' },
        });

        const store = useSharedGitViewStore.getState();
        await store.selectFile(mockApiClient, 'src/feature.ts', WORKTREE_PATH);

        const state = useSharedGitViewStore.getState();
        expect(state.error).toBe('Failed to get diff: baseBranch main not found');
        expect(state.cachedDiffContent).toBeNull();
        expect(state.selectedFilePath).toBe('src/feature.ts');
      });

      it('should handle empty diff in worktree (no changes from baseBranch)', async () => {
        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: true,
          value: '', // Empty diff - no changes
        });

        const store = useSharedGitViewStore.getState();
        await store.selectFile(mockApiClient, 'src/unchanged.ts', WORKTREE_PATH);

        const state = useSharedGitViewStore.getState();
        expect(state.cachedDiffContent).toBe('');
        expect(state.error).toBeNull();
      });
    });

    describe('Worktree lazy loading', () => {
      it('should NOT fetch diff when refreshStatus is called with worktree path', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [
            { path: 'src/file1.ts', status: 'M' },
            { path: 'src/file2.ts', status: 'A' },
          ],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });

        const store = useSharedGitViewStore.getState();
        await store.refreshStatus(mockApiClient, WORKTREE_PATH);

        // getGitDiff should NOT have been called
        expect(mockApiClient.getGitDiff).not.toHaveBeenCalled();
      });

      it('should fetch diff ONLY when selectFile is called with worktree path', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [
            { path: 'src/file1.ts', status: 'M' },
            { path: 'src/file2.ts', status: 'A' },
          ],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: true,
          value: 'worktree diff content',
        });

        const store = useSharedGitViewStore.getState();

        // Step 1: Refresh status (should NOT fetch any diffs)
        await store.refreshStatus(mockApiClient, WORKTREE_PATH);
        expect(mockApiClient.getGitDiff).not.toHaveBeenCalled();

        // Step 2: Select a file (should fetch diff for ONLY that file)
        await store.selectFile(mockApiClient, 'src/file1.ts', WORKTREE_PATH);
        expect(mockApiClient.getGitDiff).toHaveBeenCalledTimes(1);
        expect(mockApiClient.getGitDiff).toHaveBeenCalledWith(WORKTREE_PATH, 'src/file1.ts');
      });
    });
  });

  // ============================================================
  // git-view-source-mode: diffMode Extension Tests
  // Task 5.1: diffMode type extension to include 'source'
  // Requirements: 2.4
  // ============================================================
  describe('diffMode extension (git-view-source-mode feature)', () => {
    it('should allow setting diffMode to source', () => {
      const store = useSharedGitViewStore.getState();

      store.setDiffMode('source');
      const state = useSharedGitViewStore.getState();
      expect(state.diffMode).toBe('source');
    });

    it('should allow switching between unified, split, and source modes', () => {
      const store = useSharedGitViewStore.getState();

      store.setDiffMode('source');
      expect(useSharedGitViewStore.getState().diffMode).toBe('source');

      store.setDiffMode('split');
      expect(useSharedGitViewStore.getState().diffMode).toBe('split');

      store.setDiffMode('unified');
      expect(useSharedGitViewStore.getState().diffMode).toBe('unified');
    });

    it('should reset diffMode to unified on reset', async () => {
      const store = useSharedGitViewStore.getState();
      store.setDiffMode('source');

      store.reset();

      const state = useSharedGitViewStore.getState();
      expect(state.diffMode).toBe('unified');
    });

    it('should fetch file content when selecting file in source mode', async () => {
      const mockFileContent = {
        content: 'const hello = "world";',
        isBase64: false,
        fileType: 'code' as const,
        language: 'typescript',
      };

      const apiClientWithFileContent = {
        ...mockApiClient,
        readFileContent: vi.fn().mockResolvedValue({
          ok: true,
          value: mockFileContent,
        }),
      };

      const store = useSharedGitViewStore.getState();
      store.setDiffMode('source');
      await store.selectFile(apiClientWithFileContent, 'src/file.ts');

      // In source mode, readFileContent should be called instead of getGitDiff
      expect(apiClientWithFileContent.readFileContent).toHaveBeenCalledWith(
        '/test/project',
        'src/file.ts'
      );
      expect(apiClientWithFileContent.getGitDiff).not.toHaveBeenCalled();

      const state = useSharedGitViewStore.getState();
      expect(state.cachedFileContent).toEqual(mockFileContent);
    });

    it('should fetch diff content when selecting file in unified/split mode', async () => {
      const diffContent = 'diff --git a/file.ts b/file.ts...';

      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: true,
        value: diffContent,
      });

      const store = useSharedGitViewStore.getState();
      // Default is unified mode
      await store.selectFile(mockApiClient, 'src/file.ts');

      expect(mockApiClient.getGitDiff).toHaveBeenCalledWith('/test/project', 'src/file.ts');

      const state = useSharedGitViewStore.getState();
      expect(state.cachedDiffContent).toBe(diffContent);
    });

    it('should have null cachedFileContent initially', () => {
      const state = useSharedGitViewStore.getState();
      expect(state.cachedFileContent).toBe(null);
    });

    it('should clear cachedFileContent on reset', async () => {
      const mockFileContent = {
        content: 'const hello = "world";',
        isBase64: false,
        fileType: 'code' as const,
        language: 'typescript',
      };

      const apiClientWithFileContent = {
        ...mockApiClient,
        readFileContent: vi.fn().mockResolvedValue({
          ok: true,
          value: mockFileContent,
        }),
      };

      const store = useSharedGitViewStore.getState();
      store.setDiffMode('source');
      await store.selectFile(apiClientWithFileContent, 'src/file.ts');

      store.reset();

      const state = useSharedGitViewStore.getState();
      expect(state.cachedFileContent).toBe(null);
    });
  });

  describe('zoom state (git-view-source-mode feature)', () => {
    it('should have default imageZoom as 1', () => {
      const state = useSharedGitViewStore.getState();
      expect(state.imageZoom).toBe(1);
    });

    it('should update imageZoom', () => {
      const store = useSharedGitViewStore.getState();

      store.setImageZoom(2.5);
      const state = useSharedGitViewStore.getState();
      expect(state.imageZoom).toBe(2.5);
    });

    it('should reset imageZoom to 1 on reset', () => {
      const store = useSharedGitViewStore.getState();
      store.setImageZoom(3);

      store.reset();

      const state = useSharedGitViewStore.getState();
      expect(state.imageZoom).toBe(1);
    });
  });
});
