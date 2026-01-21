/**
 * Bug Worktree IPC Handlers Tests
 * Requirements: 3.1, 3.3, 4.6, 8.5, 9.1, 9.2 (bugs-worktree-support)
 * Requirements: 6.1-6.5, 7.1-7.3 (bugs-worktree-directory-mode)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  handleBugWorktreeCreate,
  handleBugWorktreeRemove,
} from './bugWorktreeHandlers';
import type { BugJson } from '../../renderer/types/bugJson';

// Unmock this module to test the actual implementation
vi.unmock('./bugWorktreeHandlers');

// Mock WorktreeService with new directory mode methods
vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation((projectPath: string) => ({
    createEntityWorktree: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        path: `.kiro/worktrees/bugs/test-bug`,
        absolutePath: `${projectPath}/.kiro/worktrees/bugs/test-bug`,
        branch: 'bugfix/test-bug',
        created_at: '2025-01-15T00:00:00Z',
      },
    }),
    removeEntityWorktree: vi.fn().mockResolvedValue({
      ok: true,
      value: undefined,
    }),
    // Legacy methods (kept for backward compatibility)
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
  let worktreeBugPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bug-worktree-handler-test-${Date.now()}`);
    bugPath = join(testDir, '.kiro', 'bugs', 'test-bug');
    // Worktree bug path: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/
    worktreeBugPath = join(testDir, '.kiro', 'worktrees', 'bugs', 'test-bug', '.kiro', 'bugs', 'test-bug');
    await mkdir(bugPath, { recursive: true });

    // Create initial bug.json in main project
    const bugJson: BugJson = {
      bug_name: 'test-bug',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };
    await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

    // Also create report.md to verify copy
    await writeFile(join(bugPath, 'report.md'), '# Bug Report\n\nTest bug report content');
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
    it('should create worktree and copy bug files to worktree directory', async () => {
      const result = await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.branch).toBe('bugfix/test-bug');
      }

      // Verify bug files were copied to worktree
      const worktreeBugJsonPath = join(worktreeBugPath, 'bug.json');
      const content = await readFile(worktreeBugJsonPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Worktree field should be added to bug.json INSIDE worktree (not main)
      expect(parsed.worktree).toBeDefined();
      expect(parsed.worktree.branch).toBe('bugfix/test-bug');
      expect(parsed.worktree.path).toBe('.kiro/worktrees/bugs/test-bug');

      // Verify report.md was also copied
      const reportPath = join(worktreeBugPath, 'report.md');
      await expect(access(reportPath)).resolves.toBeUndefined();

      // Verify main bug.json was NOT modified (directory mode invariant)
      const mainContent = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const mainParsed = JSON.parse(mainContent);
      expect(mainParsed.worktree).toBeUndefined();
    });
  });

  describe('handleBugWorktreeRemove', () => {
    it('should remove worktree without modifying main bug.json', async () => {
      // Create worktree directory structure to simulate existing worktree
      await mkdir(worktreeBugPath, { recursive: true });
      const worktreeBugJson: BugJson = {
        bug_name: 'test-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '.kiro/worktrees/bugs/test-bug',
          branch: 'bugfix/test-bug',
          created_at: '2025-01-15T00:00:00Z',
        },
      };
      await writeFile(join(worktreeBugPath, 'bug.json'), JSON.stringify(worktreeBugJson));

      const result = await handleBugWorktreeRemove(testDir, bugPath, 'test-bug');

      expect(result.ok).toBe(true);

      // Verify main bug.json was NOT modified (no worktree field in directory mode)
      const mainContent = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const mainParsed = JSON.parse(mainContent);
      expect(mainParsed.worktree).toBeUndefined();
    });
  });
});
