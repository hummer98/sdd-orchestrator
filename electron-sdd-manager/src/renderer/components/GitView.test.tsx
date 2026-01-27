/**
 * GitView Component Tests
 * Requirements: 6.1, 6.2, 6.3, 6.4, 11.2
 * TDD: Test-first development
 * git-diff-viewer Task 11.1: Keyboard navigation tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { GitView } from './GitView';
import { useGitViewStore } from '../stores/gitViewStore';
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

describe('GitView Component', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset store state
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

  afterEach(() => {
    vi.clearAllMocks();
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

  // git-diff-viewer Task 11.1: Keyboard navigation tests
  describe('Requirement 11.2: Keyboard Navigation', () => {
    const mockFiles: GitStatusResult = {
      files: [
        { path: 'src/file1.ts', status: 'M' },
        { path: 'src/file2.ts', status: 'A' },
        { path: 'src/subdir/file3.ts', status: 'D' },
      ],
      mode: 'normal',
    };

    beforeEach(() => {
      vi.mocked(mockApiClient.getGitStatus).mockResolvedValue({
        ok: true,
        value: mockFiles,
      });
      vi.mocked(mockApiClient.startWatching).mockResolvedValue({
        ok: true,
        value: undefined,
      });
      vi.mocked(mockApiClient.getGitDiff).mockResolvedValue({
        ok: true,
        value: 'diff content',
      });

      // Pre-expand directories for keyboard navigation tests
      // Note: We need to use a new Map since Zustand may not detect mutations
      const expandedDirs = new Map();
      expandedDirs.set('src', true);
      expandedDirs.set('src/subdir', true);
      useGitViewStore.setState({ expandedDirs });
    });

    it('should move selection down with ArrowDown key', async () => {
      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('file-list')).toBeInTheDocument();
      });

      // Get the file list container (which has tabIndex and keydown handler) and focus it
      const fileList = screen.getByTestId('file-list');
      fireEvent.focus(fileList);

      // With pre-expanded directories, tree structure is:
      // src (dir)
      //   subdir (dir) - sorted first
      //     file3.ts
      //   file1.ts
      //   file2.ts
      // Press ArrowDown to select first file (subdir/file3.ts)
      fireEvent.keyDown(fileList, { key: 'ArrowDown' });

      await waitFor(() => {
        // First file should be selected (src/subdir/file3.ts)
        const store = useGitViewStore.getState();
        expect(store.selectedFilePath).toBe('src/subdir/file3.ts');
      });

      // Press ArrowDown again to select second file (file1.ts)
      fireEvent.keyDown(fileList, { key: 'ArrowDown' });

      await waitFor(() => {
        const store = useGitViewStore.getState();
        expect(store.selectedFilePath).toBe('src/file1.ts');
      });
    });

    it('should move selection up with ArrowUp key', async () => {
      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('file-list')).toBeInTheDocument();
      });

      // Navigate to second file first
      // Tree order: src/subdir/file3.ts, src/file1.ts, src/file2.ts
      const fileList = screen.getByTestId('file-list');
      fireEvent.focus(fileList);
      fireEvent.keyDown(fileList, { key: 'ArrowDown' }); // first: src/subdir/file3.ts
      fireEvent.keyDown(fileList, { key: 'ArrowDown' }); // second: src/file1.ts

      await waitFor(() => {
        const store = useGitViewStore.getState();
        expect(store.selectedFilePath).toBe('src/file1.ts');
      });

      // Press ArrowUp to select previous file
      fireEvent.keyDown(fileList, { key: 'ArrowUp' });

      await waitFor(() => {
        const newStore = useGitViewStore.getState();
        expect(newStore.selectedFilePath).toBe('src/subdir/file3.ts');
      });
    });

    it('should toggle directory expansion with Space key', async () => {
      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('file-list')).toBeInTheDocument();
      });

      const fileList = screen.getByTestId('file-list');
      fireEvent.focus(fileList);

      // First, select a file in src/subdir directory
      // Tree order: src/subdir/file3.ts, src/file1.ts, src/file2.ts
      fireEvent.keyDown(fileList, { key: 'ArrowDown' }); // first file (src/subdir/file3.ts)

      await waitFor(() => {
        const store = useGitViewStore.getState();
        expect(store.selectedFilePath).toBe('src/subdir/file3.ts');
      });

      // Press Space to toggle parent directory expansion (src/subdir)
      fireEvent.keyDown(fileList, { key: ' ' });

      // Check if directory expansion state changed
      const store = useGitViewStore.getState();
      // The directory should have its expansion state toggled (it was true, now false)
      expect(store.expandedDirs.get('src/subdir')).toBe(false);
    });

    it('should trigger diff display with Enter key on file selection', async () => {
      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('file-list')).toBeInTheDocument();
      });

      const fileList = screen.getByTestId('file-list');
      fireEvent.focus(fileList);

      // Navigate to first file (src/subdir/file3.ts)
      fireEvent.keyDown(fileList, { key: 'ArrowDown' });

      await waitFor(() => {
        const store = useGitViewStore.getState();
        expect(store.selectedFilePath).toBe('src/subdir/file3.ts');
      });

      // Clear the mock calls
      vi.mocked(mockApiClient.getGitDiff).mockClear();

      // Press Enter to confirm selection and fetch diff
      fireEvent.keyDown(fileList, { key: 'Enter' });

      await waitFor(() => {
        expect(mockApiClient.getGitDiff).toHaveBeenCalledWith('/test/project', 'src/subdir/file3.ts');
      });
    });

    it('should not move selection beyond first item with ArrowUp', async () => {
      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('file-list')).toBeInTheDocument();
      });

      const fileList = screen.getByTestId('file-list');
      fireEvent.focus(fileList);

      // Navigate to first file (src/subdir/file3.ts)
      fireEvent.keyDown(fileList, { key: 'ArrowDown' });

      await waitFor(() => {
        const store = useGitViewStore.getState();
        expect(store.selectedFilePath).toBe('src/subdir/file3.ts');
      });

      // Press ArrowUp at the first item
      fireEvent.keyDown(fileList, { key: 'ArrowUp' });

      await waitFor(() => {
        const newStore = useGitViewStore.getState();
        // Should still be on first file
        expect(newStore.selectedFilePath).toBe('src/subdir/file3.ts');
      });
    });

    it('should not move selection beyond last visible item with ArrowDown', async () => {
      render(<GitView />);

      await waitFor(() => {
        expect(screen.getByTestId('file-list')).toBeInTheDocument();
      });

      const fileList = screen.getByTestId('file-list');
      fireEvent.focus(fileList);

      // With pre-expanded directories, tree structure is:
      // src (dir, expanded)
      //   subdir (dir, expanded) - sorted first
      //     file3.ts
      //   file1.ts
      //   file2.ts
      // Navigate to last file
      fireEvent.keyDown(fileList, { key: 'ArrowDown' }); // first file (src/subdir/file3.ts)
      fireEvent.keyDown(fileList, { key: 'ArrowDown' }); // second file (src/file1.ts)
      fireEvent.keyDown(fileList, { key: 'ArrowDown' }); // third file (src/file2.ts) - last

      await waitFor(() => {
        const store = useGitViewStore.getState();
        expect(store.selectedFilePath).toBe('src/file2.ts');
      });

      // Press ArrowDown at the last item
      fireEvent.keyDown(fileList, { key: 'ArrowDown' });

      await waitFor(() => {
        const newStore = useGitViewStore.getState();
        // Should still be on last file
        expect(newStore.selectedFilePath).toBe('src/file2.ts');
      });
    });
  });
});
