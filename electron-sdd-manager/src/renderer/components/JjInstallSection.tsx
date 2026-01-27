/**
 * JjInstallSection Component
 * Displays jj installation warning and provides install/ignore actions
 * jj-merge-support feature: Task 12.6
 * Requirements: 3.2, 3.3, 4.2, 4.4, 10.2, 10.3
 */

import type { ReactElement } from 'react';
import { AlertCircle, Download, Loader2, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ToolCheck } from '@shared/types';

export interface JjInstallSectionProps {
  jjCheck: ToolCheck;
  jjInstallLoading: boolean;
  jjInstallError: string | null;
  onInstall: () => void;
  onIgnore: () => void;
}

export function JjInstallSection({
  jjCheck,
  jjInstallLoading,
  jjInstallError,
  onInstall,
  onIgnore,
}: JjInstallSectionProps): ReactElement | null {
  // Don't render if jj is available
  if (jjCheck.available) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
        jj (Jujutsu VCS)
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4" />
          <span>jjがインストールされていません</span>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 pl-6">
          <p className="mb-2">
            jjはGit互換のバージョン管理システムで、コンフリクトをより安定的に処理できます。
          </p>
          <p className="text-xs text-gray-400">
            インストール推奨: {jjCheck.installGuidance || 'brew install jj'}
          </p>
        </div>

        {/* Install and Ignore Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onInstall}
            disabled={jjInstallLoading}
            className={clsx(
              'flex-1 px-3 py-2 rounded-md text-xs',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'flex items-center justify-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="jjをインストール"
          >
            {jjInstallLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                インストール中...
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                インストール (brew)
              </>
            )}
          </button>

          <button
            onClick={onIgnore}
            disabled={jjInstallLoading}
            className={clsx(
              'px-3 py-2 rounded-md text-xs',
              'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
              'text-gray-700 dark:text-gray-300',
              'flex items-center justify-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="jj警告を無視"
          >
            <X className="w-3 h-3" />
            無視
          </button>
        </div>

        {/* Installation Error */}
        {jjInstallError && (
          <div className="space-y-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>インストール失敗</span>
            </div>
            <div className="text-xs text-red-500 dark:text-red-400">
              {jjInstallError}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              手動でインストール: <code>brew install jj</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
