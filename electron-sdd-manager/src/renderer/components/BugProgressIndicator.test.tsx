/**
 * BugProgressIndicator Component Tests
 * Requirements: 3.2, 3.3, 3.4
 * bug-deploy-phase: Requirements 8.2, 8.3 - updated for 5-phase workflow
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
        // bug-deploy-phase: verify deployed phase also shown as pending
        expect(screen.getByTestId('phase-deployed-pending')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="reported" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '0');
        expect(progressbar).toHaveAttribute('aria-valuemin', '0');
        // bug-deploy-phase: updated for 5 phases
        expect(progressbar).toHaveAttribute('aria-valuemax', '4');
        expect(progressbar).toHaveAttribute('aria-valuetext', 'reported (1/5)');
      });
    });

    describe('analyzed phase', () => {
      it('should show report as completed and analyze as current', () => {
        render(<BugProgressIndicator phase="analyzed" />);

        expect(screen.getByTestId('phase-reported-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-current')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-pending')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-pending')).toBeInTheDocument();
        // bug-deploy-phase: verify deployed phase also shown as pending
        expect(screen.getByTestId('phase-deployed-pending')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="analyzed" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '1');
        // bug-deploy-phase: updated for 5 phases
        expect(progressbar).toHaveAttribute('aria-valuetext', 'analyzed (2/5)');
      });
    });

    describe('fixed phase', () => {
      it('should show report and analyze as completed and fix as current', () => {
        render(<BugProgressIndicator phase="fixed" />);

        expect(screen.getByTestId('phase-reported-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-current')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-pending')).toBeInTheDocument();
        // bug-deploy-phase: verify deployed phase also shown as pending
        expect(screen.getByTestId('phase-deployed-pending')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="fixed" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '2');
        // bug-deploy-phase: updated for 5 phases
        expect(progressbar).toHaveAttribute('aria-valuetext', 'fixed (3/5)');
      });
    });

    describe('verified phase', () => {
      it('should show report, analyze, fix as completed and verify as current', () => {
        render(<BugProgressIndicator phase="verified" />);

        expect(screen.getByTestId('phase-reported-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-current')).toBeInTheDocument();
        // bug-deploy-phase: verify deployed phase shown as pending
        expect(screen.getByTestId('phase-deployed-pending')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="verified" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '3');
        // bug-deploy-phase: updated for 5 phases
        expect(progressbar).toHaveAttribute('aria-valuetext', 'verified (4/5)');
      });
    });

    // bug-deploy-phase: Requirements 8.2 - deployed phase tests
    describe('deployed phase', () => {
      it('should show all phases as completed', () => {
        render(<BugProgressIndicator phase="deployed" />);

        expect(screen.getByTestId('phase-reported-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-analyzed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-fixed-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-verified-completed')).toBeInTheDocument();
        expect(screen.getByTestId('phase-deployed-current')).toBeInTheDocument();
      });

      it('should have correct aria attributes', () => {
        render(<BugProgressIndicator phase="deployed" />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '4');
        expect(progressbar).toHaveAttribute('aria-valuetext', 'deployed (5/5)');
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
      // bug-deploy-phase: now 4 pending phases (analyzed, fixed, verified, deployed)
      expect(pendingIcons.length).toBeGreaterThanOrEqual(4);
    });

    it('should show connector lines between phases', () => {
      const { container } = render(<BugProgressIndicator phase="analyzed" />);

      // bug-deploy-phase: There should be 4 connector lines (between 5 phases)
      const connectors = container.querySelectorAll('.h-0\\.5');
      expect(connectors).toHaveLength(4);
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
    // bug-deploy-phase: added deployed phase
    const phaseLabels: Record<BugPhase, string> = {
      reported: 'Report',
      analyzed: 'Analyze',
      fixed: 'Fix',
      verified: 'Verify',
      deployed: 'Deploy',
    };

    Object.entries(phaseLabels).forEach(([phase, label]) => {
      it(`should display "${label}" for ${phase} phase`, () => {
        render(<BugPhaseLabel phase={phase as BugPhase} />);

        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('label styling', () => {
    // bug-deploy-phase: deployed is now the final/completed phase
    it('should use green color for deployed phase', () => {
      const { container } = render(<BugPhaseLabel phase="deployed" />);

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

    // bug-deploy-phase: verified is no longer the final phase
    it('should use blue color for verified phase (intermediate)', () => {
      const { container } = render(<BugPhaseLabel phase="verified" />);

      const span = container.querySelector('span');
      expect(span?.className).toContain('text-blue-600');
    });
  });
});
