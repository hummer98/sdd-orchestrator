/**
 * ProjectSelector Component
 * Handles project directory selection
 * Requirements: 1.1, 1.2, 1.3, 4.1-4.6
 */

import { FolderOpen, CheckCircle, AlertCircle, FolderPlus, Download, Loader2, FileWarning } from 'lucide-react';
import { useProjectStore, useSpecStore } from '../stores';
import { clsx } from 'clsx';
import type { InstallError } from '../stores/projectStore';

export function ProjectSelector() {
  const {
    currentProject,
    kiroValidation,
    isLoading,
    selectProject,
    // spec-manager extensions
    specManagerCheck,
    installLoading,
    installResult,
    installError,
    installCommands,
    installSettings,
    clearInstallResult,
    // permissions check
    permissionsCheck,
    permissionsFixLoading,
    fixPermissions,
  } = useProjectStore();
  const { loadSpecs } = useSpecStore();

  const handleSelectProject = async () => {
    const path = await window.electronAPI.showOpenDialog();
    if (path) {
      await selectProject(path);
      await loadSpecs(path);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen className="w-5 h-5 text-gray-500" />
        <h2 className="font-semibold text-gray-700 dark:text-gray-300">
          プロジェクト
        </h2>
      </div>

      <button
        onClick={handleSelectProject}
        disabled={isLoading}
        className={clsx(
          'w-full px-3 py-2 text-left rounded-md transition-colors',
          'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
          'text-gray-700 dark:text-gray-300',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">...</span>
            読み込み中...
          </span>
        ) : currentProject ? (
          <span className="truncate block">{currentProject.split('/').pop()}</span>
        ) : (
          <span className="text-gray-500">プロジェクトを選択...</span>
        )}
      </button>

      {currentProject && (
        <div className="mt-2 text-xs text-gray-500 truncate" title={currentProject}>
          {currentProject}
        </div>
      )}

      {/* Show validation only when there are issues */}
      {kiroValidation && !(kiroValidation.exists && kiroValidation.hasSpecs && kiroValidation.hasSteering) && (
        <div className="mt-3 space-y-1">
          {!kiroValidation.exists && (
            <ValidationItem valid={false} label=".kiro ディレクトリ" />
          )}
          {!kiroValidation.hasSpecs && (
            <ValidationItem valid={false} label="specs ディレクトリ" />
          )}
          {!kiroValidation.hasSteering && (
            <ValidationItem valid={false} label="steering ディレクトリ" />
          )}

          {!kiroValidation.exists && (
            <button
              className={clsx(
                'mt-2 w-full px-3 py-2 rounded-md',
                'bg-blue-500 hover:bg-blue-600 text-white',
                'flex items-center justify-center gap-2'
              )}
            >
              <FolderPlus className="w-4 h-4" />
              .kiro を初期化
            </button>
          )}
        </div>
      )}

      {/* spec-manager Files Check and Install */}
      {/* Requirements: 4.1-4.6 */}
      {specManagerCheck && (
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

      {/* Permissions Check */}
      {permissionsCheck && (
        <PermissionsCheckSection
          check={permissionsCheck}
          loading={permissionsFixLoading}
          onFix={fixPermissions}
        />
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
      <span className={valid ? 'text-green-600' : 'text-yellow-600'}>
        {label}
      </span>
    </div>
  );
}

// ============================================================
// spec-manager Files Section Component
// Requirements: 4.1-4.6
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
  // All files present - no need to display anything (reduce noise)
  if (check.allPresent) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
        spec-manager ファイル
      </h3>

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
            {installError.type}
            {'path' in installError && `: ${installError.path}`}
            {'message' in installError && ` - ${installError.message}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Permissions Check Section Component
// ============================================================

interface PermissionsCheckSectionProps {
  check: {
    allPresent: boolean;
    missing: readonly string[];
    present: readonly string[];
  };
  loading: boolean;
  onFix: () => void;
}

function PermissionsCheckSection({ check, loading, onFix }: PermissionsCheckSectionProps) {
  // All permissions present - no need to display anything (reduce noise)
  if (check.allPresent) {
    return null;
  }

  // Some permissions missing
  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
        パーミッション
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
          <FileWarning className="w-4 h-4" />
          <span>不足しているパーミッション ({check.missing.length})</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 pl-6 space-y-0.5 max-h-40 overflow-y-auto">
          {check.missing.map((permission) => (
            <div key={permission}>{permission}</div>
          ))}
        </div>
        <button
          onClick={onFix}
          disabled={loading}
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'flex items-center justify-center gap-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="パーミッションを追加"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              追加中...
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              パーミッションを追加
            </>
          )}
        </button>
      </div>
    </div>
  );
}
