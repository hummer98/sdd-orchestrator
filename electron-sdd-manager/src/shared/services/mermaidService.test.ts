/**
 * MermaidService Unit Tests
 *
 * Task 5.1: MermaidServiceのユニットテストを実装する
 * Requirements: 1.1, 1.2, 2.1
 *
 * Tests:
 * - render() returns SVG for valid mermaid code (mocked)
 * - render() returns error for invalid syntax
 * - render() respects darkMode flag for initialization
 * - render() handles empty code
 *
 * Note: Real mermaid rendering is tested in integration tests (MermaidCodeRenderer.test.tsx)
 * because mermaid.render() requires a real browser environment with full SVG support.
 * These unit tests mock the mermaid library to test the service wrapper logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mermaid before importing the service
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import { MermaidService } from './mermaidService';
import mermaid from 'mermaid';

describe('MermaidService', () => {
  let service: MermaidService;
  const mockMermaid = mermaid as unknown as {
    initialize: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MermaidService();
  });

  describe('render', () => {
    it('should return SVG for valid flowchart code', async () => {
      const code = `graph TD
    A[Start] --> B[End]`;
      const expectedSvg = '<svg id="test-id-1">flowchart content</svg>';

      mockMermaid.render.mockResolvedValue({ svg: expectedSvg });

      const result = await service.render(code, 'test-id-1', false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.svg).toBe(expectedSvg);
        expect(result.svg).toContain('<svg');
      }

      expect(mockMermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          startOnLoad: false,
          theme: 'default',
        })
      );
      expect(mockMermaid.render).toHaveBeenCalledWith('test-id-1', code);
    });

    it('should return SVG for valid sequence diagram', async () => {
      const code = `sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice`;
      const expectedSvg = '<svg id="test-id-2">sequence diagram</svg>';

      mockMermaid.render.mockResolvedValue({ svg: expectedSvg });

      const result = await service.render(code, 'test-id-2', false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.svg).toContain('<svg');
      }
    });

    it('should return SVG for valid state diagram', async () => {
      const code = `stateDiagram-v2
    [*] --> Active
    Active --> [*]`;
      const expectedSvg = '<svg id="test-id-3">state diagram</svg>';

      mockMermaid.render.mockResolvedValue({ svg: expectedSvg });

      const result = await service.render(code, 'test-id-3', false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.svg).toContain('<svg');
      }
    });

    it('should return SVG for valid ER diagram', async () => {
      const code = `erDiagram
    CUSTOMER ||--o{ ORDER : places`;
      const expectedSvg = '<svg id="test-id-4">er diagram</svg>';

      mockMermaid.render.mockResolvedValue({ svg: expectedSvg });

      const result = await service.render(code, 'test-id-4', false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.svg).toContain('<svg');
      }
    });

    it('should return SVG for valid class diagram', async () => {
      const code = `classDiagram
    Animal <|-- Duck`;
      const expectedSvg = '<svg id="test-id-5">class diagram</svg>';

      mockMermaid.render.mockResolvedValue({ svg: expectedSvg });

      const result = await service.render(code, 'test-id-5', false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.svg).toContain('<svg');
      }
    });

    it('should return error for invalid syntax', async () => {
      const code = `invalid mermaid syntax that will fail
    --> broken`;
      const errorMessage = 'Parse error on line 1';

      mockMermaid.render.mockRejectedValue(new Error(errorMessage));

      const result = await service.render(code, 'test-id-error', false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(errorMessage);
        expect(result.rawCode).toBe(code);
      }
    });

    it('should return error for empty code', async () => {
      const code = '';
      const result = await service.render(code, 'test-id-empty', false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Empty mermaid code');
        expect(result.rawCode).toBe(code);
      }

      // Should not call mermaid.render for empty code
      expect(mockMermaid.render).not.toHaveBeenCalled();
    });

    it('should return error for whitespace-only code', async () => {
      const code = '   \n  \t  ';
      const result = await service.render(code, 'test-id-whitespace', false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Empty mermaid code');
        expect(result.rawCode).toBe(code);
      }
    });

    it('should use dark theme when darkMode is true', async () => {
      const code = `graph TD
    A --> B`;
      mockMermaid.render.mockResolvedValue({ svg: '<svg>dark</svg>' });

      await service.render(code, 'test-id-dark', true);

      expect(mockMermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          themeVariables: expect.objectContaining({
            actorTextColor: '#e5e7eb',
            signalTextColor: '#e5e7eb',
            noteTextColor: '#e5e7eb',
            nodeTextColor: '#e5e7eb',
            labelTextColor: '#e5e7eb',
          }),
        })
      );
    });

    it('should use default theme when darkMode is false', async () => {
      const code = `graph TD
    A --> B`;
      mockMermaid.render.mockResolvedValue({ svg: '<svg>light</svg>' });

      await service.render(code, 'test-id-light', false);

      const initCall = mockMermaid.initialize.mock.calls[0][0];
      expect(initCall.theme).toBe('default');
      expect(initCall.themeVariables).toBeUndefined();
    });

    it('should reinitialize when darkMode changes', async () => {
      const code = `graph TD
    A --> B`;
      mockMermaid.render.mockResolvedValue({ svg: '<svg>test</svg>' });

      // First render with light mode
      await service.render(code, 'test-id-1', false);
      expect(mockMermaid.initialize).toHaveBeenCalledTimes(1);

      // Second render with same mode - should not reinitialize
      await service.render(code, 'test-id-2', false);
      expect(mockMermaid.initialize).toHaveBeenCalledTimes(1);

      // Third render with dark mode - should reinitialize
      await service.render(code, 'test-id-3', true);
      expect(mockMermaid.initialize).toHaveBeenCalledTimes(2);
      expect(mockMermaid.initialize).toHaveBeenLastCalledWith(
        expect.objectContaining({
          theme: 'dark',
        })
      );
    });

    it('should generate unique SVG for different IDs', async () => {
      const code = `graph TD
    A --> B`;

      mockMermaid.render
        .mockResolvedValueOnce({ svg: '<svg id="unique-id-1">content</svg>' })
        .mockResolvedValueOnce({ svg: '<svg id="unique-id-2">content</svg>' });

      const result1 = await service.render(code, 'unique-id-1', false);
      const result2 = await service.render(code, 'unique-id-2', false);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      expect(mockMermaid.render).toHaveBeenCalledWith('unique-id-1', code);
      expect(mockMermaid.render).toHaveBeenCalledWith('unique-id-2', code);
    });

    it('should handle non-Error exceptions', async () => {
      const code = `graph TD
    A --> B`;
      const errorObject = { code: 'UNKNOWN', message: 'Something failed' };

      mockMermaid.render.mockRejectedValue(errorObject);

      const result = await service.render(code, 'test-id-obj-error', false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Something failed');
        expect(result.rawCode).toBe(code);
      }
    });
  });
});
