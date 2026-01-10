/**
 * AskAgentDialog Component Tests
 *
 * TDD Test: Task 4.8 - ProjectAgent関連コンポーネントを共有化する
 *
 * このテストはprops-drivenのAskAgentDialogコンポーネントをテストします。
 * ストア非依存の設計で、Electron版とRemote UI版で共有可能です。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AskAgentDialog, type AskAgentDialogProps } from './AskAgentDialog';

describe('AskAgentDialog', () => {
  const defaultProps: AskAgentDialogProps = {
    isOpen: true,
    agentType: 'project',
    onExecute: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('レンダリング', () => {
    it('isOpen=falseの場合は何も表示しない', () => {
      render(<AskAgentDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('ask-agent-dialog')).not.toBeInTheDocument();
    });

    it('isOpen=trueの場合はダイアログを表示する', () => {
      render(<AskAgentDialog {...defaultProps} isOpen={true} />);

      expect(screen.getByTestId('ask-agent-dialog')).toBeInTheDocument();
    });

    it('Project Agentモードで正しいタイトルを表示する', () => {
      render(<AskAgentDialog {...defaultProps} agentType="project" />);

      expect(screen.getByText('Project Agent - Ask')).toBeInTheDocument();
    });

    it('Spec Agentモードで正しいタイトルを表示する', () => {
      render(<AskAgentDialog {...defaultProps} agentType="spec" specName="feature-x" />);

      expect(screen.getByText('Spec Agent - Ask')).toBeInTheDocument();
      expect(screen.getByText('(feature-x)')).toBeInTheDocument();
    });

    it('プロンプト入力欄を表示する', () => {
      render(<AskAgentDialog {...defaultProps} />);

      expect(screen.getByTestId('ask-prompt-input')).toBeInTheDocument();
      expect(screen.getByLabelText('プロンプト')).toBeInTheDocument();
    });
  });

  describe('コンテキスト情報', () => {
    it('Project Agentモードで適切なコンテキスト情報を表示する', () => {
      render(<AskAgentDialog {...defaultProps} agentType="project" />);

      expect(
        screen.getByText(/Steering files.*をコンテキストとして使用します/)
      ).toBeInTheDocument();
    });

    it('Spec Agentモードで適切なコンテキスト情報を表示する', () => {
      render(<AskAgentDialog {...defaultProps} agentType="spec" specName="feature-x" />);

      expect(
        screen.getByText(/Steering files と Spec files.*をコンテキストとして使用します/)
      ).toBeInTheDocument();
    });
  });

  describe('ボタン', () => {
    it('プロンプトが空の場合、実行ボタンが無効化される', () => {
      render(<AskAgentDialog {...defaultProps} />);

      const executeButton = screen.getByRole('button', { name: '実行' });
      expect(executeButton).toBeDisabled();
    });

    it('プロンプトが入力されている場合、実行ボタンが有効化される', () => {
      render(<AskAgentDialog {...defaultProps} />);

      const input = screen.getByTestId('ask-prompt-input');
      fireEvent.change(input, { target: { value: 'テストプロンプト' } });

      const executeButton = screen.getByRole('button', { name: '実行' });
      expect(executeButton).not.toBeDisabled();
    });

    it('キャンセルボタンを表示する', () => {
      render(<AskAgentDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('実行ボタンクリックでonExecuteを呼び出す', () => {
      const onExecute = vi.fn();
      render(<AskAgentDialog {...defaultProps} onExecute={onExecute} />);

      const input = screen.getByTestId('ask-prompt-input');
      fireEvent.change(input, { target: { value: 'テストプロンプト' } });

      fireEvent.click(screen.getByRole('button', { name: '実行' }));

      expect(onExecute).toHaveBeenCalledWith('テストプロンプト');
    });

    it('プロンプトの前後空白を除去して送信する', () => {
      const onExecute = vi.fn();
      render(<AskAgentDialog {...defaultProps} onExecute={onExecute} />);

      const input = screen.getByTestId('ask-prompt-input');
      fireEvent.change(input, { target: { value: '  テストプロンプト  ' } });

      fireEvent.click(screen.getByRole('button', { name: '実行' }));

      expect(onExecute).toHaveBeenCalledWith('テストプロンプト');
    });

    it('キャンセルボタンクリックでonCancelを呼び出す', () => {
      const onCancel = vi.fn();
      render(<AskAgentDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(onCancel).toHaveBeenCalled();
    });

    it('閉じるボタンクリックでonCancelを呼び出す', () => {
      const onCancel = vi.fn();
      render(<AskAgentDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('close-button'));

      expect(onCancel).toHaveBeenCalled();
    });

    it('バックドロップクリックでonCancelを呼び出す', () => {
      const onCancel = vi.fn();
      render(<AskAgentDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('dialog-backdrop'));

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
