/**
 * MermaidCodeRenderer Integration Tests
 *
 * Task 5.2: MermaidCodeRendererの統合テストを実装する
 * Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 4.2
 *
 * Tests:
 * - Mermaid code blocks render as SVG
 * - Non-mermaid code blocks pass through unchanged
 * - Error states show error message and raw code
 * - Multiple mermaid blocks render correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MermaidCodeRenderer } from './MermaidCodeRenderer';

// Mock the mermaidService
vi.mock('@shared/services/mermaidService', () => ({
  mermaidService: {
    render: vi.fn(),
  },
}));

import { mermaidService } from '@shared/services/mermaidService';

const mockMermaidService = mermaidService as unknown as {
  render: ReturnType<typeof vi.fn>;
};

describe('MermaidCodeRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mermaid code detection', () => {
    it('should render mermaid SVG for language-mermaid className', async () => {
      const mermaidCode = 'graph TD\n    A --> B';
      const expectedSvg = '<svg id="mermaid-test">rendered diagram</svg>';

      mockMermaidService.render.mockResolvedValue({
        success: true,
        svg: expectedSvg,
      });

      render(
        <MermaidCodeRenderer className="language-mermaid">
          {mermaidCode}
        </MermaidCodeRenderer>
      );

      // Should show loading initially
      expect(screen.getByTestId('mermaid-loading')).toBeInTheDocument();

      // Wait for SVG to render
      await waitFor(() => {
        expect(screen.getByTestId('mermaid-diagram')).toBeInTheDocument();
      });

      // Should contain the SVG
      const diagram = screen.getByTestId('mermaid-diagram');
      expect(diagram.innerHTML).toContain('<svg');

      // Service should be called with correct parameters
      expect(mockMermaidService.render).toHaveBeenCalledWith(
        mermaidCode,
        expect.stringMatching(/^mermaid-\d+$/),
        expect.any(Boolean)
      );
    });

    it('should pass through non-mermaid code unchanged', () => {
      render(
        <MermaidCodeRenderer className="language-javascript">
          {'const x = 1;'}
        </MermaidCodeRenderer>
      );

      // Should render as regular code element
      const codeElement = screen.getByTestId('code-block');
      expect(codeElement.tagName).toBe('CODE');
      expect(codeElement).toHaveTextContent('const x = 1;');

      // Should not call mermaid service
      expect(mockMermaidService.render).not.toHaveBeenCalled();
    });

    it('should pass through code without className unchanged', () => {
      render(
        <MermaidCodeRenderer>
          {'plain text'}
        </MermaidCodeRenderer>
      );

      const codeElement = screen.getByTestId('code-block');
      expect(codeElement.tagName).toBe('CODE');
      expect(codeElement).toHaveTextContent('plain text');
    });
  });

  describe('error handling', () => {
    it('should show error message and raw code on syntax error', async () => {
      const invalidCode = 'invalid mermaid';
      const errorMessage = 'Syntax error at line 1';

      mockMermaidService.render.mockResolvedValue({
        success: false,
        error: errorMessage,
        rawCode: invalidCode,
      });

      render(
        <MermaidCodeRenderer className="language-mermaid">
          {invalidCode}
        </MermaidCodeRenderer>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('mermaid-error')).toBeInTheDocument();
      });

      // Should show error message
      expect(screen.getByTestId('mermaid-error-message')).toHaveTextContent(errorMessage);

      // Should show raw code
      const rawCodeElement = screen.getByTestId('mermaid-raw-code');
      expect(rawCodeElement).toBeInTheDocument();
      expect(rawCodeElement).toHaveTextContent(invalidCode);
    });

    it('should not affect other content when mermaid render fails', async () => {
      // Test that error is contained within the component
      mockMermaidService.render.mockResolvedValue({
        success: false,
        error: 'Error',
        rawCode: 'broken',
      });

      const { container } = render(
        <div>
          <p>Before</p>
          <MermaidCodeRenderer className="language-mermaid">
            {'broken'}
          </MermaidCodeRenderer>
          <p>After</p>
        </div>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-error')).toBeInTheDocument();
      });

      // Surrounding content should still exist
      expect(container).toHaveTextContent('Before');
      expect(container).toHaveTextContent('After');
    });
  });

  describe('multiple mermaid blocks', () => {
    it('should render multiple mermaid blocks with unique IDs', async () => {
      mockMermaidService.render
        .mockResolvedValueOnce({ success: true, svg: '<svg id="diagram-1">first</svg>' })
        .mockResolvedValueOnce({ success: true, svg: '<svg id="diagram-2">second</svg>' });

      render(
        <div>
          <MermaidCodeRenderer className="language-mermaid">
            {'graph TD\n    A --> B'}
          </MermaidCodeRenderer>
          <MermaidCodeRenderer className="language-mermaid">
            {'sequenceDiagram\n    A->>B: Hello'}
          </MermaidCodeRenderer>
        </div>
      );

      // Wait for both to render
      await waitFor(() => {
        const diagrams = screen.getAllByTestId('mermaid-diagram');
        expect(diagrams).toHaveLength(2);
      });

      // Each should have been called with a unique ID
      expect(mockMermaidService.render).toHaveBeenCalledTimes(2);
      const calls = mockMermaidService.render.mock.calls;
      expect(calls[0][1]).not.toBe(calls[1][1]); // IDs should be different
    });
  });

  describe('loading state', () => {
    it('should show loading indicator while rendering', async () => {
      // Make render hang to test loading state
      mockMermaidService.render.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, svg: '<svg></svg>' }), 100))
      );

      render(
        <MermaidCodeRenderer className="language-mermaid">
          {'graph TD\n    A --> B'}
        </MermaidCodeRenderer>
      );

      // Should show loading
      expect(screen.getByTestId('mermaid-loading')).toBeInTheDocument();

      // Wait for render to complete
      await waitFor(() => {
        expect(screen.getByTestId('mermaid-diagram')).toBeInTheDocument();
      });
    });
  });
});
