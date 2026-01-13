/**
 * SpecList Component
 * Displays list of specifications with sorting and filtering
 * Task 33.1: Added running agent count display
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * spec-metadata-ssot-refactor: Updated to use SpecMetadataWithPhase
 * git-worktree-support: Task 11.2 - Pass worktree info from specJsonMap (Requirements: 4.1)
 */

import { Filter, Loader2, Bot, Copy, Check, GitBranch } from 'lucide-react';
import { useState } from 'react';
import { useSpecStore } from '../stores/specStore';
import { useAgentStore } from '../stores/agentStore';
import { clsx } from 'clsx';
import type { SpecPhase } from '../types';
import type { WorktreeConfig } from '../types/worktree';
import type { SpecMetadataWithPhase } from '../stores/spec/types';

/**
 * Phase labels for SpecList display
 * spec-phase-auto-update: Added 'inspection-complete' and 'deploy-complete'
 */
const PHASE_LABELS: Record<SpecPhase, string> = {
  initialized: '初期化',
  'requirements-generated': '要件定義済',
  'design-generated': '設計済',
  'tasks-generated': 'タスク済',
  'implementation-complete': '実装完了',
  'inspection-complete': '検査完了',   // spec-phase-auto-update
  'deploy-complete': 'デプロイ完了',   // spec-phase-auto-update
};

/**
 * Phase colors for SpecList display
 * spec-phase-auto-update: Added 'inspection-complete' and 'deploy-complete'
 */
const PHASE_COLORS: Record<SpecPhase, string> = {
  initialized: 'bg-gray-200 text-gray-700',
  'requirements-generated': 'bg-blue-100 text-blue-700',
  'design-generated': 'bg-yellow-100 text-yellow-700',
  'tasks-generated': 'bg-orange-100 text-orange-700',
  'implementation-complete': 'bg-green-100 text-green-700',
  'inspection-complete': 'bg-purple-100 text-purple-700',  // spec-phase-auto-update
  'deploy-complete': 'bg-emerald-100 text-emerald-700',    // spec-phase-auto-update
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
    specJsonMap,
  } = useSpecStore();

  // Task 33.1: Get agent store for running agent counts
  const { getAgentsForSpec } = useAgentStore();

  const specs = getSortedFilteredSpecs();

  return (
    <div className="flex flex-col h-full" data-testid="spec-list">
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
              'text-gray-700 dark:text-gray-300',
              'border border-gray-200 dark:border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            data-testid="status-filter"
          >
            <option value="all">すべて</option>
            <option value="initialized">初期化</option>
            <option value="requirements-generated">要件定義済</option>
            <option value="design-generated">設計済</option>
            <option value="tasks-generated">タスク済</option>
            <option value="implementation-complete">実装完了</option>
            <option value="inspection-complete">検査完了</option>
            <option value="deploy-complete">デプロイ完了</option>
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
          <ul data-testid="spec-list-items">
            {specs.map((spec) => {
              // Task 33.1: Count running agents for this spec
              const agents = getAgentsForSpec(spec.name);
              const runningAgentCount = agents.filter(
                (a) => a.status === 'running'
              ).length;

              // git-worktree-support: Task 11.2 - Get worktree info from specJsonMap
              const specJson = specJsonMap.get(spec.name);
              const worktree = specJson?.worktree;

              return (
                <SpecListItem
                  key={spec.name}
                  spec={spec}
                  isSelected={selectedSpec?.name === spec.name}
                  onSelect={() => selectSpec(spec)}
                  runningAgentCount={runningAgentCount}
                  worktree={worktree}
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
  /** spec-metadata-ssot-refactor: Updated to use SpecMetadataWithPhase */
  spec: SpecMetadataWithPhase;
  isSelected: boolean;
  onSelect: () => void;
  runningAgentCount: number;
  /** git-worktree-support: Task 11.2 - worktree config (Requirements: 4.1) */
  worktree?: WorktreeConfig;
}

function SpecListItem({ spec, isSelected, onSelect, runningAgentCount, worktree }: SpecListItemProps) {
  const [copied, setCopied] = useState(false);
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
    <li data-testid={`spec-item-${spec.name}`}>
      <div
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
        {/* 1行目: 名前とコピーボタン */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {spec.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(spec.name);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={clsx(
              'p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'transition-colors shrink-0'
            )}
            title="仕様名をコピー"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* 2行目: フェーズ、worktreeバッジ、エージェント数、更新日時 */}
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'px-2 py-0.5 text-xs rounded-full',
              PHASE_COLORS[spec.phase] ?? 'bg-gray-200 text-gray-700'
            )}
          >
            {PHASE_LABELS[spec.phase] ?? spec.phase}
          </span>
          {/* git-worktree-support: Task 11.1 - worktree badge */}
          {worktree && (
            <span
              data-testid={`worktree-badge-${spec.name}`}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-violet-100 text-violet-700 rounded"
              title={`Path: ${worktree.path}\nBranch: ${worktree.branch}`}
            >
              <GitBranch className="w-3 h-3" />
              worktree
            </span>
          )}
          {runningAgentCount > 0 && (
            <span
              data-testid={`agent-count-${spec.name}`}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
            >
              <Bot className="w-3 h-3" />
              {runningAgentCount}
            </span>
          )}
          <span
            className="text-xs text-gray-400"
            title={tooltipDate}
          >
            {formattedDate}
          </span>
        </div>
      </div>
    </li>
  );
}
