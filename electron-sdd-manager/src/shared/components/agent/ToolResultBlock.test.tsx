/**
 * ToolResultBlock tests
 * Task 5.3: Error state display and collapsible behavior tests
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolResultBlock } from './ToolResultBlock';

describe('ToolResultBlock', () => {
  describe('collapsible behavior (Requirements 3.1, 3.2)', () => {
    it('should be collapsed by default', () => {
      render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'File content here\nLine 2\nLine 3',
            isError: false,
          }}
        />
      );

      // Content should not be fully visible
      expect(screen.queryByTestId('tool-result-content')).not.toBeInTheDocument();
    });

    it('should expand on click to show full content', () => {
      const content = 'File content here\nLine 2\nLine 3';
      render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content,
            isError: false,
          }}
        />
      );

      // Click to expand
      fireEvent.click(screen.getByTestId('tool-result-block'));

      // Full content should be visible
      expect(screen.getByTestId('tool-result-content')).toBeInTheDocument();
      expect(screen.getByText(/File content here/)).toBeInTheDocument();
    });

    it('should collapse on second click', () => {
      render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'Some content',
            isError: false,
          }}
        />
      );

      const block = screen.getByTestId('tool-result-block');

      // Click to expand
      fireEvent.click(block);
      expect(screen.getByTestId('tool-result-content')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(block);
      expect(screen.queryByTestId('tool-result-content')).not.toBeInTheDocument();
    });

    it('should start expanded when defaultExpanded is true', () => {
      render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'Some content',
            isError: false,
          }}
          defaultExpanded={true}
        />
      );

      expect(screen.getByTestId('tool-result-content')).toBeInTheDocument();
    });
  });

  describe('error state display (Requirement 3.3)', () => {
    it('should show error styling for error results', () => {
      const { container } = render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'Error: File not found',
            isError: true,
          }}
        />
      );

      // Should have red/error styling
      const errorElement = container.querySelector('[class*="red"]');
      expect(errorElement).toBeInTheDocument();
    });

    it('should not show error styling for success results', () => {
      const { container } = render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'Success',
            isError: false,
          }}
        />
      );

      // Should have blue/normal styling, not red
      const block = screen.getByTestId('tool-result-block');
      expect(block.className).not.toMatch(/red-/);
    });
  });

  describe('result indicator (Requirement 3.4)', () => {
    it('should show indicator for results with content', () => {
      render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'Result content',
            isError: false,
          }}
        />
      );

      // Should have an indicator icon
      expect(screen.getByTestId('tool-result-indicator')).toBeInTheDocument();
    });

    it('should show error indicator for error results', () => {
      render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'Error message',
            isError: true,
          }}
        />
      );

      // Should have error indicator
      const indicator = screen.getByTestId('tool-result-indicator');
      expect(indicator).toBeInTheDocument();
    });

    it('should show placeholder for empty content', () => {
      render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: '',
            isError: false,
          }}
        />
      );

      // Should show "no result" placeholder
      expect(screen.getByText(/結果なし|No result/i)).toBeInTheDocument();
    });
  });

  describe('theme support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <ToolResultBlock
          toolResult={{
            toolUseId: 'tool-123',
            content: 'Content',
            isError: false,
          }}
        />
      );

      // Check for dark: prefix classes
      const element = container.querySelector('[class*="dark:"]');
      expect(element).toBeInTheDocument();
    });
  });
});
