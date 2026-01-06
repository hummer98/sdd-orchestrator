/**
 * Notification Store Tests
 * TDD: Testing notification state management
 * Requirements: 10.1-10.5, 5.2-5.4 (workflow-auto-execution)
 * renderer-error-logging feature: Added tests for auto-context logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationStore, notify } from './notificationStore';
import type { ExecutionSummary } from './workflowStore';
import { useSpecDetailStore } from './spec/specDetailStore';
import { useBugStore } from './bugStore';

// Mock the electronAPI
const mockLogRenderer = vi.fn();
(global as unknown as { window: { electronAPI?: { logRenderer: typeof mockLogRenderer } } }).window = {
  electronAPI: {
    logRenderer: mockLogRenderer,
  },
};

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store state
    useNotificationStore.setState({
      notifications: [],
    });
    // Reset mocks
    mockLogRenderer.mockClear();
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

  // ============================================================
  // Task 2.1: Basic notification service
  // Requirements: 5.2, 5.3
  // ============================================================
  describe('Task 2.1: notify helper functions', () => {
    it('should add success notification via notify.success', () => {
      notify.success('Operation completed');

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');
      expect(state.notifications[0].message).toBe('Operation completed');
    });

    it('should add error notification via notify.error', () => {
      notify.error('Operation failed');

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('error');
      expect(state.notifications[0].message).toBe('Operation failed');
    });

    it('should add info notification via notify.info', () => {
      notify.info('Information message');

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('info');
    });

    it('should add warning notification via notify.warning', () => {
      notify.warning('Warning message');

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('warning');
    });

    it('should limit notifications to max 5', () => {
      for (let i = 0; i < 7; i++) {
        notify.info(`Message ${i}`);
      }

      const state = useNotificationStore.getState();
      expect(state.notifications.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================
  // Task 2.2: Completion summary notification
  // Requirements: 5.4
  // ============================================================
  describe('Task 2.2: showCompletionSummary', () => {
    it('should show completion summary with executed phases', () => {
      const summary: ExecutionSummary = {
        executedPhases: ['requirements', 'design', 'tasks'],
        executedValidations: [],
        totalDuration: 5000,
        errors: [],
      };

      notify.showCompletionSummary(summary);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');
      expect(state.notifications[0].message).toContain('3');
    });

    it('should show completion summary with validations', () => {
      const summary: ExecutionSummary = {
        executedPhases: ['requirements', 'design'],
        executedValidations: ['gap', 'design'],
        totalDuration: 3000,
        errors: [],
      };

      notify.showCompletionSummary(summary);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].message).toContain('2');
    });

    it('should show completion summary with errors as warning', () => {
      const summary: ExecutionSummary = {
        executedPhases: ['requirements'],
        executedValidations: [],
        totalDuration: 2000,
        errors: ['Design failed', 'Validation error'],
      };

      notify.showCompletionSummary(summary);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('warning');
    });

    it('should format duration in seconds', () => {
      const summary: ExecutionSummary = {
        executedPhases: ['requirements'],
        executedValidations: [],
        totalDuration: 65000,
        errors: [],
      };

      notify.showCompletionSummary(summary);

      const state = useNotificationStore.getState();
      expect(state.notifications[0].message).toContain('65');
    });

    it('should have longer duration for completion summary', () => {
      const summary: ExecutionSummary = {
        executedPhases: ['requirements'],
        executedValidations: [],
        totalDuration: 1000,
        errors: [],
      };

      notify.showCompletionSummary(summary);

      const state = useNotificationStore.getState();
      // Completion summary should stay visible longer (10 seconds)
      expect(state.notifications[0].duration).toBeGreaterThanOrEqual(10000);
    });
  });

  // ============================================================
  // renderer-error-logging feature: Auto-context logging tests
  // ============================================================
  describe('renderer-error-logging: logToMain', () => {
    beforeEach(() => {
      // Reset stores
      useSpecDetailStore.setState({ specDetail: null });
      useBugStore.setState({ selectedBug: null });
    });

    it('should call logRenderer with error level for notify.error', () => {
      notify.error('Test error message');

      expect(mockLogRenderer).toHaveBeenCalledWith('error', 'Test error message', expect.any(Object));
    });

    it('should call logRenderer with warn level for notify.warning', () => {
      notify.warning('Test warning message');

      expect(mockLogRenderer).toHaveBeenCalledWith('warn', 'Test warning message', expect.any(Object));
    });

    it('should call logRenderer with info level for notify.info', () => {
      notify.info('Test info message');

      expect(mockLogRenderer).toHaveBeenCalledWith('info', 'Test info message', expect.any(Object));
    });

    it('should call logRenderer with info level for notify.success', () => {
      notify.success('Test success message');

      expect(mockLogRenderer).toHaveBeenCalledWith('info', 'Test success message', expect.any(Object));
    });

    it('should include specId in context when spec is selected', () => {
      // Set up spec detail
      useSpecDetailStore.setState({
        specDetail: {
          metadata: { name: 'test-feature' },
          status: {
            requirements: 'completed',
            design: 'pending',
            tasks: 'pending',
            implementation: 'pending',
          },
        },
      });

      notify.error('Error with spec context');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'error',
        'Error with spec context',
        expect.objectContaining({ specId: 'test-feature' })
      );
    });

    it('should include bugName in context when bug is selected', () => {
      // Set up selected bug
      useBugStore.setState({
        selectedBug: {
          name: 'test-bug-123',
          status: 'analyzing',
        },
      });

      notify.error('Error with bug context');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'error',
        'Error with bug context',
        expect.objectContaining({ bugName: 'test-bug-123' })
      );
    });

    it('should include both specId and bugName when both are selected', () => {
      // Set up both stores
      useSpecDetailStore.setState({
        specDetail: {
          metadata: { name: 'feature-auth' },
          status: {
            requirements: 'completed',
            design: 'completed',
            tasks: 'pending',
            implementation: 'pending',
          },
        },
      });
      useBugStore.setState({
        selectedBug: {
          name: 'auth-bug-456',
          status: 'fixing',
        },
      });

      notify.warning('Warning with both contexts');

      expect(mockLogRenderer).toHaveBeenCalledWith(
        'warn',
        'Warning with both contexts',
        expect.objectContaining({
          specId: 'feature-auth',
          bugName: 'auth-bug-456',
        })
      );
    });

    it('should send empty context when no spec or bug is selected', () => {
      notify.info('Message without context');

      expect(mockLogRenderer).toHaveBeenCalledWith('info', 'Message without context', {});
    });

    it('should log completion summary to main process', () => {
      const summary: ExecutionSummary = {
        executedPhases: ['requirements', 'design'],
        executedValidations: ['gap'],
        totalDuration: 5000,
        errors: [],
      };

      notify.showCompletionSummary(summary);

      expect(mockLogRenderer).toHaveBeenCalledWith('info', expect.stringContaining('自動実行完了'), expect.any(Object));
    });

    it('should log completion summary with warning level when errors exist', () => {
      const summary: ExecutionSummary = {
        executedPhases: ['requirements'],
        executedValidations: [],
        totalDuration: 2000,
        errors: ['Design failed'],
      };

      notify.showCompletionSummary(summary);

      expect(mockLogRenderer).toHaveBeenCalledWith('warn', expect.stringContaining('エラー'), expect.any(Object));
    });
  });
});
