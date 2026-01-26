/**
 * RemoteNotificationStore Tests
 *
 * Task 1.1: RemoteNotificationStoreの作成
 * Requirements: 4.1 - notify.error()でエラートーストを表示
 *
 * Test coverage:
 * - success/error/warning/info通知タイプのサポート
 * - 通知の自動消去機能（duration指定）
 * - 最大表示数の制限機能
 * - remoteNotifyヘルパー関数
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useRemoteNotificationStore,
  resetRemoteNotificationStore,
  remoteNotify,
  type RemoteNotification,
} from './remoteNotificationStore';

describe('RemoteNotificationStore', () => {
  beforeEach(() => {
    resetRemoteNotificationStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have empty notifications by default', () => {
      const state = useRemoteNotificationStore.getState();
      expect(state.notifications).toEqual([]);
    });
  });

  describe('addNotification', () => {
    it('should add a notification to the store', () => {
      const store = useRemoteNotificationStore.getState();

      store.addNotification({
        type: 'success',
        message: 'Test success message',
      });

      const state = useRemoteNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');
      expect(state.notifications[0].message).toBe('Test success message');
      expect(state.notifications[0].id).toBeDefined();
    });

    it('should support all notification types', () => {
      const store = useRemoteNotificationStore.getState();
      const types: RemoteNotification['type'][] = ['success', 'error', 'warning', 'info'];

      types.forEach((type) => {
        store.addNotification({ type, message: `${type} message` });
      });

      const state = useRemoteNotificationStore.getState();
      expect(state.notifications).toHaveLength(4);
      types.forEach((type, index) => {
        expect(state.notifications[index].type).toBe(type);
      });
    });

    it('should use default duration when not specified', () => {
      const store = useRemoteNotificationStore.getState();

      store.addNotification({
        type: 'info',
        message: 'Test message',
      });

      const state = useRemoteNotificationStore.getState();
      expect(state.notifications[0].duration).toBe(5000);
    });

    it('should use custom duration when specified', () => {
      const store = useRemoteNotificationStore.getState();

      store.addNotification({
        type: 'info',
        message: 'Test message',
        duration: 10000,
      });

      const state = useRemoteNotificationStore.getState();
      expect(state.notifications[0].duration).toBe(10000);
    });
  });

  describe('Auto-removal', () => {
    it('should auto-remove notification after duration', () => {
      const store = useRemoteNotificationStore.getState();

      store.addNotification({
        type: 'info',
        message: 'Auto-remove test',
        duration: 3000,
      });

      expect(useRemoteNotificationStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(3000);

      expect(useRemoteNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('should not auto-remove when duration is 0', () => {
      const store = useRemoteNotificationStore.getState();

      store.addNotification({
        type: 'info',
        message: 'Persistent notification',
        duration: 0,
      });

      expect(useRemoteNotificationStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(10000);

      expect(useRemoteNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('Max notifications limit', () => {
    it('should limit notifications to max 5', () => {
      const store = useRemoteNotificationStore.getState();

      // Add 6 notifications
      for (let i = 0; i < 6; i++) {
        store.addNotification({
          type: 'info',
          message: `Notification ${i}`,
          duration: 0, // Prevent auto-removal
        });
      }

      const state = useRemoteNotificationStore.getState();
      expect(state.notifications).toHaveLength(5);
      // Oldest should be removed
      expect(state.notifications[0].message).toBe('Notification 1');
      expect(state.notifications[4].message).toBe('Notification 5');
    });
  });

  describe('removeNotification', () => {
    it('should remove a notification by id', () => {
      const store = useRemoteNotificationStore.getState();

      store.addNotification({
        type: 'info',
        message: 'To be removed',
        duration: 0,
      });

      const notificationId = useRemoteNotificationStore.getState().notifications[0].id;

      store.removeNotification(notificationId);

      expect(useRemoteNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', () => {
      const store = useRemoteNotificationStore.getState();

      store.addNotification({ type: 'info', message: 'Test 1', duration: 0 });
      store.addNotification({ type: 'info', message: 'Test 2', duration: 0 });
      store.addNotification({ type: 'info', message: 'Test 3', duration: 0 });

      expect(useRemoteNotificationStore.getState().notifications).toHaveLength(3);

      store.clearAll();

      expect(useRemoteNotificationStore.getState().notifications).toHaveLength(0);
    });
  });
});

describe('remoteNotify helpers', () => {
  beforeEach(() => {
    resetRemoteNotificationStore();
    vi.useFakeTimers();
    // Spy on console methods
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('remoteNotify.success should add success notification', () => {
    remoteNotify.success('Success message');

    const state = useRemoteNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('success');
    expect(state.notifications[0].message).toBe('Success message');
    expect(console.info).toHaveBeenCalledWith('[notify] Success message');
  });

  it('remoteNotify.error should add error notification with longer duration', () => {
    remoteNotify.error('Error message');

    const state = useRemoteNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('error');
    expect(state.notifications[0].message).toBe('Error message');
    expect(state.notifications[0].duration).toBe(8000);
    expect(console.error).toHaveBeenCalledWith('[notify] Error message');
  });

  it('remoteNotify.warning should add warning notification', () => {
    remoteNotify.warning('Warning message');

    const state = useRemoteNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('warning');
    expect(state.notifications[0].message).toBe('Warning message');
    expect(console.warn).toHaveBeenCalledWith('[notify] Warning message');
  });

  it('remoteNotify.info should add info notification', () => {
    remoteNotify.info('Info message');

    const state = useRemoteNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('info');
    expect(state.notifications[0].message).toBe('Info message');
    expect(console.info).toHaveBeenCalledWith('[notify] Info message');
  });
});
