/**
 * Config Router - configuration management tRPC procedures
 * Task 3.1: configルーターに全22プロシージャを定義する
 * Requirements: 2.1, 2.2, 2.3
 *
 * Provides configuration management procedures:
 * - RecentProjects (2): getRecentProjects, addRecentProject
 * - HangThreshold (2): getHangThreshold, setHangThreshold
 * - LayoutConfig (3): loadLayoutConfig, saveLayoutConfig, resetLayoutConfig
 * - SkipPermissions (2): loadSkipPermissions, saveSkipPermissions
 * - ProjectDefaults (2): loadProjectDefaults, saveProjectDefaults
 * - Profile (1): loadProfile
 * - EngineConfig (3): loadEngineConfig, saveEngineConfig, getAvailableLlmEngines
 * - ToolPath (3): getToolStatuses, setToolPath, resolveTool
 * - VcsScheme (2): getVcsScheme, setVcsScheme
 * - RemoteUiAutoStart (2): loadRemoteUiAutoStart, saveRemoteUiAutoStart
 *
 * All services accessed via ctx.services for testability (DD-006).
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { projectPathInputSchema } from '../helpers/schemas';

// ============================================================
// Zod Schemas (Task 3.1: Requirements 2.3)
// ============================================================

// --- RecentProjects ---
export const recentProjectsOutputSchema = z.array(z.string());
export const addRecentProjectInputSchema = z.object({
  path: z.string().min(1),
});

// --- HangThreshold ---
export const hangThresholdOutputSchema = z.number().nonnegative();
export const setHangThresholdInputSchema = z.object({
  threshold: z.number().nonnegative(),
});

// --- LayoutConfig ---
export const layoutValuesSchema = z.object({
  leftPaneWidth: z.number().min(0),
  rightPaneWidth: z.number().min(0),
  bottomPaneHeight: z.number().min(0),
  agentListHeight: z.number().min(0),
  projectAgentPanelHeight: z.number().min(0).optional(),
  globalAgentPanelHeight: z.number().min(0).optional(),
  viewMode: z.enum(['artifacts', 'git-diff']).optional(),
});
export const saveLayoutConfigInputSchema = z.object({
  config: layoutValuesSchema,
});
export const layoutConfigOutputSchema = layoutValuesSchema.nullable();

// --- SkipPermissions ---
export const skipPermissionsInputSchema = z.object({
  projectPath: z.string().min(1),
});
export const saveSkipPermissionsInputSchema = z.object({
  projectPath: z.string().min(1),
  skipPermissions: z.boolean(),
});

// --- ProjectDefaults ---
export const documentReviewDefaultsSchema = z.object({
  scheme: z.enum(['claude-code', 'gemini-cli', 'debatex']).optional(),
});
export const projectDefaultsSchema = z.object({
  documentReview: documentReviewDefaultsSchema.optional(),
});
// projectPathInputSchema: imported from ../helpers/schemas (DRY)
export { projectPathInputSchema } from '../helpers/schemas';
export const saveProjectDefaultsInputSchema = z.object({
  projectPath: z.string().min(1),
  defaults: projectDefaultsSchema,
});

// --- Profile ---
export const profileConfigSchema = z.object({
  name: z.string(),
  installedAt: z.string(),
}).nullable();

// --- EngineConfig ---
const llmEngineIdSchema = z.enum(['claude', 'gemini']);
export const engineConfigSchema = z.object({
  default: llmEngineIdSchema.optional(),
  plan: llmEngineIdSchema.optional(),
  requirements: llmEngineIdSchema.optional(),
  design: llmEngineIdSchema.optional(),
  tasks: llmEngineIdSchema.optional(),
  'document-review': llmEngineIdSchema.optional(),
  'document-review-reply': llmEngineIdSchema.optional(),
  inspection: llmEngineIdSchema.optional(),
  impl: llmEngineIdSchema.optional(),
});
export const saveEngineConfigInputSchema = z.object({
  projectPath: z.string().min(1),
  config: engineConfigSchema,
});
export const llmEngineInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
});

// --- ToolPath ---
export const toolDefinitionSchema = z.object({
  name: z.string(),
  required: z.boolean(),
  versionCommand: z.string(),
  installGuidance: z.string(),
});
export const toolResolutionResultSchema = z.object({
  resolved: z.boolean(),
  path: z.string().optional(),
  source: z.string().optional(),
  error: z.string().optional(),
});
export const toolStatusSchema = z.object({
  definition: toolDefinitionSchema,
  resolution: toolResolutionResultSchema,
});
export const setToolPathInputSchema = z.object({
  tool: z.string().min(1),
  path: z.string().nullable(),
});
export const resolveToolInputSchema = z.object({
  tool: z.string().min(1),
});

// --- VcsScheme ---
export const vcsSchemeSchema = z.enum(['git', 'jj']);
export const getVcsSchemeInputSchema = z.object({
  projectPath: z.string().min(1),
});
export const setVcsSchemeInputSchema = z.object({
  projectPath: z.string().min(1),
  scheme: vcsSchemeSchema,
});
export const setVcsSchemeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

// --- RemoteUiAutoStart ---
export const saveRemoteUiAutoStartInputSchema = z.object({
  projectPath: z.string().min(1),
  enabled: z.boolean(),
});

// ============================================================
// Config Router
// ============================================================

export const configRouter = router({
  // ============================================================
  // RecentProjects (2 procedures)
  // Legacy: GET_RECENT_PROJECTS, ADD_RECENT_PROJECT (projectHandlers.ts)
  // ============================================================

  /**
   * Get list of recent project paths.
   */
  getRecentProjects: publicProcedure
    .output(recentProjectsOutputSchema)
    .query(({ ctx }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return [];
      }
      return configStore.getRecentProjects();
    }),

  /**
   * Add a project path to recent projects.
   */
  addRecentProject: publicProcedure
    .input(addRecentProjectInputSchema)
    .mutation(({ ctx, input }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return;
      }
      configStore.addRecentProject(input.path);
    }),

  // ============================================================
  // HangThreshold (2 procedures)
  // Legacy: GET_HANG_THRESHOLD, SET_HANG_THRESHOLD
  // ============================================================

  /**
   * Get the hang detection threshold in milliseconds.
   */
  getHangThreshold: publicProcedure
    .output(hangThresholdOutputSchema)
    .query(({ ctx }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return 300000; // default 5 minutes
      }
      return configStore.getHangThreshold();
    }),

  /**
   * Set the hang detection threshold in milliseconds.
   */
  setHangThreshold: publicProcedure
    .input(setHangThresholdInputSchema)
    .mutation(({ ctx, input }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return;
      }
      configStore.setHangThreshold(input.threshold);
    }),

  // ============================================================
  // LayoutConfig (3 procedures)
  // Legacy: LOAD_LAYOUT_CONFIG, SAVE_LAYOUT_CONFIG, RESET_LAYOUT_CONFIG
  // ============================================================

  /**
   * Load app-wide layout config from configStore.
   */
  loadLayoutConfig: publicProcedure
    .output(layoutConfigOutputSchema)
    .query(({ ctx }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return null;
      }
      return configStore.getLayout();
    }),

  /**
   * Save app-wide layout config to configStore.
   */
  saveLayoutConfig: publicProcedure
    .input(saveLayoutConfigInputSchema)
    .mutation(({ ctx, input }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return;
      }
      configStore.setLayout(input.config);
    }),

  /**
   * Reset layout config to defaults.
   */
  resetLayoutConfig: publicProcedure
    .mutation(({ ctx }) => {
      const configStore = ctx.services.configStore;
      if (!configStore) {
        return;
      }
      configStore.resetLayout();
    }),

  // ============================================================
  // SkipPermissions (2 procedures)
  // Legacy: LOAD_SKIP_PERMISSIONS, SAVE_SKIP_PERMISSIONS
  // ============================================================

  /**
   * Load skip permissions setting for a project.
   */
  loadSkipPermissions: publicProcedure
    .input(skipPermissionsInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.layoutConfigService;
      if (!service) {
        return false;
      }
      return service.loadSkipPermissions(input.projectPath);
    }),

  /**
   * Save skip permissions setting for a project.
   */
  saveSkipPermissions: publicProcedure
    .input(saveSkipPermissionsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.layoutConfigService;
      if (!service) {
        return;
      }
      return service.saveSkipPermissions(input.projectPath, input.skipPermissions);
    }),

  // ============================================================
  // ProjectDefaults (2 procedures)
  // Legacy: LOAD_PROJECT_DEFAULTS, SAVE_PROJECT_DEFAULTS
  // ============================================================

  /**
   * Load project defaults (document review scheme, etc.).
   */
  loadProjectDefaults: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.layoutConfigService;
      if (!service) {
        return null;
      }
      const result = await service.loadProjectDefaults(input.projectPath);
      return result ?? null;
    }),

  /**
   * Save project defaults.
   */
  saveProjectDefaults: publicProcedure
    .input(saveProjectDefaultsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.layoutConfigService;
      if (!service) {
        return;
      }
      return service.saveProjectDefaults(input.projectPath, input.defaults);
    }),

  // ============================================================
  // Profile (1 procedure)
  // Legacy: LOAD_PROFILE
  // ============================================================

  /**
   * Load profile config for a project.
   */
  loadProfile: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.layoutConfigService;
      if (!service) {
        return null;
      }
      return service.loadProfile(input.projectPath);
    }),

  // ============================================================
  // EngineConfig (3 procedures)
  // Legacy: LOAD_ENGINE_CONFIG, SAVE_ENGINE_CONFIG, GET_AVAILABLE_LLM_ENGINES
  // ============================================================

  /**
   * Load LLM engine config for a project.
   */
  loadEngineConfig: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.engineConfigService;
      if (!service) {
        return {};
      }
      return service.loadEngineConfig(input.projectPath);
    }),

  /**
   * Save LLM engine config for a project.
   */
  saveEngineConfig: publicProcedure
    .input(saveEngineConfigInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.engineConfigService;
      if (!service) {
        return;
      }
      return service.saveEngineConfig(input.projectPath, input.config);
    }),

  /**
   * Get list of available LLM engines.
   */
  getAvailableLlmEngines: publicProcedure
    .output(z.array(llmEngineInfoSchema))
    .query(({ ctx }) => {
      return ctx.services.getAvailableLlmEngines();
    }),

  // ============================================================
  // ToolPath (3 procedures)
  // Legacy: GET_TOOL_STATUSES, SET_TOOL_PATH, RESOLVE_TOOL
  // ============================================================

  /**
   * Get all tool statuses (definition + resolution).
   */
  getToolStatuses: publicProcedure
    .output(z.array(toolStatusSchema))
    .query(({ ctx }) => {
      const service = ctx.services.toolPathResolverService;
      if (!service) {
        return [];
      }
      return service.getAllStatuses();
    }),

  /**
   * Set manual path for a tool and re-resolve.
   */
  setToolPath: publicProcedure
    .input(setToolPathInputSchema)
    .mutation(async ({ ctx, input }) => {
      const configStore = ctx.services.configStore;
      const resolver = ctx.services.toolPathResolverService;
      if (!configStore || !resolver) {
        return { resolved: false, source: 'not-found' };
      }

      // Save to ConfigStore
      configStore.setToolPath(input.tool, input.path);

      // Re-resolve the tool with forceResolve
      return resolver.resolveTool(input.tool, { forceResolve: true });
    }),

  /**
   * Re-resolve a single tool.
   */
  resolveTool: publicProcedure
    .input(resolveToolInputSchema)
    .query(async ({ ctx, input }) => {
      const resolver = ctx.services.toolPathResolverService;
      if (!resolver) {
        return { resolved: false, source: 'not-found' };
      }
      return resolver.resolveTool(input.tool, { forceResolve: true });
    }),

  // ============================================================
  // VcsScheme (2 procedures)
  // Legacy: VCS_SCHEME_GET, VCS_SCHEME_SET (handlers.ts)
  // ============================================================

  /**
   * Get VCS scheme setting for a project.
   * Returns 'git' as default if not set or on error.
   */
  getVcsScheme: publicProcedure
    .input(getVcsSchemeInputSchema)
    .output(vcsSchemeSchema)
    .query(async ({ ctx, input }) => {
      const manager = ctx.services.settingsFileManager;
      if (!manager) {
        return 'git' as const;
      }
      const result = await manager.getVcsScheme(input.projectPath);
      if (!result.ok) {
        return 'git' as const;
      }
      // Validate the returned value is a valid VcsScheme
      const parsed = vcsSchemeSchema.safeParse(result.value);
      return parsed.success ? parsed.data : ('git' as const);
    }),

  /**
   * Set VCS scheme for a project.
   * Performs jj availability check when setting to 'jj'.
   */
  setVcsScheme: publicProcedure
    .input(setVcsSchemeInputSchema)
    .output(setVcsSchemeOutputSchema)
    .mutation(async ({ ctx, input }) => {
      // If setting to 'jj', check if jj is available
      if (input.scheme === 'jj') {
        const resolver = ctx.services.toolPathResolverService;
        if (resolver) {
          const jjStatus = resolver.getStatus('jj');
          if (!jjStatus || !jjStatus.resolution.resolved) {
            return {
              success: false,
              error: 'jjがインストールされていません。インストール後に再度お試しください。',
            };
          }
        } else {
          return {
            success: false,
            error: 'jjがインストールされていません。インストール後に再度お試しください。',
          };
        }
      }

      const manager = ctx.services.settingsFileManager;
      if (!manager) {
        return { success: false, error: 'SettingsFileManager not initialized' };
      }

      const result = await manager.setVcsScheme(input.projectPath, input.scheme);
      if (!result.ok) {
        return { success: false, error: result.error.message };
      }
      return { success: true };
    }),

  // ============================================================
  // RemoteUiAutoStart (2 procedures)
  // Legacy: LOAD_REMOTE_UI_AUTO_START, SAVE_REMOTE_UI_AUTO_START
  // ============================================================

  /**
   * Load remote UI auto start setting for a project.
   */
  loadRemoteUiAutoStart: publicProcedure
    .input(projectPathInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.services.layoutConfigService;
      if (!service) {
        return false;
      }
      return service.loadRemoteUiAutoStart(input.projectPath);
    }),

  /**
   * Save remote UI auto start setting for a project.
   */
  saveRemoteUiAutoStart: publicProcedure
    .input(saveRemoteUiAutoStartInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.services.layoutConfigService;
      if (!service) {
        return;
      }
      return service.saveRemoteUiAutoStart(input.projectPath, input.enabled);
    }),
});
