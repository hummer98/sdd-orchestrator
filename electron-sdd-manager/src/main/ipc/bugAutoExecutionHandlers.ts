/**
 * BugAutoExecutionHandlers
 * IPC handlers for bug auto-execution functionality
 * Bug fix: auto-execution-ui-state-dependency
 *
 * Main Process側でBug自動実行の状態を管理し、
 * Renderer ProcessからIPC経由で操作・監視する
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { logger } from '../services/logger';
import type {
  BugAutoExecutionCoordinator,
  BugAutoExecutionOptions,
  BugAutoExecutionState,
  BugAutoExecutionError,
  Result,
} from '../services/bugAutoExecutionCoordinator';
import type { BugWorkflowPhase } from '../../renderer/types/bug';

// ============================================================
// Types for IPC communication
// ============================================================

/**
 * Requirement 3.2: BugStartParamsにprojectPath追加
 */
interface BugStartParams {
  projectPath: string;
  bugPath: string;
  bugName: string;
  options: BugAutoExecutionOptions;
  lastCompletedPhase: BugWorkflowPhase | null;
}

interface BugStopParams {
  bugPath: string;
}

interface BugStatusParams {
  bugPath: string;
}

interface BugRetryFromParams {
  bugPath: string;
  phase: BugWorkflowPhase;
}

// ============================================================
// Serializable State Type for IPC
// ============================================================

/**
 * Serializable version of BugAutoExecutionState (without timeoutId)
 * Used for IPC communication to ensure JSON serialization works
 */
interface SerializableBugAutoExecutionState {
  bugPath: string;
  bugName: string;
  status: 'idle' | 'running' | 'paused' | 'error' | 'completed';
  currentPhase: BugWorkflowPhase | null;
  executedPhases: BugWorkflowPhase[];
  errors: string[];
  startTime: number;
  lastActivityTime: number;
  currentAgentId?: string;
  retryCount: number;
  lastFailedPhase: BugWorkflowPhase | null;
}

/**
 * Convert BugAutoExecutionState to serializable format
 * Removes timeoutId which contains circular references
 */
function toSerializableState(state: BugAutoExecutionState | null): SerializableBugAutoExecutionState | null {
  if (!state) return null;

  // Destructure to exclude timeoutId
  const { timeoutId, ...serializableState } = state;
  return serializableState;
}

/**
 * Convert Result with BugAutoExecutionState to serializable format
 */
function toSerializableResult(
  result: Result<BugAutoExecutionState, BugAutoExecutionError>
): Result<SerializableBugAutoExecutionState, BugAutoExecutionError> {
  if (result.ok) {
    return { ok: true, value: toSerializableState(result.value) as SerializableBugAutoExecutionState };
  }
  return result;
}

// ============================================================
// Handler registration
// ============================================================

/**
 * Register all bug auto-execution IPC handlers
 * @param coordinator BugAutoExecutionCoordinator instance
 */
export function registerBugAutoExecutionHandlers(coordinator: BugAutoExecutionCoordinator): void {
  logger.info('[bugAutoExecutionHandlers] Registering IPC handlers');

  // BUG_AUTO_EXECUTION_START
  // Requirement 3.3: projectPathをcoordinator.start()に渡す
  ipcMain.handle(
    IPC_CHANNELS.BUG_AUTO_EXECUTION_START,
    async (_event, params: BugStartParams): Promise<Result<SerializableBugAutoExecutionState, BugAutoExecutionError>> => {
      logger.debug('[bugAutoExecutionHandlers] BUG_AUTO_EXECUTION_START', { bugPath: params.bugPath });
      const result = await coordinator.start(
        params.projectPath,
        params.bugPath,
        params.bugName,
        params.options,
        params.lastCompletedPhase
      );
      return toSerializableResult(result);
    }
  );

  // BUG_AUTO_EXECUTION_STOP
  ipcMain.handle(
    IPC_CHANNELS.BUG_AUTO_EXECUTION_STOP,
    async (_event, params: BugStopParams): Promise<Result<void, BugAutoExecutionError>> => {
      logger.debug('[bugAutoExecutionHandlers] BUG_AUTO_EXECUTION_STOP', { bugPath: params.bugPath });
      return coordinator.stop(params.bugPath);
    }
  );

  // BUG_AUTO_EXECUTION_STATUS
  ipcMain.handle(
    IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS,
    async (_event, params: BugStatusParams): Promise<SerializableBugAutoExecutionState | null> => {
      logger.debug('[bugAutoExecutionHandlers] BUG_AUTO_EXECUTION_STATUS', { bugPath: params.bugPath });
      return toSerializableState(coordinator.getStatus(params.bugPath));
    }
  );

  // BUG_AUTO_EXECUTION_ALL_STATUS
  ipcMain.handle(
    IPC_CHANNELS.BUG_AUTO_EXECUTION_ALL_STATUS,
    async (): Promise<Record<string, SerializableBugAutoExecutionState>> => {
      logger.debug('[bugAutoExecutionHandlers] BUG_AUTO_EXECUTION_ALL_STATUS');
      const statuses = coordinator.getAllStatuses();
      const result: Record<string, SerializableBugAutoExecutionState> = {};
      for (const [key, value] of statuses) {
        const serializable = toSerializableState(value);
        if (serializable) {
          result[key] = serializable;
        }
      }
      return result;
    }
  );

  // BUG_AUTO_EXECUTION_RETRY_FROM
  ipcMain.handle(
    IPC_CHANNELS.BUG_AUTO_EXECUTION_RETRY_FROM,
    async (_event, params: BugRetryFromParams): Promise<Result<SerializableBugAutoExecutionState, BugAutoExecutionError>> => {
      logger.debug('[bugAutoExecutionHandlers] BUG_AUTO_EXECUTION_RETRY_FROM', {
        bugPath: params.bugPath,
        phase: params.phase,
      });
      const result = await coordinator.retryFrom(params.bugPath, params.phase);
      return toSerializableResult(result);
    }
  );

  // BUG_AUTO_EXECUTION_RESET (E2E Test Support)
  ipcMain.handle(
    IPC_CHANNELS.BUG_AUTO_EXECUTION_RESET,
    async (): Promise<void> => {
      logger.info('[bugAutoExecutionHandlers] BUG_AUTO_EXECUTION_RESET (E2E test support)');
      coordinator.resetAll();
    }
  );

  // Register event forwarding to Renderer
  setupEventForwarding(coordinator);

  logger.info('[bugAutoExecutionHandlers] IPC handlers registered');
}

/**
 * Unregister all bug auto-execution IPC handlers
 */
export function unregisterBugAutoExecutionHandlers(): void {
  logger.info('[bugAutoExecutionHandlers] Unregistering IPC handlers');

  ipcMain.removeHandler(IPC_CHANNELS.BUG_AUTO_EXECUTION_START);
  ipcMain.removeHandler(IPC_CHANNELS.BUG_AUTO_EXECUTION_STOP);
  ipcMain.removeHandler(IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.BUG_AUTO_EXECUTION_ALL_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.BUG_AUTO_EXECUTION_RETRY_FROM);
  ipcMain.removeHandler(IPC_CHANNELS.BUG_AUTO_EXECUTION_RESET);

  logger.info('[bugAutoExecutionHandlers] IPC handlers unregistered');
}

// ============================================================
// Event Forwarding to Renderer
// ============================================================

/**
 * Setup event forwarding from coordinator to all Renderer windows
 * @param coordinator BugAutoExecutionCoordinator instance
 */
function setupEventForwarding(coordinator: BugAutoExecutionCoordinator): void {
  // Forward state-changed events (serialize to avoid circular references)
  coordinator.on('state-changed', (bugPath: string, state: BugAutoExecutionState) => {
    logger.debug('[bugAutoExecutionHandlers] state-changed event received', {
      bugPath,
      status: state.status,
      currentPhase: state.currentPhase,
    });
    broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_STATUS_CHANGED, {
      bugPath,
      state: toSerializableState(state),
    });
  });

  // Forward phase-started events
  coordinator.on('phase-started', (bugPath: string, phase: BugWorkflowPhase, agentId: string) => {
    broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_PHASE_STARTED, { bugPath, phase, agentId });
  });

  // Forward phase-completed events
  coordinator.on('phase-completed', (bugPath: string, phase: BugWorkflowPhase) => {
    broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_PHASE_COMPLETED, { bugPath, phase });
  });

  // Forward execution-completed events
  coordinator.on('execution-completed', (bugPath: string, summary) => {
    broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_COMPLETED, { bugPath, summary });
  });

  // Forward execution-error events
  coordinator.on('execution-error', (bugPath: string, error: BugAutoExecutionError) => {
    broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_ERROR, { bugPath, error });
  });

  // Forward execute-next-phase events for agent execution
  coordinator.on('execute-next-phase', (bugPath: string, phase: BugWorkflowPhase, context: { bugName: string }) => {
    logger.info('[bugAutoExecutionHandlers] execute-next-phase event', { bugPath, phase, bugName: context.bugName });
    broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_EXECUTE_PHASE, { bugPath, phase, bugName: context.bugName });
  });

  logger.debug('[bugAutoExecutionHandlers] Event forwarding setup complete');
}

/**
 * Broadcast message to all Renderer windows
 * @param channel IPC channel name
 * @param data Data to send
 */
function broadcastToRenderers(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (!window.isDestroyed() && window.webContents) {
      window.webContents.send(channel, data);
    }
  }
}
