/**
 * Schedule Task IPC Channel Tests
 * schedule-task-execution feature - Task 3.1
 * Requirements: All IPC
 */

import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from './channels';

describe('Schedule Task IPC Channels', () => {
  describe('CRUD Channels', () => {
    it('should define SCHEDULE_TASK_GET_ALL channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_GET_ALL).toBe('schedule-task:get-all');
    });

    it('should define SCHEDULE_TASK_GET channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_GET).toBe('schedule-task:get');
    });

    it('should define SCHEDULE_TASK_CREATE channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_CREATE).toBe('schedule-task:create');
    });

    it('should define SCHEDULE_TASK_UPDATE channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_UPDATE).toBe('schedule-task:update');
    });

    it('should define SCHEDULE_TASK_DELETE channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_DELETE).toBe('schedule-task:delete');
    });
  });

  describe('Execution Channels', () => {
    it('should define SCHEDULE_TASK_EXECUTE_IMMEDIATELY channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_EXECUTE_IMMEDIATELY).toBe('schedule-task:execute-immediately');
    });

    it('should define SCHEDULE_TASK_GET_QUEUE channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_GET_QUEUE).toBe('schedule-task:get-queue');
    });

    it('should define SCHEDULE_TASK_GET_RUNNING channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_GET_RUNNING).toBe('schedule-task:get-running');
    });
  });

  describe('Event Channels', () => {
    it('should define SCHEDULE_TASK_STATUS_CHANGED event channel', () => {
      expect(IPC_CHANNELS.SCHEDULE_TASK_STATUS_CHANGED).toBe('schedule-task:status-changed');
    });
  });

  describe('Channel naming consistency', () => {
    it('should use schedule-task: prefix for all schedule task channels', () => {
      const scheduleTaskChannels = [
        IPC_CHANNELS.SCHEDULE_TASK_GET_ALL,
        IPC_CHANNELS.SCHEDULE_TASK_GET,
        IPC_CHANNELS.SCHEDULE_TASK_CREATE,
        IPC_CHANNELS.SCHEDULE_TASK_UPDATE,
        IPC_CHANNELS.SCHEDULE_TASK_DELETE,
        IPC_CHANNELS.SCHEDULE_TASK_EXECUTE_IMMEDIATELY,
        IPC_CHANNELS.SCHEDULE_TASK_GET_QUEUE,
        IPC_CHANNELS.SCHEDULE_TASK_GET_RUNNING,
        IPC_CHANNELS.SCHEDULE_TASK_STATUS_CHANGED,
      ];

      scheduleTaskChannels.forEach((channel) => {
        expect(channel).toMatch(/^schedule-task:/);
      });
    });
  });
});
