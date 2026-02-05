/**
 * DocsTreeSection Tests
 *
 * TDD: Tests written first for project-docs-viewer Task 4.1
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3, 6.4
 *
 * Test cases:
 * - Tree structure rendering
 * - Folder expand/collapse
 * - File selection callback
 * - Indentation by depth
 * - File type icons
 * - Empty state display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DocsTreeNode } from '@shared/api/types';
import { DocsTreeSection } from './DocsTreeSection';
import { resetDocsTreeExpandedStore, useDocsTreeExpandedStore } from '@shared/stores/docsTreeExpandedStore';

describe('DocsTreeSection', () => {
  const mockOnSelectFile = vi.fn();
  const defaultProps = {
    docsTree: [] as DocsTreeNode[],
    projectPath: '/test/project',
    selectedFilePath: null as string | null,
    onSelectFile: mockOnSelectFile,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetDocsTreeExpandedStore();
  });

  describe('empty state', () => {
    // Requirement 5.3: Empty state when no files
    it('should display empty message when docsTree is empty', () => {
      render(<DocsTreeSection {...defaultProps} docsTree={[]} />);

      expect(screen.getByText('ファイルなし')).toBeInTheDocument();
    });
  });

  describe('flat file list rendering', () => {
    // Requirement 2.1: Tree structure display
    it('should render flat file list', () => {
      const docsTree: DocsTreeNode[] = [
        { name: 'readme.md', relativePath: 'readme.md', type: 'file', extension: 'md' },
        { name: 'manual.pdf', relativePath: 'manual.pdf', type: 'file', extension: 'pdf' },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      expect(screen.getByText('readme.md')).toBeInTheDocument();
      expect(screen.getByText('manual.pdf')).toBeInTheDocument();
    });
  });

  describe('folder nodes', () => {
    // Requirement 2.1: Distinguish folder and file nodes
    it('should render folder nodes', () => {
      const docsTree: DocsTreeNode[] = [
        {
          name: 'api',
          relativePath: 'api',
          type: 'directory',
          children: [
            { name: 'endpoints.md', relativePath: 'api/endpoints.md', type: 'file', extension: 'md' },
          ],
        },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      expect(screen.getByText('api')).toBeInTheDocument();
    });

    // Requirement 2.2: Folder expand/collapse
    it('should toggle folder on click', () => {
      const docsTree: DocsTreeNode[] = [
        {
          name: 'api',
          relativePath: 'api',
          type: 'directory',
          children: [
            { name: 'endpoints.md', relativePath: 'api/endpoints.md', type: 'file', extension: 'md' },
          ],
        },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      // Children should not be visible initially (folders collapsed)
      expect(screen.queryByText('endpoints.md')).not.toBeInTheDocument();

      // Click folder to expand
      fireEvent.click(screen.getByText('api'));

      // Now children should be visible
      expect(screen.getByText('endpoints.md')).toBeInTheDocument();

      // Click again to collapse
      fireEvent.click(screen.getByText('api'));

      // Children should be hidden again
      expect(screen.queryByText('endpoints.md')).not.toBeInTheDocument();
    });

    // Requirement 2.4: Folder icon (expanded/collapsed)
    it('should display different icons for expanded/collapsed folders', () => {
      const docsTree: DocsTreeNode[] = [
        {
          name: 'api',
          relativePath: 'api',
          type: 'directory',
          children: [],
        },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      // Should have collapse icon initially
      expect(screen.getByTestId('folder-collapsed-icon')).toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText('api'));

      // Should have expand icon
      expect(screen.getByTestId('folder-expanded-icon')).toBeInTheDocument();
    });
  });

  describe('file selection', () => {
    // Requirement 2.3: File click triggers editor display
    it('should call onSelectFile when file is clicked', () => {
      const docsTree: DocsTreeNode[] = [
        { name: 'readme.md', relativePath: 'readme.md', type: 'file', extension: 'md' },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      fireEvent.click(screen.getByText('readme.md'));

      expect(mockOnSelectFile).toHaveBeenCalledWith(
        '/test/project/docs/readme.md',
        'readme.md'
      );
    });

    it('should highlight selected file', () => {
      const docsTree: DocsTreeNode[] = [
        { name: 'readme.md', relativePath: 'readme.md', type: 'file', extension: 'md' },
        { name: 'other.md', relativePath: 'other.md', type: 'file', extension: 'md' },
      ];

      render(
        <DocsTreeSection
          {...defaultProps}
          docsTree={docsTree}
          selectedFilePath="/test/project/docs/readme.md"
        />
      );

      const selectedItem = screen.getByTestId('file-node-readme.md');
      expect(selectedItem).toHaveAttribute('data-selected', 'true');

      const otherItem = screen.getByTestId('file-node-other.md');
      expect(otherItem).toHaveAttribute('data-selected', 'false');
    });
  });

  describe('indentation', () => {
    // Requirement 2.5: Indentation shows nesting level
    it('should apply indentation based on depth', () => {
      const docsTree: DocsTreeNode[] = [
        {
          name: 'api',
          relativePath: 'api',
          type: 'directory',
          children: [
            { name: 'endpoints.md', relativePath: 'api/endpoints.md', type: 'file', extension: 'md' },
          ],
        },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      // Expand folder
      fireEvent.click(screen.getByText('api'));

      // Check that nested file has greater indentation (via style or class)
      const nestedFile = screen.getByTestId('file-node-api/endpoints.md');
      expect(nestedFile).toHaveStyle({ paddingLeft: '32px' }); // depth=1 * 16px + 16px base
    });
  });

  describe('file type icons', () => {
    // Requirement 6.4: File type-specific icons
    it('should display markdown icon for .md files', () => {
      const docsTree: DocsTreeNode[] = [
        { name: 'readme.md', relativePath: 'readme.md', type: 'file', extension: 'md' },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      expect(screen.getByTestId('file-icon-md')).toBeInTheDocument();
    });

    it('should display PDF icon for .pdf files', () => {
      const docsTree: DocsTreeNode[] = [
        { name: 'manual.pdf', relativePath: 'manual.pdf', type: 'file', extension: 'pdf' },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      expect(screen.getByTestId('file-icon-pdf')).toBeInTheDocument();
    });

    it('should display HTML icon for .html files', () => {
      const docsTree: DocsTreeNode[] = [
        { name: 'index.html', relativePath: 'index.html', type: 'file', extension: 'html' },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      expect(screen.getByTestId('file-icon-html')).toBeInTheDocument();
    });
  });

  describe('nested tree structure', () => {
    it('should render deeply nested structure', () => {
      const docsTree: DocsTreeNode[] = [
        {
          name: 'api',
          relativePath: 'api',
          type: 'directory',
          children: [
            {
              name: 'v2',
              relativePath: 'api/v2',
              type: 'directory',
              children: [
                { name: 'reference.pdf', relativePath: 'api/v2/reference.pdf', type: 'file', extension: 'pdf' },
              ],
            },
          ],
        },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      // Top-level folder visible
      expect(screen.getByText('api')).toBeInTheDocument();

      // Expand first level
      fireEvent.click(screen.getByText('api'));
      expect(screen.getByText('v2')).toBeInTheDocument();

      // Expand second level
      fireEvent.click(screen.getByText('v2'));
      expect(screen.getByText('reference.pdf')).toBeInTheDocument();
    });
  });

  describe('section header', () => {
    // Requirement 5.2: Section header display
    it('should display section header with title', () => {
      const docsTree: DocsTreeNode[] = [
        { name: 'readme.md', relativePath: 'readme.md', type: 'file', extension: 'md' },
      ];

      render(<DocsTreeSection {...defaultProps} docsTree={docsTree} />);

      expect(screen.getByText('Docs')).toBeInTheDocument();
    });
  });
});
