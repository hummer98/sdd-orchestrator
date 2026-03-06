/**
 * Remote Access Server Setup Utilities
 * trpc-full-migration Task 10.7: remoteAccessHandlers.tsからユーティリティ関数を分離
 *
 * Contains non-IPC utility functions previously in remoteAccessHandlers.ts:
 * - getRemoteAccessServer: Singleton accessor
 * - createStateProvider, setupStateProvider: WebSocket state management
 * - createWorkflowController, setupWorkflowController: Workflow execution
 * - createAgentLogsProvider, setupAgentLogsProvider: Agent log access
 * - createSpecDetailProvider, setupSpecDetailProvider: Spec detail access
 * - createBugDetailProvider, setupBugDetailProvider: Bug detail access
 * - setupFileService: File service for WebSocket
 * - setupStatusNotifications: Server status change broadcasting
 */

import { app } from 'electron';
import { RemoteAccessServer } from './remoteAccessServer';
import type { ServerStatus } from './remoteAccessServer';
import { projectLogger as logger } from './projectLogger';
import { setMenuRemoteServerStatus } from '../menu';
import { getGlobalEventBus } from '../trpc/services/globalEventBus';
import { EVENT_NAMES } from '../trpc/services/eventBus';
import type { StateProvider, WorkflowController, WorkflowResult, AgentInfo, AgentStateInfo, SpecInfo, AgentLogsProvider, ProfileConfig, SpecDetailProvider } from './webSocketHandler';
import { FileService } from './fileService';
import { projectConfigService } from './layoutConfigService';
import type { SpecManagerService } from './specManagerService';
import { buildClaudeArgs } from './specManagerService';
// BugService removed (github-issue-integration)
import { join } from 'path';
import type { ExecuteOptions } from '../../shared/types/executeOptions';
import { getDefaultAgentRecordService } from './agentRecordService';
import type { ParsedLogEntry } from '@shared/utils/parserTypes';


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
 * Reset the singleton (for testing)
 */
export function resetRemoteAccessServer(): void {
  remoteAccessServer = null;
}

/**
 * Create a StateProvider for WebSocketHandler
 * Requirements: 1.1, 3.1, 3.2, 3.3, 5.5, 6.1 (internal-webserver-sync)
 */
export function createStateProvider(
  projectPath: string,
  getSpecs: () => Promise<SpecInfo[] | null>,
  _getBugs?: unknown,
  getAgents?: () => Promise<AgentStateInfo[] | null>
): StateProvider {
  return {
    getProjectPath: () => projectPath,
    getSpecs: async () => {
      const specs = await getSpecs();
      return specs || [];
    },
    getAgents: async () => {
      if (!getAgents) return [];
      const agents = await getAgents();
      return agents || [];
    },
    getVersion: () => app.getVersion(),
    getProfile: async (): Promise<ProfileConfig | null> => {
      try {
        const profile = await projectConfigService.loadProfile(projectPath);
        return profile as ProfileConfig | null;
      } catch (error) {
        logger.warn('[remoteAccessSetup] Failed to load profile', { projectPath, error });
        return null;
      }
    },
  };
}

/**
 * Set up StateProvider on the WebSocketHandler
 */
export function setupStateProvider(
  projectPath: string,
  getSpecs: () => Promise<SpecInfo[] | null>,
  getBugs?: () => Promise<unknown[] | null>,
  getAgents?: () => Promise<AgentStateInfo[] | null>
): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const stateProvider = createStateProvider(projectPath, getSpecs, getBugs, getAgents);
    wsHandler.setStateProvider(stateProvider);
    logger.info('[remoteAccessSetup] StateProvider set up successfully', { projectPath });
  }
}

/**
 * Create a WorkflowController for WebSocketHandler
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function createWorkflowController(
  specManagerService: SpecManagerService
): WorkflowController {
  return {
    executePhase: async (specId: string, phase: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.execute({
        type: phase as ExecuteOptions['type'],
        specId,
        featureName: specId,
      } as ExecuteOptions);

      if (result.ok) {
        return {
          ok: true,
          value: { agentId: result.value.agentId },
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

    execute: async (options: ExecuteOptions): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.execute(options);

      if (result.ok) {
        return {
          ok: true,
          value: { agentId: result.value.agentId },
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
          value: { agentId: result.value.agentId },
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

    executeDocumentReview: async (specId: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.execute({
        type: 'document-review',
        specId,
        featureName: specId,
      });

      if (result.ok) {
        return {
          ok: true,
          value: { agentId: result.value.agentId },
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

    createSpec: async (description: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.startAgent({
        specId: '',
        phase: 'spec-init',
        args: buildClaudeArgs({ command: `/kiro:spec-init "${description}"` }),
        engineId: 'claude',
      });

      if (result.ok) {
        return {
          ok: true,
          value: { agentId: result.value.agentId },
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

    executeProjectCommand: async (command: string, title: string): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.startAgent({
        specId: '',
        phase: title,
        args: buildClaudeArgs({ command }),
        engineId: 'claude',
      });

      if (result.ok) {
        return {
          ok: true,
          value: { agentId: result.value.agentId },
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

    executeSpecCommand: async (
      specId: string,
      _featureName: string,
      command: string,
      title: string
    ): Promise<WorkflowResult<AgentInfo>> => {
      const result = await specManagerService.startAgent({
        specId,
        phase: title,
        args: buildClaudeArgs({ command }),
        engineId: 'claude',
      });

      if (result.ok) {
        return {
          ok: true,
          value: { agentId: result.value.agentId },
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

    checkReleaseMd: async (): Promise<{ releaseMdExists: boolean }> => {
      const projectPath = specManagerService.getProjectPath();
      if (!projectPath) {
        return { releaseMdExists: false };
      }

      const releaseMdPath = join(projectPath, '.claude', 'commands', 'release.md');
      try {
        const { stat } = await import('fs/promises');
        await stat(releaseMdPath);
        return { releaseMdExists: true };
      } catch {
        return { releaseMdExists: false };
      }
    },

    generateReleaseMd: async (): Promise<WorkflowResult<AgentInfo>> => {
      const slashCommand = '/kiro:generate-release';
      const result = await specManagerService.startAgent({
        specId: '',
        phase: 'generate-release',
        args: [slashCommand],
        group: 'doc',
        engineId: 'claude',
      });

      if (result.ok) {
        return {
          ok: true,
          value: { agentId: result.value.agentId },
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
 */
export function setupWorkflowController(specManagerService: SpecManagerService): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const workflowController = createWorkflowController(specManagerService);
    wsHandler.setWorkflowController(workflowController);
    logger.info('[remoteAccessSetup] WorkflowController set up successfully');
  }
}

/**
 * Create an AgentLogsProvider for WebSocketHandler
 */
export function createAgentLogsProvider(): AgentLogsProvider {
  return {
    readLog: async (specId: string, agentId: string): Promise<ParsedLogEntry[]> => {
      let engineId: import('@shared/registry').LLMEngineId | undefined;
      try {
        const agentRecordService = getDefaultAgentRecordService();
        const record = await agentRecordService.findRecordByAgentId(agentId);
        engineId = record?.engineId;
      } catch {
        logger.debug('[createAgentLogsProvider] AgentRecordService not available, using default parser');
      }

      const { readParsedLogs } = await import('./logFileService');
      const parsedLogs = await readParsedLogs(specId, agentId, engineId);

      return parsedLogs;
    },
  };
}

/**
 * Set up AgentLogsProvider on the WebSocketHandler
 */
export function setupAgentLogsProvider(): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const agentLogsProvider = createAgentLogsProvider();
    wsHandler.setAgentLogsProvider(agentLogsProvider);
    logger.info('[remoteAccessSetup] AgentLogsProvider set up successfully');
  }
}

/**
 * Create a SpecDetailProvider for WebSocketHandler
 */
export function createSpecDetailProvider(projectPath: string): SpecDetailProvider {
  const fileService = new FileService();

  return {
    getSpecDetail: async (specId: string) => {
      try {
        const resolveResult = await fileService.resolveSpecPath(projectPath, specId);
        if (!resolveResult.ok) {
          return {
            ok: false,
            error: { type: 'NOT_FOUND', message: `Spec not found: ${specId}` },
          };
        }
        const specPath = resolveResult.value;
        const result = await fileService.readSpecJson(specPath);

        if (!result.ok) {
          return {
            ok: false,
            error: { type: 'NOT_FOUND', message: `Spec not found: ${specId}` },
          };
        }

        const specJson = result.value;

        const markdownFilesResult = await fileService.listMarkdownFilesInSpec(specPath);
        const markdownFiles = markdownFilesResult.ok ? markdownFilesResult.value : [];

        const artifactNames = ['requirements', 'design', 'tasks', 'research', 'inspection'] as const;
        const artifactInfos = await Promise.all(
          artifactNames.map(name => fileService.getArtifactInfo(specPath, name))
        );

        const artifacts = {
          requirements: { exists: artifactInfos[0] !== null },
          design: { exists: artifactInfos[1] !== null },
          tasks: { exists: artifactInfos[2] !== null },
          research: { exists: artifactInfos[3] !== null },
          inspection: { exists: artifactInfos[4] !== null },
        };

        return {
          ok: true,
          value: {
            name: specId,
            path: specPath,
            phase: specJson.phase || 'initialized',
            specJson: specJson as unknown as Record<string, unknown>,
            metadata: {
              name: specId,
              path: specPath,
              phase: specJson.phase || 'initialized',
              updatedAt: specJson.updated_at,
              approvals: specJson.approvals,
            },
            artifacts,
            taskProgress: null,
            markdownFiles,
          },
        };
      } catch (error) {
        logger.error('[remoteAccessSetup] Failed to get spec detail', { specId, error });
        return {
          ok: false,
          error: { type: 'ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        };
      }
    },
  };
}

/**
 * Set up SpecDetailProvider on the WebSocketHandler
 */
export function setupSpecDetailProvider(projectPath: string): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const specDetailProvider = createSpecDetailProvider(projectPath);
    wsHandler.setSpecDetailProvider(specDetailProvider);
    logger.info('[remoteAccessSetup] SpecDetailProvider set up successfully', { projectPath });
  }
}

// createBugDetailProvider and setupBugDetailProvider removed (github-issue-integration)

/**
 * Set up FileService on the WebSocketHandler
 */
export function setupFileService(_projectPath: string): void {
  const server = getRemoteAccessServer();
  const wsHandler = server.getWebSocketHandler();

  if (wsHandler) {
    const fileService = new FileService();
    wsHandler.setFileService(fileService);
    logger.info('[remoteAccessSetup] FileService set up successfully');
  }
}

/**
 * Set up status change notifications to renderer
 * Subscribes to server status changes and forwards them via EventBus for tRPC Subscription.
 */
export function setupStatusNotifications(): void {
  const server = getRemoteAccessServer();

  server.onStatusChange((status: ServerStatus) => {
    logger.debug('[remoteAccessSetup] Status changed', { status });

    // Update menu state
    setMenuRemoteServerStatus(status.isRunning);

    // Emit to EventBus for tRPC Subscription (primary path after IPC removal)
    getGlobalEventBus().emit(EVENT_NAMES.REMOTE_SERVER_STATUS_CHANGED, status);
  });
}
