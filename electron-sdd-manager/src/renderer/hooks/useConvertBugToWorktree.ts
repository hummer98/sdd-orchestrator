/**
 * useConvertBugToWorktree Hook
 * Manages worktree conversion state and operations for bugs
 * bugs-workflow-footer: Task 5.1
 * Requirements: 7.1-7.7, 8.1-8.4
 */

import { useState, useCallback } from 'react';
import { notify, useProjectStore } from '../stores';

/**
 * Hook return type
 */
export interface UseConvertBugToWorktreeReturn {
  /** Whether current branch is main/master */
  isOnMain: boolean;
  /** Whether worktree conversion is in progress */
  isConverting: boolean;
  /** Handle worktree conversion */
  handleConvert: (bugName: string) => Promise<boolean>;
  /** Refresh main branch status */
  refreshMainBranchStatus: () => Promise<void>;
}

/**
 * useConvertBugToWorktree Hook
 * Requirements: 7.1-7.7, 8.1-8.4
 */
export function useConvertBugToWorktree(): UseConvertBugToWorktreeReturn {
  // Get current project path
  const currentProject = useProjectStore((state) => state.currentProject);

  // Requirements 8.3: isOnMain state
  const [isOnMain, setIsOnMain] = useState(false);
  // Requirements 7.2: isConverting state
  const [isConverting, setIsConverting] = useState(false);

  /**
   * Refresh main branch status via IPC
   * Requirements: 8.1, 8.2
   */
  const refreshMainBranchStatus = useCallback(async () => {
    if (!currentProject) {
      setIsOnMain(false);
      return;
    }

    try {
      const result = await window.electronAPI.worktreeCheckMain(currentProject);
      if (result.ok) {
        // Requirements 8.4: Set isOnMain based on branch check
        setIsOnMain(result.value.isMain);
      } else {
        setIsOnMain(false);
      }
    } catch (error) {
      console.error('[useConvertBugToWorktree] Failed to check main branch:', error);
      setIsOnMain(false);
    }
  }, [currentProject]);

  /**
   * Handle worktree conversion
   * Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7
   */
  const handleConvert = useCallback(async (bugName: string): Promise<boolean> => {
    // Requirements 7.2: Set isConverting to true
    setIsConverting(true);

    try {
      // Requirements 7.4: Call convertBugToWorktree IPC
      const result = await window.electronAPI.convertBugToWorktree(bugName);

      if (result.ok) {
        // Requirements 7.5: Show success notification
        notify.success(`Worktreeモードに変換しました: ${result.value.branch}`);
        return true;
      } else {
        // Requirements 7.6: Show error notification
        const errorMessage = result.error?.message || 'Worktreeへの変換に失敗しました';
        notify.error(errorMessage);
        return false;
      }
    } catch (error) {
      // Requirements 7.6: Show error notification on exception
      const errorMessage = error instanceof Error ? error.message : 'Worktreeへの変換に失敗しました';
      notify.error(errorMessage);
      return false;
    } finally {
      // Requirements 7.7: Set isConverting to false in finally
      setIsConverting(false);
    }
  }, []);

  return {
    isOnMain,
    isConverting,
    handleConvert,
    refreshMainBranchStatus,
  };
}
