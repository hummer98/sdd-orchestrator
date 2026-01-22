/**
 * LogEntryBlock Component
 * Routes parsed log entries to appropriate display components
 *
 * Task 2.1: LogEntryBlockコンポーネントを作成
 * Requirements: 1.1, 1.2
 */

import React from 'react';
import type { ParsedLogEntry } from '@shared/utils/logFormatter';
import { SessionInfoBlock } from './SessionInfoBlock';
import { ToolUseBlock } from './ToolUseBlock';
import { ToolResultBlock } from './ToolResultBlock';
import { TextBlock } from './TextBlock';
import { ResultBlock } from './ResultBlock';

export interface LogEntryBlockProps {
  entry: ParsedLogEntry;
  /** Optional: Control default expanded state for collapsible blocks */
  defaultExpanded?: boolean;
}

export function LogEntryBlock({
  entry,
  defaultExpanded = false,
}: LogEntryBlockProps): React.ReactElement | null {
  switch (entry.type) {
    case 'system':
      // System type with session info shows SessionInfoBlock
      if (entry.session) {
        return <SessionInfoBlock session={entry.session} />;
      }
      // System without session - fallback to text if available
      if (entry.text) {
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} />;
      }
      return null;

    case 'tool_use':
      if (entry.tool) {
        return <ToolUseBlock tool={entry.tool} defaultExpanded={defaultExpanded} />;
      }
      return null;

    case 'tool_result':
      if (entry.toolResult) {
        return (
          <ToolResultBlock toolResult={entry.toolResult} defaultExpanded={defaultExpanded} />
        );
      }
      return null;

    case 'text':
    case 'assistant':
      if (entry.text) {
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} />;
      }
      return null;

    case 'result':
    case 'error':
      if (entry.result) {
        return <ResultBlock result={entry.result} />;
      }
      return null;

    case 'input':
      // User input - display as text block with user role
      if (entry.text) {
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} />;
      }
      return null;

    default:
      // Unknown type - try to display as text if available
      if (entry.text) {
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} />;
      }
      return null;
  }
}
