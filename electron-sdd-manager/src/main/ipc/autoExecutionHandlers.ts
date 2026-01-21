/**
 * AutoExecutionHandlers
 * IPC handlers for auto-execution functionality
 * Requirements: 4.1, 4.2, 4.3
 * Bug fix: start-impl-path-resolution-missing
 */

import { ipcMain, BrowserWindow } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { IPC_CHANNELS } from './channels';
import { logger } from '../services/logger';
import { FileService } from '../services/fileService';
import { getCurrentProjectPath } from './handlers';
import type {
  AutoExecutionCoordinator,
  AutoExecutionOptions,
  AutoExecutionState,
  AutoExecutionError,
  Result,
} from '../services/autoExecutionCoordinator';
import type { WorkflowPhase } from '../services/specManagerService';

// ============================================================
// Helper: Disable autoExecution in spec.json
// ============================================================

type DisableAutoExecutionResult =
  | { ok: true }
  | { ok: false; error: { message: string } };

/**
 * Disable autoExecution.enabled in spec.json while preserving other autoExecution fields
 * @param specPath Path to the spec directory
 */
async function disableAutoExecutionInSpecJson(specPath: string): Promise<DisableAutoExecutionResult> {
  try {
    const specJsonPath = join(specPath, 'spec.json');
    const content = await readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(content);

    // Preserve existing autoExecution fields, only update enabled
    if (specJson.autoExecution) {
      specJson.autoExecution.enabled = false;
    }

    // Update timestamp
    specJson.updated_at = new Date().toISOString();

    await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: { message: String(error) },
    };
  }
}

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
  // Bug fix: start-impl-path-resolution-missing
  // spec-path-ssot-refactor: Resolve path from name
  const fileService = new FileService();
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_START,
    async (_event, params: StartParams): Promise<Result<SerializableAutoExecutionState, AutoExecutionError>> => {
      logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_START', { specName: params.specPath });

      const projectPath = getCurrentProjectPath();
      if (!projectPath) {
        return {
          ok: false,
          error: { type: 'PRECONDITION_FAILED', message: 'Project not selected' },
        };
      }

      // spec-path-ssot-refactor: Resolve path from name
      const specPathResult = await fileService.resolveSpecPath(projectPath, params.specPath);
      if (!specPathResult.ok) {
        logger.error('[autoExecutionHandlers] AUTO_EXECUTION_START: spec not found', { specName: params.specPath });
        return {
          ok: false,
          error: { type: 'SPEC_NOT_FOUND', specPath: params.specPath },
        };
      }
      const resolvedSpecPath = specPathResult.value;

      const result = await coordinator.start(resolvedSpecPath, params.specId, params.options);
      return toSerializableResult(result);
    }
  );

  // AUTO_EXECUTION_STOP
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_STOP,
    async (_event, params: StopParams): Promise<Result<void, AutoExecutionError>> => {
      logger.debug('[autoExecutionHandlers] AUTO_EXECUTION_STOP', { specPath: params.specPath });
      const result = await coordinator.stop(params.specPath);

      // Reset autoExecution.enabled in spec.json when stopped
      if (result.ok) {
        const updateResult = await disableAutoExecutionInSpecJson(params.specPath);
        if (!updateResult.ok) {
          logger.warn('[autoExecutionHandlers] Failed to update spec.json autoExecution.enabled', {
            specPath: params.specPath,
            error: updateResult.error,
          });
        }
      }

      return result;
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

  // AUTO_EXECUTION_RESET (E2E Test Support)
  // WARNING: This handler is intended for E2E tests only.
  ipcMain.handle(
    IPC_CHANNELS.AUTO_EXECUTION_RESET,
    async (): Promise<void> => {
      logger.info('[autoExecutionHandlers] AUTO_EXECUTION_RESET (E2E test support)');
      coordinator.resetAll();
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
  ipcMain.removeHandler(IPC_CHANNELS.AUTO_EXECUTION_RESET);

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
    logger.debug('[autoExecutionHandlers] state-changed event received', {
      specPath,
      status: state.status,
      currentPhase: state.currentPhase,
    });
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

    // Reset autoExecution.enabled in spec.json when execution completes
    disableAutoExecutionInSpecJson(specPath).then((result) => {
      if (!result.ok) {
        logger.warn('[autoExecutionHandlers] Failed to reset autoExecution.enabled on completion', {
          specPath,
          error: result.error,
        });
      } else {
        logger.info('[autoExecutionHandlers] Reset autoExecution.enabled on completion', { specPath });
      }
    });
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
