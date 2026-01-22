/**
 * TextBlock tests
 * Task 5.4: Line count judgment and fold threshold tests
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextBlock } from './TextBlock';

describe('TextBlock', () => {
  describe('line count judgment (Requirements 4.1, 4.2)', () => {
    it('should show full content when less than 10 lines', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
        />
      );

      // All content should be visible
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
      expect(screen.getByText(/Line 3/)).toBeInTheDocument();

      // Should not have expand button
      expect(screen.queryByTestId('text-expand-button')).not.toBeInTheDocument();
    });

    it('should be collapsed by default when 10 or more lines', () => {
      const lines = Array.from({ length: 15 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');

      render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
        />
      );

      // Should have expand button
      expect(screen.getByTestId('text-expand-button')).toBeInTheDocument();

      // Full content should not be visible (truncated)
      expect(screen.queryByText('Line 15')).not.toBeInTheDocument();
    });

    it('should expand on click when collapsed', () => {
      const lines = Array.from({ length: 15 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');

      render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
        />
      );

      // Click to expand
      fireEvent.click(screen.getByTestId('text-expand-button'));

      // All content should now be visible
      expect(screen.getByText(/Line 15/)).toBeInTheDocument();
    });

    it('should collapse on second click', () => {
      const lines = Array.from({ length: 15 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');

      render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
        />
      );

      const button = screen.getByTestId('text-expand-button');

      // Click to expand
      fireEvent.click(button);
      expect(screen.getByText(/Line 15/)).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(button);
      expect(screen.queryByText('Line 15')).not.toBeInTheDocument();
    });
  });

  describe('fold threshold customization', () => {
    it('should respect custom foldThreshold', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

      // With foldThreshold of 3, should be collapsed
      render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
          foldThreshold={3}
        />
      );

      expect(screen.getByTestId('text-expand-button')).toBeInTheDocument();
    });

    it('should not collapse when below custom threshold', () => {
      const content = 'Line 1\nLine 2';

      render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
          foldThreshold={3}
        />
      );

      expect(screen.queryByTestId('text-expand-button')).not.toBeInTheDocument();
    });
  });

  describe('defaultExpanded prop', () => {
    it('should start expanded when defaultExpanded is true', () => {
      const lines = Array.from({ length: 15 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');

      render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
          defaultExpanded={true}
        />
      );

      // All content should be visible even though > 10 lines
      expect(screen.getByText(/Line 15/)).toBeInTheDocument();
    });
  });

  describe('whitespace preservation (Requirement 4.4)', () => {
    it('should preserve whitespace in content', () => {
      const content = '  indented text\n    more indented';

      const { container } = render(
        <TextBlock
          text={{
            content,
            role: 'assistant',
          }}
        />
      );

      // Should have whitespace-pre-wrap class
      const element = container.querySelector('[class*="whitespace-pre-wrap"]');
      expect(element).toBeInTheDocument();
    });
  });

  describe('role display', () => {
    it('should show assistant indicator for assistant role', () => {
      render(
        <TextBlock
          text={{
            content: 'Assistant message',
            role: 'assistant',
          }}
        />
      );

      expect(screen.getByTestId('text-block')).toBeInTheDocument();
    });

    it('should show user indicator for user role', () => {
      render(
        <TextBlock
          text={{
            content: 'User message',
            role: 'user',
          }}
        />
      );

      expect(screen.getByTestId('text-block')).toBeInTheDocument();
    });
  });

  describe('empty content handling', () => {
    it('should not render for empty content', () => {
      const { container } = render(
        <TextBlock
          text={{
            content: '',
            role: 'assistant',
          }}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('theme support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <TextBlock
          text={{
            content: 'Some content',
            role: 'assistant',
          }}
        />
      );

      // Check for dark: prefix classes
      const element = container.querySelector('[class*="dark:"]');
      expect(element).toBeInTheDocument();
    });
  });
});
