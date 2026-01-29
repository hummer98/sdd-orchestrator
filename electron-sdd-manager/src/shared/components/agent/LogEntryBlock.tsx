/**
 * LogEntryBlock Component
 * Routes parsed log entries to appropriate display components
 *
 * Task 2.1: LogEntryBlockコンポーネントを作成
 * llm-stream-log-parser Task 7.2: Pass engineId to TextBlock for dynamic labels
 * Requirements: 1.1, 1.2, 4.1, 4.2
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
  // llm-stream-log-parser Task 7.2: Extract engineId from entry for propagation
  const { engineId } = entry;

  // Render the appropriate block based on entry type
  const renderBlock = (): React.ReactElement | null => {
    switch (entry.type) {
    case 'system':
      // System type with session info shows SessionInfoBlock
      if (entry.session) {
        return <SessionInfoBlock session={entry.session} engineId={engineId} />;
      }
      // System without session - fallback to text if available
      if (entry.text) {
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} engineId={engineId} />;
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
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} engineId={engineId} />;
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
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} engineId={engineId} />;
      }
      return null;

    default:
      // Unknown type - try to display as text if available
      if (entry.text) {
        return <TextBlock text={entry.text} defaultExpanded={defaultExpanded} engineId={engineId} />;
      }
      return null;
    }
  };

  const block = renderBlock();
  if (!block) return null;

  // Wrap in a div with data-testid for E2E testing
  return (
    <div data-testid="log-entry" data-log-type={entry.type}>
      {block}
    </div>
  );
}
