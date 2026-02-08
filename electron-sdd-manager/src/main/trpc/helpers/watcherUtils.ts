/**
 * Watcher Utility Functions
 * trpc-full-migration Task 11.2: ipc/watcherUtils.ts から trpc/helpers/ に移動
 *
 * Provides watcher start/stop functions for specs, bugs, and agent records.
 * Events are emitted via EventBus for tRPC Subscription distribution.
 */

import { SpecsWatcherService } from '../../services/specsWatcherService';
import { BugsWatcherService } from '../../services/bugsWatcherService';
import { AgentRecordWatcherService } from '../../services/agentRecordWatcherService';
import type { FileService } from '../../services/fileService';
import { projectLogger as logger } from '../../services/projectLogger';
import { getMetricsService } from './projectState';
import { getGlobalEventBus } from '../services/globalEventBus';
import { EVENT_NAMES } from '../services/eventBus';

// ============================================================
// Specs Watcher
// ============================================================

let specsWatcherService: SpecsWatcherService | null = null;

export async function startSpecsWatcher(
  _window: unknown,
  fileService: FileService,
  getCurrentProjectPath: () => string | null,
): Promise<void> {
  const currentProjectPath = getCurrentProjectPath();
  if (!currentProjectPath) {
    logger.warn('[watcherUtils] Cannot start specs watcher: no project path set');
    return;
  }

  if (specsWatcherService) {
    await specsWatcherService.stop();
  }

  specsWatcherService = new SpecsWatcherService(currentProjectPath, fileService);

  specsWatcherService.onChange(async (event) => {
    logger.info('[watcherUtils] Specs changed', { event });
    // Emit to EventBus for tRPC Subscription (primary path)
    getGlobalEventBus().emit(EVENT_NAMES.SPECS_CHANGED, event);

    if (event.type === 'add' && event.path.endsWith('spec.json') && event.specId) {
      const metricsService = getMetricsService();
      await metricsService.startSpecLifecycle(event.specId);
      logger.debug('[watcherUtils] Spec lifecycle started', { specId: event.specId });
    }
  });

  await specsWatcherService.start();
  logger.info('[watcherUtils] Specs watcher started', { projectPath: currentProjectPath });
}

export async function stopSpecsWatcher(): Promise<void> {
  if (specsWatcherService) {
    await specsWatcherService.stop();
    specsWatcherService = null;
    logger.info('[watcherUtils] Specs watcher stopped');
  }
}

// ============================================================
// Bugs Watcher
// ============================================================

let bugsWatcherService: BugsWatcherService | null = null;

export async function stopBugsWatcher(): Promise<void> {
  if (bugsWatcherService) {
    await bugsWatcherService.stop();
    bugsWatcherService = null;
    logger.info('[watcherUtils] Bugs watcher stopped');
  }
}

// ============================================================
// Agent Record Watcher
// ============================================================

let agentRecordWatcherService: AgentRecordWatcherService | null = null;

export function startAgentRecordWatcher(
  _window: unknown,
  getCurrentProjectPath: () => string | null
): void {
  const currentProjectPath = getCurrentProjectPath();
  if (!currentProjectPath) {
    logger.warn('[watcherUtils] Cannot start agent record watcher: no project path set');
    return;
  }

  if (agentRecordWatcherService) {
    agentRecordWatcherService.stop();
  }

  agentRecordWatcherService = new AgentRecordWatcherService(currentProjectPath);

  agentRecordWatcherService.onChange((event) => {
    logger.debug('[watcherUtils] Agent record changed', { type: event.type, specId: event.specId, agentId: event.agentId });
    // Emit to EventBus for tRPC Subscription (primary path)
    getGlobalEventBus().emit(EVENT_NAMES.AGENT_RECORD_CHANGED, {
      type: event.type,
      data: { agentId: event.agentId, specId: event.specId },
    });
  });

  agentRecordWatcherService.start();
  logger.info('[watcherUtils] Agent record watcher started', { projectPath: currentProjectPath });
}

export async function stopAgentRecordWatcher(): Promise<void> {
  if (agentRecordWatcherService) {
    await agentRecordWatcherService.stop();
    agentRecordWatcherService = null;
    logger.info('[watcherUtils] Agent record watcher stopped');
  }
}

export function getAgentRecordWatcherService(): AgentRecordWatcherService | null {
  return agentRecordWatcherService;
}
