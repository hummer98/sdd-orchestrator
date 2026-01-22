/**
 * InspectionPanel Component (Shared)
 *
 * Task 4.6: DocumentReview・Inspection・Validation関連コンポーネントを共有化する
 * inspection-permission-unification Task 5.1, 5.2: Removed run/pause toggle button
 *
 * Inspectionワークフローの制御とステータス表示を行うコンポーネント。
 * props-driven設計で、ストア非依存。Electron版とRemote UI版で共有可能。
 */

import { clsx } from 'clsx';
import { Bot, Check, Circle, Wrench } from 'lucide-react';
// inspection-permission-unification Task 5.1: Pause and PlayCircle icons removed
import { AgentIcon } from '../ui/AgentIcon';
import type {
  InspectionState,
  InspectionProgressIndicatorState,
} from '../../types';
// inspection-permission-unification Task 5.1: InspectionAutoExecutionFlag import removed
import {
  getLatestRound,
  getRoundCount,
  needsFix,
  getInspectionProgressIndicatorState,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

/**
 * inspection-permission-unification Task 5.2: Simplified props
 * Removed autoExecutionFlag and onAutoExecutionFlagChange
 * Requirements: 5.1, 5.2
 */
export interface InspectionPanelProps {
  /** Current inspection state from spec.json (new simplified structure) */
  inspectionState: InspectionState | null;
  /** Whether inspection is currently executing (Agent running) */
  isExecuting: boolean;
  /** Whether auto execution is running (global workflow auto execution) */
  isAutoExecuting?: boolean;
  // autoExecutionFlag prop removed - use permissions.inspection instead
  /** Whether inspection can be executed (tasks approved and 100% complete) */
  canExecuteInspection?: boolean;
  /** Handler for starting a new inspection round */
  onStartInspection: () => void;
  /** Handler for executing fix for a specific round */
  onExecuteFix?: (roundNumber: number) => void;
  // onAutoExecutionFlagChange prop removed - use toggleAutoPermission('inspection') instead
  // agent-launch-optimistic-ui: Optimistic UI launching state
  /** Whether an operation is being launched (Optimistic UI) */
  launching?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function renderProgressIndicator(state: InspectionProgressIndicatorState): React.ReactNode {
  switch (state) {
    case 'checked':
      return (
        <Check
          data-testid="inspection-progress-indicator-checked"
          className="w-4 h-4 text-green-500"
        />
      );
    case 'unchecked':
      return (
        <Circle
          data-testid="inspection-progress-indicator-unchecked"
          className="w-4 h-4 text-gray-300 dark:text-gray-600"
        />
      );
    case 'executing':
      return (
        <Bot
          data-testid="inspection-progress-indicator-executing"
          className="w-4 h-4 text-blue-500 animate-pulse"
        />
      );
  }
}

// inspection-permission-unification Task 5.1:
// getNextAutoExecutionFlag, renderAutoExecutionFlagIcon, getAutoExecutionFlagTooltip removed
// Auto execution toggle is now handled via permissions.inspection in PhaseItem checkbox

function renderGoNogoBadge(result: 'go' | 'nogo' | null): React.ReactNode {
  if (result === null) {
    return null;
  }

  if (result === 'go') {
    return (
      <span
        data-testid="go-nogo-badge-go"
        className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      >
        GO
      </span>
    );
  }

  return (
    <span
      data-testid="go-nogo-badge-nogo"
      className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    >
      NOGO
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * inspection-permission-unification Task 5.1, 5.2: Simplified component
 * Removed autoExecutionFlag prop and toggle button
 */
export function InspectionPanel({
  inspectionState,
  isExecuting,
  isAutoExecuting = false,
  // autoExecutionFlag prop removed
  canExecuteInspection = true,
  onStartInspection,
  onExecuteFix,
  // onAutoExecutionFlagChange prop removed
  // agent-launch-optimistic-ui: Optimistic UI launching state
  launching = false,
}: InspectionPanelProps) {
  // Get round count from new structure
  const roundCount = getRoundCount(inspectionState);

  // Buttons are disabled when launching, executing, auto-executing, or inspection not allowed
  const canExecute = !launching && !isExecuting && !isAutoExecuting && canExecuteInspection;

  // Get latest round to determine GO/NOGO status and action buttons
  const latestRound = getLatestRound(inspectionState);
  const latestResult = latestRound?.result ?? null;

  // Calculate progress indicator state
  // inspection-permission-unification: Pass 'run' as default since toggle is removed
  const progressIndicatorState = getInspectionProgressIndicatorState(
    inspectionState,
    isExecuting,
    'run'  // Default flag, no longer configurable
  );

  // Determine which action button to show using new helper function
  // Fix button: when NOGO and fixedAt is not set
  // Inspection button: when no rounds, GO, or NOGO with fixedAt set
  const showFixButton = needsFix(inspectionState);

  // inspection-permission-unification: handleAutoExecutionFlagClick removed

  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      {/* inspection-permission-unification Task 5.2: Removed toggle button */}
      <div className="flex items-center justify-between mb-3">
        {/* Left side: Progress indicator + Icon + Title + GO/NOGO badge */}
        <div className="flex items-center gap-2">
          {/* Progress indicator (title left side) */}
          <span className="p-1">{renderProgressIndicator(progressIndicatorState)}</span>

          <h3 className="font-medium text-gray-800 dark:text-gray-200">Inspection</h3>

          {/* GO/NOGO badge */}
          {renderGoNogoBadge(latestResult)}
        </div>

        {/* inspection-permission-unification: Auto execution toggle button removed */}
        {/* Auto execution permission is now controlled via impl phase checkbox */}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
        <span>
          ラウンド:{' '}
          <strong className="text-gray-800 dark:text-gray-200">{roundCount}</strong>
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {showFixButton ? (
          <button
            onClick={() => onExecuteFix?.(latestRound?.number ?? 1)}
            disabled={!canExecute}
            data-testid="execute-fix-button"
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              canExecute
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
          >
            <Wrench className="w-4 h-4" />
            Fix実行 (Round {latestRound?.number ?? 1})
          </button>
        ) : (
          <button
            onClick={onStartInspection}
            disabled={!canExecute}
            data-testid="start-inspection-button"
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              canExecute
                ? 'bg-teal-500 text-white hover:bg-teal-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
          >
            <AgentIcon data-testid="start-inspection-agent-icon" />
            Inspection開始
          </button>
        )}
      </div>
    </div>
  );
}
