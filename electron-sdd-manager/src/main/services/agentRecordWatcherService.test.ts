/**
 * AgentRecordWatcherService Tests
 * remove-redundant-agent-watchers feature
 * Single watcher architecture - projectAgentWatcher monitors all categories
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { AgentRecordWatcherService } from './agentRecordWatcherService';

// Mock dependencies
vi.mock('chokidar');
vi.mock('fs');
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AgentRecordWatcherService', () => {
  const projectPath = '/test/project';
  let service: AgentRecordWatcherService;
  let mockWatcher: {
    on: Mock;
    close: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fs.existsSync
    (fs.existsSync as Mock).mockReturnValue(true);
    (fs.mkdirSync as Mock).mockImplementation(() => undefined);

    // Create mock watcher
    mockWatcher = {
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    };

    (chokidar.watch as Mock).mockReturnValue(mockWatcher);

    service = new AgentRecordWatcherService(projectPath);
  });

  afterEach(async () => {
    await service.stop();
  });

  // =============================================================================
  // Single Watcher Architecture
  // remove-redundant-agent-watchers: projectAgentWatcher is the only watcher
  // =============================================================================
  describe('Single watcher architecture', () => {
    it('should have only projectAgentWatcher property', () => {
      // Service should have projectAgentWatcher
      expect(service.projectAgentWatcher).toBeDefined();
    });

    it('should start with projectAgentWatcher as null', () => {
      expect(service.projectAgentWatcher).toBeNull();
    });

    it('should watch all category paths (specs/*/bugs/*/project/) for JSON files', () => {
      service.start();

      // Should watch all categories with glob patterns
      expect(chokidar.watch).toHaveBeenCalled();
      const firstCallArgs = (chokidar.watch as Mock).mock.calls[0];
      const watchedPaths = firstCallArgs[0];

      // Should be an array of glob patterns
      expect(Array.isArray(watchedPaths)).toBe(true);
      expect(watchedPaths).toContain(path.join(projectPath, '.kiro', 'runtime', 'agents', 'specs/*/*.json'));
      expect(watchedPaths).toContain(path.join(projectPath, '.kiro', 'runtime', 'agents', 'bugs/*/*.json'));
      expect(watchedPaths).toContain(path.join(projectPath, '.kiro', 'runtime', 'agents', 'project/*.json'));
    });

    it('should exclude log files from watching', () => {
      service.start();

      const firstCallArgs = (chokidar.watch as Mock).mock.calls[0];
      const options = firstCallArgs[1];

      // Should ignore logs directory
      expect(options.ignored).toBe('**/logs/**');
    });

    it('should set projectAgentWatcher after start()', () => {
      service.start();

      expect(service.projectAgentWatcher).not.toBeNull();
    });
  });

  // =============================================================================
  // Start Method
  // =============================================================================
  describe('start method', () => {
    it('should only start ProjectAgent watcher on start()', () => {
      service.start();

      // Should only create one watcher on start
      expect(chokidar.watch).toHaveBeenCalledTimes(1);
    });

    it('should set projectAgentWatcher with ignoreInitial: false', () => {
      service.start();

      const callArgs = (chokidar.watch as Mock).mock.calls[0];
      const options = callArgs[1];

      // ProjectAgent watcher should process existing files
      expect(options.ignoreInitial).toBe(false);
    });

    it('should not specify depth option (glob patterns control depth)', () => {
      service.start();

      const callArgs = (chokidar.watch as Mock).mock.calls[0];
      const options = callArgs[1];

      // Depth is controlled by glob patterns, not depth option
      expect(options.depth).toBeUndefined();
    });

    it('should warn and return if already running', () => {
      service.start();
      vi.clearAllMocks();

      service.start(); // Call again

      // Should not create new watcher
      expect(chokidar.watch).not.toHaveBeenCalled();
    });

    it('should create agents directory if it does not exist', () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      service.start();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(projectPath, '.kiro', 'runtime', 'agents'),
        { recursive: true }
      );
    });
  });

  // =============================================================================
  // Stop Method
  // =============================================================================
  describe('stop method', () => {
    it('should stop projectAgentWatcher', async () => {
      service.start();

      await service.stop();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should set projectAgentWatcher to null after stop', async () => {
      service.start();

      await service.stop();

      expect(service.projectAgentWatcher).toBeNull();
    });

    it('should handle stop when no watchers are running', async () => {
      // Never started
      await expect(service.stop()).resolves.not.toThrow();
    });

    it('should be async and return Promise', async () => {
      service.start();
      const result = service.stop();

      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  // =============================================================================
  // Event Handling
  // =============================================================================
  describe('Event handling', () => {
    it('should call onChange callbacks for ProjectAgent events', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      // Get the 'add' handler
      const addHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'add')?.[1];
      expect(addHandler).toBeDefined();

      // Simulate a ProjectAgent file event (project/ category)
      addHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'project', 'agent-123.json'));

      // Wait for debounce
      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'add',
        specId: '', // Empty specId for ProjectAgent
        agentId: 'agent-123',
      }));

      vi.useRealTimers();
    });

    it('should call onChange callbacks for Spec-bound agent events', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      // Get the 'add' handler from main watcher (now watches all categories)
      const addHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'add')?.[1];
      expect(addHandler).toBeDefined();

      // Simulate a Spec-bound agent file event (specs/ category)
      addHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'specs', 'my-spec', 'agent-456.json'));

      // Wait for debounce
      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'add',
        specId: 'my-spec',
        agentId: 'agent-456',
      }));

      vi.useRealTimers();
    });

    it('should ignore non-JSON files', async () => {
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      const addHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'add')?.[1];
      addHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'readme.txt'));

      await new Promise((r) => setTimeout(r, 150));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle change events', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      const changeHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'change')?.[1];
      changeHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'project', 'agent-123.json'));

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'change',
      }));

      vi.useRealTimers();
    });

    it('should handle unlink events', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      const unlinkHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'unlink')?.[1];
      unlinkHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'project', 'agent-123.json'));

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'unlink',
      }));

      vi.useRealTimers();
    });
  });

  // =============================================================================
  // extractIds with category-aware paths
  // =============================================================================
  describe('extractIds with category-aware paths', () => {
    it('should extract specId and agentId from specs category path', () => {
      vi.useFakeTimers();
      const filePath = path.join(projectPath, '.kiro', 'runtime', 'agents', 'specs', 'my-feature', 'agent-123.json');
      const callback = vi.fn();

      service.start();
      service.onChange(callback);

      // Simulate file event
      const addHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
      addHandler?.(filePath);

      // Wait for debounce
      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'my-feature',
          agentId: 'agent-123',
        })
      );

      vi.useRealTimers();
    });

    it('should extract bugId (with bug: prefix) and agentId from bugs category path', () => {
      vi.useFakeTimers();
      const filePath = path.join(projectPath, '.kiro', 'runtime', 'agents', 'bugs', 'login-error', 'agent-456.json');
      const callback = vi.fn();

      service.start();
      service.onChange(callback);

      const addHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
      addHandler?.(filePath);

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: 'bug:login-error',
          agentId: 'agent-456',
        })
      );

      vi.useRealTimers();
    });

    it('should extract empty specId and agentId from project category path', () => {
      vi.useFakeTimers();
      const filePath = path.join(projectPath, '.kiro', 'runtime', 'agents', 'project', 'agent-789.json');
      const callback = vi.fn();

      service.start();
      service.onChange(callback);

      const addHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
      addHandler?.(filePath);

      vi.advanceTimersByTime(200);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: '',
          agentId: 'agent-789',
        })
      );

      vi.useRealTimers();
    });

    it('should ignore log files', () => {
      vi.useFakeTimers();
      const logFilePath = path.join(projectPath, '.kiro', 'runtime', 'agents', 'specs', 'my-feature', 'logs', 'agent-123.log');
      const callback = vi.fn();

      service.start();
      service.onChange(callback);

      const addHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
      addHandler?.(logFilePath);

      vi.advanceTimersByTime(200);

      // Should not trigger callback for log files
      expect(callback).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // =============================================================================
  // isRunning method
  // =============================================================================
  describe('isRunning method', () => {
    it('should return false before start', () => {
      expect(service.isRunning()).toBe(false);
    });

    it('should return true after start', () => {
      service.start();
      expect(service.isRunning()).toBe(true);
    });

    it('should return false after stop', async () => {
      service.start();
      await service.stop();
      expect(service.isRunning()).toBe(false);
    });
  });
});
