/**
 * RecentProjects Component
 * Displays list of recently used projects with version status indicators
 * Requirements: 1.4, 1.5
 * Requirements (commandset-version-detection): 3.1, 3.2, 3.3, 3.4, 4.1, 4.2
 */

import { useEffect, useState } from 'react';
import { Clock, Folder, AlertTriangle, Info } from 'lucide-react';
import { useProjectStore } from '../stores';
import { useVersionStatusStore } from '../stores/versionStatusStore';
import { clsx } from 'clsx';
import { CommandsetInstallDialog, type ProfileName, type ProgressCallback } from './CommandsetInstallDialog';
import type { VersionCheckResult } from '../types';

/**
 * VersionWarningIcon - Display warning icon with tooltip for version status
 * Requirements (commandset-version-detection): 3.2, 3.3
 */
function VersionWarningIcon({
  versionResult,
  projectPath,
}: {
  versionResult: VersionCheckResult;
  projectPath: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!versionResult.anyUpdateRequired) {
    return null;
  }

  const updatesNeeded = versionResult.commandsets.filter(c => c.updateRequired);

  // Legacy project indicator
  if (versionResult.legacyProject) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info
          data-testid={`version-legacy-icon-${projectPath}`}
          className="w-4 h-4 text-blue-500 flex-shrink-0"
        />
        {showTooltip && (
          <div className="absolute left-0 bottom-full mb-2 z-50 w-64 p-2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg">
            <p className="font-medium mb-1">Legacy project</p>
            <p className="text-gray-300">
              Reinstall commandsets to enable version tracking
            </p>
          </div>
        )}
      </div>
    );
  }

  // Update required indicator
  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <AlertTriangle
        data-testid={`version-warning-icon-${projectPath}`}
        className="w-4 h-4 text-amber-500 flex-shrink-0"
      />
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-64 p-2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg">
          <p className="font-medium mb-1">
            {updatesNeeded.length === 1
              ? 'Commandset update available'
              : `${updatesNeeded.length} commandset updates available`}
          </p>
          <ul className="space-y-0.5 text-gray-300">
            {updatesNeeded.map(c => (
              <li key={c.name}>
                {c.name}: {c.installedVersion || '?'} {'->'} {c.bundleVersion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function RecentProjects() {
  const {
    recentProjects,
    currentProject,
    loadRecentProjects,
    selectProject,
  } = useProjectStore();
  // Note: loadSpecs is no longer needed - selectProject now handles specs loading
  const {
    checkProjectVersions,
    getVersionStatus,
    hasAnyUpdateRequired,
  } = useVersionStatusStore();

  // State for CommandsetInstallDialog
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [installDialogProjectPath, setInstallDialogProjectPath] = useState<string | null>(null);

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  // Check version status for all projects when component mounts
  // Requirements (commandset-version-detection): 3.1
  useEffect(() => {
    const checkVersions = async () => {
      for (const projectPath of recentProjects) {
        // Check if we already have status for this project
        const existingStatus = getVersionStatus(projectPath);
        if (!existingStatus?.result) {
          await checkProjectVersions(projectPath);
        }
      }
    };

    if (recentProjects.length > 0) {
      checkVersions();
    }
  }, [recentProjects, checkProjectVersions, getVersionStatus]);

  const handleSelectProject = async (path: string) => {
    // selectProject handles everything: specs loading, specJsonMap, file watchers
    await selectProject(path);
  };

  // Handler for update button click
  // Requirements (commandset-version-detection): 4.1, 4.2
  const handleUpdateClick = (projectPath: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent project selection
    setInstallDialogProjectPath(projectPath);
    setInstallDialogOpen(true);
  };

  // Handler for install via dialog
  const handleInstall = async (
    profileName: ProfileName,
    _progressCallback?: ProgressCallback
  ) => {
    if (!installDialogProjectPath) return;

    const result = await window.electronAPI.installCommandsetByProfile(
      installDialogProjectPath,
      profileName,
      { force: true }
    );

    if (result.ok) {
      // Refresh version status after installation
      await checkProjectVersions(installDialogProjectPath);
      return result.value.summary;
    }
  };

  const handleCloseInstallDialog = () => {
    setInstallDialogOpen(false);
    setInstallDialogProjectPath(null);
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
        {recentProjects.map((path) => {
          const versionStatus = getVersionStatus(path);
          const updateRequired = hasAnyUpdateRequired(path);

          return (
            <li key={path}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSelectProject(path)}
                  className={clsx(
                    'flex-1 px-2 py-1.5 text-left rounded text-sm',
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
                  {versionStatus?.result && (
                    <VersionWarningIcon
                      versionResult={versionStatus.result}
                      projectPath={path}
                    />
                  )}
                </button>
                {updateRequired && (
                  <button
                    onClick={(e) => handleUpdateClick(path, e)}
                    className={clsx(
                      'px-2 py-1 text-xs font-medium rounded',
                      'text-amber-700 dark:text-amber-300',
                      'bg-amber-100 dark:bg-amber-900/30',
                      'hover:bg-amber-200 dark:hover:bg-amber-800/40',
                      'transition-colors'
                    )}
                    title="Update commandsets"
                    data-testid={`update-button-${path}`}
                  >
                    Update
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* CommandsetInstallDialog for updates */}
      {installDialogProjectPath && (
        <CommandsetInstallDialog
          isOpen={installDialogOpen}
          projectPath={installDialogProjectPath}
          onClose={handleCloseInstallDialog}
          onInstall={handleInstall}
          onCheckAgentFolderExists={window.electronAPI.checkAgentFolderExists}
          onDeleteAgentFolder={window.electronAPI.deleteAgentFolder}
        />
      )}
    </div>
  );
}
