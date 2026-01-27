/**
 * GitView Component Tests (Shared)
 * Requirements: 6.1, 6.2, 6.3, 6.4, 10.3, 10.4, 11.2
 * TDD: Test-first development
 * Task 10.5: Moved to shared/components/git
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { GitView } from './GitView';
import { useSharedGitViewStore } from '@shared/stores/gitViewStore';
import type { ApiClient, GitStatusResult } from '@shared/api/types';

// Mock the ApiClientProvider
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

// Mock the ApiClientProvider context
vi.mock('@shared/api/ApiClientProvider', () => ({
  useApi: () => mockApiClient,
}));

// Mock electron API for git:changes-detected event
const mockOnGitChangesDetected = vi.fn(() => () => {});
const mockElectronAPI = {
  onGitChangesDetected: mockOnGitChangesDetected,
};

// Set up window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('GitView Component (Shared)', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset store state
    const store = useSharedGitViewStore.getState();
    store.selectedFilePath = null;
    store.expandedDirs = new Map();
    store.diffMode = 'unified';
    store.fileTreeWidth = 300;
    store.cachedStatus = null;
    store.cachedDiffContent = null;
    store.isLoading = false;
    store.error = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 10.3, 10.4: Shared Component', () => {
    it('should be importable from shared/components/git', async () => {
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

      render(<GitView />);

      await waitFor(() => {
        // Component should render properly
        expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
        expect(screen.getByTestId('git-diff-viewer')).toBeInTheDocument();
      });
    });

    it('should use shared gitViewStore', async () => {
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

      render(<GitView />);

      await waitFor(() => {
        // Store should be updated
        const store = useSharedGitViewStore.getState();
        expect(store.cachedStatus).toEqual(mockStatus);
      });
    });
  });

  describe('Requirement 6.1: 2-Column Layout', () => {
    it('should render GitFileTree on the left and GitDiffViewer on the right', async () => {
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

      render(<GitView />);

      await waitFor(() => {
        // GitFileTree should be rendered
        expect(screen.getByTestId('git-file-tree')).toBeInTheDocument();
        // GitDiffViewer should be rendered
        expect(screen.getByTestId('git-diff-viewer')).toBeInTheDocument();
      });
    });

    it('should include a ResizeHandle between the two columns', async () => {
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

      render(<GitView />);

      await waitFor(() => {
        // ResizeHandle uses data-testid="resize-handle-horizontal"
        expect(screen.getByTestId('resize-handle-horizontal')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 6.2: Initial Load', () => {
    it('should call getGitStatus on mount', async () => {
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

      render(<GitView />);

      await waitFor(() => {
        expect(mockApiClient.getGitStatus).toHaveBeenCalled();
      });
    });

    it('should start watching on mount', async () => {
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
        expect(mockApiClient.startWatching).toHaveBeenCalled();
      });
    });

    it('should stop watching on unmount', async () => {
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
        expect(mockApiClient.startWatching).toHaveBeenCalled();
      });

      unmount();

      expect(mockApiClient.stopWatching).toHaveBeenCalled();
    });

    it('should show loading state while fetching', async () => {
      let resolveGetStatus: (value: any) => void;
      const getStatusPromise = new Promise((resolve) => {
        resolveGetStatus = resolve;
      });

      vi.mocked(mockApiClient.getGitStatus).mockReturnValue(getStatusPromise as any);
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      // Should show loading state
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

      // Resolve the promise
      await act(async () => {
        resolveGetStatus!({ ok: true, value: { files: [], mode: 'normal' } });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 6.3: File Watch Updates', () => {
    it('should subscribe to git:changes-detected events', async () => {
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
        expect(mockOnGitChangesDetected).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 6.4: Error Display', () => {
    it('should display error message when git operation fails', async () => {
      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: false,
        error: {
          type: 'git_error',
          message: 'Not a git repository',
        },
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Not a git repository')).toBeInTheDocument();
      });
    });

    it('should display "gitリポジトリでない" for non-git repository', async () => {
      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: false,
        error: {
          type: 'validation_error',
          message: 'Not a git repository: /test/path',
        },
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });
});
