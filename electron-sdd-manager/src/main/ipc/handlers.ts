/**
 * IPC Handlers Registration
 * Requirements: 11.2, 11.3, 5.1-5.8, 9.1-9.10, 10.1-10.3, 13.1, 13.2
 */

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { FileService } from '../services/fileService';
import { CommandService } from '../services/commandService';
import { getConfigStore } from '../services/configStore';
import { updateMenu } from '../menu';
import type { Phase } from '../../renderer/types';
import { SpecManagerService, ExecutionGroup, WorkflowPhase, ValidationType } from '../services/specManagerService';
import { SpecsWatcherService } from '../services/specsWatcherService';
import { AgentRecordWatcherService } from '../services/agentRecordWatcherService';
import type { AgentInfo } from '../services/agentRegistry';
import { logger } from '../services/logger';

const fileService = new FileService();
const commandService = new CommandService();

// SpecManagerService instance (lazily initialized with project path)
let specManagerService: SpecManagerService | null = null;
// SpecsWatcherService instance
let specsWatcherService: SpecsWatcherService | null = null;
// AgentRecordWatcherService instance
let agentRecordWatcherService: AgentRecordWatcherService | null = null;
// Track if event callbacks have been set up to avoid duplicates
let eventCallbacksRegistered = false;
// Initial project path set from command line arguments
let initialProjectPath: string | null = null;
// Current project path
let currentProjectPath: string | null = null;

/**
 * Set initial project path (called from main process)
 */
export function setInitialProjectPath(path: string | null): void {
  initialProjectPath = path;
}

/**
 * Get initial project path
 */
export function getInitialProjectPath(): string | null {
  return initialProjectPath;
}

/**
 * Set up SpecManagerService for a project
 */
export async function setProjectPath(projectPath: string): Promise<void> {
  logger.info('[handlers] setProjectPath called', { projectPath });
  currentProjectPath = projectPath;
  specManagerService = new SpecManagerService(projectPath);
  eventCallbacksRegistered = false; // Reset when service is recreated

  // Restore agents from PID files and cleanup stale ones
  try {
    await specManagerService.restoreAgents();
    console.log('[handlers] Agents restored from PID files');
  } catch (error) {
    console.error('[handlers] Failed to restore agents:', error);
  }

  // Stop existing watchers if any
  if (specsWatcherService) {
    await specsWatcherService.stop();
    specsWatcherService = null;
  }
  if (agentRecordWatcherService) {
    await agentRecordWatcherService.stop();
    agentRecordWatcherService = null;
  }
}

/**
 * Get current SpecManagerService or throw if not initialized
 */
function getSpecManagerService(): SpecManagerService {
  if (!specManagerService) {
    throw new Error('SpecManagerService not initialized. Call setProjectPath first.');
  }
  return specManagerService;
}

export function registerIpcHandlers(): void {
  const configStore = getConfigStore();

  // File System Handlers
  ipcMain.handle(IPC_CHANNELS.SHOW_OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'プロジェクトディレクトリを選択',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(
    IPC_CHANNELS.VALIDATE_KIRO_DIRECTORY,
    async (_event, dirPath: string) => {
      return fileService.validateKiroDirectory(dirPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SET_PROJECT_PATH,
    async (_event, projectPath: string) => {
      await setProjectPath(projectPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.READ_SPECS,
    async (_event, projectPath: string) => {
      const result = await fileService.readSpecs(projectPath);
      if (!result.ok) {
        throw new Error(`Failed to read specs: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.READ_SPEC_JSON,
    async (_event, specPath: string) => {
      const result = await fileService.readSpecJson(specPath);
      if (!result.ok) {
        throw new Error(`Failed to read spec.json: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.READ_ARTIFACT,
    async (_event, artifactPath: string) => {
      const result = await fileService.readArtifact(artifactPath);
      if (!result.ok) {
        throw new Error(`Failed to read artifact: ${result.error.type}`);
      }
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CREATE_SPEC,
    async (
      _event,
      projectPath: string,
      specName: string,
      description: string
    ) => {
      const result = await fileService.createSpec(
        projectPath,
        specName,
        description
      );
      if (!result.ok) {
        throw new Error(`Failed to create spec: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WRITE_FILE,
    async (_event, filePath: string, content: string) => {
      const result = await fileService.writeFile(filePath, content);
      if (!result.ok) {
        throw new Error(`Failed to write file: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_APPROVAL,
    async (_event, specPath: string, phase: Phase, approved: boolean) => {
      const result = await fileService.updateApproval(specPath, phase, approved);
      if (!result.ok) {
        throw new Error(`Failed to update approval: ${result.error.type}`);
      }
    }
  );

  // Command Execution Handlers
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_COMMAND,
    async (event, command: string, workingDirectory: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error('No window found for command execution');
      }

      const result = await commandService.executeCommand(
        command,
        workingDirectory,
        window.webContents
      );

      if (!result.ok) {
        throw new Error(`Command execution failed: ${result.error.type}`);
      }

      return result.value;
    }
  );

  ipcMain.handle(IPC_CHANNELS.CANCEL_EXECUTION, async () => {
    const result = commandService.cancelExecution();
    if (!result.ok) {
      throw new Error(`Cancel execution failed: ${result.error.type}`);
    }
  });

  // Config Handlers
  ipcMain.handle(IPC_CHANNELS.GET_RECENT_PROJECTS, async () => {
    return configStore.getRecentProjects();
  });

  ipcMain.handle(
    IPC_CHANNELS.ADD_RECENT_PROJECT,
    async (_event, path: string) => {
      configStore.addRecentProject(path);
      updateMenu(); // Update menu to reflect new recent project
    }
  );

  // App Handlers
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, async () => {
    return process.platform;
  });

  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_PROJECT_PATH, async () => {
    return initialProjectPath;
  });

  // Specs Watcher Handlers
  ipcMain.handle(IPC_CHANNELS.START_SPECS_WATCHER, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      startSpecsWatcher(window);
      // Also start agent record watcher
      startAgentRecordWatcher(window);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STOP_SPECS_WATCHER, async () => {
    await stopSpecsWatcher();
    await stopAgentRecordWatcher();
  });

  // Agent Management Handlers (Task 27.1)
  // Requirements: 5.1-5.8, 10.1-10.3
  ipcMain.handle(
    IPC_CHANNELS.START_AGENT,
    async (
      event,
      specId: string,
      phase: string,
      command: string,
      args: string[],
      group?: ExecutionGroup,
      sessionId?: string
    ) => {
      logger.info('[handlers] START_AGENT called', { specId, phase, command, args, group, sessionId });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Set up event forwarding for output and status changes (only once per service instance)
      if (window && !eventCallbacksRegistered) {
        logger.info('[handlers] Registering event callbacks');
        eventCallbacksRegistered = true;

        service.onOutput((agentId, stream, data) => {
          logger.debug('[handlers] Agent output received', { agentId, stream, dataLength: data.length, preview: data.substring(0, 100) });
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, agentId, stream, data);
            logger.debug('[handlers] Agent output sent to renderer', { agentId });
          } else {
            logger.warn('[handlers] Window destroyed, cannot send output', { agentId });
          }
        });

        service.onStatusChange((agentId, status) => {
          logger.info('[handlers] Agent status change', { agentId, status });
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, agentId, status);
          }
        });
      } else {
        logger.debug('[handlers] Event callbacks already registered or no window', { hasWindow: !!window, eventCallbacksRegistered });
      }

      logger.info('[handlers] Calling service.startAgent');
      const result = await service.startAgent({
        specId,
        phase,
        command,
        args,
        group,
        sessionId,
      });

      if (!result.ok) {
        logger.error('[handlers] startAgent failed', { error: result.error });
        throw new Error(`Failed to start agent: ${result.error.type}`);
      }

      logger.info('[handlers] startAgent succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.STOP_AGENT,
    async (_event, agentId: string) => {
      const service = getSpecManagerService();
      const result = await service.stopAgent(agentId);

      if (!result.ok) {
        throw new Error(`Failed to stop agent: ${result.error.type}`);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RESUME_AGENT,
    async (event, agentId: string) => {
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Set up event forwarding for the resumed agent
      if (window) {
        service.onOutput((aId, stream, data) => {
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, aId, stream, data);
          }
        });

        service.onStatusChange((aId, status) => {
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, aId, status);
          }
        });
      }

      const result = await service.resumeAgent(agentId);

      if (!result.ok) {
        throw new Error(`Failed to resume agent: ${result.error.type}`);
      }

      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_AGENTS,
    async (_event, specId: string) => {
      const service = getSpecManagerService();
      return service.getAgents(specId);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GET_ALL_AGENTS, async () => {
    const service = getSpecManagerService();
    const agentsMap = service.getAllAgents();

    // Convert Map to plain object for IPC serialization
    const result: Record<string, AgentInfo[]> = {};
    agentsMap.forEach((agents, specId) => {
      result[specId] = agents;
    });

    return result;
  });

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

  // Config Handlers - Extension (Task 27.3)
  // Requirements: 13.1, 13.2
  ipcMain.handle(IPC_CHANNELS.GET_HANG_THRESHOLD, async () => {
    return configStore.getHangThreshold();
  });

  ipcMain.handle(
    IPC_CHANNELS.SET_HANG_THRESHOLD,
    async (_event, thresholdMs: number) => {
      configStore.setHangThreshold(thresholdMs);
    }
  );

  // Phase Execution Handlers (high-level commands)
  // These build the claude command internally in the service layer

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_PHASE,
    async (event, specId: string, phase: WorkflowPhase, featureName: string) => {
      logger.info('[handlers] EXECUTE_PHASE called', { specId, phase, featureName });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executePhase({ specId, phase, featureName });

      if (!result.ok) {
        logger.error('[handlers] executePhase failed', { error: result.error });
        throw new Error(`Failed to execute phase: ${result.error.type}`);
      }

      logger.info('[handlers] executePhase succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_VALIDATION,
    async (event, specId: string, type: ValidationType, featureName: string) => {
      logger.info('[handlers] EXECUTE_VALIDATION called', { specId, type, featureName });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeValidation({ specId, type, featureName });

      if (!result.ok) {
        logger.error('[handlers] executeValidation failed', { error: result.error });
        throw new Error(`Failed to execute validation: ${result.error.type}`);
      }

      logger.info('[handlers] executeValidation succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_SPEC_STATUS,
    async (event, specId: string, featureName: string) => {
      logger.info('[handlers] EXECUTE_SPEC_STATUS called', { specId, featureName });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeSpecStatus(specId, featureName);

      if (!result.ok) {
        logger.error('[handlers] executeSpecStatus failed', { error: result.error });
        throw new Error(`Failed to execute spec-status: ${result.error.type}`);
      }

      logger.info('[handlers] executeSpecStatus succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_TASK_IMPL,
    async (event, specId: string, featureName: string, taskId: string) => {
      logger.info('[handlers] EXECUTE_TASK_IMPL called', { specId, featureName, taskId });
      const service = getSpecManagerService();
      const window = BrowserWindow.fromWebContents(event.sender);

      // Ensure event callbacks are registered
      if (window && !eventCallbacksRegistered) {
        registerEventCallbacks(service, window);
      }

      const result = await service.executeTaskImpl({ specId, featureName, taskId });

      if (!result.ok) {
        logger.error('[handlers] executeTaskImpl failed', { error: result.error });
        throw new Error(`Failed to execute task impl: ${result.error.type}`);
      }

      logger.info('[handlers] executeTaskImpl succeeded', { agentId: result.value.agentId });
      return result.value;
    }
  );
}

/**
 * Helper to register event callbacks for a window
 */
function registerEventCallbacks(service: SpecManagerService, window: BrowserWindow): void {
  logger.info('[handlers] Registering event callbacks');
  eventCallbacksRegistered = true;

  service.onOutput((agentId, stream, data) => {
    logger.debug('[handlers] Agent output received', { agentId, stream, dataLength: data.length, preview: data.substring(0, 100) });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, agentId, stream, data);
      logger.debug('[handlers] Agent output sent to renderer', { agentId });
    } else {
      logger.warn('[handlers] Window destroyed, cannot send output', { agentId });
    }
  });

  service.onStatusChange((agentId, status) => {
    logger.info('[handlers] Agent status change', { agentId, status });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, agentId, status);
    }
  });
}

/**
 * Start or restart specs watcher for the current project
 */
export function startSpecsWatcher(window: BrowserWindow): void {
  if (!currentProjectPath) {
    logger.warn('[handlers] Cannot start specs watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (specsWatcherService) {
    specsWatcherService.stop();
  }

  specsWatcherService = new SpecsWatcherService(currentProjectPath);

  specsWatcherService.onChange((event) => {
    logger.info('[handlers] Specs changed', { event });
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SPECS_CHANGED, event);
    }
  });

  specsWatcherService.start();
  logger.info('[handlers] Specs watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop specs watcher
 */
export async function stopSpecsWatcher(): Promise<void> {
  if (specsWatcherService) {
    await specsWatcherService.stop();
    specsWatcherService = null;
    logger.info('[handlers] Specs watcher stopped');
  }
}

/**
 * Start or restart agent record watcher for the current project
 */
export function startAgentRecordWatcher(window: BrowserWindow): void {
  if (!currentProjectPath) {
    logger.warn('[handlers] Cannot start agent record watcher: no project path set');
    return;
  }

  // Stop existing watcher if any
  if (agentRecordWatcherService) {
    agentRecordWatcherService.stop();
  }

  agentRecordWatcherService = new AgentRecordWatcherService(currentProjectPath);

  agentRecordWatcherService.onChange((event) => {
    logger.debug('[handlers] Agent record changed', { type: event.type, specId: event.specId, agentId: event.agentId });
    if (!window.isDestroyed() && event.record) {
      // Send the full AgentInfo to renderer
      const agentInfo: AgentInfo = {
        agentId: event.record.agentId,
        specId: event.record.specId,
        phase: event.record.phase,
        pid: event.record.pid,
        sessionId: event.record.sessionId,
        status: event.record.status,
        startedAt: event.record.startedAt,
        lastActivityAt: event.record.lastActivityAt,
        command: event.record.command,
      };
      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, agentInfo);
    } else if (!window.isDestroyed() && event.type === 'unlink') {
      // For unlink events, send just the IDs
      window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, {
        agentId: event.agentId,
        specId: event.specId,
      });
    }
  });

  agentRecordWatcherService.start();
  logger.info('[handlers] Agent record watcher started', { projectPath: currentProjectPath });
}

/**
 * Stop agent record watcher
 */
export async function stopAgentRecordWatcher(): Promise<void> {
  if (agentRecordWatcherService) {
    await agentRecordWatcherService.stop();
    agentRecordWatcherService = null;
    logger.info('[handlers] Agent record watcher stopped');
  }
}
