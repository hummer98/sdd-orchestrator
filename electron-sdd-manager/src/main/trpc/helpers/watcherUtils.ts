/**
 * Watcher Utility Functions
 * trpc-full-migration Task 11.2: ipc/watcherUtils.ts から trpc/helpers/ に移動
 * multi-window-integration Task 6.2: Per-window watcher management via WindowManager
 *
 * Provides watcher start/stop functions for specs, bugs, and agent records.
 * Events are emitted via EventBus for tRPC Subscription distribution.
 *
 * When windowId is provided, delegates to WindowManager's per-window services.
 * When windowId is not provided, falls back to global variables (backward compat).
 */

import { SpecsWatcherService } from '../../services/specsWatcherService';
import { BugsWatcherService } from '../../services/bugsWatcherService';
import { AgentRecordWatcherService } from '../../services/agentRecordWatcherService';
import type { FileService } from '../../services/fileService';
import { projectLogger as logger } from '../../services/projectLogger';
import { getMetricsService } from './projectState';
import { getGlobalEventBus } from '../services/globalEventBus';
import { EVENT_NAMES } from '../services/eventBus';

// multi-window-integration Task 6.2: WindowManager for per-window watcher delegation
import { getWindowManager } from '../../services/windowManager';

// ============================================================
// Specs Watcher
// ============================================================

let specsWatcherService: SpecsWatcherService | null = null;

export async function startSpecsWatcher(
  _window: unknown,
  fileService: FileService,
  getCurrentProjectPath: () => string | null,
  windowId?: number,
): Promise<void> {
  const currentProjectPath = getCurrentProjectPath();
  if (!currentProjectPath) {
    logger.warn('[watcherUtils] Cannot start specs watcher: no project path set');
    return;
  }

  // multi-window-integration Task 6.2: Per-window watcher delegation
  let watcher: SpecsWatcherService;
  if (windowId !== undefined) {
    try {
      const wm = getWindowManager();
      const services = wm.getWindowServices(windowId);
      if (services?.specsWatcherService) {
        watcher = services.specsWatcherService;
      } else {
        logger.warn('[watcherUtils] No per-window specsWatcherService for window', { windowId });
        watcher = new SpecsWatcherService(currentProjectPath, fileService);
      }
    } catch {
      logger.debug('[watcherUtils] WindowManager not available, using global specs watcher');
      watcher = new SpecsWatcherService(currentProjectPath, fileService);
    }
  } else {
    // Backward compat: global variable path
    if (specsWatcherService) {
      await specsWatcherService.stop();
    }
    specsWatcherService = new SpecsWatcherService(currentProjectPath, fileService);
    watcher = specsWatcherService;
  }

  watcher.onChange(async (event) => {
    logger.info('[watcherUtils] Specs changed', { event });
    // Emit to EventBus for tRPC Subscription (primary path)
    // multi-window-integration Task 6.3: Include projectPath for window-scoped event filtering
    getGlobalEventBus().emit(EVENT_NAMES.SPECS_CHANGED, { ...event, projectPath: currentProjectPath });

    if (event.type === 'add' && event.path.endsWith('spec.json') && event.specId) {
      const metricsService = getMetricsService();
      await metricsService.startSpecLifecycle(event.specId);
      logger.debug('[watcherUtils] Spec lifecycle started', { specId: event.specId });
    }
  });

  await watcher.start();
  logger.info('[watcherUtils] Specs watcher started', { projectPath: currentProjectPath, windowId });
}

export async function stopSpecsWatcher(windowId?: number): Promise<void> {
  // multi-window-integration Task 6.2: Per-window watcher stop
  if (windowId !== undefined) {
    try {
      const wm = getWindowManager();
      const services = wm.getWindowServices(windowId);
      if (services?.specsWatcherService) {
        await services.specsWatcherService.stop();
        logger.info('[watcherUtils] Per-window specs watcher stopped', { windowId });
        return;
      }
    } catch {
      logger.debug('[watcherUtils] WindowManager not available for specs watcher stop');
    }
  }

  // Backward compat: global variable path
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

export async function startBugsWatcher(
  getCurrentProjectPath: () => string | null,
  windowId?: number,
): Promise<void> {
  const currentProjectPath = getCurrentProjectPath();
  if (!currentProjectPath) {
    logger.warn('[watcherUtils] Cannot start bugs watcher: no project path set');
    return;
  }

  // multi-window-integration Task 6.2: Per-window watcher delegation
  let watcher: BugsWatcherService;
  if (windowId !== undefined) {
    try {
      const wm = getWindowManager();
      const services = wm.getWindowServices(windowId);
      if (services?.bugsWatcherService) {
        watcher = services.bugsWatcherService;
      } else {
        logger.warn('[watcherUtils] No per-window bugsWatcherService for window', { windowId });
        watcher = new BugsWatcherService(currentProjectPath);
      }
    } catch {
      logger.debug('[watcherUtils] WindowManager not available, using global bugs watcher');
      watcher = new BugsWatcherService(currentProjectPath);
    }
  } else {
    // Backward compat: global variable path
    if (bugsWatcherService) {
      await bugsWatcherService.stop();
    }
    bugsWatcherService = new BugsWatcherService(currentProjectPath);
    watcher = bugsWatcherService;
  }

  watcher.onChange((event) => {
    logger.info('[watcherUtils] Bugs changed', { event });
    // Emit to EventBus for tRPC Subscription (primary path)
    // multi-window-integration Task 6.3: Include projectPath for window-scoped event filtering
    getGlobalEventBus().emit(EVENT_NAMES.BUGS_CHANGED, { ...event, projectPath: currentProjectPath });
  });

  await watcher.start();
  logger.info('[watcherUtils] Bugs watcher started', { projectPath: currentProjectPath, windowId });
}

export async function stopBugsWatcher(windowId?: number): Promise<void> {
  // multi-window-integration Task 6.2: Per-window watcher stop
  if (windowId !== undefined) {
    try {
      const wm = getWindowManager();
      const services = wm.getWindowServices(windowId);
      if (services?.bugsWatcherService) {
        await services.bugsWatcherService.stop();
        logger.info('[watcherUtils] Per-window bugs watcher stopped', { windowId });
        return;
      }
    } catch {
      logger.debug('[watcherUtils] WindowManager not available for bugs watcher stop');
    }
  }

  // Backward compat: global variable path
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
  getCurrentProjectPath: () => string | null,
  windowId?: number,
): void {
  const currentProjectPath = getCurrentProjectPath();
  if (!currentProjectPath) {
    logger.warn('[watcherUtils] Cannot start agent record watcher: no project path set');
    return;
  }

  // multi-window-integration Task 6.2: Per-window watcher delegation
  let watcher: AgentRecordWatcherService;
  if (windowId !== undefined) {
    try {
      const wm = getWindowManager();
      const services = wm.getWindowServices(windowId);
      if (services?.agentRecordWatcherService) {
        watcher = services.agentRecordWatcherService;
      } else {
        logger.warn('[watcherUtils] No per-window agentRecordWatcherService for window', { windowId });
        watcher = new AgentRecordWatcherService(currentProjectPath);
      }
    } catch {
      logger.debug('[watcherUtils] WindowManager not available, using global agent record watcher');
      watcher = new AgentRecordWatcherService(currentProjectPath);
    }
  } else {
    // Backward compat: global variable path
    if (agentRecordWatcherService) {
      agentRecordWatcherService.stop();
    }
    agentRecordWatcherService = new AgentRecordWatcherService(currentProjectPath);
    watcher = agentRecordWatcherService;
  }

  watcher.onChange((event) => {
    logger.debug('[watcherUtils] Agent record changed', { type: event.type, specId: event.specId, agentId: event.agentId });
    // Emit to EventBus for tRPC Subscription (primary path)
    // multi-window-integration Task 6.3: Include projectPath for window-scoped event filtering
    getGlobalEventBus().emit(EVENT_NAMES.AGENT_RECORD_CHANGED, {
      type: event.type,
      data: { agentId: event.agentId, specId: event.specId },
      projectPath: currentProjectPath,
    });
  });

  watcher.start();
  logger.info('[watcherUtils] Agent record watcher started', { projectPath: currentProjectPath, windowId });
}

export async function stopAgentRecordWatcher(windowId?: number): Promise<void> {
  // multi-window-integration Task 6.2: Per-window watcher stop
  if (windowId !== undefined) {
    try {
      const wm = getWindowManager();
      const services = wm.getWindowServices(windowId);
      if (services?.agentRecordWatcherService) {
        await services.agentRecordWatcherService.stop();
        logger.info('[watcherUtils] Per-window agent record watcher stopped', { windowId });
        return;
      }
    } catch {
      logger.debug('[watcherUtils] WindowManager not available for agent record watcher stop');
    }
  }

  // Backward compat: global variable path
  if (agentRecordWatcherService) {
    await agentRecordWatcherService.stop();
    agentRecordWatcherService = null;
    logger.info('[watcherUtils] Agent record watcher stopped');
  }
}

