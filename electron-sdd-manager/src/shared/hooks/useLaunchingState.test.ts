/**
 * Tests for useLaunchingState hook
 *
 * TDD: RED Phase - Write failing tests first
 * Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLaunchingState } from './useLaunchingState';

// Mock notify
vi.mock('../../renderer/stores', () => ({
  notify: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useLaunchingState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =============================================================================
  // Requirement 3.1: useLaunchingStateフック提供
  // =============================================================================
  describe('hook structure', () => {
    it('should return launching state and wrapExecution function', () => {
      const { result } = renderHook(() => useLaunchingState());

      expect(result.current.launching).toBe(false);
      expect(typeof result.current.wrapExecution).toBe('function');
    });

    it('should have launching=false as initial state', () => {
      const { result } = renderHook(() => useLaunchingState());

      expect(result.current.launching).toBe(false);
    });
  });

  // =============================================================================
  // Requirement 1.1: ボタンクリック時に即座にlaunching=true
  // Requirement 3.2: wrapExecution関数で非同期関数ラップ
  // =============================================================================
  describe('wrapExecution - launching state management', () => {
    it('should set launching=true immediately when wrapExecution is called', async () => {
      const { result } = renderHook(() => useLaunchingState());

      // Create a promise that won't resolve immediately
      let resolvePromise: () => void;
      const asyncFn = () => new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      // Start execution
      act(() => {
        result.current.wrapExecution(asyncFn);
      });

      // launching should be true immediately (before promise resolves)
      expect(result.current.launching).toBe(true);

      // Cleanup
      await act(async () => {
        resolvePromise!();
      });
    });

    // Requirement 1.2: IPC完了時にlaunching状態をfalseに戻す
    it('should set launching=false when async function completes successfully', async () => {
      const { result } = renderHook(() => useLaunchingState());
      const asyncFn = vi.fn().mockResolvedValue('success');

      await act(async () => {
        await result.current.wrapExecution(asyncFn);
      });

      expect(result.current.launching).toBe(false);
      expect(asyncFn).toHaveBeenCalled();
    });

    it('should return the result of the async function', async () => {
      const { result } = renderHook(() => useLaunchingState());
      const asyncFn = vi.fn().mockResolvedValue('test-result');

      let returnValue: string | undefined;
      await act(async () => {
        returnValue = await result.current.wrapExecution(asyncFn);
      });

      expect(returnValue).toBe('test-result');
    });
  });

  // =============================================================================
  // Requirement 1.4: IPCエラー時にlaunching状態をfalseに戻しエラー通知
  // =============================================================================
  describe('wrapExecution - error handling', () => {
    it('should set launching=false when async function throws an error', async () => {
      const { result } = renderHook(() => useLaunchingState());
      const asyncFn = vi.fn().mockRejectedValue(new Error('Test error'));

      await act(async () => {
        await result.current.wrapExecution(asyncFn);
      });

      expect(result.current.launching).toBe(false);
    });

    it('should call notify.error when async function throws an error', async () => {
      const { notify } = await import('../../renderer/stores');
      const { result } = renderHook(() => useLaunchingState());
      const asyncFn = vi.fn().mockRejectedValue(new Error('Test error message'));

      await act(async () => {
        await result.current.wrapExecution(asyncFn);
      });

      expect(notify.error).toHaveBeenCalledWith('Test error message');
    });

    it('should return undefined when async function throws an error', async () => {
      const { result } = renderHook(() => useLaunchingState());
      const asyncFn = vi.fn().mockRejectedValue(new Error('Test error'));

      let returnValue: unknown = 'not-undefined';
      await act(async () => {
        returnValue = await result.current.wrapExecution(asyncFn);
      });

      expect(returnValue).toBeUndefined();
    });
  });

  // =============================================================================
  // Requirement 2.1: 10秒タイムアウトタイマー開始
  // Requirement 2.2: タイムアウト時にlaunching状態リセット+エラー通知
  // Requirement 3.3: タイムアウト時間をオプションで設定可能
  // =============================================================================
  describe('wrapExecution - timeout handling', () => {
    it('should use default timeout of 10000ms', async () => {
      const { notify } = await import('../../renderer/stores');
      const { result } = renderHook(() => useLaunchingState());

      // Create a promise that never resolves
      const asyncFn = () => new Promise<void>(() => {});

      act(() => {
        result.current.wrapExecution(asyncFn);
      });

      expect(result.current.launching).toBe(true);

      // Advance time by 9.9 seconds - should still be launching
      act(() => {
        vi.advanceTimersByTime(9900);
      });
      expect(result.current.launching).toBe(true);

      // Advance past 10 seconds - should timeout
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current.launching).toBe(false);
      expect(notify.error).toHaveBeenCalled();
    });

    it('should use custom timeout when provided', async () => {
      const { notify } = await import('../../renderer/stores');
      const { result } = renderHook(() =>
        useLaunchingState({ timeoutMs: 5000 })
      );

      const asyncFn = () => new Promise<void>(() => {});

      act(() => {
        result.current.wrapExecution(asyncFn);
      });

      // Advance by 4.9 seconds - should still be launching
      act(() => {
        vi.advanceTimersByTime(4900);
      });
      expect(result.current.launching).toBe(true);

      // Advance past 5 seconds - should timeout
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current.launching).toBe(false);
      expect(notify.error).toHaveBeenCalled();
    });

    it('should display default timeout message', async () => {
      const { notify } = await import('../../renderer/stores');
      const { result } = renderHook(() => useLaunchingState());

      const asyncFn = () => new Promise<void>(() => {});

      act(() => {
        result.current.wrapExecution(asyncFn);
      });

      act(() => {
        vi.advanceTimersByTime(10100);
      });

      expect(notify.error).toHaveBeenCalledWith(
        '操作がタイムアウトしました。再度お試しください。'
      );
    });

    it('should display custom timeout message when provided', async () => {
      const { notify } = await import('../../renderer/stores');
      const { result } = renderHook(() =>
        useLaunchingState({ timeoutMessage: 'カスタムタイムアウトメッセージ' })
      );

      const asyncFn = () => new Promise<void>(() => {});

      act(() => {
        result.current.wrapExecution(asyncFn);
      });

      act(() => {
        vi.advanceTimersByTime(10100);
      });

      expect(notify.error).toHaveBeenCalledWith('カスタムタイムアウトメッセージ');
    });

    // Requirement 2.3: IPC正常完了時にタイムアウトタイマークリア
    it('should clear timeout when async function completes successfully', async () => {
      const { notify } = await import('../../renderer/stores');
      const { result } = renderHook(() => useLaunchingState());

      const asyncFn = vi.fn().mockResolvedValue('success');

      await act(async () => {
        await result.current.wrapExecution(asyncFn);
      });

      // Advance past timeout - should not trigger timeout error
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // notify.error should NOT have been called with timeout message
      expect(notify.error).not.toHaveBeenCalledWith(
        expect.stringContaining('タイムアウト')
      );
    });

    it('should clear timeout when async function throws an error', async () => {
      const { notify } = await import('../../renderer/stores');
      vi.clearAllMocks();

      const { result } = renderHook(() => useLaunchingState());
      const asyncFn = vi.fn().mockRejectedValue(new Error('Test error'));

      await act(async () => {
        await result.current.wrapExecution(asyncFn);
      });

      // notify.error should have been called with the error message
      expect(notify.error).toHaveBeenCalledWith('Test error');

      vi.clearAllMocks();

      // Advance past timeout - should not trigger additional timeout error
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(notify.error).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Requirement 2.4: アンマウント時にタイムアウトタイマークリア
  // =============================================================================
  describe('cleanup on unmount', () => {
    it('should clear timeout timer when component unmounts', async () => {
      const { notify } = await import('../../renderer/stores');
      const { result, unmount } = renderHook(() => useLaunchingState());

      const asyncFn = () => new Promise<void>(() => {});

      act(() => {
        result.current.wrapExecution(asyncFn);
      });

      expect(result.current.launching).toBe(true);

      // Unmount the hook
      unmount();

      // Advance past timeout
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // notify.error should NOT have been called (timer was cleared)
      expect(notify.error).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Multiple executions
  // =============================================================================
  describe('multiple executions', () => {
    it('should handle sequential executions correctly', async () => {
      const { result } = renderHook(() => useLaunchingState());

      // First execution
      await act(async () => {
        await result.current.wrapExecution(async () => 'first');
      });
      expect(result.current.launching).toBe(false);

      // Second execution
      await act(async () => {
        await result.current.wrapExecution(async () => 'second');
      });
      expect(result.current.launching).toBe(false);
    });
  });
});
