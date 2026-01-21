/**
 * ProjectSelectionView Component
 * Main UI for project selection when no project is currently selected
 * Requirements: 1.1-1.4, 2.1-2.5, 4.1-4.4, 5.2, 5.3
 */

import { useState, KeyboardEvent } from 'react';
import { FolderOpen } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { RecentProjectList } from './RecentProjectList';

export function ProjectSelectionView() {
  const { selectProject, isLoading, error } = useProjectStore();
  const [inputPath, setInputPath] = useState('');

  // Requirement 1.1, 5.3: フォルダ選択ダイアログを開く
  const handleSelectFolder = async () => {
    // showOpenDialog returns path string or null (if canceled)
    const selectedPath = await window.electronAPI.showOpenDialog();

    // Requirement 1.3: キャンセル時は何もしない
    if (!selectedPath) {
      return;
    }

    // Requirement 1.2, 1.4: フォルダ選択でプロジェクトを開く
    await selectProject(selectedPath);
  };

  // Requirement 2.2, 5.2: パス入力からプロジェクトを開く
  const handleOpenPath = async () => {
    const trimmedPath = inputPath.trim();
    if (!trimmedPath) {
      return;
    }
    await selectProject(trimmedPath);
  };

  // Requirement 2.4: Enterキーで開くボタンと同等動作
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOpenPath();
    }
  };

  // Requirement 2.5: 空入力時はボタン無効化
  const isOpenButtonDisabled = !inputPath.trim() || isLoading;

  return (
    <div
      data-testid="project-selection-view"
      className="flex-1 flex flex-col items-center justify-center p-8 text-gray-700 dark:text-gray-300"
    >
      <div className="max-w-md w-full space-y-6">
        {/* Requirement 4.2: タイトル/説明テキスト */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            プロジェクトを開く
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            フォルダを選択するか、パスを直接入力してください
          </p>
        </div>

        {/* Requirement 1.1: フォルダを選択ボタン（プライマリアクション） */}
        <button
          onClick={handleSelectFolder}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-blue-700"
        >
          <FolderOpen className="w-5 h-5" />
          フォルダを選択
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
              または
            </span>
          </div>
        </div>

        {/* Requirement 2.1: パス入力フィールド + 開くボタン */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="パスを入力..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700"
          />
          <button
            onClick={handleOpenPath}
            disabled={isOpenButtonDisabled}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            開く
          </button>
        </div>

        {/* Requirement 2.3: エラーメッセージ表示 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Requirement 3.1-3.6: 最近開いたプロジェクトリスト */}
        <RecentProjectList />
      </div>
    </div>
  );
}
