/**
 * Remote Access IPC Handlers
 * Manages IPC communication for Remote Access Server
 * Requirements: 1.1, 1.2, 1.6, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from './channels';
import { RemoteAccessServer } from '../services/remoteAccessServer';
import type { ServerStatus } from '../services/remoteAccessServer';
import { logger } from '../services/logger';
import { setMenuRemoteServerStatus } from '../menu';
import type { StateProvider, WorkflowController, WorkflowResult, AgentInfo, AgentStateInfo, SpecInfo, BugInfo, BugAction, ValidationType, AgentLogsProvider } from '../services/webSocketHandler';
import { getDefaultLogFileService } from '../services/logFileService';
import type { SpecManagerService, WorkflowPhase } from '../services/specManagerService';
import { buildClaudeArgs, getAllowedToolsForPhase } from '../services/specManagerService';
import { getClaudeCommand } from '../services/agentProcess';

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
 * Requirements: 1.1, 3.1, 3.2, 3.3, 5.5, 6.1 (internal-webserver-sync)
 *
 * @param projectPath - Current project path
 * @param getSpecs - Function to retrieve specs from the project
 * @param getBugs - Function to retrieve bugs from the project (optional)
 * @param getAgents - Function to retrieve agents (optional)
 */
export function createStateProvider(
  projectPath: string,
  getSpecs: () => Promise<SpecInfo[] | null>,
  getBugs?: () => Promise<BugInfo[] | null>,
  getAgents?: () => Promise<AgentStateInfo[] | null>
): StateProvider {
  return {
    getProjectPath: () => projectPath,
    getSpecs: async () => {
      const specs = await getSpecs();
      return specs || [];
    },
    getBugs: async () => {
      if (!getBugs) return [];
      const bugs = await getBugs();
      return bugs || [];
    },
    getAgents: async () => {
      if (!getAgents) return [];
      const agents = await getAgents();
      return agents || [];
    },
    getVersion: () => app.getVersion(),
  };
}

/**
 * Set up StateProvider on the WebSocketHandler
 * Requirements: 1.1, 3.1, 3.2, 3.3, 5.5, 6.1 (internal-webserver-sync)
 *
 * @param projectPath - Current project path
 * @param getSpecs - Function to retrieve specs from the project
 * @param getBugs - Function to retrieve bugs from the project (optional)
 * @param getAgents - Function to retrieve agents (optional)
 */
export function setupStateProvider(
  projectPath: string,
  getSpecs: () => Promise<SpecInfo[] | null>,
  getBugs?: () => Promise<BugInfo[] | null>,
  getAgents?: () => Promise<AgentStateInfo[] | null>
): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const stateProvider = createStateProvider(projectPath, getSpecs, getBugs, getAgents);
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

    /**
     * Execute a bug workflow phase
     * Requirements: 6.2, 6.7 (internal-webserver-sync Task 2.1)
     *
     * @param bugName - Bug name/identifier
     * @param phase - Bug phase (analyze/fix/verify)
     */
    executeBugPhase: async (bugName: string, phase: BugAction): Promise<WorkflowResult<AgentInfo>> => {
      const bugCommandMap: Record<BugAction, string> = {
        analyze: '/kiro:bug-analyze',
        fix: '/kiro:bug-fix',
        verify: '/kiro:bug-verify',
      };

      const slashCommand = bugCommandMap[phase];
      const bugPhase = `bug-${phase}`;
      const allowedTools = getAllowedToolsForPhase(bugPhase);
      const result = await specManagerService.startAgent({
        specId: '',
        phase: bugPhase,
        command: getClaudeCommand(),
        args: buildClaudeArgs({ command: `${slashCommand} ${bugName}`, allowedTools }),
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

    /**
     * Execute validation
     * Requirements: 6.3, 6.7 (internal-webserver-sync Task 2.2)
     *
     * @param specId - Specification identifier
     * @param type - Validation type (gap/design)
     */
    executeValidation: async (specId: string, type: ValidationType): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.executeValidation({
        specId,
        type,
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

    /**
     * Execute document review
     * Requirements: 6.4, 6.7 (internal-webserver-sync Task 2.3)
     *
     * @param specId - Specification identifier
     */
    executeDocumentReview: async (specId: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.executeDocumentReview({
        specId,
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

    /**
     * Create a new spec using spec-init
     * Bug fix: remote-ui-missing-create-buttons
     *
     * @param description - Spec description
     */
    createSpec: async (description: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.startAgent({
        specId: '',
        phase: 'spec-init',
        command: getClaudeCommand(),
        args: buildClaudeArgs({ command: `/kiro:spec-init "${description}"` }),
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

    /**
     * Create a new bug using bug-create
     * Bug fix: remote-ui-missing-create-buttons
     *
     * @param name - Bug name
     * @param description - Bug description
     */
    createBug: async (name: string, description: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.startAgent({
        specId: '',
        phase: 'bug-create',
        command: getClaudeCommand(),
        args: buildClaudeArgs({ command: `/kiro:bug-create ${name} "${description}"` }),
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
 * Create an AgentLogsProvider for WebSocketHandler
 * Requirements: Bug fix - remote-ui-agent-log-display
 */
export function createAgentLogsProvider(): AgentLogsProvider {
  return {
    readLog: async (specId: string, agentId: string) => {
      const logFileService = getDefaultLogFileService();
      return logFileService.readLog(specId, agentId);
    },
  };
}

/**
 * Set up AgentLogsProvider on the WebSocketHandler
 * Requirements: Bug fix - remote-ui-agent-log-display
 *
 * Enables Remote UI to fetch agent log files when selecting an agent.
 */
export function setupAgentLogsProvider(): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const agentLogsProvider = createAgentLogsProvider();
    wsHandler.setAgentLogsProvider(agentLogsProvider);
    logger.info('[remoteAccessHandlers] AgentLogsProvider set up successfully');
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

  // REFRESH_ACCESS_TOKEN handler
  // Task 15.2.2: Refresh access token and regenerate QR code
  ipcMain.handle(IPC_CHANNELS.REFRESH_ACCESS_TOKEN, async () => {
    logger.info('[remoteAccessHandlers] REFRESH_ACCESS_TOKEN called');

    const result = await server.refreshAccessToken();
    return result;
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
  ipcMain.removeHandler(IPC_CHANNELS.REFRESH_ACCESS_TOKEN);

  // Reset singleton for clean test environment
  remoteAccessServer = null;
}
