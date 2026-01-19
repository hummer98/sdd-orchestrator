/**
 * Tests for worktreeHelpers
 * Requirements: 8.1, 8.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import {
  getWorktreeBasePath,
  getWorktreeEntityPath,
  scanWorktreeEntities,
  FileSystemInterface,
} from './worktreeHelpers';

describe('worktreeHelpers', () => {
  const projectPath = '/Users/test/project';

  describe('getWorktreeBasePath', () => {
    it('should return correct path for specs type', () => {
      const result = getWorktreeBasePath(projectPath, 'specs', 'my-feature');

      expect(result.relative).toBe('.kiro/worktrees/specs/my-feature');
      expect(result.absolute).toBe(path.resolve(projectPath, '.kiro/worktrees/specs/my-feature'));
    });

    it('should return correct path for bugs type', () => {
      const result = getWorktreeBasePath(projectPath, 'bugs', 'my-bug');

      expect(result.relative).toBe('.kiro/worktrees/bugs/my-bug');
      expect(result.absolute).toBe(path.resolve(projectPath, '.kiro/worktrees/bugs/my-bug'));
    });
  });

  describe('getWorktreeEntityPath', () => {
    it('should return correct path for specs type', () => {
      const result = getWorktreeEntityPath(projectPath, 'specs', 'my-feature');

      expect(result.relative).toBe('.kiro/worktrees/specs/my-feature/.kiro/specs/my-feature');
      expect(result.absolute).toBe(
        path.resolve(projectPath, '.kiro/worktrees/specs/my-feature/.kiro/specs/my-feature')
      );
    });

    it('should return correct path for bugs type', () => {
      const result = getWorktreeEntityPath(projectPath, 'bugs', 'my-bug');

      expect(result.relative).toBe('.kiro/worktrees/bugs/my-bug/.kiro/bugs/my-bug');
      expect(result.absolute).toBe(
        path.resolve(projectPath, '.kiro/worktrees/bugs/my-bug/.kiro/bugs/my-bug')
      );
    });
  });

  describe('scanWorktreeEntities', () => {
    let mockFs: FileSystemInterface;

    beforeEach(() => {
      mockFs = {
        readdir: vi.fn(),
        access: vi.fn(),
      };
    });

    it('should return empty array when worktrees directory does not exist', async () => {
      vi.mocked(mockFs.access).mockRejectedValue(new Error('ENOENT'));

      const result = await scanWorktreeEntities(projectPath, 'specs', mockFs);

      expect(result).toEqual([]);
    });

    it('should return empty array when worktrees directory is empty', async () => {
      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.readdir).mockResolvedValue([]);

      const result = await scanWorktreeEntities(projectPath, 'specs', mockFs);

      expect(result).toEqual([]);
    });

    it('should scan and return worktree entities for specs type', async () => {
      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'feature-a', isDirectory: () => true },
        { name: 'feature-b', isDirectory: () => true },
        { name: 'some-file.txt', isDirectory: () => false },
      ] as any);

      const result = await scanWorktreeEntities(projectPath, 'specs', mockFs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'feature-a',
        path: path.resolve(projectPath, '.kiro/worktrees/specs/feature-a/.kiro/specs/feature-a'),
        worktreeBasePath: '.kiro/worktrees/specs/feature-a',
      });
      expect(result[1]).toEqual({
        name: 'feature-b',
        path: path.resolve(projectPath, '.kiro/worktrees/specs/feature-b/.kiro/specs/feature-b'),
        worktreeBasePath: '.kiro/worktrees/specs/feature-b',
      });
    });

    it('should scan and return worktree entities for bugs type', async () => {
      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'bug-fix-1', isDirectory: () => true },
      ] as any);

      const result = await scanWorktreeEntities(projectPath, 'bugs', mockFs);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'bug-fix-1',
        path: path.resolve(projectPath, '.kiro/worktrees/bugs/bug-fix-1/.kiro/bugs/bug-fix-1'),
        worktreeBasePath: '.kiro/worktrees/bugs/bug-fix-1',
      });
    });

    it('should skip worktree directories where entity path does not exist', async () => {
      // First call succeeds (worktrees base dir exists)
      // Second call fails (entity path doesn't exist inside worktree)
      vi.mocked(mockFs.access)
        .mockResolvedValueOnce(undefined) // worktrees/specs exists
        .mockRejectedValueOnce(new Error('ENOENT')); // feature-a/.kiro/specs/feature-a doesn't exist

      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'feature-a', isDirectory: () => true },
      ] as any);

      const result = await scanWorktreeEntities(projectPath, 'specs', mockFs);

      expect(result).toEqual([]);
    });

    it('should only include directories with valid entity paths', async () => {
      vi.mocked(mockFs.access)
        .mockResolvedValueOnce(undefined) // worktrees/specs exists
        .mockRejectedValueOnce(new Error('ENOENT')) // feature-a doesn't have valid entity
        .mockResolvedValueOnce(undefined); // feature-b has valid entity

      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'feature-a', isDirectory: () => true },
        { name: 'feature-b', isDirectory: () => true },
      ] as any);

      const result = await scanWorktreeEntities(projectPath, 'specs', mockFs);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('feature-b');
    });
  });
});
