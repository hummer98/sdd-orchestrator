/**
 * InspectionPanel Component Tests
 * TDD: Testing inspection workflow panel UI component
 * Feature: inspection-workflow-ui Task 2, 2.1, 2.2, 2.3, 2.4
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 7.1, 7.2, 7.3, 7.4
 * Bug fix: inspection-state-data-model - Updated to use new InspectionState structure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectionPanel, type InspectionPanelProps } from './InspectionPanel';
import type { InspectionState } from '../types/inspection';

describe('InspectionPanel', () => {
  const defaultProps: InspectionPanelProps = {
    inspectionState: null,
    isExecuting: false,
    isAutoExecuting: false,
    autoExecutionFlag: 'run',
    onStartInspection: vi.fn(),
    onExecuteFix: vi.fn(),
    onAutoExecutionFlagChange: vi.fn(),
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

    it('should show skip-scheduled state when autoExecutionFlag is skip', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="skip" />);
      expect(screen.getByTestId('inspection-progress-indicator-skip-scheduled')).toBeInTheDocument();
    });

    it('should prioritize skip-scheduled over executing', () => {
      // When autoExecutionFlag is 'skip', it should show skip-scheduled even if executing
      render(<InspectionPanel {...defaultProps} isExecuting={true} autoExecutionFlag="skip" />);
      expect(screen.getByTestId('inspection-progress-indicator-skip-scheduled')).toBeInTheDocument();
    });

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
  // ============================================================
  describe('Task 2.4: Auto execution flag control', () => {
    it('should render auto execution flag control button', () => {
      render(<InspectionPanel {...defaultProps} />);
      expect(screen.getByTestId('inspection-auto-execution-flag-control')).toBeInTheDocument();
    });

    it('should show run icon when autoExecutionFlag is run', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="run" />);
      expect(screen.getByTestId('inspection-auto-flag-run')).toBeInTheDocument();
    });

    it('should show pause icon when autoExecutionFlag is pause', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="pause" />);
      expect(screen.getByTestId('inspection-auto-flag-pause')).toBeInTheDocument();
    });

    it('should show skip icon when autoExecutionFlag is skip', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="skip" />);
      expect(screen.getByTestId('inspection-auto-flag-skip')).toBeInTheDocument();
    });

    it('should call onAutoExecutionFlagChange with "pause" when clicked from "run"', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <InspectionPanel
          {...defaultProps}
          autoExecutionFlag="run"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );
      fireEvent.click(screen.getByTestId('inspection-auto-execution-flag-control'));
      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('pause');
    });

    it('should call onAutoExecutionFlagChange with "skip" when clicked from "pause"', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <InspectionPanel
          {...defaultProps}
          autoExecutionFlag="pause"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );
      fireEvent.click(screen.getByTestId('inspection-auto-execution-flag-control'));
      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('skip');
    });

    it('should call onAutoExecutionFlagChange with "run" when clicked from "skip"', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <InspectionPanel
          {...defaultProps}
          autoExecutionFlag="skip"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );
      fireEvent.click(screen.getByTestId('inspection-auto-execution-flag-control'));
      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('run');
    });
  });
});
