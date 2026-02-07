/**
 * Bug Router tests
 * Task 5.2: bugルーターとZodスキーマを実装する
 * Task 5.4: レガシーテスト知識の継承（bugHandlers, bugWorktreeHandlers, IPC contract）
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * Method: bugRouter, bugService
 * Verify: Grep "bugRouter" in router.ts
 *
 * Tests all 12 procedures:
 * - readBugs (query)
 * - readBugDetail (query)
 * - startBugsWatcher (mutation)
 * - stopBugsWatcher (mutation)
 * - executeBugCreate (mutation)
 * - phaseUpdate (mutation)
 * - worktreeCreate (mutation)
 * - worktreeRemove (mutation)
 * - worktreeAutoExecution (mutation)
 * - convertToWorktree (mutation)
 * - getBugsWorktreeDefault (query)
 * - setBugsWorktreeDefault (mutation)
 *
 * Legacy test knowledge inherited from:
 * - bugHandlers.test.ts: DI pattern, channel registration
 * - bugWorktreeHandlers.test.ts: worktree create/remove file operations
 * - bugWorktreeHandlers.ipc-contract.test.ts: IPC contract validation (replaced by Zod)
 * - bugWorktreeFlow.integration.test.ts: end-to-end worktree flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

describe('Bug Router', () => {
  let mockServices: ContextServices;

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ============================================================
  // readBugs
  // ============================================================

  describe('readBugs', () => {
    it('should return bugs list for a given project path', async () => {
      const mockBugs = {
        bugs: [
          { name: 'fix-issue-1', phase: 'reported', updatedAt: '2026-01-01', reportedAt: '2026-01-01' },
          { name: 'fix-issue-2', phase: 'analyzed', updatedAt: '2026-01-02', reportedAt: '2026-01-02' },
        ],
        warnings: [],
      };
      (mockServices.bugService as any).readBugs = vi.fn().mockResolvedValue({ ok: true, value: mockBugs });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.readBugs({ projectPath: '/test/project' });

      expect(result).toEqual(mockBugs);
      expect(mockServices.bugService!.readBugs).toHaveBeenCalledWith('/test/project');
    });

    it('should throw INTERNAL_SERVER_ERROR when bugService returns error', async () => {
      (mockServices.bugService as any).readBugs = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'READ_ERROR' },
      });

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.readBugs({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });

    it('should throw INTERNAL_SERVER_ERROR when bugService is null', async () => {
      mockServices.bugService = null;

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.readBugs({ projectPath: '/test/project' }))
        .rejects.toThrow();
    });

    it('should validate input - empty projectPath should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.bug.readBugs({ projectPath: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // readBugDetail
  // ============================================================

  describe('readBugDetail', () => {
    it('should return bug detail for a given bug name', async () => {
      const mockDetail = {
        name: 'fix-issue-1',
        phase: 'reported',
        description: 'Test bug',
        artifacts: {},
      };
      (mockServices.fileService as any).resolveBugPath = vi.fn().mockResolvedValue({
        ok: true,
        value: '/test/.kiro/bugs/fix-issue-1',
      });
      (mockServices.bugService as any).readBugDetail = vi.fn().mockResolvedValue({
        ok: true,
        value: mockDetail,
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.readBugDetail({ bugName: 'fix-issue-1' });

      expect(result).toEqual(mockDetail);
      expect(mockServices.bugService!.readBugDetail).toHaveBeenCalledWith('/test/.kiro/bugs/fix-issue-1');
    });

    it('should throw PRECONDITION_FAILED when no project is selected', async () => {
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue(null);

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.readBugDetail({ bugName: 'fix-issue-1' }))
        .rejects.toThrow('Project not selected');
    });

    it('should throw NOT_FOUND when bug path cannot be resolved', async () => {
      (mockServices.fileService as any).resolveBugPath = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND' },
      });

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.readBugDetail({ bugName: 'nonexistent' }))
        .rejects.toThrow();
    });

    it('should validate input - empty bugName should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.bug.readBugDetail({ bugName: '' }))
        .rejects.toThrow();
    });
  });

  // ============================================================
  // startBugsWatcher
  // ============================================================

  describe('startBugsWatcher', () => {
    it('should call bugsWatcherStart service and return void', async () => {
      mockServices.bugsWatcherStart = vi.fn().mockResolvedValue(undefined);

      const caller = createTestCaller(mockServices);
      await caller.bug.startBugsWatcher();

      expect(mockServices.bugsWatcherStart).toHaveBeenCalled();
    });
  });

  // ============================================================
  // stopBugsWatcher
  // ============================================================

  describe('stopBugsWatcher', () => {
    it('should call bugsWatcherStop service and return void', async () => {
      mockServices.bugsWatcherStop = vi.fn().mockResolvedValue(undefined);

      const caller = createTestCaller(mockServices);
      await caller.bug.stopBugsWatcher();

      expect(mockServices.bugsWatcherStop).toHaveBeenCalled();
    });
  });

  // ============================================================
  // executeBugCreate
  // ============================================================

  describe('executeBugCreate', () => {
    it('should create a bug and return agent result', async () => {
      const mockResult = { agentId: 'agent-001' };
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: mockResult }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.executeBugCreate({
        projectPath: '/test/project',
        description: 'Fix the bug',
        worktreeMode: false,
      });

      expect(result).toEqual(mockResult);
      expect(mockSpecManager.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        specId: '',
        phase: 'bug-create',
        group: 'doc',
        engineId: 'claude',
      }));
    });

    it('should include --worktree flag when worktreeMode is true', async () => {
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'agent-001' } }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);
      // Mock worktree validation
      mockServices.validateWorktreeMainBranch = vi.fn().mockResolvedValue({ ok: true, value: true });

      const caller = createTestCaller(mockServices);
      await caller.bug.executeBugCreate({
        projectPath: '/test/project',
        description: 'Fix the bug',
        worktreeMode: true,
      });

      expect(mockSpecManager.startAgent).toHaveBeenCalledWith(expect.objectContaining({
        args: expect.arrayContaining([expect.stringContaining('--worktree')]),
      }));
    });

    it('should throw when startAgent returns error', async () => {
      const mockSpecManager = {
        startAgent: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'AGENT_ERROR', message: 'Failed to start agent' },
        }),
      };
      mockServices.getSpecManagerService = vi.fn().mockReturnValue(mockSpecManager);

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.executeBugCreate({
        projectPath: '/test/project',
        description: 'Fix the bug',
        worktreeMode: false,
      })).rejects.toThrow();
    });

    it('should validate input - empty description should fail', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.bug.executeBugCreate({
        projectPath: '/test/project',
        description: '',
        worktreeMode: false,
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // phaseUpdate
  // ============================================================

  describe('phaseUpdate', () => {
    it('should update bug phase and return result', async () => {
      (mockServices.bugService as any).updateBugJsonPhase = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.phaseUpdate({
        bugName: 'fix-issue-1',
        phase: 'analyzed',
      });

      expect(result).toEqual({ ok: true, value: undefined });
    });

    it('should throw PRECONDITION_FAILED when no project is selected', async () => {
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue(null);

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.phaseUpdate({
        bugName: 'fix-issue-1',
        phase: 'analyzed',
      })).rejects.toThrow('Project not selected');
    });

    it('should return error result when update fails', async () => {
      (mockServices.bugService as any).updateBugJsonPhase = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'WRITE_ERROR' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.phaseUpdate({
        bugName: 'fix-issue-1',
        phase: 'analyzed',
      });

      expect(result.ok).toBe(false);
    });

    it('should validate phase value', async () => {
      const caller = createTestCaller(mockServices);
      await expect(caller.bug.phaseUpdate({
        bugName: 'fix-issue-1',
        phase: 'invalid-phase' as any,
      })).rejects.toThrow();
    });
  });

  // ============================================================
  // worktreeCreate
  // ============================================================

  describe('worktreeCreate', () => {
    it('should create a bug worktree and return result', async () => {
      const mockWorktreeInfo = {
        path: '/test/.kiro/worktrees/bugs/fix-issue-1',
        branch: 'bugfix/fix-issue-1',
      };
      mockServices.bugWorktreeCreate = vi.fn().mockResolvedValue({
        ok: true,
        value: mockWorktreeInfo,
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.worktreeCreate({ bugName: 'fix-issue-1' });

      expect(result).toEqual({ ok: true, value: mockWorktreeInfo });
      expect(mockServices.bugWorktreeCreate).toHaveBeenCalledWith('fix-issue-1');
    });

    it('should throw PRECONDITION_FAILED when no project is selected', async () => {
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue(null);

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.worktreeCreate({ bugName: 'fix-issue-1' }))
        .rejects.toThrow('Project not selected');
    });

    // Legacy: bugWorktreeHandlers.test.ts - worktree create error handling
    it('should return error result when bugWorktreeCreate service returns error', async () => {
      mockServices.bugWorktreeCreate = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Not on main branch' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.worktreeCreate({ bugName: 'fix-issue-1' });

      expect(result.ok).toBe(false);
    });

    // Legacy: bugWorktreeHandlers.ipc-contract.test.ts - only bugName parameter required
    it('should work with only bugName parameter (no projectPath needed)', async () => {
      mockServices.bugWorktreeCreate = vi.fn().mockResolvedValue({
        ok: true,
        value: { path: '.kiro/worktrees/bugs/fix-issue-1', branch: 'bugfix/fix-issue-1' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.worktreeCreate({ bugName: 'fix-issue-1' });

      expect(result.ok).toBe(true);
      // bugWorktreeCreate service derives projectPath internally via ctx.services
      expect(mockServices.bugWorktreeCreate).toHaveBeenCalledWith('fix-issue-1');
    });
  });

  // ============================================================
  // worktreeRemove
  // ============================================================

  describe('worktreeRemove', () => {
    it('should remove a bug worktree and return result', async () => {
      mockServices.bugWorktreeRemove = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.worktreeRemove({ bugName: 'fix-issue-1' });

      expect(result).toEqual({ ok: true, value: undefined });
      expect(mockServices.bugWorktreeRemove).toHaveBeenCalledWith('fix-issue-1');
    });

    it('should throw PRECONDITION_FAILED when no project is selected', async () => {
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue(null);

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.worktreeRemove({ bugName: 'fix-issue-1' }))
        .rejects.toThrow('Project not selected');
    });

    // Legacy: bugWorktreeHandlers.test.ts - worktree remove error handling
    it('should return error result when bugWorktreeRemove service returns error', async () => {
      mockServices.bugWorktreeRemove = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Worktree not found' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.worktreeRemove({ bugName: 'fix-issue-1' });

      expect(result.ok).toBe(false);
    });
  });

  // ============================================================
  // worktreeAutoExecution
  // ============================================================

  describe('worktreeAutoExecution', () => {
    it('should call bugWorktreeAutoExecution service and return result', async () => {
      mockServices.bugWorktreeAutoExecution = vi.fn().mockResolvedValue({
        ok: true,
        value: { worktreeConfig: { path: '/test/worktree' } },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.worktreeAutoExecution({ bugName: 'fix-issue-1' });

      expect(result.ok).toBe(true);
      expect(mockServices.bugWorktreeAutoExecution).toHaveBeenCalledWith('fix-issue-1');
    });

    it('should throw PRECONDITION_FAILED when no project is selected', async () => {
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue(null);

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.worktreeAutoExecution({ bugName: 'fix-issue-1' }))
        .rejects.toThrow('Project not selected');
    });

    // Legacy: bugWorktreeHandlers.ipc-contract.test.ts - auto execution error handling
    it('should return error result when bugWorktreeAutoExecution service returns error', async () => {
      mockServices.bugWorktreeAutoExecution = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Not on main branch' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.worktreeAutoExecution({ bugName: 'fix-issue-1' });

      expect(result.ok).toBe(false);
    });
  });

  // ============================================================
  // convertToWorktree
  // ============================================================

  describe('convertToWorktree', () => {
    it('should convert a bug to worktree mode and return result', async () => {
      const mockWorktreeInfo = {
        path: '/test/.kiro/worktrees/bugs/fix-issue-1',
        branch: 'bugfix/fix-issue-1',
      };
      mockServices.bugConvertToWorktree = vi.fn().mockResolvedValue({
        ok: true,
        value: mockWorktreeInfo,
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.convertToWorktree({ bugName: 'fix-issue-1' });

      expect(result).toEqual({ ok: true, value: mockWorktreeInfo });
      expect(mockServices.bugConvertToWorktree).toHaveBeenCalledWith('fix-issue-1');
    });

    it('should throw PRECONDITION_FAILED when no project is selected', async () => {
      mockServices.getCurrentProjectPath = vi.fn().mockReturnValue(null);

      const caller = createTestCaller(mockServices);
      await expect(caller.bug.convertToWorktree({ bugName: 'fix-issue-1' }))
        .rejects.toThrow('Project not selected');
    });

    // Legacy: convertWorktreeHandlers.test.ts - conversion error handling
    it('should return error result when bugConvertToWorktree service returns error', async () => {
      mockServices.bugConvertToWorktree = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', message: 'Current branch is develop, not main' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.convertToWorktree({ bugName: 'fix-issue-1' });

      expect(result.ok).toBe(false);
    });

    // Legacy: convertWorktreeHandlers.test.ts - WORKTREE_CREATE_FAILED error
    it('should return error when worktree creation fails', async () => {
      mockServices.bugConvertToWorktree = vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'WORKTREE_CREATE_FAILED', message: 'Branch already exists' },
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.convertToWorktree({ bugName: 'fix-issue-1' });

      expect(result.ok).toBe(false);
    });
  });

  // ============================================================
  // getBugsWorktreeDefault
  // ============================================================

  describe('getBugsWorktreeDefault', () => {
    it('should return bugs worktree default setting', async () => {
      (mockServices.configStore as any).getBugsWorktreeDefault = vi.fn().mockReturnValue(true);

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.getBugsWorktreeDefault();

      expect(result).toBe(true);
    });

    it('should return false when configStore is null', async () => {
      mockServices.configStore = null;

      const caller = createTestCaller(mockServices);
      const result = await caller.bug.getBugsWorktreeDefault();

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // setBugsWorktreeDefault
  // ============================================================

  describe('setBugsWorktreeDefault', () => {
    it('should set bugs worktree default setting', async () => {
      (mockServices.configStore as any).setBugsWorktreeDefault = vi.fn();

      const caller = createTestCaller(mockServices);
      await caller.bug.setBugsWorktreeDefault({ value: true });

      expect(mockServices.configStore!.setBugsWorktreeDefault).toHaveBeenCalledWith(true);
    });

    it('should do nothing when configStore is null', async () => {
      mockServices.configStore = null;

      const caller = createTestCaller(mockServices);
      // Should not throw
      await caller.bug.setBugsWorktreeDefault({ value: true });
    });
  });

  // ============================================================
  // Router registration
  // ============================================================

  describe('router registration', () => {
    it('should have bug namespace accessible from appRouter', async () => {
      const caller = createTestCaller(mockServices);
      expect(caller.bug).toBeDefined();
    });

    it('should have all 12 procedures defined', async () => {
      const caller = createTestCaller(mockServices);
      expect(typeof caller.bug.readBugs).toBe('function');
      expect(typeof caller.bug.readBugDetail).toBe('function');
      expect(typeof caller.bug.startBugsWatcher).toBe('function');
      expect(typeof caller.bug.stopBugsWatcher).toBe('function');
      expect(typeof caller.bug.executeBugCreate).toBe('function');
      expect(typeof caller.bug.phaseUpdate).toBe('function');
      expect(typeof caller.bug.worktreeCreate).toBe('function');
      expect(typeof caller.bug.worktreeRemove).toBe('function');
      expect(typeof caller.bug.worktreeAutoExecution).toBe('function');
      expect(typeof caller.bug.convertToWorktree).toBe('function');
      expect(typeof caller.bug.getBugsWorktreeDefault).toBe('function');
      expect(typeof caller.bug.setBugsWorktreeDefault).toBe('function');
    });
  });

  // ============================================================
  // Zod schema validation
  // ============================================================

  describe('Zod schema validation', () => {
    it('should export bug phase schema with valid values', async () => {
      const { bugPhaseSchema } = await import('../routers/bug');
      expect(bugPhaseSchema).toBeDefined();

      // Valid phases
      expect(bugPhaseSchema.safeParse('reported').success).toBe(true);
      expect(bugPhaseSchema.safeParse('analyzed').success).toBe(true);
      expect(bugPhaseSchema.safeParse('fixed').success).toBe(true);
      expect(bugPhaseSchema.safeParse('verified').success).toBe(true);
      expect(bugPhaseSchema.safeParse('deployed').success).toBe(true);

      // Invalid phase
      expect(bugPhaseSchema.safeParse('invalid').success).toBe(false);
    });

    it('should export readBugsInputSchema', async () => {
      const { readBugsInputSchema } = await import('../routers/bug');
      expect(readBugsInputSchema).toBeDefined();

      // Valid input
      expect(readBugsInputSchema.safeParse({ projectPath: '/test' }).success).toBe(true);

      // Invalid input: empty projectPath
      expect(readBugsInputSchema.safeParse({ projectPath: '' }).success).toBe(false);
    });

    it('should export executeBugCreateInputSchema', async () => {
      const { executeBugCreateInputSchema } = await import('../routers/bug');
      expect(executeBugCreateInputSchema).toBeDefined();

      // Valid input
      expect(executeBugCreateInputSchema.safeParse({
        projectPath: '/test',
        description: 'Fix issue',
        worktreeMode: false,
      }).success).toBe(true);

      // worktreeMode defaults to false
      const parsed = executeBugCreateInputSchema.safeParse({
        projectPath: '/test',
        description: 'Fix issue',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.worktreeMode).toBe(false);
      }

      // Invalid input: empty description
      expect(executeBugCreateInputSchema.safeParse({
        projectPath: '/test',
        description: '',
      }).success).toBe(false);
    });
  });
});
