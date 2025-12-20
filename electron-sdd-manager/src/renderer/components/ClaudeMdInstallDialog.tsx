/**
 * CLAUDE.md Install Dialog
 * Shows options for installing CLAUDE.md: Overwrite, Semantic Merge, or Cancel
 */

import { useState } from 'react';
import { X, AlertCircle, Loader2, FileText, Merge, Ban } from 'lucide-react';
import { clsx } from 'clsx';
import type { ClaudeMdInstallMode, InstallError } from '../types/electron';

interface ClaudeMdInstallDialogProps {
  isOpen: boolean;
  claudeMdExists: boolean;
  projectPath: string;
  onClose: () => void;
  onInstall: (mode: ClaudeMdInstallMode) => Promise<void>;
}

export function ClaudeMdInstallDialog({
  isOpen,
  claudeMdExists,
  projectPath,
  onClose,
  onInstall,
}: ClaudeMdInstallDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<InstallError | null>(null);
  const [loadingMode, setLoadingMode] = useState<ClaudeMdInstallMode | null>(null);

  if (!isOpen) return null;

  const handleInstall = async (mode: ClaudeMdInstallMode) => {
    setIsLoading(true);
    setLoadingMode(mode);
    setError(null);
    try {
      await onInstall(mode);
      onClose();
    } catch (err) {
      setError(err as InstallError);
    } finally {
      setIsLoading(false);
      setLoadingMode(null);
    }
  };

  const projectName = projectPath.split('/').pop() || projectPath;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="claudemd-install-dialog-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4" data-testid="claudemd-install-dialog">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            CLAUDE.mdをインストール
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            data-testid="claudemd-install-close-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            プロジェクト: <strong>{projectName}</strong>
          </p>

          {claudeMdExists ? (
            <>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  CLAUDE.mdは既に存在します。どのように処理しますか？
                </p>
              </div>

              <div className="space-y-2">
                {/* Overwrite option */}
                <button
                  onClick={() => handleInstall('overwrite')}
                  disabled={isLoading}
                  className={clsx(
                    'w-full p-3 rounded-md border text-left transition-colors',
                    'border-gray-200 dark:border-gray-700',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  data-testid="claudemd-install-overwrite-button"
                >
                  <div className="flex items-center gap-3">
                    {loadingMode === 'overwrite' ? (
                      <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        上書き
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        既存のCLAUDE.mdをテンプレートで完全に置き換えます
                      </div>
                    </div>
                  </div>
                </button>

                {/* Semantic merge option */}
                <button
                  onClick={() => handleInstall('merge')}
                  disabled={isLoading}
                  className={clsx(
                    'w-full p-3 rounded-md border text-left transition-colors',
                    'border-gray-200 dark:border-gray-700',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  data-testid="claudemd-install-merge-button"
                >
                  <div className="flex items-center gap-3">
                    {loadingMode === 'merge' ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : (
                      <Merge className="w-5 h-5 text-blue-500" />
                    )}
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        セマンティックマージ
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        AIを使用して既存の内容とテンプレートをマージします（時間がかかります）
                      </div>
                    </div>
                  </div>
                </button>

                {/* Cancel option */}
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className={clsx(
                    'w-full p-3 rounded-md border text-left transition-colors',
                    'border-gray-200 dark:border-gray-700',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  data-testid="claudemd-install-cancel-button"
                >
                  <div className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        キャンセル
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        何もせずにダイアログを閉じます
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                CLAUDE.mdテンプレートをプロジェクトにインストールしますか？
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className={clsx(
                    'px-4 py-2 rounded-md text-sm',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  data-testid="claudemd-install-new-cancel-button"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => handleInstall('overwrite')}
                  disabled={isLoading}
                  className={clsx(
                    'px-4 py-2 rounded-md text-sm',
                    'bg-blue-500 hover:bg-blue-600 text-white',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center gap-2'
                  )}
                  data-testid="claudemd-install-submit-button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      インストール中...
                    </>
                  ) : (
                    'インストール'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md" data-testid="claudemd-install-error">
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {error.type === 'MERGE_ERROR'
                    ? `マージエラー: ${error.message}`
                    : error.type === 'PERMISSION_DENIED'
                    ? `権限エラー: ${error.path}`
                    : error.type === 'TEMPLATE_NOT_FOUND'
                    ? `テンプレートが見つかりません: ${error.path}`
                    : `エラー: ${error.type}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
