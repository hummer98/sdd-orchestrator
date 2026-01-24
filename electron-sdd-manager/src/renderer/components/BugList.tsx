/**
 * BugList Component
 * Displays list of bugs with filtering and selection
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 6.1, 6.3, 6.5
 *
 * bugs-view-unification Task 4.1: 共有コンポーネントを使用するよう更新
 */

// bugs-view-unification Task 6.1: Use shared bugStore with ApiClient
import { useSharedBugStore } from '../../shared/stores/bugStore';
import { useAgentStore } from '../stores/agentStore';
import { BugListContainer } from '@shared/components/bug/BugListContainer';
import { useBugListLogic } from '@shared/hooks/useBugListLogic';
import { useApi } from '../../shared/api/ApiClientProvider';
import type { BugMetadata } from '../types';

/**
 * BugList displays the list of bugs with filtering
 * - Shows bug list from bugStore
 * - Filter by phase
 * - Selection and detail display
 * Note: Selected bug name is displayed in App header (Spec-like behavior)
 *
 * bugs-view-unification: Refactored to use BugListContainer and useBugListLogic
 */
export function BugList(): React.ReactElement {
  // bugs-view-unification Task 6.1: Use shared bugStore with ApiClient
  const apiClient = useApi();
  const {
    bugs,
    selectedBugId,
    isLoading,
    error,
    selectBug,
  } = useSharedBugStore();

  // Get agent store for running agent counts
  const { getAgentsForSpec } = useAgentStore();

  // Use shared filtering/sorting logic (Requirements: 2.1, 2.3, 2.4)
  const {
    filteredBugs,
    phaseFilter,
    setPhaseFilter,
  } = useBugListLogic({
    bugs,
    initialPhaseFilter: 'all',
  });

  // Get running agent count for a bug (Requirements: 1.8)
  const getRunningAgentCount = (bugName: string): number => {
    const agents = getAgentsForSpec(`bug:${bugName}`);
    return agents.filter((a) => a.status === 'running').length;
  };

  // Handle bug selection
  // bugs-view-unification Task 6.1: selectBug takes (apiClient, bugId)
  const handleSelectBug = (bug: BugMetadata): void => {
    selectBug(apiClient, bug.name);
  };

  return (
    <BugListContainer
      bugs={filteredBugs}
      selectedBugName={selectedBugId}
      onSelectBug={handleSelectBug}
      isLoading={isLoading}
      error={error}
      showPhaseFilter={true}
      phaseFilter={phaseFilter}
      onPhaseFilterChange={setPhaseFilter}
      getRunningAgentCount={getRunningAgentCount}
    />
  );
}

export default BugList;
