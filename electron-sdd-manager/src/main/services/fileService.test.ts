/**
 * FileService Unit Tests
 * TDD: Testing path validation, directory traversal prevention, spec operations
 * Requirements: 13.4, 13.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileService, validatePath, isPathSafe } from './fileService';

describe('Path Validation', () => {
  describe('isPathSafe', () => {
    it('should allow paths within base directory', () => {
      expect(isPathSafe('/Users/test/project', '/Users/test/project/.kiro')).toBe(true);
      expect(isPathSafe('/Users/test/project', '/Users/test/project/src/file.ts')).toBe(true);
    });

    it('should reject paths outside base directory', () => {
      expect(isPathSafe('/Users/test/project', '/Users/test/other')).toBe(false);
      expect(isPathSafe('/Users/test/project', '/etc/passwd')).toBe(false);
    });

    it('should reject directory traversal attempts', () => {
      expect(isPathSafe('/Users/test/project', '/Users/test/project/../other')).toBe(false);
      expect(isPathSafe('/Users/test/project', '/Users/test/project/../../etc/passwd')).toBe(false);
    });

    it('should handle normalized paths correctly', () => {
      // Even though the path looks valid before normalization
      expect(isPathSafe('/Users/test/project', '/Users/test/project/./safe')).toBe(true);
    });
  });

  describe('validatePath', () => {
    it('should return ok for valid paths', () => {
      const result = validatePath('/Users/test/project', '/Users/test/project/.kiro');
      expect(result.ok).toBe(true);
    });

    it('should return error for invalid paths', () => {
      const result = validatePath('/Users/test/project', '/etc/passwd');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PATH');
      }
    });

    it('should return error for directory traversal', () => {
      const result = validatePath('/Users/test/project', '/Users/test/project/../../../etc/passwd');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PATH');
        if ('reason' in result.error) {
          expect(result.error.reason).toContain('traversal');
        }
      }
    });
  });
});

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    fileService = new FileService();
  });

  describe('validateKiroDirectory', () => {
    it('should return validation result with exists flag', async () => {
      // This test uses the actual file system
      // In real scenarios, mock fs/promises
      const result = await fileService.validateKiroDirectory('/nonexistent/path');
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('hasSpecs');
      expect(result).toHaveProperty('hasSteering');
    });
  });

  describe('spec name validation', () => {
    it('should validate spec names correctly', () => {
      // Valid names
      expect(fileService.isValidSpecName('my-feature')).toBe(true);
      expect(fileService.isValidSpecName('feature123')).toBe(true);
      expect(fileService.isValidSpecName('test-spec-name')).toBe(true);

      // Invalid names
      expect(fileService.isValidSpecName('MyFeature')).toBe(false); // uppercase
      expect(fileService.isValidSpecName('my_feature')).toBe(false); // underscore
      expect(fileService.isValidSpecName('my feature')).toBe(false); // space
      expect(fileService.isValidSpecName('../hack')).toBe(false); // directory traversal
      expect(fileService.isValidSpecName('')).toBe(false); // empty
    });
  });
});
