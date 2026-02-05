/**
 * useIdleTimeSync Hook
 * Task 7.1: 定期的なアイドル時間のMain Processへの報告
 * Task 2.1, 2.2: オプションパラメータとSpec追跡優先度制御
 * Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3
 *
 * Renderer側で最終アクティビティ時刻をMain Processに定期同期するフック
 * - Spec追跡（HumanActivityTracker）とフォーカス追跡の優先度制御
 * - プロジェクト選択状態に応じた報告制御
 */

import { useEffect, useCallback, useRef } from 'react';
import { getHumanActivityTracker } from '../services/humanActivityTracker';
import { useWindowFocusTracker } from './useWindowFocusTracker';

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
// Types
// ============================================================

/**
 * useIdleTimeSyncのオプション
 * Task 2.1: optionsパラメータ追加
 */
export interface UseIdleTimeSyncOptions {
  /** プロジェクトパス。nullの場合は報告スキップ */
  projectPath: string | null;
}

// ============================================================
// Hook
// ============================================================

/**
 * Renderer側からMain Process側へアイドル時間を同期するフック
 * Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3
 *
 * 使用方法:
 * - App.tsxで呼び出し、projectPathをオプションとして渡す
 * - Spec追跡（HAT）が優先、フォーカス追跡はフォールバック
 */
export function useIdleTimeSync(options: UseIdleTimeSyncOptions): void {
  const { projectPath } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Task 1.1: useWindowFocusTrackerをフォールバックとして使用
  const focusTracker = useWindowFocusTracker();

  /**
   * Main ProcessにlastActivityTimeを報告
   * Task 2.2: Spec追跡とフォーカス追跡の優先度制御
   */
  const syncIdleTime = useCallback(async () => {
    try {
      // Requirement 1.2: projectPathがnullの場合は報告スキップ
      if (projectPath === null) {
        return;
      }

      const tracker = getHumanActivityTracker();

      // Requirement 3.1, 3.2: 優先度制御
      // HAT.isActive=true かつ lastActivityTime非nullの場合はSpec追跡の時刻を使用
      // それ以外の場合はフォーカス追跡の時刻を使用
      let lastActivityTime: number | null = null;

      if (tracker && tracker.isActive) {
        lastActivityTime = tracker.getLastActivityTime();
      }

      // HAT非アクティブまたはlastActivityTimeがnullの場合はフォールバック
      if (lastActivityTime === null) {
        lastActivityTime = focusTracker.getLastActivityTime();
      }

      // lastActivityTimeがnullの場合はスキップ
      if (lastActivityTime === null) {
        return;
      }

      // Requirement 4.2: 既存IPCチャネルを使用してMain Processに報告
      await window.electronAPI.reportIdleTime(lastActivityTime);
    } catch (error) {
      // Requirement 4.3: エラーはログに記録して続行（同期失敗は致命的ではない）
      console.error('[useIdleTimeSync] Failed to sync idle time:', error);
    }
  }, [projectPath, focusTracker]);

  useEffect(() => {
    // Requirement 1.2: projectPathがnullの場合は同期しない
    if (projectPath === null) {
      return;
    }

    // Requirement 4.1: 初回同期（マウント時）
    syncIdleTime();

    // Requirement 4.1: 10秒間隔での定期同期
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
  }, [projectPath, syncIdleTime]);
}
