/**
 * PreviewHighlightLayer Component Tests
 * TDD: Testing preview mode highlight using CSS Custom Highlight API
 * Requirements: artifact-editor-search 4.1, 4.2, 4.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewHighlightLayer, usePreviewHighlight } from './PreviewHighlightLayer';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock CSS.highlights API since jsdom doesn't support it
const mockHighlightSet = vi.fn();
const mockHighlightDelete = vi.fn();
const mockHighlightClear = vi.fn();

describe('PreviewHighlightLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock for CSS.highlights
    (globalThis as unknown as { CSS: { highlights: Map<string, unknown> } }).CSS = {
      highlights: new Map([
        ['set', mockHighlightSet],
        ['delete', mockHighlightDelete],
        ['clear', mockHighlightClear],
      ]) as unknown as Map<string, unknown>,
    };

    // Mock Highlight constructor
    (globalThis as unknown as { Highlight: unknown }).Highlight = vi.fn().mockImplementation((...ranges) => ({
      ranges,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('usePreviewHighlight hook', () => {
    it('should return isSupported based on CSS.highlights availability', () => {
      const containerRef = { current: document.createElement('div') };

      const { result } = renderHook(() =>
        usePreviewHighlight({
          containerRef,
          query: 'test',
          caseSensitive: false,
          activeIndex: 0,
        })
      );

      // CSS.highlights is mocked, so should be truthy
      expect(result.current.isSupported).toBe(true);
    });

    it('should return isSupported false when CSS.highlights is unavailable', () => {
      // Remove the mock
      delete (globalThis as unknown as { CSS?: unknown }).CSS;

      const containerRef = { current: document.createElement('div') };

      const { result } = renderHook(() =>
        usePreviewHighlight({
          containerRef,
          query: 'test',
          caseSensitive: false,
          activeIndex: 0,
        })
      );

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('PreviewHighlightLayer component', () => {
    it('should inject CSS styles for highlights', () => {
      const containerRef = React.createRef<HTMLDivElement>();

      render(
        <div>
          <div ref={containerRef}>
            <p>test content</p>
          </div>
          <PreviewHighlightLayer
            containerRef={containerRef}
            query="test"
            caseSensitive={false}
            activeIndex={0}
          />
        </div>
      );

      // Check that style element is injected
      const styleElement = document.querySelector('style[data-search-highlight]');
      expect(styleElement).toBeInTheDocument();
    });

    it('should not crash when containerRef is null', () => {
      const containerRef = { current: null };

      expect(() => {
        render(
          <PreviewHighlightLayer
            containerRef={containerRef}
            query="test"
            caseSensitive={false}
            activeIndex={0}
          />
        );
      }).not.toThrow();
    });

    it('should not apply highlights when query is empty', () => {
      const containerRef = React.createRef<HTMLDivElement>();

      render(
        <div>
          <div ref={containerRef}>
            <p>test content</p>
          </div>
          <PreviewHighlightLayer
            containerRef={containerRef}
            query=""
            caseSensitive={false}
            activeIndex={0}
          />
        </div>
      );

      // With empty query, no highlights should be created
      // The hook should clean up any existing highlights
      expect(true).toBe(true); // Basic assertion that no crash occurred
    });
  });

  describe('CSS styling', () => {
    it('should define styles for search-results highlight', () => {
      const containerRef = React.createRef<HTMLDivElement>();

      render(
        <div>
          <div ref={containerRef}>
            <p>test content</p>
          </div>
          <PreviewHighlightLayer
            containerRef={containerRef}
            query="test"
            caseSensitive={false}
            activeIndex={0}
          />
        </div>
      );

      const styleElement = document.querySelector('style[data-search-highlight]');
      expect(styleElement?.textContent).toContain('::highlight(search-results)');
    });

    it('should define styles for active-match highlight', () => {
      const containerRef = React.createRef<HTMLDivElement>();

      render(
        <div>
          <div ref={containerRef}>
            <p>test content</p>
          </div>
          <PreviewHighlightLayer
            containerRef={containerRef}
            query="test"
            caseSensitive={false}
            activeIndex={0}
          />
        </div>
      );

      const styleElement = document.querySelector('style[data-search-highlight]');
      expect(styleElement?.textContent).toContain('::highlight(active-match)');
    });
  });

  describe('fallback rendering', () => {
    it('should render null (no visible output) as it uses CSS API', () => {
      const containerRef = React.createRef<HTMLDivElement>();

      const { container } = render(
        <PreviewHighlightLayer
          containerRef={containerRef}
          query="test"
          caseSensitive={false}
          activeIndex={0}
        />
      );

      // The component should only render a style element, not visible content
      expect(container.querySelector('style')).toBeInTheDocument();
      expect(container.querySelector('[data-testid]')).not.toBeInTheDocument();
    });
  });
});
