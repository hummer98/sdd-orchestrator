/**
 * Bug Service Tests
 * Requirements: 3.1, 6.1, 6.3
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.1, 11.2 (bugs-worktree-support)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BugService } from './bugService';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { BugJson, BugWorktreeConfig } from '../../renderer/types/bugJson';

describe('BugService', () => {
  let service: BugService;
  let testDir: string;

  beforeEach(async () => {
    service = new BugService();
    testDir = join(tmpdir(), `bug-service-test-${Date.now()}`);
    await mkdir(join(testDir, '.kiro', 'bugs'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('readBugs', () => {
    it('should return empty array when no bugs exist', async () => {
      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return empty array when bugs directory does not exist', async () => {
      const emptyDir = join(tmpdir(), `empty-test-${Date.now()}`);
      await mkdir(emptyDir, { recursive: true });

      try {
        const result = await service.readBugs(emptyDir);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual([]);
        }
      } finally {
        await rm(emptyDir, { recursive: true, force: true });
      }
    });

    it('should read bug with report.md as "reported" phase', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'test-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('test-bug');
        expect(result.value[0].phase).toBe('reported');
      }
    });

    it('should read bug with analysis.md as "analyzed" phase', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'analyzed-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');
      await writeFile(join(bugPath, 'analysis.md'), '# Analysis');

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].phase).toBe('analyzed');
      }
    });

    it('should read bug with fix.md as "fixed" phase', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'fixed-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');
      await writeFile(join(bugPath, 'analysis.md'), '# Analysis');
      await writeFile(join(bugPath, 'fix.md'), '# Fix');

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].phase).toBe('fixed');
      }
    });

    it('should read bug with verification.md as "verified" phase', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'verified-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');
      await writeFile(join(bugPath, 'analysis.md'), '# Analysis');
      await writeFile(join(bugPath, 'fix.md'), '# Fix');
      await writeFile(join(bugPath, 'verification.md'), '# Verification');

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].phase).toBe('verified');
      }
    });

    it('should read multiple bugs and sort by updatedAt descending', async () => {
      // Create first bug
      const bug1Path = join(testDir, '.kiro', 'bugs', 'bug-1');
      await mkdir(bug1Path, { recursive: true });
      await writeFile(join(bug1Path, 'report.md'), '# Bug 1');

      // Wait a bit and create second bug
      await new Promise((resolve) => setTimeout(resolve, 10));
      const bug2Path = join(testDir, '.kiro', 'bugs', 'bug-2');
      await mkdir(bug2Path, { recursive: true });
      await writeFile(join(bug2Path, 'report.md'), '# Bug 2');

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        // bug-2 should be first (more recent)
        expect(result.value[0].name).toBe('bug-2');
        expect(result.value[1].name).toBe('bug-1');
      }
    });

    it('should use bug.json for dates if available', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'json-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');
      await writeFile(
        join(bugPath, 'bug.json'),
        JSON.stringify({
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-06-01T00:00:00Z',
        })
      );

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].reportedAt).toBe('2024-01-01T00:00:00Z');
      }
    });
  });

  describe('readBugDetail', () => {
    it('should read bug detail with all artifacts', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'detail-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');
      await writeFile(join(bugPath, 'analysis.md'), '# Analysis');
      await writeFile(join(bugPath, 'fix.md'), '# Fix');
      await writeFile(join(bugPath, 'verification.md'), '# Verification');

      const result = await service.readBugDetail(bugPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.metadata.name).toBe('detail-bug');
        expect(result.value.metadata.phase).toBe('verified');
        expect(result.value.artifacts.report?.exists).toBe(true);
        expect(result.value.artifacts.analysis?.exists).toBe(true);
        expect(result.value.artifacts.fix?.exists).toBe(true);
        expect(result.value.artifacts.verification?.exists).toBe(true);
      }
    });

    it('should return NOT_FOUND error for non-existent bug', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'non-existent');

      const result = await service.readBugDetail(bugPath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should handle missing artifacts gracefully', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'partial-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');

      const result = await service.readBugDetail(bugPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.artifacts.report?.exists).toBe(true);
        expect(result.value.artifacts.analysis).toBeNull();
        expect(result.value.artifacts.fix).toBeNull();
        expect(result.value.artifacts.verification).toBeNull();
      }
    });
  });

  describe('readArtifact', () => {
    it('should read artifact content', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'content-bug');
      await mkdir(bugPath, { recursive: true });
      const content = '# Bug Report\n\nThis is a test bug.';
      await writeFile(join(bugPath, 'report.md'), content);

      const result = await service.readArtifact(join(bugPath, 'report.md'));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(content);
      }
    });

    it('should return NOT_FOUND error for non-existent artifact', async () => {
      const result = await service.readArtifact('/non/existent/path.md');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  // ============================================================
  // bugs-worktree-support Task 2.1: bug.json CRUD operations
  // Requirements: 1.1, 2.1, 2.2, 2.4, 2.5
  // ============================================================
  describe('createBugJson', () => {
    it('should create bug.json with correct structure', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'new-bug');
      await mkdir(bugPath, { recursive: true });

      const result = await service.createBugJson(bugPath, 'new-bug');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.bug_name).toBe('new-bug');
        expect(result.value.created_at).toBeDefined();
        expect(result.value.updated_at).toBeDefined();
        expect(result.value.worktree).toBeUndefined();
      }

      // Verify file was created
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.bug_name).toBe('new-bug');
    });

    it('should return error if directory does not exist', async () => {
      const bugPath = join(testDir, 'non-existent-dir', 'bug');
      const result = await service.createBugJson(bugPath, 'test-bug');
      expect(result.ok).toBe(false);
    });
  });

  describe('readBugJson', () => {
    it('should read existing bug.json', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'read-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'read-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.readBugJson(bugPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toBeNull();
        expect(result.value?.bug_name).toBe('read-bug');
        expect(result.value?.created_at).toBe('2025-01-15T00:00:00Z');
      }
    });

    it('should return null for non-existent bug.json', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-json-bug');
      await mkdir(bugPath, { recursive: true });

      const result = await service.readBugJson(bugPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should read bug.json with worktree field', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'worktree-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'worktree-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
        worktree: {
          path: '../project-worktrees/bugs/worktree-bug',
          branch: 'bugfix/worktree-bug',
          created_at: '2025-01-15T10:00:00Z',
        },
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.readBugJson(bugPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.worktree).toBeDefined();
        expect(result.value?.worktree?.path).toBe('../project-worktrees/bugs/worktree-bug');
        expect(result.value?.worktree?.branch).toBe('bugfix/worktree-bug');
      }
    });
  });

  describe('updateBugJsonTimestamp', () => {
    it('should update updated_at timestamp', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'timestamp-bug');
      await mkdir(bugPath, { recursive: true });
      const originalTime = '2025-01-01T00:00:00Z';
      const bugJson: BugJson = {
        bug_name: 'timestamp-bug',
        created_at: originalTime,
        updated_at: originalTime,
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.updateBugJsonTimestamp(bugPath);
      expect(result.ok).toBe(true);

      // Verify timestamp was updated
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.created_at).toBe(originalTime); // Should not change
      expect(parsed.updated_at).not.toBe(originalTime); // Should be updated
    });

    it('should preserve worktree field when updating timestamp', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'preserve-worktree-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'preserve-worktree-bug',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        worktree: {
          path: '../project-worktrees/bugs/preserve-worktree-bug',
          branch: 'bugfix/preserve-worktree-bug',
          created_at: '2025-01-01T00:00:00Z',
        },
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      await service.updateBugJsonTimestamp(bugPath);

      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.worktree).toBeDefined();
      expect(parsed.worktree.path).toBe('../project-worktrees/bugs/preserve-worktree-bug');
    });

    it('should return error if bug.json does not exist', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-json');
      await mkdir(bugPath, { recursive: true });

      const result = await service.updateBugJsonTimestamp(bugPath);
      expect(result.ok).toBe(false);
    });
  });

  // ============================================================
  // bugs-worktree-support Task 2.2: worktree field operations
  // Requirements: 2.3, 3.5, 3.7, 4.7
  // ============================================================
  describe('addWorktreeField', () => {
    it('should add worktree field to bug.json', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'add-worktree-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'add-worktree-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const worktreeConfig: BugWorktreeConfig = {
        path: '../project-worktrees/bugs/add-worktree-bug',
        branch: 'bugfix/add-worktree-bug',
        created_at: '2025-01-15T10:00:00Z',
      };

      const result = await service.addWorktreeField(bugPath, worktreeConfig);
      expect(result.ok).toBe(true);

      // Verify field was added
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.worktree).toBeDefined();
      expect(parsed.worktree.path).toBe('../project-worktrees/bugs/add-worktree-bug');
      expect(parsed.worktree.branch).toBe('bugfix/add-worktree-bug');
    });

    it('should return error if bug.json does not exist', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-json-worktree');
      await mkdir(bugPath, { recursive: true });

      const worktreeConfig: BugWorktreeConfig = {
        path: '../project-worktrees/bugs/no-json-worktree',
        branch: 'bugfix/no-json-worktree',
        created_at: '2025-01-15T10:00:00Z',
      };

      const result = await service.addWorktreeField(bugPath, worktreeConfig);
      expect(result.ok).toBe(false);
    });
  });

  describe('removeWorktreeField', () => {
    it('should remove worktree field from bug.json', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'remove-worktree-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'remove-worktree-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '../project-worktrees/bugs/remove-worktree-bug',
          branch: 'bugfix/remove-worktree-bug',
          created_at: '2025-01-15T10:00:00Z',
        },
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.removeWorktreeField(bugPath);
      expect(result.ok).toBe(true);

      // Verify field was removed
      const content = await readFile(join(bugPath, 'bug.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.worktree).toBeUndefined();
      expect(parsed.bug_name).toBe('remove-worktree-bug'); // Other fields preserved
    });

    it('should handle bug.json without worktree field gracefully', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-worktree-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'no-worktree-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.removeWorktreeField(bugPath);
      expect(result.ok).toBe(true);
    });

    it('should return error if bug.json does not exist', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-json-remove');
      await mkdir(bugPath, { recursive: true });

      const result = await service.removeWorktreeField(bugPath);
      expect(result.ok).toBe(false);
    });
  });

  // ============================================================
  // bugs-worktree-support Task 2.3: Agent cwd for worktree mode
  // Requirements: 11.1, 11.2
  // ============================================================
  describe('getAgentCwd', () => {
    it('should return worktree path when worktree field exists', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'agent-cwd-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'agent-cwd-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        worktree: {
          path: '../project-worktrees/bugs/agent-cwd-bug',
          branch: 'bugfix/agent-cwd-bug',
          created_at: '2025-01-15T10:00:00Z',
        },
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.getAgentCwd(bugPath, testDir);
      // Should resolve relative path to absolute
      expect(result).toContain('project-worktrees/bugs/agent-cwd-bug');
    });

    it('should return project path when no worktree field', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-worktree-cwd-bug');
      await mkdir(bugPath, { recursive: true });
      const bugJson: BugJson = {
        bug_name: 'no-worktree-cwd-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.getAgentCwd(bugPath, testDir);
      expect(result).toBe(testDir);
    });

    it('should return project path when bug.json does not exist', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-json-cwd-bug');
      await mkdir(bugPath, { recursive: true });

      const result = await service.getAgentCwd(bugPath, testDir);
      expect(result).toBe(testDir);
    });
  });

  // ============================================================
  // bugs-worktree-support: worktree field in BugMetadata
  // Requirements: 10.1, 10.2
  // ============================================================
  describe('readBugs with worktree', () => {
    it('should include worktree field in BugMetadata when present', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'worktree-metadata-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');
      const bugJson: BugJson = {
        bug_name: 'worktree-metadata-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
        worktree: {
          path: '../project-worktrees/bugs/worktree-metadata-bug',
          branch: 'bugfix/worktree-metadata-bug',
          created_at: '2025-01-15T10:00:00Z',
        },
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].worktree).toBeDefined();
        expect(result.value[0].worktree?.path).toBe('../project-worktrees/bugs/worktree-metadata-bug');
      }
    });

    it('should not include worktree field when not present in bug.json', async () => {
      const bugPath = join(testDir, '.kiro', 'bugs', 'no-worktree-metadata-bug');
      await mkdir(bugPath, { recursive: true });
      await writeFile(join(bugPath, 'report.md'), '# Bug Report');
      const bugJson: BugJson = {
        bug_name: 'no-worktree-metadata-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };
      await writeFile(join(bugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].worktree).toBeUndefined();
      }
    });
  });

  // ============================================================
  // bugs-worktree-directory-mode Task 3.1-3.3: Worktree bugs scanning
  // Requirements: 3.1, 3.2, 3.3 (directory mode)
  // ============================================================
  describe('readBugs with worktree directories', () => {
    it('should include bugs from worktree directories', async () => {
      // Create main project bug
      const mainBugPath = join(testDir, '.kiro', 'bugs', 'main-bug');
      await mkdir(mainBugPath, { recursive: true });
      await writeFile(join(mainBugPath, 'report.md'), '# Main Bug Report');
      const mainBugJson: BugJson = {
        bug_name: 'main-bug',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };
      await writeFile(join(mainBugPath, 'bug.json'), JSON.stringify(mainBugJson));

      // Create worktree bug: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/
      const worktreeBugName = 'worktree-bug';
      const worktreeBugPath = join(testDir, '.kiro', 'worktrees', 'bugs', worktreeBugName, '.kiro', 'bugs', worktreeBugName);
      await mkdir(worktreeBugPath, { recursive: true });
      await writeFile(join(worktreeBugPath, 'report.md'), '# Worktree Bug Report');
      await writeFile(join(worktreeBugPath, 'analysis.md'), '# Analysis');
      const worktreeBugJson: BugJson = {
        bug_name: worktreeBugName,
        created_at: '2025-01-16T00:00:00Z',
        updated_at: '2025-01-16T12:00:00Z',
      };
      await writeFile(join(worktreeBugPath, 'bug.json'), JSON.stringify(worktreeBugJson));

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        // Should find both main and worktree bugs
        const bugNames = result.value.map(b => b.name);
        expect(bugNames).toContain('main-bug');
        expect(bugNames).toContain('worktree-bug');

        // Worktree bug should have correct phase
        const worktreeBug = result.value.find(b => b.name === 'worktree-bug');
        expect(worktreeBug?.phase).toBe('analyzed');
      }
    });

    it('should give priority to main project bugs over worktree bugs with same name', async () => {
      // Create main project bug
      const bugName = 'duplicate-bug';
      const mainBugPath = join(testDir, '.kiro', 'bugs', bugName);
      await mkdir(mainBugPath, { recursive: true });
      await writeFile(join(mainBugPath, 'report.md'), '# Main Bug');
      const mainBugJson: BugJson = {
        bug_name: bugName,
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };
      await writeFile(join(mainBugPath, 'bug.json'), JSON.stringify(mainBugJson));

      // Create worktree bug with same name (should be ignored)
      const worktreeBugPath = join(testDir, '.kiro', 'worktrees', 'bugs', bugName, '.kiro', 'bugs', bugName);
      await mkdir(worktreeBugPath, { recursive: true });
      await writeFile(join(worktreeBugPath, 'report.md'), '# Worktree Bug');
      const worktreeBugJson: BugJson = {
        bug_name: bugName,
        created_at: '2025-01-16T00:00:00Z',
        updated_at: '2025-01-16T12:00:00Z',
      };
      await writeFile(join(worktreeBugPath, 'bug.json'), JSON.stringify(worktreeBugJson));

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should only have 1 bug (main takes priority)
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe(bugName);
        // spec-path-ssot-refactor: path field removed, check worktreeBasePath instead
        // Main bugs have no worktreeBasePath
        expect(result.value[0].worktreeBasePath).toBeUndefined();
      }
    });

    it('should skip worktree directories without valid bug path structure', async () => {
      // Create worktree directory without proper bug structure
      const invalidWorktreePath = join(testDir, '.kiro', 'worktrees', 'bugs', 'invalid-worktree');
      await mkdir(invalidWorktreePath, { recursive: true });
      // No .kiro/bugs/{bugName}/ directory inside

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should work when no worktree bugs directory exists', async () => {
      // Only main bugs, no worktrees/bugs/ directory
      const mainBugPath = join(testDir, '.kiro', 'bugs', 'solo-bug');
      await mkdir(mainBugPath, { recursive: true });
      await writeFile(join(mainBugPath, 'report.md'), '# Solo Bug');

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('solo-bug');
      }
    });

    it('should set worktreeBasePath for worktree bugs', async () => {
      // Create worktree bug
      const worktreeBugName = 'worktree-path-bug';
      const worktreeBugPath = join(testDir, '.kiro', 'worktrees', 'bugs', worktreeBugName, '.kiro', 'bugs', worktreeBugName);
      await mkdir(worktreeBugPath, { recursive: true });
      await writeFile(join(worktreeBugPath, 'report.md'), '# Bug Report');
      const bugJson: BugJson = {
        bug_name: worktreeBugName,
        created_at: '2025-01-16T00:00:00Z',
        updated_at: '2025-01-16T12:00:00Z',
      };
      await writeFile(join(worktreeBugPath, 'bug.json'), JSON.stringify(bugJson));

      const result = await service.readBugs(testDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].worktreeBasePath).toBe(`.kiro/worktrees/bugs/${worktreeBugName}`);
      }
    });
  });

  // ============================================================
  // bugs-worktree-directory-mode Task 5.2-5.3: Copy bug files to worktree
  // Requirements: 6.2, 6.3
  // ============================================================
  describe('copyBugToWorktree', () => {
    it('should copy bug files from main to worktree', async () => {
      // Create source bug in main
      const bugName = 'copy-test-bug';
      const mainBugPath = join(testDir, '.kiro', 'bugs', bugName);
      await mkdir(mainBugPath, { recursive: true });
      await writeFile(join(mainBugPath, 'report.md'), '# Bug Report\n\nTest content');
      await writeFile(join(mainBugPath, 'analysis.md'), '# Analysis\n\nTest analysis');
      const bugJson: BugJson = {
        bug_name: bugName,
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };
      await writeFile(join(mainBugPath, 'bug.json'), JSON.stringify(bugJson));

      // Create worktree directory (simulating worktree creation)
      const worktreeBugPath = join(testDir, '.kiro', 'worktrees', 'bugs', bugName, '.kiro', 'bugs', bugName);
      await mkdir(join(testDir, '.kiro', 'worktrees', 'bugs', bugName, '.kiro', 'bugs'), { recursive: true });

      // Copy bug files
      const result = await service.copyBugToWorktree(mainBugPath, worktreeBugPath, bugName);
      expect(result.ok).toBe(true);

      // Verify files were copied
      const copiedReport = await readFile(join(worktreeBugPath, 'report.md'), 'utf-8');
      expect(copiedReport).toBe('# Bug Report\n\nTest content');

      const copiedAnalysis = await readFile(join(worktreeBugPath, 'analysis.md'), 'utf-8');
      expect(copiedAnalysis).toBe('# Analysis\n\nTest analysis');

      // Verify bug.json was copied and has worktree field added
      const copiedBugJson = JSON.parse(await readFile(join(worktreeBugPath, 'bug.json'), 'utf-8'));
      expect(copiedBugJson.bug_name).toBe(bugName);
    });

    it('should handle missing source directory', async () => {
      const nonExistentPath = join(testDir, '.kiro', 'bugs', 'non-existent');
      const worktreePath = join(testDir, '.kiro', 'worktrees', 'bugs', 'test', '.kiro', 'bugs', 'test');

      const result = await service.copyBugToWorktree(nonExistentPath, worktreePath, 'test');
      expect(result.ok).toBe(false);
    });
  });
});
