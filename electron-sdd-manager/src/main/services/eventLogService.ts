/**
 * EventLogService
 * Manages Spec-level event logging for activity tracking
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.4
 *
 * Design Decisions:
 * - DD-003: JSON Lines format for append-only operations
 * - DD-005: Fire-and-forget error handling (non-blocking)
 */

import { appendFile, readFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { logger } from './logger';
import type {
  EventLogEntry,
  EventLogInput,
  EventLogError,
} from '../../shared/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Result type for operations that may fail
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// =============================================================================
// EventLogService
// =============================================================================

/**
 * EventLogService
 * Provides centralized event logging for Spec workflows
 * Requirements: 6.1, 6.2
 */
export class EventLogService {
  /**
   * Events file name
   */
  private static readonly EVENTS_FILE = 'events.jsonl';

  /**
   * Get the path to the events file for a spec
   * Requirements: 2.1
   *
   * @param projectPath - Project root path
   * @param specId - Spec identifier
   * @returns Path to the events.jsonl file
   */
  getEventsFilePath(projectPath: string, specId: string): string {
    return join(projectPath, '.kiro', 'specs', specId, EventLogService.EVENTS_FILE);
  }

  /**
   * Get the path to the events file for a bug
   *
   * @param projectPath - Project root path
   * @param bugName - Bug name
   * @returns Path to the events.jsonl file
   */
  getBugEventsFilePath(projectPath: string, bugName: string): string {
    return join(projectPath, '.kiro', 'bugs', bugName, EventLogService.EVENTS_FILE);
  }

  /**
   * Log an event to the spec's event log file
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.4
   *
   * This method is fire-and-forget: errors are logged internally
   * but do not propagate to the caller.
   *
   * @param projectPath - Project root path
   * @param specId - Spec identifier
   * @param event - Event data (without timestamp)
   */
  async logEvent(
    projectPath: string,
    specId: string,
    event: EventLogInput
  ): Promise<void> {
    try {
      const eventsPath = this.getEventsFilePath(projectPath, specId);

      // Ensure directory exists (Requirement 2.6)
      await mkdir(dirname(eventsPath), { recursive: true });

      // Build full event with timestamp (Requirement 2.3)
      const fullEvent: EventLogEntry = {
        ...event,
        timestamp: new Date().toISOString(),
      } as EventLogEntry;

      // Append as JSON Line (Requirement 2.2)
      const jsonLine = JSON.stringify(fullEvent) + '\n';
      await appendFile(eventsPath, jsonLine, 'utf-8');

      logger.debug('[EventLogService] Event logged', {
        specId,
        type: event.type,
        message: event.message,
      });
    } catch (error) {
      // Requirement 6.4: Errors should not affect the caller
      logger.error('[EventLogService] Failed to log event', {
        specId,
        type: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Log an event to the bug's event log file
   *
   * This method is fire-and-forget: errors are logged internally
   * but do not propagate to the caller.
   *
   * @param projectPath - Project root path
   * @param bugName - Bug name
   * @param event - Event data (without timestamp)
   */
  async logBugEvent(
    projectPath: string,
    bugName: string,
    event: EventLogInput
  ): Promise<void> {
    try {
      const eventsPath = this.getBugEventsFilePath(projectPath, bugName);

      // Ensure directory exists
      await mkdir(dirname(eventsPath), { recursive: true });

      // Build full event with timestamp
      const fullEvent: EventLogEntry = {
        ...event,
        timestamp: new Date().toISOString(),
      } as EventLogEntry;

      // Append as JSON Line
      const jsonLine = JSON.stringify(fullEvent) + '\n';
      await appendFile(eventsPath, jsonLine, 'utf-8');

      logger.debug('[EventLogService] Bug event logged', {
        bugName,
        type: event.type,
        message: event.message,
      });
    } catch (error) {
      // Errors should not affect the caller
      logger.error('[EventLogService] Failed to log bug event', {
        bugName,
        type: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Read all events for a spec
   * Requirements: 6.2
   *
   * @param projectPath - Project root path
   * @param specId - Spec identifier
   * @returns Array of events in reverse chronological order (newest first)
   */
  async readEvents(
    projectPath: string,
    specId: string
  ): Promise<Result<EventLogEntry[], EventLogError>> {
    const eventsPath = this.getEventsFilePath(projectPath, specId);

    try {
      const content = await readFile(eventsPath, 'utf-8');

      if (!content.trim()) {
        return { ok: true, value: [] };
      }

      const events: EventLogEntry[] = [];
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const event = JSON.parse(line) as EventLogEntry;
          events.push(event);
        } catch (parseError) {
          // Skip invalid lines but log warning
          logger.warn('[EventLogService] Skipping invalid JSON line', {
            specId,
            line: i + 1,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
        }
      }

      // Sort by timestamp descending (newest first)
      events.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      return { ok: true, value: events };
    } catch (error) {
      // Handle file not found - return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ok: true, value: [] };
      }

      // Other errors
      logger.error('[EventLogService] Failed to read events', {
        specId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        ok: false,
        error: {
          type: 'IO_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultEventLogService: EventLogService | null = null;

/**
 * Get the default EventLogService instance
 */
export function getDefaultEventLogService(): EventLogService {
  if (!defaultEventLogService) {
    defaultEventLogService = new EventLogService();
  }
  return defaultEventLogService;
}
