/**
 * useRemoteTaskProgress Hook
 *
 * Remote UI hook for lazy-loading tasks.md content and calculating task progress.
 * Uses getArtifactContent API for content retrieval and shared parseTaskProgress for calculation.
 *
 * remote-ui-task-display Task 2.1: Create task progress hook for Remote UI
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3
 */

import { useState, useEffect, useRef } from 'react';
import { parseTaskProgress, type TaskProgress } from '@shared/utils/taskProgressParser';
import type { ApiClient, SpecDetail } from '@shared/api/types';

/**
 * Configuration for useRemoteTaskProgress hook
 */
export interface UseRemoteTaskProgressConfig {
  /** API client instance */
  apiClient: ApiClient;
  /** Spec identifier */
  specId: string | null;
  /** Spec detail with artifacts info */
  specDetail: SpecDetail | null;
}

/**
 * State returned by useRemoteTaskProgress hook
 */
export interface TaskProgressState {
  /** Calculated task progress (null = no tasks) */
  taskProgress: TaskProgress | null;
  /** tasks.md content for expandable display */
  tasksContent: string | null;
  /** Loading indicator */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Hook for lazy-loading tasks.md content and calculating task progress
 *
 * Requirements:
 * - 2.1: Check tasks.md exists flag on specDetail update
 * - 2.2: Call getArtifactContent API when tasks exist
 * - 2.3: Use shared parseTaskProgress for calculation
 * - 2.4: Return null state on error or when tasks don't exist
 * - 5.1: Detect specDetail updates via WebSocket
 * - 5.2: Auto-fetch when exists changes from false to true
 * - 5.3: Re-fetch content when specDetail updates
 */
export function useRemoteTaskProgress(config: UseRemoteTaskProgressConfig): TaskProgressState {
  const { apiClient, specId, specDetail } = config;

  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  const [tasksContent, setTasksContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track previous values for change detection
  const prevExistsRef = useRef<boolean | undefined>(undefined);
  const prevUpdatedAtRef = useRef<string | null | undefined>(undefined);

  // AbortController for canceling previous requests (Requirement 5.3)
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Early return if no specDetail or specId
    if (!specDetail || !specId) {
      setTaskProgress(null);
      setTasksContent(null);
      setIsLoading(false);
      setError(null);
      prevExistsRef.current = undefined;
      prevUpdatedAtRef.current = undefined;
      return;
    }

    const tasksArtifact = specDetail.artifacts?.tasks;
    const exists = tasksArtifact?.exists ?? false;
    const updatedAt = tasksArtifact?.updatedAt ?? null;

    // Requirement 2.4: Don't fetch if tasks don't exist
    if (!exists) {
      setTaskProgress(null);
      setTasksContent(null);
      setIsLoading(false);
      setError(null);
      prevExistsRef.current = exists;
      prevUpdatedAtRef.current = updatedAt;
      return;
    }

    // Check if we need to fetch (Requirement 5.2, 5.3)
    const existsChanged = prevExistsRef.current !== exists;
    const updatedAtChanged = prevUpdatedAtRef.current !== updatedAt;

    // Only skip fetch if nothing changed and we already have content
    if (!existsChanged && !updatedAtChanged && tasksContent !== null) {
      return;
    }

    // Update refs
    prevExistsRef.current = exists;
    prevUpdatedAtRef.current = updatedAt;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchContent = async () => {
      // Check if API method is available
      if (!apiClient.getArtifactContent) {
        setError('getArtifactContent API not available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Requirement 2.2: Call getArtifactContent API
        const result = await apiClient.getArtifactContent(specId, 'tasks');

        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (result.ok) {
          const content = result.value;
          setTasksContent(content);

          // Requirement 2.3: Use shared parseTaskProgress
          const parsed = parseTaskProgress(content);
          setTaskProgress(parsed.total > 0 ? parsed : null);
          setError(null);
        } else {
          // Requirement 2.4: Return null on error
          setTaskProgress(null);
          setTasksContent(null);
          setError(result.error?.message ?? 'Failed to load tasks');
        }
      } catch (err) {
        // Check if aborted (don't set error for aborted requests)
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        // Requirement 2.4: Return null on error
        setTaskProgress(null);
        setTasksContent(null);
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchContent();

    // Cleanup: abort on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [apiClient, specId, specDetail?.artifacts?.tasks?.exists, specDetail?.artifacts?.tasks?.updatedAt]);

  return {
    taskProgress,
    tasksContent,
    isLoading,
    error,
  };
}
