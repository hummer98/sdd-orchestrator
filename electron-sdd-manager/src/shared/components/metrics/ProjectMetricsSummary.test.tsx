/**
 * ProjectMetricsSummary Tests
 * TDD tests for Task 8.2: Project metrics UI
 * Requirements: 8.1, 8.2, 8.3
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectMetricsSummary } from './ProjectMetricsSummary';
import type { ProjectMetrics } from '../../../main/types/metrics';

describe('ProjectMetricsSummary', () => {
  // ==========================================================================
  // Requirement 8.1: Display total AI execution time
  // ==========================================================================
  describe('Total AI Time Display (Requirement 8.1)', () => {
    it('should display total AI execution time', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 1800000, // 30 minutes
        totalHumanTimeMs: 900000,
        completedSpecCount: 2,
        inProgressSpecCount: 3,
      };

      render(<ProjectMetricsSummary metrics={metrics} />);

      const aiTime = screen.getByTestId('project-metrics-ai-time');
      expect(aiTime).toHaveTextContent('30m');
    });

    it('should display AI time in hours format for long durations', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 7200000, // 2 hours
        totalHumanTimeMs: 0,
        completedSpecCount: 0,
        inProgressSpecCount: 0,
      };

      render(<ProjectMetricsSummary metrics={metrics} />);

      const aiTime = screen.getByTestId('project-metrics-ai-time');
      expect(aiTime).toHaveTextContent('2h');
    });
  });

  // ==========================================================================
  // Requirement 8.2: Display total human consumption time
  // ==========================================================================
  describe('Total Human Time Display (Requirement 8.2)', () => {
    it('should display total human consumption time', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 1800000,
        totalHumanTimeMs: 2700000, // 45 minutes
        completedSpecCount: 2,
        inProgressSpecCount: 3,
      };

      render(<ProjectMetricsSummary metrics={metrics} />);

      const humanTime = screen.getByTestId('project-metrics-human-time');
      expect(humanTime).toHaveTextContent('45m');
    });
  });

  // ==========================================================================
  // Requirement 8.3: Display spec counts
  // ==========================================================================
  describe('Spec Counts Display (Requirement 8.3)', () => {
    it('should display completed spec count', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 0,
        totalHumanTimeMs: 0,
        completedSpecCount: 5,
        inProgressSpecCount: 3,
      };

      render(<ProjectMetricsSummary metrics={metrics} />);

      const completedCount = screen.getByTestId('project-metrics-completed-count');
      expect(completedCount).toHaveTextContent('5');
    });

    it('should display in-progress spec count', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 0,
        totalHumanTimeMs: 0,
        completedSpecCount: 5,
        inProgressSpecCount: 3,
      };

      render(<ProjectMetricsSummary metrics={metrics} />);

      const inProgressCount = screen.getByTestId('project-metrics-in-progress-count');
      expect(inProgressCount).toHaveTextContent('3');
    });
  });

  // ==========================================================================
  // Component rendering
  // ==========================================================================
  describe('Component Rendering', () => {
    it('should have correct test ID for the panel', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 0,
        totalHumanTimeMs: 0,
        completedSpecCount: 0,
        inProgressSpecCount: 0,
      };

      render(<ProjectMetricsSummary metrics={metrics} />);

      expect(screen.getByTestId('project-metrics-summary')).toBeInTheDocument();
    });

    it('should show loading state when metrics is null', () => {
      render(<ProjectMetricsSummary metrics={null} />);

      // Should show dashes for all values when loading
      const aiTime = screen.getByTestId('project-metrics-ai-time');
      const humanTime = screen.getByTestId('project-metrics-human-time');

      expect(aiTime).toHaveTextContent('--');
      expect(humanTime).toHaveTextContent('--');
    });

    it('should apply custom className', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 0,
        totalHumanTimeMs: 0,
        completedSpecCount: 0,
        inProgressSpecCount: 0,
      };

      render(<ProjectMetricsSummary metrics={metrics} className="custom-class" />);

      const panel = screen.getByTestId('project-metrics-summary');
      expect(panel).toHaveClass('custom-class');
    });

    it('should display zero values correctly', () => {
      const metrics: ProjectMetrics = {
        totalAiTimeMs: 0,
        totalHumanTimeMs: 0,
        completedSpecCount: 0,
        inProgressSpecCount: 0,
      };

      render(<ProjectMetricsSummary metrics={metrics} />);

      const aiTime = screen.getByTestId('project-metrics-ai-time');
      const humanTime = screen.getByTestId('project-metrics-human-time');
      const completedCount = screen.getByTestId('project-metrics-completed-count');
      const inProgressCount = screen.getByTestId('project-metrics-in-progress-count');

      expect(aiTime).toHaveTextContent('0s');
      expect(humanTime).toHaveTextContent('0s');
      expect(completedCount).toHaveTextContent('0');
      expect(inProgressCount).toHaveTextContent('0');
    });
  });
});
