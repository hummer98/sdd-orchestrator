/**
 * taskProgressParser
 *
 * Shared utility for parsing tasks.md content to calculate task progress.
 * Extracted from specDetailStore for DRY principle compliance.
 *
 * remote-ui-task-display Task 1.1: Create shared task progress parser
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

/**
 * Task progress information
 * Requirements: 1.2 - Return format with total, completed, percentage
 */
export interface TaskProgress {
  /** Total number of tasks (completed + pending) */
  total: number;
  /** Number of completed tasks */
  completed: number;
  /** Completion percentage (0-100), rounded to nearest integer */
  percentage: number;
}

/**
 * Parse tasks.md content to calculate task progress
 *
 * Parses markdown checkboxes (`- [x]` for completed, `- [ ]` for pending)
 * and returns progress statistics.
 *
 * @param content - tasks.md markdown content (null/undefined acceptable)
 * @returns TaskProgress with total, completed, percentage
 *
 * Requirements:
 * - 1.1: Parse checkboxes and count tasks
 * - 1.2: Return TaskProgress format
 * - 1.4: Return zero values for empty/null input
 *
 * Postconditions:
 * - percentage = total > 0 ? Math.round((completed / total) * 100) : 0
 * - total >= completed
 * - 0 <= percentage <= 100
 */
export function parseTaskProgress(content: string | null | undefined): TaskProgress {
  // Requirement 1.4: Return zero values for null/undefined/empty input
  if (!content) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  // Requirement 1.1: Parse markdown checkboxes
  // Case-insensitive match for completed tasks: - [x] or - [X]
  const completedMatches = content.match(/^- \[x\]/gim) || [];
  // Pending tasks: - [ ]
  const pendingMatches = content.match(/^- \[ \]/gm) || [];

  const completed = completedMatches.length;
  const total = completed + pendingMatches.length;

  // Requirement 1.2: Calculate percentage, rounded to nearest integer
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    percentage,
  };
}
