/**
 * SearchBar Component
 * Search bar UI for ArtifactEditor
 * Requirements: artifact-editor-search 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 3.1, 3.2, 5.1
 */

import { useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, CaseSensitive } from 'lucide-react';
import { clsx } from 'clsx';
import { useEditorStore } from '../stores/editorStore';

export interface SearchBarProps {
  /** Whether the search bar is visible */
  visible: boolean;
  /** Callback when close button is clicked */
  onClose: () => void;
}

export function SearchBar({ visible, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const searchQuery = useEditorStore((state) => state.searchQuery);
  const caseSensitive = useEditorStore((state) => state.caseSensitive);
  const matches = useEditorStore((state) => state.matches);
  const activeMatchIndex = useEditorStore((state) => state.activeMatchIndex);
  const setSearchQuery = useEditorStore((state) => state.setSearchQuery);
  const setCaseSensitive = useEditorStore((state) => state.setCaseSensitive);
  const navigateNext = useEditorStore((state) => state.navigateNext);
  const navigatePrev = useEditorStore((state) => state.navigatePrev);

  // Auto focus input when visible
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  const hasMatches = matches.length > 0;
  const hasQuery = searchQuery.length > 0;

  // Format match count: "N件中M件目" or "0件"
  const formatMatchCount = (): string => {
    if (!hasQuery) {
      return '';
    }
    if (!hasMatches) {
      return '0件';
    }
    return `${matches.length}件中${activeMatchIndex + 1}件目`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCaseSensitiveToggle = () => {
    setCaseSensitive(!caseSensitive);
  };

  return (
    <div
      data-testid="search-bar"
      className={clsx(
        'flex items-center gap-2 px-4 py-2',
        'bg-gray-50 dark:bg-gray-800',
        'border-b border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <input
          ref={inputRef}
          type="text"
          data-testid="search-input"
          data-autofocus="true"
          aria-label="検索"
          placeholder="検索..."
          value={searchQuery}
          onChange={handleInputChange}
          className={clsx(
            'w-full px-3 py-1.5 pr-16',
            'text-sm rounded-md',
            'border border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-700',
            'text-gray-900 dark:text-gray-100',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            !hasMatches && hasQuery && 'border-red-300 dark:border-red-600'
          )}
        />

        {/* Match count (inside input) */}
        {hasQuery && (
          <span
            data-testid="match-count"
            className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'text-xs',
              hasMatches
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-red-500 dark:text-red-400'
            )}
          >
            {formatMatchCount()}
          </span>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          data-testid="search-prev-button"
          aria-label="前へ"
          onClick={navigatePrev}
          disabled={!hasMatches}
          className={clsx(
            'p-1.5 rounded',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-testid="search-next-button"
          aria-label="次へ"
          onClick={navigateNext}
          disabled={!hasMatches}
          className={clsx(
            'p-1.5 rounded',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Case sensitive toggle */}
      <button
        type="button"
        data-testid="case-sensitive-toggle"
        aria-label="大文字・小文字を区別"
        aria-pressed={caseSensitive}
        onClick={handleCaseSensitiveToggle}
        className={clsx(
          'p-1.5 rounded',
          caseSensitive
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        )}
        title="大文字・小文字を区別 (Aa)"
      >
        <CaseSensitive className="w-4 h-4" />
      </button>

      {/* Close button */}
      <button
        type="button"
        data-testid="search-close-button"
        aria-label="閉じる"
        onClick={onClose}
        className={clsx(
          'p-1.5 rounded',
          'text-gray-600 dark:text-gray-400',
          'hover:bg-gray-200 dark:hover:bg-gray-600'
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
