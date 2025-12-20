/**
 * CcSddWorkflowInstaller Tests
 * TDD: cc-sddコマンドセットインストール機能のテスト
 * Requirements: 3.1-3.8, 4.1-4.8, 6.1-6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  CcSddWorkflowInstaller,
  CC_SDD_COMMANDS,
  CC_SDD_AGENTS,
  CC_SDD_WORKFLOW_CLAUDE_MD_SECTION,
} from './ccSddWorkflowInstaller';

describe('CcSddWorkflowInstaller', () => {
  let installer: CcSddWorkflowInstaller;
  let tempDir: string;
  let templateDir: string;

  beforeEach(async () => {
    // Skip claude merge in test environment
    process.env.SKIP_CLAUDE_MERGE = 'true';

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-sdd-workflow-test-'));
    templateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-sdd-templates-'));
    installer = new CcSddWorkflowInstaller(templateDir);

    // Create template files
    await createTemplateFiles();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(templateDir, { recursive: true, force: true });
    // Clean up environment variable
    delete process.env.SKIP_CLAUDE_MERGE;
  });

  /**
   * Helper to create template files in template directory
   */
  async function createTemplateFiles(): Promise<void> {
    // Define command categories
    const specCommands = ['spec-init', 'spec-requirements', 'spec-design', 'spec-tasks', 'spec-impl', 'spec-status', 'spec-quick'];
    const validateCommands = ['validate-gap', 'validate-design', 'validate-impl'];
    const steeringCommands = ['steering', 'steering-custom'];
    const bugCommands = ['bug-create', 'bug-analyze', 'bug-fix', 'bug-verify', 'bug-status'];
    const documentReviewCommands = ['document-review', 'document-review-reply'];

    // Create command templates in new structure
    for (const cmd of [...specCommands, ...validateCommands, ...steeringCommands]) {
      const filePath = path.join(templateDir, 'commands', 'cc-sdd-agent', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}\nThis is a template file for cc-sdd command.`, 'utf-8');
    }

    for (const cmd of bugCommands) {
      const filePath = path.join(templateDir, 'commands', 'bug', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}\nThis is a template file for cc-sdd command.`, 'utf-8');
    }

    for (const cmd of documentReviewCommands) {
      const filePath = path.join(templateDir, 'commands', 'document-review', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}\nThis is a template file for cc-sdd command.`, 'utf-8');
    }

    // Create agent templates
    for (const agent of CC_SDD_AGENTS) {
      const filePath = path.join(templateDir, 'agents', 'kiro', `${agent}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Agent template for ${agent}\nThis is an agent template file.`, 'utf-8');
    }

    // Create settings templates (including Bug Workflow templates)
    const settingsTemplates = [
      // Rules
      'rules/ears-format.md',
      'rules/tasks-generation.md',
      'rules/tasks-parallel-analysis.md',
      'rules/design-discovery-full.md',
      'rules/design-discovery-light.md',
      'rules/design-principles.md',
      'rules/design-review.md',
      'rules/gap-analysis.md',
      'rules/steering-principles.md',
      // Spec templates
      'templates/specs/init.json',
      'templates/specs/requirements-init.md',
      'templates/specs/requirements.md',
      'templates/specs/design.md',
      'templates/specs/tasks.md',
      'templates/specs/research.md',
      // Steering templates
      'templates/steering/product.md',
      'templates/steering/structure.md',
      'templates/steering/tech.md',
      // Steering-custom templates
      'templates/steering-custom/api-standards.md',
      'templates/steering-custom/authentication.md',
      'templates/steering-custom/database.md',
      'templates/steering-custom/deployment.md',
      'templates/steering-custom/error-handling.md',
      'templates/steering-custom/security.md',
      'templates/steering-custom/testing.md',
      // Bug templates
      'templates/bugs/report.md',
      'templates/bugs/analysis.md',
      'templates/bugs/fix.md',
      'templates/bugs/verification.md',
    ];
    for (const template of settingsTemplates) {
      const filePath = path.join(templateDir, 'settings', template);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${template}\nThis is a settings template file.`, 'utf-8');
    }

    // Create CLAUDE.md template
    const claudeMdPath = path.join(templateDir, 'CLAUDE.md');
    await fs.writeFile(claudeMdPath, `# AI-DLC and Spec-Driven Development\n\n${CC_SDD_WORKFLOW_CLAUDE_MD_SECTION}`, 'utf-8');
  }

  describe('Constants', () => {
    it('should define all cc-sdd commands (19 types)', () => {
      // Spec Workflow (7)
      expect(CC_SDD_COMMANDS).toContain('spec-init');
      expect(CC_SDD_COMMANDS).toContain('spec-requirements');
      expect(CC_SDD_COMMANDS).toContain('spec-design');
      expect(CC_SDD_COMMANDS).toContain('spec-tasks');
      expect(CC_SDD_COMMANDS).toContain('spec-impl');
      expect(CC_SDD_COMMANDS).toContain('spec-status');
      expect(CC_SDD_COMMANDS).toContain('spec-quick');
      // Validation (3)
      expect(CC_SDD_COMMANDS).toContain('validate-gap');
      expect(CC_SDD_COMMANDS).toContain('validate-design');
      expect(CC_SDD_COMMANDS).toContain('validate-impl');
      // Document Review (2)
      expect(CC_SDD_COMMANDS).toContain('document-review');
      expect(CC_SDD_COMMANDS).toContain('document-review-reply');
      // Steering (2)
      expect(CC_SDD_COMMANDS).toContain('steering');
      expect(CC_SDD_COMMANDS).toContain('steering-custom');
      // Bug Workflow (5)
      expect(CC_SDD_COMMANDS).toContain('bug-create');
      expect(CC_SDD_COMMANDS).toContain('bug-analyze');
      expect(CC_SDD_COMMANDS).toContain('bug-fix');
      expect(CC_SDD_COMMANDS).toContain('bug-verify');
      expect(CC_SDD_COMMANDS).toContain('bug-status');
      // Total count
      expect(CC_SDD_COMMANDS.length).toBe(19);
    });

    it('should define all cc-sdd agents (9 types)', () => {
      // Spec Agents (4)
      expect(CC_SDD_AGENTS).toContain('spec-design');
      expect(CC_SDD_AGENTS).toContain('spec-impl');
      expect(CC_SDD_AGENTS).toContain('spec-requirements');
      expect(CC_SDD_AGENTS).toContain('spec-tasks');
      // Steering Agents (2)
      expect(CC_SDD_AGENTS).toContain('steering');
      expect(CC_SDD_AGENTS).toContain('steering-custom');
      // Validation Agents (3)
      expect(CC_SDD_AGENTS).toContain('validate-design');
      expect(CC_SDD_AGENTS).toContain('validate-gap');
      expect(CC_SDD_AGENTS).toContain('validate-impl');
      // Total count
      expect(CC_SDD_AGENTS.length).toBe(9);
    });

    it('should have CLAUDE.md section with cc-sdd workflow', () => {
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('Minimal Workflow');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('Feature Development (Full SDD)');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('Bug Fix (Lightweight Workflow)');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:spec-init');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:spec-requirements');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:spec-design');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:spec-tasks');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:spec-impl');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:spec-status');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:validate-gap');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:validate-design');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:validate-impl');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:bug-create');
      expect(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION).toContain('/kiro:bug-analyze');
    });
  });

  describe('installCommands', () => {
    it('should install all 19 cc-sdd commands to .claude/commands/kiro/', async () => {
      const result = await installer.installCommands(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed.length).toBe(19);
        expect(result.value.installed).toContain('spec-init');
        expect(result.value.installed).toContain('spec-requirements');
        expect(result.value.installed).toContain('spec-design');
        expect(result.value.installed).toContain('spec-tasks');
        expect(result.value.installed).toContain('spec-impl');
        expect(result.value.installed).toContain('spec-status');
        expect(result.value.installed).toContain('spec-quick');
        expect(result.value.installed).toContain('validate-gap');
        expect(result.value.installed).toContain('validate-design');
        expect(result.value.installed).toContain('validate-impl');
        expect(result.value.installed).toContain('document-review');
        expect(result.value.installed).toContain('document-review-reply');
        expect(result.value.installed).toContain('steering');
        expect(result.value.installed).toContain('steering-custom');
        expect(result.value.installed).toContain('bug-create');
        expect(result.value.installed).toContain('bug-analyze');
        expect(result.value.installed).toContain('bug-fix');
        expect(result.value.installed).toContain('bug-verify');
        expect(result.value.installed).toContain('bug-status');
      }

      // Verify files were created in correct location
      for (const cmd of CC_SDD_COMMANDS) {
        const targetPath = path.join(tempDir, '.claude', 'commands', 'kiro', `${cmd}.md`);
        const exists = await fileExists(targetPath);
        expect(exists).toBe(true);
      }
    });

    it('should skip already existing commands when force is false', async () => {
      // Pre-create spec-init command
      const existingPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing custom content', 'utf-8');

      const result = await installer.installCommands(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skipped).toContain('spec-init');
        expect(result.value.installed.length).toBe(18); // 19 - 1 skipped
      }

      // Verify existing file was not overwritten
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toBe('Existing custom content');
    });

    it('should overwrite existing commands when force is true', async () => {
      // Pre-create spec-init command
      const existingPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing custom content', 'utf-8');

      const result = await installer.installCommands(tempDir, undefined, { force: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.overwritten).toContain('spec-init');
        expect(result.value.installed.length).toBe(18); // 19 - 1 overwritten
      }

      // Verify file was overwritten
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toContain('Template for spec-init');
    });

    it('should return TEMPLATE_NOT_FOUND error when template file is missing', async () => {
      // Remove a template file from new structure
      const templatePath = path.join(templateDir, 'commands', 'cc-sdd-agent', 'spec-init.md');
      await fs.unlink(templatePath);

      const result = await installer.installCommands(tempDir);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TEMPLATE_NOT_FOUND');
        expect(result.error.path).toContain('spec-init.md');
      }
    });
  });

  describe('installAgents', () => {
    it('should install all 9 cc-sdd agents to .claude/agents/kiro/', async () => {
      const result = await installer.installAgents(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed.length).toBe(9);
        expect(result.value.installed).toContain('spec-design');
        expect(result.value.installed).toContain('spec-impl');
        expect(result.value.installed).toContain('spec-requirements');
        expect(result.value.installed).toContain('spec-tasks');
        expect(result.value.installed).toContain('steering');
        expect(result.value.installed).toContain('steering-custom');
        expect(result.value.installed).toContain('validate-design');
        expect(result.value.installed).toContain('validate-gap');
        expect(result.value.installed).toContain('validate-impl');
      }

      // Verify files were created in correct location
      for (const agent of CC_SDD_AGENTS) {
        const targetPath = path.join(tempDir, '.claude', 'agents', 'kiro', `${agent}.md`);
        const exists = await fileExists(targetPath);
        expect(exists).toBe(true);
      }
    });

    it('should skip already existing agents when force is false', async () => {
      // Pre-create spec-design agent
      const existingPath = path.join(tempDir, '.claude', 'agents', 'kiro', 'spec-design.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing agent content', 'utf-8');

      const result = await installer.installAgents(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skipped).toContain('spec-design');
        expect(result.value.installed.length).toBe(8);
      }

      // Verify existing file was not overwritten
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toBe('Existing agent content');
    });

    it('should overwrite existing agents when force is true', async () => {
      // Pre-create spec-design agent
      const existingPath = path.join(tempDir, '.claude', 'agents', 'kiro', 'spec-design.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing agent content', 'utf-8');

      const result = await installer.installAgents(tempDir, { force: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.overwritten).toContain('spec-design');
        expect(result.value.installed.length).toBe(8);
      }

      // Verify file was overwritten
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toContain('Agent template for spec-design');
    });

    it('should return TEMPLATE_NOT_FOUND error when agent template is missing', async () => {
      // Remove an agent template file
      const templatePath = path.join(templateDir, 'agents', 'kiro', 'spec-design.md');
      await fs.unlink(templatePath);

      const result = await installer.installAgents(tempDir);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TEMPLATE_NOT_FOUND');
        expect(result.error.path).toContain('spec-design.md');
      }
    });
  });

  describe('updateClaudeMd', () => {
    it('should create CLAUDE.md with cc-sdd section if it does not exist', async () => {
      const result = await installer.updateClaudeMd(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.action).toBe('created');
      }

      const targetPath = path.join(tempDir, 'CLAUDE.md');
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain('Minimal Workflow');
      expect(content).toContain('Feature Development (Full SDD)');
      expect(content).toContain('/kiro:spec-init');
    });

    it('should skip if CLAUDE.md already contains cc-sdd section', async () => {
      // Create CLAUDE.md with cc-sdd section already present
      const targetPath = path.join(tempDir, 'CLAUDE.md');
      await fs.writeFile(targetPath, `# Project\n\n## Minimal Workflow\n\n### Feature Development (Full SDD)\n\nAlready has cc-sdd workflow.`, 'utf-8');

      const result = await installer.updateClaudeMd(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.action).toBe('skipped');
        expect(result.value.reason).toBe('already_exists');
      }
    });

    it('should merge cc-sdd section into existing CLAUDE.md (fallback to simple merge)', async () => {
      // Create CLAUDE.md without cc-sdd section
      const targetPath = path.join(tempDir, 'CLAUDE.md');
      const existingContent = `# My Project

## Language

日本語で応答

## Development Rules

- Rule 1
- Rule 2
`;
      await fs.writeFile(targetPath, existingContent, 'utf-8');

      // Note: The actual merge uses claude -p, which may not be available in test environment
      // The implementation falls back to simple merge when claude -p fails
      const result = await installer.updateClaudeMd(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Expect merged (either via claude -p or fallback)
        expect(result.value.action).toBe('merged');
      }

      // Verify the content was merged
      const content = await fs.readFile(targetPath, 'utf-8');
      // Should preserve existing content
      expect(content).toContain('My Project');
      expect(content).toContain('日本語で応答');
      expect(content).toContain('Rule 1');
      // Should add cc-sdd workflow section
      expect(content).toContain('Feature Development (Full SDD)');
      expect(content).toContain('/kiro:spec-init');
    }, 10000); // Increase timeout for claude -p fallback
  });

  describe('installAll', () => {
    it('should install commands, agents, and update CLAUDE.md', async () => {
      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.installed.length).toBe(19);
        expect(result.value.agents.installed.length).toBe(9);
        expect(result.value.claudeMd.action).toBe('created');
      }
    });

    it('should report partial success when some files already exist', async () => {
      // Pre-create some files
      const cmdPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      const agentPath = path.join(tempDir, '.claude', 'agents', 'kiro', 'spec-design.md');
      await fs.mkdir(path.dirname(cmdPath), { recursive: true });
      await fs.mkdir(path.dirname(agentPath), { recursive: true });
      await fs.writeFile(cmdPath, 'Existing', 'utf-8');
      await fs.writeFile(agentPath, 'Existing', 'utf-8');

      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.skipped).toContain('spec-init');
        expect(result.value.agents.skipped).toContain('spec-design');
        expect(result.value.commands.installed.length).toBe(18); // 19 - 1 skipped
        expect(result.value.agents.installed.length).toBe(8);
      }
    });
  });

  describe('checkInstallStatus', () => {
    it('should return not installed status for empty project', async () => {
      const status = await installer.checkInstallStatus(tempDir);

      expect(status.commands.installed).toEqual([]);
      expect(status.commands.missing.length).toBe(19);
      expect(status.agents.installed).toEqual([]);
      expect(status.agents.missing.length).toBe(9);
      expect(status.claudeMd.exists).toBe(false);
      expect(status.claudeMd.hasCcSddSection).toBe(false);
    });

    it('should return fully installed status when all files exist', async () => {
      // Install everything
      await installer.installAll(tempDir);

      const status = await installer.checkInstallStatus(tempDir);

      expect(status.commands.installed.length).toBe(19);
      expect(status.commands.missing).toEqual([]);
      expect(status.agents.installed.length).toBe(9);
      expect(status.agents.missing).toEqual([]);
      expect(status.claudeMd.exists).toBe(true);
      expect(status.claudeMd.hasCcSddSection).toBe(true);
    });

    it('should return partial status when some files exist', async () => {
      // Install only some files
      const cmdPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      const agentPath = path.join(tempDir, '.claude', 'agents', 'kiro', 'spec-design.md');
      await fs.mkdir(path.dirname(cmdPath), { recursive: true });
      await fs.mkdir(path.dirname(agentPath), { recursive: true });
      await fs.writeFile(cmdPath, 'Content', 'utf-8');
      await fs.writeFile(agentPath, 'Content', 'utf-8');

      const status = await installer.checkInstallStatus(tempDir);

      expect(status.commands.installed).toContain('spec-init');
      expect(status.commands.missing).not.toContain('spec-init');
      expect(status.commands.missing.length).toBe(18); // 19 - 1 installed
      expect(status.agents.installed).toContain('spec-design');
      expect(status.agents.missing).not.toContain('spec-design');
      expect(status.agents.missing.length).toBe(8);
    });

    it('should detect cc-sdd section in existing CLAUDE.md', async () => {
      // Create CLAUDE.md with cc-sdd section
      const targetPath = path.join(tempDir, 'CLAUDE.md');
      await fs.writeFile(targetPath, `# Project\n\n## Minimal Workflow\n\n### Feature Development (Full SDD)\n\n/kiro:spec-init`, 'utf-8');

      const status = await installer.checkInstallStatus(tempDir);

      expect(status.claudeMd.exists).toBe(true);
      expect(status.claudeMd.hasCcSddSection).toBe(true);
    });

    it('should detect CLAUDE.md without cc-sdd section', async () => {
      // Create CLAUDE.md without cc-sdd section
      const targetPath = path.join(tempDir, 'CLAUDE.md');
      await fs.writeFile(targetPath, '# Project\n\n## Other content', 'utf-8');

      const status = await installer.checkInstallStatus(tempDir);

      expect(status.claudeMd.exists).toBe(true);
      expect(status.claudeMd.hasCcSddSection).toBe(false);
    });
  });
});

/**
 * Parallel operation tests - CcSddWorkflowInstaller and BugWorkflowInstaller
 * Requirements: 7.2, 7.3, 7.4
 */
describe('CcSddWorkflowInstaller - Parallel Operation', () => {
  let ccSddInstaller: CcSddWorkflowInstaller;
  let tempDir: string;
  let templateDir: string;

  beforeEach(async () => {
    process.env.SKIP_CLAUDE_MERGE = 'true';
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-sdd-parallel-test-'));
    templateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-sdd-parallel-templates-'));
    ccSddInstaller = new CcSddWorkflowInstaller(templateDir);

    // Create cc-sdd template files in new structure
    const specCommands = ['spec-init', 'spec-requirements', 'spec-design', 'spec-tasks', 'spec-impl', 'spec-status', 'spec-quick'];
    const validateCommands = ['validate-gap', 'validate-design', 'validate-impl'];
    const steeringCommands = ['steering', 'steering-custom'];
    const bugCommands = ['bug-create', 'bug-analyze', 'bug-fix', 'bug-verify', 'bug-status'];
    const documentReviewCommands = ['document-review', 'document-review-reply'];

    for (const cmd of [...specCommands, ...validateCommands, ...steeringCommands]) {
      const filePath = path.join(templateDir, 'commands', 'cc-sdd-agent', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# CC-SDD Command: ${cmd}`, 'utf-8');
    }
    for (const cmd of bugCommands) {
      const filePath = path.join(templateDir, 'commands', 'bug', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# CC-SDD Command: ${cmd}`, 'utf-8');
    }
    for (const cmd of documentReviewCommands) {
      const filePath = path.join(templateDir, 'commands', 'document-review', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# CC-SDD Command: ${cmd}`, 'utf-8');
    }
    for (const agent of CC_SDD_AGENTS) {
      const filePath = path.join(templateDir, 'agents', 'kiro', `${agent}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# CC-SDD Agent: ${agent}`, 'utf-8');
    }

    // Create settings templates (required by installAll)
    const settingsTemplates = [
      // Rules
      'rules/ears-format.md',
      'rules/tasks-generation.md',
      'rules/tasks-parallel-analysis.md',
      'rules/design-discovery-full.md',
      'rules/design-discovery-light.md',
      'rules/design-principles.md',
      'rules/design-review.md',
      'rules/gap-analysis.md',
      'rules/steering-principles.md',
      // Spec templates
      'templates/specs/init.json',
      'templates/specs/requirements-init.md',
      'templates/specs/requirements.md',
      'templates/specs/design.md',
      'templates/specs/tasks.md',
      'templates/specs/research.md',
      // Steering templates
      'templates/steering/product.md',
      'templates/steering/structure.md',
      'templates/steering/tech.md',
      // Steering-custom templates
      'templates/steering-custom/api-standards.md',
      'templates/steering-custom/authentication.md',
      'templates/steering-custom/database.md',
      'templates/steering-custom/deployment.md',
      'templates/steering-custom/error-handling.md',
      'templates/steering-custom/security.md',
      'templates/steering-custom/testing.md',
      // Bug templates
      'templates/bugs/report.md',
      'templates/bugs/analysis.md',
      'templates/bugs/fix.md',
      'templates/bugs/verification.md',
    ];
    for (const template of settingsTemplates) {
      const filePath = path.join(templateDir, 'settings', template);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${template}`, 'utf-8');
    }

    const claudeMdPath = path.join(templateDir, 'CLAUDE.md');
    await fs.writeFile(claudeMdPath, `# AI-DLC\n\n${CC_SDD_WORKFLOW_CLAUDE_MD_SECTION}`, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(templateDir, { recursive: true, force: true });
    delete process.env.SKIP_CLAUDE_MERGE;
  });

  it('should not overwrite bug workflow files when installing cc-sdd workflow', async () => {
    // Pre-create bug workflow files (simulating BugWorkflowInstaller)
    const bugCmdPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'bug-create.md');
    const bugTemplatePath = path.join(tempDir, '.kiro', 'templates', 'bugs', 'report.md');
    await fs.mkdir(path.dirname(bugCmdPath), { recursive: true });
    await fs.mkdir(path.dirname(bugTemplatePath), { recursive: true });
    await fs.writeFile(bugCmdPath, '# Bug Create Command', 'utf-8');
    await fs.writeFile(bugTemplatePath, '# Bug Report Template', 'utf-8');

    // Install cc-sdd workflow
    const result = await ccSddInstaller.installAll(tempDir);

    expect(result.ok).toBe(true);

    // Verify bug workflow files are intact (skipped because already existed)
    const bugCmdContent = await fs.readFile(bugCmdPath, 'utf-8');
    expect(bugCmdContent).toBe('# Bug Create Command');
    const bugTemplateContent = await fs.readFile(bugTemplatePath, 'utf-8');
    expect(bugTemplateContent).toBe('# Bug Report Template');

    // Verify cc-sdd files were installed (bug-create skipped)
    if (result.ok) {
      expect(result.value.commands.installed.length).toBe(18); // 19 - 1 skipped
      expect(result.value.commands.skipped).toContain('bug-create');
      expect(result.value.agents.installed.length).toBe(9);
    }
  });

  it('should install to different directories than BugWorkflowInstaller', async () => {
    // Install cc-sdd workflow
    await ccSddInstaller.installAll(tempDir);

    // cc-sdd commands go to .claude/commands/kiro/
    const ccSddCmdDir = path.join(tempDir, '.claude', 'commands', 'kiro');
    const ccSddAgentDir = path.join(tempDir, '.claude', 'agents', 'kiro');

    // Bug workflow commands also go to .claude/commands/kiro/ but with different names
    // Bug workflow templates go to .kiro/templates/bugs/

    // Verify cc-sdd specific files exist
    expect(await fileExists(path.join(ccSddCmdDir, 'spec-init.md'))).toBe(true);
    expect(await fileExists(path.join(ccSddCmdDir, 'spec-design.md'))).toBe(true);
    expect(await fileExists(path.join(ccSddAgentDir, 'spec-impl.md'))).toBe(true);

    // Verify bug commands are also installed (they're part of cc-sdd now)
    expect(await fileExists(path.join(ccSddCmdDir, 'bug-create.md'))).toBe(true);
    expect(await fileExists(path.join(ccSddCmdDir, 'bug-analyze.md'))).toBe(true);
  });

  it('should work independently of CommandInstallerService (spec-manager)', async () => {
    // Pre-create spec-manager commands (simulating CommandInstallerService)
    const specManagerCmdDir = path.join(tempDir, '.claude', 'commands', 'spec-manager');
    await fs.mkdir(specManagerCmdDir, { recursive: true });
    await fs.writeFile(path.join(specManagerCmdDir, 'init.md'), '# spec-manager:init', 'utf-8');
    await fs.writeFile(path.join(specManagerCmdDir, 'design.md'), '# spec-manager:design', 'utf-8');

    // Install cc-sdd workflow
    const result = await ccSddInstaller.installAll(tempDir);

    expect(result.ok).toBe(true);

    // Verify spec-manager commands are intact (different directory: spec-manager vs kiro)
    const specManagerInitContent = await fs.readFile(path.join(specManagerCmdDir, 'init.md'), 'utf-8');
    expect(specManagerInitContent).toBe('# spec-manager:init');

    // Verify cc-sdd commands were installed to kiro directory
    const kiroInitContent = await fs.readFile(path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md'), 'utf-8');
    expect(kiroInitContent).toContain('spec-init');
  });

  it('should both installers be able to run on the same project', async () => {
    // Create bug workflow template dir (simulating BugWorkflowInstaller setup)
    const bugTemplateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bug-templates-'));
    const bugCmdPath = path.join(bugTemplateDir, 'commands', 'bug', 'bug-create.md');
    await fs.mkdir(path.dirname(bugCmdPath), { recursive: true });
    await fs.writeFile(bugCmdPath, '# Bug Create', 'utf-8');

    // Simulate BugWorkflowInstaller installing its files
    const bugTargetPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'bug-create.md');
    await fs.mkdir(path.dirname(bugTargetPath), { recursive: true });
    await fs.writeFile(bugTargetPath, '# Bug Create', 'utf-8');

    // Install cc-sdd workflow
    const result = await ccSddInstaller.installAll(tempDir);

    expect(result.ok).toBe(true);

    // Both should coexist
    expect(await fileExists(path.join(tempDir, '.claude', 'commands', 'kiro', 'bug-create.md'))).toBe(true);
    expect(await fileExists(path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md'))).toBe(true);
    expect(await fileExists(path.join(tempDir, '.claude', 'agents', 'kiro', 'spec-impl.md'))).toBe(true);

    // Clean up
    await fs.rm(bugTemplateDir, { recursive: true, force: true });
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
