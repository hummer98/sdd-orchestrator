/**
 * LogAnalyzer Service
 * agent-stale-recovery: Task 2.1 - Log analysis for recovery action determination
 * Requirements: 3.1, 3.2, 3.3, 3.4
 *
 * Analyzes agent log files to determine appropriate recovery action:
 * - 'complete': Log shows successful completion
 * - 'resume': Log stopped mid-execution (interrupted state)
 * - 'fail': Log shows error termination
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Recovery action types
 * agent-stale-recovery: Task 13.1 - RecoveryAction type definition
 * Requirements: 3.1, 4.1
 */
export type RecoveryAction = 'complete' | 'resume' | 'fail';

/**
 * Log entry format (JSONL)
 */
export interface LogEntry {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  data: string;
}

/**
 * LogAnalyzer Service
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export class LogAnalyzer {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get log file path for an agent
   * @param specId - Spec ID (entityId)
   * @param agentId - Agent ID
   * @returns Log file path
   */
  private getLogFilePath(specId: string, agentId: string): string {
    return path.join(this.basePath, '.kiro', 'runtime', 'agents', specId, 'logs', `${agentId}.log`);
  }

  /**
   * Analyze agent log and determine recovery action
   * Requirements: 3.1, 3.2, 3.3, 3.4
   *
   * @param specId - Spec ID (entityId)
   * @param agentId - Agent ID
   * @returns Recovery action type
   */
  async analyzeLog(specId: string, agentId: string): Promise<RecoveryAction> {
    const logPath = this.getLogFilePath(specId, agentId);

    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const logEntries = this.parseLogEntries(content);

      // Check for completion pattern
      if (this.detectCompletion(logEntries)) {
        return 'complete';
      }

      // Check for error pattern in last line
      if (this.detectError(logEntries)) {
        return 'fail';
      }

      // Default: log stopped mid-execution (interrupted state)
      return 'resume';
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Log file doesn't exist - treat as interrupted state
        // Requirements: 3.1
        return 'resume';
      }
      throw error;
    }
  }

  /**
   * Parse JSONL log content into log entries
   * @param content - JSONL content
   * @returns Array of log entries
   */
  private parseLogEntries(content: string): LogEntry[] {
    const lines = content.trim().split('\n');
    const entries: LogEntry[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line) as LogEntry;
        entries.push(entry);
      } catch {
        // Skip invalid JSON lines
      }
    }

    return entries;
  }

  /**
   * Detect completion pattern in log entries
   * Requirements: 3.2
   *
   * Ported from specsWatcherService completion detection logic.
   * Completion patterns:
   * - "Task Execution Summary"
   * - "Tasks Executed"
   * - Other completion indicators from auto-execution
   *
   * @param logEntries - Array of log entries
   * @returns true if completion pattern detected
   */
  detectCompletion(logEntries: LogEntry[]): boolean {
    for (const entry of logEntries) {
      const data = entry.data.toLowerCase();

      // Check for completion patterns (case-insensitive)
      if (
        data.includes('task execution summary') ||
        data.includes('tasks executed') ||
        data.includes('実行されたタスク') ||  // Japanese variant
        data.includes('タスク実行サマリー')    // Japanese variant
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect error pattern in log entries
   * Requirements: 3.3
   *
   * Checks if the last line contains error keywords:
   * - "error"
   * - "failed"
   *
   * @param logEntries - Array of log entries
   * @returns true if error pattern detected in last line
   */
  detectError(logEntries: LogEntry[]): boolean {
    if (logEntries.length === 0) {
      return false;
    }

    const lastEntry = logEntries[logEntries.length - 1];
    const lastLine = lastEntry.data.toLowerCase();

    return lastLine.includes('error') || lastLine.includes('failed');
  }
}
