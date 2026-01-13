/**
 * Notification Store
 * Manages toast notifications
 * Requirements: 10.1-10.5, 5.2-5.4 (workflow-auto-execution)
 * renderer-error-logging feature: Added auto-context logging to main process
 */

import { create } from 'zustand';
import type { Notification } from '../types';
import type { ExecutionSummary } from './workflowStore';
import { useSpecDetailStore } from './spec/specDetailStore';
import { useBugStore } from './bugStore';

const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 5;
const COMPLETION_SUMMARY_DURATION = 10000;

/**
 * Get auto-context from stores for logging
 * renderer-error-logging feature
 */
function getAutoContext(): Record<string, unknown> {
  const specDetail = useSpecDetailStore.getState().specDetail;
  const selectedBug = useBugStore.getState().selectedBug;

  const context: Record<string, unknown> = {};

  if (specDetail?.metadata?.name) {
    context.specId = specDetail.metadata.name;
  }
  if (selectedBug?.name) {
    context.bugName = selectedBug.name;
  }

  return context;
}

/**
 * Send log to main process via IPC
 * renderer-error-logging feature
 */
function logToMain(level: 'error' | 'warn' | 'info' | 'debug', message: string): void {
  // Guard for test environment where electronAPI may not exist
  if (typeof window !== 'undefined' && window.electronAPI?.logRenderer) {
    const context = getAutoContext();
    window.electronAPI.logRenderer(level, message, context);
  }
}

interface NotificationState {
  notifications: Notification[];
}

interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  notifications: [],

  // Actions
  addNotification: (notification: Omit<Notification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = notification.duration ?? DEFAULT_DURATION;

    const newNotification: Notification = {
      ...notification,
      id,
      duration,
    };

    set((state) => {
      // Task 2.1: Limit notifications to max 5
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

// Helper functions for common notifications
// renderer-error-logging feature: Each function logs to main process
export const notify = {
  success: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      message,
      action,
    });
    // Log to main process
    logToMain('info', message);
  },

  error: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      message,
      action,
      duration: 8000, // Errors stay longer
    });
    // Log to main process
    logToMain('error', message);
  },

  warning: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      message,
      action,
    });
    // Log to main process
    logToMain('warn', message);
  },

  info: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      message,
      action,
    });
    // Log to main process
    logToMain('info', message);
  },

  // Task 2.2: Completion summary notification
  showCompletionSummary: (summary: ExecutionSummary) => {
    const phaseCount = summary.executedPhases.length;
    const durationSeconds = Math.round(summary.totalDuration / 1000);
    const hasErrors = summary.errors.length > 0;

    let message = `自動実行完了: ${phaseCount}フェーズ (${durationSeconds}秒)`;

    if (hasErrors) {
      message += ` - ${summary.errors.length}件のエラー`;
    }

    useNotificationStore.getState().addNotification({
      type: hasErrors ? 'warning' : 'success',
      message,
      duration: COMPLETION_SUMMARY_DURATION,
    });
    // Log to main process
    logToMain(hasErrors ? 'warn' : 'info', message);
  },
};
