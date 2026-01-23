/**
 * PhaseMetricsView Tests
 * TDD tests for Task 7.2: Phase metrics view component
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseMetricsView } from './PhaseMetricsView';
import type { PhaseMetrics, WorkflowPhase } from '../../../main/types/metrics';

describe('PhaseMetricsView', () => {
  // ==========================================================================
  // Test Data
  // ==========================================================================
  const mockPhaseMetrics: Record<WorkflowPhase, PhaseMetrics> = {
    requirements: { aiTimeMs: 180000, humanTimeMs: 120000, status: 'completed' },
    design: { aiTimeMs: 300000, humanTimeMs: 180000, status: 'completed' },
    tasks: { aiTimeMs: 120000, humanTimeMs: 60000, status: 'in-progress' },
    impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
  };

  // ==========================================================================
  // Rendering
  // ==========================================================================
  describe('rendering', () => {
    it('should render all phase metrics', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} />);

      expect(screen.getByTestId('phase-metrics-requirements')).toBeInTheDocument();
      expect(screen.getByTestId('phase-metrics-design')).toBeInTheDocument();
      expect(screen.getByTestId('phase-metrics-tasks')).toBeInTheDocument();
      expect(screen.getByTestId('phase-metrics-impl')).toBeInTheDocument();
    });

    it('should render single phase when phase prop is provided', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="requirements" />);

      expect(screen.getByTestId('phase-metrics-requirements')).toBeInTheDocument();
      expect(screen.queryByTestId('phase-metrics-design')).not.toBeInTheDocument();
    });

    it('should render placeholder when phaseMetrics is null', () => {
      render(<PhaseMetricsView phaseMetrics={null} />);
      expect(screen.getByText(/--/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Phase Labels (Requirement 6.1)
  // ==========================================================================
  describe('phase labels', () => {
    it('should display requirements label (Requirement 6.1)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="requirements" />);
      expect(screen.getByText(/requirements|要件/i)).toBeInTheDocument();
    });

    it('should display design label (Requirement 6.1)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="design" />);
      expect(screen.getByText(/design|設計/i)).toBeInTheDocument();
    });

    it('should display tasks label (Requirement 6.1)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="tasks" />);
      expect(screen.getByText(/tasks|タスク/i)).toBeInTheDocument();
    });

    it('should display impl label (Requirement 6.1)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="impl" />);
      expect(screen.getByText(/impl|実装/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AI Time Display (Requirement 6.2)
  // ==========================================================================
  describe('AI time display', () => {
    it('should display AI time for each phase (Requirement 6.2)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="requirements" />);

      // 180000ms = 3m
      const aiTimeElement = screen.getByTestId('phase-metrics-requirements-ai-time');
      expect(aiTimeElement).toBeInTheDocument();
      expect(aiTimeElement).toHaveTextContent('3m');
    });

    it('should display zero AI time correctly', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="impl" />);

      const aiTimeElement = screen.getByTestId('phase-metrics-impl-ai-time');
      expect(aiTimeElement).toHaveTextContent('0s');
    });
  });

  // ==========================================================================
  // Human Time Display (Requirement 6.3)
  // ==========================================================================
  describe('human time display', () => {
    it('should display human time for each phase (Requirement 6.3)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="design" />);

      // 180000ms = 3m
      const humanTimeElement = screen.getByTestId('phase-metrics-design-human-time');
      expect(humanTimeElement).toBeInTheDocument();
      expect(humanTimeElement).toHaveTextContent('3m');
    });
  });

  // ==========================================================================
  // Status Icons (Requirement 6.4)
  // ==========================================================================
  describe('status icons', () => {
    it('should display pending status icon (Requirement 6.4)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="impl" />);

      const statusElement = screen.getByTestId('phase-metrics-impl-status');
      expect(statusElement).toBeInTheDocument();
      // Check for pending indicator (text, class, or icon)
      expect(statusElement).toHaveAttribute('data-status', 'pending');
    });

    it('should display in-progress status icon (Requirement 6.4)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="tasks" />);

      const statusElement = screen.getByTestId('phase-metrics-tasks-status');
      expect(statusElement).toHaveAttribute('data-status', 'in-progress');
    });

    it('should display completed status icon (Requirement 6.4)', () => {
      render(<PhaseMetricsView phaseMetrics={mockPhaseMetrics} phase="requirements" />);

      const statusElement = screen.getByTestId('phase-metrics-requirements-status');
      expect(statusElement).toHaveAttribute('data-status', 'completed');
    });
  });

  // ==========================================================================
  // Inline Display Mode
  // ==========================================================================
  describe('inline display mode', () => {
    it('should support inline display mode', () => {
      render(
        <PhaseMetricsView
          phaseMetrics={mockPhaseMetrics}
          phase="requirements"
          variant="inline"
        />
      );

      const container = screen.getByTestId('phase-metrics-requirements');
      expect(container.className).toContain('inline');
    });

    it('should support compact display mode', () => {
      render(
        <PhaseMetricsView
          phaseMetrics={mockPhaseMetrics}
          phase="requirements"
          variant="compact"
        />
      );

      const container = screen.getByTestId('phase-metrics-requirements');
      expect(container.className).toContain('compact');
    });
  });

  // ==========================================================================
  // Styling
  // ==========================================================================
  describe('styling', () => {
    it('should support custom className', () => {
      render(
        <PhaseMetricsView
          phaseMetrics={mockPhaseMetrics}
          phase="requirements"
          className="custom-class"
        />
      );

      expect(screen.getByTestId('phase-metrics-requirements')).toHaveClass('custom-class');
    });
  });
});
