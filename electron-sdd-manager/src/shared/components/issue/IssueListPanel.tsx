/**
 * IssueListPanel Component
 * Displays a list of GitHub Issues with filter controls, refresh, and pagination.
 *
 * github-issue-integration: Task 7.2
 * Requirements: 2.2, 2.3, 2.5, 2.6
 */

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { Loader2, RefreshCw, Plus, CircleDot } from 'lucide-react';
import { StatusLabelBadge } from './StatusLabelBadge';
import type { GitHubIssue, IssueFilters, StatusLabel } from '@shared/types/github';

// =============================================================================
// Types
// =============================================================================

export interface IssueListPanelProps {
  issues: GitHubIssue[];
  selectedIssueNumber: number | null;
  isLoading: boolean;
  hasMore: boolean;
  filters: IssueFilters;
  error: string | null;
  onSelectIssue: (number: number) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onFilterChange: (filters: Partial<IssueFilters>) => void;
  onCreateIssue: () => void;
  className?: string;
}

// =============================================================================
// Helper: extract status label from issue labels
// =============================================================================

function getStatusLabel(issue: GitHubIssue): StatusLabel | null {
  for (const label of issue.labels) {
    if (label.name.startsWith('status:')) {
      const status = label.name.slice('status:'.length);
      return status as StatusLabel;
    }
  }
  return null;
}

// =============================================================================
// IssueListItem (internal)
// =============================================================================

interface IssueListItemProps {
  issue: GitHubIssue;
  isSelected: boolean;
  onSelect: () => void;
}

const IssueListItem = React.memo(function IssueListItem({
  issue,
  isSelected,
  onSelect,
}: IssueListItemProps): React.ReactElement {
  const statusLabel = getStatusLabel(issue);

  return (
    <li
      data-testid={`issue-item-${issue.number}`}
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
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          #{issue.number}
        </span>
        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
          {issue.title}
        </span>
      </div>

      {/* Row 2: Status label, comment count, date */}
      <div className="flex items-center gap-2">
        {statusLabel && <StatusLabelBadge status={statusLabel} />}
        {issue.comments > 0 && (
          <span className="text-xs text-gray-400">
            {issue.comments} comments
          </span>
        )}
        {issue.assignees.length > 0 && (
          <span className="text-xs text-gray-400">
            {issue.assignees.map((a) => a.login).join(', ')}
          </span>
        )}
      </div>
    </li>
  );
});

// =============================================================================
// Component
// =============================================================================

export function IssueListPanel({
  issues,
  selectedIssueNumber,
  isLoading,
  hasMore,
  filters,
  error,
  onSelectIssue,
  onRefresh,
  onLoadMore,
  onFilterChange,
  onCreateIssue,
  className,
}: IssueListPanelProps): React.ReactElement {
  const handleStateFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFilterChange({ state: e.target.value as IssueFilters['state'] });
    },
    [onFilterChange]
  );

  // Loading state (initial)
  if (isLoading && issues.length === 0) {
    return (
      <div
        className={clsx('flex items-center justify-center h-32', className)}
        data-testid="issue-list-loading"
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
      {/* Toolbar: Filter + Refresh + Create */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <select
          data-testid="state-filter"
          value={filters.state ?? 'open'}
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

        <div className="flex-1" />

        <button
          data-testid="refresh-button"
          onClick={onRefresh}
          className={clsx(
            'p-1.5 rounded',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            'transition-colors'
          )}
          title="更新"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          data-testid="create-issue-button"
          onClick={onCreateIssue}
          className={clsx(
            'p-1.5 rounded',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            'transition-colors'
          )}
          title="新規Issue作成"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {issues.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
            data-testid="issue-list-empty"
          >
            <CircleDot className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Issueがありません</p>
          </div>
        ) : (
          <>
            <ul data-testid="issue-list-items">
              {issues.map((issue) => (
                <IssueListItem
                  key={issue.number}
                  issue={issue}
                  isSelected={selectedIssueNumber === issue.number}
                  onSelect={() => onSelectIssue(issue.number)}
                />
              ))}
            </ul>

            {/* Load More */}
            {hasMore && (
              <div className="p-3 text-center">
                <button
                  data-testid="load-more-button"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className={clsx(
                    'px-4 py-2 text-sm rounded-md',
                    'bg-gray-100 dark:bg-gray-800',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-200 dark:hover:bg-gray-700',
                    'disabled:opacity-50',
                    'transition-colors'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                  ) : null}
                  もっと読み込む
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
