/**
 * ValidateOption Component Tests
 * TDD: Testing validation option display and interactions
 * Requirements: 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidateOption } from './ValidateOption';
import type { ValidationType } from '../types/workflow';

describe('ValidateOption', () => {
  const defaultProps = {
    type: 'gap' as ValidationType,
    label: 'validate-gap',
    enabled: false,
    isExecuting: false,
    canExecute: true,
    onToggle: vi.fn(),
    onExecute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 4.1: Validation option UI
  // Requirements: 4.4, 4.5
  // ============================================================
  describe('Task 4.1: Validation option UI', () => {
    describe('checkbox display', () => {
      it('should display checkbox for auto-execute during workflow', () => {
        render(<ValidateOption {...defaultProps} />);

        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      it('should show checkbox unchecked when disabled', () => {
        render(<ValidateOption {...defaultProps} enabled={false} />);

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
      });

      it('should show checkbox checked when enabled', () => {
        render(<ValidateOption {...defaultProps} enabled={true} />);

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
      });

      it('should call onToggle when checkbox is clicked', () => {
        const onToggle = vi.fn();
        render(<ValidateOption {...defaultProps} onToggle={onToggle} />);

        fireEvent.click(screen.getByRole('checkbox'));

        expect(onToggle).toHaveBeenCalledTimes(1);
      });
    });

    describe('label display', () => {
      it('should display validation label', () => {
        render(<ValidateOption {...defaultProps} label="validate-gap" />);

        expect(screen.getByText('validate-gap')).toBeInTheDocument();
      });

      it('should display different validation labels', () => {
        const { rerender } = render(
          <ValidateOption {...defaultProps} label="validate-design" />
        );
        expect(screen.getByText('validate-design')).toBeInTheDocument();

        rerender(<ValidateOption {...defaultProps} label="validate-impl" />);
        expect(screen.getByText('validate-impl')).toBeInTheDocument();
      });
    });

    describe('execute button', () => {
      it('should display execute button for immediate validation', () => {
        render(<ValidateOption {...defaultProps} />);

        expect(screen.getByRole('button', { name: /実行/i })).toBeInTheDocument();
      });

      it('should call onExecute when execute button is clicked', () => {
        const onExecute = vi.fn();
        render(<ValidateOption {...defaultProps} onExecute={onExecute} />);

        fireEvent.click(screen.getByRole('button', { name: /実行/i }));

        expect(onExecute).toHaveBeenCalledTimes(1);
      });

      it('should hide execute button when executing', () => {
        render(<ValidateOption {...defaultProps} isExecuting={true} />);

        // Execute button should be replaced by loading indicator
        // Note: info button is still present
        expect(screen.queryByRole('button', { name: /実行/i })).not.toBeInTheDocument();
      });
    });

    describe('executing state', () => {
      it('should show loading indicator when executing', () => {
        render(<ValidateOption {...defaultProps} isExecuting={true} />);

        expect(screen.getByTestId('validation-loading')).toBeInTheDocument();
      });

      it('should disable checkbox when executing', () => {
        render(<ValidateOption {...defaultProps} isExecuting={true} />);

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeDisabled();
      });
    });

    describe('compact display', () => {
      it('should render with compact height', () => {
        render(<ValidateOption {...defaultProps} />);

        const container = screen.getByTestId('validate-option');
        // Check that it uses compact styling (height constraints)
        expect(container).toHaveClass('py-1');
      });
    });
  });
});
