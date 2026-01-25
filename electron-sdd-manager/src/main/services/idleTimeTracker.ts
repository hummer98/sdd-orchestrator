/**
 * IdleTimeTracker
 * Task 7.1: Main Process側でのアイドル時間計算
 * Requirements: 4.3 (アイドル検出時キュー追加 - ScheduleTaskCoordinatorとの統合)
 *
 * Main Process側でRenderer側から報告される最終アクティビティ時刻を保持し、
 * アイドル時間（ミリ秒）を計算するサービス
 *
 * 設計原則:
 * - Main ProcessがSSoT（Single Source of Truth）
 * - Renderer側は定期的にlastActivityTimeを報告
 * - ScheduleTaskCoordinatorのgetIdleTimeMsに統合
 */

// ============================================================
// Types
// ============================================================

/**
 * IdleTimeTracker インタフェース
 * Main Process側でアイドル時間を追跡
 */
export interface IdleTimeTracker {
  /**
   * 最終アクティビティ時刻を設定
   * Renderer側からIPCで報告された時刻を記録
   * @param timestamp Unix timestamp in milliseconds
   */
  setLastActivityTime(timestamp: number): void;

  /**
   * 現在のアイドル時間を取得（ミリ秒）
   * @returns アイドル時間（ms）、未記録の場合は0
   */
  getIdleTimeMs(): number;
}

// ============================================================
// Implementation
// ============================================================

/**
 * IdleTimeTrackerの実装
 */
class IdleTimeTrackerImpl implements IdleTimeTracker {
  /** 最終アクティビティ時刻（Unix ms） */
  private lastActivityTime: number | null = null;

  /**
   * 最終アクティビティ時刻を設定
   * Requirements: 4.3 - Renderer側からの報告受信
   * @param timestamp Unix timestamp in milliseconds
   */
  setLastActivityTime(timestamp: number): void {
    // 既存のタイムスタンプより古い場合は無視（時刻巻き戻し防止）
    if (this.lastActivityTime !== null && timestamp < this.lastActivityTime) {
      return;
    }

    this.lastActivityTime = timestamp;
  }

  /**
   * 現在のアイドル時間を取得（ミリ秒）
   * Requirements: 4.3 - Main側でのアイドル時間計算
   * @returns アイドル時間（ms）、未記録の場合は0
   */
  getIdleTimeMs(): number {
    if (this.lastActivityTime === null) {
      // 未記録の場合は0を返す（アイドル時間不明）
      return 0;
    }

    const now = Date.now();
    const idleMs = now - this.lastActivityTime;

    // 負の値（未来のタイムスタンプ）は0として扱う
    return Math.max(0, idleMs);
  }
}

// ============================================================
// Singleton Instance
// ============================================================

/** シングルトンインスタンス */
let defaultTracker: IdleTimeTracker | null = null;

/**
 * 新しいIdleTimeTrackerインスタンスを作成
 * テスト用に個別インスタンスを作成する際に使用
 */
export function createIdleTimeTracker(): IdleTimeTracker {
  return new IdleTimeTrackerImpl();
}

/**
 * デフォルトのIdleTimeTrackerシングルトンを取得
 * アプリケーション全体で共有
 */
export function getDefaultIdleTimeTracker(): IdleTimeTracker {
  if (!defaultTracker) {
    defaultTracker = createIdleTimeTracker();
  }
  return defaultTracker;
}

/**
 * テスト用: シングルトンをリセット
 */
export function resetDefaultIdleTimeTracker(): void {
  defaultTracker = null;
}

// ============================================================
// Module-level Convenience Functions
// ============================================================

/**
 * 最終アクティビティ時刻を設定（モジュールレベル関数）
 * シングルトンインスタンスに対して操作
 * @param timestamp Unix timestamp in milliseconds
 */
export function setLastActivityTime(timestamp: number): void {
  getDefaultIdleTimeTracker().setLastActivityTime(timestamp);
}

/**
 * 現在のアイドル時間を取得（モジュールレベル関数）
 * シングルトンインスタンスから取得
 * @returns アイドル時間（ms）
 */
export function getIdleTimeMs(): number {
  return getDefaultIdleTimeTracker().getIdleTimeMs();
}
