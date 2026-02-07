/**
 * ProjectFileList Tests
 *
 * TDD: Tests written first for project-config-editor Task 3.1
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.2
 *
 * Test cases:
 * - Renders CLAUDE.md section when it exists
 * - Hides CLAUDE.md section when it doesn't exist
 * - Renders steering files section
 * - Shows "no files" message when steering is empty
 * - Highlights selected file
 * - Calls onSelectFile when file is clicked
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectFileList } from './ProjectFileList';
import type { ProjectFilesState } from '@shared/api/types';

describe('ProjectFileList', () => {
  const defaultProps = {
    files: {
      claudeMd: null,
      steeringFiles: [],
      docsTree: [],
      isLoading: false,
      error: null,
    } as ProjectFilesState,
    selectedFilePath: null,
    onSelectFile: vi.fn(),
    projectPath: '/test/project',
  };

  describe('CLAUDE.md section', () => {
    it('should render CLAUDE.md section when it exists', () => {
      const files: ProjectFilesState = {
        claudeMd: {
          relativePath: 'CLAUDE.md',
          fileName: 'CLAUDE.md',
          group: 'claude',
          exists: true,
        },
        steeringFiles: [],
        docsTree: [],
        isLoading: false,
        error: null,
      };

      render(<ProjectFileList {...defaultProps} files={files} />);

      // Should have both the section header and the file button
      const claudeElements = screen.getAllByText('CLAUDE.md');
      expect(claudeElements.length).toBe(2);
    });

    it('should not render CLAUDE.md section when it does not exist', () => {
      render(<ProjectFileList {...defaultProps} />);

      expect(screen.queryByText('CLAUDE.md')).not.toBeInTheDocument();
    });
  });

  describe('Steering Files section', () => {
    it('should render steering files list', () => {
      const files: ProjectFilesState = {
        claudeMd: null,
        steeringFiles: [
          { relativePath: '.kiro/steering/product.md', fileName: 'product.md', group: 'steering', exists: true },
          { relativePath: '.kiro/steering/tech.md', fileName: 'tech.md', group: 'steering', exists: true },
        ],
        docsTree: [],
        isLoading: false,
        error: null,
      };

      render(<ProjectFileList {...defaultProps} files={files} />);

      expect(screen.getByText('Steering Files')).toBeInTheDocument();
      expect(screen.getByText('product.md')).toBeInTheDocument();
      expect(screen.getByText('tech.md')).toBeInTheDocument();
    });

    it('should show "no files" message when steering files is empty', () => {
      render(<ProjectFileList {...defaultProps} />);

      expect(screen.getByText('Steering Files')).toBeInTheDocument();
      // Both Steering and Docs sections show "ファイルなし" when empty
      const noFileMessages = screen.getAllByText('ファイルなし');
      expect(noFileMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('file selection', () => {
    it('should call onSelectFile when file is clicked', () => {
      const onSelectFile = vi.fn();
      const files: ProjectFilesState = {
        claudeMd: {
          relativePath: 'CLAUDE.md',
          fileName: 'CLAUDE.md',
          group: 'claude',
          exists: true,
        },
        steeringFiles: [],
        docsTree: [],
        isLoading: false,
        error: null,
      };

      render(<ProjectFileList {...defaultProps} files={files} onSelectFile={onSelectFile} />);

      // Find the button element (not the section header)
      const claudeButtons = screen.getAllByText('CLAUDE.md');
      const buttonElement = claudeButtons.find(el => el.closest('button'));
      fireEvent.click(buttonElement!);

      expect(onSelectFile).toHaveBeenCalledWith('/test/project/CLAUDE.md', 'CLAUDE.md');
    });

    it('should highlight selected file', () => {
      const files: ProjectFilesState = {
        claudeMd: {
          relativePath: 'CLAUDE.md',
          fileName: 'CLAUDE.md',
          group: 'claude',
          exists: true,
        },
        steeringFiles: [],
        docsTree: [],
        isLoading: false,
        error: null,
      };

      const { container } = render(
        <ProjectFileList
          {...defaultProps}
          files={files}
          selectedFilePath="/test/project/CLAUDE.md"
        />
      );

      // Find the selected item (should have bg-blue styling)
      const selectedItem = container.querySelector('[data-selected="true"]');
      expect(selectedItem).toBeInTheDocument();
    });
  });

  describe('loading and error states', () => {
    it('should show loading state', () => {
      const files: ProjectFilesState = {
        claudeMd: null,
        steeringFiles: [],
        docsTree: [],
        isLoading: true,
        error: null,
      };

      render(<ProjectFileList {...defaultProps} files={files} />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const files: ProjectFilesState = {
        claudeMd: null,
        steeringFiles: [],
        docsTree: [],
        isLoading: false,
        error: 'Failed to load files',
      };

      render(<ProjectFileList {...defaultProps} files={files} />);

      expect(screen.getByText('Failed to load files')).toBeInTheDocument();
    });
  });
});
