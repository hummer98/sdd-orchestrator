/**
 * GitView Integration Tests
 * Requirements: 3.1, 3.2, 6.2, 6.3, 10.4
 * Tasks: 13.1, 13.2, 13.6, 13.7
 *
 * Integration tests for GitView component interactions
 *
 * worktree-gitview-diff-bug: Added worktree mode integration tests
 * - Worktree mode status and diff fetching
 * - workingPath prop usage for worktree environments
 * - baseBranch handling in worktree mode
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { GitView } from './GitView';
import { useSharedGitViewStore, resetSharedGitViewStore } from '@shared/stores/gitViewStore';
import type { ApiClient, GitStatusResult } from '@shared/api/types';

// Mock ApiClient
const createMockApiClient = (): ApiClient => ({
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
  startBugsWatcher: vi.fn(),
  stopBugsWatcher: vi.fn(),
  onBugsChanged: vi.fn(() => () => {}),
  getProjectPath: vi.fn(() => '/test/project'),
});

let mockApiClient: ApiClient;

// Mock the ApiClientProvider context
vi.mock('@shared/api/ApiClientProvider', () => ({
  useApi: () => mockApiClient,
}));

// trpc-full-migration Task 11.4: Mock tRPC vanilla client for git change subscriptions
const mockOnGitChangesDetected = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });

vi.mock('../../trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    events: {
      onGitChangesDetected: { subscribe: mockOnGitChangesDetected },
    },
  }),
}));

// Set electronTRPC on window to simulate Electron environment
Object.defineProperty(window, 'electronTRPC', {
  value: {},
  writable: true,
  configurable: true,
});

describe('GitView Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = createMockApiClient();
    resetSharedGitViewStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 13.1: Renderer -> Main git:get-status IPC Integration', () => {
    it('should fetch git status on mount and update store', async () => {
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
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      await waitFor(() => {
        // Verify API was called
        expect(mockApiClient.getGitStatus).toHaveBeenCalledWith('/test/project');
      });

      await waitFor(() => {
        // Verify store was updated
        const state = useSharedGitViewStore.getState();
        expect(state.cachedStatus).toEqual(mockStatus);
        expect(state.isLoading).toBe(false);
      });
    });

    it('should handle error response and update store error state', async () => {
      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: false,
        error: { type: 'git_error', message: 'Not a git repository' },
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      await waitFor(() => {
        const state = useSharedGitViewStore.getState();
        expect(state.error).toBe('Not a git repository');
        expect(state.isLoading).toBe(false);
      });

      // Verify error is displayed
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });

  describe('Task 13.2: File Watch Event Broadcast Integration', () => {
    it('should subscribe to git:changes-detected events on mount', async () => {
      const mockStatus: GitStatusResult = {
        files: [],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      await waitFor(() => {
        // Should have subscribed to changes
        expect(mockOnGitChangesDetected).toHaveBeenCalled();
      });
    });

    it('should call startWatching on mount and stopWatching on unmount', async () => {
      const mockStatus: GitStatusResult = {
        files: [],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });
      vi.mocked(mockApiClient.stopWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const { unmount } = render(<GitView />);

      await waitFor(() => {
        expect(mockApiClient.startWatching).toHaveBeenCalledWith('/test/project');
      });

      unmount();

      expect(mockApiClient.stopWatching).toHaveBeenCalledWith('/test/project');
    });
  });

  describe('Task 13.6: Remote UI Integration', () => {
    it('should work with WebSocket-based ApiClient (mock)', async () => {
      // Simulate WebSocket API client behavior
      const webSocketApiClient = createMockApiClient();
      mockApiClient = webSocketApiClient;

      const mockStatus: GitStatusResult = {
        files: [{ path: 'remote-file.ts', status: 'M' }],
        mode: 'normal',
      };

      vi.mocked(webSocketApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });
      vi.mocked(webSocketApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      await waitFor(() => {
        expect(webSocketApiClient.getGitStatus).toHaveBeenCalled();
      });

      await waitFor(() => {
        const state = useSharedGitViewStore.getState();
        expect(state.cachedStatus).toEqual(mockStatus);
      });
    });

    it('should display error when WebSocket connection fails', async () => {
      vi.mocked(mockApiClient.getGitStatus).mockRejectedValue(
        new Error('WebSocket connection failed')
      );
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      await waitFor(() => {
        const state = useSharedGitViewStore.getState();
        expect(state.error).toBe('WebSocket connection failed');
      });
    });
  });

  describe('Task 13.7: gitViewStore State Sync Integration', () => {
    it('should update store state when file is selected', async () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'src/file.ts', status: 'M' }],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });
      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: true,
        value: 'diff content',
      });

      // Pre-expand directories
      useSharedGitViewStore.setState({
        expandedDirs: new Map([['src', true]]),
      });

      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
      });

      // Click on a file
      const fileNode = await screen.findByTestId('file-node-src/file.ts');
      fireEvent.click(fileNode);

      await waitFor(() => {
        const state = useSharedGitViewStore.getState();
        expect(state.selectedFilePath).toBe('src/file.ts');
      });
    });

    it('should preserve store state across re-renders', async () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'src/file.ts', status: 'M' }],
        mode: 'normal',
      };

      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockStatus,
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      // Set initial state
      useSharedGitViewStore.setState({
        diffMode: 'split',
        fileTreeWidth: 400,
      });

      const { rerender } = render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
      });

      // Re-render component
      rerender(<GitView />);

      // Verify state is preserved
      const state = useSharedGitViewStore.getState();
      expect(state.diffMode).toBe('split');
      expect(state.fileTreeWidth).toBe(400);
    });
  });

  // ============================================================
  // worktree-gitview-diff-bug: Worktree Mode Integration Tests
  // ============================================================
  describe('Worktree Mode Integration', () => {
    const WORKTREE_PATH = '/test/project/.kiro/worktrees/specs/my-feature';

    describe('workingPath prop usage', () => {
      it('should use workingPath instead of getProjectPath() when provided', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [
            { path: '.kiro/specs/my-feature/requirements.md', status: 'M' },
            { path: 'src/newFile.ts', status: 'A' },
          ],
          baseBranch: 'master',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          // Verify API was called with worktree path, not default project path
          expect(mockApiClient.getGitStatus).toHaveBeenCalledWith(WORKTREE_PATH);
          expect(mockApiClient.getGitStatus).not.toHaveBeenCalledWith('/test/project');
        });

        await waitFor(() => {
          expect(mockApiClient.startWatching).toHaveBeenCalledWith(WORKTREE_PATH);
        });
      });

      it('should stop watching worktree path on unmount', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [],
          baseBranch: 'master',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        vi.mocked(mockApiClient.stopWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        const { unmount } = render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          expect(mockApiClient.startWatching).toHaveBeenCalledWith(WORKTREE_PATH);
        });

        unmount();

        expect(mockApiClient.stopWatching).toHaveBeenCalledWith(WORKTREE_PATH);
      });
    });

    describe('Worktree status fetching', () => {
      it('should fetch and display worktree mode status with baseBranch', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [
            { path: '.kiro/specs/my-feature/design.md', status: 'M' },
            { path: 'src/feature.ts', status: 'A' },
            { path: 'src/oldFile.ts', status: 'D' },
          ],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          const state = useSharedGitViewStore.getState();
          expect(state.cachedStatus).toEqual(mockWorktreeStatus);
          expect(state.cachedStatus?.mode).toBe('worktree');
          expect(state.cachedStatus?.baseBranch).toBe('main');
        });
      });

      it('should handle worktree with no changes (empty diff)', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [],
          baseBranch: 'master',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          const state = useSharedGitViewStore.getState();
          expect(state.cachedStatus?.files).toHaveLength(0);
          expect(state.cachedStatus?.mode).toBe('worktree');
        });

        // Verify empty state message is shown
        await waitFor(() => {
          expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
        });
      });
    });

    describe('Worktree diff fetching', () => {
      it('should fetch diff using workingPath when file is selected in worktree', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [{ path: 'src/feature.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        };

        const mockDiffContent = `diff --git a/src/feature.ts b/src/feature.ts
index abc123..def456 100644
--- a/src/feature.ts
+++ b/src/feature.ts
@@ -1,3 +1,5 @@
+// New feature implementation
 export function feature() {
+  console.log('worktree changes');
   return true;
 }`;

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: true,
          value: mockDiffContent,
        });

        // Pre-expand directories
        useSharedGitViewStore.setState({
          expandedDirs: new Map([['src', true]]),
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
        });

        // Click on a file
        const fileNode = await screen.findByTestId('file-node-src/feature.ts');
        fireEvent.click(fileNode);

        await waitFor(() => {
          // Verify getGitDiff was called with worktree path
          expect(mockApiClient.getGitDiff).toHaveBeenCalledWith(WORKTREE_PATH, 'src/feature.ts');
        });

        await waitFor(() => {
          const state = useSharedGitViewStore.getState();
          expect(state.cachedDiffContent).toBe(mockDiffContent);
          expect(state.selectedFilePath).toBe('src/feature.ts');
        });
      });

      it('should handle empty diff response in worktree mode', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [{ path: 'src/unchanged.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        // Empty diff (file listed but no actual diff - edge case)
        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: true,
          value: '',
        });

        useSharedGitViewStore.setState({
          expandedDirs: new Map([['src', true]]),
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
        });

        const fileNode = await screen.findByTestId('file-node-src/unchanged.ts');
        fireEvent.click(fileNode);

        await waitFor(() => {
          const state = useSharedGitViewStore.getState();
          expect(state.cachedDiffContent).toBe('');
          expect(state.selectedFilePath).toBe('src/unchanged.ts');
        });
      });

      it('should handle diff fetch error in worktree mode', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [{ path: 'src/error.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });
        vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
          ok: false,
          error: { type: 'git_error', message: 'Failed to get diff: baseBranch not found' },
        });

        useSharedGitViewStore.setState({
          expandedDirs: new Map([['src', true]]),
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
        });

        const fileNode = await screen.findByTestId('file-node-src/error.ts');
        fireEvent.click(fileNode);

        await waitFor(() => {
          const state = useSharedGitViewStore.getState();
          expect(state.error).toBe('Failed to get diff: baseBranch not found');
          expect(state.cachedDiffContent).toBeNull();
        });
      });
    });

    describe('Worktree change detection', () => {
      it('should refresh status when git changes are detected in worktree path', async () => {
        const initialStatus: GitStatusResult = {
          files: [{ path: 'src/file.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        };

        const updatedStatus: GitStatusResult = {
          files: [
            { path: 'src/file.ts', status: 'M' },
            { path: 'src/newFile.ts', status: 'A' },
          ],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus)
          .mockResolvedValueOnce({ ok: true, value: initialStatus })
          .mockResolvedValueOnce({ ok: true, value: updatedStatus });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        // trpc-full-migration Task 11.4: Capture the onData callback from tRPC subscribe
        let onDataCallback: ((data: { projectPath: string }) => void) | null = null;
        mockOnGitChangesDetected.mockImplementation((_input: unknown, opts: { onData: (data: { projectPath: string }) => void }) => {
          onDataCallback = opts.onData;
          return { unsubscribe: vi.fn() };
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          expect(mockApiClient.getGitStatus).toHaveBeenCalledTimes(1);
        });

        // Simulate git changes detected in worktree
        if (onDataCallback) {
          await act(async () => {
            onDataCallback!({ projectPath: WORKTREE_PATH });
          });
        }

        await waitFor(() => {
          expect(mockApiClient.getGitStatus).toHaveBeenCalledTimes(2);
          const state = useSharedGitViewStore.getState();
          expect(state.cachedStatus?.files).toHaveLength(2);
        });
      });

      it('should NOT refresh status when changes are detected in different path', async () => {
        const mockWorktreeStatus: GitStatusResult = {
          files: [{ path: 'src/file.ts', status: 'M' }],
          baseBranch: 'main',
          mode: 'worktree',
        };

        vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
          ok: true,
          value: mockWorktreeStatus,
        });
        vi.mocked(mockApiClient.startWatching).mockResolvedValue({
          ok: true,
          value: undefined,
        });

        // trpc-full-migration Task 11.4: Capture the onData callback from tRPC subscribe
        let onDataCallback: ((data: { projectPath: string }) => void) | null = null;
        mockOnGitChangesDetected.mockImplementation((_input: unknown, opts: { onData: (data: { projectPath: string }) => void }) => {
          onDataCallback = opts.onData;
          return { unsubscribe: vi.fn() };
        });

        render(<GitView workingPath={WORKTREE_PATH} />);

        await waitFor(() => {
          expect(mockApiClient.getGitStatus).toHaveBeenCalledTimes(1);
        });

        // Simulate git changes detected in a DIFFERENT path
        if (onDataCallback) {
          await act(async () => {
            onDataCallback!({ projectPath: '/different/project' });
          });
        }

        // Should still be 1 call (no refresh triggered)
        expect(mockApiClient.getGitStatus).toHaveBeenCalledTimes(1);
      });
    });
  });
});
