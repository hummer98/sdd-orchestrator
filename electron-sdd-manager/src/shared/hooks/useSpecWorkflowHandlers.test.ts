/**
 * useSpecWorkflowHandlers Hook Tests
 * TDD: Testing spec workflow handlers
 *
 * auto-execution-projectpath-fix Task 4.5:
 * Requirements: 4.3 - Renderer側store/hookでprojectPath取得・送信
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpecWorkflowHandlers } from './useSpecWorkflowHandlers';
import type { ISpecWorkflowApi } from '@shared/api/ISpecWorkflowApi';
import type { SpecDetail, AutoExecutionOptions } from '@shared/api/types';

// ============================================================
// auto-execution-projectpath-fix Task 4.5: projectPath parameter
// Requirements: 4.3 - Renderer側store/hookでprojectPath取得・送信
// ============================================================

describe('useSpecWorkflowHandlers projectPath handling (Task 4.5)', () => {
  // Mock API
  const mockStartAutoExecution = vi.fn();
  const mockStopAutoExecution = vi.fn();

  const mockApi: ISpecWorkflowApi = {
    executePhase: vi.fn(),
    updateApproval: vi.fn(),
    executeDocumentReview: vi.fn(),
    executeInspection: vi.fn(),
    startAutoExecution: mockStartAutoExecution,
    stopAutoExecution: mockStopAutoExecution,
    getSpecDetail: vi.fn(),
  };

  const mockSpecDetail: SpecDetail = {
    metadata: {
      name: 'test-feature',
      path: '/project/.kiro/specs/test-feature',
      phase: 'design-approved',
      updatedAt: '2026-01-25T00:00:00Z',
      approvals: {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: false, approved: false },
      },
    },
    specJson: {
      feature_name: 'test-feature',
      created_at: '2026-01-25T00:00:00Z',
      updated_at: '2026-01-25T00:00:00Z',
      language: 'ja',
      phase: 'design-approved',
      approvals: {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: false, approved: false },
      },
    },
    artifacts: {
      requirements: null,
      design: null,
      tasks: null,
      research: null,
      inspection: null,
    },
    taskProgress: null,
    parallelTaskInfo: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartAutoExecution.mockResolvedValue({ ok: true, value: {} });
    mockStopAutoExecution.mockResolvedValue({ ok: true, value: undefined });
  });

  describe('handleStartAutoExecution', () => {
    it('should pass projectPath to api.startAutoExecution', async () => {
      const testProjectPath = '/test/project';
      const testSpecPath = '/test/project/.kiro/specs/test-feature';

      const { result } = renderHook(() =>
        useSpecWorkflowHandlers({
          api: mockApi,
          specDetail: mockSpecDetail,
          specPath: testSpecPath,
          projectPath: testProjectPath,
        })
      );

      const testOptions: AutoExecutionOptions = {
        permissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: false,
          deploy: false,
        },
        documentReviewFlag: 'pause',
      };

      await act(async () => {
        await result.current.handleStartAutoExecution(testOptions);
      });

      // Verify that startAutoExecution was called with projectPath as first arg
      expect(mockStartAutoExecution).toHaveBeenCalledTimes(1);
      expect(mockStartAutoExecution).toHaveBeenCalledWith(
        testProjectPath,
        testSpecPath,
        'test-feature',
        testOptions
      );
    });

    it('should pass correct projectPath in worktree scenario', async () => {
      // Simulate worktree scenario where specPath is inside worktree
      const mainRepoPath = '/main/repository';
      const worktreeSpecPath = '/main/repository/.kiro/worktrees/specs/feature/.kiro/specs/feature';

      const { result } = renderHook(() =>
        useSpecWorkflowHandlers({
          api: mockApi,
          specDetail: {
            ...mockSpecDetail,
            metadata: {
              ...mockSpecDetail.metadata,
              name: 'feature',
              path: worktreeSpecPath,
            },
          },
          specPath: worktreeSpecPath,
          projectPath: mainRepoPath,
        })
      );

      await act(async () => {
        await result.current.handleStartAutoExecution({
          permissions: {
            requirements: true,
            design: false,
            tasks: false,
            impl: false,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
        });
      });

      // The projectPath should be the main repository, not worktree path
      expect(mockStartAutoExecution).toHaveBeenCalledWith(
        mainRepoPath,
        worktreeSpecPath,
        'feature',
        expect.any(Object)
      );
    });

    it('should not call api when specDetail is null', async () => {
      const { result } = renderHook(() =>
        useSpecWorkflowHandlers({
          api: mockApi,
          specDetail: null,
          specPath: '/test/path',
          projectPath: '/test/project',
        })
      );

      await act(async () => {
        await result.current.handleStartAutoExecution({
          permissions: {
            requirements: true,
            design: false,
            tasks: false,
            impl: false,
            inspection: false,
            deploy: false,
          },
          documentReviewFlag: 'run',
        });
      });

      expect(mockStartAutoExecution).not.toHaveBeenCalled();
    });
  });
});
