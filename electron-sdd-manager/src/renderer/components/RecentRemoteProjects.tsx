/**
 * Recent Remote Projects
 * Displays list of recently used SSH remote projects in sidebar
 * Requirements: 8.2, 8.3, 8.5
 */

import type { JSX } from 'react';
import { useEffect } from 'react';
import { Server, X, AlertCircle, Loader2 } from 'lucide-react';
import { useConnectionStore } from '../stores/connectionStore';

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) {
    return minutes <= 1 ? 'just now' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }

  return date.toLocaleDateString();
}

/**
 * Recent Remote Projects Component
 */
export function RecentRemoteProjects(): JSX.Element {
  const recentRemoteProjects = useConnectionStore((state) => state.recentRemoteProjects);
  const loadRecentRemoteProjects = useConnectionStore((state) => state.loadRecentRemoteProjects);
  const connectSSH = useConnectionStore((state) => state.connectSSH);
  const removeRecentRemoteProject = useConnectionStore((state) => state.removeRecentRemoteProject);
  const isLoading = useConnectionStore((state) => state.isLoading);

  // Load recent projects on mount
  useEffect(() => {
    loadRecentRemoteProjects();
  }, [loadRecentRemoteProjects]);

  const handleConnect = (uri: string) => {
    connectSSH(uri);
  };

  const handleRemove = (e: React.MouseEvent, uri: string) => {
    e.stopPropagation(); // Prevent triggering connect
    removeRecentRemoteProject(uri);
  };

  return (
    <div className="mb-4">
      <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Server className="w-3.5 h-3.5" />
        Remote Projects
      </h3>

      {isLoading ? (
        <div className="px-3 py-2 flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : recentRemoteProjects.length === 0 ? (
        <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
          No recent remote projects
        </div>
      ) : (
        <ul className="space-y-1">
          {recentRemoteProjects.map((project) => (
            <li key={project.uri} className="group relative">
              <button
                onClick={() => handleConnect(project.uri)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md
                  flex items-center gap-2"
              >
                <Server className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-medium">{project.displayName}</span>
                    {!project.connectionSuccessful && (
                      <AlertCircle
                        data-testid="connection-failed-indicator"
                        className="w-3.5 h-3.5 text-red-500 flex-shrink-0"
                        aria-label="Last connection failed"
                      />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {formatRelativeTime(project.lastConnectedAt)}
                  </div>
                </div>
              </button>

              {/* Remove button - visible on hover, positioned absolutely */}
              <button
                onClick={(e) => handleRemove(e, project.uri)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500
                  opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove from recent projects"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
