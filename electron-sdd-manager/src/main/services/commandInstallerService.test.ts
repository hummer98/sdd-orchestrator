/**
 * CommandInstallerService Tests
 * Requirements: 4.3, 4.5, 4.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CommandInstallerService } from './commandInstallerService';
import { REQUIRED_SETTINGS, COMMANDS_BY_PROFILE } from './projectChecker';

describe('CommandInstallerService', () => {
  let installer: CommandInstallerService;
  let tempDir: string;
  let templateDir: string;

  // Use cc-sdd-agent as default test profile (has spec-quick)
  const TEST_PROFILE = 'cc-sdd-agent' as const;
  const TEST_COMMANDS = COMMANDS_BY_PROFILE[TEST_PROFILE];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'installer-test-'));
    templateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'templates-'));
    installer = new CommandInstallerService(templateDir);

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
    // Create command templates for all profiles
    for (const cmd of TEST_COMMANDS) {
      const filePath = path.join(templateDir, 'commands', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}\nThis is a template file.`, 'utf-8');
    }

    // Create settings templates
    for (const setting of REQUIRED_SETTINGS) {
      const filePath = path.join(templateDir, 'settings', setting);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${setting}\nThis is a template file.`, 'utf-8');
    }
  }

  describe('installCommands', () => {
    it('should install specified commands to project', async () => {
      const commands = ['kiro/spec-init', 'kiro/spec-requirements'];

      const result = await installer.installCommands(tempDir, commands);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('kiro/spec-init');
        expect(result.value.installed).toContain('kiro/spec-requirements');
        expect(result.value.skipped.length).toBe(0);
      }

      // Verify files were created
      const initPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      const content = await fs.readFile(initPath, 'utf-8');
      expect(content).toContain('Template for kiro/spec-init');
    });

    it('should skip already existing commands', async () => {
      // Pre-create spec-init command
      const existingPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing content', 'utf-8');

      const commands = ['kiro/spec-init', 'kiro/spec-requirements'];

      const result = await installer.installCommands(tempDir, commands);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('kiro/spec-requirements');
        expect(result.value.skipped).toContain('kiro/spec-init');
      }

      // Verify existing file was not overwritten
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toBe('Existing content');
    });

    it('should return error when template not found', async () => {
      // Use a non-existent command
      const result = await installer.installCommands(tempDir, ['nonexistent/command']);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TEMPLATE_NOT_FOUND');
      }
    });

    it('should install all commands when called with full list', async () => {
      const result = await installer.installCommands(tempDir, [...TEST_COMMANDS]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed.length).toBe(TEST_COMMANDS.length);
      }
    });
  });

  describe('installSettings', () => {
    it('should install specified settings to project', async () => {
      const settings = ['rules/ears-format.md', 'templates/specs/design.md'];

      const result = await installer.installSettings(tempDir, settings);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('rules/ears-format.md');
        expect(result.value.installed).toContain('templates/specs/design.md');
      }

      // Verify files were created
      const earsPath = path.join(tempDir, '.kiro', 'settings', 'rules', 'ears-format.md');
      const content = await fs.readFile(earsPath, 'utf-8');
      expect(content).toContain('Template for rules/ears-format.md');
    });

    it('should skip already existing settings', async () => {
      // Pre-create ears-format.md
      const existingPath = path.join(tempDir, '.kiro', 'settings', 'rules', 'ears-format.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing content', 'utf-8');

      const settings = ['rules/ears-format.md', 'templates/specs/design.md'];

      const result = await installer.installSettings(tempDir, settings);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('templates/specs/design.md');
        expect(result.value.skipped).toContain('rules/ears-format.md');
      }
    });
  });

  describe('installAll', () => {
    it('should install all commands and settings for cc-sdd-agent profile', async () => {
      const result = await installer.installAll(tempDir, {}, 'cc-sdd-agent');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.installed.length).toBe(COMMANDS_BY_PROFILE['cc-sdd-agent'].length);
        expect(result.value.settings.installed.length).toBe(REQUIRED_SETTINGS.length);
      }
    });

    it('should install all commands and settings for cc-sdd profile', async () => {
      // Also create templates for cc-sdd profile commands
      for (const cmd of COMMANDS_BY_PROFILE['cc-sdd']) {
        const filePath = path.join(templateDir, 'commands', `${cmd}.md`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, `# Template for ${cmd}\nThis is a template file.`, 'utf-8');
      }

      const result = await installer.installAll(tempDir, {}, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.installed.length).toBe(COMMANDS_BY_PROFILE['cc-sdd'].length);
        expect(result.value.settings.installed.length).toBe(REQUIRED_SETTINGS.length);
        // cc-sdd should NOT include spec-quick
        expect(result.value.commands.installed).not.toContain('kiro/spec-quick');
      }
    });

    it('should skip existing files when installing all', async () => {
      // Pre-create some files
      const initPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'spec-init.md');
      const earsPath = path.join(tempDir, '.kiro', 'settings', 'rules', 'ears-format.md');
      await fs.mkdir(path.dirname(initPath), { recursive: true });
      await fs.mkdir(path.dirname(earsPath), { recursive: true });
      await fs.writeFile(initPath, 'Existing', 'utf-8');
      await fs.writeFile(earsPath, 'Existing', 'utf-8');

      const result = await installer.installAll(tempDir, {}, 'cc-sdd-agent');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.skipped).toContain('kiro/spec-init');
        expect(result.value.settings.skipped).toContain('rules/ears-format.md');
        expect(result.value.commands.installed.length).toBe(COMMANDS_BY_PROFILE['cc-sdd-agent'].length - 1);
        expect(result.value.settings.installed.length).toBe(REQUIRED_SETTINGS.length - 1);
      }
    });

    it('should default to cc-sdd-agent profile when not specified', async () => {
      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.installed.length).toBe(COMMANDS_BY_PROFILE['cc-sdd-agent'].length);
      }
    });
  });
});
