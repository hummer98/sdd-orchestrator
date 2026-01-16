/**
 * ReconnectOverlay Component
 *
 * Task 7.2: WebSocket切断時オーバーレイ
 * 接続切断時に表示されるオーバーレイコンポーネント。
 * 自動再接続の進捗を表示し、手動再接続オプションを提供する。
 *
 * Requirements: 9.2
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * ReconnectOverlayのProps
 */
export interface ReconnectOverlayProps {
  /** WebSocket接続状態 */
  isConnected: boolean;
  /** 再接続中フラグ */
  isReconnecting: boolean;
  /** 手動再接続コールバック */
  onManualReconnect: () => void;
  /** 現在の試行回数（オプション） */
  attemptCount?: number;
  /** 最大試行回数（オプション） */
  maxAttempts?: number;
  /** 次の試行までの秒数（オプション） */
  nextAttemptIn?: number;
  /** エラーメッセージ（オプション） */
  errorMessage?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * WebSocket切断時オーバーレイ
 *
 * WebSocket接続が切断された際にUIをブロックし、
 * ユーザーに接続状態を通知する。
 */
export const ReconnectOverlay: React.FC<ReconnectOverlayProps> = ({
  isConnected,
  isReconnecting,
  onManualReconnect,
  attemptCount = 0,
  maxAttempts = 5,
  nextAttemptIn,
  errorMessage,
}) => {
  // 接続中は表示しない
  if (isConnected) {
    return null;
  }

  const isMaxAttemptsReached = attemptCount >= maxAttempts && !isReconnecting;

  return (
    <div
      data-testid="reconnect-overlay remote-reconnect-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-6 text-center shadow-2xl">
        {/* アイコン/スピナー */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          {isReconnecting ? (
            <div
              data-testid="reconnect-spinner"
              className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
            />
          ) : (
            <svg
              className="h-12 w-12 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
        </div>

        {/* タイトル */}
        <h2 className="mb-2 text-xl font-bold text-white">
          {isReconnecting ? '再接続中...' : '接続が切断されました'}
        </h2>

        {/* 説明文 */}
        <p className="mb-4 text-sm text-gray-400">
          {isMaxAttemptsReached
            ? '自動再接続を停止しました。手動で再接続してください。'
            : isReconnecting
              ? 'サーバーへの再接続を試みています...'
              : 'サーバーとの接続が切断されました。'}
        </p>

        {/* 再接続進捗 */}
        {(attemptCount > 0 || nextAttemptIn) && (
          <div className="mb-4 rounded-lg bg-gray-700/50 p-3">
            {attemptCount > 0 && maxAttempts > 0 && (
              <p className="text-sm text-gray-300">
                試行回数: <span className="font-mono text-white">{attemptCount} / {maxAttempts}</span>
              </p>
            )}
            {nextAttemptIn && nextAttemptIn > 0 && isReconnecting && (
              <p className="mt-1 text-sm text-gray-400">
                次の試行まで: <span className="font-mono text-blue-400">{nextAttemptIn}秒後</span>
              </p>
            )}
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMessage && (
          <p className="mb-4 text-sm text-red-400">{errorMessage}</p>
        )}

        {/* 再接続ボタン */}
        <button
          onClick={onManualReconnect}
          disabled={isReconnecting}
          className={`w-full rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
            isReconnecting
              ? 'cursor-not-allowed bg-gray-600 text-gray-400'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isReconnecting ? '再接続中...' : '再接続'}
        </button>
      </div>
    </div>
  );
};

export default ReconnectOverlay;
