/**
 * useLaunchingState Hook
 *
 * Provides optimistic UI state management for agent launch operations.
 * Handles launching state, timeout guard, and error handling.
 *
 * Requirements:
 * - 1.1: ボタンクリック時に即座にlaunching=true
 * - 1.2: IPC完了時にlaunching状態をfalseに戻す
 * - 1.4: IPCエラー時にlaunching状態をfalseに戻しエラー通知
 * - 2.1: 10秒タイムアウトタイマー開始
 * - 2.2: タイムアウト時にlaunching状態リセット+エラー通知
 * - 2.3: IPC正常完了時にタイムアウトタイマークリア
 * - 2.4: アンマウント時にタイムアウトタイマークリア
 * - 3.1: useLaunchingStateフック提供
 * - 3.2: wrapExecution関数で非同期関数ラップ
 * - 3.3: タイムアウト時間をオプションで設定可能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { notify } from '../../renderer/stores';

// =============================================================================
// Types
// =============================================================================

export interface UseLaunchingStateOptions {
  /** タイムアウト時間（ミリ秒）。デフォルト: 10000 */
  timeoutMs?: number;
  /** タイムアウト時のエラーメッセージ */
  timeoutMessage?: string;
}

export interface UseLaunchingStateReturn {
  /** 現在のlaunching状態 */
  launching: boolean;
  /** 非同期関数をラップしてlaunching状態を自動管理 */
  wrapExecution: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_TIMEOUT_MESSAGE = '操作がタイムアウトしました。再度お試しください。';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLaunchingState(
  options: UseLaunchingStateOptions = {}
): UseLaunchingStateReturn {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    timeoutMessage = DEFAULT_TIMEOUT_MESSAGE,
  } = options;

  const [launching, setLaunching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTimedOutRef = useRef(false);

  // Cleanup timeout on unmount (Requirement 2.4)
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const wrapExecution = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      // Reset timeout flag
      isTimedOutRef.current = false;

      // Set launching state immediately (Requirement 1.1)
      setLaunching(true);

      // Start timeout timer (Requirement 2.1)
      timeoutRef.current = setTimeout(() => {
        isTimedOutRef.current = true;
        setLaunching(false);
        notify.error(timeoutMessage); // Requirement 2.2
        timeoutRef.current = null;
      }, timeoutMs);

      try {
        const result = await fn();

        // Clear timeout on success (Requirement 2.3)
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Only update state if not already timed out
        if (!isTimedOutRef.current) {
          setLaunching(false); // Requirement 1.2
        }

        return result;
      } catch (error) {
        // Clear timeout on error
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Only update state if not already timed out
        if (!isTimedOutRef.current) {
          setLaunching(false); // Requirement 1.4
          // Notify error (Requirement 1.4)
          const message =
            error instanceof Error ? error.message : 'エラーが発生しました';
          notify.error(message);
        }

        return undefined;
      }
    },
    [timeoutMs, timeoutMessage]
  );

  return {
    launching,
    wrapExecution,
  };
}
