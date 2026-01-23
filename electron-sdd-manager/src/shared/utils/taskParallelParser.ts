/**
 * taskParallelParser
 * parallel-task-impl: Task 1.1, 1.2, 1.3
 *
 * Parses tasks.md content to detect (P) markers and group tasks for parallel execution.
 * Requirements: 2.1-2.5, 3.1-3.3
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a single task item from tasks.md
 * Requirements: 2.1, 2.2, 2.3
 */
export interface TaskItem {
  /** Task ID (e.g., "1.1", "2.3") */
  readonly id: string;
  /** Task title (without id and markers) */
  readonly title: string;
  /** Whether task has (P) parallel marker */
  readonly isParallel: boolean;
  /** Whether task is completed (checked) */
  readonly completed: boolean;
  /** Parent task ID for subtasks, null for top-level */
  readonly parentId: string | null;
}

/**
 * Represents a group of tasks that can be executed together
 * Requirements: 2.4, 2.5, 3.1, 3.2, 3.3
 */
export interface TaskGroup {
  /** Group index (0-based, order of appearance) */
  readonly groupIndex: number;
  /** Tasks in this group */
  readonly tasks: TaskItem[];
  /** Whether this group can be executed in parallel */
  readonly isParallel: boolean;
}

/**
 * Result of parsing tasks.md
 */
export interface ParseResult {
  /** Grouped tasks */
  readonly groups: TaskGroup[];
  /** Total number of tasks */
  readonly totalTasks: number;
  /** Number of tasks with (P) marker */
  readonly parallelTasks: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Regex to match task lines with checkboxes
 * Captures: indentation, completion status, task content
 * Examples:
 *   - [ ] 1.1 (P) Task title
 *   - [x] 2.3 Completed task
 *     - [ ] 2.3.1 Subtask
 */
const TASK_LINE_REGEX = /^(\s*)-\s*\[([ xX])\]\s*(.+)$/;

/**
 * Regex to extract task ID from content
 * Matches: 1, 1.1, 10.2.3, etc.
 * Also handles "4." format (trailing dot)
 */
const TASK_ID_REGEX = /^(\d+(?:\.\d+)*\.?)\s+/;

/**
 * Regex to detect (P) parallel marker
 */
const PARALLEL_MARKER_REGEX = /\(P\)/;

// =============================================================================
// Parser Implementation
// =============================================================================

/**
 * Parse a single task line and extract task information
 */
function parseTaskLine(line: string): TaskItem | null {
  const match = line.match(TASK_LINE_REGEX);
  if (!match) {
    return null;
  }

  const [, , completionMark, content] = match;
  const completed = completionMark.toLowerCase() === 'x';

  // Extract task ID
  const idMatch = content.match(TASK_ID_REGEX);
  if (!idMatch) {
    return null;
  }

  // Normalize ID (remove trailing dot if present)
  let id = idMatch[1];
  if (id.endsWith('.')) {
    id = id.slice(0, -1);
  }

  // Get remaining content after ID
  let titleContent = content.slice(idMatch[0].length);

  // Check for (P) marker
  const isParallel = PARALLEL_MARKER_REGEX.test(titleContent);

  // Remove (P) marker from title
  const title = titleContent
    .replace(PARALLEL_MARKER_REGEX, '')
    .trim()
    // Remove any double spaces left after removing (P)
    .replace(/\s+/g, ' ');

  // Determine parent ID
  const idParts = id.split('.');
  const parentId = idParts.length > 1 ? idParts.slice(0, -1).join('.') : null;

  return {
    id,
    title,
    isParallel,
    completed,
    parentId,
  };
}

/**
 * Group tasks based on (P) marker continuity
 * Requirements: 2.4, 2.5, 3.1, 3.2, 3.3
 *
 * Rules:
 * - Consecutive (P) tasks form a single parallel group
 * - Non-(P) tasks form standalone sequential groups
 * - Group order follows tasks.md order
 */
function groupTasks(tasks: TaskItem[]): TaskGroup[] {
  if (tasks.length === 0) {
    return [];
  }

  const groups: TaskGroup[] = [];
  let currentGroup: TaskItem[] = [];
  let currentIsParallel: boolean | null = null;

  for (const task of tasks) {
    if (task.isParallel) {
      // Parallel task
      if (currentIsParallel === true) {
        // Continue the current parallel group
        currentGroup.push(task);
      } else {
        // Start a new parallel group
        if (currentGroup.length > 0) {
          // Flush previous group
          groups.push({
            groupIndex: groups.length,
            tasks: currentGroup,
            isParallel: currentIsParallel === true,
          });
        }
        currentGroup = [task];
        currentIsParallel = true;
      }
    } else {
      // Non-parallel task - always a standalone group
      if (currentGroup.length > 0) {
        // Flush previous group
        groups.push({
          groupIndex: groups.length,
          tasks: currentGroup,
          isParallel: currentIsParallel === true,
        });
      }
      // Create standalone group for this task
      groups.push({
        groupIndex: groups.length,
        tasks: [task],
        isParallel: false,
      });
      currentGroup = [];
      currentIsParallel = null;
    }
  }

  // Flush any remaining group
  if (currentGroup.length > 0) {
    groups.push({
      groupIndex: groups.length,
      tasks: currentGroup,
      isParallel: currentIsParallel === true,
    });
  }

  return groups;
}

/**
 * Parse tasks.md content and return grouped tasks
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3
 *
 * @param tasksContent - Raw content of tasks.md file
 * @returns ParseResult with grouped tasks and statistics
 */
export function parseTasksContent(tasksContent: string): ParseResult {
  if (!tasksContent || tasksContent.trim() === '') {
    return {
      groups: [],
      totalTasks: 0,
      parallelTasks: 0,
    };
  }

  const lines = tasksContent.split('\n');
  const tasks: TaskItem[] = [];

  for (const line of lines) {
    const task = parseTaskLine(line);
    if (task) {
      tasks.push(task);
    }
  }

  const groups = groupTasks(tasks);
  const parallelTasks = tasks.filter((t) => t.isParallel).length;

  return {
    groups,
    totalTasks: tasks.length,
    parallelTasks,
  };
}
