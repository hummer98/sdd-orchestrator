/**
 * ProjectChecker Tests
 * Requirements: 4.1, 4.2, 4.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (name: string) => {
      if (name === 'logs') return '/tmp/test-logs';
      if (name === 'userData') return '/tmp/test-userdata';
      return '/tmp/test';
    },
  },
}));

import { ProjectChecker, FileCheckResult, FullCheckResult, REQUIRED_COMMANDS, REQUIRED_SETTINGS } from './projectChecker';

describe('ProjectChecker', () => {
  let checker: ProjectChecker;
  let tempDir: string;

  beforeEach(async () => {
    checker = new ProjectChecker();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'projectchecker-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create command files
   */
  async function createCommandFiles(commands: string[]): Promise<void> {
    for (const cmd of commands) {
      const filePath = path.join(tempDir, '.claude', 'commands', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# ${cmd}`, 'utf-8');
    }
  }

  /**
   * Helper to create settings files
   */
  async function createSettingsFiles(settings: string[]): Promise<void> {
    for (const setting of settings) {
      const filePath = path.join(tempDir, '.kiro', 'settings', setting);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# ${setting}`, 'utf-8');
    }
  }

  describe('checkSlashCommands', () => {
    it('should return all missing when no commands exist', async () => {
      const result = await checker.checkSlashCommands(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.missing.length).toBe(REQUIRED_COMMANDS.length);
      expect(result.present.length).toBe(0);
    });

    it('should return all present when all commands exist', async () => {
      await createCommandFiles(REQUIRED_COMMANDS);

      const result = await checker.checkSlashCommands(tempDir);

      expect(result.allPresent).toBe(true);
      expect(result.missing.length).toBe(0);
      expect(result.present.length).toBe(REQUIRED_COMMANDS.length);
    });

    it('should correctly identify partial installations', async () => {
      // Create only init and requirements commands
      await createCommandFiles(['kiro/spec-init', 'kiro/spec-requirements']);

      const result = await checker.checkSlashCommands(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.present).toContain('kiro/spec-init');
      expect(result.present).toContain('kiro/spec-requirements');
      expect(result.missing).toContain('kiro/spec-design');
      expect(result.missing).toContain('kiro/spec-tasks');
      expect(result.missing).toContain('kiro/spec-impl');
    });
  });

  describe('checkSettings', () => {
    it('should return all missing when no settings exist', async () => {
      const result = await checker.checkSettings(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.missing.length).toBe(REQUIRED_SETTINGS.length);
      expect(result.present.length).toBe(0);
    });

    it('should return all present when all settings exist', async () => {
      await createSettingsFiles(REQUIRED_SETTINGS);

      const result = await checker.checkSettings(tempDir);

      expect(result.allPresent).toBe(true);
      expect(result.missing.length).toBe(0);
      expect(result.present.length).toBe(REQUIRED_SETTINGS.length);
    });

    it('should correctly identify partial installations', async () => {
      // Create only some settings
      await createSettingsFiles(['rules/ears-format.md', 'templates/specs/design.md']);

      const result = await checker.checkSettings(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.present).toContain('rules/ears-format.md');
      expect(result.present).toContain('templates/specs/design.md');
      expect(result.missing).toContain('rules/tasks-generation.md');
    });
  });

  describe('checkAll', () => {
    it('should return false for allPresent when neither commands nor settings exist', async () => {
      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.commands.allPresent).toBe(false);
      expect(result.settings.allPresent).toBe(false);
    });

    it('should return true for allPresent when both commands and settings exist', async () => {
      await createCommandFiles(REQUIRED_COMMANDS);
      await createSettingsFiles(REQUIRED_SETTINGS);

      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(true);
      expect(result.commands.allPresent).toBe(true);
      expect(result.settings.allPresent).toBe(true);
    });

    it('should return false when only commands exist', async () => {
      await createCommandFiles(REQUIRED_COMMANDS);

      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.commands.allPresent).toBe(true);
      expect(result.settings.allPresent).toBe(false);
    });

    it('should return false when only settings exist', async () => {
      await createSettingsFiles(REQUIRED_SETTINGS);

      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.commands.allPresent).toBe(false);
      expect(result.settings.allPresent).toBe(true);
    });
  });
});

describe('Constants', () => {
  it('should have 14 required commands for CC-SDD (kiro namespace)', () => {
    expect(REQUIRED_COMMANDS).toEqual([
      'kiro/spec-init',
      'kiro/spec-requirements',
      'kiro/spec-design',
      'kiro/spec-tasks',
      'kiro/spec-impl',
      'kiro/spec-status',
      'kiro/spec-quick',
      'kiro/validate-gap',
      'kiro/validate-design',
      'kiro/validate-impl',
      'kiro/document-review',
      'kiro/document-review-reply',
      'kiro/steering',
      'kiro/steering-custom',
    ]);
  });

  it('should have all required settings files', () => {
    expect(REQUIRED_SETTINGS).toContain('rules/ears-format.md');
    expect(REQUIRED_SETTINGS).toContain('rules/tasks-generation.md');
    expect(REQUIRED_SETTINGS).toContain('rules/tasks-parallel-analysis.md');
    expect(REQUIRED_SETTINGS).toContain('templates/specs/init.json');
    expect(REQUIRED_SETTINGS).toContain('templates/specs/requirements-init.md');
    expect(REQUIRED_SETTINGS).toContain('templates/specs/requirements.md');
    expect(REQUIRED_SETTINGS).toContain('templates/specs/design.md');
    expect(REQUIRED_SETTINGS).toContain('templates/specs/tasks.md');
  });
});
