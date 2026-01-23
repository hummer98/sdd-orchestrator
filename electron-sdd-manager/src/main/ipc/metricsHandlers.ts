/**
 * Metrics IPC Handlers
 * Task 3.2, 6.2: IPC handlers for metrics operations
 * Requirements: 2.12, 5.1
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { getDefaultMetricsService, initDefaultMetricsService } from '../services/metricsService';
import { logger } from '../services/logger';
import type { HumanSessionData, SpecMetrics, ProjectMetrics } from '../types/metrics';

// =============================================================================
// Handler Registration
// =============================================================================

/**
 * Register metrics IPC handlers
 * @param getCurrentProjectPath - Function to get current project path
 */
export function registerMetricsHandlers(getCurrentProjectPath: () => string | null): void {
  // ===========================================================================
  // RECORD_HUMAN_SESSION: Record human activity session (Requirement 2.12)
  // ===========================================================================
  ipcMain.handle(IPC_CHANNELS.RECORD_HUMAN_SESSION, async (
    _event,
    session: HumanSessionData
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const projectPath = getCurrentProjectPath();

    if (!projectPath) {
      return { ok: false, error: 'No project path set' };
    }

    try {
      const service = getDefaultMetricsService();
      service.setProjectPath(projectPath);
      await service.recordHumanSession(session);

      logger.debug('[MetricsHandlers] Human session recorded', {
        specId: session.specId,
        ms: session.ms,
      });

      // Notify about metrics update
      notifyMetricsUpdated(session.specId);

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[MetricsHandlers] Failed to record human session', { error: message });
      return { ok: false, error: message };
    }
  });

  // ===========================================================================
  // GET_SPEC_METRICS: Get aggregated metrics for a spec (Requirement 5.1)
  // ===========================================================================
  ipcMain.handle(IPC_CHANNELS.GET_SPEC_METRICS, async (
    _event,
    specId: string
  ): Promise<{ ok: true; value: SpecMetrics } | { ok: false; error: string }> => {
    const projectPath = getCurrentProjectPath();

    if (!projectPath) {
      return { ok: false, error: 'No project path set' };
    }

    try {
      const service = getDefaultMetricsService();
      service.setProjectPath(projectPath);
      const metrics = await service.getMetricsForSpec(specId);

      logger.debug('[MetricsHandlers] Spec metrics retrieved', {
        specId,
        totalAiTimeMs: metrics.totalAiTimeMs,
        totalHumanTimeMs: metrics.totalHumanTimeMs,
      });

      return { ok: true, value: metrics };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[MetricsHandlers] Failed to get spec metrics', { specId, error: message });
      return { ok: false, error: message };
    }
  });

  // ===========================================================================
  // GET_PROJECT_METRICS: Get project-wide aggregated metrics (Optional)
  // ===========================================================================
  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_METRICS, async (
    _event
  ): Promise<{ ok: true; value: ProjectMetrics } | { ok: false; error: string }> => {
    const projectPath = getCurrentProjectPath();

    if (!projectPath) {
      return { ok: false, error: 'No project path set' };
    }

    try {
      const service = getDefaultMetricsService();
      service.setProjectPath(projectPath);
      const metrics = await service.getProjectMetrics();

      logger.debug('[MetricsHandlers] Project metrics retrieved', {
        totalAiTimeMs: metrics.totalAiTimeMs,
        completedSpecCount: metrics.completedSpecCount,
      });

      return { ok: true, value: metrics };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[MetricsHandlers] Failed to get project metrics', { error: message });
      return { ok: false, error: message };
    }
  });

  logger.info('[MetricsHandlers] IPC handlers registered');
}

// =============================================================================
// Event Broadcasting
// =============================================================================

/**
 * Notify all windows about metrics update
 * Used to trigger UI refresh when metrics change
 */
export function notifyMetricsUpdated(specId: string): void {
  const windows = BrowserWindow.getAllWindows();

  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.METRICS_UPDATED, { specId });
    }
  }

  logger.debug('[MetricsHandlers] Metrics update notification sent', { specId });
}

/**
 * Initialize metrics service for a project
 * Called when project path changes
 */
export function initMetricsForProject(projectPath: string): void {
  initDefaultMetricsService(projectPath);
  logger.info('[MetricsHandlers] Metrics service initialized for project', { projectPath });
}
