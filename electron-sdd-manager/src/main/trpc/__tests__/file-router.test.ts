/**
 * File Router tests
 * Task 4.2: fileルーターとZodスキーマを実装する
 * Task 4.4: 統合テスト追加（レガシーfileHandlers.ts, projectFileHandlers.tsのエッジケース引き継ぎ）
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * Verifies: fileRouter, fileService
 * Verifies: Grep "fileRouter" in router.ts (Task 4.2 _Verify)
 *
 * Tests cover:
 * - All 11 procedures (readSpecs, readSpecJson, readArtifact, writeArtifact,
 *   listMarkdownFilesInSpec, writeFile, getArtifactPath, readFileContent,
 *   projectFileList, projectFileRead, projectFileWrite)
 * - Zod schema validation (valid/invalid inputs)
 * - ctx.services DI pattern (fileService)
 * - Error propagation
 * - Path validation for security
 * - Edge cases from legacy fileHandlers.ts and projectFileHandlers.ts (Task 4.4)
 */
import { describe, it, expect, vi } from 'vitest';
import { createTestCaller } from '../helpers/test-helpers';

describe('File Router (file.ts)', () => {
  // ============================================================
  // readSpecs - query
  // Legacy: READ_SPECS (specHandlers.ts)
  // ============================================================

  describe('readSpecs', () => {
    it('should return specs list from fileService', async () => {
      const mockSpecs = [{ name: 'my-feature' }, { name: 'another-spec' }];
      const mockFileService = {
        readSpecs: vi.fn().mockResolvedValue({ ok: true, value: mockSpecs }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      const result = await caller.file.readSpecs({ projectPath: '/test/project' });
      expect(result).toEqual(mockSpecs);
      expect(mockFileService.readSpecs).toHaveBeenCalledWith('/test/project');
    });

    it('should throw when fileService.readSpecs fails', async () => {
      const mockFileService = {
        readSpecs: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'NOT_FOUND', path: '/test/project' },
        }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      await expect(
        caller.file.readSpecs({ projectPath: '/test/project' }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath', async () => {
      const caller = createTestCaller();
      await expect(caller.file.readSpecs({ projectPath: '' })).rejects.toThrow();
    });
  });

  // ============================================================
  // readSpecJson - query
  // Legacy: READ_SPEC_JSON (specHandlers.ts)
  // ============================================================

  describe('readSpecJson', () => {
    it('should return spec.json content via fileService', async () => {
      const mockSpecJson = {
        feature_name: 'my-feature',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        language: 'ja',
        phase: 'tasks-generated',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
      };
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/project/.kiro/specs/my-feature' }),
        readSpecJson: vi.fn().mockResolvedValue({ ok: true, value: mockSpecJson }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
      });

      const result = await caller.file.readSpecJson({ specName: 'my-feature' });
      expect(result).toEqual(mockSpecJson);
      expect(mockFileService.resolveSpecPath).toHaveBeenCalledWith('/test/project', 'my-feature');
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(
        caller.file.readSpecJson({ specName: 'my-feature' }),
      ).rejects.toThrow('Project not selected');
    });

    it('should throw when spec is not found', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'NOT_FOUND', path: 'my-feature' },
        }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
      });

      await expect(
        caller.file.readSpecJson({ specName: 'nonexistent' }),
      ).rejects.toThrow();
    });

    it('should reject empty specName', async () => {
      const caller = createTestCaller();
      await expect(caller.file.readSpecJson({ specName: '' })).rejects.toThrow();
    });
  });

  // ============================================================
  // readArtifact - query
  // Legacy: READ_ARTIFACT (fileHandlers.ts)
  // ============================================================

  describe('readArtifact', () => {
    it('should read artifact content for spec entity', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/project/.kiro/specs/my-feature' }),
        readArtifact: vi.fn().mockResolvedValue({ ok: true, value: '# Requirements\n\nContent here' }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
      });

      const result = await caller.file.readArtifact({
        name: 'my-feature',
        filename: 'requirements.md',
        entityType: 'spec',
      });
      expect(result).toBe('# Requirements\n\nContent here');
    });

    it('should read artifact content for bug entity', async () => {
      const mockFileService = {
        resolveBugPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/project/.kiro/bugs/fix-issue' }),
        readArtifact: vi.fn().mockResolvedValue({ ok: true, value: '# Bug Analysis' }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
      });

      const result = await caller.file.readArtifact({
        name: 'fix-issue',
        filename: 'analysis.md',
        entityType: 'bug',
      });
      expect(result).toBe('# Bug Analysis');
    });

    it('should default entityType to spec', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/test' }),
        readArtifact: vi.fn().mockResolvedValue({ ok: true, value: 'content' }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      await caller.file.readArtifact({ name: 'test', filename: 'design.md' });
      expect(mockFileService.resolveSpecPath).toHaveBeenCalled();
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(
        caller.file.readArtifact({ name: 'test', filename: 'design.md' }),
      ).rejects.toThrow('Project not selected');
    });

    it('should throw when entity path resolution fails', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'NOT_FOUND', path: 'nonexistent' },
        }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
      });

      await expect(
        caller.file.readArtifact({ name: 'nonexistent', filename: 'design.md' }),
      ).rejects.toThrow();
    });

    it('should throw when readArtifact fails', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/test' }),
        readArtifact: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'NOT_FOUND', path: '/test/.kiro/specs/test/design.md' },
        }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      await expect(
        caller.file.readArtifact({ name: 'test', filename: 'design.md' }),
      ).rejects.toThrow();
    });

    it('should reject empty name', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.readArtifact({ name: '', filename: 'design.md' }),
      ).rejects.toThrow();
    });

    it('should reject empty filename', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.readArtifact({ name: 'test', filename: '' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // writeArtifact - mutation
  // Legacy: WRITE_ARTIFACT (fileHandlers.ts)
  // ============================================================

  describe('writeArtifact', () => {
    it('should write artifact content for spec entity', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/my-feature' }),
        writeFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      await caller.file.writeArtifact({
        name: 'my-feature',
        filename: 'design.md',
        content: '# Design\n\nNew content',
        entityType: 'spec',
      });

      expect(mockFileService.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('design.md'),
        '# Design\n\nNew content',
      );
    });

    it('should write artifact content for bug entity', async () => {
      const mockFileService = {
        resolveBugPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/bugs/fix-issue' }),
        writeFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      await caller.file.writeArtifact({
        name: 'fix-issue',
        filename: 'analysis.md',
        content: '# Analysis',
        entityType: 'bug',
      });

      expect(mockFileService.resolveBugPath).toHaveBeenCalled();
      expect(mockFileService.writeFile).toHaveBeenCalled();
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(
        caller.file.writeArtifact({ name: 'test', filename: 'design.md', content: 'data' }),
      ).rejects.toThrow('Project not selected');
    });

    it('should throw when writeFile fails', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/test' }),
        writeFile: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'WRITE_ERROR', path: '/test', message: 'Permission denied' },
        }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      await expect(
        caller.file.writeArtifact({ name: 'test', filename: 'design.md', content: 'data' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // listMarkdownFilesInSpec - query
  // Legacy: LIST_MARKDOWN_FILES_IN_SPEC (fileHandlers.ts)
  // ============================================================

  describe('listMarkdownFilesInSpec', () => {
    it('should return markdown files from fileService', async () => {
      const mockFiles = ['architecture.md', 'notes.md', 'review-1.md'];
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/test' }),
        listMarkdownFilesInSpec: vi.fn().mockResolvedValue({ ok: true, value: mockFiles }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      const result = await caller.file.listMarkdownFilesInSpec({
        name: 'test',
        entityType: 'spec',
      });
      expect(result).toEqual(mockFiles);
    });

    it('should support bug entity type', async () => {
      const mockFileService = {
        resolveBugPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/bugs/fix' }),
        listMarkdownFilesInSpec: vi.fn().mockResolvedValue({ ok: true, value: ['report.md'] }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      const result = await caller.file.listMarkdownFilesInSpec({
        name: 'fix',
        entityType: 'bug',
      });
      expect(result).toEqual(['report.md']);
      expect(mockFileService.resolveBugPath).toHaveBeenCalled();
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(
        caller.file.listMarkdownFilesInSpec({ name: 'test' }),
      ).rejects.toThrow('Project not selected');
    });
  });

  // ============================================================
  // writeFile - mutation
  // Legacy: WRITE_FILE (fileHandlers.ts)
  // ============================================================

  describe('writeFile', () => {
    it('should write file content via fileService', async () => {
      const mockFileService = {
        writeFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      await caller.file.writeFile({
        filePath: '/test/project/file.md',
        content: '# Content',
      });
      expect(mockFileService.writeFile).toHaveBeenCalledWith(
        '/test/project/file.md',
        '# Content',
      );
    });

    it('should throw when writeFile fails', async () => {
      const mockFileService = {
        writeFile: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'WRITE_ERROR', path: '/test/file.md', message: 'Permission denied' },
        }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      await expect(
        caller.file.writeFile({ filePath: '/test/file.md', content: 'data' }),
      ).rejects.toThrow();
    });

    it('should reject empty filePath', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.writeFile({ filePath: '', content: 'data' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // getArtifactPath - query
  // Legacy: GET_ARTIFACT_PATH (fileHandlers.ts)
  // ============================================================

  describe('getArtifactPath', () => {
    it('should return resolved artifact path for spec', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/my-feature' }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      const result = await caller.file.getArtifactPath({
        name: 'my-feature',
        filename: 'design.md',
        entityType: 'spec',
      });
      expect(result).toContain('my-feature');
      expect(result).toContain('design.md');
    });

    it('should return resolved artifact path for bug', async () => {
      const mockFileService = {
        resolveBugPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/bugs/fix-issue' }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      const result = await caller.file.getArtifactPath({
        name: 'fix-issue',
        filename: 'analysis.md',
        entityType: 'bug',
      });
      expect(result).toContain('fix-issue');
      expect(result).toContain('analysis.md');
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(
        caller.file.getArtifactPath({ name: 'test', filename: 'design.md' }),
      ).rejects.toThrow('Project not selected');
    });
  });

  // ============================================================
  // readFileContent - query
  // Legacy: READ_FILE_CONTENT (gitHandlers.ts)
  // ============================================================

  describe('readFileContent', () => {
    it('should return file content with metadata', async () => {
      const mockResult = {
        content: 'const x = 1;',
        isBase64: false,
        fileType: 'code' as const,
        language: 'typescript',
      };
      const mockFileService = {
        readFileContent: vi.fn().mockResolvedValue({ ok: true, value: mockResult }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      const result = await caller.file.readFileContent({
        projectPath: '/test/project',
        filePath: 'src/index.ts',
      });
      expect(result).toEqual(mockResult);
      expect(mockFileService.readFileContent).toHaveBeenCalledWith('/test/project', 'src/index.ts');
    });

    it('should handle image files (base64)', async () => {
      const mockResult = {
        content: 'iVBORw0KGgo=',
        isBase64: true,
        fileType: 'image' as const,
      };
      const mockFileService = {
        readFileContent: vi.fn().mockResolvedValue({ ok: true, value: mockResult }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      const result = await caller.file.readFileContent({
        projectPath: '/test/project',
        filePath: 'assets/logo.png',
      });
      expect(result.isBase64).toBe(true);
      expect(result.fileType).toBe('image');
    });

    it('should throw when readFileContent fails', async () => {
      const mockFileService = {
        readFileContent: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'FILE_NOT_FOUND', path: 'src/missing.ts' },
        }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      await expect(
        caller.file.readFileContent({ projectPath: '/test', filePath: 'src/missing.ts' }),
      ).rejects.toThrow();
    });

    it('should reject empty projectPath', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.readFileContent({ projectPath: '', filePath: 'src/index.ts' }),
      ).rejects.toThrow();
    });

    it('should reject empty filePath', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.readFileContent({ projectPath: '/test', filePath: '' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // projectFileList - query
  // Legacy: PROJECT_FILE_LIST (projectFileHandlers.ts)
  // ============================================================

  describe('projectFileList', () => {
    it('should return project file listing', async () => {
      const mockResult = {
        claudeMd: {
          relativePath: 'CLAUDE.md',
          fileName: 'CLAUDE.md',
          group: 'claude',
          exists: true,
        },
        steeringFiles: [
          { relativePath: '.kiro/steering/tech.md', fileName: 'tech.md', group: 'steering', exists: true },
        ],
        docsTree: [],
        isLoading: false,
        error: null,
      };
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        listProjectFiles: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await caller.file.projectFileList();
      expect(result).toHaveProperty('claudeMd');
      expect(result).toHaveProperty('steeringFiles');
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(caller.file.projectFileList()).rejects.toThrow('Project not selected');
    });
  });

  // ============================================================
  // projectFileRead - query
  // Legacy: PROJECT_FILE_READ (projectFileHandlers.ts)
  // ============================================================

  describe('projectFileRead', () => {
    it('should return file content', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        readProjectFile: vi.fn().mockResolvedValue('# CLAUDE.md content'),
      });

      const result = await caller.file.projectFileRead({
        filePath: '/test/project/CLAUDE.md',
      });
      expect(result).toBe('# CLAUDE.md content');
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(
        caller.file.projectFileRead({ filePath: '/test/CLAUDE.md' }),
      ).rejects.toThrow('Project not selected');
    });

    it('should reject empty filePath', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.projectFileRead({ filePath: '' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // projectFileWrite - mutation
  // Legacy: PROJECT_FILE_WRITE (projectFileHandlers.ts)
  // ============================================================

  describe('projectFileWrite', () => {
    it('should write file content', async () => {
      const mockWriteProjectFile = vi.fn().mockResolvedValue(undefined);
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        writeProjectFile: mockWriteProjectFile,
      });

      await caller.file.projectFileWrite({
        filePath: '/test/project/CLAUDE.md',
        content: '# Updated content',
      });
      expect(mockWriteProjectFile).toHaveBeenCalledWith(
        '/test/project',
        '/test/project/CLAUDE.md',
        '# Updated content',
      );
    });

    it('should throw when project is not selected', async () => {
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue(null),
      });

      await expect(
        caller.file.projectFileWrite({ filePath: '/test/file.md', content: 'data' }),
      ).rejects.toThrow('Project not selected');
    });

    it('should reject empty filePath', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.projectFileWrite({ filePath: '', content: 'data' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Zod Schema Validation Tests
  // Requirements: 3.3
  // ============================================================

  describe('Zod Schema Validation', () => {
    it('readSpecs should reject non-string projectPath', async () => {
      const caller = createTestCaller();
      await expect(caller.file.readSpecs({ projectPath: 123 as any })).rejects.toThrow();
    });

    it('readSpecJson should reject non-string specName', async () => {
      const caller = createTestCaller();
      await expect(caller.file.readSpecJson({ specName: 123 as any })).rejects.toThrow();
    });

    it('readArtifact should reject invalid entityType', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.readArtifact({ name: 'test', filename: 'file.md', entityType: 'invalid' as any }),
      ).rejects.toThrow();
    });

    it('writeArtifact should reject invalid entityType', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.writeArtifact({ name: 'test', filename: 'file.md', content: 'data', entityType: 'invalid' as any }),
      ).rejects.toThrow();
    });

    it('writeFile should reject non-string content', async () => {
      const caller = createTestCaller();
      await expect(
        caller.file.writeFile({ filePath: '/test/file.md', content: 123 as any }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    it('should propagate error when fileService.readSpecs throws', async () => {
      const mockFileService = {
        readSpecs: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      await expect(
        caller.file.readSpecs({ projectPath: '/test' }),
      ).rejects.toThrow();
    });

    it('should propagate error when fileService.readFileContent throws', async () => {
      const mockFileService = {
        readFileContent: vi.fn().mockRejectedValue(new Error('IO error')),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      await expect(
        caller.file.readFileContent({ projectPath: '/test', filePath: 'src/index.ts' }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Task 4.4: レガシーfileHandlers.ts, projectFileHandlers.tsからのエッジケース引き継ぎ
  // ============================================================

  describe('Task 4.4 Edge Cases: readArtifact path resolution', () => {
    it('should correctly resolve spec path for nested spec names', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({
          ok: true,
          value: '/test/.kiro/specs/deeply-nested-feature',
        }),
        readArtifact: vi.fn().mockResolvedValue({ ok: true, value: '# Design doc' }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      const result = await caller.file.readArtifact({
        name: 'deeply-nested-feature',
        filename: 'design.md',
        entityType: 'spec',
      });
      expect(result).toBe('# Design doc');
      expect(mockFileService.resolveSpecPath).toHaveBeenCalledWith('/test', 'deeply-nested-feature');
    });

    it('should correctly resolve bug path and read artifact', async () => {
      const mockFileService = {
        resolveBugPath: vi.fn().mockResolvedValue({
          ok: true,
          value: '/test/.kiro/bugs/critical-fix',
        }),
        readArtifact: vi.fn().mockResolvedValue({ ok: true, value: '# Bug Analysis' }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      const result = await caller.file.readArtifact({
        name: 'critical-fix',
        filename: 'analysis.md',
        entityType: 'bug',
      });
      expect(result).toBe('# Bug Analysis');
      expect(mockFileService.resolveBugPath).toHaveBeenCalledWith('/test', 'critical-fix');
    });
  });

  describe('Task 4.4 Edge Cases: writeArtifact error handling', () => {
    it('should throw when entity path resolution fails for writeArtifact', async () => {
      const mockFileService = {
        resolveSpecPath: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'NOT_FOUND', path: 'nonexistent-spec' },
        }),
      };
      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test'),
      });

      await expect(
        caller.file.writeArtifact({
          name: 'nonexistent-spec',
          filename: 'design.md',
          content: 'new content',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Task 4.4 Edge Cases: projectFileWrite path validation', () => {
    it('should throw when writeProjectFile service throws for path outside project', async () => {
      const mockWriteProjectFile = vi.fn().mockRejectedValue(
        new Error('File path must be within project directory'),
      );
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        writeProjectFile: mockWriteProjectFile,
      });

      await expect(
        caller.file.projectFileWrite({
          filePath: '/outside/path/file.md',
          content: 'malicious content',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Task 4.4 Edge Cases: projectFileRead path validation', () => {
    it('should throw when readProjectFile service throws for path outside project', async () => {
      const mockReadProjectFile = vi.fn().mockRejectedValue(
        new Error('File path must be within project directory'),
      );
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        readProjectFile: mockReadProjectFile,
      });

      await expect(
        caller.file.projectFileRead({
          filePath: '/outside/path/file.md',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Task 4.4 Edge Cases: projectFileList structure', () => {
    it('should return complete ProjectFilesState with docsTree', async () => {
      const mockResult = {
        claudeMd: {
          relativePath: 'CLAUDE.md',
          fileName: 'CLAUDE.md',
          group: 'claude',
          exists: true,
        },
        steeringFiles: [
          { relativePath: '.kiro/steering/tech.md', fileName: 'tech.md', group: 'steering', exists: true },
          { relativePath: '.kiro/steering/structure.md', fileName: 'structure.md', group: 'steering', exists: true },
        ],
        docsTree: [
          { name: 'docs', relativePath: 'docs', type: 'directory', children: [
            { name: 'architecture.md', relativePath: 'docs/architecture.md', type: 'file', extension: 'md' },
          ] },
        ],
        isLoading: false,
        error: null,
      };
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        listProjectFiles: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await caller.file.projectFileList();
      expect(result.claudeMd).toBeDefined();
      expect(result.steeringFiles).toHaveLength(2);
      expect(result.docsTree).toHaveLength(1);
      expect(result.docsTree[0].type).toBe('directory');
    });

    it('should return empty lists when project has no config files', async () => {
      const mockResult = {
        claudeMd: null,
        steeringFiles: [],
        docsTree: [],
        isLoading: false,
        error: null,
      };
      const caller = createTestCaller({
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/empty-project'),
        listProjectFiles: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await caller.file.projectFileList();
      expect(result.claudeMd).toBeNull();
      expect(result.steeringFiles).toEqual([]);
      expect(result.docsTree).toEqual([]);
    });
  });

  describe('Task 4.4 Edge Cases: readFileContent file types', () => {
    it('should handle binary/unsupported files', async () => {
      const mockResult = {
        content: '',
        isBase64: false,
        fileType: 'binary' as const,
      };
      const mockFileService = {
        readFileContent: vi.fn().mockResolvedValue({ ok: true, value: mockResult }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      const result = await caller.file.readFileContent({
        projectPath: '/test/project',
        filePath: 'file.bin',
      });
      expect(result.fileType).toBe('binary');
    });

    it('should handle markdown files', async () => {
      const mockResult = {
        content: '# Hello',
        isBase64: false,
        fileType: 'code' as const,
        language: 'markdown',
      };
      const mockFileService = {
        readFileContent: vi.fn().mockResolvedValue({ ok: true, value: mockResult }),
      };
      const caller = createTestCaller({ fileService: mockFileService as any });

      const result = await caller.file.readFileContent({
        projectPath: '/test/project',
        filePath: 'README.md',
      });
      expect(result.language).toBe('markdown');
    });
  });

  // ============================================================
  // Integration: All file procedures with shared context
  // ============================================================

  describe('Integration: Multiple file procedures with shared context', () => {
    it('should execute multiple file procedures with the same caller', async () => {
      const mockFileService = {
        readSpecs: vi.fn().mockResolvedValue({ ok: true, value: [{ name: 'test-spec' }] }),
        resolveSpecPath: vi.fn().mockResolvedValue({ ok: true, value: '/test/.kiro/specs/test-spec' }),
        readSpecJson: vi.fn().mockResolvedValue({
          ok: true,
          value: {
            feature_name: 'test-spec',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            language: 'ja',
            phase: 'initialized',
            approvals: {
              requirements: { generated: false, approved: false },
              design: { generated: false, approved: false },
              tasks: { generated: false, approved: false },
            },
          },
        }),
        readArtifact: vi.fn().mockResolvedValue({ ok: true, value: '# Content' }),
        writeFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        listMarkdownFilesInSpec: vi.fn().mockResolvedValue({ ok: true, value: ['notes.md'] }),
        readFileContent: vi.fn().mockResolvedValue({
          ok: true,
          value: { content: 'code', isBase64: false, fileType: 'code', language: 'typescript' },
        }),
      };
      const mockListProjectFiles = vi.fn().mockResolvedValue({
        claudeMd: null,
        steeringFiles: [],
        docsTree: [],
        isLoading: false,
        error: null,
      });
      const mockReadProjectFile = vi.fn().mockResolvedValue('file content');
      const mockWriteProjectFile = vi.fn().mockResolvedValue(undefined);

      const caller = createTestCaller({
        fileService: mockFileService as any,
        getCurrentProjectPath: vi.fn().mockReturnValue('/test/project'),
        listProjectFiles: mockListProjectFiles,
        readProjectFile: mockReadProjectFile,
        writeProjectFile: mockWriteProjectFile,
      });

      // 1. readSpecs
      const specs = await caller.file.readSpecs({ projectPath: '/test/project' });
      expect(specs).toEqual([{ name: 'test-spec' }]);

      // 2. readSpecJson
      const specJson = await caller.file.readSpecJson({ specName: 'test-spec' });
      expect(specJson.feature_name).toBe('test-spec');

      // 3. readArtifact
      const artifact = await caller.file.readArtifact({ name: 'test-spec', filename: 'design.md' });
      expect(artifact).toBe('# Content');

      // 4. writeArtifact
      await caller.file.writeArtifact({ name: 'test-spec', filename: 'design.md', content: 'new content' });
      expect(mockFileService.writeFile).toHaveBeenCalled();

      // 5. listMarkdownFilesInSpec
      const mdFiles = await caller.file.listMarkdownFilesInSpec({ name: 'test-spec' });
      expect(mdFiles).toEqual(['notes.md']);

      // 6. writeFile
      await caller.file.writeFile({ filePath: '/test/file.md', content: 'direct write' });

      // 7. getArtifactPath
      const artifactPath = await caller.file.getArtifactPath({ name: 'test-spec', filename: 'design.md' });
      expect(artifactPath).toContain('design.md');

      // 8. readFileContent
      const fileContent = await caller.file.readFileContent({ projectPath: '/test/project', filePath: 'src/index.ts' });
      expect(fileContent.fileType).toBe('code');

      // 9. projectFileList
      const projectFiles = await caller.file.projectFileList();
      expect(projectFiles).toHaveProperty('steeringFiles');

      // 10. projectFileRead
      const projectFileContent = await caller.file.projectFileRead({ filePath: '/test/project/CLAUDE.md' });
      expect(projectFileContent).toBe('file content');

      // 11. projectFileWrite
      await caller.file.projectFileWrite({ filePath: '/test/project/CLAUDE.md', content: 'updated' });
      expect(mockWriteProjectFile).toHaveBeenCalled();
    });
  });
});
