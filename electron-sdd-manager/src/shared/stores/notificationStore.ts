/**
 * Shared Notification Store
 *
 * worktree-rebase-from-main Task 12.2, 12.3: Notification abstraction for shared stores
 *
 * This module provides a platform-agnostic notification interface.
 * The actual notification implementation is provided at runtime.
 *
 * In Electron: Uses renderer/stores/notificationStore (notify helpers)
 * In Remote UI: Uses remote-ui/stores/remoteNotificationStore
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export interface NotificationData {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface SharedNotificationState {
  // This store doesn't hold state, it's just an interface
}

export interface SharedNotificationActions {
  /**
   * Show a notification
   * The actual implementation is injected at runtime
   */
  showNotification: (notification: NotificationData) => void;
}

export type SharedNotificationStore = SharedNotificationState & SharedNotificationActions;

// =============================================================================
// Store
// =============================================================================

/**
 * Shared notification store
 *
 * By default, this is a no-op store. The actual notification behavior
 * should be configured by calling setNotificationHandler() at app initialization.
 *
 * Task 13.6: Removed unused set/get parameters to fix TypeScript warnings
 */
export const useNotificationStore = create<SharedNotificationStore>(() => ({
  // Default no-op implementation
  showNotification: (notification: NotificationData) => {
    // Log to console as fallback if no handler is configured
    console.log(`[Notification ${notification.type}] ${notification.message}`);
  },
}));

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configure the notification handler
 * Call this at app initialization to wire up the actual notification system
 *
 * @param handler - The notification handler function
 *
 * @example
 * // In Electron renderer:
 * import { notify } from '../renderer/stores/notificationStore';
 * setNotificationHandler((n) => {
 *   if (n.type === 'success') notify.success(n.message);
 *   else if (n.type === 'error') notify.error(n.message);
 *   else if (n.type === 'warning') notify.warning(n.message);
 *   else notify.info(n.message);
 * });
 */
export function setNotificationHandler(handler: (notification: NotificationData) => void): void {
  useNotificationStore.setState({ showNotification: handler });
}
