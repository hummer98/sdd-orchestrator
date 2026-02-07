/**
 * useIdleTimeSync Hook
 * Task 7.1: 定期的なアイドル時間のMain Processへの報告
 * Task 2.1, 2.2: オプションパラメータとSpec追跡
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3
 *
 * Renderer側で最終アクティビティ時刻をMain Processに定期同期するフック
 * - HumanActivityTracker（HAT）によるUI操作追跡のみを使用
 * - ウィンドウフォーカスはアイドル判定に使用しない
 * - プロジェクト選択状態に応じた報告制御
 *
 * アイドル判定ポリシー:
 * - Spec選択中: UI操作（スクロール、クリック等）があればアクティブ
 * - Spec未選択時: アクティビティ時刻を報告しない → アイドルとして扱われる
 * - ウィンドウフォーカス: アイドル判定に影響しない
 */

import { useEffect, useCallback, useRef } from 'react';
import { getHumanActivityTracker } from '../services/humanActivityTracker';
// trpc-full-migration Task 10.6: Use tRPC vanilla client for reportIdleTime
import { getVanillaClient } from '../../shared/trpc/vanillaClient';

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
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3
 *
 * 使用方法:
 * - App.tsxで呼び出し、projectPathをオプションとして渡す
 * - HumanActivityTracker（HAT）のUI操作追跡のみを使用
 * - ウィンドウフォーカスはアイドル判定に影響しない
 */
export function useIdleTimeSync(options: UseIdleTimeSyncOptions): void {
  const { projectPath } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Main ProcessにlastActivityTimeを報告
   * HATのUI操作追跡のみを使用（ウィンドウフォーカスは使用しない）
   */
  const syncIdleTime = useCallback(async () => {
    try {
      // projectPathがnullの場合は報告スキップ
      if (projectPath === null) {
        return;
      }

      const tracker = getHumanActivityTracker();

      // HATからアクティビティ時刻を取得
      // HATが非アクティブ（Spec未選択）またはlastActivityTimeがnullの場合、
      // アクティビティ時刻を報告しない → Main Process側でアイドルとして扱われる
      let lastActivityTime: number | null = null;

      if (tracker && tracker.isActive) {
        lastActivityTime = tracker.getLastActivityTime();
      }

      // lastActivityTimeがnullの場合は報告スキップ
      // （Spec未選択時やアクティビティなし時はアイドルとして扱う）
      if (lastActivityTime === null) {
        return;
      }

      // trpc-full-migration Task 10.6: Use tRPC for reportIdleTime
      await getVanillaClient().schedule.reportIdleTime.mutate({ lastActivityTime });
    } catch (error) {
      // エラーはログに記録して続行（同期失敗は致命的ではない）
      console.error('[useIdleTimeSync] Failed to sync idle time:', error);
    }
  }, [projectPath]);

  useEffect(() => {
    // projectPathがnullの場合は同期しない
    if (projectPath === null) {
      return;
    }

    // 初回同期（マウント時）
    syncIdleTime();

    // 10秒間隔での定期同期
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
