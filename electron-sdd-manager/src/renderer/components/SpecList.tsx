/**
 * SpecList Component
 * Displays list of specifications with sorting and filtering
 * Task 33.1: Added running agent count display
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { Filter, Loader2, Bot } from 'lucide-react';
import { useSpecStore } from '../stores/specStore';
import { useAgentStore } from '../stores/agentStore';
import { clsx } from 'clsx';
import type { SpecMetadata, SpecPhase } from '../types';

const PHASE_LABELS: Record<SpecPhase, string> = {
  initialized: '初期化',
  'requirements-generated': '要件定義済',
  'design-generated': '設計済',
  'tasks-generated': 'タスク済',
  'implementation-in-progress': '実装中',
  'implementation-complete': '実装完了',
};

const PHASE_COLORS: Record<SpecPhase, string> = {
  initialized: 'bg-gray-200 text-gray-700',
  'requirements-generated': 'bg-blue-100 text-blue-700',
  'design-generated': 'bg-yellow-100 text-yellow-700',
  'tasks-generated': 'bg-orange-100 text-orange-700',
  'implementation-in-progress': 'bg-purple-100 text-purple-700',
  'implementation-complete': 'bg-green-100 text-green-700',
};

export function SpecList() {
  const {
    selectedSpec,
    statusFilter,
    isLoading,
    error,
    selectSpec,
    setStatusFilter,
    getSortedFilteredSpecs,
  } = useSpecStore();

  // Task 33.1: Get agent store for running agent counts
  const { getAgentsForSpec } = useAgentStore();

  const specs = getSortedFilteredSpecs();

  return (
    <div className="flex flex-col h-full">
      {/* Filter - ヘッダーはSpecListHeaderに分離済み */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SpecPhase | 'all')}
            className={clsx(
              'flex-1 px-2 py-1 text-sm rounded',
              'bg-gray-100 dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            <option value="all">すべて</option>
            <option value="initialized">初期化</option>
            <option value="requirements-generated">要件定義済</option>
            <option value="design-generated">設計済</option>
            <option value="tasks-generated">タスク済</option>
            <option value="implementation-in-progress">実装中</option>
            <option value="implementation-complete">実装完了</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500">{error}</div>
        ) : specs.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            仕様がありません
          </div>
        ) : (
          <ul>
            {specs.map((spec) => {
              // Task 33.1: Count running agents for this spec
              const agents = getAgentsForSpec(spec.name);
              const runningAgentCount = agents.filter(
                (a) => a.status === 'running'
              ).length;

              return (
                <SpecListItem
                  key={spec.name}
                  spec={spec}
                  isSelected={selectedSpec?.name === spec.name}
                  onSelect={() => selectSpec(spec)}
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

interface SpecListItemProps {
  spec: SpecMetadata;
  isSelected: boolean;
  onSelect: () => void;
  runningAgentCount: number;
}

function SpecListItem({ spec, isSelected, onSelect, runningAgentCount }: SpecListItemProps) {
  const updatedDate = new Date(spec.updatedAt);
  const now = new Date();
  const isToday = updatedDate.toDateString() === now.toDateString();

  const formattedDate = isToday
    ? updatedDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : updatedDate.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });

  const tooltipDate = updatedDate.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li>
      <button
        onClick={onSelect}
        className={clsx(
          'w-full px-4 py-2.5 text-left',
          'flex flex-col gap-1',
          'border-b border-gray-100 dark:border-gray-800',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors',
          isSelected && 'bg-blue-100 dark:bg-blue-800/40 border-l-4 border-l-blue-500'
        )}
      >
        {/* 1行目: 名前とエージェント数 */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {spec.name}
          </span>
          {runningAgentCount > 0 && (
            <span
              data-testid={`agent-count-${spec.name}`}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
            >
              <Bot className="w-3 h-3" />
              {runningAgentCount}
            </span>
          )}
        </div>

        {/* 2行目: フェーズと更新日時 */}
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'px-2 py-0.5 text-xs rounded-full',
              PHASE_COLORS[spec.phase]
            )}
          >
            {PHASE_LABELS[spec.phase]}
          </span>
          <span
            className="text-xs text-gray-400"
            title={tooltipDate}
          >
            {formattedDate}
          </span>
        </div>
      </button>
    </li>
  );
}
