/**
 * ResultBlock tests
 * Task 5.7: Success/error state display and statistics display tests
 * Requirements: 6.1, 6.2, 6.3
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultBlock } from './ResultBlock';

describe('ResultBlock', () => {
  describe('success/error state display (Requirement 6.1)', () => {
    it('should show success state for successful result', () => {
      const { container } = render(
        <ResultBlock
          result={{
            content: 'Task completed successfully',
            isError: false,
          }}
        />
      );

      // Should have success styling (green)
      const element = container.querySelector('[class*="green"]');
      expect(element).toBeInTheDocument();

      // Should have success icon (CheckCircle)
      expect(screen.getByTestId('result-success-icon')).toBeInTheDocument();
    });

    it('should show error state for error result', () => {
      const { container } = render(
        <ResultBlock
          result={{
            content: 'Error occurred',
            isError: true,
          }}
        />
      );

      // Should have error styling (red)
      const element = container.querySelector('[class*="red"]');
      expect(element).toBeInTheDocument();

      // Should have error icon (XCircle)
      expect(screen.getByTestId('result-error-icon')).toBeInTheDocument();
    });
  });

  describe('statistics display (Requirement 6.2)', () => {
    it('should display duration in seconds', () => {
      render(
        <ResultBlock
          result={{
            content: 'Done',
            isError: false,
            durationMs: 5000,
          }}
        />
      );

      // Should show 5.0 seconds
      expect(screen.getByText(/5\.0/)).toBeInTheDocument();
      expect(screen.getByText(/秒|sec/i)).toBeInTheDocument();
    });

    it('should display cost in USD', () => {
      render(
        <ResultBlock
          result={{
            content: 'Done',
            isError: false,
            costUsd: 0.0123,
          }}
        />
      );

      // Should show cost
      expect(screen.getByText(/\$0\.0123/)).toBeInTheDocument();
    });

    it('should display number of turns', () => {
      render(
        <ResultBlock
          result={{
            content: 'Done',
            isError: false,
            numTurns: 5,
          }}
        />
      );

      // Should show turns
      expect(screen.getByText(/5/)).toBeInTheDocument();
      expect(screen.getByText(/ターン|turn/i)).toBeInTheDocument();
    });

    it('should display token usage', () => {
      render(
        <ResultBlock
          result={{
            content: 'Done',
            isError: false,
            inputTokens: 1000,
            outputTokens: 500,
          }}
        />
      );

      // Should show token counts
      expect(screen.getByText(/1,?000/)).toBeInTheDocument();
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('should display all statistics when provided', () => {
      render(
        <ResultBlock
          result={{
            content: 'Done',
            isError: false,
            durationMs: 10000,
            costUsd: 0.05,
            numTurns: 3,
            inputTokens: 2000,
            outputTokens: 1000,
          }}
        />
      );

      expect(screen.getByText(/10\.0/)).toBeInTheDocument();
      expect(screen.getByText(/\$0\.05/)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it('should not show statistics fields when undefined', () => {
      const { container } = render(
        <ResultBlock
          result={{
            content: 'Done',
            isError: false,
          }}
        />
      );

      // Should not have statistics section with cost
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  describe('error message emphasis (Requirement 6.3)', () => {
    it('should display error content prominently', () => {
      render(
        <ResultBlock
          result={{
            content: 'Critical error: Database connection failed',
            isError: true,
          }}
        />
      );

      expect(screen.getByText(/Critical error/)).toBeInTheDocument();
    });

    it('should have distinct error styling', () => {
      const { container } = render(
        <ResultBlock
          result={{
            content: 'Error message',
            isError: true,
          }}
        />
      );

      // Should have red background or border
      const errorElement = container.querySelector('[class*="red"]');
      expect(errorElement).toBeInTheDocument();
    });
  });

  describe('content display', () => {
    it('should display result content', () => {
      render(
        <ResultBlock
          result={{
            content: 'Task completed with output:\nLine 1\nLine 2',
            isError: false,
          }}
        />
      );

      expect(screen.getByText(/Task completed/)).toBeInTheDocument();
    });
  });

  describe('theme support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <ResultBlock
          result={{
            content: 'Done',
            isError: false,
          }}
        />
      );

      // Check for dark: prefix classes
      const element = container.querySelector('[class*="dark:"]');
      expect(element).toBeInTheDocument();
    });
  });
});
