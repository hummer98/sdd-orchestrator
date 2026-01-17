/**
 * ExperimentalToolsInstallerService and CommonCommandsInstallerService Tests
 * Requirements: 2.1-2.4, 3.1-3.6, 4.1-4.4, 5.1-5.3, 7.1-7.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ExperimentalToolsInstallerService,
  CommonCommandsInstallerService,
  ToolType,
  InstallResult,
  InstallError,
  CheckResult,
} from './experimentalToolsInstallerService';

describe('ExperimentalToolsInstallerService', () => {
  let service: ExperimentalToolsInstallerService;
  let testProjectPath: string;
  let testTemplateDir: string;

  beforeEach(async () => {
    // Create temp directories
    const baseDir = join(tmpdir(), `exp-tools-test-${Date.now()}`);
    testProjectPath = join(baseDir, 'project');
    testTemplateDir = join(baseDir, 'templates');

    await mkdir(testProjectPath, { recursive: true });
    await mkdir(join(testTemplateDir, 'commands'), { recursive: true });
    await mkdir(join(testTemplateDir, 'agents'), { recursive: true });
    await mkdir(join(testTemplateDir, 'claude-md-snippets'), { recursive: true });

    // Create template files
    await writeFile(
      join(testTemplateDir, 'commands', 'commit.md'),
      '# Commit Command Template\nTest content for commit command'
    );
    await writeFile(
      join(testTemplateDir, 'agents', 'debug.md'),
      '# Debug Agent Template\nTest content for debug agent'
    );
    await writeFile(
      join(testTemplateDir, 'claude-md-snippets', 'debug-section.md'),
      '## Debugging\n\nDebug section content'
    );

    service = new ExperimentalToolsInstallerService(testTemplateDir);
  });

  afterEach(async () => {
    // Cleanup
    const baseDir = join(tmpdir(), `exp-tools-test-${Date.now()}`);
    try {
      await rm(testProjectPath, { recursive: true, force: true });
      await rm(testTemplateDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('checkTargetExists', () => {
    it('should return exists: false when debug.md does not exist', async () => {
      const result = await service.checkTargetExists(testProjectPath, 'debug');

      expect(result.exists).toBe(false);
      expect(result.path).toBe(join(testProjectPath, '.claude', 'agents', 'debug.md'));
    });

    it('should return exists: false when commit.md does not exist', async () => {
      const result = await service.checkTargetExists(testProjectPath, 'commit');

      expect(result.exists).toBe(false);
      expect(result.path).toBe(join(testProjectPath, '.claude', 'commands', 'commit.md'));
    });

    it('should return exists: true when commit.md exists', async () => {
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const result = await service.checkTargetExists(testProjectPath, 'commit');

      expect(result.exists).toBe(true);
    });
  });

  describe('installCommitCommand', () => {
    it('should install commit.md when target does not exist', async () => {
      const result = await service.installCommitCommand(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.installedFiles).toContain('.claude/commands/commit.md');
      }

      // Verify file was created
      const content = await readFile(
        join(testProjectPath, '.claude', 'commands', 'commit.md'),
        'utf-8'
      );
      expect(content).toContain('Commit Command Template');
    });

    it('should skip when file exists and force is false', async () => {
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const result = await service.installCommitCommand(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skippedFiles).toContain('.claude/commands/commit.md');
      }
    });

    it('should overwrite when file exists and force is true', async () => {
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const result = await service.installCommitCommand(testProjectPath, { force: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.overwrittenFiles).toContain('.claude/commands/commit.md');
      }
    });
  });

  describe('installDebugAgent', () => {
    it('should install debug.md when target does not exist', async () => {
      // Mock Claude CLI (not available in test)
      vi.spyOn(service as any, 'runClaudeCli').mockResolvedValue({
        ok: true,
        value: { mergedContent: '# Merged CLAUDE.md', wasCreated: true },
      });

      const result = await service.installDebugAgent(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.installedFiles).toContain('.claude/agents/debug.md');
      }

      // Verify file was created
      const content = await readFile(
        join(testProjectPath, '.claude', 'agents', 'debug.md'),
        'utf-8'
      );
      expect(content).toContain('Debug Agent Template');
    });

    it('should skip when debug.md exists and force is false', async () => {
      const targetDir = join(testProjectPath, '.claude', 'agents');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'debug.md'), 'existing content');

      const result = await service.installDebugAgent(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skippedFiles).toContain('.claude/agents/debug.md');
      }
    });

    it('should create .claude/agents directory if it does not exist', async () => {
      vi.spyOn(service as any, 'runClaudeCli').mockResolvedValue({
        ok: true,
        value: { mergedContent: '# Merged CLAUDE.md', wasCreated: true },
      });

      const result = await service.installDebugAgent(testProjectPath);

      expect(result.ok).toBe(true);

      // Verify directory was created
      const content = await readFile(
        join(testProjectPath, '.claude', 'agents', 'debug.md'),
        'utf-8'
      );
      expect(content).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return TEMPLATE_NOT_FOUND for missing commit template', async () => {
      // Create service with invalid template dir
      const badService = new ExperimentalToolsInstallerService('/nonexistent/path');
      const result = await badService.installCommitCommand(testProjectPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TEMPLATE_NOT_FOUND');
      }
    });

    it('should return TEMPLATE_NOT_FOUND for missing debug template', async () => {
      // Create service with invalid template dir
      const badService = new ExperimentalToolsInstallerService('/nonexistent/path');
      const result = await badService.installDebugAgent(testProjectPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TEMPLATE_NOT_FOUND');
      }
    });
  });

  // ============================================================
  // gemini-document-review Task 3.1: Gemini Document Review Installer
  // Requirements: 1.2, 1.3, 1.4, 1.5, 1.6
  // ============================================================
  describe('gemini-document-review: installGeminiDocumentReview', () => {
    beforeEach(async () => {
      // Create gemini template directory and files
      await mkdir(join(testTemplateDir, 'gemini', 'kiro'), { recursive: true });
      await writeFile(
        join(testTemplateDir, 'gemini', 'kiro', 'document-review.toml'),
        'description = "Test document review"\nprompt = "Test prompt"'
      );
      await writeFile(
        join(testTemplateDir, 'gemini', 'kiro', 'document-review-reply.toml'),
        'description = "Test document review reply"\nprompt = "Test reply prompt"'
      );
    });

    it('should install both TOML files when target does not exist', async () => {
      const result = await service.installGeminiDocumentReview(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.installedFiles).toContain('.gemini/commands/kiro/document-review.toml');
        expect(result.value.installedFiles).toContain('.gemini/commands/kiro/document-review-reply.toml');
      }

      // Verify files were created
      const reviewContent = await readFile(
        join(testProjectPath, '.gemini', 'commands', 'kiro', 'document-review.toml'),
        'utf-8'
      );
      expect(reviewContent).toContain('document review');

      const replyContent = await readFile(
        join(testProjectPath, '.gemini', 'commands', 'kiro', 'document-review-reply.toml'),
        'utf-8'
      );
      expect(replyContent).toContain('document review reply');
    });

    it('should create .gemini/commands/kiro directory if it does not exist', async () => {
      const result = await service.installGeminiDocumentReview(testProjectPath);

      expect(result.ok).toBe(true);

      // Verify directory was created
      const content = await readFile(
        join(testProjectPath, '.gemini', 'commands', 'kiro', 'document-review.toml'),
        'utf-8'
      );
      expect(content).toBeDefined();
    });

    it('should skip when files exist and force is false', async () => {
      const targetDir = join(testProjectPath, '.gemini', 'commands', 'kiro');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'document-review.toml'), 'existing content');
      await writeFile(join(targetDir, 'document-review-reply.toml'), 'existing content');

      const result = await service.installGeminiDocumentReview(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skippedFiles).toContain('.gemini/commands/kiro/document-review.toml');
        expect(result.value.skippedFiles).toContain('.gemini/commands/kiro/document-review-reply.toml');
      }
    });

    it('should overwrite when files exist and force is true', async () => {
      const targetDir = join(testProjectPath, '.gemini', 'commands', 'kiro');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'document-review.toml'), 'existing content');
      await writeFile(join(targetDir, 'document-review-reply.toml'), 'existing content');

      const result = await service.installGeminiDocumentReview(testProjectPath, { force: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.overwrittenFiles).toContain('.gemini/commands/kiro/document-review.toml');
        expect(result.value.overwrittenFiles).toContain('.gemini/commands/kiro/document-review-reply.toml');
      }
    });

    it('should return TEMPLATE_NOT_FOUND for missing gemini templates', async () => {
      const badService = new ExperimentalToolsInstallerService('/nonexistent/path');
      const result = await badService.installGeminiDocumentReview(testProjectPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TEMPLATE_NOT_FOUND');
      }
    });
  });

  describe('gemini-document-review: checkGeminiDocumentReviewExists', () => {
    it('should return exists: false when TOML files do not exist', async () => {
      const result = await service.checkGeminiDocumentReviewExists(testProjectPath);

      expect(result.exists).toBe(false);
      expect(result.path).toContain('.gemini/commands/kiro/document-review.toml');
    });

    it('should return exists: true when document-review.toml exists', async () => {
      const targetDir = join(testProjectPath, '.gemini', 'commands', 'kiro');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'document-review.toml'), 'existing content');

      const result = await service.checkGeminiDocumentReviewExists(testProjectPath);

      expect(result.exists).toBe(true);
    });
  });
});

describe('CommonCommandsInstallerService', () => {
  let service: CommonCommandsInstallerService;
  let testProjectPath: string;
  let testTemplateDir: string;

  beforeEach(async () => {
    // Create temp directories
    const baseDir = join(tmpdir(), `common-cmd-test-${Date.now()}`);
    testProjectPath = join(baseDir, 'project');
    testTemplateDir = join(baseDir, 'templates');

    await mkdir(testProjectPath, { recursive: true });
    await mkdir(testTemplateDir, { recursive: true });

    // Create commit.md template (directly in template dir for CommonCommandsInstallerService)
    await writeFile(
      join(testTemplateDir, 'commit.md'),
      '# Commit Command\nAuto-installed commit command for deploy phase'
    );

    service = new CommonCommandsInstallerService(testTemplateDir);
  });

  afterEach(async () => {
    try {
      await rm(testProjectPath, { recursive: true, force: true });
      await rm(testTemplateDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('installCommitCommand', () => {
    it('should install commit.md when target does not exist', async () => {
      const result = await service.installCommitCommand(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.installedFiles).toContain('.claude/commands/commit.md');
      }

      // Verify file was created
      const content = await readFile(
        join(testProjectPath, '.claude', 'commands', 'commit.md'),
        'utf-8'
      );
      expect(content).toContain('Commit Command');
    });

    it('should skip when file exists and force is false', async () => {
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const result = await service.installCommitCommand(testProjectPath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skippedFiles).toContain('.claude/commands/commit.md');
      }
    });

    it('should overwrite when file exists and force is true', async () => {
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const result = await service.installCommitCommand(testProjectPath, { force: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.overwrittenFiles).toContain('.claude/commands/commit.md');
      }
    });
  });

  describe('checkCommitCommandExists', () => {
    it('should return exists: false when commit.md does not exist', async () => {
      const result = await service.checkCommitCommandExists(testProjectPath);

      expect(result.exists).toBe(false);
      expect(result.path).toBe(join(testProjectPath, '.claude', 'commands', 'commit.md'));
    });

    it('should return exists: true when commit.md exists', async () => {
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const result = await service.checkCommitCommandExists(testProjectPath);

      expect(result.exists).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return TEMPLATE_NOT_FOUND for missing commit template', async () => {
      const badService = new CommonCommandsInstallerService('/nonexistent/path');
      const result = await badService.installCommitCommand(testProjectPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TEMPLATE_NOT_FOUND');
      }
    });
  });
});
