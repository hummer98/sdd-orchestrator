/**
 * InspectionPanel Component Tests
 * TDD: Testing inspection workflow panel UI component
 * Feature: inspection-workflow-ui Task 2, 2.1, 2.2, 2.3, 2.4
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 7.1, 7.2, 7.3, 7.4
 * Bug fix: inspection-state-data-model - Updated to use new InspectionState structure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectionPanel, type InspectionPanelProps } from '@shared/components/review';
import type { InspectionState } from '@shared/types';

describe('InspectionPanel', () => {
  // inspection-permission-unification: autoExecutionFlag and onAutoExecutionFlagChange props removed
  const defaultProps: InspectionPanelProps = {
    inspectionState: null,
    isExecuting: false,
    isAutoExecuting: false,
    onStartInspection: vi.fn(),
    onExecuteFix: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 2.1: Basic rendering (Panel structure)
  // Requirements: 1.1, 1.2, 1.3
  // Bug fix: inspection-state-data-model - Updated to use new InspectionState
  // ============================================================
  describe('Task 2.1: Basic rendering', () => {
    it('should render panel title "Inspection"', () => {
      render(<InspectionPanel {...defaultProps} />);
      // Use heading role to target specifically the title
      expect(screen.getByRole('heading', { name: 'Inspection' })).toBeInTheDocument();
    });

    it('should show round count of 0 when inspection state is null', () => {
      render(<InspectionPanel {...defaultProps} inspectionState={null} />);
      expect(screen.getByText(/ラウンド:/)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show round count when inspection state exists', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'nogo', inspectedAt: '2025-01-01T00:00:00Z', fixedAt: '2025-01-01T01:00:00Z' },
          { number: 2, result: 'go', inspectedAt: '2025-01-01T02:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 2.2: Progress indicator (title left side)
  // Requirements: 7.1, 7.2, 7.3, 7.4
  // Bug fix: inspection-state-data-model - Updated to use new InspectionState
  // ============================================================
  describe('Task 2.2: Progress indicator', () => {
    it('should show unchecked state when no rounds completed', () => {
      render(<InspectionPanel {...defaultProps} inspectionState={null} />);
      expect(screen.getByTestId('inspection-progress-indicator-unchecked')).toBeInTheDocument();
    });

    it('should show checked state when rounds >= 1', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'go', inspectedAt: '2025-01-01T00:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);
      expect(screen.getByTestId('inspection-progress-indicator-checked')).toBeInTheDocument();
    });

    it('should show executing state when isExecuting is true', () => {
      render(<InspectionPanel {...defaultProps} isExecuting={true} />);
      expect(screen.getByTestId('inspection-progress-indicator-executing')).toBeInTheDocument();
    });

    // NOTE: skip-scheduled tests removed - skip option is no longer available

    it('should prioritize executing over checked', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'nogo', inspectedAt: '2025-01-01T00:00:00Z' },
          { number: 2, result: 'nogo', inspectedAt: '2025-01-01T01:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} isExecuting={true} />);
      expect(screen.getByTestId('inspection-progress-indicator-executing')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 2.3: GO/NOGO status display and action buttons
  // Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
  // Bug fix: inspection-state-data-model - Updated to use 'go'/'nogo' result
  // ============================================================
  describe('Task 2.3: GO/NOGO status and action buttons', () => {
    it('should show GO badge when latest round result is go', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'go', inspectedAt: '2025-01-01T00:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);
      expect(screen.getByTestId('go-nogo-badge-go')).toBeInTheDocument();
    });

    it('should show NOGO badge when latest round result is nogo', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'nogo', inspectedAt: '2025-01-01T00:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);
      expect(screen.getByTestId('go-nogo-badge-nogo')).toBeInTheDocument();
    });

    it('should not show GO/NOGO badge when no rounds exist', () => {
      render(<InspectionPanel {...defaultProps} inspectionState={null} />);
      expect(screen.queryByTestId('go-nogo-badge-go')).not.toBeInTheDocument();
      expect(screen.queryByTestId('go-nogo-badge-nogo')).not.toBeInTheDocument();
    });

    it('should show "Inspection開始" button when GO (result: go)', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'go', inspectedAt: '2025-01-01T00:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);
      expect(screen.getByRole('button', { name: /Inspection開始/ })).toBeInTheDocument();
    });

    it('should show "Fix実行" button when NOGO and fixedAt is not set', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'nogo', inspectedAt: '2025-01-01T00:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);
      expect(screen.getByRole('button', { name: /Fix実行/ })).toBeInTheDocument();
    });

    it('should show "Inspection開始" button when NOGO and fixedAt is set (re-inspection)', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'nogo', inspectedAt: '2025-01-01T00:00:00Z', fixedAt: '2025-01-01T01:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);
      expect(screen.getByRole('button', { name: /Inspection開始/ })).toBeInTheDocument();
    });

    it('should show "Inspection開始" button when no inspection state exists', () => {
      render(<InspectionPanel {...defaultProps} inspectionState={null} />);
      expect(screen.getByRole('button', { name: /Inspection開始/ })).toBeInTheDocument();
    });

    it('should disable all action buttons when isExecuting is true', () => {
      const inspectionState: InspectionState = {
        rounds: [],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} isExecuting={true} />);
      const startButton = screen.getByRole('button', { name: /Inspection開始/ });
      expect(startButton).toBeDisabled();
    });

    it('should disable all action buttons when isAutoExecuting is true', () => {
      render(<InspectionPanel {...defaultProps} isAutoExecuting={true} />);
      const startButton = screen.getByRole('button', { name: /Inspection開始/ });
      expect(startButton).toBeDisabled();
    });

    it('should enable action buttons when not executing', () => {
      render(<InspectionPanel {...defaultProps} isExecuting={false} isAutoExecuting={false} />);
      const startButton = screen.getByRole('button', { name: /Inspection開始/ });
      expect(startButton).not.toBeDisabled();
    });
  });

  // ============================================================
  // Task 2.3: User interactions
  // Requirements: 1.4, 1.5, 1.6, 1.7
  // Bug fix: inspection-state-data-model - Updated to use new InspectionState
  // ============================================================
  describe('Task 2.3: User interactions', () => {
    it('should call onStartInspection when start button is clicked', () => {
      const onStartInspection = vi.fn();
      render(<InspectionPanel {...defaultProps} onStartInspection={onStartInspection} />);
      fireEvent.click(screen.getByRole('button', { name: /Inspection開始/ }));
      expect(onStartInspection).toHaveBeenCalledTimes(1);
    });

    it('should call onExecuteFix with roundNumber when fix button is clicked', () => {
      const onExecuteFix = vi.fn();
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'nogo', inspectedAt: '2025-01-01T00:00:00Z' },
        ],
      };
      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} onExecuteFix={onExecuteFix} />);
      fireEvent.click(screen.getByRole('button', { name: /Fix実行/ }));
      expect(onExecuteFix).toHaveBeenCalledWith(1);
    });
  });

  // ============================================================
  // Task 2.4: Auto execution flag control (title right side)
  // Requirements: 1.10, 5.1
  // inspection-permission-unification: Tests removed - autoExecutionFlag props removed from component
  // Auto execution permission is now controlled via impl phase checkbox
  // ============================================================
  describe('Task 2.4: Auto execution flag control', () => {
    // NOTE: All auto execution flag tests removed
    // inspection-permission-unification: autoExecutionFlag and onAutoExecutionFlagChange props
    // were removed from InspectionPanel. Auto execution permission is now controlled via
    // permissions.inspection in PhaseItem checkbox.

    it.skip('should render auto execution flag control button (removed in inspection-permission-unification)', () => {
      // This functionality has been moved to PhaseItem checkbox
    });

    it.skip('should show run icon when autoExecutionFlag is run (removed in inspection-permission-unification)', () => {
      // This functionality has been moved to PhaseItem checkbox
    });

    it.skip('should show pause icon when autoExecutionFlag is pause (removed in inspection-permission-unification)', () => {
      // This functionality has been moved to PhaseItem checkbox
    });

    it.skip('should call onAutoExecutionFlagChange with "pause" when clicked from "run" (removed in inspection-permission-unification)', () => {
      // This functionality has been moved to PhaseItem checkbox
    });

    it.skip('should call onAutoExecutionFlagChange with "run" when clicked from "pause" (removed in inspection-permission-unification)', () => {
      // This functionality has been moved to PhaseItem checkbox
    });
  });
});
