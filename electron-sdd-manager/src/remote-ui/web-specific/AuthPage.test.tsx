/**
 * AuthPage Tests
 *
 * Task 7.1: 認証エラー表示コンポーネント
 * Requirements: 5.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from './AuthPage';

describe('AuthPage', () => {
  describe('レンダリング', () => {
    it('トークン無効エラーを表示する', () => {
      render(<AuthPage error="invalid_token" />);

      expect(screen.getByText(/トークンが無効です/)).toBeInTheDocument();
      expect(screen.getByText(/新しいトークンを取得してください/)).toBeInTheDocument();
    });

    it('トークン期限切れエラーを表示する', () => {
      render(<AuthPage error="token_expired" />);

      expect(screen.getByText(/トークンの有効期限が切れています/)).toBeInTheDocument();
      expect(screen.getByText(/新しいトークンを取得してください/)).toBeInTheDocument();
    });

    it('トークン未指定エラーを表示する', () => {
      render(<AuthPage error="no_token" />);

      expect(screen.getByText(/認証が必要です/)).toBeInTheDocument();
      expect(screen.getByText(/アクセストークンを指定してください/)).toBeInTheDocument();
    });

    it('接続拒否エラーを表示する', () => {
      render(<AuthPage error="connection_refused" />);

      expect(screen.getByText(/接続が拒否されました/)).toBeInTheDocument();
    });

    it('汎用エラーを表示する', () => {
      render(<AuthPage error="unknown_error" />);

      expect(screen.getByText(/認証エラー/)).toBeInTheDocument();
    });

    it('カスタムエラーメッセージを表示する', () => {
      render(<AuthPage error="invalid_token" message="Custom error message" />);

      expect(screen.getByText(/Custom error message/)).toBeInTheDocument();
    });
  });

  describe('再認証ガイダンス', () => {
    it('再認証手順を表示する', () => {
      render(<AuthPage error="token_expired" />);

      // ガイダンスが表示されることを確認
      expect(screen.getByText(/トークンを取得する/)).toBeInTheDocument();
    });

    it('SDD Orchestratorへの誘導を表示する', () => {
      render(<AuthPage error="invalid_token" />);

      expect(screen.getByText(/SDD Orchestrator/)).toBeInTheDocument();
    });
  });

  describe('アクション', () => {
    it('再試行ボタンをクリックするとonRetryが呼ばれる', () => {
      const onRetry = vi.fn();
      render(<AuthPage error="invalid_token" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /再試行/ });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('onRetryが指定されていない場合は再試行ボタンが表示されない', () => {
      render(<AuthPage error="invalid_token" />);

      expect(screen.queryByRole('button', { name: /再試行/ })).not.toBeInTheDocument();
    });
  });

  describe('アイコン表示', () => {
    it('エラーアイコンが表示される', () => {
      render(<AuthPage error="invalid_token" />);

      // Lock or error icon should be present
      expect(screen.getByTestId('auth-error-icon')).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    it('コンテナにレスポンシブクラスが適用されている', () => {
      const { container } = render(<AuthPage error="invalid_token" />);

      // flexとcenterクラスが適用されていることを確認
      expect(container.querySelector('.flex')).toBeInTheDocument();
    });
  });
});
