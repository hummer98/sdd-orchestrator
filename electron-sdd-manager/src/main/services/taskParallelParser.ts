/**
 * taskParallelParser
 * parallel-task-impl: Task 1.1, 1.2, 1.3
 *
 * Re-export from shared utils for backward compatibility.
 * The actual implementation is now in @shared/utils/taskParallelParser.ts
 * to enable use in both Electron and Remote UI.
 */

export {
  parseTasksContent,
  type TaskItem,
  type TaskGroup,
  type ParseResult,
} from '../../shared/utils/taskParallelParser';
