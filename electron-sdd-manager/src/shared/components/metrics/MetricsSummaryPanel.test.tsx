/**
 * MetricsSummaryPanel Tests
 * TDD tests for Task 7.1: Metrics summary panel component
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsSummaryPanel } from './MetricsSummaryPanel';
import type { SpecMetrics } from '../../../main/types/metrics';

describe('MetricsSummaryPanel', () => {
  // ==========================================================================
  // Test Data
  // ==========================================================================
  const mockMetricsInProgress: SpecMetrics = {
    specId: 'test-spec',
    totalAiTimeMs: 300000,      // 5 minutes
    totalHumanTimeMs: 180000,   // 3 minutes
    totalElapsedMs: null,       // Not complete
    phaseMetrics: {
      requirements: { aiTimeMs: 100000, humanTimeMs: 60000, status: 'completed' },
      design: { aiTimeMs: 200000, humanTimeMs: 120000, status: 'completed' },
      tasks: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
      impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
    },
    status: 'in-progress',
  };

  const mockMetricsCompleted: SpecMetrics = {
    specId: 'completed-spec',
    totalAiTimeMs: 900000,       // 15 minutes
    totalHumanTimeMs: 540000,    // 9 minutes
    totalElapsedMs: 16500000,    // 4h 35m (total elapsed)
    phaseMetrics: {
      requirements: { aiTimeMs: 180000, humanTimeMs: 120000, status: 'completed' },
      design: { aiTimeMs: 300000, humanTimeMs: 180000, status: 'completed' },
      tasks: { aiTimeMs: 120000, humanTimeMs: 60000, status: 'completed' },
      impl: { aiTimeMs: 300000, humanTimeMs: 180000, status: 'completed' },
    },
    status: 'completed',
  };

  // ==========================================================================
  // Rendering
  // ==========================================================================
  describe('rendering', () => {
    it('should render the panel with data-testid', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsInProgress} />);
      expect(screen.getByTestId('metrics-summary-panel')).toBeInTheDocument();
    });

    it('should render loading state when metrics is null', () => {
      render(<MetricsSummaryPanel metrics={null} />);
      expect(screen.getByTestId('metrics-summary-panel')).toBeInTheDocument();
      // All three time values should be '--' when metrics is null
      expect(screen.getAllByText('--')).toHaveLength(3);
    });
  });

  // ==========================================================================
  // AI Time Display (Requirement 5.1)
  // ==========================================================================
  describe('AI time display', () => {
    it('should display AI execution time total (Requirement 5.1)', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsInProgress} />);
      expect(screen.getByTestId('metrics-ai-time')).toBeInTheDocument();
      // 300000ms = 5m 0s
      expect(screen.getByTestId('metrics-ai-time')).toHaveTextContent('5m');
    });

    it('should display zero AI time correctly', () => {
      const zeroMetrics: SpecMetrics = {
        ...mockMetricsInProgress,
        totalAiTimeMs: 0,
      };
      render(<MetricsSummaryPanel metrics={zeroMetrics} />);
      expect(screen.getByTestId('metrics-ai-time')).toHaveTextContent('0s');
    });
  });

  // ==========================================================================
  // Human Time Display (Requirement 5.2)
  // ==========================================================================
  describe('human time display', () => {
    it('should display human consumption time total (Requirement 5.2)', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsInProgress} />);
      expect(screen.getByTestId('metrics-human-time')).toBeInTheDocument();
      // 180000ms = 3m 0s
      expect(screen.getByTestId('metrics-human-time')).toHaveTextContent('3m');
    });
  });

  // ==========================================================================
  // Total Elapsed Time Display (Requirement 5.3)
  // ==========================================================================
  describe('total elapsed time display', () => {
    it('should display total elapsed time when completed (Requirement 5.3)', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsCompleted} />);
      expect(screen.getByTestId('metrics-total-time')).toBeInTheDocument();
      // 16500000ms = 4h 35m
      expect(screen.getByTestId('metrics-total-time')).toHaveTextContent('4h 35m');
    });

    it('should show placeholder when total elapsed time is not available', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsInProgress} />);
      expect(screen.getByTestId('metrics-total-time')).toHaveTextContent('--');
    });
  });

  // ==========================================================================
  // Status Display (Requirements 5.4, 5.5)
  // ==========================================================================
  describe('status display', () => {
    it('should display in-progress status (Requirement 5.4)', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsInProgress} />);
      expect(screen.getByTestId('metrics-status')).toHaveTextContent(/進行中|in-progress/i);
    });

    it('should display completed status (Requirement 5.5)', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsCompleted} />);
      expect(screen.getByTestId('metrics-status')).toHaveTextContent(/完了|completed/i);
    });
  });

  // ==========================================================================
  // User-Friendly Format (Requirement 5.6)
  // ==========================================================================
  describe('user-friendly format', () => {
    it('should format short durations correctly (seconds)', () => {
      const shortMetrics: SpecMetrics = {
        ...mockMetricsInProgress,
        totalAiTimeMs: 45000, // 45 seconds
      };
      render(<MetricsSummaryPanel metrics={shortMetrics} />);
      expect(screen.getByTestId('metrics-ai-time')).toHaveTextContent('45s');
    });

    it('should format medium durations correctly (minutes)', () => {
      const mediumMetrics: SpecMetrics = {
        ...mockMetricsInProgress,
        totalAiTimeMs: 330000, // 5m 30s
      };
      render(<MetricsSummaryPanel metrics={mediumMetrics} />);
      expect(screen.getByTestId('metrics-ai-time')).toHaveTextContent('5m 30s');
    });

    it('should format long durations correctly (hours)', () => {
      const longMetrics: SpecMetrics = {
        ...mockMetricsInProgress,
        totalAiTimeMs: 4980000, // 1h 23m
      };
      render(<MetricsSummaryPanel metrics={longMetrics} />);
      expect(screen.getByTestId('metrics-ai-time')).toHaveTextContent('1h 23m');
    });
  });

  // ==========================================================================
  // Styling
  // ==========================================================================
  describe('styling', () => {
    it('should support custom className', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsInProgress} className="custom-class" />);
      expect(screen.getByTestId('metrics-summary-panel')).toHaveClass('custom-class');
    });
  });

  // ==========================================================================
  // Labels
  // ==========================================================================
  describe('labels', () => {
    it('should display labels for each metric', () => {
      render(<MetricsSummaryPanel metrics={mockMetricsInProgress} />);
      // Check for labels (allowing both Japanese and English)
      expect(screen.getByText(/AI|AI時間/i)).toBeInTheDocument();
      expect(screen.getByText(/Human|人間時間|ユーザー/i)).toBeInTheDocument();
      expect(screen.getByText(/Total|総時間|合計/i)).toBeInTheDocument();
    });
  });
});
