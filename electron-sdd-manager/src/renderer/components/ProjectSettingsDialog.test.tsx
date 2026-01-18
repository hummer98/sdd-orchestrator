/**
 * ProjectSettingsDialog Component Tests
 * debatex-document-review Task 4.1: Project settings dialog for default scheme selection
 * Requirements: 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';
import { useProjectStore } from '../stores/projectStore';
import { useSpecDetailStore } from '../stores/spec/specDetailStore';

describe('ProjectSettingsDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up project store state
    useProjectStore.setState({
      currentProject: '/test/project',
    });

    // Reset spec detail store
    useSpecDetailStore.setState({
      projectDefaultScheme: undefined,
    });

    // Mock electronAPI
    window.electronAPI = {
      ...window.electronAPI,
      loadProjectDefaults: vi.fn().mockResolvedValue({ documentReview: { scheme: 'claude-code' } }),
      saveProjectDefaults: vi.fn().mockResolvedValue(undefined),
    };
  });

  // ============================================================
  // Task 4.1: ProjectSettingsDialog UI
  // Requirements: 4.5
  // ============================================================
  describe('Task 4.1: ProjectSettingsDialog UI', () => {
    it('should not render when isOpen is false', () => {
      render(<ProjectSettingsDialog isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByText(/プロジェクト設定/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText(/プロジェクト設定/i)).toBeInTheDocument();
    });

    it('should render document review section with scheme selector', () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText(/ドキュメントレビュー/i)).toBeInTheDocument();
      expect(screen.getByTestId('scheme-selector-button')).toBeInTheDocument();
    });

    it('should render Save and Cancel buttons', () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();
    });

    it('should close when Cancel button is clicked', () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when backdrop is clicked', () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      const backdrop = screen.getByTestId('dialog-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when X button is clicked', () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 4.1: Scheme Selection
  // Requirements: 4.5
  // ============================================================
  describe('Task 4.1: Scheme Selection', () => {
    it('should load current project defaults on open', async () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalledWith('/test/project');
      });
    });

    it('should display current scheme from project defaults', async () => {
      window.electronAPI.loadProjectDefaults = vi.fn().mockResolvedValue({
        documentReview: { scheme: 'gemini-cli' },
      });

      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        // SchemeSelector should show Gemini label
        expect(screen.getByTestId('scheme-selector-button')).toHaveTextContent('Gemini');
      });
    });

    it('should allow selecting a different scheme', async () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      // Wait for initial load
      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      // Click on scheme selector to open dropdown
      const schemeSelectorButton = screen.getByTestId('scheme-selector-button');
      fireEvent.click(schemeSelectorButton);

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
      });

      // Select Debatex
      const debatexOption = screen.getByText('Debatex');
      fireEvent.click(debatexOption);

      // Verify selector shows new selection
      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-button')).toHaveTextContent('Debatex');
      });
    });
  });

  // ============================================================
  // Task 4.1: Save Functionality
  // Requirements: 4.5
  // ============================================================
  describe('Task 4.1: Save Functionality', () => {
    it('should call saveProjectDefaults when Save button is clicked', async () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveProjectDefaults).toHaveBeenCalledWith(
          '/test/project',
          expect.objectContaining({
            documentReview: expect.objectContaining({
              scheme: expect.any(String),
            }),
          })
        );
      });
    });

    it('should save changed scheme when Save button is clicked', async () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      // Click on scheme selector
      const schemeSelectorButton = screen.getByTestId('scheme-selector-button');
      fireEvent.click(schemeSelectorButton);

      // Select Debatex
      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
      });
      const debatexOption = screen.getByText('Debatex');
      fireEvent.click(debatexOption);

      // Save
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveProjectDefaults).toHaveBeenCalledWith(
          '/test/project',
          expect.objectContaining({
            documentReview: { scheme: 'debatex' },
          })
        );
      });
    });

    it('should update specDetailStore projectDefaultScheme after save', async () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      // Change scheme
      const schemeSelectorButton = screen.getByTestId('scheme-selector-button');
      fireEvent.click(schemeSelectorButton);

      await waitFor(() => {
        expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
      });
      const debatexOption = screen.getByText('Debatex');
      fireEvent.click(debatexOption);

      // Save
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(useSpecDetailStore.getState().projectDefaultScheme).toBe('debatex');
      });
    });

    it('should close dialog after successful save', async () => {
      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error message on save failure', async () => {
      window.electronAPI.saveProjectDefaults = vi.fn().mockRejectedValue(new Error('Save failed'));

      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Save failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while saving', async () => {
      window.electronAPI.saveProjectDefaults = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/保存中/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 4.1: Validation
  // Requirements: 4.5
  // ============================================================
  describe('Task 4.1: Validation', () => {
    it('should not save if no project is selected', async () => {
      useProjectStore.setState({
        currentProject: null,
      });

      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      // Save button should be disabled or not call API
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveProjectDefaults).not.toHaveBeenCalled();
      });
    });

    it('should handle case when loadProjectDefaults returns undefined', async () => {
      window.electronAPI.loadProjectDefaults = vi.fn().mockResolvedValue(undefined);

      render(<ProjectSettingsDialog isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(window.electronAPI.loadProjectDefaults).toHaveBeenCalled();
      });

      // Should still render and default to claude-code
      expect(screen.getByTestId('scheme-selector-button')).toHaveTextContent('Claude');
    });
  });
});
