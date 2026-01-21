/**
 * BugWorkflowView Component
 * Displays bug workflow with 5 phases and execution controls
 * Task 3: bugs-pane-integration
 * Task 4: bugs-workflow-auto-execution
 * bug-auto-execution-per-bug-state: Tasks 4.1-4.3 - Migrate to bugAutoExecutionStore
 * Requirements: 3.1, 3.2, 3.3, 4.1-4.7, 6.2, 6.4
 * Requirements: 1.1-1.6, 6.1 (auto execution)
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowDown, Play, Square, GitBranch } from 'lucide-react';
import { clsx } from 'clsx';
import { useBugStore } from '../stores/bugStore';
import { useAgentStore } from '../stores/agentStore';
import { useWorkflowStore } from '../stores/workflowStore';
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
// bug-auto-execution-per-bug-state: Use store instead of service (Req 4.1-4.5)
import { useBugAutoExecutionStore } from '../../shared/stores/bugAutoExecutionStore';

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
  const { selectedBug, bugDetail, useWorktree, setUseWorktree } = useBugStore();
  const agents = useAgentStore((state) => state.agents);
  const getAgentsForBug = useAgentStore((state) => state.getAgentsForSpec);
  const bugAutoExecutionPermissions = useWorkflowStore((state) => state.bugAutoExecutionPermissions);

  // ============================================================
  // bug-auto-execution-per-bug-state Task 4.1: Read state from store
  // Requirements: 4.1, 4.2
  // ============================================================
  const getBugAutoExecutionRuntime = useBugAutoExecutionStore((state) => state.getBugAutoExecutionRuntime);
  const fetchBugAutoExecutionState = useBugAutoExecutionStore((state) => state.fetchBugAutoExecutionState);
  const startAutoExecutionInStore = useBugAutoExecutionStore((state) => state.startAutoExecution);
  const stopAutoExecutionInStore = useBugAutoExecutionStore((state) => state.stopAutoExecution);

  // Get bug name for store key - spec-path-ssot-refactor
  const bugName = selectedBug?.name ?? null;

  // Get auto execution runtime state for current bug
  const runtime = bugName ? getBugAutoExecutionRuntime(bugName) : null;
  const autoExecutionStatus = runtime?.autoExecutionStatus ?? 'idle';
  const currentAutoPhase = runtime?.currentAutoPhase ?? null;
  const lastFailedPhase = runtime?.lastFailedPhase ?? null;
  const retryCount = runtime?.retryCount ?? 0;
  const isAutoExecuting = runtime?.isAutoExecuting ?? false;

  // ============================================================
  // bug-auto-execution-per-bug-state Task 7.2: Fetch state on bug selection
  // Requirements: 3.1
  // ============================================================
  const lastFetchedBugPath = useRef<string | null>(null);

  useEffect(() => {
    if (bugName && bugName !== lastFetchedBugPath.current) {
      lastFetchedBugPath.current = bugName;
      // Fetch state from Main Process when bug is selected
      fetchBugAutoExecutionState(bugName).catch((err) => {
        console.error('[BugWorkflowView] Failed to fetch bug auto-execution state:', err);
      });
    }
  }, [bugName, fetchBugAutoExecutionState]);

  // Get running phases for the selected bug
  // Use bug:{name} format to match AgentListPanel filtering
  const runningPhases = useMemo(() => {
    if (!selectedBug) return new Set<string>();
    const bugAgents = getAgentsForBug(`bug:${selectedBug.name}`);
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
  // bugs-worktree-support Task 12.2: bug-fix実行時のworktree作成判定
  // Requirements: 8.5, 3.2, 3.6
  // Use startAgent directly with appropriate command formatting
  const handleExecutePhase = useCallback(async (phase: BugWorkflowPhase) => {
    if (!selectedBug) return;

    const commandTemplate = BUG_PHASE_COMMANDS[phase];
    if (!commandTemplate) return; // Report phase has no command

    try {
      // bugs-worktree-support Task 12.2: fixフェーズでworktree使用時はworktreeを作成
      if (phase === 'fix' && useWorktree) {
        const result = await window.electronAPI.createBugWorktree(selectedBug.name);
        if (!result.ok) {
          notify.error(result.error?.message || 'worktreeの作成に失敗しました');
          return;
        }
      }

      // bugs-worktree-support Task 12.3: Deployボタンの条件分岐
      // Requirements: 4.1
      // worktreeフィールドが存在する場合は/kiro:bug-merge、そうでない場合は/commit
      let command = commandTemplate;
      if (phase === 'deploy' && selectedBug.worktree) {
        command = '/kiro:bug-merge';
      }

      // Build the command: all phases (including deploy) append bug name
      // /commit accepts bug name to collect related files from .kiro/bugs/{bug-name}/
      const fullCommand = `${command} ${selectedBug.name}`;

      // Base flags (-p, --output-format stream-json, --verbose) are added by specManagerService
      await window.electronAPI.startAgent(
        `bug:${selectedBug.name}`, // Use bug:{name} format for consistent AgentListPanel filtering
        phase,
        'claude',
        [fullCommand], // Args: full command (base flags added by service)
        undefined,
        undefined
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'フェーズの実行に失敗しました');
    }
  }, [selectedBug, useWorktree]);

  // ============================================================
  // bug-auto-execution-per-bug-state Task 4.2, 4.3: Auto execution handlers
  // Requirements: 4.3, 4.4, 4.5, 5.1, 5.2
  // Use existing IPC APIs defined in electron.d.ts
  // ============================================================

  // Determine last completed phase from bugDetail
  const getLastCompletedPhase = useCallback((): BugWorkflowPhase | null => {
    if (!bugDetail) return null;
    if (bugDetail.artifacts.verification?.exists) return 'verify';
    if (bugDetail.artifacts.fix?.exists) return 'fix';
    if (bugDetail.artifacts.analysis?.exists) return 'analyze';
    if (bugDetail.artifacts.report?.exists) return 'report';
    return null;
  }, [bugDetail]);

  const handleStartAutoExecution = useCallback(async () => {
    if (!bugName || !selectedBug) {
      notify.error('自動実行を開始できませんでした');
      return;
    }

    try {
      // Update store state first (optimistic update)
      startAutoExecutionInStore(bugName);

      // Call Main Process to start auto-execution using existing IPC API
      // spec-path-ssot-refactor: Bug auto-execution API still uses bugPath for backward compatibility
      // The API expects bugPath to be the full path, but we only have name now
      // Use bugName as the identifier (handlers will resolve the path)
      const result = await window.electronAPI.bugAutoExecutionStart({
        bugPath: bugName,  // Using name as path identifier for now
        bugName: selectedBug.name,
        options: {
          permissions: bugAutoExecutionPermissions,
        },
        lastCompletedPhase: getLastCompletedPhase(),
      });

      if (!result.ok) {
        // Revert optimistic update on failure
        stopAutoExecutionInStore(bugName);
        const errorMsg = 'message' in result.error ? result.error.message : result.error.type;
        notify.error(errorMsg || '自動実行を開始できませんでした');
      }
    } catch (error) {
      // Revert optimistic update on error
      stopAutoExecutionInStore(bugName);
      notify.error(error instanceof Error ? error.message : '自動実行を開始できませんでした');
    }
  }, [bugName, selectedBug, bugAutoExecutionPermissions, startAutoExecutionInStore, stopAutoExecutionInStore, getLastCompletedPhase]);

  const handleStopAutoExecution = useCallback(async () => {
    if (!bugName) return;

    try {
      // Call Main Process to stop auto-execution using existing IPC API
      // spec-path-ssot-refactor: API expects bugPath, using bugName as identifier
      await window.electronAPI.bugAutoExecutionStop({ bugPath: bugName });
      // Store will be updated by IPC event
    } catch (error) {
      // Force stop in store if IPC fails
      stopAutoExecutionInStore(bugName);
      console.error('[BugWorkflowView] Failed to stop auto-execution:', error);
    }
  }, [bugName, stopAutoExecutionInStore]);

  const handleRetryAutoExecution = useCallback(async () => {
    if (!bugName || !lastFailedPhase) {
      notify.error('リトライを開始できませんでした');
      return;
    }

    try {
      // Call Main Process to retry from failed phase using existing IPC API
      // spec-path-ssot-refactor: API expects bugPath, using bugName as identifier
      const result = await window.electronAPI.bugAutoExecutionRetryFrom({
        bugPath: bugName,
        phase: lastFailedPhase,
      });

      if (!result.ok) {
        const errorMsg = 'message' in result.error ? result.error.message : result.error.type;
        notify.error(errorMsg || 'リトライを開始できませんでした');
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'リトライを開始できませんでした');
    }
  }, [bugName, lastFailedPhase]);

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

      {/* bugs-worktree-support Task 12.1: worktreeチェックボックス */}
      {/* Requirements: 8.2 */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="checkbox"
          id="workflow-use-worktree"
          checked={useWorktree}
          onChange={(e) => setUseWorktree(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          data-testid="workflow-use-worktree-checkbox"
        />
        <label
          htmlFor="workflow-use-worktree"
          className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"
        >
          <GitBranch className="w-4 h-4" />
          Worktreeを使用
        </label>
      </div>

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
