/**
 * AutoExecutionHandlers
 * IPC handlers for auto-execution functionality
 * Requirements: 4.1, 4.2, 4.3
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { logger } from '../services/logger';
import type {
  AutoExecutionCoordinator,
  AutoExecutionOptions,
  AutoExecutionState,
  AutoExecutionError,
  Result,
} from '../services/autoExecutionCoordinator';
import type { WorkflowPhase } from '../services/specManagerService';

// ============================================================
// Types for IPC communication
// ============================================================

interface StartParams {
  specPath: string;
  specId: string;
  options: AutoExecutionOptions;
}

interface StopParams {
  specPath: string;
}

interface StatusParams {
  specPath: string;
}

interface RetryFromParams {
  specPath: string;
  phase: WorkflowPhase;
}

// ============================================================
// Task 8.3: Serializable State Type for IPC
// Requirements: 9.3
// ============================================================

/**
 * Serializable version of AutoExecutionState (without timeoutId)
 * Used for IPC communication to ensure JSON serialization works
 */
interface SerializableAutoExecutionState {
  specPath: string;
  specId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentPhase: WorkflowPhase | null;
  executedPhases: WorkflowPhase[];
  errors: string[];
  startTime: number;
  lastActivityTime: number;
  currentAgentId?: string;
}

/**
 * Convert AutoExecutionState to serializable format
 * Removes timeoutId which contains circular references
 */
function toSerializableState(state: AutoExecutionState | null): SerializableAutoExecutionState | null {
  if (!state) return null;

  // Destructure to exclude timeoutId
  const { timeoutId, ...serializableState } = state;
  return serializableState;
}

/**
 * Convert Result with AutoExecutionState to serializable format
 */
function toSerializableResult(
  result: Result<AutoExecutionState, AutoExecutionError>
): Result<SerializableAutoExecutionState, AutoExecutionError> {
  if (result.ok) {
    return { ok: true, value: toSerializableState(result.value) as SerializableAutoExecutionState };
  }
  return result;
}

// ============================================================
// Handler registration
// ============================================================

/**
 * Register all auto-execution IPC handlers
 * @param coordinator AutoExecutionCoordinator instance
 */
export function registerAutoExecutionHandlers(coordinator: AutoExecutionCoordinator): void {
  logger.info('[autoExecutionHandlers] Registering IPC handlers');

  // AUTO_EXECUTION_START
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_START,
    async (_event, params: StartParams): Promise<Result<SerializableAutoExecutionState, AutoExecutionError>> => {
      logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_START', { specPath: params.specPath });
      const result = await coordinator.start(params.specPath, params.specId, params.options);
      return toSerializableResult(result);
    }
  );

  // AUTO_EXECUTION_STOP
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_STOP,
    async (_event, params: StopParams): Promise<Result<void, AutoExecutionError>> => {
      logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_STOP', { specPath: params.specPath });
      return coordinator.stop(params.specPath);
    }
  );

  // AUTO_EXECUTION_STATUS
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_STATUS,
    async (_event, params: StatusParams): Promise<SerializableAutoExecutionState | null> => {
      logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_STATUS', { specPath: params.specPath });
      return toSerializableState(coordinator.getStatus(params.specPath));
    }
  );

  // AUTO_EXECUTION_ALL_STATUS
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS,
    async (): Promise<Record<string, SerializableAutoExecutionState>> => {
      logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_ALL_STATUS');
      const statuses = coordinator.getAllStatuses();
      const result: Record<string, SerializableAutoExecutionState> = {};
      for (const [key, value] of statuses) {
        const serializable = toSerializableState(value);
        if (serializable) {
          result[key] = serializable;
        }
      }
      return result;
    }
  );

  // AUTO_EXECUTION_RETRY_FROM
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM,
    async (_event, params: RetryFromParams): Promise<Result<SerializableAutoExecutionState, AutoExecutionError>> => {
      logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_RETRY_FROM', {
        specPath: params.specPath,
        phase: params.phase,
      });
      const result = await coordinator.retryFrom(params.specPath, params.phase);
      return toSerializableResult(result);
    }
  );

  // Register event forwarding to Renderer
  setupEventForwarding(coordinator);

  logger.info('[autoExecutionHandlers] IPC handlers registered');
}

/**
 * Unregister all auto-execution IPC handlers
 */
export function unregisterAutoExecutionHandlers(): void {
  logger.info('[autoExecutionHandlers] Unregistering IPC handlers');

  ipcMain.removeHandler(IPC_CHANNELS.AUTO_EXECUTION_START);
  ipcMain.removeHandler(IPC_CHANNELS.AUTO_EXECUTION_STOP);
  ipcMain.removeHandler(IPC_CHANNELS.AUTO_EXECUTION_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.AUTO_EXECUTION_ALL_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.AUTO_EXECUTION_RETRY_FROM);

  logger.info('[autoExecutionHandlers] IPC handlers unregistered');
}

// ============================================================
// Event Forwarding to Renderer (Task 2.3)
// Requirements: 4.4, 4.5, 4.6
// ============================================================

/**
 * Setup event forwarding from coordinator to all Renderer windows
 * @param coordinator AutoExecutionCoordinator instance
 */
function setupEventForwarding(coordinator: AutoExecutionCoordinator): void {
  // Forward state-changed events (serialize to avoid circular references)
  coordinator.on('state-changed', (specPath: string, state: AutoExecutionState) => {
    broadcastToRenderers(IPC_CHANNELS.AUTO_EXECUTION_STATUS_CHANGED, {
      specPath,
      state: toSerializableState(state),
    });
  });

  // Forward phase-started events
  coordinator.on('phase-started', (specPath: string, phase: WorkflowPhase, agentId: string) => {
    broadcastToRenderers(IPC_CHANNELS.AUTO_EXECUTION_PHASE_STARTED, { specPath, phase, agentId });
  });

  // Forward phase-completed events
  coordinator.on('phase-completed', (specPath: string, phase: WorkflowPhase) => {
    broadcastToRenderers(IPC_CHANNELS.AUTO_EXECUTION_PHASE_COMPLETED, { specPath, phase });
  });

  // Forward execution-completed events
  coordinator.on('execution-completed', (specPath: string, summary) => {
    broadcastToRenderers(IPC_CHANNELS.AUTO_EXECUTION_COMPLETED, { specPath, summary });
  });

  // Forward execution-error events
  coordinator.on('execution-error', (specPath: string, error: AutoExecutionError) => {
    broadcastToRenderers(IPC_CHANNELS.AUTO_EXECUTION_ERROR, { specPath, error });
  });

  logger.debug('[autoExecutionHandlers] Event forwarding setup complete');
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
