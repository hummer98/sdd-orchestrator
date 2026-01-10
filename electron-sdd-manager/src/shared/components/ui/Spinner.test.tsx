/**
 * Spinner Component Tests
 * TDD: Test-first implementation for shared Spinner component
 * Requirements: 3.1 (Component sharing)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  describe('Basic rendering', () => {
    it('should render a spinner element', () => {
      render(<Spinner />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should have animation class', () => {
      render(<Spinner />);
      expect(screen.getByTestId('spinner').className).toContain('animate-spin');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      render(<Spinner size="sm" />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner.className).toContain('w-4');
      expect(spinner.className).toContain('h-4');
    });

    it('should render medium size by default', () => {
      render(<Spinner />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner.className).toContain('w-6');
      expect(spinner.className).toContain('h-6');
    });

    it('should render large size', () => {
      render(<Spinner size="lg" />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner.className).toContain('w-8');
      expect(spinner.className).toContain('h-8');
    });
  });

  describe('Colors', () => {
    it('should have default color', () => {
      render(<Spinner />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner.className).toContain('text-blue');
    });

    it('should support custom color via className', () => {
      render(<Spinner className="text-red-500" />);
      const spinner = screen.getByTestId('spinner');
      expect(spinner.className).toContain('text-red-500');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(<Spinner />);
      expect(screen.getByTestId('spinner')).toHaveAttribute('aria-label');
    });

    it('should support custom aria-label', () => {
      render(<Spinner aria-label="Processing" />);
      expect(screen.getByTestId('spinner')).toHaveAttribute('aria-label', 'Processing');
    });
  });
});
