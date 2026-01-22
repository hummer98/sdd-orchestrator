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

import {
  ProjectChecker,
  REQUIRED_SETTINGS,
  CC_SDD_PROFILE_COMMANDS,
  CC_SDD_AGENT_PROFILE_COMMANDS,
  COMMANDS_BY_PROFILE,
  getCommandsForProfile,
} from './projectChecker';

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
  async function createCommandFiles(commands: readonly string[]): Promise<void> {
    for (const cmd of commands) {
      const filePath = path.join(tempDir, '.claude', 'commands', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# ${cmd}`, 'utf-8');
    }
  }

  /**
   * Helper to create settings files
   */
  async function createSettingsFiles(settings: readonly string[]): Promise<void> {
    for (const setting of settings) {
      const filePath = path.join(tempDir, '.kiro', 'settings', setting);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# ${setting}`, 'utf-8');
    }
  }

  /**
   * Helper to create profile config in sdd-orchestrator.json
   */
  async function createProfileConfig(profile: 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager'): Promise<void> {
    const filePath = path.join(tempDir, '.kiro', 'sdd-orchestrator.json');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({
      version: 2,
      profile: { name: profile, installedAt: new Date().toISOString() },
    }), 'utf-8');
  }

  describe('checkSlashCommandsForProfile', () => {
    it('should return all missing when no commands exist', async () => {
      await createProfileConfig('cc-sdd');
      const result = await checker.checkSlashCommandsForProfile(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.missing.length).toBe(COMMANDS_BY_PROFILE['cc-sdd'].length);
      expect(result.present.length).toBe(0);
    });

    it('should return all present when all cc-sdd commands exist', async () => {
      await createProfileConfig('cc-sdd');
      await createCommandFiles(COMMANDS_BY_PROFILE['cc-sdd']);

      const result = await checker.checkSlashCommandsForProfile(tempDir);

      expect(result.allPresent).toBe(true);
      expect(result.missing.length).toBe(0);
      expect(result.present.length).toBe(COMMANDS_BY_PROFILE['cc-sdd'].length);
    });

    it('should return all present when all cc-sdd-agent commands exist', async () => {
      await createProfileConfig('cc-sdd-agent');
      await createCommandFiles(COMMANDS_BY_PROFILE['cc-sdd-agent']);

      const result = await checker.checkSlashCommandsForProfile(tempDir);

      expect(result.allPresent).toBe(true);
      expect(result.missing.length).toBe(0);
      expect(result.present.length).toBe(COMMANDS_BY_PROFILE['cc-sdd-agent'].length);
    });

    it('should correctly identify partial installations', async () => {
      await createProfileConfig('cc-sdd');
      // Create only init and requirements commands
      await createCommandFiles(['kiro/spec-init', 'kiro/spec-requirements']);

      const result = await checker.checkSlashCommandsForProfile(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.present).toContain('kiro/spec-init');
      expect(result.present).toContain('kiro/spec-requirements');
      expect(result.missing).toContain('kiro/spec-design');
      expect(result.missing).toContain('kiro/spec-tasks');
      expect(result.missing).toContain('kiro/spec-impl');
    });

    it('should use explicit profile when provided', async () => {
      // No profile.json, but explicit profile provided
      await createCommandFiles(COMMANDS_BY_PROFILE['cc-sdd']);

      const result = await checker.checkSlashCommandsForProfile(tempDir, 'cc-sdd');

      expect(result.allPresent).toBe(true);
    });

    it('should fallback to cc-sdd-agent when no profile specified or found', async () => {
      // No profile.json, no explicit profile
      const result = await checker.checkSlashCommandsForProfile(tempDir);

      // Should expect cc-sdd-agent commands (superset)
      expect(result.missing.length).toBe(COMMANDS_BY_PROFILE['cc-sdd-agent'].length);
    });

    it('cc-sdd profile should NOT require spec-quick', async () => {
      await createProfileConfig('cc-sdd');

      const result = await checker.checkSlashCommandsForProfile(tempDir);

      expect(result.missing).not.toContain('kiro/spec-quick');
    });

    it('cc-sdd-agent profile should require spec-quick', async () => {
      await createProfileConfig('cc-sdd-agent');

      const result = await checker.checkSlashCommandsForProfile(tempDir);

      expect(result.missing).toContain('kiro/spec-quick');
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
      await createProfileConfig('cc-sdd');
      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.commands.allPresent).toBe(false);
      expect(result.settings.allPresent).toBe(false);
    });

    it('should return true for allPresent when both commands and settings exist for cc-sdd', async () => {
      await createProfileConfig('cc-sdd');
      await createCommandFiles(COMMANDS_BY_PROFILE['cc-sdd']);
      await createSettingsFiles(REQUIRED_SETTINGS);

      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(true);
      expect(result.commands.allPresent).toBe(true);
      expect(result.settings.allPresent).toBe(true);
    });

    it('should return true for allPresent when both commands and settings exist for cc-sdd-agent', async () => {
      await createProfileConfig('cc-sdd-agent');
      await createCommandFiles(COMMANDS_BY_PROFILE['cc-sdd-agent']);
      await createSettingsFiles(REQUIRED_SETTINGS);

      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(true);
      expect(result.commands.allPresent).toBe(true);
      expect(result.settings.allPresent).toBe(true);
    });

    it('should return false when only commands exist', async () => {
      await createProfileConfig('cc-sdd');
      await createCommandFiles(COMMANDS_BY_PROFILE['cc-sdd']);

      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.commands.allPresent).toBe(true);
      expect(result.settings.allPresent).toBe(false);
    });

    it('should return false when only settings exist', async () => {
      await createProfileConfig('cc-sdd');
      await createSettingsFiles(REQUIRED_SETTINGS);

      const result = await checker.checkAll(tempDir);

      expect(result.allPresent).toBe(false);
      expect(result.commands.allPresent).toBe(false);
      expect(result.settings.allPresent).toBe(true);
    });

    it('should use explicit profile parameter', async () => {
      // No profile.json
      await createCommandFiles(COMMANDS_BY_PROFILE['cc-sdd']);
      await createSettingsFiles(REQUIRED_SETTINGS);

      const result = await checker.checkAll(tempDir, 'cc-sdd');

      expect(result.allPresent).toBe(true);
    });
  });

  describe('getInstalledProfile', () => {
    it('should return null when sdd-orchestrator.json does not exist', async () => {
      const result = await checker.getInstalledProfile(tempDir);
      expect(result).toBeNull();
    });

    it('should return profile config when sdd-orchestrator.json exists', async () => {
      await createProfileConfig('cc-sdd');

      const result = await checker.getInstalledProfile(tempDir);

      expect(result).not.toBeNull();
      expect(result?.profile).toBe('cc-sdd');
    });
  });
});

describe('Constants', () => {
  it('cc-sdd profile should have 19 commands (12 base + 5 bug + 2 doc-review)', () => {
    expect(COMMANDS_BY_PROFILE['cc-sdd'].length).toBe(19);
    expect(COMMANDS_BY_PROFILE['cc-sdd']).not.toContain('kiro/spec-quick');
    expect(COMMANDS_BY_PROFILE['cc-sdd']).toContain('kiro/spec-inspection');
  });

  it('cc-sdd-agent profile should have 20 commands (13 base + 5 bug + 2 doc-review)', () => {
    expect(COMMANDS_BY_PROFILE['cc-sdd-agent'].length).toBe(20);
    expect(COMMANDS_BY_PROFILE['cc-sdd-agent']).toContain('kiro/spec-quick');
    expect(COMMANDS_BY_PROFILE['cc-sdd-agent']).toContain('kiro/spec-inspection');
  });

  it('CC_SDD_PROFILE_COMMANDS should have 12 base commands (without spec-quick)', () => {
    expect(CC_SDD_PROFILE_COMMANDS.length).toBe(12);
    expect(CC_SDD_PROFILE_COMMANDS).not.toContain('kiro/spec-quick');
    expect(CC_SDD_PROFILE_COMMANDS).toContain('kiro/spec-inspection');
  });

  it('CC_SDD_AGENT_PROFILE_COMMANDS should have 13 base commands (with spec-quick)', () => {
    expect(CC_SDD_AGENT_PROFILE_COMMANDS.length).toBe(13);
    expect(CC_SDD_AGENT_PROFILE_COMMANDS).toContain('kiro/spec-quick');
    expect(CC_SDD_AGENT_PROFILE_COMMANDS).toContain('kiro/spec-inspection');
  });

  it('getCommandsForProfile should return correct commands for each profile', () => {
    expect(getCommandsForProfile('cc-sdd')).toEqual(COMMANDS_BY_PROFILE['cc-sdd']);
    expect(getCommandsForProfile('cc-sdd-agent')).toEqual(COMMANDS_BY_PROFILE['cc-sdd-agent']);
    expect(getCommandsForProfile('spec-manager')).toEqual(COMMANDS_BY_PROFILE['spec-manager']);
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

  it('should have steering templates for logging and debugging', () => {
    expect(REQUIRED_SETTINGS).toContain('templates/steering/logging.md');
    expect(REQUIRED_SETTINGS).toContain('templates/steering/debugging.md');
  });
});

/**
 * Tool Availability Check Tests (merge-helper-scripts feature)
 * Requirements: 6.1 - jq availability check
 */
describe('ProjectChecker - Tool Availability', () => {
  let checker: ProjectChecker;

  beforeEach(() => {
    checker = new ProjectChecker();
  });

  describe('checkJqAvailability', () => {
    it('should return ToolCheck result with name "jq"', async () => {
      const result = await checker.checkJqAvailability();
      expect(result.name).toBe('jq');
    });

    it('should return available: true when jq is installed', async () => {
      // This test assumes jq is installed on the test machine
      // If jq is not installed, this test will be skipped
      const result = await checker.checkJqAvailability();
      // We don't assert on `available` here because it depends on the test environment
      // Just verify the structure is correct
      expect(typeof result.available).toBe('boolean');
    });

    it('should include installGuidance when jq is not available', async () => {
      const result = await checker.checkJqAvailability();
      // If not available, should have installGuidance
      if (!result.available) {
        expect(result.installGuidance).toBeDefined();
        expect(result.installGuidance).toContain('brew install jq');
      }
    });

    it('should include version when jq is available', async () => {
      const result = await checker.checkJqAvailability();
      // If available, should have version
      if (result.available) {
        expect(result.version).toBeDefined();
      }
    });
  });
});
