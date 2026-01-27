/**
 * GitFileTree Component Tests
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.1
 * TDD: Test-first development
 * Task 12.2: Virtualization tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GitFileTree } from './GitFileTree';
import { useGitViewStore } from '../stores/gitViewStore';
import type { GitStatusResult, ApiClient } from '@shared/api/types';

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

describe('GitFileTree Component', () => {
  beforeEach(() => {
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

  describe('Requirement 7.1: Hierarchical Tree Structure', () => {
    it('should render files in hierarchical tree structure', () => {
      // Set up mock status with nested paths
      const mockStatus: GitStatusResult = {
        files: [
          { path: 'src/components/Button.tsx', status: 'M' },
          { path: 'src/components/Input.tsx', status: 'A' },
          { path: 'src/utils/helpers.ts', status: 'M' },
          { path: 'README.md', status: 'M' },
        ],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      // Should render root-level file
      expect(screen.getByText('README.md')).toBeInTheDocument();

      // Should render directory nodes
      expect(screen.getByText('src')).toBeInTheDocument();
    });

    it('should be scrollable when many files exist', () => {
      const mockStatus: GitStatusResult = {
        files: [
          { path: 'file1.ts', status: 'M' },
          { path: 'file2.ts', status: 'M' },
        ],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      const fileList = screen.getByTestId('file-list');
      expect(fileList).toHaveClass('overflow-auto');
    });
  });

  describe('Requirement 7.2: File Selection', () => {
    it('should call selectFile when file node is clicked', () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'src/file.ts', status: 'M' }],
        mode: 'normal',
      };

      // Set up expanded directory so files are visible
      const expandedDirs = new Map<string, boolean>();
      expandedDirs.set('src', true);

      useGitViewStore.setState({
        cachedStatus: mockStatus,
        expandedDirs,
      });

      // Mock the selectFile function
      const selectFileSpy = vi.spyOn(useGitViewStore.getState(), 'selectFile');

      render(<GitFileTree />);

      const fileNode = screen.getByTestId('file-node-src/file.ts');
      fireEvent.click(fileNode);

      expect(selectFileSpy).toHaveBeenCalledWith(mockApiClient, 'src/file.ts');
    });

    it('should highlight selected file', () => {
      const mockStatus: GitStatusResult = {
        files: [
          { path: 'src/file1.ts', status: 'M' },
          { path: 'src/file2.ts', status: 'A' },
        ],
        mode: 'normal',
      };

      // Set up expanded directory so files are visible
      const expandedDirs = new Map<string, boolean>();
      expandedDirs.set('src', true);

      useGitViewStore.setState({
        cachedStatus: mockStatus,
        selectedFilePath: 'src/file1.ts',
        expandedDirs,
      });

      render(<GitFileTree />);

      const selectedNode = screen.getByTestId('file-node-src/file1.ts');
      expect(selectedNode).toHaveClass('bg-blue-100');
    });

    it('should display status icon for Added (A) files', () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'new-file.ts', status: 'A' }],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      const fileNode = screen.getByTestId('file-node-new-file.ts');
      const statusIcon = within(fileNode).getByTestId('status-icon-A');
      expect(statusIcon).toBeInTheDocument();
      expect(statusIcon).toHaveClass('text-green-500');
    });

    it('should display status icon for Modified (M) files', () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'modified-file.ts', status: 'M' }],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      const fileNode = screen.getByTestId('file-node-modified-file.ts');
      const statusIcon = within(fileNode).getByTestId('status-icon-M');
      expect(statusIcon).toBeInTheDocument();
      expect(statusIcon).toHaveClass('text-yellow-500');
    });

    it('should display status icon for Deleted (D) files', () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'deleted-file.ts', status: 'D' }],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      const fileNode = screen.getByTestId('file-node-deleted-file.ts');
      const statusIcon = within(fileNode).getByTestId('status-icon-D');
      expect(statusIcon).toBeInTheDocument();
      expect(statusIcon).toHaveClass('text-red-500');
    });

    it('should display status icon for Untracked (??) files', () => {
      const mockStatus: GitStatusResult = {
        files: [{ path: 'untracked-file.ts', status: '??' }],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      const fileNode = screen.getByTestId('file-node-untracked-file.ts');
      const statusIcon = within(fileNode).getByTestId('status-icon-??');
      expect(statusIcon).toBeInTheDocument();
      expect(statusIcon).toHaveClass('text-gray-400');
    });
  });

  describe('Requirement 7.3: Directory Expand/Collapse', () => {
    it('should toggle directory expansion when clicked', () => {
      const mockStatus: GitStatusResult = {
        files: [
          { path: 'src/components/Button.tsx', status: 'M' },
        ],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      // Initially src should be collapsed (default)
      const srcDir = screen.getByTestId('dir-node-src');

      // Click to expand
      fireEvent.click(srcDir);

      // Verify toggleDir was called
      const state = useGitViewStore.getState();
      expect(state.expandedDirs.get('src')).toBe(true);
    });

    it('should show child count on directory node', () => {
      const mockStatus: GitStatusResult = {
        files: [
          { path: 'src/file1.ts', status: 'M' },
          { path: 'src/file2.ts', status: 'A' },
          { path: 'src/file3.ts', status: 'D' },
        ],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      const srcDir = screen.getByTestId('dir-node-src');
      expect(srcDir).toHaveTextContent('3');
    });

    it('should render collapse/expand icon', () => {
      const mockStatus: GitStatusResult = {
        files: [
          { path: 'src/file.ts', status: 'M' },
        ],
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      const srcDir = screen.getByTestId('dir-node-src');
      const collapseIcon = within(srcDir).getByTestId('collapse-icon');
      expect(collapseIcon).toBeInTheDocument();
    });
  });

  describe('Requirement 7.4: Empty State', () => {
    it('should show empty message when no files exist', () => {
      useGitViewStore.setState({
        cachedStatus: { files: [], mode: 'normal' },
      });

      render(<GitFileTree />);

      expect(screen.getByTestId('empty-message')).toBeInTheDocument();
      expect(screen.getByText('変更されたファイルはありません')).toBeInTheDocument();
    });

    it('should show empty message when cachedStatus is null', () => {
      useGitViewStore.setState({ cachedStatus: null });

      render(<GitFileTree />);

      expect(screen.getByTestId('empty-message')).toBeInTheDocument();
    });
  });

  describe('Requirement 12.1: Virtualization for large file lists', () => {
    it('should render without virtualization for fewer than 100 files', () => {
      const files = Array.from({ length: 50 }, (_, i) => ({
        path: `file${i}.ts`,
        status: 'M' as const,
      }));

      const mockStatus: GitStatusResult = {
        files,
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      // Should render the file list container
      const fileList = screen.getByTestId('file-list');
      expect(fileList).toBeInTheDocument();

      // Check that first file is rendered
      expect(screen.getByTestId('file-node-file0.ts')).toBeInTheDocument();
    });

    it('should render with virtualization for 100+ files (file list container present)', () => {
      const files = Array.from({ length: 150 }, (_, i) => ({
        path: `file${i}.ts`,
        status: 'M' as const,
      }));

      const mockStatus: GitStatusResult = {
        files,
        mode: 'normal',
      };

      useGitViewStore.setState({ cachedStatus: mockStatus });

      render(<GitFileTree />);

      // Should render the file list container
      const fileList = screen.getByTestId('file-list');
      expect(fileList).toBeInTheDocument();

      // Virtualized renderer should be used (only some items rendered)
      // Note: We cannot easily test virtual scrolling in jsdom, but we verify
      // the component renders without crashing with 100+ files
    });
  });
});
