/**
 * ProjectSelector Component
 * Handles project directory selection
 * Requirements: 1.1, 1.2, 1.3
 */

import { FolderOpen, CheckCircle, AlertCircle, FolderPlus } from 'lucide-react';
import { useProjectStore, useSpecStore } from '../stores';
import { clsx } from 'clsx';

export function ProjectSelector() {
  const {
    currentProject,
    kiroValidation,
    isLoading,
    selectProject,
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

      {kiroValidation && (
        <div className="mt-3 space-y-1">
          <ValidationItem
            valid={kiroValidation.exists}
            label=".kiro ディレクトリ"
          />
          <ValidationItem
            valid={kiroValidation.hasSpecs}
            label="specs ディレクトリ"
          />
          <ValidationItem
            valid={kiroValidation.hasSteering}
            label="steering ディレクトリ"
          />

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
