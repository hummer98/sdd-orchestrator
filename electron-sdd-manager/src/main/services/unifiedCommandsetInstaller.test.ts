/**
 * UnifiedCommandsetInstaller Tests
 * TDD: 統合コマンドセットインストーラーのテスト
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.6, 12.1, 12.2, 12.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock electron app before importing installers
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
  UnifiedCommandsetInstaller,
  CommandsetName,
  ProfileName,
  UnifiedInstallResult,
  UnifiedInstallStatus,
} from './unifiedCommandsetInstaller';
import { CcSddWorkflowInstaller } from './ccSddWorkflowInstaller';
import { BugWorkflowInstaller } from './bugWorkflowInstaller';

describe('UnifiedCommandsetInstaller', () => {
  let installer: UnifiedCommandsetInstaller;
  let tempDir: string;
  let templateDir: string;

  beforeEach(async () => {
    // Skip claude merge in test environment
    process.env.SKIP_CLAUDE_MERGE = 'true';

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unified-installer-test-'));
    templateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unified-templates-'));

    // Create template files
    await createTemplateFiles();

    // Create installers
    const ccSddInstaller = new CcSddWorkflowInstaller(templateDir);
    const bugInstaller = new BugWorkflowInstaller(templateDir);
    installer = new UnifiedCommandsetInstaller(ccSddInstaller, bugInstaller, templateDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(templateDir, { recursive: true, force: true });
    delete process.env.SKIP_CLAUDE_MERGE;
  });

  /**
   * Helper to create template files
   */
  async function createTemplateFiles(): Promise<void> {
    // CC-SDD commands
    const ccSddCommands = [
      'spec-init', 'spec-requirements', 'spec-design', 'spec-tasks', 'spec-impl', 'spec-status', 'spec-quick',
      'validate-gap', 'validate-design', 'validate-impl',
      'document-review', 'document-review-reply',
      'steering', 'steering-custom'
    ];

    for (const cmd of ccSddCommands) {
      const subdir = cmd.startsWith('document-review') ? 'document-review' : 'cc-sdd-agent';
      const filePath = path.join(templateDir, 'commands', subdir, `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}`, 'utf-8');
    }

    // Bug commands
    const bugCommands = ['bug-create', 'bug-analyze', 'bug-fix', 'bug-verify', 'bug-status'];
    for (const cmd of bugCommands) {
      const filePath = path.join(templateDir, 'commands', 'bug', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}`, 'utf-8');
    }

    // Agents
    const agents = ['spec-design', 'spec-impl', 'spec-requirements', 'spec-tasks', 'steering', 'steering-custom', 'validate-design', 'validate-gap', 'validate-impl'];
    for (const agent of agents) {
      const filePath = path.join(templateDir, 'agents', 'kiro', `${agent}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Agent ${agent}`, 'utf-8');
    }

    // Settings
    const settings = [
      'rules/ears-format.md',
      'rules/tasks-generation.md',
      'rules/tasks-parallel-analysis.md',
      'templates/specs/init.json',
      'templates/specs/requirements-init.md',
      'templates/specs/requirements.md',
      'templates/specs/design.md',
      'templates/specs/tasks.md',
      'templates/bugs/report.md',
      'templates/bugs/analysis.md',
      'templates/bugs/fix.md',
      'templates/bugs/verification.md',
    ];
    for (const setting of settings) {
      const filePath = path.join(templateDir, 'settings', setting);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Setting ${setting}`, 'utf-8');
    }
  }

  describe('installCommandset', () => {
    it('should install cc-sdd commandset successfully', async () => {
      const result = await installer.installCommandset(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed.length).toBeGreaterThan(0);
      }
    });

    it('should install bug commandset successfully', async () => {
      const result = await installer.installCommandset(tempDir, 'bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed.length).toBeGreaterThan(0);
      }
    });

    it('should support force option', async () => {
      // Install first time
      await installer.installCommandset(tempDir, 'cc-sdd');

      // Install again with force
      const result = await installer.installCommandset(tempDir, 'cc-sdd', { force: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.overwritten.length).toBeGreaterThan(0);
      }
    });

    it('should skip existing files when force is false', async () => {
      // Install first time
      await installer.installCommandset(tempDir, 'cc-sdd');

      // Install again without force
      const result = await installer.installCommandset(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.skipped.length).toBeGreaterThan(0);
      }
    });
  });

  describe('installByProfile', () => {
    it('should install minimal profile successfully', async () => {
      const result = await installer.installByProfile(tempDir, 'minimal');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
      }
    });

    it('should install standard profile successfully', async () => {
      const result = await installer.installByProfile(tempDir, 'standard');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
        expect(result.value.commandsets.has('cc-sdd')).toBe(true);
        expect(result.value.commandsets.has('bug')).toBe(true);
      }
    });

    it('should install full profile successfully', async () => {
      const result = await installer.installByProfile(tempDir, 'full');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
        expect(result.value.commandsets.has('cc-sdd')).toBe(true);
        expect(result.value.commandsets.has('bug')).toBe(true);
      }
    });

    it('should install lightweight-bug-fix-only profile successfully', async () => {
      const result = await installer.installByProfile(tempDir, 'lightweight-bug-fix-only');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
        expect(result.value.commandsets.has('bug')).toBe(true);
      }
    });

    it('should call progress callback during installation', async () => {
      const progressCalls: Array<{ current: number; total: number; currentCommandset: string }> = [];
      const progressCallback = (current: number, total: number, currentCommandset: string) => {
        progressCalls.push({ current, total, currentCommandset });
      };

      const result = await installer.installByProfile(tempDir, 'standard', {}, progressCallback);

      expect(result.ok).toBe(true);
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('installAll', () => {
    it('should install all commandsets successfully', async () => {
      const result = await installer.installAll(tempDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
        expect(result.value.commandsets.has('cc-sdd')).toBe(true);
        expect(result.value.commandsets.has('bug')).toBe(true);
      }
    });

    it('should continue on partial failure', async () => {
      // Remove all bug command templates to cause failure
      await fs.rm(path.join(templateDir, 'commands', 'bug'), { recursive: true, force: true });
      await fs.rm(path.join(templateDir, 'settings', 'templates', 'bugs'), { recursive: true, force: true });

      const result = await installer.installAll(tempDir);

      // Should still return success even if one commandset fails
      expect(result.ok).toBe(true);
      if (result.ok) {
        // At least one failure should be recorded
        expect(result.value.summary.totalFailed).toBeGreaterThanOrEqual(1);
        // The result should contain both commandsets (one succeeded, one failed)
        expect(result.value.commandsets.size).toBe(2);
      }
    });

    it('should call progress callback during installation', async () => {
      const progressCalls: Array<{ current: number; total: number; currentCommandset: string }> = [];
      const progressCallback = (current: number, total: number, currentCommandset: string) => {
        progressCalls.push({ current, total, currentCommandset });
      };

      const result = await installer.installAll(tempDir, {}, progressCallback);

      expect(result.ok).toBe(true);
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('checkAllInstallStatus', () => {
    it('should return empty status for fresh project', async () => {
      const status = await installer.checkAllInstallStatus(tempDir);

      expect(status.commandsets.size).toBeGreaterThan(0);
      expect(status.isMinimalSetupComplete).toBe(false);
      expect(status.completenessScore).toBe(0);
    });

    it('should return full status after installation', async () => {
      await installer.installAll(tempDir);

      const status = await installer.checkAllInstallStatus(tempDir);

      expect(status.completenessScore).toBeGreaterThan(0);
    });
  });

  describe('isMinimalSetupComplete', () => {
    it('should return false for fresh project', async () => {
      const isComplete = await installer.isMinimalSetupComplete(tempDir);

      expect(isComplete).toBe(false);
    });

    it('should return true after minimal profile installation', async () => {
      await installer.installByProfile(tempDir, 'minimal');

      const isComplete = await installer.isMinimalSetupComplete(tempDir);

      expect(isComplete).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('should work with existing CcSddWorkflowInstaller API', async () => {
      const result = await installer.installCommandset(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Same interface as existing installer
        expect(result.value).toHaveProperty('installed');
        expect(result.value).toHaveProperty('skipped');
        expect(result.value).toHaveProperty('overwritten');
      }
    });

    it('should work with existing BugWorkflowInstaller API', async () => {
      const result = await installer.installCommandset(tempDir, 'bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Same interface as existing installer
        expect(result.value).toHaveProperty('installed');
        expect(result.value).toHaveProperty('skipped');
        expect(result.value).toHaveProperty('overwritten');
      }
    });
  });
});
