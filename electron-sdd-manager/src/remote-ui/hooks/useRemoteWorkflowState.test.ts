/**
 * useRemoteWorkflowState Tests
 *
 * Tests for parallel task parsing integration in Remote UI.
 * Ensures tasks.md content is parsed and stored in parallelModeStore.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRemoteWorkflowState } from './useRemoteWorkflowState';
import {
  resetParallelModeStore,
  getParallelModeStore,
} from '@shared/stores/parallelModeStore';
import type { ApiClient, SpecMetadataWithPath, SpecDetail } from '@shared/api/types';

// =============================================================================
// Mocks
// =============================================================================

// Mock useLaunchingState
vi.mock('@shared/hooks', () => ({
  useLaunchingState: () => ({
    launching: false,
    wrapExecution: async (fn: () => Promise<void>) => fn(),
  }),
}));

// Mock hasWorktreePath
vi.mock('@renderer/types/worktree', () => ({
  hasWorktreePath: () => false,
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockApiClient = (specDetail?: SpecDetail | null): ApiClient => ({
  listSpecs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: specDetail }),
  executePhase: vi.fn().mockResolvedValue({ ok: true, value: { id: 'agent-1' } }),
  updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: { status: 'running' } }),
  stopAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { id: 'agent-1' } }),
  executeInspection: vi.fn().mockResolvedValue({ ok: true, value: { id: 'agent-1' } }),
  // Bug-related methods
  listBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: null }),
  // auto-execution-ssot: updateSpecJson for auto permission toggle
  updateSpecJson: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
});

const createMockSpec = (name: string): SpecMetadataWithPath => ({
  name,
  path: `/path/to/specs/${name}`,
  description: 'Test spec',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

const createMockSpecDetail = (
  name: string,
  tasksContent?: string
): SpecDetail => ({
  metadata: {
    name,
    path: `/path/to/specs/${name}`,
    description: 'Test spec',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  specJson: {
    name,
    description: 'Test spec',
    phase: 'impl',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  },
  artifacts: tasksContent
    ? {
        tasks: {
          exists: true,
          content: tasksContent,
        },
      }
    : undefined,
});

// Sample tasks.md content with parallel markers
const TASKS_WITH_PARALLEL = `# Tasks

## Implementation Tasks

- [ ] 1. (P) First parallel task
- [ ] 2. (P) Second parallel task
- [ ] 3. Sequential task
- [ ] 4. (P) Third parallel task
`;

const TASKS_WITHOUT_PARALLEL = `# Tasks

## Implementation Tasks

- [ ] 1. First task
- [ ] 2. Second task
- [ ] 3. Third task
`;

// =============================================================================
// Tests
// =============================================================================

describe('useRemoteWorkflowState', () => {
  beforeEach(() => {
    resetParallelModeStore();
    vi.clearAllMocks();
  });

  describe('parallel task parsing', () => {
    it('should parse tasks.md content and store parallel task info', async () => {
      const specName = 'test-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITH_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Wait for useEffect to run
      await waitFor(() => {
        const store = getParallelModeStore();
        const result = store.getParseResult(specName);
        expect(result).not.toBeNull();
      });

      const store = getParallelModeStore();
      const result = store.getParseResult(specName);

      expect(result).not.toBeNull();
      expect(result!.parallelTasks).toBe(3); // 3 tasks with (P) marker
      expect(result!.totalTasks).toBe(4); // 4 total tasks
    });

    it('should not parse when tasks.content is not available', async () => {
      const specName = 'no-tasks-feature';
      const specDetail = createMockSpecDetail(specName); // No tasks content
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Give time for any potential useEffect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const store = getParallelModeStore();
      const result = store.getParseResult(specName);

      expect(result).toBeNull();
    });

    it('should not re-parse when result is already cached', async () => {
      const specName = 'cached-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITH_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      // Pre-populate cache with different values
      const store = getParallelModeStore();
      store.setParseResult(specName, {
        groups: [],
        totalTasks: 999,
        parallelTasks: 888,
      });

      renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Give time for useEffect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should still have the cached values, not re-parsed
      const result = store.getParseResult(specName);
      expect(result!.totalTasks).toBe(999);
      expect(result!.parallelTasks).toBe(888);
    });

    it('should correctly identify specs with no parallel tasks', async () => {
      const specName = 'sequential-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITHOUT_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      await waitFor(() => {
        const store = getParallelModeStore();
        const result = store.getParseResult(specName);
        expect(result).not.toBeNull();
      });

      const store = getParallelModeStore();
      const result = store.getParseResult(specName);

      expect(result!.parallelTasks).toBe(0);
      expect(result!.totalTasks).toBe(3);
      expect(store.hasParallelTasks(specName)).toBe(false);
    });

    it('should return hasParallelTasks=true when parallel tasks exist', async () => {
      const specName = 'parallel-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITH_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      const { result, rerender } = renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Wait for parse result to be stored
      await waitFor(() => {
        const store = getParallelModeStore();
        expect(store.getParseResult(specName)).not.toBeNull();
      });

      // Rerender to pick up the updated store state
      rerender();

      // Now check the hook state
      expect(result.current.state.hasParallelTasks).toBe(true);
      expect(result.current.state.parallelTaskCount).toBe(3);
    });

    it('should return hasParallelTasks=false when no parallel tasks', async () => {
      const specName = 'no-parallel-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITHOUT_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      const { result } = renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      await waitFor(() => {
        const store = getParallelModeStore();
        expect(store.getParseResult(specName)).not.toBeNull();
      });

      expect(result.current.state.hasParallelTasks).toBe(false);
      expect(result.current.state.parallelTaskCount).toBe(0);
    });
  });

  describe('parallel mode toggle', () => {
    it('should toggle parallel mode via handler', async () => {
      const specName = 'toggle-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITH_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      const { result } = renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Initially false
      expect(result.current.state.parallelModeEnabled).toBe(false);

      // Toggle on
      act(() => {
        result.current.handlers.handleToggleParallelMode();
      });

      expect(result.current.state.parallelModeEnabled).toBe(true);

      // Toggle off
      act(() => {
        result.current.handlers.handleToggleParallelMode();
      });

      expect(result.current.state.parallelModeEnabled).toBe(false);
    });
  });

  // auto-execution-ssot: Tests for handleToggleAutoPermission
  describe('auto execution permission toggle (SSOT)', () => {
    it('should call updateSpecJson when toggling auto permission', async () => {
      const specName = 'auto-permission-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITHOUT_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      const { result } = renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Toggle requirements permission
      await act(async () => {
        await result.current.handlers.handleToggleAutoPermission('requirements');
      });

      // Should call updateSpecJson with the toggled permission
      expect(apiClient.updateSpecJson).toHaveBeenCalledWith(specName, {
        autoExecution: expect.objectContaining({
          permissions: expect.objectContaining({
            requirements: false, // Default is true, toggled to false
          }),
        }),
      });
    });

    it('should not call updateSpecJson when apiClient.updateSpecJson is not available', async () => {
      const specName = 'no-update-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITHOUT_PARALLEL);
      // Create apiClient without updateSpecJson
      const apiClient = {
        ...createMockApiClient(specDetail),
        updateSpecJson: undefined,
      } as unknown as ApiClient;
      const spec = createMockSpec(specName);

      const { result } = renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Should not throw when toggling
      await act(async () => {
        await result.current.handlers.handleToggleAutoPermission('requirements');
      });

      // No error should occur
    });

    it('should toggle document-review permission via handleDocumentReviewAutoExecutionFlagChange', async () => {
      const specName = 'doc-review-toggle-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITHOUT_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      const { result } = renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Toggle via document review flag change handler
      await act(async () => {
        await result.current.handlers.handleDocumentReviewAutoExecutionFlagChange('pause');
      });

      // Should call updateSpecJson with document-review toggled
      expect(apiClient.updateSpecJson).toHaveBeenCalledWith(specName, {
        autoExecution: expect.objectContaining({
          permissions: expect.objectContaining({
            'document-review': false, // Default is true, toggled to false
          }),
        }),
      });
    });

    it('should toggle inspection permission via handleToggleInspectionAutoPermission', async () => {
      const specName = 'inspection-toggle-feature';
      const specDetail = createMockSpecDetail(specName, TASKS_WITHOUT_PARALLEL);
      const apiClient = createMockApiClient(specDetail);
      const spec = createMockSpec(specName);

      const { result } = renderHook(() =>
        useRemoteWorkflowState({
          apiClient,
          spec,
          initialSpecDetail: specDetail,
        })
      );

      // Toggle via inspection permission handler
      await act(async () => {
        await result.current.handlers.handleToggleInspectionAutoPermission();
      });

      // Should call updateSpecJson with inspection toggled
      expect(apiClient.updateSpecJson).toHaveBeenCalledWith(specName, {
        autoExecution: expect.objectContaining({
          permissions: expect.objectContaining({
            inspection: false, // Default is true, toggled to false
          }),
        }),
      });
    });
  });
});
