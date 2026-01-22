/**
 * ToolUseBlock tests
 * Task 5.2: Collapsible state toggle and tool-specific display tests
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolUseBlock } from './ToolUseBlock';

describe('ToolUseBlock', () => {
  describe('collapsible behavior', () => {
    it('should be collapsed by default', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Read',
            input: { file_path: '/path/to/file.ts' },
          }}
        />
      );

      // Tool name should be visible
      expect(screen.getByText('Read')).toBeInTheDocument();

      // Details (input JSON) should not be visible by default
      expect(screen.queryByTestId('tool-use-details')).not.toBeInTheDocument();
    });

    it('should expand on click', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Bash',
            input: { command: 'npm run test', description: 'Run tests' },
          }}
        />
      );

      // Click to expand
      fireEvent.click(screen.getByTestId('tool-use-header'));

      // Details should now be visible (shows JSON formatted input)
      expect(screen.getByTestId('tool-use-details')).toBeInTheDocument();
      expect(screen.getByText(/"command": "npm run test"/)).toBeInTheDocument();
    });

    it('should collapse on second click', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Bash',
            input: { command: 'npm run test' },
          }}
        />
      );

      const header = screen.getByTestId('tool-use-header');

      // Click to expand
      fireEvent.click(header);
      expect(screen.getByTestId('tool-use-details')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(header);
      expect(screen.queryByTestId('tool-use-details')).not.toBeInTheDocument();
    });

    it('should start expanded when defaultExpanded is true', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Read',
            input: { file_path: '/path/to/file.ts' },
          }}
          defaultExpanded={true}
        />
      );

      expect(screen.getByTestId('tool-use-details')).toBeInTheDocument();
    });
  });

  describe('tool-specific display (Requirements 2.3, 2.4)', () => {
    it('should show file path for Read tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Read',
            input: { file_path: '/path/to/file.ts' },
          }}
        />
      );

      expect(screen.getByText('/path/to/file.ts')).toBeInTheDocument();
    });

    it('should show file path for Write tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Write',
            input: { file_path: '/path/to/new-file.ts', content: 'file content' },
          }}
        />
      );

      expect(screen.getByText('/path/to/new-file.ts')).toBeInTheDocument();
    });

    it('should show file path for Edit tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Edit',
            input: { file_path: '/path/to/file.ts', old_string: 'old', new_string: 'new' },
          }}
        />
      );

      expect(screen.getByText('/path/to/file.ts')).toBeInTheDocument();
    });

    it('should show description for Bash tool when available', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Bash',
            input: { command: 'npm run build', description: 'Build the project' },
          }}
        />
      );

      expect(screen.getByText('Build the project')).toBeInTheDocument();
    });

    it('should show command summary for Bash tool without description', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Bash',
            input: { command: 'npm run test' },
          }}
        />
      );

      expect(screen.getByText(/npm run test/)).toBeInTheDocument();
    });

    it('should show pattern for Grep tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Grep',
            input: { pattern: 'TODO', path: '/src' },
          }}
        />
      );

      expect(screen.getByText('TODO')).toBeInTheDocument();
    });

    it('should show pattern for Glob tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Glob',
            input: { pattern: '**/*.ts' },
          }}
        />
      );

      expect(screen.getByText('**/*.ts')).toBeInTheDocument();
    });

    it('should show subagent_type and description for Task tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Task',
            input: { description: 'Review changes', subagent_type: 'code-review' },
          }}
        />
      );

      expect(screen.getByText(/code-review/)).toBeInTheDocument();
      expect(screen.getByText(/Review changes/)).toBeInTheDocument();
    });
  });

  describe('Lucide icons (Requirement 2.5)', () => {
    it('should render FileText icon for Read tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Read',
            input: { file_path: '/path/to/file.ts' },
          }}
        />
      );

      // Icon should be rendered (check for SVG element)
      expect(screen.getByTestId('tool-icon')).toBeInTheDocument();
    });

    it('should render Terminal icon for Bash tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Bash',
            input: { command: 'ls -la' },
          }}
        />
      );

      expect(screen.getByTestId('tool-icon')).toBeInTheDocument();
    });

    it('should render Search icon for Grep tool', () => {
      render(
        <ToolUseBlock
          tool={{
            name: 'Grep',
            input: { pattern: 'test' },
          }}
        />
      );

      expect(screen.getByTestId('tool-icon')).toBeInTheDocument();
    });
  });

  describe('theme support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <ToolUseBlock
          tool={{
            name: 'Read',
            input: { file_path: '/path/to/file.ts' },
          }}
        />
      );

      // Check for dark: prefix classes
      const element = container.querySelector('[class*="dark:"]');
      expect(element).toBeInTheDocument();
    });
  });
});
