/**
 * AuthPage Component
 *
 * Task 7.1: 認証エラー表示コンポーネント
 * トークン無効/期限切れ時のエラー表示と再認証ガイダンス
 *
 * Requirements: 5.3
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * 認証エラータイプ
 */
export type AuthErrorType =
  | 'invalid_token'
  | 'token_expired'
  | 'no_token'
  | 'connection_refused'
  | 'unknown_error';

/**
 * AuthPageのProps
 */
export interface AuthPageProps {
  /** エラータイプ */
  error: AuthErrorType;
  /** カスタムエラーメッセージ（オプション） */
  message?: string;
  /** 再試行コールバック（オプション） */
  onRetry?: () => void;
}

// =============================================================================
// Error Messages
// =============================================================================

const ERROR_MESSAGES: Record<AuthErrorType, { title: string; description: string }> = {
  invalid_token: {
    title: 'トークンが無効です',
    description: '新しいトークンを取得してください',
  },
  token_expired: {
    title: 'トークンの有効期限が切れています',
    description: '新しいトークンを取得してください',
  },
  no_token: {
    title: '認証が必要です',
    description: 'アクセストークンを指定してください',
  },
  connection_refused: {
    title: '接続が拒否されました',
    description: 'サーバーに接続できません。ネットワーク設定を確認してください。',
  },
  unknown_error: {
    title: '認証エラー',
    description: '認証処理中にエラーが発生しました。',
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * 認証エラー表示ページ
 *
 * 認証に失敗した場合にユーザーに表示されるエラーページ。
 * 再認証の手順をガイドする。
 */
export const AuthPage: React.FC<AuthPageProps> = ({ error, message, onRetry }) => {
  const errorInfo = ERROR_MESSAGES[error] || ERROR_MESSAGES.unknown_error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 text-center shadow-xl">
        {/* エラーアイコン */}
        <div
          data-testid="auth-error-icon"
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20"
        >
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* エラータイトル */}
        <h1 className="mb-2 text-2xl font-bold text-white">{errorInfo.title}</h1>

        {/* エラー説明 */}
        <p className="mb-6 text-gray-400">
          {message || errorInfo.description}
        </p>

        {/* 再認証ガイダンス */}
        <div className="mb-6 rounded-lg bg-gray-700/50 p-4 text-left">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">
            トークンを取得する手順:
          </h2>
          <ol className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start">
              <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
                1
              </span>
              <span>SDD Orchestrator デスクトップアプリを開く</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
                2
              </span>
              <span>「Remote Access」パネルからURLをコピー</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
                3
              </span>
              <span>新しいURLでこのページにアクセス</span>
            </li>
          </ol>
        </div>

        {/* 再試行ボタン */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            再試行
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
