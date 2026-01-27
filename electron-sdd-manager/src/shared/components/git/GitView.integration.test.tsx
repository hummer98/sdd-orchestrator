/**
 * GitView Integration Tests
 * Requirements: 3.1, 3.2, 6.2, 6.3, 10.4
 * Tasks: 13.1, 13.2, 13.6, 13.7
 *
 * Integration tests for GitView component interactions
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
  switchAgentWatchScope: vi.fn(),
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

// Mock electron API
const mockOnGitChangesDetected = vi.fn(() => () => {});
Object.defineProperty(window, 'electronAPI', {
  value: { onGitChangesDetected: mockOnGitChangesDetected },
  writable: true,
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
});
