/**
 * ProfileBadge Component Tests
 * Requirements: 2.4, 2.5, 5.1, 5.2, 5.3, 5.4
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileBadge } from './ProfileBadge';

describe('ProfileBadge', () => {
  // Requirements: 5.2 - profile name props
  // Requirements: 2.1 - display installed profile name
  describe('displays profile name', () => {
    it('displays cc-sdd profile name', () => {
      render(<ProfileBadge profile="cc-sdd" />);
      expect(screen.getByText('cc-sdd')).toBeInTheDocument();
    });

    it('displays cc-sdd-agent profile name', () => {
      render(<ProfileBadge profile="cc-sdd-agent" />);
      expect(screen.getByText('cc-sdd-agent')).toBeInTheDocument();
    });

    it('displays spec-manager profile name', () => {
      render(<ProfileBadge profile="spec-manager" />);
      expect(screen.getByText('spec-manager')).toBeInTheDocument();
    });
  });

  // Requirements: 5.4 - null displays "not installed"
  // Requirements: 2.2 - display "not installed" when no profile
  describe('displays "not installed" when profile is null', () => {
    it('displays "not installed" when profile is null', () => {
      render(<ProfileBadge profile={null} />);
      expect(screen.getByText('not installed')).toBeInTheDocument();
    });
  });

  // Requirements: 5.3, 2.4 - outline pill style
  describe('styling', () => {
    it('has pill-shaped border radius', () => {
      render(<ProfileBadge profile="cc-sdd" />);
      const badge = screen.getByTestId('profile-badge');
      expect(badge).toHaveClass('rounded-full');
    });

    it('has border styling (outline style)', () => {
      render(<ProfileBadge profile="cc-sdd" />);
      const badge = screen.getByTestId('profile-badge');
      expect(badge).toHaveClass('border');
    });
  });

  // className prop test
  describe('className prop', () => {
    it('applies additional className', () => {
      render(<ProfileBadge profile="cc-sdd" className="ml-4" />);
      const badge = screen.getByTestId('profile-badge');
      expect(badge).toHaveClass('ml-4');
    });
  });

  // Requirements: 2.5 - dark mode support
  describe('dark mode support', () => {
    it('has dark mode classes', () => {
      render(<ProfileBadge profile="cc-sdd" />);
      const badge = screen.getByTestId('profile-badge');
      // Check that the component has dark: prefixed classes for dark mode
      const classes = badge.className;
      expect(classes).toContain('dark:');
    });
  });
});
