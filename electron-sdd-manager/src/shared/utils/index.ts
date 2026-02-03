/**
 * Shared utilities barrel export
 * Task 4.2: Re-export parser modules
 */

// logFormatter facade (Requirements: 2.2, 2.3)
export {
  parseLogData,
  getColorClass,
  type ParsedLogEntry,
  type ClaudeEvent,
  type ContentBlock,
} from './logFormatter';

// Parser types (Requirements: 1.3)
export type { LogStreamParser, DeltaAccumulator } from './parserTypes';

// Engine-specific parsers (Requirements: 1.1, 1.2)
export { claudeParser } from './claudeParser';
export { geminiParser } from './geminiParser';

export { throttle } from './throttle';

// Task progress parser (remote-ui-task-display: Requirements 1.1, 1.2, 1.3, 1.4)
export { parseTaskProgress, type TaskProgress } from './taskProgressParser';
