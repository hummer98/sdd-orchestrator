/**
 * SpecsView Component
 *
 * Task 13.1: Specsタブの機能UIを実装する
 * git-worktree-support: Task 13.1 - worktree badge display (Requirements: 4.1)
 *
 * Spec一覧表示コンポーネント。共有specStoreとApiClientを使用。
 * SpecListItemを使用したリスト表示（検索・フィルタリング）。
 *
 * Requirements: 7.1
 * spec-metadata-ssot-refactor: Build SpecMetadataWithPhase from specJson
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { SpecListItem } from '@shared/components/spec/SpecListItem';
import { Spinner } from '@shared/components/ui/Spinner';
import type { ApiClient, SpecMetadata, SpecJson, SpecPhase } from '@shared/api/types';
import type { SpecMetadataWithPhase } from '@renderer/stores/spec/types';

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

/**
 * Unknown phase placeholder for specs without valid specJson
 * spec-metadata-ssot-refactor
 */
const UNKNOWN_PHASE: SpecPhase = 'initialized';
const UNKNOWN_DATE = '1970-01-01T00:00:00.000Z';

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
  /** spec-metadata-ssot-refactor: Map from spec name to SpecJson for phase/updatedAt */
  const [specJsonMap, setSpecJsonMap] = useState<Map<string, SpecJson>>(new Map());
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
        // spec-metadata-ssot-refactor: Load specJsons for all specs
        await loadSpecJsons(result.value);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    }

    /**
     * Load specJsons for all specs
     * spec-metadata-ssot-refactor: Task 8.1 - Build specJsonMap in Remote UI
     */
    async function loadSpecJsons(specList: SpecMetadata[]) {
      const newMap = new Map<string, SpecJson>();

      for (const spec of specList) {
        try {
          const result = await apiClient.getSpecDetail(spec.name);
          if (result.ok && result.value.specJson) {
            newMap.set(spec.name, result.value.specJson as SpecJson);
          }
        } catch (e) {
          console.warn(`[SpecsView] Failed to load specJson for ${spec.name}:`, e);
        }
      }

      if (isMounted) {
        setSpecJsonMap(newMap);
      }
    }

    loadSpecs();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  // Subscribe to spec updates
  useEffect(() => {
    const unsubscribe = apiClient.onSpecsUpdated(async (updatedSpecs) => {
      setSpecs(updatedSpecs);
      // spec-metadata-ssot-refactor: Also reload specJsons on update
      const newMap = new Map<string, SpecJson>();
      for (const spec of updatedSpecs) {
        try {
          const result = await apiClient.getSpecDetail(spec.name);
          if (result.ok && result.value.specJson) {
            newMap.set(spec.name, result.value.specJson as SpecJson);
          }
        } catch (e) {
          console.warn(`[SpecsView] Failed to load specJson for ${spec.name}:`, e);
        }
      }
      setSpecJsonMap(newMap);
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

  /**
   * Convert specs to SpecMetadataWithPhase using specJsonMap
   * spec-metadata-ssot-refactor: Task 8.2 - Build SpecMetadataWithPhase for display
   */
  const specsWithPhase = useMemo((): SpecMetadataWithPhase[] => {
    return specs.map((spec) => {
      const specJson = specJsonMap.get(spec.name);
      return {
        name: spec.name,
        path: spec.path,
        phase: specJson?.phase ?? UNKNOWN_PHASE,
        updatedAt: specJson?.updated_at ?? UNKNOWN_DATE,
      };
    });
  }, [specs, specJsonMap]);

  // Filter specs by search query (spec-metadata-ssot-refactor: use specsWithPhase)
  const filteredSpecs = useMemo(() => {
    if (!searchQuery.trim()) {
      return specsWithPhase;
    }

    const query = searchQuery.toLowerCase();
    return specsWithPhase.filter((spec) => spec.name.toLowerCase().includes(query));
  }, [specsWithPhase, searchQuery]);

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
            {/* remote-ui-vanilla-removal: Added remote-spec-list wrapper for E2E */}
            <div data-testid="remote-spec-list">
              {filteredSpecs.map((spec) => {
                // git-worktree-support: Task 13.1 - Get worktree info from specJsonMap
                const specJson = specJsonMap.get(spec.name);
                const worktree = specJson?.worktree;

                return (
                  <div key={spec.name} data-testid={`remote-spec-item-${spec.name}`}>
                    <SpecListItem
                      spec={spec}
                      isSelected={selectedSpecId === spec.name}
                      onSelect={() => handleSelectSpec(spec)}
                      worktree={worktree}
                    />
                  </div>
                );
              })}
            </div>
          </ul>
        )}
      </div>
    </div>
  );
}

export default SpecsView;
