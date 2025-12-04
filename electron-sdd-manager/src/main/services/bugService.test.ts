/**
 * Bug Service Tests
 * Requirements: 3.1, 6.1, 6.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BugService } from './bugService';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

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
});
