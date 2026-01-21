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

  // ============================================================
  // common-commands-installer Task 2.1, 6.1: listCommonCommands
  // Requirements: 4.1, 4.2, 4.3
  // ============================================================
  describe('listCommonCommands', () => {
    it('should list all .md files in template directory', async () => {
      // Create additional template files
      await writeFile(join(testTemplateDir, 'test-cmd.md'), '# Test Command');
      await writeFile(join(testTemplateDir, 'another.md'), '# Another Command');

      const result = await service.listCommonCommands();

      expect(result).toHaveLength(3); // commit.md + test-cmd.md + another.md
      expect(result.map(c => c.name)).toContain('commit');
      expect(result.map(c => c.name)).toContain('test-cmd');
      expect(result.map(c => c.name)).toContain('another');
    });

    it('should exclude README and non-.md files', async () => {
      // Create non-command files
      await writeFile(join(testTemplateDir, 'README.md'), '# Readme');
      await writeFile(join(testTemplateDir, 'config.json'), '{}');
      await writeFile(join(testTemplateDir, '.gitkeep'), '');

      const result = await service.listCommonCommands();

      expect(result).toHaveLength(1); // Only commit.md
      expect(result.map(c => c.name)).not.toContain('README');
      expect(result.map(c => c.name)).not.toContain('config');
    });

    it('should return correct template and target paths', async () => {
      const result = await service.listCommonCommands();

      expect(result.length).toBeGreaterThan(0);
      const commitCmd = result.find(c => c.name === 'commit');
      expect(commitCmd).toBeDefined();
      expect(commitCmd!.templatePath).toBe(join(testTemplateDir, 'commit.md'));
      expect(commitCmd!.targetRelativePath).toBe('.claude/commands/commit.md');
    });

    it('should return empty array when template directory is empty', async () => {
      // Remove all templates
      await rm(join(testTemplateDir, 'commit.md'));

      const result = await service.listCommonCommands();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when template directory does not exist', async () => {
      const badService = new CommonCommandsInstallerService('/nonexistent/path');
      const result = await badService.listCommonCommands();

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================
  // common-commands-installer Task 2.2, 6.1: checkConflicts
  // Requirements: 3.1, 3.2
  // ============================================================
  describe('checkConflicts', () => {
    it('should return empty array when no files exist in project', async () => {
      const result = await service.checkConflicts(testProjectPath);

      expect(result).toHaveLength(0);
    });

    it('should detect existing files as conflicts', async () => {
      // Create existing file
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const result = await service.checkConflicts(testProjectPath);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('commit');
      expect(result[0].existingPath).toBe(join(targetDir, 'commit.md'));
    });

    it('should return conflict info for multiple existing files', async () => {
      // Create additional templates and existing files
      await writeFile(join(testTemplateDir, 'test-cmd.md'), '# Test Command');

      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing commit');
      await writeFile(join(targetDir, 'test-cmd.md'), 'existing test');

      const result = await service.checkConflicts(testProjectPath);

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toContain('commit');
      expect(result.map(c => c.name)).toContain('test-cmd');
    });

    it('should not include files that do not exist in project', async () => {
      // Create additional template but not the file
      await writeFile(join(testTemplateDir, 'test-cmd.md'), '# Test Command');

      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing commit');

      const result = await service.checkConflicts(testProjectPath);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('commit');
    });
  });

  // ============================================================
  // common-commands-installer Task 2.3, 6.1: installAllCommands
  // Requirements: 3.4, 3.5
  // ============================================================
  describe('installAllCommands', () => {
    it('should install all commands when no conflicts exist', async () => {
      await writeFile(join(testTemplateDir, 'test-cmd.md'), '# Test Command');

      const result = await service.installAllCommands(testProjectPath, []);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalInstalled).toBe(2); // commit.md + test-cmd.md
        expect(result.value.totalSkipped).toBe(0);
        expect(result.value.totalFailed).toBe(0);
      }
    });

    it('should skip files based on decisions', async () => {
      // Create existing file
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const decisions: import('./experimentalToolsInstallerService').CommonCommandDecision[] = [
        { name: 'commit', action: 'skip' }
      ];

      const result = await service.installAllCommands(testProjectPath, decisions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalSkipped).toBe(1);
        expect(result.value.skippedCommands).toContain('commit');
      }

      // Verify file was not changed
      const content = await readFile(join(targetDir, 'commit.md'), 'utf-8');
      expect(content).toBe('existing content');
    });

    it('should overwrite files based on decisions', async () => {
      // Create existing file
      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing content');

      const decisions: import('./experimentalToolsInstallerService').CommonCommandDecision[] = [
        { name: 'commit', action: 'overwrite' }
      ];

      const result = await service.installAllCommands(testProjectPath, decisions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalInstalled).toBe(1);
        expect(result.value.installedCommands).toContain('commit');
      }

      // Verify file was overwritten
      const content = await readFile(join(targetDir, 'commit.md'), 'utf-8');
      expect(content).toContain('Commit Command');
    });

    it('should handle mixed decisions correctly', async () => {
      // Create multiple templates and existing files
      await writeFile(join(testTemplateDir, 'cmd-a.md'), '# Command A');
      await writeFile(join(testTemplateDir, 'cmd-b.md'), '# Command B');

      const targetDir = join(testProjectPath, '.claude', 'commands');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'commit.md'), 'existing commit');
      await writeFile(join(targetDir, 'cmd-a.md'), 'existing cmd-a');

      const decisions: import('./experimentalToolsInstallerService').CommonCommandDecision[] = [
        { name: 'commit', action: 'skip' },
        { name: 'cmd-a', action: 'overwrite' }
      ];

      const result = await service.installAllCommands(testProjectPath, decisions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalInstalled).toBe(2); // cmd-a (overwritten) + cmd-b (new)
        expect(result.value.totalSkipped).toBe(1); // commit
        expect(result.value.installedCommands).toContain('cmd-a');
        expect(result.value.installedCommands).toContain('cmd-b');
        expect(result.value.skippedCommands).toContain('commit');
      }
    });

    it('should return correct result structure', async () => {
      const result = await service.installAllCommands(testProjectPath, []);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value.totalInstalled).toBe('number');
        expect(typeof result.value.totalSkipped).toBe('number');
        expect(typeof result.value.totalFailed).toBe('number');
        expect(Array.isArray(result.value.installedCommands)).toBe(true);
        expect(Array.isArray(result.value.skippedCommands)).toBe(true);
        expect(Array.isArray(result.value.failedCommands)).toBe(true);
      }
    });
  });
});
