/**
 * AgentRecordWatcherService Tests
 * agent-watcher-optimization feature
 * Requirements: 1.1, 1.2, 1.3, 1.4, 4.2
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { AgentRecordWatcherService, type AgentRecordChangeEvent } from './agentRecordWatcherService';

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
  // Task 1.1: Two Watcher Instance Configuration
  // Requirements: 1.3 - ProjectAgent is always monitored
  // =============================================================================
  describe('Task 1.1: Two watcher instance configuration', () => {
    it('should have projectAgentWatcher and specWatcher as separate properties', () => {
      // Service should have fields for both watchers
      expect(service.projectAgentWatcher).toBeDefined();
      expect(service.specWatcher).toBeDefined();
    });

    it('should have currentSpecId property to track watch scope', () => {
      expect(service.currentSpecId).toBeDefined();
      expect(service.currentSpecId).toBeNull();
    });

    it('should start with both watchers as null', () => {
      expect(service.projectAgentWatcher).toBeNull();
      expect(service.specWatcher).toBeNull();
    });

    it('should watch ProjectAgent path (agents directory root) for direct JSON files', () => {
      service.start();

      // First call should be for ProjectAgent watcher
      expect(chokidar.watch).toHaveBeenCalled();
      const firstCallArgs = (chokidar.watch as Mock).mock.calls[0];
      const watchedPath = firstCallArgs[0];

      // Should watch the agents directory for direct files only (depth: 0)
      expect(watchedPath).toBe(path.join(projectPath, '.kiro', 'runtime', 'agents'));
    });

    it('should set projectAgentWatcher after start()', () => {
      service.start();

      expect(service.projectAgentWatcher).not.toBeNull();
    });

    it('should NOT set specWatcher after start() - requires switchWatchScope', () => {
      service.start();

      // specWatcher is only set via switchWatchScope
      expect(service.specWatcher).toBeNull();
    });
  });

  // =============================================================================
  // Task 1.2: switchWatchScope Method
  // Requirements: 1.1, 1.2, 1.4, 4.2
  // =============================================================================
  describe('Task 1.2: switchWatchScope method', () => {
    it('should be an async method', async () => {
      service.start();
      const result = service.switchWatchScope('spec-1');
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should update currentSpecId when switching scope', async () => {
      service.start();
      await service.switchWatchScope('new-spec');

      expect(service.currentSpecId).toBe('new-spec');
    });

    it('should create specWatcher for the specified specId', async () => {
      service.start();
      vi.clearAllMocks(); // Clear the start() call
      (chokidar.watch as Mock).mockReturnValue(mockWatcher);

      await service.switchWatchScope('my-feature');

      expect(chokidar.watch).toHaveBeenCalled();
      const callArgs = (chokidar.watch as Mock).mock.calls[0];
      const watchedPath = callArgs[0];
      expect(watchedPath).toBe(path.join(projectPath, '.kiro', 'runtime', 'agents', 'my-feature'));
    });

    it('should set ignoreInitial: true for specWatcher', async () => {
      service.start();
      vi.clearAllMocks();
      (chokidar.watch as Mock).mockReturnValue(mockWatcher);

      await service.switchWatchScope('my-feature');

      expect(chokidar.watch).toHaveBeenCalled();
      const callArgs = (chokidar.watch as Mock).mock.calls[0];
      const options = callArgs[1];
      expect(options.ignoreInitial).toBe(true);
    });

    it('should stop existing specWatcher before creating new one', async () => {
      service.start();

      // Create first specWatcher
      const firstMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
      (chokidar.watch as Mock).mockReturnValue(firstMockWatcher);
      await service.switchWatchScope('spec-1');

      // Create second specWatcher
      const secondMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
      (chokidar.watch as Mock).mockReturnValue(secondMockWatcher);
      await service.switchWatchScope('spec-2');

      // First watcher should have been closed
      expect(firstMockWatcher.close).toHaveBeenCalled();
    });

    it('should set specWatcher to null when specId is null', async () => {
      service.start();

      // First set a spec watcher
      const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
      (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
      await service.switchWatchScope('spec-1');
      expect(service.specWatcher).not.toBeNull();

      // Then clear it
      await service.switchWatchScope(null);

      expect(service.specWatcher).toBeNull();
      expect(service.currentSpecId).toBeNull();
    });

    it('should not throw when directory does not exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      service.start();

      await expect(service.switchWatchScope('non-existent-spec')).resolves.not.toThrow();
    });

    it('should preserve projectAgentWatcher when switching spec scope', async () => {
      service.start();
      const projectWatcher = service.projectAgentWatcher;

      await service.switchWatchScope('new-spec');

      expect(service.projectAgentWatcher).toBe(projectWatcher);
    });
  });

  // =============================================================================
  // Task 1.3: Modified start Method
  // Requirements: 1.3 - ProjectAgent is always monitored
  // =============================================================================
  describe('Task 1.3: Modified start method', () => {
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

    it('should watch agents directory with depth: 0 for ProjectAgent', () => {
      service.start();

      const callArgs = (chokidar.watch as Mock).mock.calls[0];
      const options = callArgs[1];

      // Only watch direct files in agents directory (not subdirectories)
      expect(options.depth).toBe(0);
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
  // Task 1.4: Modified stop Method
  // Requirements: 4.2 - Non-blocking async processing
  // =============================================================================
  describe('Task 1.4: Modified stop method', () => {
    it('should stop both projectAgentWatcher and specWatcher', async () => {
      service.start();

      // Create spec watcher
      const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
      (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
      await service.switchWatchScope('spec-1');

      await service.stop();

      expect(mockWatcher.close).toHaveBeenCalled(); // projectAgentWatcher
      expect(specMockWatcher.close).toHaveBeenCalled(); // specWatcher
    });

    it('should set both watchers to null after stop', async () => {
      service.start();

      const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
      (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
      await service.switchWatchScope('spec-1');

      await service.stop();

      expect(service.projectAgentWatcher).toBeNull();
      expect(service.specWatcher).toBeNull();
    });

    it('should reset currentSpecId to null after stop', async () => {
      service.start();
      await service.switchWatchScope('spec-1');

      await service.stop();

      expect(service.currentSpecId).toBeNull();
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
  // Task 6.1: Unit test additional coverage
  // Requirements: 1.1, 1.2, 1.3, 1.4
  // =============================================================================
  describe('Task 6.1: Additional unit test coverage', () => {
    it('should call onChange callbacks for ProjectAgent events', async () => {
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      // Get the 'add' handler
      const addHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'add')?.[1];
      expect(addHandler).toBeDefined();

      // Simulate a ProjectAgent file event
      addHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'agent-123.json'));

      // Wait for debounce
      await new Promise((r) => setTimeout(r, 150));

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'add',
        specId: '', // Empty specId for ProjectAgent
        agentId: 'agent-123',
      }));
    });

    it('should call onChange callbacks for Spec-bound agent events', async () => {
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
      (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
      await service.switchWatchScope('my-spec');

      // Get the 'add' handler from spec watcher
      const addHandler = (specMockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'add')?.[1];
      expect(addHandler).toBeDefined();

      // Simulate a Spec-bound agent file event
      addHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'my-spec', 'agent-456.json'));

      // Wait for debounce
      await new Promise((r) => setTimeout(r, 150));

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'add',
        specId: 'my-spec',
        agentId: 'agent-456',
      }));
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
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      const changeHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'change')?.[1];
      changeHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'agent-123.json'));

      await new Promise((r) => setTimeout(r, 150));

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'change',
      }));
    });

    it('should handle unlink events', async () => {
      const callback = vi.fn();
      service.onChange(callback);
      service.start();

      const unlinkHandler = (mockWatcher.on as Mock).mock.calls.find((c) => c[0] === 'unlink')?.[1];
      unlinkHandler(path.join(projectPath, '.kiro', 'runtime', 'agents', 'agent-123.json'));

      await new Promise((r) => setTimeout(r, 150));

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'unlink',
      }));
    });

    it('should return correct watch scope via getWatchScope()', async () => {
      service.start();

      expect(service.getWatchScope()).toBeNull();

      await service.switchWatchScope('spec-abc');
      expect(service.getWatchScope()).toBe('spec-abc');

      await service.switchWatchScope(null);
      expect(service.getWatchScope()).toBeNull();
    });
  });

  // =============================================================================
  // runtime-agents-restructure: Tasks 4.1-4.3 - Category-aware watching
  // Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
  // =============================================================================
  describe('Category-aware watching (Tasks 4.1-4.3)', () => {
    describe('Three watcher categories (Task 4.1)', () => {
      it('should have bugWatcher property', () => {
        expect('bugWatcher' in service).toBe(true);
      });

      it('should start with bugWatcher as null', () => {
        expect(service.bugWatcher).toBeNull();
      });
    });

    describe('switchWatchScopeWithCategory (Task 4.2)', () => {
      it('should accept category parameter', async () => {
        service.start();

        // Method should accept category
        await expect(service.switchWatchScopeWithCategory('specs', 'my-feature')).resolves.not.toThrow();
      });

      it('should watch specs/{specId}/ for specs category (Req 4.2)', async () => {
        service.start();
        vi.clearAllMocks();
        (chokidar.watch as Mock).mockReturnValue(mockWatcher);

        await service.switchWatchScopeWithCategory('specs', 'my-feature');

        expect(chokidar.watch).toHaveBeenCalled();
        const callArgs = (chokidar.watch as Mock).mock.calls[0];
        const watchedPath = callArgs[0];
        expect(watchedPath).toBe(path.join(projectPath, '.kiro', 'runtime', 'agents', 'specs', 'my-feature'));
      });

      it('should watch bugs/{bugId}/ for bugs category (Req 4.3)', async () => {
        service.start();
        vi.clearAllMocks();
        (chokidar.watch as Mock).mockReturnValue(mockWatcher);

        await service.switchWatchScopeWithCategory('bugs', 'login-error');

        expect(chokidar.watch).toHaveBeenCalled();
        const callArgs = (chokidar.watch as Mock).mock.calls[0];
        const watchedPath = callArgs[0];
        expect(watchedPath).toBe(path.join(projectPath, '.kiro', 'runtime', 'agents', 'bugs', 'login-error'));
      });

      it('should set bugWatcher when category is bugs', async () => {
        service.start();

        const bugMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(bugMockWatcher);

        await service.switchWatchScopeWithCategory('bugs', 'login-error');

        expect(service.bugWatcher).not.toBeNull();
        expect(service.specWatcher).toBeNull(); // Only bugWatcher should be set
      });

      it('should set specWatcher when category is specs', async () => {
        service.start();

        const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(specMockWatcher);

        await service.switchWatchScopeWithCategory('specs', 'my-feature');

        expect(service.specWatcher).not.toBeNull();
        expect(service.bugWatcher).toBeNull(); // Only specWatcher should be set
      });

      it('should stop bugWatcher when switching to specs category', async () => {
        service.start();

        // First set bug watcher
        const bugMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(bugMockWatcher);
        await service.switchWatchScopeWithCategory('bugs', 'login-error');

        // Then switch to specs
        const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
        await service.switchWatchScopeWithCategory('specs', 'my-feature');

        expect(bugMockWatcher.close).toHaveBeenCalled();
        expect(service.bugWatcher).toBeNull();
      });

      it('should stop specWatcher when switching to bugs category', async () => {
        service.start();

        // First set spec watcher
        const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
        await service.switchWatchScopeWithCategory('specs', 'my-feature');

        // Then switch to bugs
        const bugMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(bugMockWatcher);
        await service.switchWatchScopeWithCategory('bugs', 'login-error');

        expect(specMockWatcher.close).toHaveBeenCalled();
        expect(service.specWatcher).toBeNull();
      });

      it('should clear both watchers when entityId is null', async () => {
        service.start();

        // Set both watchers first
        const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
        await service.switchWatchScopeWithCategory('specs', 'my-feature');

        // Clear
        await service.switchWatchScopeWithCategory('specs', null);

        expect(service.specWatcher).toBeNull();
      });
    });

    describe('getWatchScopeWithCategory', () => {
      it('should return category and entityId', async () => {
        service.start();

        const specMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(specMockWatcher);
        await service.switchWatchScopeWithCategory('specs', 'my-feature');

        const scope = service.getWatchScopeWithCategory();
        expect(scope.category).toBe('specs');
        expect(scope.entityId).toBe('my-feature');
      });

      it('should return bugs category when watching a bug', async () => {
        service.start();

        const bugMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(bugMockWatcher);
        await service.switchWatchScopeWithCategory('bugs', 'login-error');

        const scope = service.getWatchScopeWithCategory();
        expect(scope.category).toBe('bugs');
        expect(scope.entityId).toBe('login-error');
      });

      it('should return null values when no scope is set', () => {
        service.start();

        const scope = service.getWatchScopeWithCategory();
        expect(scope.category).toBeNull();
        expect(scope.entityId).toBeNull();
      });
    });

    describe('projectWatcher always monitors project/ (Req 4.4)', () => {
      it('should continue monitoring project/ when switching to specs', async () => {
        service.start();
        const projectWatcher = service.projectAgentWatcher;

        await service.switchWatchScopeWithCategory('specs', 'my-feature');

        // projectAgentWatcher should remain unchanged
        expect(service.projectAgentWatcher).toBe(projectWatcher);
      });

      it('should continue monitoring project/ when switching to bugs', async () => {
        service.start();
        const projectWatcher = service.projectAgentWatcher;

        const bugMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(bugMockWatcher);
        await service.switchWatchScopeWithCategory('bugs', 'login-error');

        // projectAgentWatcher should remain unchanged
        expect(service.projectAgentWatcher).toBe(projectWatcher);
      });
    });

    describe('stop method handles all three watchers', () => {
      it('should stop bugWatcher on stop()', async () => {
        service.start();

        const bugMockWatcher = { on: vi.fn().mockReturnThis(), close: vi.fn().mockResolvedValue(undefined) };
        (chokidar.watch as Mock).mockReturnValue(bugMockWatcher);
        await service.switchWatchScopeWithCategory('bugs', 'login-error');

        await service.stop();

        expect(bugMockWatcher.close).toHaveBeenCalled();
        expect(service.bugWatcher).toBeNull();
      });
    });
  });
});
