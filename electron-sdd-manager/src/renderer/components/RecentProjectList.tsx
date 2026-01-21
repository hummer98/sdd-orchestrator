/**
 * RecentProjectList Component
 * Displays list of recently opened projects in the project selection view
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4, 5.1
 */

import { Folder } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';

/**
 * Maximum number of recent projects to display
 * Requirement 3.1: 最大6件の最近開いたプロジェクトを表示
 */
const MAX_RECENT_PROJECTS = 6;

export function RecentProjectList() {
  const { recentProjects, selectProject } = useProjectStore();

  // Requirement 3.4: 最近開いたプロジェクトが存在しない場合は非表示
  if (recentProjects.length === 0) {
    return null;
  }

  // Requirement 3.1: 最大6件表示、Requirement 3.5: 新しい順（configStoreは既にソート済み）
  const displayedProjects = recentProjects.slice(0, MAX_RECENT_PROJECTS);

  const handleProjectClick = async (projectPath: string) => {
    await selectProject(projectPath);
  };

  return (
    <div
      data-testid="recent-project-list"
      className="mt-6 text-gray-700 dark:text-gray-300"
    >
      <h3 className="text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">
        最近開いたプロジェクト
      </h3>
      <ul className="space-y-2">
        {displayedProjects.map((projectPath) => {
          // Requirement 3.2: フォルダ名（最後のパスセグメント）を抽出
          const folderName = projectPath.split('/').pop() || projectPath;

          return (
            <li key={projectPath}>
              <button
                onClick={() => handleProjectClick(projectPath)}
                className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                {/* Folder icon */}
                <Folder
                  data-testid="folder-icon"
                  className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  {/* Requirement 3.2: フォルダ名表示 */}
                  <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                    {folderName}
                  </div>
                  {/* Requirement 3.2: フルパス表示 */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {projectPath}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
