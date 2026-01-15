/**
 * Bug Worktree IPC Handlers Tests
 * Requirements: 3.1, 3.3, 4.6, 8.5, 9.1, 9.2 (bugs-worktree-support)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  handleBugWorktreeCreate,
  handleBugWorktreeRemove,
} from './bugWorktreeHandlers';
import type { BugJson } from '../../renderer/types/bugJson';

// Mock WorktreeService
vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    createBugWorktree: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        path: '../test-project-worktrees/bugs/test-bug',
        absolutePath: '/tmp/test-project-worktrees/bugs/test-bug',
        branch: 'bugfix/test-bug',
        created_at: '2025-01-15T00:00:00Z',
      },
    }),
    removeBugWorktree: vi.fn().mockResolvedValue({
      ok: true,
      value: undefined,
    }),
  })),
}));

describe('Bug Worktree IPC Handlers', () => {
  let testDir: string;
  let bugPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bug-worktree-handler-test-${Date.now()}`);
    bugPath = join(testDir, '.kiro', 'bugs', 'test-bug');
    await mkdir(bugPath, { recursive: true });

    // Create initial bug.json
    const bugJson: BugJson = {
      bug_name: 'test-bug',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };
    await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('handleBugWorktreeCreate', () => {
    it('should create worktree and update bug.json', async () => {
      const result = await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.branch).toBe('bugfix/test-bug');
      }

      // Verify bug.json was updated with worktree field
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.worktree).toBeDefined();
      expect(parsed.worktree.branch).toBe('bugfix/test-bug');
    });
  });

  describe('handleBugWorktreeRemove', () => {
    it('should remove worktree and update bug.json', async () => {
      // First add worktree field
      const bugJsonWithWorktree: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '../test-project-worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2025-01-15T00:00:00Z',
        },
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJsonWithWorktree));

      const result = await handleBugWorktreeRemove(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(true);

      // Verify bug.json worktree field was removed
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.worktree).toBeUndefined();
    });
  });
});
