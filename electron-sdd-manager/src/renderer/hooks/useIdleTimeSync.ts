/**
 * useIdleTimeSync Hook
 * Task 7.1: 定期的なアイドル時間のMain Processへの報告
 * Requirements: 4.3 (アイドル検出時キュー追加)
 *
 * Renderer側で最終アクティビティ時刻をMain Processに定期同期するフック
 * humanActivityTrackerの最終アクティビティ時刻をMain Process側のidleTimeTrackerに同期
 */

import { useEffect, useCallback, useRef } from 'react';
import { getHumanActivityTracker } from '../services/humanActivityTracker';

// ============================================================
// Constants
// ============================================================

/**
 * 同期間隔: 10秒
 * - ScheduleTaskCoordinatorの1分間隔チェックより十分短い
 * - 頻繁すぎてIPCオーバーヘッドが問題にならない程度
 */
export const IDLE_SYNC_INTERVAL_MS = 10_000;

// ============================================================
// Hook
// ============================================================

/**
 * Renderer側からMain Process側へアイドル時間を同期するフック
 * Requirements: 4.3
 *
 * 使用方法:
 * - アプリのトップレベルコンポーネントで1回だけ呼び出す
 * - humanActivityTrackerが初期化された後に使用する
 */
export function useIdleTimeSync(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Main ProcessにlastActivityTimeを報告
   */
  const syncIdleTime = useCallback(async () => {
    try {
      const tracker = getHumanActivityTracker();

      // トラッカーが未初期化またはアクティブでない場合はスキップ
      if (!tracker || !tracker.isActive) {
        return;
      }

      const lastActivityTime = tracker.getLastActivityTime();

      // lastActivityTimeがnullの場合はスキップ
      if (lastActivityTime === null) {
        return;
      }

      // Main Processに報告
      await window.electronAPI.reportIdleTime(lastActivityTime);
    } catch (error) {
      // エラーはログに記録して続行（同期失敗は致命的ではない）
      console.error('[useIdleTimeSync] Failed to sync idle time:', error);
    }
  }, []);

  useEffect(() => {
    // 初回同期（マウント時）
    syncIdleTime();

    // 定期同期のセットアップ
    intervalRef.current = setInterval(() => {
      syncIdleTime();
    }, IDLE_SYNC_INTERVAL_MS);

    // クリーンアップ
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [syncIdleTime]);
}
