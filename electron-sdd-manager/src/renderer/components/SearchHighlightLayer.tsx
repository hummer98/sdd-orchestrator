/**
 * SearchHighlightLayer Component
 * Edit mode highlight overlay for search matches
 * Requirements: artifact-editor-search 4.1, 4.2, 4.4
 */

import { useMemo } from 'react';
import type { SearchMatch } from '../stores/editorStore';

export interface SearchHighlightLayerProps {
  /** Content to display highlights for */
  content: string;
  /** Array of match positions */
  matches: SearchMatch[];
  /** Index of the currently active match */
  activeIndex: number;
  /** Scroll top position for synchronization */
  scrollTop?: number;
  /** Scroll left position for synchronization */
  scrollLeft?: number;
}

interface Segment {
  text: string;
  isMatch: boolean;
  isActive: boolean;
  key: string;
}

/**
 * Segment content into parts with match information
 */
function segmentContent(
  content: string,
  matches: SearchMatch[],
  activeIndex: number
): Segment[] {
  if (!content || matches.length === 0) {
    return [];
  }

  const segments: Segment[] = [];
  let currentPos = 0;

  // Sort matches by start position
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

  sortedMatches.forEach((match, index) => {
    const start = Math.max(0, Math.min(match.start, content.length));
    const end = Math.max(0, Math.min(match.end, content.length));

    // Skip invalid matches
    if (start >= end || start >= content.length) {
      return;
    }

    // Add non-match segment before this match
    if (currentPos < start) {
      segments.push({
        text: content.slice(currentPos, start),
        isMatch: false,
        isActive: false,
        key: `text-${currentPos}`,
      });
    }

    // Add match segment
    segments.push({
      text: content.slice(start, end),
      isMatch: true,
      isActive: index === activeIndex,
      key: `match-${start}`,
    });

    currentPos = end;
  });

  // Add remaining content after last match
  if (currentPos < content.length) {
    segments.push({
      text: content.slice(currentPos),
      isMatch: false,
      isActive: false,
      key: `text-${currentPos}`,
    });
  }

  return segments;
}

export function SearchHighlightLayer({
  content,
  matches,
  activeIndex,
  scrollTop = 0,
  scrollLeft = 0,
}: SearchHighlightLayerProps) {
  const segments = useMemo(
    () => segmentContent(content, matches, activeIndex),
    [content, matches, activeIndex]
  );

  return (
    <div
      data-testid="search-highlight-layer"
      className="absolute pointer-events-none whitespace-pre-wrap break-words"
      style={{
        top: `-${scrollTop}px`,
        left: `-${scrollLeft}px`,
        // Match the textarea styling
        fontFamily:
          '"Noto Sans Mono CJK JP", "Noto Sans Mono", "Source Han Code JP", "BIZ UDGothic", "Osaka-Mono", "MS Gothic", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        padding: '8px',
        color: 'transparent', // Make text invisible, only show backgrounds
      }}
    >
      {segments.map((segment) => {
        if (!segment.isMatch) {
          // Non-match text - invisible
          return <span key={segment.key}>{segment.text}</span>;
        }

        if (segment.isActive) {
          // Active match - orange/amber background
          return (
            <span
              key={segment.key}
              data-testid="highlight-active"
              className="bg-amber-400 dark:bg-amber-500 rounded-sm"
            >
              {segment.text}
            </span>
          );
        }

        // Regular match - yellow background
        return (
          <span
            key={segment.key}
            data-testid="highlight-match"
            className="bg-yellow-200 dark:bg-yellow-600 rounded-sm"
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}
