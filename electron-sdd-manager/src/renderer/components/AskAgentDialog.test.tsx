/**
 * AskAgentDialog Component Tests
 * TDD: Testing ask agent dialog for project/spec context execution
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AskAgentDialog } from '@shared/components/project';

describe('AskAgentDialog', () => {
  const mockOnExecute = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 2.1: Dialog UI
  // Requirements: 2.1, 2.2, 2.3, 2.7
  // ============================================================
  describe('dialog UI', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AskAgentDialog
          isOpen={false}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByTestId('ask-agent-dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
    });

    it('should display prompt textarea (Requirement 2.1)', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('ask-prompt-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/プロンプトを入力/)).toBeInTheDocument();
    });

    it('should display execute button (Requirement 2.2)', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /実行/i })).toBeInTheDocument();
    });

    it('should display cancel button (Requirement 2.3)', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();
    });

    it('should display "Project Agent" title for project type (Requirement 2.7)', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Project Agent/)).toBeInTheDocument();
    });

    it('should display "Spec Agent" title with spec name for spec type (Requirement 2.7)', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="spec"
          specName="my-feature"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Spec Agent/)).toBeInTheDocument();
      // Verify spec name is displayed in the title (shown in parentheses)
      expect(screen.getByText('(my-feature)')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Validation
  // Requirements: 2.4
  // ============================================================
  describe('validation', () => {
    it('should disable execute button when prompt is empty (Requirement 2.4)', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const executeButton = screen.getByRole('button', { name: /実行/i });
      expect(executeButton).toBeDisabled();
    });

    it('should enable execute button when prompt is provided', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByTestId('ask-prompt-input');
      fireEvent.change(textarea, { target: { value: 'What is the project about?' } });

      const executeButton = screen.getByRole('button', { name: /実行/i });
      expect(executeButton).not.toBeDisabled();
    });

    it('should disable execute button when prompt is whitespace only', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByTestId('ask-prompt-input');
      fireEvent.change(textarea, { target: { value: '   ' } });

      const executeButton = screen.getByRole('button', { name: /実行/i });
      expect(executeButton).toBeDisabled();
    });
  });

  // ============================================================
  // Callbacks
  // Requirements: 2.5, 2.6
  // ============================================================
  describe('callbacks', () => {
    it('should call onExecute with prompt when execute button is clicked (Requirement 2.5)', async () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByTestId('ask-prompt-input');
      fireEvent.change(textarea, { target: { value: 'My question here' } });

      const executeButton = screen.getByRole('button', { name: /実行/i });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(mockOnExecute).toHaveBeenCalledWith('My question here');
      });
    });

    it('should call onCancel when cancel button is clicked (Requirement 2.6)', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when backdrop is clicked', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const backdrop = screen.getByTestId('dialog-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when close button is clicked', () => {
      render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Form reset
  // ============================================================
  describe('form reset', () => {
    it('should clear prompt when dialog reopens', () => {
      const { rerender } = render(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByTestId('ask-prompt-input');
      fireEvent.change(textarea, { target: { value: 'Some prompt' } });

      // Close and reopen dialog
      rerender(
        <AskAgentDialog
          isOpen={false}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );
      rerender(
        <AskAgentDialog
          isOpen={true}
          agentType="project"
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const reopenedTextarea = screen.getByTestId('ask-prompt-input');
      expect(reopenedTextarea).toHaveValue('');
    });
  });
});
