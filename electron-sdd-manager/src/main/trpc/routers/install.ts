/**
 * Install Router - installation management tRPC procedures
 * Task 10.2: installルーターとZodスキーマを実装する
 * Requirements: 9.1, 9.2
 *
 * Provides installation management procedures:
 * - Spec Manager (5): checkSpecManagerFiles, installSpecManagerCommands,
 *   installSpecManagerSettings, installSpecManagerAll, forceReinstallSpecManagerAll
 * - CLI (2): getCliInstallStatus, installCliCommand
 * - Commandset (2): checkCommandsetStatus, installCommandsetByProfile
 * - Experimental Tools (4): installExperimentalDebug, checkExperimentalToolExists,
 *   installExperimentalGeminiDocReview, checkExperimentalGeminiDocReviewExists
 * - Commandset Versions (1): checkCommandsetVersions
 * - Migration (3): checkMigrationNeeded, acceptMigration, declineMigration
 * - jj Support (3): checkJjAvailability, installJj, ignoreJjInstall
 *
 * All services accessed via ctx.services for testability (DD-006).
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { projectPathInputSchema } from '../helpers/schemas';

// ============================================================
// Zod Schemas (Task 10.2: Requirements 9.2)
// ============================================================

// projectPathInputSchema: imported from ../helpers/schemas (DRY)
export { projectPathInputSchema } from '../helpers/schemas';

// --- Spec Manager ---
export const installSpecManagerCommandsInputSchema = z.object({
  projectPath: z.string().min(1),
  missingCommands: z.array(z.string()),
});

export const installSpecManagerSettingsInputSchema = z.object({
  projectPath: z.string().min(1),
  missingSettings: z.array(z.string()),
});

// --- CLI ---
export const cliLocationSchema = z.object({
  location: z.enum(['user', 'system']).optional().default('user'),
});

// --- Commandset ---
export const installCommandsetByProfileInputSchema = z.object({
  projectPath: z.string().min(1),
  profileName: z.string().min(1),
  options: z.object({
    force: z.boolean().optional(),
  }).optional(),
});

// --- Experimental Tools ---
export const installExperimentalInputSchema = z.object({
  projectPath: z.string().min(1),
  options: z.object({
    force: z.boolean().optional(),
  }).optional(),
});

export const checkExperimentalToolExistsInputSchema = z.object({
  projectPath: z.string().min(1),
  toolType: z.enum(['debug']),
});

// --- Migration ---
export const migrationInputSchema = z.object({
  projectPath: z.string().min(1),
  specId: z.string(),
});

// --- jj ---
export const ignoreJjInstallInputSchema = z.object({
  projectPath: z.string().min(1),
  ignored: z.boolean(),
});

// ============================================================
// Install Router
// ============================================================

export const installRouter = router({
  // ============================================================
  // Spec Manager procedures (5 procedures)
  // Legacy: CHECK_SPEC_MANAGER_FILES, INSTALL_SPEC_MANAGER_COMMANDS,
  //         INSTALL_SPEC_MANAGER_SETTINGS, INSTALL_SPEC_MANAGER_ALL,
  //         FORCE_REINSTALL_SPEC_MANAGER_ALL
  // ============================================================

  /**
   * Check spec manager files for a project.
   */
  checkSpecManagerFiles: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const checker = ctx.services.installProjectChecker;
      if (!checker) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ProjectChecker not initialized',
        });
      }
      return checker.checkAll(input.projectPath);
    }),

  /**
   * Install missing spec manager commands.
   */
  installSpecManagerCommands: publicProcedure
    .input(installSpecManagerCommandsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const installer = ctx.services.installCommandInstallerService;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CommandInstallerService not initialized',
        });
      }
      return installer.installCommands(input.projectPath, input.missingCommands);
    }),

  /**
   * Install missing spec manager settings.
   */
  installSpecManagerSettings: publicProcedure
    .input(installSpecManagerSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const installer = ctx.services.installCommandInstallerService;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CommandInstallerService not initialized',
        });
      }
      return installer.installSettings(input.projectPath, input.missingSettings);
    }),

  /**
   * Install all spec manager files (commands + settings).
   */
  installSpecManagerAll: publicProcedure
    .input(projectPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      const installer = ctx.services.installCommandInstallerService;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CommandInstallerService not initialized',
        });
      }
      return installer.installAll(input.projectPath);
    }),

  /**
   * Force reinstall all spec manager files.
   */
  forceReinstallSpecManagerAll: publicProcedure
    .input(projectPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      const installer = ctx.services.installCommandInstallerService;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CommandInstallerService not initialized',
        });
      }
      return installer.forceReinstallAll(input.projectPath);
    }),

  // ============================================================
  // CLI Install procedures (2 procedures)
  // Legacy: GET_CLI_INSTALL_STATUS, INSTALL_CLI_COMMAND
  // ============================================================

  /**
   * Get CLI install status.
   */
  getCliInstallStatus: publicProcedure
    .input(cliLocationSchema)
    .query(async ({ ctx, input }) => {
      const getStatus = ctx.services.installGetCliInstallStatus;
      if (!getStatus) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CLI install status service not initialized',
        });
      }
      return getStatus(input.location);
    }),

  /**
   * Install CLI command.
   */
  installCliCommand: publicProcedure
    .input(cliLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const installFn = ctx.services.installInstallCliCommand;
      const getInstructions = ctx.services.installGetManualInstallInstructions;
      if (!installFn || !getInstructions) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CLI install service not initialized',
        });
      }
      const result = await installFn(input.location);
      return {
        ...result,
        instructions: getInstructions(input.location),
      };
    }),

  // ============================================================
  // Commandset procedures (2 procedures)
  // Legacy: CHECK_COMMANDSET_STATUS, INSTALL_COMMANDSET_BY_PROFILE
  // ============================================================

  /**
   * Check commandset install status for all profiles.
   */
  checkCommandsetStatus: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const installer = ctx.services.installUnifiedCommandsetInstaller;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'UnifiedCommandsetInstaller not initialized',
        });
      }
      return installer.checkAllInstallStatus(input.projectPath);
    }),

  /**
   * Install commandset by profile name.
   * Triggers claudemd-merge agent for cc-sdd/cc-sdd-agent profiles on success.
   */
  installCommandsetByProfile: publicProcedure
    .input(installCommandsetByProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const installer = ctx.services.installUnifiedCommandsetInstaller;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'UnifiedCommandsetInstaller not initialized',
        });
      }

      // Progress callback (currently just logged, no dedicated channel)
      const progressCallback = (_current: number, _total: number, _currentCommandset: string) => {
        // Progress is available for future use
      };

      const result = await installer.installByProfile(
        input.projectPath,
        input.profileName,
        input.options,
        progressCallback,
      );

      // claudemd-profile-install-merge: Start claudemd-merge Agent for cc-sdd/cc-sdd-agent profiles
      if (result.ok && (input.profileName === 'cc-sdd' || input.profileName === 'cc-sdd-agent')) {
        try {
          const specManagerService = ctx.services.getSpecManagerService();
          // Fire-and-forget: Don't await the Agent startup
          specManagerService.startAgent({
            specId: '',
            phase: 'claudemd-merge',
            args: ['/internal:claudemd-merge'],
            group: 'doc',
            engineId: 'claude',
          }).catch(() => {
            // Agent startup failure is logged as warning only
          });
        } catch {
          // SpecManagerService not available - ignore silently
        }
      }

      return result;
    }),

  // ============================================================
  // Experimental Tools procedures (4 procedures)
  // Legacy: INSTALL_EXPERIMENTAL_DEBUG, CHECK_EXPERIMENTAL_TOOL_EXISTS,
  //         INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS
  // ============================================================

  /**
   * Install experimental debug agent.
   */
  installExperimentalDebug: publicProcedure
    .input(installExperimentalInputSchema)
    .mutation(async ({ ctx, input }) => {
      const installer = ctx.services.installExperimentalToolsInstaller;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ExperimentalToolsInstallerService not initialized',
        });
      }
      return installer.installDebugAgent(input.projectPath, input.options);
    }),

  /**
   * Check if experimental tool target exists.
   */
  checkExperimentalToolExists: publicProcedure
    .input(checkExperimentalToolExistsInputSchema)
    .query(async ({ ctx, input }) => {
      const installer = ctx.services.installExperimentalToolsInstaller;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ExperimentalToolsInstallerService not initialized',
        });
      }
      return installer.checkTargetExists(input.projectPath, input.toolType);
    }),

  /**
   * Install experimental Gemini Document Review.
   */
  installExperimentalGeminiDocReview: publicProcedure
    .input(installExperimentalInputSchema)
    .mutation(async ({ ctx, input }) => {
      const installer = ctx.services.installExperimentalToolsInstaller;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ExperimentalToolsInstallerService not initialized',
        });
      }
      return installer.installGeminiDocumentReview(input.projectPath, input.options);
    }),

  /**
   * Check if Gemini Document Review is installed.
   */
  checkExperimentalGeminiDocReviewExists: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const installer = ctx.services.installExperimentalToolsInstaller;
      if (!installer) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ExperimentalToolsInstallerService not initialized',
        });
      }
      return installer.checkGeminiDocumentReviewExists(input.projectPath);
    }),

  // ============================================================
  // Commandset Versions procedures (1 procedure)
  // Legacy: CHECK_COMMANDSET_VERSIONS
  // ============================================================

  /**
   * Check commandset versions for updates.
   */
  checkCommandsetVersions: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.installCommandsetVersionService;
      if (!service) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CommandsetVersionService not initialized',
        });
      }
      return service.checkVersions(input.projectPath);
    }),

  // ============================================================
  // Migration procedures (3 procedures)
  // Legacy: CHECK_MIGRATION_NEEDED, ACCEPT_MIGRATION, DECLINE_MIGRATION
  // ============================================================

  /**
   * Check if legacy runtime agents need migration for a specific spec/bug.
   * Returns null if no migration needed or on error.
   */
  checkMigrationNeeded: publicProcedure
    .input(migrationInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.installMigrationService;
      if (!service) {
        return null;
      }
      try {
        return await service.checkMigrationNeeded(input.specId);
      } catch {
        return null;
      }
    }),

  /**
   * Accept and perform migration of legacy runtime agents.
   */
  acceptMigration: publicProcedure
    .input(migrationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.installMigrationService;
      if (!service) {
        return { ok: false as const, error: 'MigrationService not initialized' };
      }
      try {
        const result = await service.migrateSpec(input.specId);
        if (result.success) {
          return { ok: true as const, migratedCount: result.migratedFiles ?? 0 };
        } else {
          return { ok: false as const, error: result.error || 'Migration failed' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { ok: false as const, error: errorMessage };
      }
    }),

  /**
   * Decline migration for a specific spec (don't show again this session).
   */
  declineMigration: publicProcedure
    .input(migrationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.installMigrationService;
      if (!service) {
        return { ok: false as const, error: 'MigrationService not initialized' };
      }
      try {
        service.declineMigration(input.specId);
        return { ok: true as const };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { ok: false as const, error: errorMessage };
      }
    }),

  // ============================================================
  // jj Support procedures (3 procedures)
  // Legacy: CHECK_JJ_AVAILABILITY, INSTALL_JJ, IGNORE_JJ_INSTALL
  // ============================================================

  /**
   * Check jj availability via ToolPathResolverService.
   */
  checkJjAvailability: publicProcedure
    .query(({ ctx }) => {
      const checkFn = ctx.services.installCheckJjAvailability;
      if (!checkFn) {
        return { name: 'jj', available: false, installGuidance: 'brew install jj' };
      }
      return checkFn();
    }),

  /**
   * Install jj via brew.
   */
  installJj: publicProcedure
    .mutation(async ({ ctx }) => {
      const installFn = ctx.services.installInstallJj;
      if (!installFn) {
        return { success: false, error: 'Install service not initialized' };
      }
      return installFn();
    }),

  /**
   * Set jj install ignored flag in project settings.
   */
  ignoreJjInstall: publicProcedure
    .input(ignoreJjInstallInputSchema)
    .mutation(async ({ ctx, input }) => {
      const ignoreFn = ctx.services.installIgnoreJjInstall;
      if (!ignoreFn) {
        return { success: false, error: 'Install service not initialized' };
      }
      return ignoreFn(input.projectPath, input.ignored);
    }),
});
