/**
 * BugAutoExecutionStatusDisplay Tests
 * bugs-workflow-auto-execution Task 3, 6.1
 * Requirements: 3.1-3.5, 5.1, 5.3, 6.2, 6.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugAutoExecutionStatusDisplay } from './BugAutoExecutionStatusDisplay';
import type { BugAutoExecutionStatus } from '../types/bugAutoExecution';

describe('BugAutoExecutionStatusDisplay', () => {
  const defaultProps = {
    status: 'idle' as BugAutoExecutionStatus,
    currentPhase: null,
    lastFailedPhase: null,
    retryCount: 0,
    onRetry: vi.fn(),
    onStop: vi.fn(),
  };

  describe('Task 3.1: Basic rendering', () => {
    it('should not render when status is idle', () => {
      const { container } = render(
        <BugAutoExecutionStatusDisplay {...defaultProps} status="idle" />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when status is running', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="analyze"
        />
      );

      expect(screen.getByText('自動実行中')).toBeInTheDocument();
    });

    it('should render when status is paused', () => {
      render(
        <BugAutoExecutionStatusDisplay {...defaultProps} status="paused" />
      );

      expect(screen.getByText('Agent待機中')).toBeInTheDocument();
    });

    it('should render when status is completed', () => {
      render(
        <BugAutoExecutionStatusDisplay {...defaultProps} status="completed" />
      );

      expect(screen.getByText('自動実行完了')).toBeInTheDocument();
    });

    it('should render when status is error', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="fix"
        />
      );

      expect(screen.getByText('エラー')).toBeInTheDocument();
    });
  });

  describe('Task 3.2: Status display content', () => {
    it('should display current phase name when running', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="analyze"
        />
      );

      expect(screen.getByText('- Analyze')).toBeInTheDocument();
    });

    it('should display failed phase name when error', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="fix"
        />
      );

      expect(screen.getByText('- Fixで失敗')).toBeInTheDocument();
    });

    it('should display retry count when retryCount > 0', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="analyze"
          retryCount={2}
        />
      );

      expect(screen.getByText('(リトライ 2回)')).toBeInTheDocument();
    });

    it('should not display retry count when retryCount is 0', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="analyze"
          retryCount={0}
        />
      );

      expect(screen.queryByText(/リトライ/)).not.toBeInTheDocument();
    });
  });

  describe('Task 3.3: Action buttons', () => {
    it('should display stop button when running', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="analyze"
        />
      );

      expect(screen.getByText('停止')).toBeInTheDocument();
    });

    it('should display stop button when paused', () => {
      render(
        <BugAutoExecutionStatusDisplay {...defaultProps} status="paused" />
      );

      expect(screen.getByText('停止')).toBeInTheDocument();
    });

    it('should display retry button when error', () => {
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="fix"
        />
      );

      expect(screen.getByText('再実行')).toBeInTheDocument();
    });

    it('should call onStop when stop button is clicked', () => {
      const onStop = vi.fn();
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="analyze"
          onStop={onStop}
        />
      );

      fireEvent.click(screen.getByText('停止'));

      expect(onStop).toHaveBeenCalled();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="fix"
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByText('再実行'));

      expect(onRetry).toHaveBeenCalled();
    });

    it('should not display action buttons when completed', () => {
      render(
        <BugAutoExecutionStatusDisplay {...defaultProps} status="completed" />
      );

      expect(screen.queryByText('停止')).not.toBeInTheDocument();
      expect(screen.queryByText('再実行')).not.toBeInTheDocument();
    });
  });

  describe('Style consistency with Spec workflow', () => {
    it('should have consistent styling for running state', () => {
      const { container } = render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="analyze"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-blue-200');
    });

    it('should have consistent styling for paused state', () => {
      const { container } = render(
        <BugAutoExecutionStatusDisplay {...defaultProps} status="paused" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-yellow-200');
    });

    it('should have consistent styling for error state', () => {
      const { container } = render(
        <BugAutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="fix"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-red-200');
    });

    it('should have consistent styling for completed state', () => {
      const { container } = render(
        <BugAutoExecutionStatusDisplay {...defaultProps} status="completed" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-green-200');
    });
  });
});
