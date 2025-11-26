/**
 * RecentProjects Component
 * Displays list of recently used projects
 * Requirements: 1.4, 1.5
 */

import { useEffect } from 'react';
import { Clock, Folder } from 'lucide-react';
import { useProjectStore, useSpecStore } from '../stores';
import { clsx } from 'clsx';

export function RecentProjects() {
  const {
    recentProjects,
    currentProject,
    loadRecentProjects,
    selectProject,
  } = useProjectStore();
  const { loadSpecs } = useSpecStore();

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  const handleSelectProject = async (path: string) => {
    await selectProject(path);
    await loadSpecs(path);
  };

  if (recentProjects.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          最近のプロジェクト
        </h3>
      </div>

      <ul className="space-y-1">
        {recentProjects.map((path) => (
          <li key={path}>
            <button
              onClick={() => handleSelectProject(path)}
              className={clsx(
                'w-full px-2 py-1.5 text-left rounded text-sm',
                'flex items-center gap-2',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors',
                path === currentProject && 'bg-blue-50 dark:bg-blue-900/20'
              )}
            >
              <Folder className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span
                className="truncate text-gray-700 dark:text-gray-300"
                title={path}
              >
                {path.split('/').pop()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
