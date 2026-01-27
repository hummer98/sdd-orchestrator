/**
 * Agent Handlers
 * IPC handlers for agent-related operations
 *
 * Task 7.1: agentHandlers.ts を新規作成し、Agent関連ハンドラーを実装する
 * Requirements: 1.7, 2.1, 2.2, 4.1, 4.2
 *
 * Migrated handlers from handlers.ts:
 * - START_AGENT, STOP_AGENT, RESUME_AGENT, DELETE_AGENT
 * - GET_AGENTS, GET_ALL_AGENTS
 * - SEND_AGENT_INPUT, GET_AGENT_LOGS
 * - SWITCH_AGENT_WATCH_SCOPE, GET_RUNNING_AGENT_COUNTS
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { logger } from '../services/logger';
import type { SpecManagerService, ExecutionGroup } from '../services/specManagerService';
import type { AgentInfo } from '../services/agentRecordService';
import { getDefaultAgentRecordService } from '../services/agentRecordService';
import { getDefaultLogFileService } from '../services/logFileService';
import { AgentRecordWatcherService } from '../services/agentRecordWatcherService';
import { getClaudeCommand } from '../services/agentProcess';
// Task 7.3: Agent Lifecycle Management integration (agent-lifecycle-management feature)
import { getAgentLifecycleManager } from '../services/agentLifecycleSetup';

// Module-level state for agent record watcher
let agentRecordWatcherService: AgentRecordWatcherService | null = null;

/**
 * Dependencies required for agent handlers
 * Requirements: 2.1, 2.2 - Dependency injection for testability
 */
export interface AgentHandlersDependencies {
  /** Get the current SpecManagerService instance */
  getSpecManagerService: () => SpecManagerService;
  /** Get the current project path */
  getCurrentProjectPath: () => string | null;
  /** Check if event callbacks are registered */
  getEventCallbacksRegistered: () => boolean;
  /** Set event callbacks registered flag */
  setEventCallbacksRegistered: (value: boolean) => void;
  /** Register event callbacks for a window */
  registerEventCallbacks: (service: SpecManagerService, window: BrowserWindow) => void;
}

/**
 * Register all agent-related IPC handlers
 * Requirements: 1.7, 2.1, 4.1, 4.2
 *
 * @param deps - Dependencies for agent handlers
 */
export function registerAgentHandlers(deps: AgentHandlersDependencies): void {
  const {
    getSpecManagerService,
    getEventCallbacksRegistered,
    registerEventCallbacks,
  } = deps;

  // ============================================================
  // Agent Watcher Handlers
  // agent-watcher-optimization Task 4.1: Switch watch scope for specific spec/bug
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE, async (_event, scopeId: string | null) => {
    if (agentRecordWatcherService) {
      logger.info('[agentHandlers] Switching agent watch scope', { scopeId });
      await agentRecordWatcherService.switchWatchScope(scopeId);
    } else {
      logger.warn('[agentHandlers] Cannot switch scope: agent record watcher not running');
    }
  });

  // agent-watcher-optimization Task 2.2: Get running agent counts per spec
  // Requirements: 2.1 - Get running agent counts efficiently
  // agent-state-file-ssot: Now uses AgentRecordService (file-based SSOT)
  ipcMain.handle(IPC_CHANNELS.GET_RUNNING_AGENT_COUNTS, async () => {
    try {
      const recordService = getDefaultAgentRecordService();
      const countsMap = await recordService.getRunningAgentCounts();
      // Convert Map to Record for IPC serialization
      const result: Record<string, number> = {};
      for (const [specId, count] of countsMap) {
        result[specId] = count;
      }
      logger.debug('[agentHandlers] GET_RUNNING_AGENT_COUNTS', { result });
      return result;
    } catch (error) {
      // AgentRecordService might not be initialized yet
      logger.warn('[agentHandlers] GET_RUNNING_AGENT_COUNTS failed', { error });
      return {};
    }
  });

  // ============================================================
  // Agent Management Handlers (Task 27.1)
  // Requirements: 5.1-5.8, 10.1-10.3
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.START_AGENT,
    async (
      event,
      specId: string,
      phase: string,
      command: string,
      args: string[],
      group?: ExecutionGroup,
      sessionId?: string,
      _skipPermissions?: boolean // skip-permissions-main-process: Deprecated, now auto-fetched from layoutConfigService
    ) => {
      // Replace 'claude' command with mock CLI command if configured (for E2E testing)
      const resolvedCommand = command === 'claude' ? getClaudeCommand() : command;
      logger.info('[agentHandlers] START_AGENT called', { specId, phase, command: resolvedCommand, args, group, sessionId });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Set up event forwarding for output and status changes (only once per service instance)
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      } else {
        logger.debug('[agentHandlers] Event callbacks already registered or no window', { hasWindow: !!window, eventCallbacksRegistered: getEventCallbacksRegistered() });
      }

      logger.info('[agentHandlers] Calling service.startAgent');
      // skip-permissions-main-process: skipPermissions is now auto-fetched from layoutConfigService
      const result = await service.startAgent({
        specId,
        phase,
        command: resolvedCommand,
        args,
        group,
        sessionId,
      });

      if (!result.ok) {
        logger.error('[agentHandlers] startAgent failed', { error: result.error });
        throw new Error(`Failed to start agent: ${result.error.type}`);
      }

      logger.info('[agentHandlers] startAgent succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  // Task 7.3: Use AgentLifecycleManager for stop agent (agent-lifecycle-management feature)
  // Requirement: 1.5 - Route through AgentLifecycleManager
  ipcMain.handle(
    IPC_CHANNELS.STOP_AGENT,
    async (_event, agentId: string) => {
      logger.info('[agentHandlers] STOP_AGENT called', { agentId });

      // Try AgentLifecycleManager first (if initialized)
      const lifecycleManager = getAgentLifecycleManager();
      if (lifecycleManager) {
        const agent = lifecycleManager.getAgent(agentId);
        if (agent) {
          // Use graceful shutdown for normal agents, kill for reattached
          if (agent.isReattached) {
            const result = await lifecycleManager.killAgent(agentId);
            if (!result.ok) {
              throw new Error(`Failed to kill agent: ${result.error}`);
            }
            logger.info('[agentHandlers] Agent killed via AgentLifecycleManager', { agentId });
            return;
          } else {
            const result = await lifecycleManager.stopAgent(agentId, 'user_request');
            if (!result.ok) {
              throw new Error(`Failed to stop agent: ${result.error}`);
            }
            logger.info('[agentHandlers] Agent stopped via AgentLifecycleManager', { agentId });
            return;
          }
        }
      }

      // Fallback to SpecManagerService for agents not managed by AgentLifecycleManager
      logger.debug('[agentHandlers] Falling back to SpecManagerService.stopAgent', { agentId });
      const service = getSpecManagerService();
      const result = await service.stopAgent(agentId);

      if (!result.ok) {
        throw new Error(`Failed to stop agent: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RESUME_AGENT,
    async (event, agentId: string, prompt?: string, _skipPermissions?: boolean) => {
      // skip-permissions-main-process: skipPermissions is now auto-fetched from layoutConfigService
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered (may not be if no START_AGENT was called yet)
      if (window && !getEventCallbacksRegistered()) {
        registerEventCallbacks(service, window);
      }

      const result = await service.resumeAgent(agentId, prompt);

      if (!result.ok) {
        throw new Error(`Failed to resume agent: ${result.error.type}`);
      }

      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_AGENT,
    async (_event, specId: string, agentId: string) => {
      logger.info('[agentHandlers] DELETE_AGENT called', { specId, agentId });
      const service = getSpecManagerService();
      const result = await service.deleteAgent(specId, agentId);

      if (!result.ok) {
        throw new Error(`Failed to delete agent: ${result.error.type}`);
      }
    }
  );

  // ============================================================
  // Agent List Handlers
  // Task 4.1 (agent-state-file-ssot): Update handler to use async getAgents
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.GET_AGENTS,
    async (_event, specId: string) => {
      const service = getSpecManagerService();
      return await service.getAgents(specId);
    }
  );

  // Task 4.2 (agent-state-file-ssot): Update handler to use async getAllAgents
  ipcMain.handle(IPC_CHANNELS.GET_ALL_AGENTS, async () => {
    const service = getSpecManagerService();
    const agentsMap = await service.getAllAgents();

    // Convert Map to plain object for IPC serialization
    const result: Record<string, AgentInfo[]> = {};
    agentsMap.forEach((agents, specId) => {
      result[specId] = agents;
    });

    return result;
  });

  // ============================================================
  // Agent Operation Handlers
  // ============================================================

  ipcMain.handle(
    IPC_CHANNELS.SEND_AGENT_INPUT,
    async (_event, agentId: string, input: string) => {
      const service = getSpecManagerService();
      const result = service.sendInput(agentId, input);

      if (!result.ok) {
        throw new Error(`Failed to send input: ${result.error.type}`);
      }
    }
  );

  // Agent Logs Handler (Bug fix: agent-log-display-issue)
  ipcMain.handle(
    IPC_CHANNELS.GET_AGENT_LOGS,
    async (_event, specId: string, agentId: string) => {
      logger.debug('[agentHandlers] GET_AGENT_LOGS called', { specId, agentId });
      try {
        const logFileService = getDefaultLogFileService();
        const logs = await logFileService.readLog(specId, agentId);
        logger.debug('[agentHandlers] GET_AGENT_LOGS returned', { specId, agentId, logCount: logs.length });
        return logs;
      } catch (error) {
        logger.error('[agentHandlers] GET_AGENT_LOGS failed', { specId, agentId, error });
        throw error;
      }
    }
  );

  logger.info('[agentHandlers] Agent handlers registered');
}

/**
 * Start or restart agent record watcher for the current project
 * @param window - BrowserWindow to send events to
 * @param getCurrentProjectPath - Function to get current project path
 */
export function startAgentRecordWatcher(
  window: BrowserWindow,
  getCurrentProjectPath: () => string | null
): void {
  const currentProjectPath = getCurrentProjectPath();
  if (!currentProjectPath) {
    logger.warn('[agentHandlers] Cannot start agent record watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (agentRecordWatcherService) {
    agentRecordWatcherService.stop();
  }

  agentRecordWatcherService = new AgentRecordWatcherService(currentProjectPath);

  // Bug fix: spec-agent-list-not-updating-on-auto-execution
  // Simplified to match specsWatcherService/bugsWatcherService pattern:
  // Only send event info (type, specId, agentId), let renderer fetch full data via loadAgents()
  // This avoids file read timing issues that caused silent failures when record was undefined
  agentRecordWatcherService.onChange((event) => {
    logger.debug('[agentHandlers] Agent record changed', { type: event.type, specId: event.specId, agentId: event.agentId });
    if (!window.isDestroyed()) {
      // Always send event info - renderer will fetch full data if needed
      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, {
        agentId: event.agentId,
        specId: event.specId,
      });
    }
  });

  agentRecordWatcherService.start();
  logger.info('[agentHandlers] Agent record watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop agent record watcher
 */
export async function stopAgentRecordWatcher(): Promise<void> {
  if (agentRecordWatcherService) {
    await agentRecordWatcherService.stop();
    agentRecordWatcherService = null;
    logger.info('[agentHandlers] Agent record watcher stopped');
  }
}

/**
 * Get the current agent record watcher service instance (for testing)
 */
export function getAgentRecordWatcherService(): AgentRecordWatcherService | null {
  return agentRecordWatcherService;
}
