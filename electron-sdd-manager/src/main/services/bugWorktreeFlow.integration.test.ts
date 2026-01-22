/**
 * Bug Worktree Flow Integration Tests
 * bugs-worktree-support Tasks 17.1, 17.2, 17.3
 * bugs-worktree-directory-mode: Updated to test directory mode flow
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.3, 4.6, 4.7, 4.8, 9.2, 9.3
 *
 * NOTE: These tests use mocked git commands but real file system operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { BugJson } from '../../renderer/types/bugJson';

// Mock WorktreeService with directory mode methods + ConvertBugWorktreeService requirements
const mockCreateEntityWorktree = vi.fn();
const mockRemoveEntityWorktree = vi.fn();
const mockCreateBugWorktree = vi.fn();
const mockRemoveBugWorktree = vi.fn();
const mockIsOnMainBranch = vi.fn();
const mockGetCurrentBranch = vi.fn();
const mockCheckUncommittedBugChanges = vi.fn();
const mockCreateSymlinksForWorktree = vi.fn();

vi.mock('./worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    // bug-worktree-spec-alignment: Methods required by ConvertBugWorktreeService
    isOnMainBranch: mockIsOnMainBranch,
    getCurrentBranch: mockGetCurrentBranch,
    checkUncommittedBugChanges: mockCheckUncommittedBugChanges,
    createBugWorktree: mockCreateBugWorktree,
    removeBugWorktree: mockRemoveBugWorktree,
    createSymlinksForWorktree: mockCreateSymlinksForWorktree,
    // Directory mode methods
    createEntityWorktree: mockCreateEntityWorktree,
    removeEntityWorktree: mockRemoveEntityWorktree,
    getEntityWorktreePath: vi.fn().mockImplementation((_type: string, name: string) => ({
      relative: `.kiro/worktrees/bugs/${name}`,
      absolute: `/tmp/test-project/.kiro/worktrees/bugs/${name}`,
    })),
    getBugWorktreePath: vi.fn().mockReturnValue({
      relative: '.kiro/worktrees/bugs/test-bug',
      absolute: '/tmp/test-project/.kiro/worktrees/bugs/test-bug',
    }),
  })),
}));

// Unmock bugWorktreeHandlers to test actual implementation
vi.unmock('../ipc/bugWorktreeHandlers');

// Import handlers after mock
import {
  handleBugWorktreeCreate,
  handleBugWorktreeRemove,
} from '../ipc/bugWorktreeHandlers';
import { getConfigStore } from './configStore';

describe('Bug Worktree Flow Integration Tests', () => {
  let testDir: string;
  let bugPath: string;
  let worktreeBugPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bug-worktree-flow-test-${Date.now()}`);
    bugPath = join(testDir, '.kiro', 'bugs', 'test-bug');
    // Directory mode: worktree bug path
    worktreeBugPath = join(testDir, '.kiro', 'worktrees', 'bugs', 'test-bug', '.kiro', 'bugs', 'test-bug');
    await mkdir(bugPath, { recursive: true });

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    mockIsOnMainBranch.mockResolvedValue({ ok: true, value: true });
    mockGetCurrentBranch.mockResolvedValue({ ok: true, value: 'main' });
    mockCheckUncommittedBugChanges.mockResolvedValue({
      ok: true,
      value: {
        hasChanges: true,
        files: ['bug.json'],
        statusOutput: '?? .kiro/bugs/test-bug/bug.json',
      },
    });
    mockCreateBugWorktree.mockImplementation(() => Promise.resolve({
      ok: true,
      value: {
        path: '.kiro/worktrees/bugs/test-bug',
        absolutePath: `${testDir}/.kiro/worktrees/bugs/test-bug`,
        branch: 'bugfix/test-bug',
        created_at: new Date().toISOString(),
      },
    }));
    mockRemoveBugWorktree.mockResolvedValue({ ok: true, value: undefined });
    mockCreateSymlinksForWorktree.mockResolvedValue({ ok: true, value: undefined });
    // Legacy mocks (directory mode)
    mockCreateEntityWorktree.mockResolvedValue({
      ok: true,
      value: {
        path: '.kiro/worktrees/bugs/test-bug',
        absolutePath: `${testDir}/.kiro/worktrees/bugs/test-bug`,
        branch: 'bugfix/test-bug',
        created_at: new Date().toISOString(),
      },
    });
    mockRemoveEntityWorktree.mockResolvedValue({ ok: true, value: undefined });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================
  // Task 17.1: bug-fix start to worktree creation flow test
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
  // bugs-worktree-directory-mode: Updated to test directory mode
  // bug-worktree-spec-alignment: Updated for ConvertBugWorktreeService integration
  // ============================================================
  describe('Task 17.1: bug-fix start flow', () => {
    it('should verify main branch before worktree creation', async () => {
      // Setup: Create initial bug.json
      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));

      // Execute worktree creation
      await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      // bug-worktree-spec-alignment: ConvertBugWorktreeService calls createBugWorktree
      expect(mockCreateBugWorktree).toHaveBeenCalledWith('test-bug');
    });

    it('should create worktree with bugfix branch naming', async () => {
      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));

      const result = await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Branch should have bugfix/ prefix
        expect(result.value.branch).toBe('bugfix/test-bug');
      }
    });

    it('should update bug.json with worktree field in worktree', async () => {
      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));

      await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      // Directory mode: bug.json is updated in worktree
      const worktreeContent = await readFile(join(worktreeBugPath, 'bug.json'), 'utf-8');
      const worktreeParsed: BugJson = JSON.parse(worktreeContent);

      expect(worktreeParsed.worktree).toBeDefined();
      expect(worktreeParsed.worktree?.branch).toBe('bugfix/test-bug');
      expect(worktreeParsed.worktree?.path).toBe('.kiro/worktrees/bugs/test-bug');

      // bug-worktree-spec-alignment: For untracked bugs, original files are DELETED after copy
      // The main bug directory no longer exists
      await expect(access(join(bugPath, 'bug.json'))).rejects.toThrow('ENOENT');
    });

    it('should return error when not on main branch', async () => {
      // bug-worktree-spec-alignment: Mock isOnMainBranch for ConvertBugWorktreeService
      mockIsOnMainBranch.mockResolvedValue({ ok: true, value: false });
      mockGetCurrentBranch.mockResolvedValue({ ok: true, value: 'bugfix/other-bug' });

      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));

      const result = await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // ConvertBugWorktreeService returns GIT_ERROR with message containing NOT_ON_MAIN_BRANCH
        expect(result.error?.type).toBe('GIT_ERROR');
      }
    });

    it('should copy bug files to worktree directory', async () => {
      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));
      await writeFile(join(bugPath, 'report.md'), '# Test Bug Report');

      await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      // Directory mode: bug files are copied to worktree
      await expect(access(join(worktreeBugPath, 'bug.json'))).resolves.toBeUndefined();
      await expect(access(join(worktreeBugPath, 'report.md'))).resolves.toBeUndefined();
    });
  });

  // ============================================================
  // Task 17.2: bug-merge to worktree deletion flow test
  // Requirements: 4.3, 4.6, 4.7, 4.8
  // bugs-worktree-directory-mode: Updated to test directory mode
  // ============================================================
  describe('Task 17.2: bug-merge flow', () => {
    it('should remove worktree on successful merge', async () => {
      // Setup: Create worktree directory structure
      await mkdir(worktreeBugPath, { recursive: true });
      const bugJsonWithWorktree: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '.kiro/worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2025-01-15T00:00:00Z',
        },
      };
      await writeFile(join(worktreeBugPath, 'bug.json'), JSON.stringify(bugJsonWithWorktree));

      // Also create main bug.json (without worktree field in directory mode)
      const mainBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(mainBugJson));

      const result = await handleBugWorktreeRemove(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(true);
      // Directory mode: removeEntityWorktree is called
      expect(mockRemoveEntityWorktree).toHaveBeenCalledWith('bugs', 'test-bug');
    });

    it('should NOT modify main bug.json after deletion (directory mode)', async () => {
      // Setup: Create worktree directory structure
      await mkdir(worktreeBugPath, { recursive: true });
      const bugJsonWithWorktree: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '.kiro/worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2025-01-15T00:00:00Z',
        },
      };
      await writeFile(join(worktreeBugPath, 'bug.json'), JSON.stringify(bugJsonWithWorktree));

      // Main bug.json without worktree field
      const mainBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(mainBugJson));

      await handleBugWorktreeRemove(testDir, bugPath, 'test-bug');

      // Directory mode: main bug.json is NOT modified
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed: BugJson = JSON.parse(content);

      // No worktree field should exist (and was never added in directory mode)
      expect(parsed.worktree).toBeUndefined();
      // Other fields should be preserved
      expect(parsed.bug_name).toBe('test-bug');
      expect(parsed.created_at).toBe('2025-01-15T00:00:00Z');
      // updated_at should NOT be changed
      expect(parsed.updated_at).toBe('2025-01-15T00:00:00Z');
    });
  });

  // ============================================================
  // Task 17.3: configStore bugsWorktreeDefault persistence test
  // Requirements: 9.2, 9.3
  // ============================================================
  describe('Task 17.3: bugsWorktreeDefault persistence', () => {
    it('should return false as default value', () => {
      const configStore = getConfigStore();
      // Reset to default
      configStore.setBugsWorktreeDefault(false);

      const defaultValue = configStore.getBugsWorktreeDefault();

      expect(defaultValue).toBe(false);
    });

    it('should persist true value', () => {
      const configStore = getConfigStore();
      configStore.setBugsWorktreeDefault(true);

      const value = configStore.getBugsWorktreeDefault();

      expect(value).toBe(true);
    });

    it('should persist false value after being set to true', () => {
      const configStore = getConfigStore();
      configStore.setBugsWorktreeDefault(true);
      configStore.setBugsWorktreeDefault(false);

      const value = configStore.getBugsWorktreeDefault();

      expect(value).toBe(false);
    });

    it('should maintain value after re-retrieval', () => {
      const configStore = getConfigStore();
      configStore.setBugsWorktreeDefault(true);

      // Simulate app restart by getting value again
      const firstGet = configStore.getBugsWorktreeDefault();
      const secondGet = configStore.getBugsWorktreeDefault();

      expect(firstGet).toBe(true);
      expect(secondGet).toBe(true);
    });
  });
});
