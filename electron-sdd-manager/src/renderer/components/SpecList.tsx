/**
 * SpecList Component
 * Displays list of specifications with sorting and filtering
 * Task 33.1: Added running agent count display
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * spec-metadata-ssot-refactor: Updated to use SpecMetadataWithPhase
 * git-worktree-support: Task 11.2 - Pass worktree info from specJsonMap (Requirements: 4.1)
 * spec-list-unification: Refactored to use shared SpecListContainer
 */

import { useShallow } from 'zustand/react/shallow';
import { useCallback } from 'react';
import { useSpecStore } from '../stores/specStore';
import { useSharedAgentStore } from '@shared/stores/agentStore';
import { SpecListContainer } from '@shared/components/spec';
import type { SpecMetadataWithPhase } from '@shared/types/spec';

export function SpecList() {
  // zustand-selector-optimization: useShallow for state fields, individual selectors for actions
  const { selectedSpec, statusFilter, isLoading, error, specJsonMap } = useSpecStore(
    useShallow(s => ({ selectedSpec: s.selectedSpec, statusFilter: s.statusFilter, isLoading: s.isLoading, error: s.error, specJsonMap: s.specJsonMap }))
  );
  const selectSpec = useSpecStore(s => s.selectSpec);
  const setStatusFilter = useSpecStore(s => s.setStatusFilter);
  const getSortedFilteredSpecs = useSpecStore(s => s.getSortedFilteredSpecs);

  // agent-facade-action-only Task 4.5: Use SSOT getRunningAgentCount
  // Subscribe to agents for reactivity (re-render when agents change)
  const agents = useSharedAgentStore(s => s.agents);
  const getRunningAgentCount = useCallback((specId: string) => {
    const agentList = agents.get(specId) || [];
    return agentList.filter((a) => a.status === 'running').length;
  }, [agents]);

  const specs = getSortedFilteredSpecs();

  // Handle spec selection - convert SpecMetadataWithPhase to SpecMetadata for store
  const handleSelectSpec = (spec: SpecMetadataWithPhase) => {
    selectSpec({ name: spec.name });
  };

  return (
    <SpecListContainer
      specs={specs}
      selectedSpecName={selectedSpec?.name}
      onSelectSpec={handleSelectSpec}
      isLoading={isLoading}
      error={error}
      specJsonMap={specJsonMap}
      showPhaseFilter={true}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      getRunningAgentCount={getRunningAgentCount}
      showDocumentReview={true}
      testIdPrefix="spec-list"
    />
  );
}
