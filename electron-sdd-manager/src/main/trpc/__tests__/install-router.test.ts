/**
 * Install Router tests
 * Task 10.2: installルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Verifies: installRouter, installerServices
 * Verifies: Grep "installRouter" in router.ts (Task 10.2 _Verify)
 *
 * Tests cover:
 * - All 20 procedures (spec-manager, CLI, commandset, experimental, migration, jj)
 * - Zod schema validation (valid/invalid inputs)
 * - ctx.services DI pattern
 * - Error propagation
 * - Edge cases inherited from legacy handler tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';

// ============================================================
// Helper: create install services mock
// ============================================================
function createInstallServicesMock(): Partial<ContextServices> {
  return {
    installProjectChecker: {
      checkAll: vi.fn().mockResolvedValue({ allPresent: true, commands: [], settings: [] }),
    },
    installCommandInstallerService: {
      installCommands: vi.fn().mockResolvedValue({ ok: true }),
      installSettings: vi.fn().mockResolvedValue({ ok: true }),
      installAll: vi.fn().mockResolvedValue({ ok: true }),
      forceReinstallAll: vi.fn().mockResolvedValue({ ok: true }),
    },
    installUnifiedCommandsetInstaller: {
      checkAllInstallStatus: vi.fn().mockResolvedValue({ installed: true, profiles: {} }),
      installByProfile: vi.fn().mockResolvedValue({
        ok: true,
        value: { summary: { totalInstalled: 3, totalSkipped: 0, totalFailed: 0 } },
      }),
    },
    installExperimentalToolsInstaller: {
      installDebugAgent: vi.fn().mockResolvedValue({ ok: true, value: { installed: true } }),
      checkTargetExists: vi.fn().mockResolvedValue({ exists: false }),
      installGeminiDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { installed: true } }),
      checkGeminiDocumentReviewExists: vi.fn().mockResolvedValue({ exists: false }),
    },
    installCommandsetVersionService: {
      checkVersions: vi.fn().mockResolvedValue({ anyUpdateRequired: false, hasCommandsets: true, versions: [] }),
    },
    installGetCliInstallStatus: vi.fn().mockResolvedValue({ installed: true, path: '/usr/local/bin/sdd' }),
    installInstallCliCommand: vi.fn().mockResolvedValue({ success: true, path: '/usr/local/bin/sdd' }),
    installGetManualInstallInstructions: vi.fn().mockReturnValue({
      title: 'Manual Install',
      steps: ['step1'],
      command: 'curl install',
      usage: { title: 'Usage', examples: [] },
    }),
    installMigrationService: {
      checkMigrationNeeded: vi.fn().mockResolvedValue(null),
      migrateSpec: vi.fn().mockResolvedValue({ success: true, migratedFiles: 3 }),
      declineMigration: vi.fn(),
    },
    installCheckJjAvailability: vi.fn().mockReturnValue({
      name: 'jj',
      available: true,
      installGuidance: 'brew install jj',
    }),
    installInstallJj: vi.fn().mockResolvedValue({ success: true }),
    installIgnoreJjInstall: vi.fn().mockResolvedValue({ success: true }),
  };
}

describe('Install Router (install.ts)', () => {
  // ============================================================
  // Spec Manager procedures (5 procedures)
  // Legacy: CHECK_SPEC_MANAGER_FILES, INSTALL_SPEC_MANAGER_COMMANDS,
  //         INSTALL_SPEC_MANAGER_SETTINGS, INSTALL_SPEC_MANAGER_ALL,
  //         FORCE_REINSTALL_SPEC_MANAGER_ALL
  // ============================================================

  describe('checkSpecManagerFiles', () => {
    it('should call projectChecker.checkAll and return result', async () => {
      const mockResult = { allPresent: true, commands: ['cmd1'], settings: ['s1'] };
      const mockChecker = { checkAll: vi.fn().mockResolvedValue(mockResult) };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installProjectChecker: mockChecker,
      });

      const result = await caller.install.checkSpecManagerFiles({ projectPath: '/test/project' });
      expect(result).toEqual(mockResult);
      expect(mockChecker.checkAll).toHaveBeenCalledWith('/test/project');
    });

    it('should reject empty projectPath', async () => {
      const caller = createTestCaller(createInstallServicesMock());
      await expect(
        caller.install.checkSpecManagerFiles({ projectPath: '' })
      ).rejects.toThrow();
    });
  });

  describe('installSpecManagerCommands', () => {
    it('should call commandInstallerService.installCommands', async () => {
      const mockInstaller = {
        installCommands: vi.fn().mockResolvedValue({ ok: true }),
        installSettings: vi.fn(),
        installAll: vi.fn(),
        forceReinstallAll: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installCommandInstallerService: mockInstaller,
      });

      const result = await caller.install.installSpecManagerCommands({
        projectPath: '/test',
        missingCommands: ['cmd1', 'cmd2'],
      });
      expect(result).toEqual({ ok: true });
      expect(mockInstaller.installCommands).toHaveBeenCalledWith('/test', ['cmd1', 'cmd2']);
    });

    it('should reject empty projectPath', async () => {
      const caller = createTestCaller(createInstallServicesMock());
      await expect(
        caller.install.installSpecManagerCommands({ projectPath: '', missingCommands: [] })
      ).rejects.toThrow();
    });
  });

  describe('installSpecManagerSettings', () => {
    it('should call commandInstallerService.installSettings', async () => {
      const mockInstaller = {
        installCommands: vi.fn(),
        installSettings: vi.fn().mockResolvedValue({ ok: true }),
        installAll: vi.fn(),
        forceReinstallAll: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installCommandInstallerService: mockInstaller,
      });

      const result = await caller.install.installSpecManagerSettings({
        projectPath: '/test',
        missingSettings: ['s1'],
      });
      expect(result).toEqual({ ok: true });
      expect(mockInstaller.installSettings).toHaveBeenCalledWith('/test', ['s1']);
    });
  });

  describe('installSpecManagerAll', () => {
    it('should call commandInstallerService.installAll', async () => {
      const mockInstaller = {
        installCommands: vi.fn(),
        installSettings: vi.fn(),
        installAll: vi.fn().mockResolvedValue({ ok: true, value: { installed: 5 } }),
        forceReinstallAll: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installCommandInstallerService: mockInstaller,
      });

      const result = await caller.install.installSpecManagerAll({ projectPath: '/test' });
      expect(mockInstaller.installAll).toHaveBeenCalledWith('/test');
    });
  });

  describe('forceReinstallSpecManagerAll', () => {
    it('should call commandInstallerService.forceReinstallAll', async () => {
      const mockInstaller = {
        installCommands: vi.fn(),
        installSettings: vi.fn(),
        installAll: vi.fn(),
        forceReinstallAll: vi.fn().mockResolvedValue({ ok: true }),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installCommandInstallerService: mockInstaller,
      });

      const result = await caller.install.forceReinstallSpecManagerAll({ projectPath: '/test' });
      expect(mockInstaller.forceReinstallAll).toHaveBeenCalledWith('/test');
    });
  });

  // ============================================================
  // CLI Install procedures (2 procedures)
  // Legacy: GET_CLI_INSTALL_STATUS, INSTALL_CLI_COMMAND
  // ============================================================

  describe('getCliInstallStatus', () => {
    it('should return CLI install status', async () => {
      const mockStatus = { installed: true, path: '/usr/local/bin/sdd' };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installGetCliInstallStatus: vi.fn().mockResolvedValue(mockStatus),
      });

      const result = await caller.install.getCliInstallStatus({ location: 'user' });
      expect(result).toEqual(mockStatus);
    });

    it('should default to user location', async () => {
      const mockGetStatus = vi.fn().mockResolvedValue({ installed: false });
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installGetCliInstallStatus: mockGetStatus,
      });

      await caller.install.getCliInstallStatus({});
      expect(mockGetStatus).toHaveBeenCalledWith('user');
    });
  });

  describe('installCliCommand', () => {
    it('should install CLI and return result with instructions', async () => {
      const mockInstallFn = vi.fn().mockResolvedValue({ success: true, path: '/usr/local/bin/sdd' });
      const mockInstructions = {
        title: 'Manual Install',
        steps: ['step1'],
        command: 'curl install',
        usage: { title: 'Usage', examples: [] },
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installInstallCliCommand: mockInstallFn,
        installGetManualInstallInstructions: vi.fn().mockReturnValue(mockInstructions),
      });

      const result = await caller.install.installCliCommand({ location: 'user' });
      expect(result).toHaveProperty('instructions');
      expect(result.instructions).toEqual(mockInstructions);
      expect(mockInstallFn).toHaveBeenCalledWith('user');
    });
  });

  // ============================================================
  // Commandset procedures (2 procedures)
  // Legacy: CHECK_COMMANDSET_STATUS, INSTALL_COMMANDSET_BY_PROFILE
  // ============================================================

  describe('checkCommandsetStatus', () => {
    it('should return commandset install status', async () => {
      const mockResult = { installed: true, profiles: {} };
      const mockInstaller = {
        checkAllInstallStatus: vi.fn().mockResolvedValue(mockResult),
        installByProfile: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installUnifiedCommandsetInstaller: mockInstaller,
      });

      const result = await caller.install.checkCommandsetStatus({ projectPath: '/test' });
      expect(result).toEqual(mockResult);
      expect(mockInstaller.checkAllInstallStatus).toHaveBeenCalledWith('/test');
    });
  });

  describe('installCommandsetByProfile', () => {
    it('should install commandset by profile', async () => {
      const mockResult = {
        ok: true,
        value: { summary: { totalInstalled: 3, totalSkipped: 0, totalFailed: 0 } },
      };
      const mockInstaller = {
        checkAllInstallStatus: vi.fn(),
        installByProfile: vi.fn().mockResolvedValue(mockResult),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installUnifiedCommandsetInstaller: mockInstaller,
      });

      const result = await caller.install.installCommandsetByProfile({
        projectPath: '/test',
        profileName: 'cc-sdd',
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass force option', async () => {
      const mockInstaller = {
        checkAllInstallStatus: vi.fn(),
        installByProfile: vi.fn().mockResolvedValue({ ok: true, value: {} }),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installUnifiedCommandsetInstaller: mockInstaller,
      });

      await caller.install.installCommandsetByProfile({
        projectPath: '/test',
        profileName: 'cc-sdd-agent',
        options: { force: true },
      });
      expect(mockInstaller.installByProfile).toHaveBeenCalledWith(
        '/test',
        'cc-sdd-agent',
        { force: true },
        expect.any(Function)
      );
    });

    it('should trigger claudemd-merge agent for cc-sdd profile on success', async () => {
      const mockStartAgent = vi.fn().mockResolvedValue({ ok: true, value: { agentId: 'test-agent' } });
      const mockInstaller = {
        checkAllInstallStatus: vi.fn(),
        installByProfile: vi.fn().mockResolvedValue({
          ok: true,
          value: { summary: { totalInstalled: 3, totalSkipped: 0, totalFailed: 0 } },
        }),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installUnifiedCommandsetInstaller: mockInstaller,
        getSpecManagerService: vi.fn().mockReturnValue({
          startAgent: mockStartAgent,
        }),
      });

      await caller.install.installCommandsetByProfile({
        projectPath: '/test',
        profileName: 'cc-sdd',
      });

      // Fire-and-forget: agent start is triggered but not awaited
      // Allow microtasks to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockStartAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          specId: '',
          phase: 'claudemd-merge',
          args: ['/internal:claudemd-merge'],
          group: 'doc',
          engineId: 'claude',
        })
      );
    });

    it('should handle install failure', async () => {
      const mockInstaller = {
        checkAllInstallStatus: vi.fn(),
        installByProfile: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'INSTALL_ERROR', message: 'Something went wrong' },
        }),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installUnifiedCommandsetInstaller: mockInstaller,
      });

      const result = await caller.install.installCommandsetByProfile({
        projectPath: '/test',
        profileName: 'cc-sdd',
      });
      expect(result.ok).toBe(false);
    });
  });

  // ============================================================
  // Experimental Tools procedures (4 procedures)
  // Legacy: INSTALL_EXPERIMENTAL_DEBUG, CHECK_EXPERIMENTAL_TOOL_EXISTS,
  //         INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS
  // ============================================================

  describe('installExperimentalDebug', () => {
    it('should call experimentalToolsInstaller.installDebugAgent', async () => {
      const mockInstaller = {
        installDebugAgent: vi.fn().mockResolvedValue({ ok: true, value: { installed: true } }),
        checkTargetExists: vi.fn(),
        installGeminiDocumentReview: vi.fn(),
        checkGeminiDocumentReviewExists: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installExperimentalToolsInstaller: mockInstaller,
      });

      const result = await caller.install.installExperimentalDebug({
        projectPath: '/test',
      });
      expect(mockInstaller.installDebugAgent).toHaveBeenCalledWith('/test', undefined);
    });

    it('should pass options', async () => {
      const mockInstaller = {
        installDebugAgent: vi.fn().mockResolvedValue({ ok: true, value: { installed: true } }),
        checkTargetExists: vi.fn(),
        installGeminiDocumentReview: vi.fn(),
        checkGeminiDocumentReviewExists: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installExperimentalToolsInstaller: mockInstaller,
      });

      await caller.install.installExperimentalDebug({
        projectPath: '/test',
        options: { force: true },
      });
      expect(mockInstaller.installDebugAgent).toHaveBeenCalledWith('/test', { force: true });
    });
  });

  describe('checkExperimentalToolExists', () => {
    it('should check if experimental tool exists', async () => {
      const mockInstaller = {
        installDebugAgent: vi.fn(),
        checkTargetExists: vi.fn().mockResolvedValue({ exists: true }),
        installGeminiDocumentReview: vi.fn(),
        checkGeminiDocumentReviewExists: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installExperimentalToolsInstaller: mockInstaller,
      });

      const result = await caller.install.checkExperimentalToolExists({
        projectPath: '/test',
        toolType: 'debug',
      });
      expect(result).toEqual({ exists: true });
      expect(mockInstaller.checkTargetExists).toHaveBeenCalledWith('/test', 'debug');
    });
  });

  describe('installExperimentalGeminiDocReview', () => {
    it('should install gemini doc review', async () => {
      const mockInstaller = {
        installDebugAgent: vi.fn(),
        checkTargetExists: vi.fn(),
        installGeminiDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: { installed: true } }),
        checkGeminiDocumentReviewExists: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installExperimentalToolsInstaller: mockInstaller,
      });

      const result = await caller.install.installExperimentalGeminiDocReview({
        projectPath: '/test',
      });
      expect(mockInstaller.installGeminiDocumentReview).toHaveBeenCalledWith('/test', undefined);
    });
  });

  describe('checkExperimentalGeminiDocReviewExists', () => {
    it('should check if gemini doc review exists', async () => {
      const mockInstaller = {
        installDebugAgent: vi.fn(),
        checkTargetExists: vi.fn(),
        installGeminiDocumentReview: vi.fn(),
        checkGeminiDocumentReviewExists: vi.fn().mockResolvedValue({ exists: false }),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installExperimentalToolsInstaller: mockInstaller,
      });

      const result = await caller.install.checkExperimentalGeminiDocReviewExists({
        projectPath: '/test',
      });
      expect(result).toEqual({ exists: false });
    });
  });

  // ============================================================
  // Commandset Version procedures (1 procedure)
  // Legacy: CHECK_COMMANDSET_VERSIONS
  // ============================================================

  describe('checkCommandsetVersions', () => {
    it('should check commandset versions', async () => {
      const mockResult = { anyUpdateRequired: true, hasCommandsets: true, versions: [] };
      const mockService = {
        checkVersions: vi.fn().mockResolvedValue(mockResult),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installCommandsetVersionService: mockService,
      });

      const result = await caller.install.checkCommandsetVersions({ projectPath: '/test' });
      expect(result).toEqual(mockResult);
      expect(mockService.checkVersions).toHaveBeenCalledWith('/test');
    });
  });

  // ============================================================
  // Migration procedures (3 procedures)
  // Legacy: CHECK_MIGRATION_NEEDED, ACCEPT_MIGRATION, DECLINE_MIGRATION
  // ============================================================

  describe('checkMigrationNeeded', () => {
    it('should check if migration is needed and return null when not needed', async () => {
      const mockService = {
        checkMigrationNeeded: vi.fn().mockResolvedValue(null),
        migrateSpec: vi.fn(),
        declineMigration: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.checkMigrationNeeded({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toBeNull();
      expect(mockService.checkMigrationNeeded).toHaveBeenCalledWith('my-feature');
    });

    it('should return migration info when migration is needed', async () => {
      const migrationInfo = { fileCount: 5, totalSize: 1024 };
      const mockService = {
        checkMigrationNeeded: vi.fn().mockResolvedValue(migrationInfo),
        migrateSpec: vi.fn(),
        declineMigration: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.checkMigrationNeeded({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toEqual(migrationInfo);
    });

    it('should return null on error', async () => {
      const mockService = {
        checkMigrationNeeded: vi.fn().mockRejectedValue(new Error('read error')),
        migrateSpec: vi.fn(),
        declineMigration: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.checkMigrationNeeded({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toBeNull();
    });
  });

  describe('acceptMigration', () => {
    it('should perform migration and return success', async () => {
      const mockService = {
        checkMigrationNeeded: vi.fn(),
        migrateSpec: vi.fn().mockResolvedValue({ success: true, migratedFiles: 3 }),
        declineMigration: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.acceptMigration({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toEqual({ ok: true, migratedCount: 3 });
      expect(mockService.migrateSpec).toHaveBeenCalledWith('my-feature');
    });

    it('should return error on migration failure', async () => {
      const mockService = {
        checkMigrationNeeded: vi.fn(),
        migrateSpec: vi.fn().mockResolvedValue({ success: false, error: 'Disk full' }),
        declineMigration: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.acceptMigration({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toEqual({ ok: false, error: 'Disk full' });
    });

    it('should handle thrown errors', async () => {
      const mockService = {
        checkMigrationNeeded: vi.fn(),
        migrateSpec: vi.fn().mockRejectedValue(new Error('unexpected')),
        declineMigration: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.acceptMigration({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toEqual({ ok: false, error: 'unexpected' });
    });
  });

  describe('declineMigration', () => {
    it('should decline migration', async () => {
      const mockService = {
        checkMigrationNeeded: vi.fn(),
        migrateSpec: vi.fn(),
        declineMigration: vi.fn(),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.declineMigration({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toEqual({ ok: true });
      expect(mockService.declineMigration).toHaveBeenCalledWith('my-feature');
    });

    it('should handle errors', async () => {
      const mockService = {
        checkMigrationNeeded: vi.fn(),
        migrateSpec: vi.fn(),
        declineMigration: vi.fn().mockImplementation(() => { throw new Error('fail'); }),
      };
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installMigrationService: mockService,
      });

      const result = await caller.install.declineMigration({
        projectPath: '/test',
        specId: 'my-feature',
      });
      expect(result).toEqual({ ok: false, error: 'fail' });
    });
  });

  // ============================================================
  // jj procedures (3 procedures)
  // Legacy: CHECK_JJ_AVAILABILITY, INSTALL_JJ, IGNORE_JJ_INSTALL
  // ============================================================

  describe('checkJjAvailability', () => {
    it('should check jj availability via toolPathResolverService', async () => {
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installCheckJjAvailability: vi.fn().mockReturnValue({
          name: 'jj',
          available: true,
          installGuidance: 'brew install jj',
        }),
      });

      const result = await caller.install.checkJjAvailability();
      expect(result).toEqual({
        name: 'jj',
        available: true,
        installGuidance: 'brew install jj',
      });
    });

    it('should return unavailable when jj is not installed', async () => {
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installCheckJjAvailability: vi.fn().mockReturnValue({
          name: 'jj',
          available: false,
          installGuidance: 'brew install jj',
        }),
      });

      const result = await caller.install.checkJjAvailability();
      expect(result.available).toBe(false);
    });
  });

  describe('installJj', () => {
    it('should install jj and return success', async () => {
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installInstallJj: vi.fn().mockResolvedValue({ success: true }),
      });

      const result = await caller.install.installJj();
      expect(result).toEqual({ success: true });
    });

    it('should return error on failure', async () => {
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installInstallJj: vi.fn().mockResolvedValue({
          success: false,
          error: 'Homebrew not found',
        }),
      });

      const result = await caller.install.installJj();
      expect(result.success).toBe(false);
    });
  });

  describe('ignoreJjInstall', () => {
    it('should set jj install ignored flag', async () => {
      const mockIgnore = vi.fn().mockResolvedValue({ success: true });
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installIgnoreJjInstall: mockIgnore,
      });

      const result = await caller.install.ignoreJjInstall({
        projectPath: '/test',
        ignored: true,
      });
      expect(result).toEqual({ success: true });
      expect(mockIgnore).toHaveBeenCalledWith('/test', true);
    });

    it('should allow unsetting the ignored flag', async () => {
      const mockIgnore = vi.fn().mockResolvedValue({ success: true });
      const caller = createTestCaller({
        ...createInstallServicesMock(),
        installIgnoreJjInstall: mockIgnore,
      });

      await caller.install.ignoreJjInstall({
        projectPath: '/test',
        ignored: false,
      });
      expect(mockIgnore).toHaveBeenCalledWith('/test', false);
    });
  });

  // ============================================================
  // Router Registration
  // ============================================================

  describe('Router registration', () => {
    it('should have install namespace accessible via caller', async () => {
      const caller = createTestCaller(createInstallServicesMock());
      expect(caller.install).toBeDefined();
    });

    it('should expose all 20 procedures', async () => {
      const caller = createTestCaller(createInstallServicesMock());
      const procedures = [
        'checkSpecManagerFiles',
        'installSpecManagerCommands',
        'installSpecManagerSettings',
        'installSpecManagerAll',
        'forceReinstallSpecManagerAll',
        'getCliInstallStatus',
        'installCliCommand',
        'checkCommandsetStatus',
        'installCommandsetByProfile',
        'installExperimentalDebug',
        'checkExperimentalToolExists',
        'installExperimentalGeminiDocReview',
        'checkExperimentalGeminiDocReviewExists',
        'checkCommandsetVersions',
        'checkMigrationNeeded',
        'acceptMigration',
        'declineMigration',
        'checkJjAvailability',
        'installJj',
        'ignoreJjInstall',
      ];
      for (const proc of procedures) {
        expect((caller.install as any)[proc]).toBeDefined();
      }
    });
  });
});
