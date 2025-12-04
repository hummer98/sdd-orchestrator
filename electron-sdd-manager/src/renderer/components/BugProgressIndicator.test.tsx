/**
 * BugProgressIndicator Component Tests
 * Requirements: 3.2, 3.3, 3.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BugProgressIndicator, BugPhaseLabel } from './BugProgressIndicator';
import type { BugPhase } from '../types';

describe('BugProgressIndicator', () => {
  // ============================================================
  // Task 3.2: Phase display testing
  // Requirements: 3.2, 3.3, 3.4
  // ============================================================
  describe('phase display', () => {
    describe('reported phase', () => {
      it('should show report as current phase', () => {
        render(<BugProgressIndicator phase="reported" />);

        expect(screen.getByTestId('phase-reported-current')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-pending')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-pending')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-pending')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="reported" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '0');
        expect(progressbar).toHaveAttribute('aria-valuemin', '0');
        expect(progressbar).toHaveAttribute('aria-valuemax', '3');
        expect(progressbar).toHaveAttribute('aria-valuetext', 'reported (1/4)');
      });
    });

    describe('analyzed phase', () => {
      it('should show report as completed and analyze as current', () => {
        render(<BugProgressIndicator phase="analyzed" />);

        expect(screen.getByTestId('phase-reported-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-current')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-pending')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-pending')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="analyzed" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '1');
        expect(progressbar).toHaveAttribute('aria-valuetext', 'analyzed (2/4)');
      });
    });

    describe('fixed phase', () => {
      it('should show report and analyze as completed and fix as current', () => {
        render(<BugProgressIndicator phase="fixed" />);

        expect(screen.getByTestId('phase-reported-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-current')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-pending')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="fixed" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '2');
        expect(progressbar).toHaveAttribute('aria-valuetext', 'fixed (3/4)');
      });
    });

    describe('verified phase', () => {
      it('should show all phases as completed', () => {
        render(<BugProgressIndicator phase="verified" />);

        expect(screen.getByTestId('phase-reported-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-current')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="verified" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '3');
        expect(progressbar).toHaveAttribute('aria-valuetext', 'verified (4/4)');
      });
    });
  });

  // ============================================================
  // Compact mode
  // ============================================================
  describe('compact mode', () => {
    it('should render in compact mode when prop is true', () => {
      const { container } = render(<BugProgressIndicator phase="reported" compact={true} />);

      // Verify compact styling is applied (smaller gaps)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-0.5');
    });

    it('should render in normal mode by default', () => {
      const { container } = render(<BugProgressIndicator phase="reported" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-1');
    });
  });

  // ============================================================
  // Visual distinction between phases
  // Requirements: 3.3, 3.4
  // ============================================================
  describe('visual distinction', () => {
    it('should use green color for completed phases', () => {
      const { container } = render(<BugProgressIndicator phase="fixed" />);

      // Get completed phase icons
      const completedIcons = container.querySelectorAll('.text-green-600');
      expect(completedIcons.length).toBeGreaterThanOrEqual(2); // reported and analyzed
    });

    it('should use blue color for current phase', () => {
      render(<BugProgressIndicator phase="analyzed" />);

      const currentIcon = screen.getByTestId('phase-analyzed-current');
      // Lucide icons render as SVG elements with class attribute
      expect(currentIcon).toHaveClass('text-blue-600');
    });

    it('should use gray color for pending phases', () => {
      const { container } = render(<BugProgressIndicator phase="reported" />);

      const pendingIcons = container.querySelectorAll('.text-gray-400');
      expect(pendingIcons.length).toBeGreaterThanOrEqual(3); // analyzed, fixed, verified
    });

    it('should show connector lines between phases', () => {
      const { container } = render(<BugProgressIndicator phase="analyzed" />);

      // There should be 3 connector lines (between 4 phases)
      const connectors = container.querySelectorAll('.h-0\\.5');
      expect(connectors).toHaveLength(3);
    });

    it('should color connector green when leading to current or completed phase', () => {
      const { container } = render(<BugProgressIndicator phase="analyzed" />);

      const greenConnectors = container.querySelectorAll('.bg-green-400');
      // First connector (before reported to analyzed) should be green
      expect(greenConnectors.length).toBeGreaterThanOrEqual(1);
    });

    it('should color connector gray for future phases', () => {
      const { container } = render(<BugProgressIndicator phase="reported" />);

      const grayConnectors = container.querySelectorAll('.bg-gray-300');
      expect(grayConnectors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('BugPhaseLabel', () => {
  // ============================================================
  // Label display tests
  // ============================================================
  describe('label display', () => {
    const phaseLabels: Record<BugPhase, string> = {
      reported: 'Report',
      analyzed: 'Analyze',
      fixed: 'Fix',
      verified: 'Verify',
    };

    Object.entries(phaseLabels).forEach(([phase, label]) => {
      it(`should display "${label}" for ${phase} phase`, () => {
        render(<BugPhaseLabel phase={phase as BugPhase} />);

        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('label styling', () => {
    it('should use green color for verified phase', () => {
      const { container } = render(<BugPhaseLabel phase="verified" />);

      const span = container.querySelector('span');
      expect(span?.className).toContain('text-green-600');
    });

    it('should use blue color for intermediate phases', () => {
      const { container } = render(<BugPhaseLabel phase="analyzed" />);

      const span = container.querySelector('span');
      expect(span?.className).toContain('text-blue-600');
    });

    it('should use gray color for reported phase', () => {
      const { container } = render(<BugPhaseLabel phase="reported" />);

      const span = container.querySelector('span');
      expect(span?.className).toContain('text-gray-600');
    });
  });
});
