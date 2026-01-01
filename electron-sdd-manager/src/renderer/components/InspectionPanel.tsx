/**
 * InspectionPanel Component
 * Displays inspection workflow controls and status
 * Feature: inspection-workflow-ui Task 2, 2.1, 2.2, 2.3, 2.4
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 7.1, 7.2, 7.3, 7.4
 */

import { clsx } from 'clsx';
import {
  ClipboardCheck,
  Loader2,
  Play,
  Check,
  Circle,
  ArrowRight,
  Ban,
  PlayCircle,
  Wrench,
} from 'lucide-react';
import type {
  MultiRoundInspectionState,
  InspectionAutoExecutionFlag,
  InspectionProgressIndicatorState,
} from '../types/inspection';
import { getLatestRoundDetail, getInspectionProgressIndicatorState } from '../types/inspection';

// ============================================================
// Task 2: Props interface
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10
// ============================================================

export interface InspectionPanelProps {
  /** Current inspection state from spec.json (multi-round structure) */
  inspectionState: MultiRoundInspectionState | null;
  /** Whether inspection is currently executing (Agent running) */
  isExecuting: boolean;
  /** Whether auto execution is running (global workflow auto execution) */
  isAutoExecuting?: boolean;
  /** Auto execution flag (run/pause/skip) */
  autoExecutionFlag?: InspectionAutoExecutionFlag;
  /** Whether inspection can be executed (tasks approved and 100% complete) */
  canExecuteInspection?: boolean;
  /** Handler for starting a new inspection round */
  onStartInspection: () => void;
  /** Handler for executing fix for a specific round */
  onExecuteFix?: (roundNumber: number) => void;
  /** Handler for auto execution flag change */
  onAutoExecutionFlagChange?: (flag: InspectionAutoExecutionFlag) => void;
}

// ============================================================
// Task 2.2: Progress indicator rendering
// Requirements: 7.1, 7.2, 7.3, 7.4
// ============================================================

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
        <Loader2
          data-testid="inspection-progress-indicator-executing"
          className="w-4 h-4 text-blue-500 animate-spin"
        />
      );
    case 'skip-scheduled':
      return (
        <ArrowRight
          data-testid="inspection-progress-indicator-skip-scheduled"
          className="w-4 h-4 text-yellow-500"
        />
      );
  }
}

// ============================================================
// Task 2.4: Auto execution flag control helpers
// Requirements: 1.10, 5.1
// ============================================================

function getNextAutoExecutionFlag(
  current: InspectionAutoExecutionFlag
): InspectionAutoExecutionFlag {
  switch (current) {
    case 'run':
      return 'pause';
    case 'pause':
      return 'skip';
    case 'skip':
      return 'run';
  }
}

function renderAutoExecutionFlagIcon(flag: InspectionAutoExecutionFlag): React.ReactNode {
  switch (flag) {
    case 'run':
      return (
        <PlayCircle
          data-testid="inspection-auto-flag-run"
          className="w-4 h-4 text-green-500"
        />
      );
    case 'pause':
      return (
        <Ban
          data-testid="inspection-auto-flag-pause"
          className="w-4 h-4 text-yellow-500"
        />
      );
    case 'skip':
      return (
        <ArrowRight
          data-testid="inspection-auto-flag-skip"
          className="w-4 h-4 text-gray-400"
        />
      );
  }
}

function getAutoExecutionFlagTooltip(flag: InspectionAutoExecutionFlag): string {
  switch (flag) {
    case 'run':
      return '自動実行: 実行';
    case 'pause':
      return '自動実行: 一時停止';
    case 'skip':
      return '自動実行: スキップ';
  }
}

// ============================================================
// Task 2.3: GO/NOGO badge rendering
// Requirements: 1.4, 1.5
// ============================================================

function renderGoNogoBadge(passed: boolean | null): React.ReactNode {
  if (passed === null) {
    return null;
  }

  if (passed) {
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

// ============================================================
// Task 2: InspectionPanel Component
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10
// ============================================================

export function InspectionPanel({
  inspectionState,
  isExecuting,
  isAutoExecuting = false,
  autoExecutionFlag = 'run',
  canExecuteInspection = true,
  onStartInspection,
  onExecuteFix,
  onAutoExecutionFlagChange,
}: InspectionPanelProps) {
  const rounds = inspectionState?.rounds ?? 0;
  const currentRound = inspectionState?.currentRound;

  // Buttons are disabled when executing, auto-executing, or inspection not allowed
  const canExecute = !isExecuting && !isAutoExecuting && canExecuteInspection;

  // Get latest round to determine GO/NOGO status and action buttons
  const latestRound = getLatestRoundDetail(inspectionState);
  const latestPassed = latestRound?.passed ?? null;
  const latestFixApplied = latestRound?.fixApplied ?? false;

  // Calculate progress indicator state
  const progressIndicatorState = getInspectionProgressIndicatorState(
    inspectionState,
    isExecuting,
    autoExecutionFlag
  );

  // Determine which action button to show
  // Priority:
  // 1. Fix button: when NOGO and fixApplied is false
  // 2. Inspection start button: when GO, or NOGO with fixApplied, or no rounds yet
  const showFixButton = latestPassed === false && !latestFixApplied;

  // Handle auto execution flag toggle
  const handleAutoExecutionFlagClick = () => {
    if (onAutoExecutionFlagChange) {
      const nextFlag = getNextAutoExecutionFlag(autoExecutionFlag);
      onAutoExecutionFlagChange(nextFlag);
    }
  };

  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {/* Left side: Progress indicator + Icon + Title + GO/NOGO badge */}
        <div className="flex items-center gap-2">
          {/* Task 2.2: Progress indicator (title left side) */}
          <span className="p-1">{renderProgressIndicator(progressIndicatorState)}</span>

          <ClipboardCheck className="w-5 h-5 text-teal-500" />
          <h3 className="font-medium text-gray-800 dark:text-gray-200">Inspection</h3>

          {/* Task 2.3: GO/NOGO badge */}
          {renderGoNogoBadge(latestPassed)}
        </div>

        {/* Right side: Auto execution flag control */}
        {/* Task 2.4: Auto execution flag control (title right side) */}
        <button
          data-testid="inspection-auto-execution-flag-control"
          onClick={handleAutoExecutionFlagClick}
          className={clsx(
            'p-1 rounded',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'transition-colors'
          )}
          title={getAutoExecutionFlagTooltip(autoExecutionFlag)}
        >
          {renderAutoExecutionFlagIcon(autoExecutionFlag)}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
        <span>
          ラウンド:{' '}
          <strong className="text-gray-800 dark:text-gray-200">{rounds}</strong>
        </span>
        {currentRound && (
          <span>
            現在: <strong className="text-blue-500">Round {currentRound}</strong>
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {showFixButton ? (
          <button
            onClick={() => onExecuteFix?.(latestRound?.roundNumber ?? 1)}
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
            Fix実行 (Round {latestRound?.roundNumber ?? 1})
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
            <Play className="w-4 h-4" />
            Inspection開始
          </button>
        )}
      </div>
    </div>
  );
}
