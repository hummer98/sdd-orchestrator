/**
 * DocumentReviewPanel Component Tests
 *
 * TDD Test: Task 4.6 - DocumentReview・Inspection・Validation関連コンポーネントを共有化する
 *
 * このテストはprops-drivenのDocumentReviewPanelコンポーネントをテストします。
 * ストア非依存の設計で、Electron版とRemote UI版で共有可能です。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DocumentReviewPanel,
  type DocumentReviewPanelProps,
} from './DocumentReviewPanel';
import type { DocumentReviewState, DocumentReviewAutoExecutionFlag } from '../../types';

describe('DocumentReviewPanel', () => {
  const defaultProps: DocumentReviewPanelProps = {
    reviewState: null,
    isExecuting: false,
    isAutoExecuting: false,
    hasTasks: true,
    autoExecutionFlag: 'run',
    onStartReview: vi.fn(),
    onExecuteReply: vi.fn(),
    onApplyFix: vi.fn(),
    onAutoExecutionFlagChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('レンダリング', () => {
    it('パネルが正しくレンダリングされる', () => {
      render(<DocumentReviewPanel {...defaultProps} />);

      expect(screen.getByTestId('document-review-panel')).toBeInTheDocument();
      expect(screen.getByText('ドキュメントレビュー')).toBeInTheDocument();
    });

    it('ラウンド数を表示する', () => {
      const reviewState: DocumentReviewState = {
        status: 'approved',
        roundDetails: [
          { roundNumber: 1, status: 'reply_complete' },
          { roundNumber: 2, status: 'reply_complete' },
        ],
      };

      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('ボタン表示', () => {
    it('初期状態で「レビュー開始」ボタンを表示する', () => {
      render(<DocumentReviewPanel {...defaultProps} />);

      expect(screen.getByTestId('start-review-button')).toBeInTheDocument();
      expect(screen.getByText('レビュー開始')).toBeInTheDocument();
    });

    it('レビュー開始ボタンにAgentIcon（Botアイコン）を表示する', () => {
      render(<DocumentReviewPanel {...defaultProps} />);

      const button = screen.getByTestId('start-review-button');
      expect(button.querySelector('[data-testid="start-review-agent-icon"]')).toBeInTheDocument();
    });

    it('実行中の場合ボタンが無効化される', () => {
      render(<DocumentReviewPanel {...defaultProps} isExecuting={true} />);

      expect(screen.getByTestId('start-review-button')).toBeDisabled();
    });

    it('自動実行中の場合ボタンが無効化される', () => {
      render(<DocumentReviewPanel {...defaultProps} isAutoExecuting={true} />);

      expect(screen.getByTestId('start-review-button')).toBeDisabled();
    });

    it('tasksがない場合ボタンが無効化される', () => {
      render(<DocumentReviewPanel {...defaultProps} hasTasks={false} />);

      expect(screen.getByTestId('start-review-button')).toBeDisabled();
    });

    it('review_complete状態で「レビュー内容判定」ボタンを表示する', () => {
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
        currentRound: 1,
        roundDetails: [{ roundNumber: 1, status: 'review_complete' }],
      };

      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);

      expect(screen.getByTestId('execute-reply-button')).toBeInTheDocument();
      expect(screen.getByText(/レビュー内容判定/)).toBeInTheDocument();
    });

    it('reply_complete状態でfixStatus: pendingの時「replyを適用」ボタンを表示する', () => {
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
        currentRound: 1,
        roundDetails: [{ roundNumber: 1, status: 'reply_complete', fixStatus: 'pending' }],
      };

      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);

      expect(screen.getByTestId('apply-fix-button')).toBeInTheDocument();
      expect(screen.getByText(/replyを適用/)).toBeInTheDocument();
    });

    it('最新ラウンドがnot_requiredの場合、過去ラウンドがappliedでも「レビュー開始」ボタンを表示する', () => {
      // gemini-document-reviewのspec.jsonと同じ状態:
      // Round 1: applied (修正適用済み)
      // Round 2: not_required (修正不要)
      // → 最新のRound 2がnot_requiredなので、次のレビューラウンドに進めるべき
      const reviewState: DocumentReviewState = {
        status: 'approved',
        roundDetails: [
          { roundNumber: 1, status: 'reply_complete', fixRequired: 1, needsDiscussion: 0, fixStatus: 'applied' },
          { roundNumber: 2, status: 'reply_complete', fixRequired: 0, needsDiscussion: 0, fixStatus: 'not_required' },
        ],
      };

      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);

      // 「replyを適用」ボタンではなく「レビュー開始」ボタンが表示されるべき
      expect(screen.queryByTestId('apply-fix-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('start-review-button')).toBeInTheDocument();
      expect(screen.getByText('レビュー開始')).toBeInTheDocument();
    });

    it('最新ラウンドがpendingの場合「replyを適用」ボタンを表示する', () => {
      // 複数ラウンドがあり、最新ラウンドがpending
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
        roundDetails: [
          { roundNumber: 1, status: 'reply_complete', fixStatus: 'not_required' },
          { roundNumber: 2, status: 'reply_complete', fixStatus: 'pending' },
        ],
      };

      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);

      expect(screen.getByTestId('apply-fix-button')).toBeInTheDocument();
      expect(screen.getByText(/replyを適用.*Round 2/)).toBeInTheDocument();
    });

    it('最新ラウンドがappliedの場合「replyを適用」ボタンを表示する（再レビュー待ち）', () => {
      // 修正が適用され、再レビューが必要な状態
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
        roundDetails: [
          { roundNumber: 1, status: 'reply_complete', fixStatus: 'applied' },
        ],
      };

      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);

      expect(screen.getByTestId('apply-fix-button')).toBeInTheDocument();
      expect(screen.getByText(/replyを適用.*Round 1/)).toBeInTheDocument();
    });
  });

  describe('進捗インジケーター', () => {
    it('初期状態でuncheckedアイコンを表示する', () => {
      render(<DocumentReviewPanel {...defaultProps} />);

      expect(screen.getByTestId('progress-indicator-unchecked')).toBeInTheDocument();
    });

    it('ラウンドがある場合checkedアイコンを表示する', () => {
      const reviewState: DocumentReviewState = {
        status: 'approved',
        roundDetails: [{ roundNumber: 1, status: 'reply_complete' }],
      };

      render(<DocumentReviewPanel {...defaultProps} reviewState={reviewState} />);

      expect(screen.getByTestId('progress-indicator-checked')).toBeInTheDocument();
    });

    it('実行中の場合executingアイコンを表示する', () => {
      render(<DocumentReviewPanel {...defaultProps} isExecuting={true} />);

      expect(screen.getByTestId('progress-indicator-executing')).toBeInTheDocument();
    });

    // NOTE: skip-scheduled test removed - skip option is no longer available
  });

  describe('自動実行フラグ制御', () => {
    it('runフラグでPlayCircleアイコンを表示する', () => {
      render(<DocumentReviewPanel {...defaultProps} autoExecutionFlag="run" />);

      expect(screen.getByTestId('auto-flag-run')).toBeInTheDocument();
    });

    it('pauseフラグでBanアイコンを表示する', () => {
      render(<DocumentReviewPanel {...defaultProps} autoExecutionFlag="pause" />);

      expect(screen.getByTestId('auto-flag-pause')).toBeInTheDocument();
    });

    // NOTE: skip flag test removed - skip option is no longer available

    it('フラグボタンクリックでonAutoExecutionFlagChangeを呼び出す', () => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <DocumentReviewPanel
          {...defaultProps}
          autoExecutionFlag="run"
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );

      fireEvent.click(screen.getByTestId('auto-execution-flag-control'));

      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith('pause');
    });

    it.each<[DocumentReviewAutoExecutionFlag, DocumentReviewAutoExecutionFlag]>([
      ['run', 'pause'],
      ['pause', 'run'],
    ])('フラグ %s から %s に変更する', (current, expected) => {
      const onAutoExecutionFlagChange = vi.fn();
      render(
        <DocumentReviewPanel
          {...defaultProps}
          autoExecutionFlag={current}
          onAutoExecutionFlagChange={onAutoExecutionFlagChange}
        />
      );

      fireEvent.click(screen.getByTestId('auto-execution-flag-control'));

      expect(onAutoExecutionFlagChange).toHaveBeenCalledWith(expected);
    });
  });

  describe('インタラクション', () => {
    it('レビュー開始ボタンでonStartReviewを呼び出す', () => {
      const onStartReview = vi.fn();
      render(<DocumentReviewPanel {...defaultProps} onStartReview={onStartReview} />);

      fireEvent.click(screen.getByTestId('start-review-button'));

      expect(onStartReview).toHaveBeenCalled();
    });

    it('レビュー内容判定ボタンでonExecuteReplyを呼び出す', () => {
      const onExecuteReply = vi.fn();
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
        currentRound: 1,
        roundDetails: [{ roundNumber: 1, status: 'review_complete' }],
      };

      render(
        <DocumentReviewPanel
          {...defaultProps}
          reviewState={reviewState}
          onExecuteReply={onExecuteReply}
        />
      );

      fireEvent.click(screen.getByTestId('execute-reply-button'));

      expect(onExecuteReply).toHaveBeenCalledWith(1);
    });

    it('replyを適用ボタンでonApplyFixを呼び出す', () => {
      const onApplyFix = vi.fn();
      const reviewState: DocumentReviewState = {
        status: 'in_progress',
        currentRound: 1,
        roundDetails: [{ roundNumber: 1, status: 'reply_complete', fixStatus: 'pending' }],
      };

      render(
        <DocumentReviewPanel
          {...defaultProps}
          reviewState={reviewState}
          onApplyFix={onApplyFix}
        />
      );

      fireEvent.click(screen.getByTestId('apply-fix-button'));

      expect(onApplyFix).toHaveBeenCalledWith(1);
    });
  });
});
