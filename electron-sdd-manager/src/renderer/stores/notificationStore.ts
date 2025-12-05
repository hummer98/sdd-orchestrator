/**
 * Notification Store
 * Manages toast notifications
 * Requirements: 10.1-10.5, 5.2-5.4 (workflow-auto-execution)
 */

import { create } from 'zustand';
import type { Notification } from '../types';
import type { ExecutionSummary } from './workflowStore';

const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 5;
const COMPLETION_SUMMARY_DURATION = 10000;

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
export const notify = {
  success: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      message,
      action,
    });
  },

  error: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      message,
      action,
      duration: 8000, // Errors stay longer
    });
  },

  warning: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      message,
      action,
    });
  },

  info: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      message,
      action,
    });
  },

  // Task 2.2: Completion summary notification
  showCompletionSummary: (summary: ExecutionSummary) => {
    const phaseCount = summary.executedPhases.length;
    const validationCount = summary.executedValidations.length;
    const durationSeconds = Math.round(summary.totalDuration / 1000);
    const hasErrors = summary.errors.length > 0;

    let message = `自動実行完了: ${phaseCount}フェーズ`;
    if (validationCount > 0) {
      message += `, ${validationCount}バリデーション`;
    }
    message += ` (${durationSeconds}秒)`;

    if (hasErrors) {
      message += ` - ${summary.errors.length}件のエラー`;
    }

    useNotificationStore.getState().addNotification({
      type: hasErrors ? 'warning' : 'success',
      message,
      duration: COMPLETION_SUMMARY_DURATION,
    });
  },
};
