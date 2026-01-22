/**
 * InspectionPanel Component Tests
 *
 * TDD Test: Task 4.6 - DocumentReview・Inspection・Validation関連コンポーネントを共有化する
 * inspection-permission-unification Task 9.2: Updated tests - removed auto execution flag tests
 *
 * このテストはprops-drivenのInspectionPanelコンポーネントをテストします。
 * ストア非依存の設計で、Electron版とRemote UI版で共有可能です。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectionPanel, type InspectionPanelProps } from './InspectionPanel';
import type { InspectionState } from '../../types';
// InspectionAutoExecutionFlag import removed - no longer used

describe('InspectionPanel', () => {
  // inspection-permission-unification: Updated props - removed autoExecutionFlag and onAutoExecutionFlagChange
  const defaultProps: InspectionPanelProps = {
    inspectionState: null,
    isExecuting: false,
    isAutoExecuting: false,
    // autoExecutionFlag: removed
    canExecuteInspection: true,
    onStartInspection: vi.fn(),
    onExecuteFix: vi.fn(),
    // onAutoExecutionFlagChange: removed
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('レンダリング', () => {
    it('パネルが正しくレンダリングされる', () => {
      render(<InspectionPanel {...defaultProps} />);

      expect(screen.getByText('Inspection')).toBeInTheDocument();
    });

    it('ラウンド数を表示する', () => {
      const inspectionState: InspectionState = {
        rounds: [
          { number: 1, result: 'go', inspectedAt: '2026-01-10T10:00:00Z' },
          { number: 2, result: 'nogo', inspectedAt: '2026-01-10T11:00:00Z' },
        ],
      };

      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('GO/NOGOバッジ', () => {
    it('GOの場合GOバッジを表示する', () => {
      const inspectionState: InspectionState = {
        rounds: [{ number: 1, result: 'go', inspectedAt: '2026-01-10T10:00:00Z' }],
      };

      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);

      expect(screen.getByTestId('go-nogo-badge-go')).toBeInTheDocument();
      expect(screen.getByText('GO')).toBeInTheDocument();
    });

    it('NOGOの場合NOGOバッジを表示する', () => {
      const inspectionState: InspectionState = {
        rounds: [{ number: 1, result: 'nogo', inspectedAt: '2026-01-10T10:00:00Z' }],
      };

      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);

      expect(screen.getByTestId('go-nogo-badge-nogo')).toBeInTheDocument();
      expect(screen.getByText('NOGO')).toBeInTheDocument();
    });

    it('ラウンドがない場合バッジを表示しない', () => {
      render(<InspectionPanel {...defaultProps} />);

      expect(screen.queryByTestId('go-nogo-badge-go')).not.toBeInTheDocument();
      expect(screen.queryByTestId('go-nogo-badge-nogo')).not.toBeInTheDocument();
    });
  });

  describe('ボタン表示', () => {
    it('初期状態で「Inspection開始」ボタンを表示する', () => {
      render(<InspectionPanel {...defaultProps} />);

      expect(screen.getByTestId('start-inspection-button')).toBeInTheDocument();
      expect(screen.getByText('Inspection開始')).toBeInTheDocument();
    });

    it('Inspection開始ボタンにAgentIcon（Botアイコン）を表示する', () => {
      render(<InspectionPanel {...defaultProps} />);

      const button = screen.getByTestId('start-inspection-button');
      expect(button.querySelector('[data-testid="start-inspection-agent-icon"]')).toBeInTheDocument();
    });

    it('実行中の場合ボタンが無効化される', () => {
      render(<InspectionPanel {...defaultProps} isExecuting={true} />);

      expect(screen.getByTestId('start-inspection-button')).toBeDisabled();
    });

    it('自動実行中の場合ボタンが無効化される', () => {
      render(<InspectionPanel {...defaultProps} isAutoExecuting={true} />);

      expect(screen.getByTestId('start-inspection-button')).toBeDisabled();
    });

    it('canExecuteInspectionがfalseの場合ボタンが無効化される', () => {
      render(<InspectionPanel {...defaultProps} canExecuteInspection={false} />);

      expect(screen.getByTestId('start-inspection-button')).toBeDisabled();
    });

    it('NOGO未修正の場合「Fix実行」ボタンを表示する', () => {
      const inspectionState: InspectionState = {
        rounds: [{ number: 1, result: 'nogo', inspectedAt: '2026-01-10T10:00:00Z' }],
      };

      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);

      expect(screen.getByTestId('execute-fix-button')).toBeInTheDocument();
      expect(screen.getByText(/Fix実行/)).toBeInTheDocument();
    });

    it('NOGO修正済みの場合「Inspection開始」ボタンを表示する', () => {
      const inspectionState: InspectionState = {
        rounds: [
          {
            number: 1,
            result: 'nogo',
            inspectedAt: '2026-01-10T10:00:00Z',
            fixedAt: '2026-01-10T11:00:00Z',
          },
        ],
      };

      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);

      expect(screen.getByTestId('start-inspection-button')).toBeInTheDocument();
    });
  });

  describe('進捗インジケーター', () => {
    it('初期状態でuncheckedアイコンを表示する', () => {
      render(<InspectionPanel {...defaultProps} />);

      expect(
        screen.getByTestId('inspection-progress-indicator-unchecked')
      ).toBeInTheDocument();
    });

    it('ラウンドがある場合checkedアイコンを表示する', () => {
      const inspectionState: InspectionState = {
        rounds: [{ number: 1, result: 'go', inspectedAt: '2026-01-10T10:00:00Z' }],
      };

      render(<InspectionPanel {...defaultProps} inspectionState={inspectionState} />);

      expect(
        screen.getByTestId('inspection-progress-indicator-checked')
      ).toBeInTheDocument();
    });

    it('実行中の場合executingアイコンを表示する', () => {
      render(<InspectionPanel {...defaultProps} isExecuting={true} />);

      expect(
        screen.getByTestId('inspection-progress-indicator-executing')
      ).toBeInTheDocument();
    });
  });

  // inspection-permission-unification Task 9.2: Auto execution flag control tests REMOVED
  // Auto execution toggle is now handled via permissions.inspection in the phase item checkbox
  describe('inspection-permission-unification: Auto execution flag toggle removed', () => {
    it('should not have auto-execution-flag-control button', () => {
      render(<InspectionPanel {...defaultProps} />);

      expect(screen.queryByTestId('inspection-auto-execution-flag-control')).not.toBeInTheDocument();
    });

    it('should not have auto-flag-run icon', () => {
      render(<InspectionPanel {...defaultProps} />);

      expect(screen.queryByTestId('inspection-auto-flag-run')).not.toBeInTheDocument();
    });

    it('should not have auto-flag-pause icon', () => {
      render(<InspectionPanel {...defaultProps} />);

      expect(screen.queryByTestId('inspection-auto-flag-pause')).not.toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('Inspection開始ボタンでonStartInspectionを呼び出す', () => {
      const onStartInspection = vi.fn();
      render(
        <InspectionPanel {...defaultProps} onStartInspection={onStartInspection} />
      );

      fireEvent.click(screen.getByTestId('start-inspection-button'));

      expect(onStartInspection).toHaveBeenCalled();
    });

    it('Fix実行ボタンでonExecuteFixを呼び出す', () => {
      const onExecuteFix = vi.fn();
      const inspectionState: InspectionState = {
        rounds: [{ number: 1, result: 'nogo', inspectedAt: '2026-01-10T10:00:00Z' }],
      };

      render(
        <InspectionPanel
          {...defaultProps}
          inspectionState={inspectionState}
          onExecuteFix={onExecuteFix}
        />
      );

      fireEvent.click(screen.getByTestId('execute-fix-button'));

      expect(onExecuteFix).toHaveBeenCalledWith(1);
    });
  });
});
