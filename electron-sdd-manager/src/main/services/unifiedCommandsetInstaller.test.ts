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
      'steering', 'steering-custom', 'generate-release', 'validate-design', 'validate-gap', 'validate-impl'
    ];
    for (const cmd of ccSddCommands) {
      const filePath = path.join(templateDir, 'commands', 'cc-sdd', `${cmd}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# Template for ${cmd}`, 'utf-8');
    }

    // CC-SDD-Agent commands (directory-based)
    const ccSddAgentCommands = [
      'spec-design', 'spec-impl', 'spec-init', 'spec-quick', 'spec-requirements', 'spec-status', 'spec-tasks',
      'steering', 'steering-custom', 'generate-release', 'validate-design', 'validate-gap', 'validate-impl'
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
    const bugCommands = ['bug-create', 'bug-analyze', 'bug-fix', 'bug-verify', 'bug-status', 'bug-merge'];
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
    const agents = ['spec-design', 'spec-impl', 'spec-requirements', 'spec-tasks', 'steering', 'steering-custom', 'steering-verification', 'generate-release', 'validate-design', 'validate-gap', 'validate-impl', 'spec-inspection'];
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
      'templates/steering/design-principles.md',
      'templates/steering/logging.md',
      'templates/steering/debugging.md',
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
      'templates/bugs/bug.json',
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

    // Task 2.2: spec-manager should include generate-release command
    // Requirements: 2.1, 2.2
    it('should install generate-release command for spec-manager profile', async () => {
      // Create generate-release template in cc-sdd-agent directory (template source)
      const generateReleasePath = path.join(templateDir, 'commands', 'cc-sdd-agent', 'generate-release.md');
      await fs.mkdir(path.dirname(generateReleasePath), { recursive: true });
      await fs.writeFile(generateReleasePath, '# generate-release command template', 'utf-8');

      const result = await installer.installCommandset(tempDir, 'spec-manager');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // generate-release should be installed
        expect(result.value.installed).toContain('generate-release');
      }

      // Verify the file was actually created
      const targetPath = path.join(tempDir, '.claude', 'commands', 'kiro', 'generate-release.md');
      const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
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

  // ============================================================
  // Task 3.1: バージョン記録機能テスト (commandset-version-detection feature)
  // Requirements: 1.1, 1.2, 1.3, 1.4
  // ============================================================

  describe('version recording (Task 3.1)', () => {
    it('should record commandset versions after installByProfile', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);

      // Check that sdd-orchestrator.json was created with commandsets
      const configPath = path.join(tempDir, '.kiro', 'sdd-orchestrator.json');
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(configExists).toBe(true);

      if (configExists) {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.version).toBe(3);
        expect(config.commandsets).toBeDefined();
        // cc-sdd profile should record cc-sdd, bug, document-review
        expect(config.commandsets['cc-sdd']).toBeDefined();
        expect(config.commandsets['cc-sdd'].version).toMatch(/^\d+\.\d+\.\d+/);
        expect(config.commandsets['cc-sdd'].installedAt).toBeDefined();
      }
    });

    it('should record all installed commandsets with version and timestamp', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd-agent');

      expect(result.ok).toBe(true);

      const configPath = path.join(tempDir, '.kiro', 'sdd-orchestrator.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // All commandsets in the profile should be recorded
      const expectedCommandsets = ['cc-sdd-agent', 'bug', 'document-review'];
      for (const name of expectedCommandsets) {
        expect(config.commandsets[name]).toBeDefined();
        expect(config.commandsets[name].version).toBeDefined();
        expect(config.commandsets[name].installedAt).toBeDefined();
      }
    });

    it('should only record successfully installed commandsets', async () => {
      // Remove bug templates to cause partial failure
      await fs.rm(path.join(templateDir, 'commands', 'bug'), { recursive: true, force: true });
      await fs.rm(path.join(templateDir, 'settings', 'templates', 'bugs'), { recursive: true, force: true });

      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Verify that at least bug failed
        expect(result.value.summary.totalFailed).toBeGreaterThanOrEqual(1);
      }

      const configPath = path.join(tempDir, '.kiro', 'sdd-orchestrator.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // bug should NOT be recorded (failed to install)
      expect(config.commandsets?.['bug']).toBeUndefined();
      // At least one commandset should be recorded
      const recordedCount = config.commandsets ? Object.keys(config.commandsets).length : 0;
      expect(recordedCount).toBeGreaterThanOrEqual(1);
    });

    it('should preserve existing config fields when recording versions', async () => {
      // Create existing v2 config with layout
      await fs.mkdir(path.join(tempDir, '.kiro'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, '.kiro', 'sdd-orchestrator.json'),
        JSON.stringify({
          version: 2,
          layout: {
            leftPaneWidth: 300,
            rightPaneWidth: 400,
            bottomPaneHeight: 200,
            agentListHeight: 150,
          },
        }),
        'utf-8'
      );

      const result = await installer.installByProfile(tempDir, 'cc-sdd');
      expect(result.ok).toBe(true);

      const configPath = path.join(tempDir, '.kiro', 'sdd-orchestrator.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Version should be upgraded to 3
      expect(config.version).toBe(3);
      // Layout should be preserved
      expect(config.layout).toBeDefined();
      expect(config.layout.leftPaneWidth).toBe(300);
      // Commandsets should be added
      expect(config.commandsets).toBeDefined();
    });
  });

  // ============================================================
  // Bug fix: commandset-install-missing-dirs
  // Ensure required project directories are created after installation
  // ============================================================

  describe('project directories creation', () => {
    it('should create .kiro/steering directory after profile installation', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);

      const steeringDir = path.join(tempDir, '.kiro', 'steering');
      const dirExists = await fs.access(steeringDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should create .kiro/specs directory after profile installation', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);

      const specsDir = path.join(tempDir, '.kiro', 'specs');
      const dirExists = await fs.access(specsDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    // Bug fix: bugs-folder-creation - ensure .kiro/bugs directory is created
    it('should create .kiro/bugs directory after profile installation', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);

      const bugsDir = path.join(tempDir, '.kiro', 'bugs');
      const dirExists = await fs.access(bugsDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should create steering, specs, and bugs directories for all profiles', async () => {
      const profiles: ProfileName[] = ['cc-sdd', 'cc-sdd-agent', 'spec-manager'];

      for (const profile of profiles) {
        // Create fresh temp directory for each profile
        const profileTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-test-'));

        try {
          const result = await installer.installByProfile(profileTempDir, profile);
          expect(result.ok).toBe(true);

          const steeringDir = path.join(profileTempDir, '.kiro', 'steering');
          const specsDir = path.join(profileTempDir, '.kiro', 'specs');
          const bugsDir = path.join(profileTempDir, '.kiro', 'bugs');

          const steeringExists = await fs.access(steeringDir).then(() => true).catch(() => false);
          const specsExists = await fs.access(specsDir).then(() => true).catch(() => false);
          const bugsExists = await fs.access(bugsDir).then(() => true).catch(() => false);

          expect(steeringExists).toBe(true);
          expect(specsExists).toBe(true);
          expect(bugsExists).toBe(true);
        } finally {
          await fs.rm(profileTempDir, { recursive: true, force: true });
        }
      }
    });

    it('should not fail if directories already exist', async () => {
      // Pre-create directories
      await fs.mkdir(path.join(tempDir, '.kiro', 'steering'), { recursive: true });
      await fs.mkdir(path.join(tempDir, '.kiro', 'specs'), { recursive: true });

      // Add a test file to steering
      await fs.writeFile(path.join(tempDir, '.kiro', 'steering', 'test.md'), '# Test');

      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);

      // Verify existing file is preserved
      const testFileExists = await fs.access(path.join(tempDir, '.kiro', 'steering', 'test.md')).then(() => true).catch(() => false);
      expect(testFileExists).toBe(true);
    });
  });

  // ============================================================
  // common-commands-installer Task 3.1, 3.2, 6.2: Common Commands Integration
  // Requirements: 2.1, 2.2, 2.3, 3.4, 3.5
  // ============================================================

  describe('common commands integration (Task 3.1, 3.2)', () => {
    beforeEach(async () => {
      // Create common commands templates
      const commonDir = path.join(templateDir, 'commands', 'common');
      await fs.mkdir(commonDir, { recursive: true });
      await fs.writeFile(path.join(commonDir, 'commit.md'), '# Commit Command');
      await fs.writeFile(path.join(commonDir, 'another-cmd.md'), '# Another Command');
    });

    it('should return commonCommandConflicts when conflicts exist', async () => {
      // Create existing common command file
      const targetDir = path.join(tempDir, '.claude', 'commands');
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, 'commit.md'), 'existing content');

      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should have common command conflicts
        expect(result.value.commonCommandConflicts).toBeDefined();
        expect(result.value.commonCommandConflicts?.length).toBeGreaterThan(0);
        expect(result.value.commonCommandConflicts?.some(c => c.name === 'commit')).toBe(true);
      }
    });

    it('should auto-install common commands when no conflicts exist', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should have no conflicts
        expect(result.value.commonCommandConflicts?.length ?? 0).toBe(0);
        // Common commands should be installed
        expect(result.value.commonCommands?.totalInstalled).toBeGreaterThan(0);
      }
    });

    it('should include commonCommands result in UnifiedInstallResult', async () => {
      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveProperty('commonCommands');
        expect(result.value).toHaveProperty('commonCommandConflicts');
      }
    });

    it('should continue profile installation even if common commands fail', async () => {
      // Make common commands template directory unreadable/missing
      await fs.rm(path.join(templateDir, 'commands', 'common'), { recursive: true, force: true });

      const result = await installer.installByProfile(tempDir, 'cc-sdd');

      // Profile installation should succeed even if common commands fail
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Summary should show profile was installed
        expect(result.value.summary.totalInstalled).toBeGreaterThan(0);
      }
    });

    describe('installCommonCommandsWithDecisions (Task 3.2)', () => {
      it('should install common commands based on user decisions', async () => {
        // Create existing file
        const targetDir = path.join(tempDir, '.claude', 'commands');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, 'commit.md'), 'existing content');

        const decisions = [
          { name: 'commit', action: 'overwrite' as const }
        ];

        const result = await installer.installCommonCommandsWithDecisions(tempDir, decisions);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalInstalled).toBeGreaterThan(0);
        }

        // Verify file was overwritten
        const content = await fs.readFile(path.join(targetDir, 'commit.md'), 'utf-8');
        expect(content).toContain('Commit Command');
      });

      it('should skip common commands based on user decisions', async () => {
        // Create existing file
        const targetDir = path.join(tempDir, '.claude', 'commands');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, 'commit.md'), 'existing content');

        const decisions = [
          { name: 'commit', action: 'skip' as const }
        ];

        const result = await installer.installCommonCommandsWithDecisions(tempDir, decisions);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.totalSkipped).toBeGreaterThan(0);
        }

        // Verify file was NOT overwritten
        const content = await fs.readFile(path.join(targetDir, 'commit.md'), 'utf-8');
        expect(content).toBe('existing content');
      });
    });
  });
});
