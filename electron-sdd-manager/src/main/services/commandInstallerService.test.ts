/**
 * CommandInstallerService Tests
 * Requirements: 4.3, 4.5, 4.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CommandInstallerService, InstallResult, InstallError, FullInstallResult } from './commandInstallerService';
import { REQUIRED_COMMANDS, REQUIRED_SETTINGS } from './projectChecker';

describe('CommandInstallerService', () => {
  let installer: CommandInstallerService;
  let tempDir: string;
  let templateDir: string;

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
    // Create command templates
    for (const cmd of REQUIRED_COMMANDS) {
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
      const commands = ['spec-manager/init', 'spec-manager/requirements'];

      const result = await installer.installCommands(tempDir, commands);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('spec-manager/init');
        expect(result.value.installed).toContain('spec-manager/requirements');
        expect(result.value.skipped.length).toBe(0);
      }

      // Verify files were created
      const initPath = path.join(tempDir, '.claude', 'commands', 'spec-manager', 'init.md');
      const content = await fs.readFile(initPath, 'utf-8');
      expect(content).toContain('Template for spec-manager/init');
    });

    it('should skip already existing commands', async () => {
      // Pre-create init command
      const existingPath = path.join(tempDir, '.claude', 'commands', 'spec-manager', 'init.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'Existing content', 'utf-8');

      const commands = ['spec-manager/init', 'spec-manager/requirements'];

      const result = await installer.installCommands(tempDir, commands);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed).toContain('spec-manager/requirements');
        expect(result.value.skipped).toContain('spec-manager/init');
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
      const result = await installer.installCommands(tempDir, [...REQUIRED_COMMANDS]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed.length).toBe(REQUIRED_COMMANDS.length);
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
    it('should install all commands and settings', async () => {
      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.installed.length).toBe(REQUIRED_COMMANDS.length);
        expect(result.value.settings.installed.length).toBe(REQUIRED_SETTINGS.length);
      }
    });

    it('should skip existing files when installing all', async () => {
      // Pre-create some files
      const initPath = path.join(tempDir, '.claude', 'commands', 'spec-manager', 'init.md');
      const earsPath = path.join(tempDir, '.kiro', 'settings', 'rules', 'ears-format.md');
      await fs.mkdir(path.dirname(initPath), { recursive: true });
      await fs.mkdir(path.dirname(earsPath), { recursive: true });
      await fs.writeFile(initPath, 'Existing', 'utf-8');
      await fs.writeFile(earsPath, 'Existing', 'utf-8');

      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commands.skipped).toContain('spec-manager/init');
        expect(result.value.settings.skipped).toContain('rules/ears-format.md');
        expect(result.value.commands.installed.length).toBe(REQUIRED_COMMANDS.length - 1);
        expect(result.value.settings.installed.length).toBe(REQUIRED_SETTINGS.length - 1);
      }
    });
  });
});
