/**
 * ReconnectOverlay Tests
 *
 * Task 7.2: WebSocket切断時オーバーレイ
 * Requirements: 9.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReconnectOverlay } from './ReconnectOverlay';

describe('ReconnectOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('レンダリング', () => {
    it('接続中はオーバーレイを表示しない', () => {
      render(
        <ReconnectOverlay
          isConnected={true}
          isReconnecting={false}
          onManualReconnect={() => {}}
        />
      );

      expect(screen.queryByTestId('reconnect-overlay')).not.toBeInTheDocument();
    });

    it('切断時にオーバーレイを表示する', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          onManualReconnect={() => {}}
        />
      );

      expect(screen.getByTestId('reconnect-overlay')).toBeInTheDocument();
      // タイトル（h2）で確認
      expect(screen.getByRole('heading', { name: /接続が切断されました/ })).toBeInTheDocument();
    });

    it('再接続中のメッセージを表示する', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={true}
          onManualReconnect={() => {}}
        />
      );

      // タイトルの「再接続中...」を確認
      expect(screen.getByRole('heading', { name: /再接続中/ })).toBeInTheDocument();
    });
  });

  describe('再接続試行の進捗表示', () => {
    it('現在の試行回数を表示する', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={true}
          attemptCount={3}
          maxAttempts={5}
          onManualReconnect={() => {}}
        />
      );

      expect(screen.getByText(/3 \/ 5/)).toBeInTheDocument();
    });

    it('次の試行までのカウントダウンを表示する', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={true}
          nextAttemptIn={5}
          onManualReconnect={() => {}}
        />
      );

      expect(screen.getByText(/5秒後/)).toBeInTheDocument();
    });

    it('最大試行回数超過時のメッセージを表示する', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          attemptCount={5}
          maxAttempts={5}
          onManualReconnect={() => {}}
        />
      );

      expect(screen.getByText(/自動再接続を停止しました/)).toBeInTheDocument();
    });
  });

  describe('手動再接続ボタン', () => {
    it('再接続中でないときにボタンを表示する', () => {
      const onManualReconnect = vi.fn();
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          onManualReconnect={onManualReconnect}
        />
      );

      const button = screen.getByRole('button', { name: /再接続/ });
      expect(button).toBeInTheDocument();
    });

    it('ボタンクリックでonManualReconnectが呼ばれる', () => {
      const onManualReconnect = vi.fn();
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          onManualReconnect={onManualReconnect}
        />
      );

      const button = screen.getByRole('button', { name: /再接続/ });
      fireEvent.click(button);

      expect(onManualReconnect).toHaveBeenCalledOnce();
    });

    it('再接続中はボタンが無効化される', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={true}
          onManualReconnect={() => {}}
        />
      );

      // ボタンのテキストは「再接続中...」
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('再接続中...');
    });
  });

  describe('スピナー表示', () => {
    it('再接続中にスピナーを表示する', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={true}
          onManualReconnect={() => {}}
        />
      );

      expect(screen.getByTestId('reconnect-spinner')).toBeInTheDocument();
    });

    it('再接続中でないときはスピナーを表示しない', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          onManualReconnect={() => {}}
        />
      );

      expect(screen.queryByTestId('reconnect-spinner')).not.toBeInTheDocument();
    });
  });

  describe('エラーメッセージ', () => {
    it('エラーメッセージを表示する', () => {
      render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          errorMessage="Server is not responding"
          onManualReconnect={() => {}}
        />
      );

      expect(screen.getByText(/Server is not responding/)).toBeInTheDocument();
    });
  });

  describe('オーバーレイスタイル', () => {
    it('オーバーレイに半透明背景が適用される', () => {
      const { container } = render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          onManualReconnect={() => {}}
        />
      );

      const overlay = container.querySelector('[data-testid="reconnect-overlay"]');
      expect(overlay).toHaveClass('bg-black/50');
    });

    it('オーバーレイがfixed positionである', () => {
      const { container } = render(
        <ReconnectOverlay
          isConnected={false}
          isReconnecting={false}
          onManualReconnect={() => {}}
        />
      );

      const overlay = container.querySelector('[data-testid="reconnect-overlay"]');
      expect(overlay).toHaveClass('fixed');
    });
  });
});
