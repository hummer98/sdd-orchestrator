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
 * remote-ui-spec-list-optimization: Use phase/updatedAt/worktree from WebSocket response
 * instead of calling GET_SPEC_DETAIL for each spec (fixes rate limiting issue)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { SpecListItem } from '@shared/components/spec/SpecListItem';
import { Spinner } from '@shared/components/ui/Spinner';
import { useSpecListLogic } from '@shared/hooks';
import { useSharedAgentStore } from '@shared/stores/agentStore';
import type { ApiClient, SpecMetadataWithPath } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

// spec-path-ssot-refactor: Remote UI uses SpecMetadataWithPath from WebSocket API
export interface SpecsViewProps {
  /** API client instance */
  apiClient: ApiClient;
  /** Currently selected spec ID */
  selectedSpecId?: string | null;
  /** Called when a spec is selected */
  onSelectSpec?: (spec: SpecMetadataWithPath) => void;
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
  // spec-path-ssot-refactor: Remote UI receives SpecMetadataWithPath from WebSocket
  // remote-ui-spec-list-optimization: SpecMetadataWithPath now includes phase/updatedAt/worktree
  const [specs, setSpecs] = useState<SpecMetadataWithPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // remote-ui-spec-list-agent-count: Use shared agentStore for running agent counts
  const { getAgentsForSpec } = useSharedAgentStore();

  // spec-list-unification: Use shared hook for sorting/filtering
  // remote-ui-spec-list-optimization: specs already include phase/updatedAt, no specJsonMap needed
  const { filteredSpecs, searchQuery, setSearchQuery } = useSpecListLogic({
    specs,
    enableTextSearch: true,
  });

  // remote-ui-spec-list-agent-count: Get running agent count for a spec
  const getRunningAgentCount = useCallback(
    (specName: string): number => {
      const agents = getAgentsForSpec(specName);
      return agents.filter((a) => a.status === 'running').length;
    },
    [getAgentsForSpec]
  );

  // Load specs on mount
  // remote-ui-spec-list-optimization: No need to call GET_SPEC_DETAIL for each spec
  // SpecMetadataWithPath now includes phase/updatedAt/worktree from WebSocket response
  useEffect(() => {
    let isMounted = true;

    async function loadSpecs() {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.getSpecs();

      if (!isMounted) return;

      if (result.ok) {
        // spec-path-ssot-refactor: WebSocket API returns SpecMetadataWithPath
        // remote-ui-spec-list-optimization: Now includes phase/updatedAt/worktree
        const specsWithPath = result.value as unknown as SpecMetadataWithPath[];
        setSpecs(specsWithPath);
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
  // remote-ui-spec-list-optimization: No need to call GET_SPEC_DETAIL
  // SpecMetadataWithPath from WebSocket already includes phase/updatedAt/worktree
  useEffect(() => {
    const unsubscribe = apiClient.onSpecsUpdated((updatedSpecs) => {
      // spec-path-ssot-refactor: WebSocket API returns SpecMetadataWithPath
      const specsWithPath = updatedSpecs as unknown as SpecMetadataWithPath[];
      setSpecs(specsWithPath);
    });

    return unsubscribe;
  }, [apiClient]);

  // Handle spec selection
  // spec-path-ssot-refactor: Using SpecMetadataWithPath for Remote UI
  const handleSelectSpec = useCallback(
    (spec: SpecMetadataWithPath) => {
      onSelectSpec?.(spec);
    },
    [onSelectSpec]
  );

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
              {filteredSpecs.map((specWithPhase) => {
                // remote-ui-spec-list-optimization: Get worktree info directly from specs
                // (SpecMetadataWithPath now includes worktree from WebSocket response)
                const originalSpec = specs.find((s) => s.name === specWithPhase.name);
                const worktree = originalSpec?.worktree;

                return (
                  <div key={specWithPhase.name} data-testid={`remote-spec-item-${specWithPhase.name}`}>
                    <SpecListItem
                      spec={specWithPhase}
                      isSelected={selectedSpecId === specWithPhase.name}
                      onSelect={() => originalSpec && handleSelectSpec(originalSpec)}
                      worktree={worktree}
                      runningAgentCount={getRunningAgentCount(specWithPhase.name)}
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
