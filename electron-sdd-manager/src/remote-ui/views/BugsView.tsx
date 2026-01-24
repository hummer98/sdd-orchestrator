/**
 * BugsView Component
 *
 * Task 13.5: Bugsタブの機能UIを実装する
 * bugs-view-unification Task 5.1: 共有コンポーネントを使用するよう更新
 * bugs-view-unification Task 8.1-8.3: useSharedBugStore使用、PhaseFilter/AgentCount追加
 *
 * Bug一覧表示コンポーネント。共有bugStoreとApiClientを使用。
 * BugListContainerとuseBugListLogicを使用した統一実装。
 *
 * Note: Bug作成ボタン/ダイアログはLeftSidebarに移動 (remote-ui-create-buttons Task 5.1)
 *
 * Requirements: 6.2, 6.3, 6.4, 7.2
 */

import React, { useEffect } from 'react';
import { BugListContainer } from '@shared/components/bug/BugListContainer';
import { useBugListLogic } from '@shared/hooks/useBugListLogic';
import { useSharedBugStore } from '@shared/stores/bugStore';
import { useSharedAgentStore } from '@shared/stores/agentStore';
import type { ApiClient, BugMetadataWithPath, BugMetadata } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

// spec-path-ssot-refactor: Remote UI uses BugMetadataWithPath from WebSocket API
export interface BugsViewProps {
  /** API client instance */
  apiClient: ApiClient;
  /** Currently selected bug ID */
  selectedBugId?: string | null;
  /** Called when a bug is selected */
  onSelectBug?: (bug: BugMetadataWithPath) => void;
  /** Device type for responsive layout */
  deviceType?: 'desktop' | 'smartphone';
}

// =============================================================================
// Component
// =============================================================================

export function BugsView({
  apiClient,
  selectedBugId,
  onSelectBug,
  deviceType = 'desktop',
}: BugsViewProps): React.ReactElement {
  // bugs-view-unification Task 8.1: Use shared bugStore for state management (Requirements: 6.2)
  const {
    bugs,
    isLoading,
    error,
    loadBugs,
    selectBug,
    startWatching,
    stopWatching,
  } = useSharedBugStore();

  // bugs-view-unification Task 8.3: Use shared agentStore for running agent counts (Requirements: 6.4)
  const { getAgentsForSpec } = useSharedAgentStore();

  // bugs-view-unification Task 8.2: Use shared filtering/sorting logic with phase filter enabled (Requirements: 6.3)
  const {
    filteredBugs,
    phaseFilter,
    setPhaseFilter,
    searchQuery,
    setSearchQuery,
  } = useBugListLogic({
    bugs,
    enableTextSearch: true,
    initialPhaseFilter: 'all',
  });

  // bugs-view-unification Task 8.1: Load bugs and start watching on mount (Requirements: 6.2)
  useEffect(() => {
    // Load initial bugs
    loadBugs(apiClient);

    // Start watching for changes
    startWatching(apiClient);

    // Cleanup: stop watching on unmount
    return () => {
      stopWatching(apiClient);
    };
  }, [apiClient, loadBugs, startWatching, stopWatching]);

  // bugs-view-unification Task 8.3: Get running agent count for a bug (Requirements: 6.4)
  const getRunningAgentCount = (bugName: string): number => {
    const agents = getAgentsForSpec(`bug:${bugName}`);
    return agents.filter((a) => a.status === 'running').length;
  };

  // Handle bug selection
  // bugs-view-unification Task 8.1: Use shared store's selectBug (Requirements: 6.2)
  const handleSelectBug = (bug: BugMetadata): void => {
    // Call shared store's selectBug (which handles switchAgentWatchScope)
    selectBug(apiClient, bug.name);

    // Also notify parent component
    // Find the original bug with path from bugs array
    const bugWithPath = bugs.find((b) => b.name === bug.name) as BugMetadataWithPath | undefined;
    if (bugWithPath) {
      onSelectBug?.(bugWithPath);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="bugs-view">
      {/* remote-ui-vanilla-removal: Added wrapper for E2E */}
      <div data-testid="remote-bug-list" className="h-full">
        <BugListContainer
          bugs={filteredBugs}
          selectedBugName={selectedBugId}
          onSelectBug={handleSelectBug}
          isLoading={isLoading}
          error={error}
          // bugs-view-unification Task 8.2: Enable phase filter (Requirements: 6.3)
          showPhaseFilter={true}
          phaseFilter={phaseFilter}
          onPhaseFilterChange={setPhaseFilter}
          // Enable text search
          showSearch={true}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          // bugs-view-unification Task 8.3: Provide agent count function (Requirements: 6.4)
          getRunningAgentCount={getRunningAgentCount}
          deviceType={deviceType}
          testIdPrefix="bugs-view"
        />
      </div>
    </div>
  );
}

export default BugsView;
