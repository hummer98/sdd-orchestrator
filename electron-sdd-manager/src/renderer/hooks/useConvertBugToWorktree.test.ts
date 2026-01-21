/**
 * useConvertBugToWorktree Hook Tests
 * bugs-workflow-footer: Task 5.1
 * Requirements: 7.1-7.7, 8.1-8.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConvertBugToWorktree } from './useConvertBugToWorktree';

// Mock window.electronAPI
const mockWorktreeCheckMain = vi.fn();
const mockConvertBugToWorktree = vi.fn();

// Mock stores
vi.mock('../stores', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useProjectStore: (selector: (state: { currentProject: string }) => string) =>
    selector({ currentProject: '/test/project/path' }),
}));

// Import after mock to get the mocked version
import { notify, useProjectStore } from '../stores';

describe('useConvertBugToWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup window.electronAPI mock
    (window as unknown as { electronAPI: unknown }).electronAPI = {
      worktreeCheckMain: mockWorktreeCheckMain,
      convertBugToWorktree: mockConvertBugToWorktree,
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isOnMain state', () => {
    it('should initialize isOnMain as false', () => {
      // Requirements: 8.3
      const { result } = renderHook(() => useConvertBugToWorktree());
      expect(result.current.isOnMain).toBe(false);
    });

    it('should set isOnMain to true when on main branch', async () => {
      // Requirements: 8.4
      mockWorktreeCheckMain.mockResolvedValue({ ok: true, value: { isMain: true } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(result.current.isOnMain).toBe(true);
    });

    it('should set isOnMain to false when not on main branch', async () => {
      // Requirements: 8.4
      mockWorktreeCheckMain.mockResolvedValue({ ok: true, value: { isMain: false } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(result.current.isOnMain).toBe(false);
    });
  });

  describe('isConverting state', () => {
    it('should initialize isConverting as false', () => {
      // Requirements: 7.2
      const { result } = renderHook(() => useConvertBugToWorktree());
      expect(result.current.isConverting).toBe(false);
    });

    it('should set isConverting to true during conversion', async () => {
      // Requirements: 7.2
      mockConvertBugToWorktree.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, value: {} }), 100))
      );

      const { result } = renderHook(() => useConvertBugToWorktree());

      let convertPromise: Promise<boolean>;
      act(() => {
        convertPromise = result.current.handleConvert('test-bug');
      });

      // Check isConverting is true during conversion
      expect(result.current.isConverting).toBe(true);

      // Wait for conversion to complete
      await act(async () => {
        await convertPromise;
      });
    });

    it('should set isConverting to false after conversion', async () => {
      // Requirements: 7.7
      mockConvertBugToWorktree.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(result.current.isConverting).toBe(false);
    });

    it('should set isConverting to false even on error', async () => {
      // Requirements: 7.7
      mockConvertBugToWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', message: 'Not on main branch' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(result.current.isConverting).toBe(false);
    });
  });

  describe('handleConvert', () => {
    it('should call convertBugToWorktree with bugName', async () => {
      // Requirements: 7.4
      mockConvertBugToWorktree.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('my-bug');
      });

      expect(mockConvertBugToWorktree).toHaveBeenCalledWith('my-bug');
    });

    it('should show success notification on success', async () => {
      // Requirements: 7.5
      mockConvertBugToWorktree.mockResolvedValue({
        ok: true,
        value: { path: '.kiro/worktrees/bugs/test', branch: 'bugfix/test', created_at: '2024-01-01' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(notify.success).toHaveBeenCalled();
    });

    it('should show error notification on failure', async () => {
      // Requirements: 7.6
      mockConvertBugToWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', message: 'Not on main branch' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(notify.error).toHaveBeenCalled();
    });

    it('should return true on success', async () => {
      mockConvertBugToWorktree.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertBugToWorktree());

      let success: boolean;
      await act(async () => {
        success = await result.current.handleConvert('test-bug');
      });

      expect(success!).toBe(true);
    });

    it('should return false on failure', async () => {
      mockConvertBugToWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'BUG_NOT_FOUND', message: 'Bug not found' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      let success: boolean;
      await act(async () => {
        success = await result.current.handleConvert('test-bug');
      });

      expect(success!).toBe(false);
    });
  });

  describe('refreshMainBranchStatus', () => {
    it('should call worktreeCheckMain IPC', async () => {
      // Requirements: 8.1, 8.2
      mockWorktreeCheckMain.mockResolvedValue({ ok: true, value: { isMain: true } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(mockWorktreeCheckMain).toHaveBeenCalled();
    });

    it('should handle IPC error gracefully', async () => {
      mockWorktreeCheckMain.mockResolvedValue({ ok: false, error: { type: 'GIT_ERROR' } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      // Should remain false on error
      expect(result.current.isOnMain).toBe(false);
    });
  });
});
