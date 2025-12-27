/**
 * BugWorkflowView Component
 * Displays bug workflow with 5 phases and execution controls
 * Task 3: bugs-pane-integration
 * Task 4: bugs-workflow-auto-execution
 * Requirements: 3.1, 3.2, 3.3, 4.1-4.7, 6.2, 6.4
 * Requirements: 1.1-1.6, 6.1 (auto execution)
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { ArrowDown, Play, Square } from 'lucide-react';
import { clsx } from 'clsx';
import { useBugStore } from '../stores/bugStore';
import { useAgentStore } from '../stores/agentStore';
import { BugPhaseItem } from './BugPhaseItem';
import { BugAutoExecutionStatusDisplay } from './BugAutoExecutionStatusDisplay';
import {
  BUG_WORKFLOW_PHASES,
  BUG_WORKFLOW_PHASE_LABELS,
  BUG_PHASE_COMMANDS,
  type BugWorkflowPhase,
  type BugPhaseStatus,
  type BugDetail,
} from '../types/bug';
import { notify } from '../stores';
import { getBugAutoExecutionService } from '../services/BugAutoExecutionService';
import type { BugAutoExecutionStatus } from '../types/bugAutoExecution';

/**
 * Task 3.1: フェーズステータス算出ロジック
 * Requirements: 3.3
 */
function calculatePhaseStatus(
  phase: BugWorkflowPhase,
  bugDetail: BugDetail | null,
  runningPhases: Set<string>
): BugPhaseStatus {
  if (runningPhases.has(phase)) {
    return 'executing';
  }

  if (!bugDetail) {
    return 'pending';
  }

  switch (phase) {
    case 'report':
      return bugDetail.artifacts.report?.exists ? 'completed' : 'pending';
    case 'analyze':
      return bugDetail.artifacts.analysis?.exists ? 'completed' : 'pending';
    case 'fix':
      return bugDetail.artifacts.fix?.exists ? 'completed' : 'pending';
    case 'verify':
      return bugDetail.artifacts.verification?.exists ? 'completed' : 'pending';
    case 'deploy':
      // Deploy is always pending or executing (no file to check)
      return 'pending';
    default:
      return 'pending';
  }
}

export function BugWorkflowView() {
  const { selectedBug, bugDetail } = useBugStore();
  const agents = useAgentStore((state) => state.agents);
  const getAgentsForBug = useAgentStore((state) => state.getAgentsForSpec);

  // ============================================================
  // Task 4: Auto execution state
  // Requirements: 1.1-1.6, 6.1
  // ============================================================
  const [autoExecutionStatus, setAutoExecutionStatus] = useState<BugAutoExecutionStatus>('idle');
  const [currentAutoPhase, setCurrentAutoPhase] = useState<BugWorkflowPhase | null>(null);
  const [lastFailedPhase, setLastFailedPhase] = useState<BugWorkflowPhase | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Update auto execution state periodically
  useEffect(() => {
    const updateState = () => {
      const service = getBugAutoExecutionService();
      setAutoExecutionStatus(service.getStatus());
      setCurrentAutoPhase(service.getCurrentPhase());
      setLastFailedPhase(service.getLastFailedPhase());
      setRetryCount(service.getRetryCount());
    };

    // Update immediately
    updateState();

    // Update on interval while auto-executing
    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, []);

  const isAutoExecuting = autoExecutionStatus === 'running' || autoExecutionStatus === 'paused';

  // Get running phases for the selected bug
  const runningPhases = useMemo(() => {
    if (!selectedBug) return new Set<string>();
    const bugAgents = getAgentsForBug(selectedBug.name);
    const running = bugAgents
      .filter((a) => a.status === 'running')
      .map((a) => a.phase);
    return new Set(running);
  }, [agents, selectedBug, getAgentsForBug]);

  // Calculate phase statuses
  const phaseStatuses = useMemo(() => {
    const statuses: Record<BugWorkflowPhase, BugPhaseStatus> = {} as Record<BugWorkflowPhase, BugPhaseStatus>;
    for (const phase of BUG_WORKFLOW_PHASES) {
      statuses[phase] = calculatePhaseStatus(phase, bugDetail, runningPhases);
    }
    return statuses;
  }, [bugDetail, runningPhases]);

  // Check if a phase can be executed
  const canExecutePhase = useCallback(
    (phase: BugWorkflowPhase): boolean => {
      // Cannot execute if already running or auto-executing
      if (runningPhases.size > 0 || isAutoExecuting) return false;

      // Report has no execute button, so always false
      if (phase === 'report') return false;

      // For other phases, check if previous phase is completed
      const index = BUG_WORKFLOW_PHASES.indexOf(phase);
      if (index <= 0) return true;

      const prevPhase = BUG_WORKFLOW_PHASES[index - 1];
      return phaseStatuses[prevPhase] === 'completed';
    },
    [runningPhases, phaseStatuses, isAutoExecuting]
  );

  // Task 3.3: フェーズ実行機能
  // Requirements: 4.1-4.5, 6.4
  // Use startAgent directly with appropriate command formatting
  const handleExecutePhase = useCallback(async (phase: BugWorkflowPhase) => {
    if (!selectedBug) return;

    const commandTemplate = BUG_PHASE_COMMANDS[phase];
    if (!commandTemplate) return; // Report phase has no command

    try {
      // Build the command based on phase
      let fullCommand: string;
      if (phase === 'deploy') {
        // Deploy uses /commit without bug name
        fullCommand = commandTemplate;
      } else {
        // Other phases append bug name
        fullCommand = `${commandTemplate} ${selectedBug.name}`;
      }

      await window.electronAPI.startAgent(
        selectedBug.name, // Use bug name as specId for grouping
        phase,
        'claude',
        ['-p', fullCommand],
        undefined,
        undefined
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'フェーズの実行に失敗しました');
    }
  }, [selectedBug]);

  // ============================================================
  // Task 4: Auto execution handlers
  // Requirements: 1.3, 1.4, 5.1
  // ============================================================
  const handleStartAutoExecution = useCallback(() => {
    const service = getBugAutoExecutionService();
    const started = service.start();
    if (!started) {
      notify.error('自動実行を開始できませんでした');
    }
  }, []);

  const handleStopAutoExecution = useCallback(async () => {
    const service = getBugAutoExecutionService();
    await service.stop();
  }, []);

  const handleRetryAutoExecution = useCallback(() => {
    if (!lastFailedPhase) return;
    const service = getBugAutoExecutionService();
    const retried = service.retryFrom(lastFailedPhase);
    if (!retried) {
      notify.error('リトライを開始できませんでした');
    }
  }, [lastFailedPhase]);

  // If no bug is selected, show placeholder
  if (!selectedBug) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400" data-testid="bug-workflow-view">
        バグを選択してください
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="bug-workflow-view">
      {/* Task 4.1: Auto Execution Button Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Bug Workflow
        </span>
        {/* Auto Execution Button */}
        {!isAutoExecuting ? (
          <button
            data-testid="bug-auto-execute-button"
            onClick={handleStartAutoExecution}
            disabled={runningPhases.size > 0}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
              'transition-colors',
              runningPhases.size === 0
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
            )}
          >
            <Play className="w-4 h-4" />
            自動実行
          </button>
        ) : (
          <button
            data-testid="bug-auto-stop-button"
            onClick={handleStopAutoExecution}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
              'bg-red-500 text-white hover:bg-red-600',
              'transition-colors'
            )}
          >
            <Square className="w-4 h-4" />
            停止
          </button>
        )}
      </div>

      {/* Task 4.2: Auto Execution Status Display */}
      {autoExecutionStatus !== 'idle' && (
        <div className="px-4">
          <BugAutoExecutionStatusDisplay
            status={autoExecutionStatus}
            currentPhase={currentAutoPhase}
            lastFailedPhase={lastFailedPhase}
            retryCount={retryCount}
            onRetry={handleRetryAutoExecution}
            onStop={handleStopAutoExecution}
          />
        </div>
      )}

      {/* Workflow Phases */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {BUG_WORKFLOW_PHASES.map((phase, index) => (
          <div key={phase}>
            {/* Phase Item */}
            <BugPhaseItem
              phase={phase}
              label={BUG_WORKFLOW_PHASE_LABELS[phase]}
              status={phaseStatuses[phase]}
              canExecute={canExecutePhase(phase)}
              showExecuteButton={phase !== 'report'} // Report has no execute button
              onExecute={() => handleExecutePhase(phase)}
              isAutoExecuting={isAutoExecuting}
              isAutoExecutingPhase={isAutoExecuting && currentAutoPhase === phase}
            />

            {/* Connector Arrow */}
            {index < BUG_WORKFLOW_PHASES.length - 1 && (
              <div
                data-testid="bug-phase-connector"
                className="flex justify-center py-1"
              >
                <ArrowDown className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
