/**
 * GitDiffViewer Component Tests
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * TDD: Test-first development
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitDiffViewer } from './GitDiffViewer';
import { useGitViewStore } from '../stores/gitViewStore';

describe('GitDiffViewer Component', () => {
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

  describe('Requirement 8.1: Diff Display with Syntax Highlighting', () => {
    it('should render diff content when available', () => {
      const diffContent = `diff --git a/file.ts b/file.ts
index 1234567..abcdefg 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
+import { foo } from 'bar';
 const x = 1;
-const y = 2;
+const y = 3;
 export { x, y };`;

      useGitViewStore.setState({
        selectedFilePath: 'file.ts',
        cachedDiffContent: diffContent,
        isLoading: false,
      });

      render(<GitDiffViewer />);

      // Should render diff content
      expect(screen.getByTestId('diff-content')).toBeInTheDocument();
    });

    it('should display file name header', () => {
      useGitViewStore.setState({
        selectedFilePath: 'src/components/Button.tsx',
        cachedDiffContent: 'diff content',
        isLoading: false,
      });

      render(<GitDiffViewer />);

      expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.2: File Selection Diff Fetch', () => {
    it('should show "no file selected" when no file is selected', () => {
      useGitViewStore.setState({
        selectedFilePath: null,
        cachedDiffContent: null,
      });

      render(<GitDiffViewer />);

      expect(screen.getByTestId('no-file-selected')).toBeInTheDocument();
      expect(screen.getByText('ファイルを選択して差分を表示')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.3: Diff Mode Toggle', () => {
    it('should show mode toggle button', () => {
      useGitViewStore.setState({
        selectedFilePath: 'file.ts',
        cachedDiffContent: 'diff content',
      });

      render(<GitDiffViewer />);

      expect(screen.getByTestId('diff-mode-toggle')).toBeInTheDocument();
    });

    it('should toggle between unified and split mode', () => {
      useGitViewStore.setState({
        selectedFilePath: 'file.ts',
        cachedDiffContent: 'diff content',
        diffMode: 'unified',
      });

      render(<GitDiffViewer />);

      // Click the toggle button
      const toggleButton = screen.getByTestId('diff-mode-toggle');
      fireEvent.click(toggleButton);

      // Mode should be changed in store
      expect(useGitViewStore.getState().diffMode).toBe('split');
    });
  });

  describe('Requirement 8.4: Untracked Files Display', () => {
    it('should display all lines as additions for untracked files', () => {
      const untrackedDiff = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+const x = 1;
+const y = 2;
+export { x, y };`;

      useGitViewStore.setState({
        selectedFilePath: 'new-file.ts',
        cachedDiffContent: untrackedDiff,
      });

      render(<GitDiffViewer />);

      expect(screen.getByTestId('diff-content')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.5: Binary File Display', () => {
    it('should show binary file message for binary files', () => {
      const binaryDiff = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ`;

      useGitViewStore.setState({
        selectedFilePath: 'image.png',
        cachedDiffContent: binaryDiff,
      });

      render(<GitDiffViewer />);

      expect(screen.getByTestId('binary-file-message')).toBeInTheDocument();
      expect(screen.getByText('バイナリファイルは表示できません')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.6: Scroll Support', () => {
    it('should be scrollable', () => {
      useGitViewStore.setState({
        selectedFilePath: 'file.ts',
        cachedDiffContent: 'diff content',
      });

      render(<GitDiffViewer />);

      const container = screen.getByTestId('diff-container');
      expect(container).toHaveClass('overflow-auto');
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching diff', () => {
      useGitViewStore.setState({
        selectedFilePath: 'file.ts',
        cachedDiffContent: null,
        isLoading: true,
      });

      render(<GitDiffViewer />);

      expect(screen.getByTestId('diff-loading')).toBeInTheDocument();
    });

    it('should show error message when diff fetch fails', () => {
      useGitViewStore.setState({
        selectedFilePath: 'file.ts',
        cachedDiffContent: null,
        isLoading: false,
        error: 'Failed to fetch diff',
      });

      render(<GitDiffViewer />);

      expect(screen.getByTestId('diff-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch diff')).toBeInTheDocument();
    });

    it('should show "no diff" message when diff is empty', () => {
      useGitViewStore.setState({
        selectedFilePath: 'file.ts',
        cachedDiffContent: '',
        isLoading: false,
      });

      render(<GitDiffViewer />);

      expect(screen.getByTestId('no-diff-content')).toBeInTheDocument();
    });
  });
});
