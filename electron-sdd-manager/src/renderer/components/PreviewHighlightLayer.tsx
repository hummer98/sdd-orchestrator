/**
 * PreviewHighlightLayer Component
 * Preview mode highlight using CSS Custom Highlight API
 * Requirements: artifact-editor-search 4.1, 4.2, 4.3
 */

import { useEffect, useMemo, RefObject } from 'react';

export interface PreviewHighlightLayerProps {
  /** Ref to the container element to search within */
  containerRef: RefObject<HTMLElement | null>;
  /** Search query string */
  query: string;
  /** Whether to use case-sensitive matching */
  caseSensitive: boolean;
  /** Index of the currently active match */
  activeIndex: number;
}

interface UsePreviewHighlightResult {
  isSupported: boolean;
}

/**
 * Check if CSS Custom Highlight API is supported
 */
function isHighlightApiSupported(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hook for managing preview highlights
 */
export function usePreviewHighlight({
  containerRef,
  query,
  caseSensitive,
  activeIndex,
}: PreviewHighlightLayerProps): UsePreviewHighlightResult {
  const isSupported = useMemo(() => isHighlightApiSupported(), []);

  useEffect(() => {
    if (!isSupported || !containerRef.current || !query) {
      // Clear highlights when query is empty or not supported
      if (isSupported && CSS.highlights) {
        CSS.highlights.delete('search-results');
        CSS.highlights.delete('active-match');
      }
      return;
    }

    const container = containerRef.current;
    const escapedQuery = escapeRegExp(query);
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escapedQuery, flags);

    // Collect all text nodes
    const treeWalker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    const allRanges: Range[] = [];
    let matchIndex = 0;
    let activeRange: Range | null = null;

    let currentNode = treeWalker.nextNode();
    while (currentNode) {
      const text = currentNode.textContent || '';
      let match: RegExpExecArray | null;

      // Reset regex lastIndex for each node
      regex.lastIndex = 0;

      while ((match = regex.exec(text)) !== null) {
        const range = new Range();
        range.setStart(currentNode, match.index);
        range.setEnd(currentNode, match.index + match[0].length);

        if (matchIndex === activeIndex) {
          activeRange = range;
        } else {
          allRanges.push(range);
        }
        matchIndex++;
      }

      currentNode = treeWalker.nextNode();
    }

    // Apply highlights using CSS Custom Highlight API
    try {
      if (allRanges.length > 0) {
        const searchHighlight = new Highlight(...allRanges);
        CSS.highlights.set('search-results', searchHighlight);
      } else {
        CSS.highlights.delete('search-results');
      }

      if (activeRange) {
        const activeHighlight = new Highlight(activeRange);
        CSS.highlights.set('active-match', activeHighlight);
      } else {
        CSS.highlights.delete('active-match');
      }
    } catch {
      // Fallback for unsupported environments
      console.warn('CSS Custom Highlight API encountered an error');
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (isSupported && CSS.highlights) {
        CSS.highlights.delete('search-results');
        CSS.highlights.delete('active-match');
      }
    };
  }, [containerRef, query, caseSensitive, activeIndex, isSupported]);

  return { isSupported };
}

/**
 * CSS styles for highlight pseudo-elements
 */
const highlightStyles = `
::highlight(search-results) {
  background-color: rgb(253 224 71);
  color: inherit;
}

::highlight(active-match) {
  background-color: rgb(251 191 36);
  color: inherit;
}

@media (prefers-color-scheme: dark) {
  ::highlight(search-results) {
    background-color: rgb(161 98 7);
    color: inherit;
  }

  ::highlight(active-match) {
    background-color: rgb(245 158 11);
    color: inherit;
  }
}
`;

/**
 * PreviewHighlightLayer Component
 * Renders CSS styles and manages highlights for preview mode
 */
export function PreviewHighlightLayer(props: PreviewHighlightLayerProps) {
  // Use the hook to manage highlights
  usePreviewHighlight(props);

  // Inject CSS styles for highlight pseudo-elements
  return (
    <style data-search-highlight>{highlightStyles}</style>
  );
}
