/**
 * Integration Tests for useRemoteTaskProgress Hook
 *
 * remote-ui-task-display Task 6.3: Integration tests for task progress hook
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRemoteTaskProgress } from './useRemoteTaskProgress';
import type { ApiClient, SpecDetail } from '@shared/api/types';

// Mock ApiClient
function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getArtifactContent: vi.fn().mockResolvedValue({ ok: true, value: '' }),
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: null }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: null }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test' } }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test' } }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test' } }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true }),
    startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: { status: 'running' } }),
    stopAutoExecution: vi.fn().mockResolvedValue({ ok: true }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
    onSpecJsonChange: vi.fn().mockReturnValue(() => {}),
    onBugJsonChange: vi.fn().mockReturnValue(() => {}),
    onAutoExecutionEvent: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  } as unknown as ApiClient;
}

// Create mock SpecDetail
function createMockSpecDetail(overrides?: Partial<SpecDetail>): SpecDetail {
  return {
    metadata: { name: 'test-spec' },
    specJson: {
      feature_name: 'test-spec',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      language: 'ja',
      phase: 'tasks-generated',
      approvals: {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      },
    },
    artifacts: {
      requirements: { exists: true, updatedAt: null },
      design: { exists: true, updatedAt: null },
      tasks: { exists: true, updatedAt: null },
      research: null,
      inspection: null,
    },
    taskProgress: null,
    parallelTaskInfo: null,
    ...overrides,
  };
}

describe('useRemoteTaskProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Requirement 2.1: specDetail update triggers exists flag check
  describe('specDetail update detection', () => {
    it('should check tasks exists flag when specDetail is provided', async () => {
      const mockApiClient = createMockApiClient();
      const specDetail = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'test-spec',
          specDetail,
        })
      );

      // Wait for the hook to process
      await waitFor(() => {
        expect(mockApiClient.getArtifactContent).toHaveBeenCalledWith('test-spec', 'tasks');
      });
    });

    it('should not call API when tasks.exists is false', async () => {
      const mockApiClient = createMockApiClient();
      const specDetail = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: false, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'test-spec',
          specDetail,
        })
      );

      // Should not call API
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockApiClient.getArtifactContent).not.toHaveBeenCalled();
    });
  });

  // Requirement 2.2: getArtifactContent API call
  describe('API content retrieval', () => {
    it('should call getArtifactContent with correct parameters', async () => {
      const mockApiClient = createMockApiClient({
        getArtifactContent: vi.fn().mockResolvedValue({
          ok: true,
          value: '- [x] Task 1\n- [ ] Task 2',
        }),
      });

      const specDetail = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'my-feature',
          specDetail,
        })
      );

      await waitFor(() => {
        expect(mockApiClient.getArtifactContent).toHaveBeenCalledWith('my-feature', 'tasks');
      });
    });
  });

  // Requirement 2.3: Use shared parsing logic
  describe('task progress calculation', () => {
    it('should calculate taskProgress using parseTaskProgress', async () => {
      const mockApiClient = createMockApiClient({
        getArtifactContent: vi.fn().mockResolvedValue({
          ok: true,
          value: '- [x] Task 1\n- [x] Task 2\n- [ ] Task 3',
        }),
      });

      const specDetail = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      const { result } = renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'test-spec',
          specDetail,
        })
      );

      await waitFor(() => {
        expect(result.current.taskProgress).not.toBeNull();
      });

      expect(result.current.taskProgress?.total).toBe(3);
      expect(result.current.taskProgress?.completed).toBe(2);
      expect(result.current.taskProgress?.percentage).toBe(67);
    });

    it('should provide tasksContent for expandable display', async () => {
      const tasksContent = '# Tasks\n\n- [x] Completed task';
      const mockApiClient = createMockApiClient({
        getArtifactContent: vi.fn().mockResolvedValue({
          ok: true,
          value: tasksContent,
        }),
      });

      const specDetail = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      const { result } = renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'test-spec',
          specDetail,
        })
      );

      await waitFor(() => {
        expect(result.current.tasksContent).toBe(tasksContent);
      });
    });
  });

  // Requirement 2.4: Error fallback
  describe('error handling', () => {
    it('should return null state on API error', async () => {
      const mockApiClient = createMockApiClient({
        getArtifactContent: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'Failed to fetch' },
        }),
      });

      const specDetail = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      const { result } = renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'test-spec',
          specDetail,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.taskProgress).toBeNull();
      expect(result.current.tasksContent).toBeNull();
      expect(result.current.error).toBe('Failed to fetch');
    });

    it('should return null state when specDetail is null', () => {
      const mockApiClient = createMockApiClient();

      const { result } = renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'test-spec',
          specDetail: null,
        })
      );

      expect(result.current.taskProgress).toBeNull();
      expect(result.current.tasksContent).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // Requirement 5.1, 5.2: Auto-fetch on exists flag change
  describe('exists flag change detection', () => {
    it('should fetch content when exists changes from false to true', async () => {
      const mockApiClient = createMockApiClient({
        getArtifactContent: vi.fn().mockResolvedValue({
          ok: true,
          value: '- [x] New task',
        }),
      });

      // Initially tasks don't exist
      const specDetailWithoutTasks = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: false, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      const { result, rerender } = renderHook(
        ({ specDetail }) =>
          useRemoteTaskProgress({
            apiClient: mockApiClient,
            specId: 'test-spec',
            specDetail,
          }),
        { initialProps: { specDetail: specDetailWithoutTasks } }
      );

      // API should not be called
      expect(mockApiClient.getArtifactContent).not.toHaveBeenCalled();

      // Now tasks exist
      const specDetailWithTasks = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      rerender({ specDetail: specDetailWithTasks });

      await waitFor(() => {
        expect(mockApiClient.getArtifactContent).toHaveBeenCalled();
      });
    });
  });

  // Requirement 5.3: Re-fetch on specDetail update
  describe('specDetail update triggers re-fetch', () => {
    it('should re-fetch content when specDetail updatedAt changes', async () => {
      const mockApiClient = createMockApiClient({
        getArtifactContent: vi.fn().mockResolvedValue({
          ok: true,
          value: '- [x] Task 1',
        }),
      });

      const specDetail1 = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: '2026-01-01T00:00:00Z' },
          research: null,
          inspection: null,
        },
      });

      const { rerender } = renderHook(
        ({ specDetail }) =>
          useRemoteTaskProgress({
            apiClient: mockApiClient,
            specId: 'test-spec',
            specDetail,
          }),
        { initialProps: { specDetail: specDetail1 } }
      );

      await waitFor(() => {
        expect(mockApiClient.getArtifactContent).toHaveBeenCalledTimes(1);
      });

      // Update specDetail with new updatedAt
      const specDetail2 = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: '2026-01-02T00:00:00Z' },
          research: null,
          inspection: null,
        },
      });

      rerender({ specDetail: specDetail2 });

      await waitFor(() => {
        expect(mockApiClient.getArtifactContent).toHaveBeenCalledTimes(2);
      });
    });
  });

  // Loading state
  describe('loading state', () => {
    it('should set isLoading to true while fetching', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockApiClient = createMockApiClient({
        getArtifactContent: vi.fn().mockReturnValue(pendingPromise),
      });

      const specDetail = createMockSpecDetail({
        artifacts: {
          requirements: null,
          design: null,
          tasks: { exists: true, updatedAt: null },
          research: null,
          inspection: null,
        },
      });

      const { result } = renderHook(() =>
        useRemoteTaskProgress({
          apiClient: mockApiClient,
          specId: 'test-spec',
          specDetail,
        })
      );

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ ok: true, value: '- [x] Task' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
