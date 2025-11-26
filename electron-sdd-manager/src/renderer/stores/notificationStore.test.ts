/**
 * Notification Store Tests
 * TDD: Testing notification state management
 * Requirements: 10.1-10.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store state
    useNotificationStore.setState({
      notifications: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addNotification', () => {
    it('should add success notification', () => {
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'Operation successful',
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');
      expect(state.notifications[0].message).toBe('Operation successful');
    });

    it('should add error notification', () => {
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Operation failed',
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('error');
    });

    it('should add warning notification', () => {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        message: 'Warning message',
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].type).toBe('warning');
    });

    it('should add info notification', () => {
      useNotificationStore.getState().addNotification({
        type: 'info',
        message: 'Info message',
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].type).toBe('info');
    });

    it('should generate unique id for each notification', () => {
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'First',
      });
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'Second',
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].id).not.toBe(state.notifications[1].id);
    });

    it('should support notification with action', () => {
      const actionFn = vi.fn();
      useNotificationStore.getState().addNotification({
        type: 'info',
        message: 'Action message',
        action: {
          label: 'Click me',
          onClick: actionFn,
        },
      });

      const state = useNotificationStore.getState();
      expect(state.notifications[0].action).toBeDefined();
      expect(state.notifications[0].action?.label).toBe('Click me');
    });

    it('should auto-remove notification after duration', () => {
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'Auto remove',
        duration: 3000,
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      // Advance time by duration
      vi.advanceTimersByTime(3000);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('should use default duration when not specified', () => {
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'Default duration',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      // Default duration is 5000ms
      vi.advanceTimersByTime(5000);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('removeNotification', () => {
    it('should remove specific notification by id', () => {
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'First',
      });
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Second',
      });

      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().removeNotification(id);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].message).toBe('Second');
    });
  });

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'First',
      });
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Second',
      });

      useNotificationStore.getState().clearAll();

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(0);
    });
  });
});
