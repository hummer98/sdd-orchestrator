/**
 * SearchHighlightLayer Component Tests
 * TDD: Testing edit mode highlight overlay
 * Requirements: artifact-editor-search 4.1, 4.2, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchHighlightLayer } from './SearchHighlightLayer';

describe('SearchHighlightLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when matches exist', () => {
      const matches = [
        { start: 0, end: 4 },
        { start: 10, end: 14 },
      ];
      render(
        <SearchHighlightLayer
          content="test content test"
          matches={matches}
          activeIndex={0}
        />
      );

      expect(screen.getByTestId('search-highlight-layer')).toBeInTheDocument();
    });

    it('should render empty when no matches', () => {
      render(
        <SearchHighlightLayer
          content="test content"
          matches={[]}
          activeIndex={-1}
        />
      );

      expect(screen.getByTestId('search-highlight-layer')).toBeInTheDocument();
      expect(screen.getByTestId('search-highlight-layer')).toBeEmptyDOMElement();
    });

    it('should not render when content is empty', () => {
      render(
        <SearchHighlightLayer
          content=""
          matches={[{ start: 0, end: 4 }]}
          activeIndex={0}
        />
      );

      expect(screen.getByTestId('search-highlight-layer')).toBeEmptyDOMElement();
    });
  });

  describe('highlight segments', () => {
    it('should create segments for matches and non-matches', () => {
      const matches = [{ start: 5, end: 9 }];
      render(
        <SearchHighlightLayer
          content="hello test world"
          matches={matches}
          activeIndex={0}
        />
      );

      // Should have multiple segments
      const layer = screen.getByTestId('search-highlight-layer');
      expect(layer.children.length).toBeGreaterThan(0);
    });

    it('should highlight active match differently', () => {
      const matches = [
        { start: 0, end: 4 },
        { start: 10, end: 14 },
      ];
      render(
        <SearchHighlightLayer
          content="test hello test"
          matches={matches}
          activeIndex={0}
        />
      );

      const activeHighlight = screen.getByTestId('highlight-active');
      expect(activeHighlight).toBeInTheDocument();
    });

    it('should apply different style to non-active matches', () => {
      const matches = [
        { start: 0, end: 4 },
        { start: 10, end: 14 },
      ];
      render(
        <SearchHighlightLayer
          content="test hello test"
          matches={matches}
          activeIndex={0}
        />
      );

      const normalHighlights = screen.getAllByTestId('highlight-match');
      expect(normalHighlights.length).toBe(1); // One non-active match
    });
  });

  describe('match positions', () => {
    it('should handle match at start of content', () => {
      const matches = [{ start: 0, end: 4 }];
      render(
        <SearchHighlightLayer
          content="test content"
          matches={matches}
          activeIndex={0}
        />
      );

      const layer = screen.getByTestId('search-highlight-layer');
      expect(layer.textContent).toContain('test');
    });

    it('should handle match at end of content', () => {
      const matches = [{ start: 8, end: 12 }];
      render(
        <SearchHighlightLayer
          content="content test"
          matches={matches}
          activeIndex={0}
        />
      );

      const layer = screen.getByTestId('search-highlight-layer');
      expect(layer.textContent).toContain('test');
    });

    it('should handle multiple consecutive matches', () => {
      const matches = [
        { start: 0, end: 4 },
        { start: 4, end: 8 },
      ];
      render(
        <SearchHighlightLayer
          content="testtest"
          matches={matches}
          activeIndex={0}
        />
      );

      const layer = screen.getByTestId('search-highlight-layer');
      expect(layer.textContent).toBe('testtest');
    });
  });

  describe('scroll sync', () => {
    it('should accept scrollTop prop for synchronization', () => {
      render(
        <SearchHighlightLayer
          content="test content"
          matches={[{ start: 0, end: 4 }]}
          activeIndex={0}
          scrollTop={100}
        />
      );

      const layer = screen.getByTestId('search-highlight-layer');
      expect(layer).toHaveStyle({ top: '-100px' });
    });

    it('should accept scrollLeft prop for synchronization', () => {
      render(
        <SearchHighlightLayer
          content="test content"
          matches={[{ start: 0, end: 4 }]}
          activeIndex={0}
          scrollLeft={50}
        />
      );

      const layer = screen.getByTestId('search-highlight-layer');
      expect(layer).toHaveStyle({ left: '-50px' });
    });
  });

  describe('edge cases', () => {
    it('should handle match indices out of content bounds', () => {
      const matches = [{ start: 0, end: 100 }]; // End beyond content length
      render(
        <SearchHighlightLayer
          content="short"
          matches={matches}
          activeIndex={0}
        />
      );

      // Should not crash and should render what's available
      const layer = screen.getByTestId('search-highlight-layer');
      expect(layer).toBeInTheDocument();
    });

    it('should handle negative activeIndex', () => {
      const matches = [{ start: 0, end: 4 }];
      render(
        <SearchHighlightLayer
          content="test content"
          matches={matches}
          activeIndex={-1}
        />
      );

      // Should not have any active highlights
      expect(screen.queryByTestId('highlight-active')).not.toBeInTheDocument();
    });
  });
});
