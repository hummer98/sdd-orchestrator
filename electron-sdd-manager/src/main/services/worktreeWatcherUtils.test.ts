/**
 * worktreeWatcherUtils Unit Tests
 * TDD: Testing 2-tier watcher utility functions
 * spec-path-ssot-refactor Task 2.1, 2.2
 * Requirements: 4.1, 4.3
 */

import { describe, it, expect } from 'vitest';
import {
  detectWorktreeAddition,
  buildWorktreeEntityPath,
  extractEntityName,
} from './worktreeWatcherUtils';
import * as path from 'path';

describe('worktreeWatcherUtils', () => {
  const projectPath = '/test/project';

  describe('detectWorktreeAddition', () => {
    it('should detect specs worktree addition and return entity name', () => {
      const basePath = path.join(projectPath, '.kiro', 'worktrees', 'specs');
      const dirPath = path.join(basePath, 'my-feature');

      const result = detectWorktreeAddition(basePath, dirPath);

      expect(result).toBe('my-feature');
    });

    it('should detect bugs worktree addition and return entity name', () => {
      const basePath = path.join(projectPath, '.kiro', 'worktrees', 'bugs');
      const dirPath = path.join(basePath, 'my-bug');

      const result = detectWorktreeAddition(basePath, dirPath);

      expect(result).toBe('my-bug');
    });

    it('should return null for non-matching path (nested path)', () => {
      const basePath = path.join(projectPath, '.kiro', 'worktrees', 'specs');
      // Nested path inside worktree should not match
      const dirPath = path.join(basePath, 'my-feature', '.kiro', 'specs', 'my-feature');

      const result = detectWorktreeAddition(basePath, dirPath);

      expect(result).toBeNull();
    });

    it('should return null for path outside base', () => {
      const basePath = path.join(projectPath, '.kiro', 'worktrees', 'specs');
      const dirPath = path.join(projectPath, '.kiro', 'specs', 'my-feature');

      const result = detectWorktreeAddition(basePath, dirPath);

      expect(result).toBeNull();
    });

    it('should return null for base path itself', () => {
      const basePath = path.join(projectPath, '.kiro', 'worktrees', 'specs');
      const dirPath = basePath;

      const result = detectWorktreeAddition(basePath, dirPath);

      expect(result).toBeNull();
    });
  });

  describe('buildWorktreeEntityPath', () => {
    it('should build specs worktree entity path', () => {
      const result = buildWorktreeEntityPath(projectPath, 'specs', 'my-feature');

      expect(result).toBe(path.join(projectPath, '.kiro', 'worktrees', 'specs', 'my-feature', '.kiro', 'specs', 'my-feature'));
    });

    it('should build bugs worktree entity path', () => {
      const result = buildWorktreeEntityPath(projectPath, 'bugs', 'my-bug');

      expect(result).toBe(path.join(projectPath, '.kiro', 'worktrees', 'bugs', 'my-bug', '.kiro', 'bugs', 'my-bug'));
    });
  });

  describe('extractEntityName', () => {
    describe('from main path', () => {
      it('should extract spec name from main spec path', () => {
        const filePath = path.join(projectPath, '.kiro', 'specs', 'my-feature', 'spec.json');

        const result = extractEntityName(projectPath, 'specs', filePath);

        expect(result).toBe('my-feature');
      });

      it('should extract bug name from main bug path', () => {
        const filePath = path.join(projectPath, '.kiro', 'bugs', 'my-bug', 'bug.json');

        const result = extractEntityName(projectPath, 'bugs', filePath);

        expect(result).toBe('my-bug');
      });

      it('should extract name from nested file in main path', () => {
        const filePath = path.join(projectPath, '.kiro', 'specs', 'my-feature', 'requirements.md');

        const result = extractEntityName(projectPath, 'specs', filePath);

        expect(result).toBe('my-feature');
      });
    });

    describe('from worktree path', () => {
      it('should extract spec name from worktree spec path', () => {
        const filePath = path.join(
          projectPath,
          '.kiro',
          'worktrees',
          'specs',
          'my-feature',
          '.kiro',
          'specs',
          'my-feature',
          'spec.json'
        );

        const result = extractEntityName(projectPath, 'specs', filePath);

        expect(result).toBe('my-feature');
      });

      it('should extract bug name from worktree bug path', () => {
        const filePath = path.join(
          projectPath,
          '.kiro',
          'worktrees',
          'bugs',
          'my-bug',
          '.kiro',
          'bugs',
          'my-bug',
          'bug.json'
        );

        const result = extractEntityName(projectPath, 'bugs', filePath);

        expect(result).toBe('my-bug');
      });

      it('should extract name from nested file in worktree path', () => {
        const filePath = path.join(
          projectPath,
          '.kiro',
          'worktrees',
          'specs',
          'my-feature',
          '.kiro',
          'specs',
          'my-feature',
          'design.md'
        );

        const result = extractEntityName(projectPath, 'specs', filePath);

        expect(result).toBe('my-feature');
      });
    });

    describe('edge cases', () => {
      it('should return undefined for unrelated path', () => {
        const filePath = path.join(projectPath, 'src', 'main.ts');

        const result = extractEntityName(projectPath, 'specs', filePath);

        expect(result).toBeUndefined();
      });

      it('should return undefined for path outside project', () => {
        const filePath = '/other/project/.kiro/specs/my-feature/spec.json';

        const result = extractEntityName(projectPath, 'specs', filePath);

        expect(result).toBeUndefined();
      });

      it('should return undefined for worktree base directory itself', () => {
        const filePath = path.join(projectPath, '.kiro', 'worktrees', 'specs', 'my-feature');

        const result = extractEntityName(projectPath, 'specs', filePath);

        // Should not match - this is worktree base, not entity path
        expect(result).toBeUndefined();
      });
    });
  });
});
