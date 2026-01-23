/**
 * SessionRecoveryService
 * Handles recovery of incomplete sessions after app crash/termination
 * Task 5.1, 5.2: Session temp file management and recovery
 * Requirements: 7.1, 7.2, 7.3
 */

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { logger } from './logger';
import { MetricsFileWriter, getDefaultMetricsFileWriter } from './metricsFileWriter';
import {
  SESSION_TEMP_FILE_PATH,
  IDLE_TIMEOUT_MS,
  type SessionTempData,
  type AiMetricRecord,
  type HumanMetricRecord,
} from '../types/metrics';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of session recovery operation
 */
export interface RecoveryResult {
  readonly aiSessionsRecovered: number;
  readonly humanSessionsRecovered: number;
}

// =============================================================================
// SessionRecoveryService
// =============================================================================

/**
 * Service for managing session state persistence and recovery
 * Requirements: 7.1, 7.2, 7.3
 */
export class SessionRecoveryService {
  private writer: MetricsFileWriter;

  constructor(writer?: MetricsFileWriter) {
    this.writer = writer ?? getDefaultMetricsFileWriter();
  }

  /**
   * Get the path to the session temp file
   *
   * @param projectPath - Project root path
   * @returns Full path to .metrics-session.tmp
   */
  getTempFilePath(projectPath: string): string {
    return join(projectPath, SESSION_TEMP_FILE_PATH);
  }

  // ===========================================================================
  // Task 5.1: Session temp file management
  // ===========================================================================

  /**
   * Save active session state to temp file
   * Called periodically and before app shutdown
   *
   * @param projectPath - Project root path
   * @param sessionData - Active session data to persist
   */
  async saveActiveSessionState(
    projectPath: string,
    sessionData: SessionTempData
  ): Promise<void> {
    const filePath = this.getTempFilePath(projectPath);

    try {
      // Ensure directory exists
      await mkdir(dirname(filePath), { recursive: true });

      // Write session state
      await writeFile(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');

      logger.debug('[SessionRecoveryService] Session state saved', {
        aiSessions: sessionData.activeAiSessions.length,
        hasHumanSession: !!sessionData.activeHumanSession,
      });
    } catch (error) {
      logger.error('[SessionRecoveryService] Failed to save session state', {
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load saved session state from temp file
   *
   * @param projectPath - Project root path
   * @returns Session data if exists, null otherwise
   */
  async loadActiveSessionState(projectPath: string): Promise<SessionTempData | null> {
    const filePath = this.getTempFilePath(projectPath);

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as SessionTempData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      logger.warn('[SessionRecoveryService] Failed to load session state', {
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  /**
   * Delete temp file
   *
   * @param projectPath - Project root path
   */
  async deleteTempFile(projectPath: string): Promise<void> {
    const filePath = this.getTempFilePath(projectPath);

    try {
      await unlink(filePath);
      logger.debug('[SessionRecoveryService] Temp file deleted', { path: filePath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('[SessionRecoveryService] Failed to delete temp file', {
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // ===========================================================================
  // Task 5.2 / Requirement 7.1, 7.2, 7.3: Session recovery
  // ===========================================================================

  /**
   * Recover incomplete sessions from temp file
   * Called on app startup
   *
   * Requirements:
   * - 7.1: Detect incomplete sessions
   * - 7.2: AI sessions use current time as end timestamp
   * - 7.3: Human sessions use lastActivity + 45s as end timestamp
   *
   * @param projectPath - Project root path
   * @returns Recovery result with counts
   */
  async recoverIncompleteSessions(projectPath: string): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      aiSessionsRecovered: 0,
      humanSessionsRecovered: 0,
    };

    // Load session state
    const sessionData = await this.loadActiveSessionState(projectPath);

    if (!sessionData) {
      logger.debug('[SessionRecoveryService] No session state to recover');
      return result;
    }

    const recoveryTime = new Date().toISOString();
    let aiRecovered = 0;
    let humanRecovered = 0;

    try {
      // Recover AI sessions (Requirement 7.2)
      for (const aiSession of sessionData.activeAiSessions) {
        try {
          const endTime = new Date(recoveryTime);
          const startTime = new Date(aiSession.start);
          const ms = endTime.getTime() - startTime.getTime();

          const record: AiMetricRecord = {
            type: 'ai',
            spec: aiSession.specId,
            phase: aiSession.phase,
            start: aiSession.start,
            end: recoveryTime,
            ms,
          };

          await this.writer.appendRecord(projectPath, record);
          aiRecovered++;

          logger.info('[SessionRecoveryService] AI session recovered', {
            specId: aiSession.specId,
            phase: aiSession.phase,
            ms,
          });
        } catch (error) {
          logger.error('[SessionRecoveryService] Failed to recover AI session', {
            specId: aiSession.specId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Recover human session (Requirement 7.3)
      if (sessionData.activeHumanSession) {
        const humanSession = sessionData.activeHumanSession;

        try {
          // Calculate end time: lastActivity + 45 seconds
          const lastActivityTime = new Date(humanSession.lastActivity);
          const endTime = new Date(lastActivityTime.getTime() + IDLE_TIMEOUT_MS);
          const startTime = new Date(humanSession.start);
          const ms = endTime.getTime() - startTime.getTime();

          const record: HumanMetricRecord = {
            type: 'human',
            spec: humanSession.specId,
            start: humanSession.start,
            end: endTime.toISOString(),
            ms,
          };

          await this.writer.appendRecord(projectPath, record);
          humanRecovered++;

          logger.info('[SessionRecoveryService] Human session recovered', {
            specId: humanSession.specId,
            ms,
          });
        } catch (error) {
          logger.error('[SessionRecoveryService] Failed to recover human session', {
            specId: humanSession.specId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Delete temp file after successful recovery
      await this.deleteTempFile(projectPath);
    } catch (error) {
      logger.error('[SessionRecoveryService] Recovery failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      aiSessionsRecovered: aiRecovered,
      humanSessionsRecovered: humanRecovered,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultSessionRecoveryService: SessionRecoveryService | null = null;

/**
 * Get the default SessionRecoveryService instance
 */
export function getDefaultSessionRecoveryService(): SessionRecoveryService {
  if (!defaultSessionRecoveryService) {
    defaultSessionRecoveryService = new SessionRecoveryService();
  }
  return defaultSessionRecoveryService;
}
