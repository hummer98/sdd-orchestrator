/**
 * Notification Store
 * Manages toast notifications
 * Requirements: 10.1-10.5
 */

import { create } from 'zustand';
import type { Notification } from '../types';

const DEFAULT_DURATION = 5000;

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

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

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
};
