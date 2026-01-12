/**
 * SpecsView Component
 *
 * Task 13.1: Specsタブの機能UIを実装する
 *
 * Spec一覧表示コンポーネント。共有specStoreとApiClientを使用。
 * SpecListItemを使用したリスト表示（検索・フィルタリング）。
 *
 * Requirements: 7.1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { SpecListItem } from '@shared/components/spec/SpecListItem';
import { Spinner } from '@shared/components/ui/Spinner';
import type { ApiClient, SpecMetadata } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface SpecsViewProps {
  /** API client instance */
  apiClient: ApiClient;
  /** Currently selected spec ID */
  selectedSpecId?: string | null;
  /** Called when a spec is selected */
  onSelectSpec?: (spec: SpecMetadata) => void;
}

// =============================================================================
// Component
// =============================================================================

export function SpecsView({
  apiClient,
  selectedSpecId,
  onSelectSpec,
}: SpecsViewProps): React.ReactElement {
  // State
  const [specs, setSpecs] = useState<SpecMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load specs on mount
  useEffect(() => {
    let isMounted = true;

    async function loadSpecs() {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.getSpecs();

      if (!isMounted) return;

      if (result.ok) {
        setSpecs(result.value);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    }

    loadSpecs();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  // Subscribe to spec updates
  useEffect(() => {
    const unsubscribe = apiClient.onSpecsUpdated((updatedSpecs) => {
      setSpecs(updatedSpecs);
    });

    return unsubscribe;
  }, [apiClient]);

  // Handle spec selection
  const handleSelectSpec = useCallback(
    (spec: SpecMetadata) => {
      onSelectSpec?.(spec);
    },
    [onSelectSpec]
  );

  // Filter specs by search query
  const filteredSpecs = useMemo(() => {
    if (!searchQuery.trim()) {
      return specs;
    }

    const query = searchQuery.toLowerCase();
    return specs.filter((spec) => spec.name.toLowerCase().includes(query));
  }, [specs, searchQuery]);

  // Render loading state
  if (isLoading) {
    return (
      <div
        data-testid="specs-view-loading"
        className="flex items-center justify-center h-full p-8"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        data-testid="specs-error-state"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div className="text-red-500 mb-2">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        </div>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Render empty state
  if (specs.length === 0) {
    return (
      <div
        data-testid="specs-empty-state"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <FileText className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Specがありません</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          デスクトップアプリでSpecを作成してください
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="specs-view">
      {/* Search Input */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            data-testid="specs-search-input"
            placeholder="Specを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(
              'w-full pl-9 pr-3 py-2 text-sm rounded-lg',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-500 dark:placeholder:text-gray-400',
              'border border-gray-200 dark:border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Spec List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSpecs.length === 0 ? (
          <div
            data-testid="specs-no-results"
            className="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <Search className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              "{searchQuery}" に一致するSpecがありません
            </p>
          </div>
        ) : (
          <ul data-testid="specs-list" className="divide-y-0">
            {filteredSpecs.map((spec) => (
              <SpecListItem
                key={spec.name}
                spec={spec}
                isSelected={selectedSpecId === spec.name}
                onSelect={() => handleSelectSpec(spec)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SpecsView;
