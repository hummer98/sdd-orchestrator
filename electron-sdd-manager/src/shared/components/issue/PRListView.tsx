/**
 * PRListView Component
 * Displays a list of Pull Requests with state filter.
 *
 * github-issue-integration: Task 8.1
 * Requirements: 8.2
 */

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { Loader2, GitPullRequest, GitMerge } from 'lucide-react';
import type { GitHubPullRequest, PRFilters } from '@shared/types/github';

// =============================================================================
// Types
// =============================================================================

export interface PRListViewProps {
  pullRequests: GitHubPullRequest[];
  selectedPRNumber: number | null;
  isLoading: boolean;
  error: string | null;
  onSelectPR: (number: number) => void;
  onFilterChange: (filters: Partial<PRFilters>) => void;
  className?: string;
}

// =============================================================================
// Helper: Get display state for PR
// =============================================================================

function getPRDisplayState(pr: GitHubPullRequest): 'open' | 'closed' | 'merged' {
  if (pr.merged) return 'merged';
  return pr.state === 'open' ? 'open' : 'closed';
}

const PR_STATE_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
  merged: 'bg-purple-100 text-purple-800',
};

// =============================================================================
// PRListItem (internal)
// =============================================================================

interface PRListItemProps {
  pr: GitHubPullRequest;
  isSelected: boolean;
  onSelect: () => void;
}

const PRListItem = React.memo(function PRListItem({
  pr,
  isSelected,
  onSelect,
}: PRListItemProps): React.ReactElement {
  const displayState = getPRDisplayState(pr);

  return (
    <li
      data-testid={`pr-item-${pr.number}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={clsx(
        'w-full px-4 py-2.5 text-left',
        'flex flex-col gap-1',
        'border-b border-gray-100 dark:border-gray-800',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        'transition-colors cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
        isSelected && 'bg-blue-100 dark:bg-blue-800/40 border-l-4 border-l-blue-500'
      )}
    >
      {/* Row 1: Number + Title */}
      <div className="flex items-center gap-2 min-w-0">
        {displayState === 'merged' ? (
          <GitMerge className="w-4 h-4 text-purple-500 shrink-0" />
        ) : (
          <GitPullRequest className="w-4 h-4 text-green-500 shrink-0" />
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          #{pr.number}
        </span>
        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
          {pr.title}
        </span>
      </div>

      {/* Row 2: State, branch info */}
      <div className="flex items-center gap-2">
        <span className={clsx(
          'px-2 py-0.5 text-xs rounded-full font-medium',
          PR_STATE_STYLES[displayState]
        )}>
          {displayState}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {pr.head.ref}
        </span>
        <span className="text-xs text-gray-400">-&gt;</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {pr.base.ref}
        </span>
      </div>
    </li>
  );
});

// =============================================================================
// Component
// =============================================================================

export function PRListView({
  pullRequests,
  selectedPRNumber,
  isLoading,
  error,
  onSelectPR,
  onFilterChange,
  className,
}: PRListViewProps): React.ReactElement {
  const handleStateFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFilterChange({ state: e.target.value as PRFilters['state'] });
    },
    [onFilterChange]
  );

  // Loading state
  if (isLoading && pullRequests.length === 0) {
    return (
      <div
        className={clsx('flex items-center justify-center h-32', className)}
        data-testid="pr-list-loading"
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={clsx('p-4 text-sm text-red-500', className)}>
        {error}
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Toolbar: State Filter */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <select
          data-testid="pr-state-filter"
          defaultValue="open"
          onChange={handleStateFilterChange}
          className={clsx(
            'px-2 py-1 text-sm rounded',
            'bg-gray-100 dark:bg-gray-800',
            'text-gray-700 dark:text-gray-300',
            'border border-gray-200 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {pullRequests.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
            data-testid="pr-list-empty"
          >
            <GitPullRequest className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Pull Requestがありません</p>
          </div>
        ) : (
          <ul data-testid="pr-list-items">
            {pullRequests.map((pr) => (
              <PRListItem
                key={pr.number}
                pr={pr}
                isSelected={selectedPRNumber === pr.number}
                onSelect={() => onSelectPR(pr.number)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
