/**
 * ErrorBanner Component
 * Displays directory validation errors and spec-manager install options
 * Task 2.1, 2.2, 2.3 (sidebar-refactor)
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, FolderPlus, Download, Loader2, CheckCircle, AlertCircle, FileWarning } from 'lucide-react';
import { useProjectStore, type InstallError } from '../stores/projectStore';
import { clsx } from 'clsx';

interface ErrorBannerProps {
  /** 展開状態（外部制御用、省略時は内部状態） */
  expanded?: boolean;
  /** 展開状態変更コールバック */
  onExpandedChange?: (expanded: boolean) => void;
}

export function ErrorBanner({ expanded, onExpandedChange }: ErrorBannerProps) {
  const {
    currentProject,
    kiroValidation,
    specManagerCheck,
    installLoading,
    installResult,
    installError,
    installCommands,
    installSettings,
    clearInstallResult,
  } = useProjectStore();

  const [internalExpanded, setInternalExpanded] = useState(false);

  // Don't render if no project selected
  if (!currentProject) {
    return null;
  }

  // Don't render if kiroValidation is null
  if (!kiroValidation) {
    return null;
  }

  // Check if there are any errors to display
  const hasKiroErrors = !kiroValidation.exists || !kiroValidation.hasSpecs || !kiroValidation.hasSteering;
  const hasSpecManagerErrors = specManagerCheck && !specManagerCheck.allPresent;

  // Don't render if everything is OK
  if (!hasKiroErrors && !hasSpecManagerErrors) {
    return null;
  }

  const isExpanded = expanded !== undefined ? expanded : internalExpanded;

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  // Count missing items
  const missingCount = [
    !kiroValidation.exists,
    !kiroValidation.hasSpecs,
    !kiroValidation.hasSteering,
  ].filter(Boolean).length + (hasSpecManagerErrors ? 1 : 0);

  return (
    <div
      data-testid="error-banner"
      className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800"
    >
      {/* Header - clickable to expand/collapse */}
      <div
        data-testid="error-banner-header"
        onClick={handleToggleExpand}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 cursor-pointer',
          'hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-yellow-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-yellow-600" />
        )}
        <AlertTriangle data-testid="error-banner-icon" className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
          {missingCount}件の問題があります
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Directory validation errors */}
          {hasKiroErrors && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                ディレクトリ構成
              </h4>
              <div className="space-y-1">
                <ValidationItem valid={kiroValidation.exists} label=".kiro ディレクトリ" />
                <ValidationItem valid={kiroValidation.hasSpecs} label="specs ディレクトリ" />
                <ValidationItem valid={kiroValidation.hasSteering} label="steering ディレクトリ" />
              </div>

              {!kiroValidation.exists && (
                <button
                  className={clsx(
                    'w-full px-3 py-2 rounded-md text-sm',
                    'bg-blue-500 hover:bg-blue-600 text-white',
                    'flex items-center justify-center gap-2'
                  )}
                  aria-label=".kiro を初期化"
                >
                  <FolderPlus className="w-4 h-4" />
                  .kiro を初期化
                </button>
              )}
            </div>
          )}

          {/* spec-manager files section */}
          {hasSpecManagerErrors && specManagerCheck && (
            <SpecManagerFilesSection
              check={specManagerCheck}
              installLoading={installLoading}
              installResult={installResult}
              installError={installError}
              onInstallCommands={installCommands}
              onInstallSettings={installSettings}
              onClearResult={clearInstallResult}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ValidationItem({ valid, label }: { valid: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {valid ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-yellow-500" />
      )}
      <span className={valid ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
        {label}
      </span>
    </div>
  );
}

// ============================================================
// spec-manager Files Section Component
// Requirements: 3.5
// ============================================================

interface SpecManagerFilesSectionProps {
  check: {
    commands: { allPresent: boolean; missing: readonly string[]; present: readonly string[] };
    settings: { allPresent: boolean; missing: readonly string[]; present: readonly string[] };
    allPresent: boolean;
  };
  installLoading: boolean;
  installResult: {
    commands: { installed: readonly string[]; skipped: readonly string[] };
    settings: { installed: readonly string[]; skipped: readonly string[] };
  } | null;
  installError: InstallError | null;
  onInstallCommands: () => void;
  onInstallSettings: () => void;
  onClearResult: () => void;
}

function SpecManagerFilesSection({
  check,
  installLoading,
  installResult,
  installError,
  onInstallCommands,
  onInstallSettings,
  onClearResult,
}: SpecManagerFilesSectionProps) {
  return (
    <div className="space-y-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
      <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
        spec-manager ファイル
      </h4>

      {/* Missing Commands */}
      {!check.commands.allPresent && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <FileWarning className="w-4 h-4" />
            <span>不足しているコマンド ({check.commands.missing.length})</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 pl-6 space-y-0.5">
            {check.commands.missing.map((file) => (
              <div key={file}>{file}</div>
            ))}
          </div>
          <button
            onClick={onInstallCommands}
            disabled={installLoading}
            className={clsx(
              'w-full px-3 py-2 rounded-md text-xs',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'flex items-center justify-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="コマンドをインストール"
          >
            {installLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                インストール中...
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                コマンドをインストール
              </>
            )}
          </button>
        </div>
      )}

      {/* Missing Settings */}
      {!check.settings.allPresent && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <FileWarning className="w-4 h-4" />
            <span>不足している設定 ({check.settings.missing.length})</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 pl-6 space-y-0.5">
            {check.settings.missing.map((file) => (
              <div key={file}>{file}</div>
            ))}
          </div>
          <button
            onClick={onInstallSettings}
            disabled={installLoading}
            className={clsx(
              'w-full px-3 py-2 rounded-md text-xs',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'flex items-center justify-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="設定をインストール"
          >
            {installLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                インストール中...
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                設定をインストール
              </>
            )}
          </button>
        </div>
      )}

      {/* Install Result */}
      {installResult && (
        <div className="space-y-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>インストール完了</span>
            </div>
            <button
              onClick={onClearResult}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              閉じる
            </button>
          </div>
          {installResult.commands.installed.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              コマンド: {installResult.commands.installed.join(', ')}
            </div>
          )}
          {installResult.settings.installed.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              設定: {installResult.settings.installed.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Install Error */}
      {installError && (
        <div className="space-y-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>
              {installError.type === 'PERMISSION_DENIED'
                ? '権限エラー'
                : installError.type === 'TEMPLATE_NOT_FOUND'
                ? 'テンプレート未発見'
                : 'エラー'}
            </span>
          </div>
          <div className="text-xs text-red-500 dark:text-red-400">
            {installError.type}: {installError.path}
            {'message' in installError && ` - ${installError.message}`}
          </div>
        </div>
      )}
    </div>
  );
}
