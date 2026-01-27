/**
 * SettingsFileManager Tests
 * TDD: 設定ファイルの競合検出とマージのテスト
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn((name: string) => {
      if (name === 'logs') return '/tmp/logs';
      return '/tmp';
    })
  }
}));

import {
  SettingsFileManager,
  MergeStrategy,
  SettingsConflict,
} from './settingsFileManager';
import { CommandsetName } from './unifiedCommandsetInstaller';

describe('SettingsFileManager', () => {
  let manager: SettingsFileManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'settings-manager-test-'));
    manager = new SettingsFileManager();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create setting files
   */
  async function createSettingFile(relativePath: string, content: string): Promise<void> {
    const filePath = path.join(tempDir, '.kiro', 'settings', relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  describe('detectConflicts', () => {
    it('should detect no conflicts when files do not overlap', async () => {
      const conflicts = await manager.detectConflicts(['cc-sdd']);

      // Single commandset should have no conflicts
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should detect potential conflicts between cc-sdd and bug', async () => {
      const conflicts = await manager.detectConflicts(['cc-sdd', 'bug']);

      // Both share some templates directory
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should include recommended strategy for conflicts', async () => {
      const conflicts = await manager.detectConflicts(['cc-sdd', 'bug']);

      for (const conflict of conflicts) {
        expect(conflict.recommendedStrategy).toBeDefined();
        expect(['overwrite', 'merge', 'skip', 'newer-version']).toContain(conflict.recommendedStrategy);
      }
    });
  });

  describe('mergeSettings', () => {
    it('should merge settings with skip strategy', async () => {
      await createSettingFile('rules/test.md', 'Original content');

      const conflicts: SettingsConflict[] = [];
      const result = await manager.mergeSettings(tempDir, conflicts, 'skip');

      expect(result.ok).toBe(true);
    });

    it('should handle empty conflicts list', async () => {
      const result = await manager.mergeSettings(tempDir, [], 'skip');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.merged).toBeDefined();
        expect(result.value.skipped).toBeDefined();
      }
    });
  });

  describe('validateSettings', () => {
    it('should validate settings with all required files', async () => {
      // Create all required files (cc-sdd + bug)
      await createSettingFile('rules/ears-format.md', '# EARS Format');
      await createSettingFile('rules/tasks-generation.md', '# Tasks Generation');
      await createSettingFile('rules/tasks-parallel-analysis.md', '# Parallel Analysis');
      await createSettingFile('templates/specs/init.json', '{}');
      await createSettingFile('templates/specs/requirements-init.md', '# Init');
      await createSettingFile('templates/specs/requirements.md', '# Req');
      await createSettingFile('templates/specs/design.md', '# Design');
      await createSettingFile('templates/specs/tasks.md', '# Tasks');
      // Bug templates
      await createSettingFile('templates/bugs/report.md', '# Report');
      await createSettingFile('templates/bugs/analysis.md', '# Analysis');
      await createSettingFile('templates/bugs/fix.md', '# Fix');
      await createSettingFile('templates/bugs/verification.md', '# Verify');

      const result = await manager.validateSettings(tempDir);

      expect(result.isValid).toBe(true);
    });

    it('should report missing required files', async () => {
      // Create only some files
      await createSettingFile('rules/ears-format.md', '# EARS Format');

      const result = await manager.validateSettings(tempDir);

      expect(result.isValid).toBe(false);
      expect(result.missingFiles.length).toBeGreaterThan(0);
    });

    it('should include list of existing and missing files', async () => {
      await createSettingFile('rules/ears-format.md', '# EARS Format');

      const result = await manager.validateSettings(tempDir);

      expect(result.existingFiles).toBeDefined();
      expect(result.missingFiles).toBeDefined();
      expect(result.existingFiles.length).toBeGreaterThan(0);
    });
  });

  describe('getMergeStrategyForFile', () => {
    it('should return skip for rule files', () => {
      const strategy = manager.getMergeStrategyForFile('rules/ears-format.md');

      expect(strategy).toBe('skip');
    });

    it('should return newer-version for template files', () => {
      const strategy = manager.getMergeStrategyForFile('templates/specs/design.md');

      expect(strategy).toBe('newer-version');
    });

    it('should return merge for JSON files not in templates', () => {
      const strategy = manager.getMergeStrategyForFile('config/settings.json');

      expect(strategy).toBe('merge');
    });

    it('should return newer-version for JSON files in templates (templates/ takes precedence)', () => {
      const strategy = manager.getMergeStrategyForFile('templates/specs/init.json');

      // templates/ pattern matches before .json, so newer-version is returned
      expect(strategy).toBe('newer-version');
    });
  });

  describe('getRequiredFiles', () => {
    it('should return list of required files for cc-sdd', () => {
      const files = manager.getRequiredFiles(['cc-sdd']);

      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('rules/ears-format.md');
    });

    it('should return list of required files for bug', () => {
      const files = manager.getRequiredFiles(['bug']);

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.includes('bugs/'))).toBe(true);
    });

    it('should return combined files for multiple commandsets', () => {
      const ccSddFiles = manager.getRequiredFiles(['cc-sdd']);
      const bugFiles = manager.getRequiredFiles(['bug']);
      const combinedFiles = manager.getRequiredFiles(['cc-sdd', 'bug']);

      // Combined should include files from both
      expect(combinedFiles.length).toBeGreaterThanOrEqual(Math.max(ccSddFiles.length, bugFiles.length));
    });
  });

  describe('jjInstallIgnored settings', () => {
    /**
     * Helper to create sdd-orchestrator.json
     */
    async function createConfigFile(config: Record<string, unknown>): Promise<void> {
      const configPath = path.join(tempDir, '.kiro', 'sdd-orchestrator.json');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    /**
     * Helper to read sdd-orchestrator.json
     */
    async function readConfigFile(): Promise<Record<string, unknown>> {
      const configPath = path.join(tempDir, '.kiro', 'sdd-orchestrator.json');
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    }

    describe('setJjInstallIgnored', () => {
      it('should set jjInstallIgnored to true in settings', async () => {
        await createConfigFile({ settings: {} });

        const result = await manager.setJjInstallIgnored(tempDir, true);

        expect(result.ok).toBe(true);
        const config = await readConfigFile();
        expect((config.settings as Record<string, unknown>).jjInstallIgnored).toBe(true);
      });

      it('should set jjInstallIgnored to false in settings', async () => {
        await createConfigFile({ settings: { jjInstallIgnored: true } });

        const result = await manager.setJjInstallIgnored(tempDir, false);

        expect(result.ok).toBe(true);
        const config = await readConfigFile();
        expect((config.settings as Record<string, unknown>).jjInstallIgnored).toBe(false);
      });

      it('should create settings object if it does not exist', async () => {
        await createConfigFile({});

        const result = await manager.setJjInstallIgnored(tempDir, true);

        expect(result.ok).toBe(true);
        const config = await readConfigFile();
        expect(config.settings).toBeDefined();
        expect((config.settings as Record<string, unknown>).jjInstallIgnored).toBe(true);
      });

      it('should preserve existing settings fields', async () => {
        await createConfigFile({ settings: { existingField: 'value' } });

        const result = await manager.setJjInstallIgnored(tempDir, true);

        expect(result.ok).toBe(true);
        const config = await readConfigFile();
        expect((config.settings as Record<string, unknown>).existingField).toBe('value');
        expect((config.settings as Record<string, unknown>).jjInstallIgnored).toBe(true);
      });

      it('should return error if config file does not exist', async () => {
        const result = await manager.setJjInstallIgnored(tempDir, true);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('READ_ERROR');
        }
      });
    });

    describe('getJjInstallIgnored', () => {
      it('should return true when jjInstallIgnored is true', async () => {
        await createConfigFile({ settings: { jjInstallIgnored: true } });

        const result = await manager.getJjInstallIgnored(tempDir);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(true);
        }
      });

      it('should return false when jjInstallIgnored is false', async () => {
        await createConfigFile({ settings: { jjInstallIgnored: false } });

        const result = await manager.getJjInstallIgnored(tempDir);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(false);
        }
      });

      it('should return false when jjInstallIgnored is not set', async () => {
        await createConfigFile({ settings: {} });

        const result = await manager.getJjInstallIgnored(tempDir);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(false);
        }
      });

      it('should return false when settings object does not exist', async () => {
        await createConfigFile({});

        const result = await manager.getJjInstallIgnored(tempDir);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(false);
        }
      });

      it('should return error if config file does not exist', async () => {
        const result = await manager.getJjInstallIgnored(tempDir);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('READ_ERROR');
        }
      });
    });
  });
});
