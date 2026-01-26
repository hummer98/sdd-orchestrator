/**
 * Remote Notification Store
 *
 * Task 1.1: RemoteNotificationStoreの作成
 * Requirements: 4.1 - notify.error()でエラートーストを表示
 *
 * Remote UI専用のZustand通知ストア。
 * Electron版のnotifyパターンに準拠した設計。
 *
 * 実装Notes:
 * - Design.md DD-003: Remote UI用通知システム
 * - rendererLoggerはRemote UIで使用不可のため、console.info/error/warnを使用
 */

import { create } from 'zustand';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 5;
const ERROR_DURATION = 8000;

// =============================================================================
// Types
// =============================================================================

export interface RemoteNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
}

interface RemoteNotificationState {
  notifications: RemoteNotification[];
}

interface RemoteNotificationActions {
  addNotification: (notification: Omit<RemoteNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export type RemoteNotificationStore = RemoteNotificationState & RemoteNotificationActions;

// =============================================================================
// Store
// =============================================================================

export const useRemoteNotificationStore = create<RemoteNotificationStore>((set, get) => ({
  // Initial state
  notifications: [],

  // Actions
  addNotification: (notification: Omit<RemoteNotification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = notification.duration ?? DEFAULT_DURATION;

    const newNotification: RemoteNotification = {
      ...notification,
      id,
      duration,
    };

    set((state) => {
      // Limit notifications to max 5
      const notifications = [...state.notifications, newNotification];
      if (notifications.length > MAX_NOTIFICATIONS) {
        notifications.shift(); // Remove oldest notification
      }
      return { notifications };
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Log notification to browser console
 * Design.md DD-003: Remote UIではrendererLoggerが使用不可のため、console APIを使用
 */
function logNotification(level: 'info' | 'error' | 'warn', message: string): void {
  const formattedMessage = `[notify] ${message}`;
  switch (level) {
    case 'error':
      console.error(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'info':
    default:
      console.info(formattedMessage);
      break;
  }
}

// =============================================================================
// remoteNotify Helper
// =============================================================================

/**
 * Remote UI notification helpers
 * Matches Electron版notifyパターンのAPI
 * Requirement 4.1: notify.error()でエラートーストを表示
 */
export const remoteNotify = {
  success: (message: string) => {
    useRemoteNotificationStore.getState().addNotification({
      type: 'success',
      message,
      duration: DEFAULT_DURATION,
    });
    logNotification('info', message);
  },

  error: (message: string) => {
    useRemoteNotificationStore.getState().addNotification({
      type: 'error',
      message,
      duration: ERROR_DURATION, // Errors stay longer
    });
    logNotification('error', message);
  },

  warning: (message: string) => {
    useRemoteNotificationStore.getState().addNotification({
      type: 'warning',
      message,
      duration: DEFAULT_DURATION,
    });
    logNotification('warn', message);
  },

  info: (message: string) => {
    useRemoteNotificationStore.getState().addNotification({
      type: 'info',
      message,
      duration: DEFAULT_DURATION,
    });
    logNotification('info', message);
  },
};

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for testing)
 */
export function resetRemoteNotificationStore(): void {
  useRemoteNotificationStore.setState({
    notifications: [],
  });
}
