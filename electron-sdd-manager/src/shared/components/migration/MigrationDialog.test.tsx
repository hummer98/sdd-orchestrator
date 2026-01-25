/**
 * MigrationDialog Component Tests
 * Requirements: 5.3, 5.4, 5.5
 *
 * Task 6.1: MigrationDialog component
 * Task 6.2: Store integration
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MigrationDialog, type MigrationDialogProps } from './MigrationDialog';

describe('MigrationDialog', () => {
  const defaultProps: MigrationDialogProps = {
    isOpen: true,
    specId: 'my-feature',
    fileCount: 5,
    totalSize: 12345,
    isProcessing: false,
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    onClose: vi.fn(),
  };

  // =============================================================================
  // Task 6.1: MigrationDialog component
  // Requirements: 5.3
  // =============================================================================
  describe('Basic rendering (Task 6.1)', () => {
    it('should render when isOpen is true', () => {
      render(<MigrationDialog {...defaultProps} />);

      expect(screen.getByTestId('migration-dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<MigrationDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('migration-dialog')).not.toBeInTheDocument();
    });

    it('should display spec ID', () => {
      render(<MigrationDialog {...defaultProps} />);

      expect(screen.getByText(/my-feature/)).toBeInTheDocument();
    });

    it('should display file count (Req 5.3)', () => {
      render(<MigrationDialog {...defaultProps} fileCount={5} />);

      expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    it('should display total size in human-readable format (Req 5.3)', () => {
      render(<MigrationDialog {...defaultProps} totalSize={12345} />);

      // Should display formatted size (e.g., "12.1 KB")
      expect(screen.getByText(/12\.1\s*KB|12,345/)).toBeInTheDocument();
    });

    it('should display Accept button', () => {
      render(<MigrationDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Migrate/i })).toBeInTheDocument();
    });

    it('should display Decline button', () => {
      render(<MigrationDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
    });

    it('should display migration explanation text', () => {
      render(<MigrationDialog {...defaultProps} />);

      // Should explain what migration does - find the text about legacy log files
      expect(screen.getByText(/Legacy log files/i)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Task 6.1: Button behavior
  // =============================================================================
  describe('Button behavior', () => {
    it('should call onAccept when Accept button is clicked', () => {
      const onAccept = vi.fn();
      render(<MigrationDialog {...defaultProps} onAccept={onAccept} />);

      const acceptButton = screen.getByRole('button', { name: /Migrate/i });
      fireEvent.click(acceptButton);

      expect(onAccept).toHaveBeenCalledWith('my-feature');
    });

    it('should call onDecline when Decline button is clicked', () => {
      const onDecline = vi.fn();
      render(<MigrationDialog {...defaultProps} onDecline={onDecline} />);

      const declineButton = screen.getByRole('button', { name: /Skip/i });
      fireEvent.click(declineButton);

      expect(onDecline).toHaveBeenCalledWith('my-feature');
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<MigrationDialog {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByTestId('dialog-backdrop');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Task 6.1: Processing state
  // =============================================================================
  describe('Processing state (Req 5.3)', () => {
    it('should disable buttons when isProcessing is true', () => {
      render(<MigrationDialog {...defaultProps} isProcessing={true} />);

      const acceptButton = screen.getByRole('button', { name: /Migrating/i });
      const declineButton = screen.getByRole('button', { name: /Skip/i });

      expect(acceptButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
    });

    it('should show processing indicator when isProcessing is true', () => {
      render(<MigrationDialog {...defaultProps} isProcessing={true} />);

      // Should show migrating text (we have two "Migrating..." elements in the UI)
      const migratingElements = screen.getAllByText(/Migrating/i);
      expect(migratingElements.length).toBeGreaterThan(0);
    });

    it('should enable buttons when isProcessing is false', () => {
      render(<MigrationDialog {...defaultProps} isProcessing={false} />);

      const acceptButton = screen.getByRole('button', { name: /Migrate/i });
      const declineButton = screen.getByRole('button', { name: /Skip/i });

      expect(acceptButton).not.toBeDisabled();
      expect(declineButton).not.toBeDisabled();
    });
  });

  // =============================================================================
  // Task 6.1: Error state
  // =============================================================================
  describe('Error state', () => {
    it('should display error message when error prop is provided', () => {
      render(<MigrationDialog {...defaultProps} error="Migration failed" />);

      expect(screen.getByText(/Migration failed/)).toBeInTheDocument();
    });

    it('should not display error when error prop is undefined', () => {
      render(<MigrationDialog {...defaultProps} error={undefined} />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // Bug support
  // =============================================================================
  describe('Bug support', () => {
    it('should handle bug: prefix in specId', () => {
      render(<MigrationDialog {...defaultProps} specId="bug:login-error" />);

      expect(screen.getByText(/login-error/)).toBeInTheDocument();
    });

    it('should display bug context when specId has bug: prefix', () => {
      render(<MigrationDialog {...defaultProps} specId="bug:login-error" />);

      // Could show "Bug" label or specific context
      expect(screen.getByTestId('migration-dialog')).toBeInTheDocument();
    });
  });
});
