/**
 * InspectionPanel Component Tests
 *
 * TDD Test: Task 4.6 - DocumentReview・Inspection・Validation関連コンポーネントを共有化する
 *
 * このテストはprops-drivenのInspectionPanelコンポーネントをテストします。
 * ストア非依存の設計で、Electron版とRemote UI版で共有可能です。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectionPanel, type InspectionPanelProps } from './InspectionPanel';
import type { InspectionState, InspectionAutoExecutionFlag } from '../../types';

describe('InspectionPanel', () => {
  const defaultProps: InspectionPanelProps = {
    inspectionState: null,
    isExecuting: false,
    isAutoExecuting: false,
    autoExecutionFlag: 'run',
    canExecuteInspection: true,
    onStartInspection: vi.fn(),
    onExecuteFix: vi.fn(),
    onAutoExecutionFlagChange: vi.fn(),
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

    it('skipフラグの場合skip-scheduledアイコンを表示する', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="skip" />);

      expect(
        screen.getByTestId('inspection-progress-indicator-skip-scheduled')
      ).toBeInTheDocument();
    });
  });

  describe('自動実行フラグ制御', () => {
    it('runフラグでPlayCircleアイコンを表示する', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="run" />);

      expect(screen.getByTestId('inspection-auto-flag-run')).toBeInTheDocument();
    });

    it('pauseフラグでBanアイコンを表示する', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="pause" />);

      expect(screen.getByTestId('inspection-auto-flag-pause')).toBeInTheDocument();
    });

    it('skipフラグでArrowRightアイコンを表示する', () => {
      render(<InspectionPanel {...defaultProps} autoExecutionFlag="skip" />);

      expect(screen.getByTestId('inspection-auto-flag-skip')).toBeInTheDocument();
    });

    it.each<[InspectionAutoExecutionFlag, InspectionAutoExecutionFlag]>([
      ['run', 'pause'],
      ['pause', 'skip'],
      ['skip', 'run'],
    ])('フラグ %s から %s に変更する', (current, expected) => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <InspectionPanel
          {...defaultProps}
          autoExecutionFlag={current}
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );

      fireEvent.click(screen.getByTestId('inspection-auto-execution-flag-control'));

      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith(expected);
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
