/**
 * BugWorkflowInstaller Tests
 * TDD: Bug Workflowインストール機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  BugWorkflowInstaller,
  BUG_COMMANDS,
  BUG_TEMPLATES,
  BUG_WORKFLOW_CLAUDE_MD_SECTION,
} from './bugWorkflowInstaller';

describe('BugWorkflowInstaller', () => {
  let installer: BugWorkflowInstaller;
  let tempDir: string;
  let templateDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bug-workflow-test-'));
    templateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bug-templates-'));
    installer = new BugWorkflowInstaller(templateDir);

    // Create template files
    await createTemplateFiles();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(templateDir, { recursive: true, force: true });
  });

  /**
   * Helper to create template files in template directory
   */
  async function createTemplateFiles(): Promise<void> {
    // Create command templates in new structure (bug commands in commands/bug/)
    for (const cmd of BUG_COMMANDS) {
      const filePath = path.join(templateDir, 'commands', 'bug', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}\nThis is a template file.`, 'utf-8');
    }

    // Create bug template files
    for (const tmpl of BUG_TEMPLATES) {
      const filePath = path.join(templateDir, 'settings', 'templates', 'bugs', tmpl);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${tmpl}\nThis is a bug template file.`, 'utf-8');
    }
  }

  describe('Constants', () => {
    it('should define all bug commands', () => {
      expect(BUG_COMMANDS).toContain('bug-create');
      expect(BUG_COMMANDS).toContain('bug-analyze');
      expect(BUG_COMMANDS).toContain('bug-fix');
      expect(BUG_COMMANDS).toContain('bug-verify');
      expect(BUG_COMMANDS).toContain('bug-status');
      expect(BUG_COMMANDS.length).toBe(5);
    });

    it('should define all bug templates', () => {
      expect(BUG_TEMPLATES).toContain('report.md');
      expect(BUG_TEMPLATES).toContain('analysis.md');
      expect(BUG_TEMPLATES).toContain('fix.md');
      expect(BUG_TEMPLATES).toContain('verification.md');
      expect(BUG_TEMPLATES.length).toBe(4);
    });

    it('should have CLAUDE.md section with Bug Fix workflow', () => {
      expect(BUG_WORKFLOW_CLAUDE_MD_SECTION).toContain('Bug Fix');
      expect(BUG_WORKFLOW_CLAUDE_MD_SECTION).toContain('Report → Analyze → Fix → Verify');
      expect(BUG_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:bug-create');
      expect(BUG_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:bug-analyze');
      expect(BUG_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:bug-fix');
      expect(BUG_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:bug-verify');
      expect(BUG_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:bug-status');
    });
  });

  describe('installCommands', () => {
    it('should install all bug commands to .claude/commands/kiro/', async () => {
      const result = await installer.installCommands(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('bug-create');
        expect(result.value.installed).toContain('bug-analyze');
        expect(result.value.installed).toContain('bug-fix');
        expect(result.value.installed).toContain('bug-verify');
        expect(result.value.installed).toContain('bug-status');
        expect(result.value.installed.length).toBe(5);
      }

      // Verify files were created in correct location
      for (const cmd of BUG_COMMANDS) {
        const targetPath = path.join(tempDir, '.claude', 'commands', 'kiro', `${cmd}.md`);
        const exists = await fileExists(targetPath);
        expect(exists).toBe(true);
      }
    });

    it('should skip already existing commands', async () => {
      // Pre-create bug-create command
      const existingPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'bug-create.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing custom content', 'utf-8');

      const result = await installer.installCommands(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skipped).toContain('bug-create');
        expect(result.value.installed.length).toBe(4);
      }

      // Verify existing file was not overwritten
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toBe('Existing custom content');
    });

    it('should overwrite existing commands when force is true', async () => {
      // Pre-create bug-create command
      const existingPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'bug-create.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing custom content', 'utf-8');

      const result = await installer.installCommands(tempDir, { force: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.overwritten).toContain('bug-create');
        expect(result.value.installed.length).toBe(4);
      }

      // Verify file was overwritten
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toContain('Template for bug-create');
    });
  });

  describe('installTemplates', () => {
    it('should install all bug templates to .kiro/settings/templates/bugs/', async () => {
      const result = await installer.installTemplates(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('report.md');
        expect(result.value.installed).toContain('analysis.md');
        expect(result.value.installed).toContain('fix.md');
        expect(result.value.installed).toContain('verification.md');
        expect(result.value.installed.length).toBe(4);
      }

      // Verify files were created in correct location
      for (const tmpl of BUG_TEMPLATES) {
        const targetPath = path.join(tempDir, '.kiro', 'settings', 'templates', 'bugs', tmpl);
        const exists = await fileExists(targetPath);
        expect(exists).toBe(true);
      }
    });

    it('should skip already existing templates', async () => {
      // Pre-create report.md template
      const existingPath = path.join(tempDir, '.kiro', 'settings', 'templates', 'bugs', 'report.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing template', 'utf-8');

      const result = await installer.installTemplates(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skipped).toContain('report.md');
        expect(result.value.installed.length).toBe(3);
      }
    });
  });

  describe('updateClaudeMd', () => {
    it('should create CLAUDE.md with bug section if it does not exist', async () => {
      const result = await installer.updateClaudeMd(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.action).toBe('created');
      }

      const targetPath = path.join(tempDir, 'CLAUDE.md');
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain('Bug Fix');
      expect(content).toContain('/kiro:bug-create');
    });

    it('should skip if CLAUDE.md already contains bug workflow section', async () => {
      // Create CLAUDE.md with bug section already present
      const targetPath = path.join(tempDir, 'CLAUDE.md');
      await fs.writeFile(targetPath, `# Project\n\n## Bug Fix (Lightweight Workflow)\n\nAlready has bug workflow.`, 'utf-8');

      const result = await installer.updateClaudeMd(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.action).toBe('skipped');
        expect(result.value.reason).toBe('already_exists');
      }
    });

    it('should merge bug section into existing CLAUDE.md', async () => {
      // Create CLAUDE.md without bug section
      const targetPath = path.join(tempDir, 'CLAUDE.md');
      const existingContent = `# My Project

## Language

日本語で応答

## Development Rules

- Rule 1
- Rule 2
`;
      await fs.writeFile(targetPath, existingContent, 'utf-8');

      const result = await installer.updateClaudeMd(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.action).toBe('merged');
      }

      const content = await fs.readFile(targetPath, 'utf-8');
      // Should preserve existing content
      expect(content).toContain('My Project');
      expect(content).toContain('日本語で応答');
      expect(content).toContain('Rule 1');
      // Should add bug workflow section
      expect(content).toContain('Bug Fix');
      expect(content).toContain('/kiro:bug-create');
    });

    it('should insert bug section after Minimal Workflow section if it exists', async () => {
      const targetPath = path.join(tempDir, 'CLAUDE.md');
      const existingContent = `# My Project

## Minimal Workflow

### Feature Development (Full SDD)

- /kiro:spec-init
- /kiro:spec-requirements

## Development Rules

- Rule 1
`;
      await fs.writeFile(targetPath, existingContent, 'utf-8');

      const result = await installer.updateClaudeMd(tempDir);

      expect(result.ok).toBe(true);

      const content = await fs.readFile(targetPath, 'utf-8');
      // Bug section should be after Feature Development but before Development Rules
      const featureDevIndex = content.indexOf('Feature Development');
      const bugFixIndex = content.indexOf('Bug Fix');
      const devRulesIndex = content.indexOf('Development Rules');

      expect(featureDevIndex).toBeLessThan(bugFixIndex);
      expect(bugFixIndex).toBeLessThan(devRulesIndex);
    });
  });

  describe('installAll', () => {
    it('should install commands, templates, and update CLAUDE.md', async () => {
      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.installed.length).toBe(5);
        expect(result.value.templates.installed.length).toBe(4);
        expect(result.value.claudeMd.action).toBe('created');
      }
    });

    it('should report partial success when some files already exist', async () => {
      // Pre-create some files
      const cmdPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'bug-create.md');
      const tmplPath = path.join(tempDir, '.kiro', 'settings', 'templates', 'bugs', 'report.md');
      await fs.mkdir(path.dirname(cmdPath), { recursive: true });
      await fs.mkdir(path.dirname(tmplPath), { recursive: true });
      await fs.writeFile(cmdPath, 'Existing', 'utf-8');
      await fs.writeFile(tmplPath, 'Existing', 'utf-8');

      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.skipped).toContain('bug-create');
        expect(result.value.templates.skipped).toContain('report.md');
        expect(result.value.commands.installed.length).toBe(4);
        expect(result.value.templates.installed.length).toBe(3);
      }
    });
  });

  describe('checkInstallStatus', () => {
    it('should return not installed status for empty project', async () => {
      const status = await installer.checkInstallStatus(tempDir);

      expect(status.commands.installed).toEqual([]);
      expect(status.commands.missing).toEqual(BUG_COMMANDS);
      expect(status.templates.installed).toEqual([]);
      expect(status.templates.missing).toEqual(BUG_TEMPLATES);
      expect(status.claudeMd.hasBugSection).toBe(false);
    });

    it('should return fully installed status when all files exist', async () => {
      // Install everything
      await installer.installAll(tempDir);

      const status = await installer.checkInstallStatus(tempDir);

      expect(status.commands.installed).toEqual(expect.arrayContaining(BUG_COMMANDS));
      expect(status.commands.missing).toEqual([]);
      expect(status.templates.installed).toEqual(expect.arrayContaining(BUG_TEMPLATES));
      expect(status.templates.missing).toEqual([]);
      expect(status.claudeMd.hasBugSection).toBe(true);
    });

    it('should return partial status when some files exist', async () => {
      // Install only some files
      const cmdPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'bug-create.md');
      await fs.mkdir(path.dirname(cmdPath), { recursive: true });
      await fs.writeFile(cmdPath, 'Content', 'utf-8');

      const status = await installer.checkInstallStatus(tempDir);

      expect(status.commands.installed).toContain('bug-create');
      expect(status.commands.missing).not.toContain('bug-create');
      expect(status.commands.missing.length).toBe(4);
    });
  });
});

/**
 * Helper to check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
