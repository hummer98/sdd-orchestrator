/**
 * Config Handlers
 * IPC handlers for configuration-related operations
 *
 * Task 1.1: configHandlers.ts を新規作成し、設定関連ハンドラーを実装する
 * Requirements: 1.1, 2.1, 2.2, 4.1, 4.2
 *
 * Migrated handlers from handlers.ts:
 * - GET_HANG_THRESHOLD, SET_HANG_THRESHOLD
 * - LOAD_LAYOUT_CONFIG, SAVE_LAYOUT_CONFIG, RESET_LAYOUT_CONFIG
 * - LOAD_SKIP_PERMISSIONS, SAVE_SKIP_PERMISSIONS
 * - LOAD_PROJECT_DEFAULTS, SAVE_PROJECT_DEFAULTS
 * - LOAD_PROFILE
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { ConfigStore, LayoutValues } from '../services/configStore';
import type { projectConfigService, ProfileConfig, ProjectDefaults } from '../services/layoutConfigService';
import { logger } from '../services/logger';

/**
 * Type definition for layoutConfigService
 * This matches the interface of projectConfigService from layoutConfigService.ts
 */
type LayoutConfigService = typeof projectConfigService;

/**
 * Dependencies required for config handlers
 * Requirements: 2.1, 2.2 - Dependency injection for testability
 */
export interface ConfigHandlersDependencies {
  /** ConfigStore instance for app-wide config (hang threshold, layout) */
  configStore: ConfigStore;
  /** LayoutConfigService instance for project-specific config (skip permissions, defaults, profile) */
  layoutConfigService: LayoutConfigService;
}

/**
 * Register all config-related IPC handlers
 * Requirements: 1.1, 2.1, 4.1, 4.2
 *
 * @param deps - Dependencies for config handlers (configStore, layoutConfigService)
 */
export function registerConfigHandlers(deps: ConfigHandlersDependencies): void {
  const { configStore, layoutConfigService } = deps;

  // ============================================================
  // Hang Threshold Configuration
  // Requirements: 13.1, 13.2 (from original handlers.ts)
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.GET_HANG_THRESHOLD, async () => {
    logger.debug('[configHandlers] GET_HANG_THRESHOLD called');
    return configStore.getHangThreshold();
  });

  ipcMain.handle(
    IPC_CHANNELS.SET_HANG_THRESHOLD,
    async (_event, thresholdMs: number) => {
      logger.debug('[configHandlers] SET_HANG_THRESHOLD called', { thresholdMs });
      configStore.setHangThreshold(thresholdMs);
    }
  );

  // ============================================================
  // Layout Config (app-wide, moved from project-specific storage)
  // Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.2
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_LAYOUT_CONFIG,
    async (): Promise<LayoutValues | null> => {
      logger.debug('[configHandlers] LOAD_LAYOUT_CONFIG called');
      return configStore.getLayout();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SAVE_LAYOUT_CONFIG,
    async (_event, layout: LayoutValues): Promise<void> => {
      logger.debug('[configHandlers] SAVE_LAYOUT_CONFIG called', { layout });
      configStore.setLayout(layout);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RESET_LAYOUT_CONFIG,
    async (): Promise<void> => {
      logger.info('[configHandlers] RESET_LAYOUT_CONFIG called');
      configStore.resetLayout();
    }
  );

  // ============================================================
  // Skip Permissions Config (bug fix: persist-skip-permission-per-project)
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_SKIP_PERMISSIONS,
    async (_event, projectPath: string): Promise<boolean> => {
      logger.debug('[configHandlers] LOAD_SKIP_PERMISSIONS called', { projectPath });
      return layoutConfigService.loadSkipPermissions(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SAVE_SKIP_PERMISSIONS,
    async (_event, projectPath: string, skipPermissions: boolean): Promise<void> => {
      logger.debug('[configHandlers] SAVE_SKIP_PERMISSIONS called', { projectPath, skipPermissions });
      return layoutConfigService.saveSkipPermissions(projectPath, skipPermissions);
    }
  );

  // ============================================================
  // Project Defaults Config (debatex-document-review Task 3.3)
  // Requirements: 4.1
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_PROJECT_DEFAULTS,
    async (_event, projectPath: string): Promise<ProjectDefaults | undefined> => {
      logger.debug('[configHandlers] LOAD_PROJECT_DEFAULTS called', { projectPath });
      return layoutConfigService.loadProjectDefaults(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SAVE_PROJECT_DEFAULTS,
    async (_event, projectPath: string, defaults: ProjectDefaults): Promise<void> => {
      logger.debug('[configHandlers] SAVE_PROJECT_DEFAULTS called', { projectPath, defaults });
      return layoutConfigService.saveProjectDefaults(projectPath, defaults);
    }
  );

  // ============================================================
  // Profile Badge (header-profile-badge feature)
  // Requirements: 1.1, 1.2, 1.3
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.LOAD_PROFILE,
    async (_event, projectPath: string): Promise<ProfileConfig | null> => {
      logger.debug('[configHandlers] LOAD_PROFILE called', { projectPath });
      return layoutConfigService.loadProfile(projectPath);
    }
  );

  logger.info('[configHandlers] Config handlers registered');
}
