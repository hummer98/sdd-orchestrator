/**
 * ProcessUtils - OS-level process operations utility
 * Requirements: 4.2, 4.3, 4.4
 *
 * Provides cross-platform process management utilities including:
 * - Process liveness checking
 * - Process start time retrieval (macOS/Linux)
 * - Process identity verification
 */

import { execSync } from 'child_process';

/**
 * Utility class for process operations
 */
export class ProcessUtils {
  /**
   * Check if a process is alive
   * Requirement: 4.4
   * @param pid - Process ID
   * @returns true if process exists, false otherwise
   */
  checkProcessAlive(pid: number): boolean {
    if (pid <= 0) {
      return false;
    }

    try {
      // Sending signal 0 doesn't actually send a signal,
      // but it does check if the process exists and we have permission
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get process start time from OS
   * Requirement: 4.2, 4.3
   *
   * Uses `ps -p PID -o lstart` to get OS-level process start time.
   * This is used to verify process identity across app restarts.
   *
   * @param pid - Process ID
   * @returns Start time string or null if process doesn't exist or command fails
   */
  getProcessStartTime(pid: number): string | null {
    if (pid <= 0) {
      return null;
    }

    if (!this.checkProcessAlive(pid)) {
      return null;
    }

    try {
      // Execute ps command to get process start time
      // -p: process ID
      // -o lstart: output format "long start" (e.g., "Thu Jan 28 03:10:00 2026")
      const output = execSync(`ps -p ${pid} -o lstart=`, {
        encoding: 'utf-8',
        timeout: 5000,
      });

      const startTime = output.trim();

      if (!startTime || startTime.length === 0) {
        return null;
      }

      return startTime;
    } catch {
      // Command failed - process might not exist or ps command unavailable
      return null;
    }
  }

  /**
   * Check if a process is the same as recorded
   * Requirement: 4.4
   *
   * Verifies process identity by comparing PID + start time.
   * This prevents false positives from PID reuse.
   *
   * @param pid - Process ID
   * @param recordedStartTime - Previously recorded start time
   * @returns true if process exists and start time matches
   */
  isSameProcess(pid: number, recordedStartTime: string): boolean {
    if (!recordedStartTime || recordedStartTime.trim().length === 0) {
      return false;
    }

    const currentStartTime = this.getProcessStartTime(pid);

    if (!currentStartTime) {
      return false;
    }

    return currentStartTime === recordedStartTime;
  }
}

// Factory function for convenience
let defaultInstance: ProcessUtils | null = null;

export function getProcessUtils(): ProcessUtils {
  if (!defaultInstance) {
    defaultInstance = new ProcessUtils();
  }
  return defaultInstance;
}
