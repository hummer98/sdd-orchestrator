/**
 * listDocsFilesCore Tests
 *
 * TDD: Tests written first for project-docs-viewer Task 3.1
 * Requirements: 1.1, 1.2, 1.3, 1.4
 *
 * Test cases:
 * - Recursive tree structure construction
 * - .md, .pdf, .html filtering
 * - Hidden file/folder exclusion
 * - Alphabetical sorting within folders
 * - Empty array when docs/ doesn't exist
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  };
});

// Import after mock setup
import { listDocsFilesCore } from './projectFileHandlers';

describe('listDocsFilesCore', () => {
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('docs/ folder not exists', () => {
    // Requirement 1.2: Return empty array when docs/ doesn't exist
    it('should return empty array when docs folder does not exist', async () => {
      (fs.readdir as any).mockRejectedValue({ code: 'ENOENT' });

      const result = await listDocsFilesCore(mockProjectPath);

      expect(result).toEqual([]);
    });
  });

  describe('flat file list', () => {
    // Requirement 1.1: Return files in docs/ with tree structure
    it('should return flat list when no subfolders', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string, options: any) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'readme.md', isFile: () => true, isDirectory: () => false },
            { name: 'api.html', isFile: () => true, isDirectory: () => false },
          ];
        }
        throw { code: 'ENOENT' };
      });

      const result = await listDocsFilesCore(mockProjectPath);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'api.html',
        type: 'file',
        extension: 'html',
      });
      expect(result[1]).toMatchObject({
        name: 'readme.md',
        type: 'file',
        extension: 'md',
      });
    });
  });

  describe('file filtering', () => {
    // Requirement 1.1: Only .md, .pdf, .html files
    it('should only include .md, .pdf, .html files', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'readme.md', isFile: () => true, isDirectory: () => false },
            { name: 'manual.pdf', isFile: () => true, isDirectory: () => false },
            { name: 'index.html', isFile: () => true, isDirectory: () => false },
            { name: 'image.png', isFile: () => true, isDirectory: () => false },
            { name: 'data.json', isFile: () => true, isDirectory: () => false },
            { name: 'script.js', isFile: () => true, isDirectory: () => false },
          ];
        }
        throw { code: 'ENOENT' };
      });

      const result = await listDocsFilesCore(mockProjectPath);

      expect(result).toHaveLength(3);
      const names = result.map(n => n.name);
      expect(names).toContain('readme.md');
      expect(names).toContain('manual.pdf');
      expect(names).toContain('index.html');
      expect(names).not.toContain('image.png');
      expect(names).not.toContain('data.json');
      expect(names).not.toContain('script.js');
    });

    it('should set correct extension for each file type', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'doc.md', isFile: () => true, isDirectory: () => false },
            { name: 'doc.pdf', isFile: () => true, isDirectory: () => false },
            { name: 'doc.html', isFile: () => true, isDirectory: () => false },
          ];
        }
        throw { code: 'ENOENT' };
      });

      const result = await listDocsFilesCore(mockProjectPath);

      const mdFile = result.find(n => n.name === 'doc.md');
      const pdfFile = result.find(n => n.name === 'doc.pdf');
      const htmlFile = result.find(n => n.name === 'doc.html');

      expect(mdFile?.extension).toBe('md');
      expect(pdfFile?.extension).toBe('pdf');
      expect(htmlFile?.extension).toBe('html');
    });
  });

  describe('hidden file exclusion', () => {
    // Requirement 1.4: Exclude hidden files/folders (starting with .)
    it('should exclude hidden files', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'readme.md', isFile: () => true, isDirectory: () => false },
            { name: '.hidden.md', isFile: () => true, isDirectory: () => false },
            { name: '.DS_Store', isFile: () => true, isDirectory: () => false },
          ];
        }
        throw { code: 'ENOENT' };
      });

      const result = await listDocsFilesCore(mockProjectPath);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('readme.md');
    });

    it('should exclude hidden folders', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'readme.md', isFile: () => true, isDirectory: () => false },
            { name: '.hidden', isFile: () => false, isDirectory: () => true },
            { name: 'guides', isFile: () => false, isDirectory: () => true },
          ];
        }
        if (dirPath === path.join(mockProjectPath, 'docs', 'guides')) {
          return [
            { name: 'guide.md', isFile: () => true, isDirectory: () => false },
          ];
        }
        throw { code: 'ENOENT' };
      });

      const result = await listDocsFilesCore(mockProjectPath);

      const names = result.map(n => n.name);
      expect(names).toContain('readme.md');
      expect(names).toContain('guides');
      expect(names).not.toContain('.hidden');
    });
  });

  describe('alphabetical sorting', () => {
    // Requirement 1.3: Alphabetical sort within folders
    it('should sort files alphabetically within folder', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'zebra.md', isFile: () => true, isDirectory: () => false },
            { name: 'apple.md', isFile: () => true, isDirectory: () => false },
            { name: 'mango.md', isFile: () => true, isDirectory: () => false },
          ];
        }
        throw { code: 'ENOENT' };
      });

      const result = await listDocsFilesCore(mockProjectPath);

      expect(result[0].name).toBe('apple.md');
      expect(result[1].name).toBe('mango.md');
      expect(result[2].name).toBe('zebra.md');
    });

    it('should sort directories before files (then alphabetically)', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'zebra.md', isFile: () => true, isDirectory: () => false },
            { name: 'api', isFile: () => false, isDirectory: () => true },
            { name: 'apple.md', isFile: () => true, isDirectory: () => false },
            { name: 'guides', isFile: () => false, isDirectory: () => true },
          ];
        }
        // Return empty for subdirs
        return [];
      });

      const result = await listDocsFilesCore(mockProjectPath);

      // Directories first, then files
      expect(result[0].name).toBe('api');
      expect(result[0].type).toBe('directory');
      expect(result[1].name).toBe('guides');
      expect(result[1].type).toBe('directory');
      expect(result[2].name).toBe('apple.md');
      expect(result[2].type).toBe('file');
      expect(result[3].name).toBe('zebra.md');
      expect(result[3].type).toBe('file');
    });
  });

  describe('recursive tree structure', () => {
    // Requirement 1.1: Recursive tree structure
    it('should build nested tree structure', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'readme.md', isFile: () => true, isDirectory: () => false },
            { name: 'api', isFile: () => false, isDirectory: () => true },
          ];
        }
        if (dirPath === path.join(mockProjectPath, 'docs', 'api')) {
          return [
            { name: 'endpoints.md', isFile: () => true, isDirectory: () => false },
            { name: 'v2', isFile: () => false, isDirectory: () => true },
          ];
        }
        if (dirPath === path.join(mockProjectPath, 'docs', 'api', 'v2')) {
          return [
            { name: 'reference.pdf', isFile: () => true, isDirectory: () => false },
          ];
        }
        return [];
      });

      const result = await listDocsFilesCore(mockProjectPath);

      // Root level
      expect(result).toHaveLength(2);

      // Find api directory
      const apiDir = result.find(n => n.name === 'api');
      expect(apiDir).toBeDefined();
      expect(apiDir!.type).toBe('directory');
      expect(apiDir!.children).toBeDefined();
      expect(apiDir!.children).toHaveLength(2);

      // Find nested v2 directory
      const v2Dir = apiDir!.children!.find(n => n.name === 'v2');
      expect(v2Dir).toBeDefined();
      expect(v2Dir!.type).toBe('directory');
      expect(v2Dir!.children).toHaveLength(1);
      expect(v2Dir!.children![0].name).toBe('reference.pdf');
    });

    it('should set correct relativePath for nested items', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'api', isFile: () => false, isDirectory: () => true },
          ];
        }
        if (dirPath === path.join(mockProjectPath, 'docs', 'api')) {
          return [
            { name: 'endpoints.md', isFile: () => true, isDirectory: () => false },
          ];
        }
        return [];
      });

      const result = await listDocsFilesCore(mockProjectPath);

      const apiDir = result[0];
      expect(apiDir.relativePath).toBe('api');

      const endpointsFile = apiDir.children![0];
      expect(endpointsFile.relativePath).toBe('api/endpoints.md');
    });
  });

  describe('empty directories', () => {
    it('should include empty directories with empty children array', async () => {
      (fs.readdir as any).mockImplementation(async (dirPath: string) => {
        if (dirPath === path.join(mockProjectPath, 'docs')) {
          return [
            { name: 'empty-folder', isFile: () => false, isDirectory: () => true },
          ];
        }
        // Empty directory
        return [];
      });

      const result = await listDocsFilesCore(mockProjectPath);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('empty-folder');
      expect(result[0].type).toBe('directory');
      expect(result[0].children).toEqual([]);
    });
  });
});
