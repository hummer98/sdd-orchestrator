/**
 * AutoExecutionStatusDisplay Component Tests
 *
 * TDD Test: Task 4.7 - AutoExecution関連コンポーネントを共有化する
 *
 * このテストはprops-drivenのAutoExecutionStatusDisplayコンポーネントをテストします。
 * ストア非依存の設計で、Electron版とRemote UI版で共有可能です。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AutoExecutionStatusDisplay,
  type AutoExecutionStatusDisplayProps,
} from './AutoExecutionStatusDisplay';

describe('AutoExecutionStatusDisplay', () => {
  const defaultProps: AutoExecutionStatusDisplayProps = {
    status: 'running',
    currentPhase: 'requirements',
    lastFailedPhase: null,
    retryCount: 0,
    onRetry: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('レンダリング', () => {
    it('idle状態では何も表示しない', () => {
      const { container } = render(
        <AutoExecutionStatusDisplay {...defaultProps} status="idle" />
      );

      expect(container.firstChild).toBeNull();
    });

    it('running状態で自動実行中を表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="running" />);

      expect(screen.getByText('自動実行中')).toBeInTheDocument();
    });

    it('paused状態でAgent待機中を表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="paused" />);

      expect(screen.getByText('Agent待機中')).toBeInTheDocument();
    });

    it('completing状態で完了処理中を表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="completing" />);

      expect(screen.getByText('完了処理中')).toBeInTheDocument();
    });

    it('error状態でエラーを表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="error" />);

      expect(screen.getByText('エラー')).toBeInTheDocument();
    });

    it('completed状態で自動実行完了を表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="completed" />);

      expect(screen.getByText('自動実行完了')).toBeInTheDocument();
    });
  });

  describe('フェーズ表示', () => {
    it('running状態で現在のフェーズを表示する', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="running"
          currentPhase="design"
        />
      );

      expect(screen.getByText('- 設計')).toBeInTheDocument();
    });

    it('paused状態で現在のフェーズを表示する', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="paused"
          currentPhase="impl"
        />
      );

      expect(screen.getByText('- 実装')).toBeInTheDocument();
    });

    it('error状態で失敗したフェーズを表示する', () => {
      render(
        <AutoExecutionStatusDisplay
          {...defaultProps}
          status="error"
          lastFailedPhase="tasks"
        />
      );

      expect(screen.getByText('- タスクで失敗')).toBeInTheDocument();
    });
  });

  describe('リトライ回数', () => {
    it('リトライ回数が0の場合は表示しない', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} retryCount={0} />);

      expect(screen.queryByText(/リトライ/)).not.toBeInTheDocument();
    });

    it('リトライ回数が1以上の場合は表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} retryCount={3} />);

      expect(screen.getByText('(リトライ 3回)')).toBeInTheDocument();
    });
  });

  describe('ボタン表示', () => {
    it('running状態で停止ボタンを表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="running" />);

      expect(screen.getByText('停止')).toBeInTheDocument();
    });

    it('paused状態で停止ボタンを表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="paused" />);

      expect(screen.getByText('停止')).toBeInTheDocument();
    });

    it('error状態で再実行ボタンを表示する', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="error" />);

      expect(screen.getByText('再実行')).toBeInTheDocument();
    });

    it('completed状態ではボタンを表示しない', () => {
      render(<AutoExecutionStatusDisplay {...defaultProps} status="completed" />);

      expect(screen.queryByText('停止')).not.toBeInTheDocument();
      expect(screen.queryByText('再実行')).not.toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('停止ボタンクリックでonStopを呼び出す', () => {
      const onStop = vi.fn();
      render(
        <AutoExecutionStatusDisplay {...defaultProps} status="running" onStop={onStop} />
      );

      fireEvent.click(screen.getByText('停止'));

      expect(onStop).toHaveBeenCalled();
    });

    it('再実行ボタンクリックでonRetryを呼び出す', () => {
      const onRetry = vi.fn();
      render(
        <AutoExecutionStatusDisplay {...defaultProps} status="error" onRetry={onRetry} />
      );

      fireEvent.click(screen.getByText('再実行'));

      expect(onRetry).toHaveBeenCalled();
    });
  });
});
