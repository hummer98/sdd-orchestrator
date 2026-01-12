/**
 * BugListItem Component
 * Displays a single bug item in the bug list
 * Requirements: 2.2, 3.2, 3.3, 3.4
 */

import { useState } from 'react';
import { Copy, Check, Bot } from 'lucide-react';
import { clsx } from 'clsx';
import type { BugMetadata, BugPhase } from '../types';

const PHASE_LABELS: Record<BugPhase, string> = {
  reported: '報告済',
  analyzed: '分析済',
  fixed: '修正済',
  verified: '検証済',
};

const PHASE_COLORS: Record<BugPhase, string> = {
  reported: 'bg-red-100 text-red-700',
  analyzed: 'bg-yellow-100 text-yellow-700',
  fixed: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
};

interface BugListItemProps {
  bug: BugMetadata;
  isSelected: boolean;
  onSelect: () => void;
  /** Number of running agents for this bug (optional) */
  runningAgentCount?: number;
}

/**
 * BugListItem displays a single bug in the bug list
 * - Bug name with copy button
 * - Phase badge (SpecListItem-style)
 * - Update time
 * - Selection highlight
 */
export function BugListItem({ bug, isSelected, onSelect, runningAgentCount }: BugListItemProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const updatedDate = new Date(bug.updatedAt);
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

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bug.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        data-testid={`bug-item-${bug.name}`}
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
        {/* Row 1: Bug name and copy button */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {bug.name}
          </span>
          <button
            onClick={handleCopy}
            className={clsx(
              'p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'transition-colors shrink-0'
            )}
            title="バグ名をコピー"
            data-testid={`copy-button-${bug.name}`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" data-testid="copy-check" />
            ) : (
              <Copy className="w-3.5 h-3.5" data-testid="copy-icon" />
            )}
          </button>
        </div>

        {/* Row 2: Phase badge, running agent count, and update time */}
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'px-2 py-0.5 text-xs rounded-full',
              PHASE_COLORS[bug.phase]
            )}
          >
            {PHASE_LABELS[bug.phase]}
          </span>
          {runningAgentCount !== undefined && runningAgentCount > 0 && (
            <span
              data-testid="running-agent-count"
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

export default BugListItem;
