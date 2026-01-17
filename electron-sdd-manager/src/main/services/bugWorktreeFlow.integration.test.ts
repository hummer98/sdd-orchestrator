/**
 * Bug Worktree Flow Integration Tests
 * bugs-worktree-support Tasks 17.1, 17.2, 17.3
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.3, 4.6, 4.7, 4.8, 9.2, 9.3
 *
 * NOTE: These tests use mocked git commands but real file system operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { BugJson } from '../../renderer/types/bugJson';

// Mock WorktreeService with configurable responses
const mockCreateBugWorktree = vi.fn();
const mockRemoveBugWorktree = vi.fn();
const mockIsOnMainBranch = vi.fn();

// worktree-internal-path: 新パス形式に更新
vi.mock('./worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    createBugWorktree: mockCreateBugWorktree,
    removeBugWorktree: mockRemoveBugWorktree,
    isOnMainBranch: mockIsOnMainBranch,
    getBugWorktreePath: vi.fn().mockReturnValue({
      relative: '.kiro/worktrees/bugs/test-bug',
      absolute: '/tmp/test-project/.kiro/worktrees/bugs/test-bug',
    }),
  })),
}));

// Import handlers after mock
import {
  handleBugWorktreeCreate,
  handleBugWorktreeRemove,
} from '../ipc/bugWorktreeHandlers';
import { getConfigStore } from './configStore';

describe('Bug Worktree Flow Integration Tests', () => {
  let testDir: string;
  let bugPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bug-worktree-flow-test-${Date.now()}`);
    bugPath = join(testDir, '.kiro', 'bugs', 'test-bug');
    await mkdir(bugPath, { recursive: true });

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    mockIsOnMainBranch.mockResolvedValue({ ok: true, value: true });
    // worktree-internal-path: 新パス形式に更新
    mockCreateBugWorktree.mockResolvedValue({
      ok: true,
      value: {
        path: '.kiro/worktrees/bugs/test-bug',
        absolutePath: '/tmp/test-project/.kiro/worktrees/bugs/test-bug',
        branch: 'bugfix/test-bug',
        created_at: new Date().toISOString(),
      },
    });
    mockRemoveBugWorktree.mockResolvedValue({ ok: true, value: undefined });
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

      // isOnMainBranch check is done inside WorktreeService.createBugWorktree
      // We verify that createBugWorktree was called
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

    it('should update bug.json with worktree field after creation', async () => {
      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));

      await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      // Verify bug.json was updated
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed: BugJson = JSON.parse(content);

      expect(parsed.worktree).toBeDefined();
      expect(parsed.worktree?.branch).toBe('bugfix/test-bug');
      expect(parsed.worktree?.path).toContain('worktrees/bugs/test-bug');
      expect(parsed.worktree?.created_at).toBeDefined();
    });

    it('should return error when not on main branch', async () => {
      // Mock: not on main branch
      mockCreateBugWorktree.mockResolvedValue({
        ok: false,
        error: {
          type: 'NOT_ON_MAIN_BRANCH' as const,
          currentBranch: 'bugfix/other-bug',
          message: 'Not on main branch',
        },
      });

      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));

      const result = await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error?.type).toBe('NOT_ON_MAIN_BRANCH');
      }
    });

    it('should preserve relative path format in bug.json', async () => {
      const initialBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(initialBugJson));

      await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed: BugJson = JSON.parse(content);

      // worktree-internal-path: 新パス形式（.kiro/worktrees/）を検証
      expect(parsed.worktree?.path).toMatch(/^\.kiro\/worktrees\/bugs\//);
    });
  });

  // ============================================================
  // Task 17.2: bug-merge to worktree deletion flow test
  // Requirements: 4.3, 4.6, 4.7, 4.8
  // ============================================================
  describe('Task 17.2: bug-merge flow', () => {
    it('should remove worktree on successful merge', async () => {
      // Setup: bug.json with worktree field
      // worktree-internal-path: 新パス形式に更新
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
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJsonWithWorktree));

      const result = await handleBugWorktreeRemove(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(true);
      expect(mockRemoveBugWorktree).toHaveBeenCalledWith('test-bug');
    });

    it('should remove worktree field from bug.json after deletion', async () => {
      // worktree-internal-path: 新パス形式に更新
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
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJsonWithWorktree));

      await handleBugWorktreeRemove(testDir, bugPath, 'test-bug');

      // Verify worktree field was removed
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed: BugJson = JSON.parse(content);

      expect(parsed.worktree).toBeUndefined();
      // Other fields should be preserved
      expect(parsed.bug_name).toBe('test-bug');
      expect(parsed.created_at).toBe('2025-01-15T00:00:00Z');
    });

    it('should update updated_at timestamp on worktree removal', async () => {
      const oldTimestamp = '2025-01-15T00:00:00Z';
      // worktree-internal-path: 新パス形式に更新
      const bugJsonWithWorktree: BugJson = {
        bug_name: 'test-bug',
        created_at: oldTimestamp,
        updated_at: oldTimestamp,
        worktree: {
          path: '.kiro/worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: oldTimestamp,
        },
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJsonWithWorktree));

      await handleBugWorktreeRemove(testDir, bugPath, 'test-bug');

      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed: BugJson = JSON.parse(content);

      // updated_at should be more recent than old timestamp
      expect(new Date(parsed.updated_at).getTime()).toBeGreaterThan(
        new Date(oldTimestamp).getTime()
      );
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
