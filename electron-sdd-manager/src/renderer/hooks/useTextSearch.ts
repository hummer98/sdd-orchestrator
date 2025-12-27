/**
 * useTextSearch Hook
 * Text search logic and match calculation
 * Requirements: artifact-editor-search 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.3
 */

import { useEffect, useMemo } from 'react';
import { useEditorStore, SearchMatch } from '../stores/editorStore';

interface TextSearchResult {
  matches: SearchMatch[];
  totalCount: number;
  currentIndex: number;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate all match positions in content
 */
function findMatches(
  content: string,
  query: string,
  caseSensitive: boolean
): SearchMatch[] {
  if (!query || !content) {
    return [];
  }

  const matches: SearchMatch[] = [];
  const escapedQuery = escapeRegExp(query);
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(escapedQuery, flags);

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return matches;
}

/**
 * Hook for text search functionality
 * Automatically calculates matches when content, query, or caseSensitive changes
 */
export function useTextSearch(): TextSearchResult {
  const content = useEditorStore((state) => state.content);
  const searchQuery = useEditorStore((state) => state.searchQuery);
  const caseSensitive = useEditorStore((state) => state.caseSensitive);
  const activeMatchIndex = useEditorStore((state) => state.activeMatchIndex);
  const storedMatches = useEditorStore((state) => state.matches);
  const setMatches = useEditorStore((state) => state.setMatches);

  // Memoize match calculation for performance
  const calculatedMatches = useMemo(() => {
    return findMatches(content, searchQuery, caseSensitive);
  }, [content, searchQuery, caseSensitive]);

  // Update store when matches change
  useEffect(() => {
    // Only update if matches actually changed
    const matchesChanged =
      calculatedMatches.length !== storedMatches.length ||
      calculatedMatches.some(
        (m, i) =>
          !storedMatches[i] ||
          m.start !== storedMatches[i].start ||
          m.end !== storedMatches[i].end
      );

    if (matchesChanged) {
      setMatches(calculatedMatches);
    }
  }, [calculatedMatches, storedMatches, setMatches]);

  // Calculate 1-based current index for display
  const currentIndex = activeMatchIndex >= 0 ? activeMatchIndex + 1 : 0;

  return {
    matches: storedMatches,
    totalCount: storedMatches.length,
    currentIndex,
  };
}
