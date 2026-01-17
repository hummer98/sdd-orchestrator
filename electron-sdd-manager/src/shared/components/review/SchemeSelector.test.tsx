/**
 * SchemeSelector Component Tests
 * gemini-document-review Task 5.1, 9.2
 * Requirements: 5.1, 9.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SchemeSelector, SchemeTag } from './SchemeSelector';
import type { ReviewerScheme } from '@shared/registry';

describe('SchemeSelector', () => {
  // ============================================================
  // Task 5.1: SchemeSelector component
  // Requirements: 5.1, 9.4
  // ============================================================
  describe('SchemeTag', () => {
    it('should display Claude label for claude-code scheme', () => {
      render(<SchemeTag scheme="claude-code" />);
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('should display Gemini label for gemini-cli scheme', () => {
      render(<SchemeTag scheme="gemini-cli" />);
      expect(screen.getByText('Gemini')).toBeInTheDocument();
    });

    it('should display Debatex label for debatex scheme', () => {
      render(<SchemeTag scheme="debatex" />);
      expect(screen.getByText('Debatex')).toBeInTheDocument();
    });

    it('should display Claude as default when scheme is undefined', () => {
      render(<SchemeTag scheme={undefined} />);
      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('should have blue color class for claude-code', () => {
      const { container } = render(<SchemeTag scheme="claude-code" />);
      const tag = container.querySelector('[data-testid="scheme-tag"]');
      expect(tag?.className).toContain('blue');
    });

    it('should have purple color class for gemini-cli', () => {
      const { container } = render(<SchemeTag scheme="gemini-cli" />);
      const tag = container.querySelector('[data-testid="scheme-tag"]');
      expect(tag?.className).toContain('purple');
    });

    it('should have green color class for debatex', () => {
      const { container } = render(<SchemeTag scheme="debatex" />);
      const tag = container.querySelector('[data-testid="scheme-tag"]');
      expect(tag?.className).toContain('green');
    });
  });

  describe('SchemeSelector', () => {
    let mockOnChange: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockOnChange = vi.fn();
    });

    it('should render scheme tag button', () => {
      render(<SchemeSelector scheme="claude-code" onChange={mockOnChange} />);
      expect(screen.getByTestId('scheme-selector-button')).toBeInTheDocument();
    });

    it('should show dropdown when clicked', () => {
      render(<SchemeSelector scheme="claude-code" onChange={mockOnChange} />);
      fireEvent.click(screen.getByTestId('scheme-selector-button'));
      expect(screen.getByTestId('scheme-selector-dropdown')).toBeInTheDocument();
    });

    it('should show all three engine options in dropdown', () => {
      render(<SchemeSelector scheme="claude-code" onChange={mockOnChange} />);
      fireEvent.click(screen.getByTestId('scheme-selector-button'));

      // Expect dropdown with all 3 options (Claude appears twice: in button and dropdown)
      expect(screen.getAllByText('Claude')).toHaveLength(2);
      expect(screen.getByText('Gemini')).toBeInTheDocument();
      expect(screen.getByText('Debatex')).toBeInTheDocument();
    });

    it('should call onChange when a different scheme is selected', () => {
      render(<SchemeSelector scheme="claude-code" onChange={mockOnChange} />);
      fireEvent.click(screen.getByTestId('scheme-selector-button'));

      // Click on Gemini option (only one Gemini since we started with Claude)
      const geminiOption = screen.getByText('Gemini');
      fireEvent.click(geminiOption);

      expect(mockOnChange).toHaveBeenCalledWith('gemini-cli');
    });

    it('should close dropdown after selection', () => {
      render(<SchemeSelector scheme="claude-code" onChange={mockOnChange} />);
      fireEvent.click(screen.getByTestId('scheme-selector-button'));

      const geminiOption = screen.getByText('Gemini');
      fireEvent.click(geminiOption);

      expect(screen.queryByTestId('scheme-selector-dropdown')).not.toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<SchemeSelector scheme="claude-code" onChange={mockOnChange} disabled />);
      const button = screen.getByTestId('scheme-selector-button');
      expect(button).toBeDisabled();
    });

    it('should not show dropdown when disabled and clicked', () => {
      render(<SchemeSelector scheme="claude-code" onChange={mockOnChange} disabled />);
      fireEvent.click(screen.getByTestId('scheme-selector-button'));
      expect(screen.queryByTestId('scheme-selector-dropdown')).not.toBeInTheDocument();
    });
  });
});
