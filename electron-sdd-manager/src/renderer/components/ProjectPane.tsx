/**
 * ProjectPane Component
 *
 * project-config-editor Task 3.4: Project view container
 * Requirements: 3.1, 3.3
 *
 * Features:
 * - Combines ProjectFileList and ProjectFileEditor
 * - Handles file selection and loading
 * - Manages external change events
 */

import { useCallback } from 'react';
import { ProjectFileList } from './ProjectFileList';
import { ProjectFileEditor } from './ProjectFileEditor';
import { ExternalChangeDialog } from './ExternalChangeDialog';
import { useProjectEditorStore } from '@shared/stores/projectEditorStore';
import { useProjectStore } from '../stores/projectStore';
import type { ProjectFilesState } from '@shared/api/types';
// trpc-full-migration Task 9.2: tRPC Subscription for event listeners
import { trpc } from '@shared/trpc/client';
// trpc-full-migration Task 10.6/11.4: Use tRPC vanilla client for file operations
import { getVanillaClient } from '@shared/trpc/vanillaClient';

export interface ProjectPaneProps {
  /** Project files state */
  files: ProjectFilesState;
  /** Callback to refresh files list */
  onRefreshFiles: () => void;
}

/**
 * ProjectPane - Main container for Project view
 */
export function ProjectPane({ files, onRefreshFiles: _onRefreshFiles }: ProjectPaneProps) {
  const { currentProject } = useProjectStore();
  const {
    currentFilePath,
    currentFileName,
    externalChangeDetected,
    loadFile,
    save,
    handleExternalChange,
    setExternalChangeDetected,
  } = useProjectEditorStore();

  // trpc-full-migration Task 11.4: Use tRPC vanilla client for file operations
  // Cast as any since projectEditorStore only uses readProjectFile/writeProjectFile
  const apiClient = {
    readProjectFile: async (filePath: string) => {
      try {
        const content = await getVanillaClient().file.projectFileRead.query({ filePath });
        return { ok: true as const, value: content };
      } catch (error) {
        return { ok: false as const, error: { type: 'READ_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },
    writeProjectFile: async (filePath: string, content: string) => {
      try {
        await getVanillaClient().file.projectFileWrite.mutate({ filePath, content });
        return { ok: true as const, value: undefined };
      } catch (error) {
        return { ok: false as const, error: { type: 'WRITE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },
  } as any;

  // Handle file selection
  const handleSelectFile = useCallback(
    async (filePath: string, fileName: string) => {
      await loadFile(apiClient, filePath, fileName);
    },
    [apiClient, loadFile]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    await save(apiClient);
  }, [apiClient, save]);

  // Handle external change - reload
  const handleReload = useCallback(async () => {
    await handleExternalChange(apiClient, true);
  }, [apiClient, handleExternalChange]);

  // Handle external change - ignore
  const handleIgnore = useCallback(() => {
    handleExternalChange(apiClient, false);
  }, [apiClient, handleExternalChange]);

  // Subscribe to external file change events
  // Task 9.2: window.electronAPI.onProjectFileChanged -> tRPC Subscription
  trpc.events.onProjectFileChanged.useSubscription(undefined, {
    enabled: !!currentFilePath,
    onData: (data: Record<string, unknown>) => {
      const changedPath = (data as { filePath: string }).filePath;
      // Only notify if the currently open file changed
      if (changedPath === currentFilePath) {
        setExternalChangeDetected(true);
      }
    },
  });

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <span className="text-gray-400 dark:text-gray-500">
          プロジェクトを選択してください
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden" data-testid="project-pane">
      {/* Left: File list */}
      <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <ProjectFileList
          files={files}
          selectedFilePath={currentFilePath}
          onSelectFile={handleSelectFile}
          projectPath={currentProject}
        />
      </div>

      {/* Right: Editor */}
      <div className="flex-1 min-w-0">
        <ProjectFileEditor onSave={handleSave} />
      </div>

      {/* External change dialog */}
      <ExternalChangeDialog
        isOpen={externalChangeDetected}
        fileName={currentFileName || ''}
        onReload={handleReload}
        onIgnore={handleIgnore}
      />
    </div>
  );
}
