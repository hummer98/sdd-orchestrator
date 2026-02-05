/**
 * ProjectFileEditor Tests
 *
 * TDD: Tests written first for project-config-editor Task 3.2
 * Requirements: 3.4, 4.1, 4.2, 4.3, 4.4
 *
 * Test cases:
 * - Renders editor when file is loaded
 * - Shows dirty indicator when content modified
 * - Handles keyboard shortcut for save
 * - Shows save success notification
 * - Shows error message on save failure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectFileEditor } from './ProjectFileEditor';
import { useProjectEditorStore, resetProjectEditorStore } from '@shared/stores/projectEditorStore';

// Mock MDEditor
vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange, preview }: { value: string; onChange?: (v: string) => void; preview?: string }) => (
    <div data-testid="md-editor">
      <textarea
        data-testid="md-editor-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Markdown editor"
      />
      <span data-preview={preview}></span>
    </div>
  ),
}));

// Mock notification store
const mockShowNotification = vi.fn();
vi.mock('@shared/stores/notificationStore', () => ({
  useNotificationStore: () => ({
    showNotification: mockShowNotification,
  }),
}));

describe('ProjectFileEditor', () => {
  const defaultProps = {
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetProjectEditorStore();
  });

  describe('rendering', () => {
    it('should show placeholder when no file is loaded', () => {
      render(<ProjectFileEditor {...defaultProps} />);

      expect(screen.getByText('ファイルを選択してください')).toBeInTheDocument();
    });

    it('should render editor when file is loaded', () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Test Content',
        originalContent: '# Test Content',
        isDirty: false,
      });

      render(<ProjectFileEditor {...defaultProps} />);

      expect(screen.getByTestId('md-editor')).toBeInTheDocument();
    });

    it('should display file name in header', () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Test',
        originalContent: '# Test',
      });

      render(<ProjectFileEditor {...defaultProps} />);

      expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
    });
  });

  describe('dirty indicator', () => {
    it('should show dirty indicator when content is modified', () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Modified',
        originalContent: '# Original',
        isDirty: true,
      });

      render(<ProjectFileEditor {...defaultProps} />);

      expect(screen.getByTestId('dirty-indicator')).toBeInTheDocument();
    });

    it('should not show dirty indicator when content matches original', () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Original',
        originalContent: '# Original',
        isDirty: false,
      });

      render(<ProjectFileEditor {...defaultProps} />);

      expect(screen.queryByTestId('dirty-indicator')).not.toBeInTheDocument();
    });
  });

  describe('save functionality', () => {
    it('should call onSave when save button is clicked', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Modified',
        originalContent: '# Original',
        isDirty: true,
      });

      render(<ProjectFileEditor onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalled();
    });

    it('should disable save button when not dirty', () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Original',
        originalContent: '# Original',
        isDirty: false,
      });

      render(<ProjectFileEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /保存/i });
      expect(saveButton).toBeDisabled();
    });
  });

  // project-editor-dark-mode: Updated for button group UI (Requirement 3.1, 3.3)
  describe('mode switching', () => {
    it('should render button group with Edit and Preview buttons', () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Test',
        originalContent: '# Test',
        mode: 'preview',
      });

      render(<ProjectFileEditor {...defaultProps} />);

      expect(screen.getByTestId('mode-toggle-group')).toBeInTheDocument();
      expect(screen.getByTestId('edit-mode-button')).toBeInTheDocument();
      expect(screen.getByTestId('preview-mode-button')).toBeInTheDocument();
    });

    it('should switch to edit mode when Edit button is clicked', async () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Test',
        originalContent: '# Test',
        mode: 'preview',
      });

      render(<ProjectFileEditor {...defaultProps} />);

      const editButton = screen.getByTestId('edit-mode-button');
      await userEvent.click(editButton);

      expect(useProjectEditorStore.getState().mode).toBe('edit');
    });

    it('should switch to preview mode when Preview button is clicked', async () => {
      useProjectEditorStore.setState({
        currentFilePath: '/test/project/CLAUDE.md',
        currentFileName: 'CLAUDE.md',
        content: '# Test',
        originalContent: '# Test',
        mode: 'edit',
      });

      render(<ProjectFileEditor {...defaultProps} />);

      const previewButton = screen.getByTestId('preview-mode-button');
      await userEvent.click(previewButton);

      expect(useProjectEditorStore.getState().mode).toBe('preview');
    });
  });
});
