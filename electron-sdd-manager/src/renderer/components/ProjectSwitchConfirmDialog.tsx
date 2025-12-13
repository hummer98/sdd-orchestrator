/**
 * Project Switch Confirm Dialog
 * Confirmation dialog when switching projects with running agents
 * Requirements: 5.7
 */

import type { JSX } from 'react';
import { AlertTriangle, X, Server, Folder } from 'lucide-react';

type TargetProject =
  | { type: 'local'; path: string }
  | { type: 'ssh'; uri: string; displayName: string };

interface ProjectSwitchConfirmDialogProps {
  isOpen: boolean;
  runningAgentsCount: number;
  targetProject: TargetProject;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Project Switch Confirm Dialog Component
 */
export function ProjectSwitchConfirmDialog({
  isOpen,
  runningAgentsCount,
  targetProject,
  onConfirm,
  onCancel,
}: ProjectSwitchConfirmDialogProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const agentText = runningAgentsCount === 1 ? '1 running agent' : `${runningAgentsCount} running agents`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-t-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              Switch Project
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300">
              You have <strong className="text-yellow-600 dark:text-yellow-400">{agentText}</strong> that will be stopped if you switch projects.
            </p>
          </div>

          {/* Target project info */}
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span className="font-medium">Switch to:</span>
            </div>
            <div className="flex items-center gap-2">
              {targetProject.type === 'ssh' ? (
                <>
                  <Server className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-900 dark:text-white font-medium">
                    {targetProject.displayName}
                  </span>
                </>
              ) : (
                <>
                  <Folder className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-white font-mono text-sm truncate">
                    {targetProject.path}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-3 rounded-md mb-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              All running agents will be stopped and their progress may be lost.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
            >
              Stop Agents & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
