/**
 * Toast Component Tests
 * TDD: Test-first implementation for shared Toast component
 * Requirements: 3.1 (Component sharing)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast, ToastType } from './Toast';

describe('Toast', () => {
  const defaultProps = {
    id: 'test-toast',
    message: 'Test message',
    type: 'info' as ToastType,
    onClose: vi.fn(),
  };

  describe('Basic rendering', () => {
    it('should render the message', () => {
      render(<Toast {...defaultProps} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<Toast {...defaultProps} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<Toast {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast types', () => {
    it('should render success type with green styling', () => {
      render(<Toast {...defaultProps} type="success" />);
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('green');
    });

    it('should render error type with red styling', () => {
      render(<Toast {...defaultProps} type="error" />);
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('red');
    });

    it('should render warning type with yellow styling', () => {
      render(<Toast {...defaultProps} type="warning" />);
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('yellow');
    });

    it('should render info type with blue styling', () => {
      render(<Toast {...defaultProps} type="info" />);
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('blue');
    });
  });

  describe('Icons', () => {
    it('should render appropriate icon for each type', () => {
      const { rerender } = render(<Toast {...defaultProps} type="success" />);
      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="error" />);
      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="warning" />);
      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="info" />);
      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();
    });
  });

  describe('Action button', () => {
    it('should render action button when provided', () => {
      const action = {
        label: 'Undo',
        onClick: vi.fn(),
      };
      render(<Toast {...defaultProps} action={action} />);
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('should call action onClick when action button is clicked', () => {
      const onClick = vi.fn();
      const action = {
        label: 'Undo',
        onClick,
      };
      render(<Toast {...defaultProps} action={action} />);
      fireEvent.click(screen.getByText('Undo'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not render action button when not provided', () => {
      render(<Toast {...defaultProps} />);
      expect(screen.queryByText('Undo')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      render(<Toast {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(<Toast {...defaultProps} />);
      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveAttribute('aria-label');
    });
  });
});
