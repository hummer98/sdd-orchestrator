/**
 * GlobalEventBus - Main Process全体で共有されるEventBusシングルトン
 * Task 9.2: Renderer側のipcRenderer.onリスナーをtRPC Subscriptionに置換
 * Requirements: 8.3, 8.4
 *
 * 既存のBrowserWindow.webContents.send()呼び出し箇所から
 * このEventBusにもイベントを発火することで、
 * tRPC Subscriptionがイベントを受信できるようにする。
 *
 * tRPC Context（ctx.services.eventBus）にこのインスタンスを渡すことで、
 * eventsRouter内のSubscriptionがこのEventBusのイベントをリスンする。
 */
import { createEventBus, type EventBus } from './eventBus';

let globalEventBus: EventBus | null = null;

/**
 * グローバルEventBusシングルトンを取得する。
 * 初回呼び出し時にインスタンスを作成する（遅延初期化）。
 *
 * @returns EventBus instance shared across the entire Main process
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = createEventBus();
  }
  return globalEventBus;
}

/**
 * グローバルEventBusをリセットする（テスト用）。
 * 既存のリスナーは全て解除される。
 */
export function resetGlobalEventBus(): void {
  if (globalEventBus) {
    globalEventBus.removeAllListeners();
  }
  globalEventBus = null;
}
