/**
 * AutoExecutionStatusDisplay Component Tests
 * TDD: Testing auto execution status display
 * Requirements: 5.1, 5.5, 8.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoExecutionStatusDisplay } from './AutoExecutionStatusDisplay';
import type { AutoExecutionStatus } from '../stores/workflowStore';
import type { WorkflowPhase } from '../types/workflow';

describe('AutoExecutionStatusDisplay', () => {
  const defaultProps = {
    status: 'idle' as AutoExecutionStatus,
    currentPhase: null as WorkflowPhase | null,
    lastFailedPhase: null as WorkflowPhase | null,
    retryCount: 0,
    onRetry: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 11.1: Progress and status display
  // Requirements: 5.1
  // ============================================================
  describe('Task 11.1: Status display', () => {
    it('should not render when status is idle', () => {
      const { container } = render(<AutoExecutionStatusDisplay {...defaultProps} status="idle" />);
      expect(container.firstChild).toBeNull();
    });

    it('should display running status with current phase', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="design"
        />
      );

      expect(screen.getByText(/実行中/i)).toBeInTheDocument();
      expect(screen.getByText(/設計/i)).toBeInTheDocument();
    });

    it('should display paused status', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="paused"
          currentPhase="tasks"
        />
      );

      expect(screen.getByText(/待機中/i)).toBeInTheDocument();
    });

    it('should display error status with failed phase', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="design"
        />
      );

      expect(screen.getByText(/エラー/i)).toBeInTheDocument();
      expect(screen.getByText(/設計/i)).toBeInTheDocument();
    });

    it('should display completed status', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="completed"
        />
      );

      expect(screen.getByText(/完了/i)).toBeInTheDocument();
    });

    it('should display retry count when > 0', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="design"
          retryCount={2}
        />
      );

      expect(screen.getByText(/リトライ.*2/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 11.2: Button handlers
  // Requirements: 5.5, 8.2
  // ============================================================
  describe('Task 11.2: Button handlers', () => {
    it('should show stop button when running', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="design"
        />
      );

      expect(screen.getByRole('button', { name: /停止/i })).toBeInTheDocument();
    });

    it('should call onStop when stop button clicked', () => {
      const onStop = vi.fn();
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="design"
          onStop={onStop}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /停止/i }));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('should show retry button when error', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="design"
        />
      );

      expect(screen.getByRole('button', { name: /再実行/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', () => {
      const onRetry = vi.fn();
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="design"
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /再実行/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });
});
