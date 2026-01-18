/**
 * startImplPhase Unit Tests
 * TDD: Testing unified impl start logic in Main Process
 * impl-start-unification: Task 5.1
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();

const mockWorktreeService = {
  isOnMainBranch: vi.fn(),
  getCurrentBranch: vi.fn(),
  createWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  createSymlinksForWorktree: vi.fn(),
  resolveWorktreePath: vi.fn(),
};

const mockSpecManagerService = {
  execute: vi.fn(),
};

vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => mockWorktreeService),
}));

vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import {
  startImplPhase,
  type StartImplParams,
  type ImplStartResult,
} from './startImplPhase';

describe('startImplPhase', () => {
  const projectPath = '/Users/test/my-project';
  const specPath = '/Users/test/my-project/.kiro/specs/my-feature';
  const featureName = 'my-feature';
  const commandPrefix = 'kiro';

  const defaultParams: StartImplParams = {
    specPath,
    featureName,
    commandPrefix,
    specManagerService: mockSpecManagerService as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  // =============================================================
  // Task 1.1: Core Implementation - Type definitions and spec.json reading
  // Requirements: 1.1, 1.2, 1.3
  // =============================================================

  describe('Type definitions and basic flow (Req 1.1, 1.2, 1.3)', () => {
    it('should return ImplStartResult with ok:true on success', async () => {
      // Arrange: Normal mode spec.json (worktree not enabled)
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        approvals: { tasks: { approved: true } },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWriteFile.mockResolvedValue(undefined);
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'feature/test' });
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-123' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert: Result type is correct
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.agentId).toBe('agent-123');
      }
    });

    it('should return ImplStartResult with ok:false on spec.json read error', async () => {
      // Arrange
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPEC_JSON_ERROR');
      }
    });

    it('should accept StartImplParams with specPath, featureName, commandPrefix', async () => {
      // Arrange: Verify parameter passing
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: { enabled: false },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWriteFile.mockResolvedValue(undefined);
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'main' });
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-456' },
      });

      // Act
      const result = await startImplPhase({
        specPath: '/custom/path',
        featureName: 'custom-feature',
        commandPrefix: 'spec-manager',
        specManagerService: mockSpecManagerService as any,
      });

      // Assert: Parameters are passed correctly to execute
      expect(result.ok).toBe(true);
      expect(mockSpecManagerService.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'impl',
          specId: 'custom-feature',
          featureName: 'custom-feature',
          commandPrefix: 'spec-manager',
        })
      );
    });
  });

  // =============================================================
  // Task 1.2: Worktree mode implementation
  // Requirements: 2.1, 2.2
  // =============================================================

  describe('Worktree mode (Req 2.1, 2.2)', () => {
    it('should return NOT_ON_MAIN_BRANCH error when worktree.enabled=true and not on main branch', async () => {
      // Arrange: Worktree mode enabled, no existing worktree path
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: { enabled: true },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: false });
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'feature/other' });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_ON_MAIN_BRANCH');
        expect(result.error.currentBranch).toBe('feature/other');
      }
    });

    it('should create worktree and execute impl when on main branch', async () => {
      // Arrange: Worktree mode enabled, on main branch
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: { enabled: true },
      };
      const worktreeInfo = {
        path: '../my-project-worktrees/my-feature',
        absolutePath: '/Users/test/my-project-worktrees/my-feature',
        branch: 'feature/my-feature',
        created_at: '2026-01-18T00:00:00.000Z',
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWriteFile.mockResolvedValue(undefined);
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({ ok: true, value: worktreeInfo });
      mockWorktreeService.createSymlinksForWorktree.mockResolvedValue({ ok: true, value: undefined });
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-789' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert
      expect(result.ok).toBe(true);
      expect(mockWorktreeService.isOnMainBranch).toHaveBeenCalled();
      expect(mockWorktreeService.createWorktree).toHaveBeenCalledWith(featureName);
      expect(mockSpecManagerService.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'impl',
        })
      );
    });

    it('should use existing worktree when worktree.path is already set', async () => {
      // Arrange: Worktree already exists (has path)
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: {
          enabled: true,
          path: '../my-project-worktrees/my-feature',
          branch: 'feature/my-feature',
          created_at: '2026-01-12T00:00:00.000Z',
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-existing' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert: Should NOT check main branch or create new worktree
      expect(result.ok).toBe(true);
      expect(mockWorktreeService.isOnMainBranch).not.toHaveBeenCalled();
      expect(mockWorktreeService.createWorktree).not.toHaveBeenCalled();
      expect(mockSpecManagerService.execute).toHaveBeenCalled();
    });

    it('should return WORKTREE_CREATE_FAILED when worktree creation fails', async () => {
      // Arrange
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: { enabled: true },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWorktreeService.isOnMainBranch.mockResolvedValue({ ok: true, value: true });
      mockWorktreeService.createWorktree.mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Branch already exists' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('WORKTREE_CREATE_FAILED');
      }
    });
  });

  // =============================================================
  // Task 1.3: Normal mode implementation
  // Requirements: 2.3
  // =============================================================

  describe('Normal mode (Req 2.3)', () => {
    it('should skip branch check when worktree.enabled is false', async () => {
      // Arrange: Normal mode (worktree disabled)
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: { enabled: false },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWriteFile.mockResolvedValue(undefined);
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'feature/any-branch' });
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-normal' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert: Should NOT check if on main branch
      expect(result.ok).toBe(true);
      expect(mockWorktreeService.isOnMainBranch).not.toHaveBeenCalled();
      expect(mockWorktreeService.createWorktree).not.toHaveBeenCalled();
    });

    it('should skip branch check when worktree field is undefined', async () => {
      // Arrange: No worktree field in spec.json
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        // worktree field is undefined
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWriteFile.mockResolvedValue(undefined);
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'main' });
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-no-worktree' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert
      expect(result.ok).toBe(true);
      expect(mockWorktreeService.isOnMainBranch).not.toHaveBeenCalled();
    });

    it('should save branch and created_at in normal mode when worktree field is missing', async () => {
      // Arrange
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWriteFile.mockResolvedValue(undefined);
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'develop' });
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-save' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert: Should save branch info
      expect(result.ok).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenJson = JSON.parse(writeCall[1]);
      expect(writtenJson.worktree.branch).toBe('develop');
      expect(writtenJson.worktree.created_at).toBeDefined();
    });

    it('should NOT update worktree field when it already has branch (impl continuation)', async () => {
      // Arrange: Normal mode already initialized (has branch but no path)
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: {
          branch: 'develop',
          created_at: '2026-01-12T00:00:00.000Z',
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockSpecManagerService.execute.mockResolvedValue({
        ok: true,
        value: { agentId: 'agent-continue' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert: Should NOT call writeFile (no update needed)
      expect(result.ok).toBe(true);
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockSpecManagerService.execute).toHaveBeenCalled();
    });
  });

  // =============================================================
  // Error handling
  // =============================================================

  describe('Error handling', () => {
    it('should return EXECUTE_FAILED when execute() fails', async () => {
      // Arrange
      const specJson = {
        feature_name: 'my-feature',
        phase: 'tasks-generated',
        worktree: { enabled: false },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(specJson));
      mockWriteFile.mockResolvedValue(undefined);
      mockWorktreeService.getCurrentBranch.mockResolvedValue({ ok: true, value: 'main' });
      mockSpecManagerService.execute.mockResolvedValue({
        ok: false,
        error: { type: 'SPAWN_ERROR', message: 'Failed to spawn process' },
      });

      // Act
      const result = await startImplPhase(defaultParams);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EXECUTE_FAILED');
      }
    });

    it('should return error without throwing exception', async () => {
      // Arrange
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      // Act & Assert: Should not throw
      const result = await startImplPhase(defaultParams);
      expect(result.ok).toBe(false);
    });
  });
});
