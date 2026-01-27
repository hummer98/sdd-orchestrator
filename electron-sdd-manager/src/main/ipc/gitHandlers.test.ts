import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';

/**
 * Git IPC Handlers Tests
 * Task 3.2: Test IPC handler registration and basic functionality
 * Requirements: 3.1
 */

describe('Git IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Channel Registration', () => {
    it('should have GIT_GET_STATUS channel defined', () => {
      expect(IPC_CHANNELS.GIT_GET_STATUS).toBe('git:get-status');
    });

    it('should have GIT_GET_DIFF channel defined', () => {
      expect(IPC_CHANNELS.GIT_GET_DIFF).toBe('git:get-diff');
    });

    it('should have GIT_WATCH_CHANGES channel defined', () => {
      expect(IPC_CHANNELS.GIT_WATCH_CHANGES).toBe('git:watch-changes');
    });

    it('should have GIT_UNWATCH_CHANGES channel defined', () => {
      expect(IPC_CHANNELS.GIT_UNWATCH_CHANGES).toBe('git:unwatch-changes');
    });

    it('should have GIT_CHANGES_DETECTED channel defined', () => {
      expect(IPC_CHANNELS.GIT_CHANGES_DETECTED).toBe('git:changes-detected');
    });
  });
});
