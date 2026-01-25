/**
 * ImplMode Manual Execution Integration Tests
 * impl-mode-toggle: Task 5.2
 *
 * Tests that verify manual impl execution behavior based on implMode setting.
 * Requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImplPhasePanel } from './ImplPhasePanel';
import type { PhaseStatus } from './PhaseItem';

describe('ImplMode Manual Execution (impl-mode-toggle Task 5.2)', () => {
  const baseProps = {
    worktreeModeSelected: false,
    status: 'pending' as PhaseStatus,
    autoExecutionPermitted: true,
    isExecuting: false,
    canExecute: true,
    isAutoPhase: false,
    onExecute: vi.fn(),
    onToggleAutoPermission: vi.fn(),
    onToggleImplMode: vi.fn(),
    onExecuteParallel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Requirement 3.1: sequential mode uses spec-impl (onExecute)
  // ==========================================================================
  describe('sequential mode execution (Requirement 3.1)', () => {
    it('should call onExecute (spec-impl) when implMode is sequential', () => {
      const onExecute = vi.fn();
      const onExecuteParallel = vi.fn();

      render(
        <ImplPhasePanel
          {...baseProps}
          implMode="sequential"
          onExecute={onExecute}
          onExecuteParallel={onExecuteParallel}
        />
      );

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(onExecuteParallel).not.toHaveBeenCalled();
    });

    it('should display sequential mode toggle state', () => {
      render(
        <ImplPhasePanel
          {...baseProps}
          implMode="sequential"
        />
      );

      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ==========================================================================
  // Requirement 3.2: parallel mode uses spec-auto-impl (onExecuteParallel)
  // ==========================================================================
  describe('parallel mode execution (Requirement 3.2)', () => {
    it('should call onExecuteParallel (spec-auto-impl) when implMode is parallel', () => {
      const onExecute = vi.fn();
      const onExecuteParallel = vi.fn();

      render(
        <ImplPhasePanel
          {...baseProps}
          implMode="parallel"
          onExecute={onExecute}
          onExecuteParallel={onExecuteParallel}
        />
      );

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecuteParallel).toHaveBeenCalledTimes(1);
      expect(onExecute).not.toHaveBeenCalled();
    });

    it('should display parallel mode toggle state', () => {
      render(
        <ImplPhasePanel
          {...baseProps}
          implMode="parallel"
        />
      );

      const toggle = screen.getByTestId('parallel-mode-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ==========================================================================
  // Requirement 3.3: Default behavior when implMode not set
  // ==========================================================================
  describe('default behavior without implMode (Requirement 3.3)', () => {
    it('should call onExecute when implMode is undefined (defaults to sequential)', () => {
      const onExecute = vi.fn();
      const onExecuteParallel = vi.fn();

      render(
        <ImplPhasePanel
          {...baseProps}
          implMode={undefined}
          hasParallelTasks={true} // Legacy prop to show toggle
          parallelModeEnabled={false} // Sequential via legacy prop
          onExecute={onExecute}
          onExecuteParallel={onExecuteParallel}
        />
      );

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(onExecuteParallel).not.toHaveBeenCalled();
    });

    it('should fallback to onExecute when onExecuteParallel is not provided', () => {
      const onExecute = vi.fn();

      render(
        <ImplPhasePanel
          {...baseProps}
          implMode="parallel"
          onExecute={onExecute}
          onExecuteParallel={undefined}
        />
      );

      const button = screen.getByTestId('impl-execute-button');
      fireEvent.click(button);

      // Should fallback to onExecute
      expect(onExecute).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Toggle behavior
  // ==========================================================================
  describe('toggle behavior', () => {
    it('should call onToggleImplMode when toggle is clicked', () => {
      const onToggleImplMode = vi.fn();

      render(
        <ImplPhasePanel
          {...baseProps}
          implMode="sequential"
          onToggleImplMode={onToggleImplMode}
        />
      );

      const toggle = screen.getByTestId('parallel-mode-toggle');
      fireEvent.click(toggle);

      expect(onToggleImplMode).toHaveBeenCalledTimes(1);
    });

    it('should always display toggle when implMode is provided', () => {
      render(
        <ImplPhasePanel
          {...baseProps}
          implMode="sequential"
        />
      );

      expect(screen.getByTestId('parallel-mode-toggle')).toBeInTheDocument();
    });
  });
});
