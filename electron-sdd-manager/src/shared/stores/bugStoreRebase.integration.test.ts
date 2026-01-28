/**
 * Bug Store Rebase Integration Tests
 * Task 10.3: Store統合テスト (Bug版)
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5 (worktree-rebase-from-main)
 *
 * Tests store integration for bug worktree: setIsRebasing, handleRebaseResult
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSharedBugStore, resetSharedBugStore } from './bugStore';

// Mock ApiClient
const createMockApiClient = () => ({
  getSpecs: vi.fn(),
  getSpecDetail: vi.fn(),
  executePhase: vi.fn(),
  updateApproval: vi.fn(),
  rebaseFromMain: vi.fn(),
  getBugs: vi.fn(),
  getBugDetail: vi.fn(),
  executeBugPhase: vi.fn(),
  getAgents: vi.fn(),
  stopAgent: vi.fn(),
  resumeAgent: vi.fn(),
  sendAgentInput: vi.fn(),
  getAgentLogs: vi.fn(),
  executeValidation: vi.fn(),
  executeDocumentReview: vi.fn(),
  executeInspection: vi.fn(),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  getAutoExecutionStatus: vi.fn(),
  saveFile: vi.fn(),
  onSpecsUpdated: vi.fn(() => () => {}),
  onBugsUpdated: vi.fn(() => () => {}),
  onAgentOutput: vi.fn(() => () => {}),
  onAgentStatusChange: vi.fn(() => () => {}),
  onAutoExecutionStatusChanged: vi.fn(() => () => {}),
});

// Mock notification store
const mockShowNotification = vi.fn();
vi.mock('./notificationStore', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({
      showNotification: mockShowNotification,
    })),
  },
}));

describe('Bug Store Rebase Integration Tests', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    resetSharedBugStore();
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 10.3a: setIsRebasing(true) → isRebasing=true確認 (Bug版)
  // ============================================================
  describe('Task 10.3a: setIsRebasing state management (Bug)', () => {
    it('should set isRebasing to true', () => {
      // RED: Test should fail initially
      const { result } = renderHook(() => useSharedBugStore());

      // GREEN: Set isRebasing to true
      act(() => {
        result.current.setIsRebasing(true);
      });

      // VERIFY: isRebasing should be true
      expect(result.current.isRebasing).toBe(true);
    });

    it('should set isRebasing to false', () => {
      // RED: Test should fail initially
      const { result } = renderHook(() => useSharedBugStore());

      // GREEN: Set isRebasing to true then false
      act(() => {
        result.current.setIsRebasing(true);
      });
      expect(result.current.isRebasing).toBe(true);

      act(() => {
        result.current.setIsRebasing(false);
      });

      // VERIFY: isRebasing should be false
      expect(result.current.isRebasing).toBe(false);
    });
  });

  // ============================================================
  // Task 10.3b: handleRebaseResult成功 (Bug版)
  // ============================================================
  describe('Task 10.3b: handleRebaseResult success scenario (Bug)', () => {
    it('should set isRebasing to false and show success notification on rebase success', () => {
      // RED: Test should fail initially
      const { result } = renderHook(() => useSharedBugStore());

      // GREEN: Set isRebasing to true, then handle success result
      act(() => {
        result.current.setIsRebasing(true);
      });
      expect(result.current.isRebasing).toBe(true);

      act(() => {
        result.current.handleRebaseResult({
          ok: true,
          value: { success: true },
        });
      });

      // VERIFY: isRebasing should be false and success notification shown
      expect(result.current.isRebasing).toBe(false);
      expect(mockShowNotification).toHaveBeenCalledWith({
        type: 'success',
        message: 'mainブランチの変更を取り込みました',
      });
    });

    it('should show info notification when already up to date', () => {
      // RED: Test should fail initially
      const { result } = renderHook(() => useSharedBugStore());

      // GREEN: Set isRebasing to true, then handle alreadyUpToDate result
      act(() => {
        result.current.setIsRebasing(true);
      });

      act(() => {
        result.current.handleRebaseResult({
          ok: true,
          value: { success: true, alreadyUpToDate: true },
        });
      });

      // VERIFY: isRebasing should be false and info notification shown
      expect(result.current.isRebasing).toBe(false);
      expect(mockShowNotification).toHaveBeenCalledWith({
        type: 'info',
        message: '既に最新です',
      });
    });
  });

  // ============================================================
  // Task 10.3c: handleRebaseResultエラー (Bug版)
  // ============================================================
  describe('Task 10.3c: handleRebaseResult error scenario (Bug)', () => {
    it('should set isRebasing to false and show conflict error notification', () => {
      // RED: Test should fail initially
      const { result } = renderHook(() => useSharedBugStore());

      // GREEN: Set isRebasing to true, then handle conflict error
      act(() => {
        result.current.setIsRebasing(true);
      });

      act(() => {
        result.current.handleRebaseResult({
          ok: false,
          error: {
            type: 'CONFLICT_RESOLUTION_FAILED',
            reason: 'max_retries_exceeded',
          },
        });
      });

      // VERIFY: isRebasing should be false and error notification shown
      expect(result.current.isRebasing).toBe(false);
      expect(mockShowNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'コンフリクトを解決できませんでした。手動で解決してください',
      });
    });

    it('should set isRebasing to false and show script not found error notification', () => {
      // RED: Test should fail initially
      const { result } = renderHook(() => useSharedBugStore());

      // GREEN: Set isRebasing to true, then handle script not found error
      act(() => {
        result.current.setIsRebasing(true);
      });

      act(() => {
        result.current.handleRebaseResult({
          ok: false,
          error: {
            type: 'SCRIPT_NOT_FOUND',
            message: 'rebase-worktree.sh not found',
          },
        });
      });

      // VERIFY: isRebasing should be false and error notification shown
      expect(result.current.isRebasing).toBe(false);
      expect(mockShowNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'スクリプトが見つかりません。commandsetを再インストールしてください',
      });
    });
  });
});
