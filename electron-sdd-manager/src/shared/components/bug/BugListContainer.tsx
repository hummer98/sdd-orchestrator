/**
 * BugListContainer Component
 *
 * bugs-view-unification Task 3.2: BugListContainerコンポーネントを作成する
 *
 * Shared container for bug list display.
 * Handles rendering logic, loading/error states, and list structure.
 * Used by both Electron BugList and Remote-UI BugsView.
 *
 * Requirements: 1.1-1.9
 */

import React from 'react';
import { Loader2, Filter, Search, Bug } from 'lucide-react';
import { clsx } from 'clsx';
import { BugListItem } from './BugListItem';
import type { BugMetadata } from '@shared/api/types';

/**
 * Bug phase filter options
 * Requirements: 1.5
 */
export type BugPhaseFilter = 'all' | 'reported' | 'analyzed' | 'fixed' | 'verified' | 'deployed';

// =============================================================================
// Constants
// =============================================================================

/**
 * Phase filter options for dropdown
 * bug-deploy-phase: Requirements 1.1, 3.1 - added deployed
 */
export const BUG_PHASE_FILTER_OPTIONS: { value: BugPhaseFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'reported', label: '報告済' },
  { value: 'analyzed', label: '分析済' },
  { value: 'fixed', label: '修正済' },
  { value: 'verified', label: '検証済' },
  { value: 'deployed', label: 'デプロイ完了' },
];

// =============================================================================
// Types
// =============================================================================

export interface BugListContainerProps {
  /** Sorted and filtered bugs */
  bugs: BugMetadata[];
  /** Currently selected bug name */
  selectedBugName?: string | null;
  /** Callback when bug is selected (Requirements: 1.7) */
  onSelectBug: (bug: BugMetadata) => void;
  /** Loading state (Requirements: 1.2) */
  isLoading: boolean;
  /** Error message (Requirements: 1.3) */
  error?: string | null;

  // Filter Controls (Requirements: 1.5)
  /** Show phase filter select (default: false) */
  showPhaseFilter?: boolean;
  /** Current phase filter */
  phaseFilter?: BugPhaseFilter;
  /** Phase filter change handler */
  onPhaseFilterChange?: (filter: BugPhaseFilter) => void;

  // Search Controls (Requirements: 1.6)
  /** Show text search input (default: false) */
  showSearch?: boolean;
  /** Current search query */
  searchQuery?: string;
  /** Search query change handler */
  onSearchChange?: (query: string) => void;

  // Optional feature props
  /** Get running agent count for a bug (Requirements: 1.8) */
  getRunningAgentCount?: (bugName: string) => number;
  /** Device type for responsive layout (Requirements: 1.9) */
  deviceType?: 'desktop' | 'smartphone';

  /** Additional class names */
  className?: string;
  /** Test ID prefix for E2E testing */
  testIdPrefix?: string;
}

// =============================================================================
// Component
// =============================================================================

export function BugListContainer({
  bugs,
  selectedBugName,
  onSelectBug,
  isLoading,
  error,
  showPhaseFilter = false,
  phaseFilter = 'all',
  onPhaseFilterChange,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  getRunningAgentCount,
  deviceType: _deviceType = 'desktop',
  className,
  testIdPrefix = 'bug-list',
}: BugListContainerProps): React.ReactElement {
  // Loading state (Requirements: 1.2)
  if (isLoading) {
    return (
      <div
        className={clsx('flex items-center justify-center h-32', className)}
        data-testid={`${testIdPrefix}-loading`}
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state (Requirements: 1.3)
  if (error) {
    return (
      <div
        className={clsx('p-4 text-sm text-red-500', className)}
        data-testid={`${testIdPrefix}-error`}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      className={clsx('flex flex-col h-full', className)}
      data-testid={testIdPrefix}
    >
      {/* Filter Controls */}
      {(showPhaseFilter || showSearch) && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
          {/* Phase Filter (Requirements: 1.5) */}
          {showPhaseFilter && onPhaseFilterChange && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={phaseFilter}
                onChange={(e) => onPhaseFilterChange(e.target.value as BugPhaseFilter)}
                className={clsx(
                  'flex-1 px-2 py-1 text-sm rounded',
                  'bg-gray-100 dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300',
                  'border border-gray-200 dark:border-gray-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
                data-testid="phase-filter"
              >
                {BUG_PHASE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Text Search (Requirements: 1.6) */}
          {showSearch && onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Bugを検索..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className={clsx(
                  'w-full pl-9 pr-3 py-2 text-sm rounded-lg',
                  'bg-gray-100 dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                  'border border-gray-200 dark:border-gray-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
                data-testid={`${testIdPrefix}-search-input`}
              />
            </div>
          )}
        </div>
      )}

      {/* List (Requirements: 1.1, 1.4) */}
      <div className="flex-1 overflow-y-auto">
        {bugs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
            data-testid={`${testIdPrefix}-empty`}
          >
            <Bug className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? `"${searchQuery}" に一致するBugがありません` : 'Bugがありません'}
            </p>
          </div>
        ) : (
          <ul data-testid={`${testIdPrefix}-items`}>
            {bugs.map((bug) => {
              const runningAgentCount = getRunningAgentCount?.(bug.name) ?? 0;

              return (
                <BugListItem
                  key={bug.name}
                  bug={bug}
                  isSelected={selectedBugName === bug.name}
                  onSelect={() => onSelectBug(bug)}
                  runningAgentCount={runningAgentCount}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
