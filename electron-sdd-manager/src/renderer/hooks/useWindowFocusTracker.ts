/**
 * useWindowFocusTracker Hook
 * Task 1.1: ウィンドウフォーカス状態を追跡するフック
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * ウィンドウフォーカス状態に基づく最終アクティビティ時刻追跡
 * - フォーカス取得時に現在時刻をlastActivityTimeとして記録
 * - フォーカス喪失時はlastActivityTimeを保持（更新しない）
 * - フォーカス中は10秒間隔でlastActivityTimeを更新
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// Constants
// ============================================================

/**
 * フォーカス中のアクティビティ時刻更新間隔: 10秒
 * - useIdleTimeSyncの同期間隔と同じ
 * - ScheduleTaskCoordinatorの1分間隔チェックより十分短い
 */
export const FOCUS_ACTIVITY_UPDATE_INTERVAL_MS = 10_000;

// ============================================================
// Types
// ============================================================

/**
 * useWindowFocusTrackerの戻り値型
 */
export interface UseWindowFocusTrackerReturn {
  /** 最終アクティビティ時刻（Unix ms）、未記録の場合null */
  getLastActivityTime(): number | null;
  /** ウィンドウがフォーカス中かどうか */
  isFocused(): boolean;
}

// ============================================================
// Hook
// ============================================================

/**
 * ウィンドウフォーカス状態に基づく最終アクティビティ時刻追跡フック
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * 使用方法:
 * - useIdleTimeSyncから呼び出し、Spec追跡のフォールバックとして使用
 */
export function useWindowFocusTracker(): UseWindowFocusTrackerReturn {
  // フォーカス状態
  const [focused, setFocused] = useState<boolean>(() => document.hasFocus());

  // 最終アクティビティ時刻
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(() =>
    document.hasFocus() ? Date.now() : null
  );

  // インターバルの参照
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * フォーカス取得時のハンドラ
   * Requirement 2.1: フォーカス取得時にlastActivityTime記録
   */
  const handleFocus = useCallback(() => {
    setFocused(true);
    setLastActivityTime(Date.now());
  }, []);

  /**
   * フォーカス喪失時のハンドラ
   * Requirement 2.2: フォーカス喪失時は値保持（更新しない）
   */
  const handleBlur = useCallback(() => {
    setFocused(false);
    // lastActivityTimeは保持（更新しない）
  }, []);

  // フォーカスイベントリスナーの設定
  useEffect(() => {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleFocus, handleBlur]);

  // Requirement 2.3: フォーカス中10秒間隔で更新
  useEffect(() => {
    if (focused) {
      // フォーカス中はインターバルを開始
      intervalRef.current = setInterval(() => {
        setLastActivityTime(Date.now());
      }, FOCUS_ACTIVITY_UPDATE_INTERVAL_MS);
    } else {
      // フォーカス外ではインターバルを停止
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // クリーンアップ
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [focused]);

  /**
   * 最終アクティビティ時刻を取得
   * Requirement 2.4: バックグラウンド時のアイドル計算に使用
   */
  const getLastActivityTime = useCallback((): number | null => {
    return lastActivityTime;
  }, [lastActivityTime]);

  /**
   * フォーカス状態を取得
   */
  const isFocused = useCallback((): boolean => {
    return focused;
  }, [focused]);

  return {
    getLastActivityTime,
    isFocused,
  };
}
