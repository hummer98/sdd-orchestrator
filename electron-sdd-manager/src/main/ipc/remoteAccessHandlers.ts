/**
 * Remote Access IPC Handlers
 * Manages IPC communication for Remote Access Server
 * Requirements: 1.1, 1.2, 1.6, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { RemoteAccessServer } from '../services/remoteAccessServer';
import type { ServerStatus } from '../services/remoteAccessServer';
import { logger } from '../services/logger';
import { setMenuRemoteServerStatus } from '../menu';
import type { StateProvider, WorkflowController, WorkflowResult, AgentInfo, SpecInfo } from '../services/webSocketHandler';
import type { SpecManagerService, WorkflowPhase } from '../services/specManagerService';

// Singleton instance of RemoteAccessServer
let remoteAccessServer: RemoteAccessServer | null = null;

/**
 * Get the singleton RemoteAccessServer instance
 * Creates it if not exists
 */
export function getRemoteAccessServer(): RemoteAccessServer {
  if (!remoteAccessServer) {
    remoteAccessServer = new RemoteAccessServer();
  }
  return remoteAccessServer;
}

/**
 * Create a StateProvider for WebSocketHandler
 * Requirements: 3.1, 3.2, 3.3
 *
 * @param projectPath - Current project path
 * @param getSpecs - Function to retrieve specs from the project
 */
export function createStateProvider(
  projectPath: string,
  getSpecs: () => Promise<SpecInfo[] | null>
): StateProvider {
  return {
    getProjectPath: () => projectPath,
    getSpecs: async () => {
      const specs = await getSpecs();
      return specs || [];
    },
  };
}

/**
 * Set up StateProvider on the WebSocketHandler
 * Requirements: 3.1, 3.2, 3.3
 *
 * @param projectPath - Current project path
 * @param getSpecs - Function to retrieve specs from the project
 */
export function setupStateProvider(
  projectPath: string,
  getSpecs: () => Promise<SpecInfo[] | null>
): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const stateProvider = createStateProvider(projectPath, getSpecs);
    wsHandler.setStateProvider(stateProvider);
    logger.info('[remoteAccessHandlers] StateProvider set up successfully', { projectPath });
  }
}

/**
 * Create a WorkflowController for WebSocketHandler
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 *
 * @param specManagerService - SpecManagerService instance
 */
export function createWorkflowController(
  specManagerService: SpecManagerService
): WorkflowController {
  return {
    executePhase: async (specId: string, phase: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.executePhase({
        specId,
        phase: phase as WorkflowPhase,
        featureName: specId,
      });

      if (result.ok) {
        return {
          ok: true,
          value: {
            agentId: result.value.agentId,
          },
        };
      }

      return {
        ok: false,
        error: {
          type: result.error.type,
          message: 'message' in result.error ? result.error.message : undefined,
        },
      };
    },

    stopAgent: async (agentId: string): Promise<WorkflowResult<void>> => {
      const result = await specManagerService.stopAgent(agentId);

      if (result.ok) {
        return { ok: true, value: undefined };
      }

      return {
        ok: false,
        error: {
          type: result.error.type,
          message: 'message' in result.error ? result.error.message : undefined,
        },
      };
    },

    resumeAgent: async (agentId: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.resumeAgent(agentId);

      if (result.ok) {
        return {
          ok: true,
          value: {
            agentId: result.value.agentId,
          },
        };
      }

      return {
        ok: false,
        error: {
          type: result.error.type,
          message: 'message' in result.error ? result.error.message : undefined,
        },
      };
    },
  };
}

/**
 * Set up WorkflowController on the WebSocketHandler
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 *
 * @param specManagerService - SpecManagerService instance
 */
export function setupWorkflowController(specManagerService: SpecManagerService): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const workflowController = createWorkflowController(specManagerService);
    wsHandler.setWorkflowController(workflowController);
    logger.info('[remoteAccessHandlers] WorkflowController set up successfully');
  }
}

/**
 * Register Remote Access IPC handlers
 *
 * Registers handlers for:
 * - START_REMOTE_SERVER: Start the remote access server
 * - STOP_REMOTE_SERVER: Stop the remote access server
 * - GET_REMOTE_SERVER_STATUS: Get current server status
 */
export function registerRemoteAccessHandlers(): void {
  const server = getRemoteAccessServer();

  // START_REMOTE_SERVER handler
  // Requirements: 1.1 - Start HTTP/WebSocket server
  ipcMain.handle(
    IPC_CHANNELS.START_REMOTE_SERVER,
    async (_event, preferredPort?: number) => {
      logger.info('[remoteAccessHandlers] START_REMOTE_SERVER called', { preferredPort });

      const result = await server.start(preferredPort);

      if (result.ok) {
        logger.info('[remoteAccessHandlers] Server started successfully', {
          port: result.value.port,
          url: result.value.url,
        });
      } else {
        logger.error('[remoteAccessHandlers] Failed to start server', { error: result.error });
      }

      return result;
    }
  );

  // STOP_REMOTE_SERVER handler
  // Requirements: 1.2 - Stop server and disconnect all clients
  ipcMain.handle(IPC_CHANNELS.STOP_REMOTE_SERVER, async () => {
    logger.info('[remoteAccessHandlers] STOP_REMOTE_SERVER called');

    await server.stop();

    logger.info('[remoteAccessHandlers] Server stopped');
  });

  // GET_REMOTE_SERVER_STATUS handler
  // Requirements: 1.6 - Get server status
  ipcMain.handle(IPC_CHANNELS.GET_REMOTE_SERVER_STATUS, async () => {
    logger.debug('[remoteAccessHandlers] GET_REMOTE_SERVER_STATUS called');

    return server.getStatus();
  });
}

/**
 * Set up status change notifications to renderer
 *
 * Subscribes to server status changes and forwards them
 * to all open BrowserWindows via IPC.
 *
 * Requirements: 1.6 - Real-time status updates
 */
export function setupStatusNotifications(): void {
  const server = getRemoteAccessServer();

  server.onStatusChange((status: ServerStatus) => {
    logger.debug('[remoteAccessHandlers] Status changed', { status });

    // Update menu state
    setMenuRemoteServerStatus(status.isRunning);

    // Send to all windows
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.REMOTE_SERVER_STATUS_CHANGED, status);
      }
    }
  });
}

/**
 * Clean up handlers (for testing)
 */
export function cleanupRemoteAccessHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.START_REMOTE_SERVER);
  ipcMain.removeHandler(IPC_CHANNELS.STOP_REMOTE_SERVER);
  ipcMain.removeHandler(IPC_CHANNELS.GET_REMOTE_SERVER_STATUS);

  // Reset singleton for clean test environment
  remoteAccessServer = null;
}
