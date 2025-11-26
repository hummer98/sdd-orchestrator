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
import { SpecManagerService, ExecutionGroup } from '../services/specManagerService';
import type { AgentInfo } from '../services/agentRegistry';
import { logger } from '../services/logger';

const fileService = new FileService();
const commandService = new CommandService();

// SpecManagerService instance (lazily initialized with project path)
let specManagerService: SpecManagerService | null = null;
// Track if event callbacks have been set up to avoid duplicates
let eventCallbacksRegistered = false;

/**
 * Set up SpecManagerService for a project
 */
export async function setProjectPath(projectPath: string): Promise<void> {
  logger.info('[handlers] setProjectPath called', { projectPath });
  specManagerService = new SpecManagerService(projectPath);
  eventCallbacksRegistered = false; // Reset when service is recreated

  // Restore agents from PID files and cleanup stale ones
  try {
    await specManagerService.restoreAgents();
    console.log('[handlers] Agents restored from PID files');
  } catch (error) {
    console.error('[handlers] Failed to restore agents:', error);
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
}
