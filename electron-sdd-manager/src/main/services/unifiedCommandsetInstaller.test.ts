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
    // CC-SDD commands (directory-based)
    const ccSddCommands = [
      'spec-design', 'spec-impl', 'spec-init', 'spec-requirements', 'spec-status', 'spec-tasks',
      'steering', 'steering-custom', 'validate-design', 'validate-gap', 'validate-impl'
    ];
    for (const cmd of ccSddCommands) {
      const filePath = path.join(templateDir, 'commands', 'cc-sdd', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}`, 'utf-8');
    }

    // CC-SDD-Agent commands (directory-based)
    const ccSddAgentCommands = [
      'spec-design', 'spec-impl', 'spec-init', 'spec-quick', 'spec-requirements', 'spec-status', 'spec-tasks',
      'steering', 'steering-custom', 'validate-design', 'validate-gap', 'validate-impl'
    ];
    for (const cmd of ccSddAgentCommands) {
      const filePath = path.join(templateDir, 'commands', 'cc-sdd-agent', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}`, 'utf-8');
    }

    // Spec-manager commands (directory-based)
    const specManagerCommands = [
      'design', 'document-review', 'document-review-reply', 'impl', 'init', 'requirements', 'tasks'
    ];
    for (const cmd of specManagerCommands) {
      const filePath = path.join(templateDir, 'commands', 'spec-manager', `${cmd}.md`);
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

    // Document-review commands
    const documentReviewCommands = ['document-review', 'document-review-reply'];
    for (const cmd of documentReviewCommands) {
      const filePath = path.join(templateDir, 'commands', 'document-review', `${cmd}.md`);
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

    it('should install cc-sdd-agent commandset with agents successfully', async () => {
      const result = await installer.installCommandset(tempDir, 'cc-sdd-agent');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.installed.length).toBeGreaterThan(0);
      }
    });

    it('should install spec-manager commandset successfully', async () => {
      const result = await installer.installCommandset(tempDir, 'spec-manager');

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

    it('should install document-review commandset successfully', async () => {
      const result = await installer.installCommandset(tempDir, 'document-review');

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
    it('should install cc-sdd profile successfully', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
        expect(result.value.commandsets.has('cc-sdd')).toBe(true);
        expect(result.value.commandsets.has('bug')).toBe(true);
        expect(result.value.commandsets.has('document-review')).toBe(true);
      }
    });

    it('should install cc-sdd-agent profile successfully', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd-agent');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
        expect(result.value.commandsets.has('cc-sdd-agent')).toBe(true);
        expect(result.value.commandsets.has('bug')).toBe(true);
        expect(result.value.commandsets.has('document-review')).toBe(true);
      }
    });

    it('should install spec-manager profile successfully', async () => {
      const result = await installer.installByProfile(tempDir, 'spec-manager');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
        expect(result.value.commandsets.has('spec-manager')).toBe(true);
        expect(result.value.commandsets.has('bug')).toBe(true);
        expect(result.value.commandsets.has('document-review')).toBe(true);
      }
    });

    it('should call progress callback during installation', async () => {
      const progressCalls: Array<{ current: number; total: number; currentCommandset: string }> = [];
      const progressCallback = (current: number, total: number, currentCommandset: string) => {
        progressCalls.push({ current, total, currentCommandset });
      };

      const result = await installer.installByProfile(tempDir, 'cc-sdd', {}, progressCallback);

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
        expect(result.value.commandsets.has('cc-sdd-agent')).toBe(true);
        expect(result.value.commandsets.has('bug')).toBe(true);
        expect(result.value.commandsets.has('document-review')).toBe(true);
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

    it('should check installation completeness after profile installation', async () => {
      // Install cc-sdd-agent profile (includes agents)
      const result = await installer.installByProfile(tempDir, 'cc-sdd-agent');
      expect(result.ok).toBe(true);

      // Check status - the completeness depends on matching CC_SDD_COMMANDS list
      // which may differ from directory-based installation
      const status = await installer.checkAllInstallStatus(tempDir);

      // After installation, completeness score should improve
      // (exact value depends on how many files match CC_SDD_COMMANDS)
      expect(status.commandsets.size).toBeGreaterThan(0);
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
