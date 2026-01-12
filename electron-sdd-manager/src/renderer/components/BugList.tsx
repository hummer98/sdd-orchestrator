/**
 * BugList Component
 * Displays list of bugs with filtering and selection
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 6.1, 6.3, 6.5
 */

import { Filter, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useBugStore } from '../stores/bugStore';
import { useAgentStore } from '../stores/agentStore';
import { BugListItem } from './BugListItem';
import type { BugPhase } from '../types';

const PHASE_LABELS: Record<BugPhase | 'all', string> = {
  all: 'すべて',
  reported: '報告済',
  analyzed: '分析済',
  fixed: '修正済',
  verified: '検証済',
};

/**
 * BugList displays the list of bugs with filtering
 * - Shows bug list from bugStore
 * - Filter by phase
 * - Selection and detail display
 * Note: Selected bug name is displayed in App header (Spec-like behavior)
 */
export function BugList(): React.ReactElement {
  const {
    selectedBug,
    isLoading,
    error,
    selectBug,
    getSortedBugs,
    getBugsByPhase,
  } = useBugStore();

  // Get agent store for running agent counts
  const { getAgentsForSpec } = useAgentStore();

  const [phaseFilter, setPhaseFilter] = useState<BugPhase | 'all'>('all');

  // Get filtered and sorted bugs
  const allBugs = getSortedBugs();
  const filteredBugs = phaseFilter === 'all' ? allBugs : getBugsByPhase(phaseFilter);

  // Sort filtered bugs by updatedAt descending
  const sortedBugs = [...filteredBugs].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="flex flex-col h-full" data-testid="bug-list">
      {/* Filter */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as BugPhase | 'all')}
            className={clsx(
              'flex-1 px-2 py-1 text-sm rounded',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'border border-gray-200 dark:border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            data-testid="phase-filter"
          >
            {(Object.entries(PHASE_LABELS) as [BugPhase | 'all', string][]).map(([phase, label]) => (
              <option key={phase} value={phase}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32" data-testid="loading-indicator">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500" data-testid="error-message">
            {error}
          </div>
        ) : sortedBugs.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center" data-testid="empty-message">
            {phaseFilter === 'all'
              ? 'バグがありません'
              : `${PHASE_LABELS[phaseFilter]}のバグはありません`}
          </div>
        ) : (
          <ul data-testid="bug-list-items">
            {sortedBugs.map((bug) => {
              // Count running agents for this bug
              const agents = getAgentsForSpec(`bug:${bug.name}`);
              const runningAgentCount = agents.filter(
                (a) => a.status === 'running'
              ).length;

              return (
                <BugListItem
                  key={bug.name}
                  bug={bug}
                  isSelected={selectedBug?.name === bug.name}
                  onSelect={() => selectBug(bug)}
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

export default BugList;
