/**
 * LogEntryBlock tests
 * Task 5.5: Type-based routing tests
 * Requirements: 1.1
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogEntryBlock } from './LogEntryBlock';
import type { ParsedLogEntry } from '@shared/utils/logFormatter';

describe('LogEntryBlock', () => {
  describe('type routing', () => {
    it('should render SessionInfoBlock for system type with session', () => {
      const entry: ParsedLogEntry = {
        id: 'test-1',
        type: 'system',
        session: {
          cwd: '/path/to/project',
          model: 'claude-3-opus',
          version: '1.0.0',
        },
      };

      render(<LogEntryBlock entry={entry} />);

      expect(screen.getByText('/path/to/project')).toBeInTheDocument();
    });

    it('should render ToolUseBlock for tool_use type', () => {
      const entry: ParsedLogEntry = {
        id: 'test-2',
        type: 'tool_use',
        tool: {
          name: 'Read',
          toolUseId: 'tool-123',
          input: { file_path: '/path/to/file.ts' },
        },
      };

      render(<LogEntryBlock entry={entry} />);

      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('should render ToolResultBlock for tool_result type', () => {
      const entry: ParsedLogEntry = {
        id: 'test-3',
        type: 'tool_result',
        toolResult: {
          toolUseId: 'tool-123',
          content: 'File content here',
          isError: false,
        },
      };

      render(<LogEntryBlock entry={entry} />);

      // ToolResultBlock shows result indicator
      expect(screen.getByTestId('tool-result-block')).toBeInTheDocument();
    });

    it('should render TextBlock for text type', () => {
      const entry: ParsedLogEntry = {
        id: 'test-4',
        type: 'text',
        text: {
          content: 'This is assistant text',
          role: 'assistant',
        },
      };

      render(<LogEntryBlock entry={entry} />);

      expect(screen.getByText('This is assistant text')).toBeInTheDocument();
    });

    it('should render ResultBlock for result type', () => {
      const entry: ParsedLogEntry = {
        id: 'test-5',
        type: 'result',
        result: {
          content: 'Task completed successfully',
          isError: false,
          durationMs: 5000,
          costUsd: 0.01,
        },
      };

      render(<LogEntryBlock entry={entry} />);

      expect(screen.getByTestId('result-block')).toBeInTheDocument();
    });

    it('should render ResultBlock for error type', () => {
      const entry: ParsedLogEntry = {
        id: 'test-6',
        type: 'error',
        result: {
          content: 'Error occurred',
          isError: true,
        },
      };

      render(<LogEntryBlock entry={entry} />);

      expect(screen.getByTestId('result-block')).toBeInTheDocument();
    });

    it('should render TextBlock for unknown types', () => {
      const entry: ParsedLogEntry = {
        id: 'test-7',
        type: 'input' as ParsedLogEntry['type'],
        text: {
          content: 'User input',
          role: 'user',
        },
      };

      render(<LogEntryBlock entry={entry} />);

      expect(screen.getByText('User input')).toBeInTheDocument();
    });
  });

  describe('props forwarding', () => {
    it('should forward defaultExpanded to child components', () => {
      const entry: ParsedLogEntry = {
        id: 'test-8',
        type: 'tool_use',
        tool: {
          name: 'Bash',
          input: { command: 'npm run test', description: 'Run tests' },
        },
      };

      render(<LogEntryBlock entry={entry} defaultExpanded={true} />);

      // When defaultExpanded is true, tool details should be visible (shows JSON formatted input)
      expect(screen.getByText(/"command": "npm run test"/)).toBeInTheDocument();
    });
  });
});
