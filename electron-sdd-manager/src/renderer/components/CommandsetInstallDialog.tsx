/**
 * CommandsetInstallDialog Component
 * Profile selection dialog for unified commandset installation
 * Requirements: 10.2, 10.3
 */

import { useState } from 'react';
import { X, AlertCircle, Loader2, Package, Layers, BoxSelect, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Profile name type
 */
export type ProfileName = 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';

/**
 * Install progress callback data
 */
export interface InstallProgress {
  current: number;
  total: number;
  currentCommandset: string;
}

/**
 * Install result summary
 */
export interface InstallResultSummary {
  totalInstalled: number;
  totalSkipped: number;
  totalFailed: number;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: InstallProgress) => void;

/**
 * Profile definition
 */
interface Profile {
  readonly name: ProfileName;
  readonly displayName: string;
  readonly description: string;
  readonly icon: React.ReactNode;
  readonly commandsets: readonly string[];
}

/**
 * Profile definitions
 */
const PROFILES: Profile[] = [
  {
    name: 'cc-sdd',
    displayName: 'cc-sdd',
    description: 'cc-sdd workflow commands with bug and document-review',
    icon: <Package className="w-5 h-5 text-blue-500" />,
    commandsets: ['cc-sdd', 'bug', 'document-review'],
  },
  {
    name: 'cc-sdd-agent',
    displayName: 'cc-sdd-agent',
    description: 'cc-sdd-agent commands with agents (recommended)',
    icon: <Layers className="w-5 h-5 text-green-500" />,
    commandsets: ['cc-sdd-agent', 'bug', 'document-review', 'agents'],
  },
  {
    name: 'spec-manager',
    displayName: 'spec-manager',
    description: 'spec-manager commands with bug and document-review',
    icon: <BoxSelect className="w-5 h-5 text-gray-500" />,
    commandsets: ['spec-manager', 'bug', 'document-review'],
  },
];

/**
 * Dialog state type
 */
type DialogState = 'selection' | 'installing' | 'complete';

interface CommandsetInstallDialogProps {
  isOpen: boolean;
  projectPath: string;
  onClose: () => void;
  onInstall: (profileName: ProfileName, progressCallback?: ProgressCallback) => Promise<InstallResultSummary | void>;
}

export function CommandsetInstallDialog({
  isOpen,
  projectPath,
  onClose,
  onInstall,
}: CommandsetInstallDialogProps) {
  const [selectedProfile, setSelectedProfile] = useState<ProfileName>('cc-sdd-agent');
  const [dialogState, setDialogState] = useState<DialogState>('selection');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [result, setResult] = useState<InstallResultSummary | null>(null);

  if (!isOpen) return null;

  const projectName = projectPath.split('/').pop() || projectPath;
  const isLoading = dialogState === 'installing';

  const handleInstall = async () => {
    setDialogState('installing');
    setError(null);
    setProgress(null);
    setResult(null);

    try {
      const installResult = await onInstall(selectedProfile, (progressData) => {
        setProgress(progressData);
      });

      // If result is returned, show it; otherwise just close
      if (installResult) {
        setResult(installResult);
        setDialogState('complete');
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setDialogState('selection');
    }
  };

  const handleClose = () => {
    setDialogState('selection');
    setProgress(null);
    setResult(null);
    setError(null);
    onClose();
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {dialogState === 'complete' ? 'インストール完了' : 'コマンドセットをインストール'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            aria-label="close"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            プロジェクト: <strong>{projectName}</strong>
          </p>

          {/* Profile Selection (only shown in selection state) */}
          {dialogState === 'selection' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                インストールプロファイルを選択:
              </p>

              {PROFILES.map((profile) => (
                <label
                  key={profile.name}
                  className={clsx(
                    'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                    selectedProfile === profile.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="radio"
                    name="profile"
                    value={profile.name}
                    checked={selectedProfile === profile.name}
                    onChange={() => setSelectedProfile(profile.name)}
                    disabled={isLoading}
                    aria-label={profile.displayName}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {profile.icon}
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {profile.displayName}
                      </span>
                      {profile.name === 'cc-sdd-agent' && (
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
                          推奨
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {profile.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {profile.commandsets.map((cs) => (
                        <span
                          key={cs}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded"
                        >
                          {cs}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Progress Bar (shown during installation) */}
          {dialogState === 'installing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {progress
                    ? `インストール中: ${progress.currentCommandset} (${progress.current}/${progress.total})`
                    : 'インストール中...'}
                </span>
              </div>

              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
              >
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Result Summary (shown after completion) */}
          {dialogState === 'complete' && result && (
            <div className="space-y-4">
              {/* Success/Warning indicator */}
              <div className={clsx(
                'flex items-center gap-3 p-4 rounded-md',
                result.totalFailed > 0
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-green-50 dark:bg-green-900/20'
              )}>
                {result.totalFailed > 0 ? (
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
                <div>
                  <p className={clsx(
                    'font-medium',
                    result.totalFailed > 0
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-green-700 dark:text-green-300'
                  )}>
                    {result.totalFailed > 0
                      ? '一部のファイルのインストールに失敗しました'
                      : 'インストールが完了しました'}
                  </p>
                </div>
              </div>

              {/* Result details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.totalInstalled}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">インストール</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-center">
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {result.totalSkipped}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">スキップ</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-center">
                  <p className={clsx(
                    'text-2xl font-bold',
                    result.totalFailed > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  )}>
                    {result.totalFailed}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">失敗</p>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          {dialogState === 'selection' && (
            <>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                キャンセル
              </button>
              <button
                onClick={handleInstall}
                disabled={isLoading}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm',
                  'bg-blue-500 hover:bg-blue-600 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
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
            </>
          )}

          {dialogState === 'installing' && (
            <button
              disabled
              className={clsx(
                'px-4 py-2 rounded-md text-sm',
                'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400',
                'cursor-not-allowed',
                'flex items-center gap-2'
              )}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              インストール中...
            </button>
          )}

          {dialogState === 'complete' && (
            <button
              onClick={handleClose}
              className={clsx(
                'px-4 py-2 rounded-md text-sm',
                'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
