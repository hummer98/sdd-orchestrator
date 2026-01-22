/**
 * SpecListContainer Component
 *
 * Shared container for spec list display.
 * Handles rendering logic, loading/error states, and list structure.
 * Used by both Electron SpecList and Remote-UI SpecsView.
 *
 * spec-list-unification: Extracted common UI from SpecList and SpecsView
 */

import React from 'react';
import { Loader2, Filter, Search, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { SpecListItem } from './SpecListItem';
import type { SpecJson } from '@shared/api/types';
import type { SpecMetadataWithPhase, SpecStatusFilter } from '@shared/types/spec';
import type { DocumentReviewState } from '@shared/types/review';

// =============================================================================
// Constants
// =============================================================================

/**
 * Phase filter options for status filter dropdown
 */
export const PHASE_FILTER_OPTIONS: { value: SpecStatusFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'initialized', label: '初期化' },
  { value: 'requirements-generated', label: '要件定義済' },
  { value: 'design-generated', label: '設計済' },
  { value: 'tasks-generated', label: 'タスク済' },
  { value: 'implementation-complete', label: '実装完了' },
  { value: 'inspection-complete', label: '検査完了' },
  { value: 'deploy-complete', label: 'デプロイ完了' },
];

// =============================================================================
// Types
// =============================================================================

export interface SpecListContainerProps {
  /** Sorted and filtered specs */
  specs: SpecMetadataWithPhase[];
  /** Currently selected spec name */
  selectedSpecName?: string | null;
  /** Callback when spec is selected */
  onSelectSpec: (spec: SpecMetadataWithPhase) => void;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error?: string | null;
  /** SpecJson map for additional data (worktree, documentReview) */
  specJsonMap: ReadonlyMap<string, SpecJson> | Map<string, SpecJson>;

  // Filter Controls
  /** Show phase filter select (default: false) */
  showPhaseFilter?: boolean;
  /** Current status filter */
  statusFilter?: SpecStatusFilter;
  /** Status filter change handler */
  onStatusFilterChange?: (filter: SpecStatusFilter) => void;

  // Search Controls
  /** Show text search input (default: false) */
  showSearch?: boolean;
  /** Current search query */
  searchQuery?: string;
  /** Search query change handler */
  onSearchChange?: (query: string) => void;

  // Optional feature props
  /** Get running agent count for a spec (Electron only) */
  getRunningAgentCount?: (specName: string) => number;
  /** Show document review badge (default: false) */
  showDocumentReview?: boolean;

  /** Additional class names */
  className?: string;

  /** Test ID prefix for E2E testing */
  testIdPrefix?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SpecListContainer({
  specs,
  selectedSpecName,
  onSelectSpec,
  isLoading,
  error,
  specJsonMap,
  showPhaseFilter = false,
  statusFilter = 'all',
  onStatusFilterChange,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  getRunningAgentCount,
  showDocumentReview = false,
  className,
  testIdPrefix = 'spec-list',
}: SpecListContainerProps): React.ReactElement {
  // Loading state
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

  // Error state
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
          {/* Phase Filter */}
          {showPhaseFilter && onStatusFilterChange && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as SpecStatusFilter)}
                className={clsx(
                  'flex-1 px-2 py-1 text-sm rounded',
                  'bg-gray-100 dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300',
                  'border border-gray-200 dark:border-gray-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
                data-testid="status-filter"
              >
                {PHASE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Text Search */}
          {showSearch && onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Specを検索..."
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

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {specs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
            data-testid={`${testIdPrefix}-empty`}
          >
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? `"${searchQuery}" に一致するSpecがありません` : '仕様がありません'}
            </p>
          </div>
        ) : (
          <ul data-testid={`${testIdPrefix}-items`}>
            {specs.map((spec) => {
              const specJson = specJsonMap.get(spec.name);
              const runningAgentCount = getRunningAgentCount?.(spec.name) ?? 0;

              return (
                <SpecListItem
                  key={spec.name}
                  spec={spec}
                  isSelected={selectedSpecName === spec.name}
                  onSelect={() => onSelectSpec(spec)}
                  runningAgentCount={runningAgentCount}
                  worktree={specJson?.worktree}
                  documentReview={
                    showDocumentReview
                      ? (specJson?.documentReview as DocumentReviewState | undefined)
                      : undefined
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
