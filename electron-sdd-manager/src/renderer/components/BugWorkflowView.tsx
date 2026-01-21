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
import { ArrowDown } from 'lucide-react';
// bugs-workflow-footer Task 6.1, 6.2: Removed Play, Square, GitBranch - moved to footer
import { useBugStore } from '../stores/bugStore';
import { useAgentStore } from '../stores/agentStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { BugPhaseItem } from './BugPhaseItem';
import { BugAutoExecutionStatusDisplay } from './BugAutoExecutionStatusDisplay';
// bugs-workflow-footer Task 6.4: Import footer component and hook
import { BugWorkflowFooter } from './BugWorkflowFooter';
import { useConvertBugToWorktree } from '../hooks/useConvertBugToWorktree';
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
 * bug-deploy-phase: Requirements 5.4, 8.3 - added deployed phase status
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
      // bug-deploy-phase: Check if phase is 'deployed' in metadata
      // Requirements 5.4, 8.3 - show completed if bug.json phase is 'deployed'
      return bugDetail.metadata.phase === 'deployed' ? 'completed' : 'pending';
    default:
      return 'pending';
  }
}

export function BugWorkflowView() {
  // bugs-workflow-footer Task 1.1: Removed useWorktree/setUseWorktree (SSOT: bug.json.worktree)
  const { selectedBug, bugDetail } = useBugStore();
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
  // bugs-workflow-footer Task 6.4: useConvertBugToWorktree hook
  // Requirements: 6.3, 6.4
  // ============================================================
  const { isOnMain, isConverting, handleConvert, refreshMainBranchStatus } = useConvertBugToWorktree();

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
      // bugs-workflow-footer: Refresh main branch status on bug selection
      refreshMainBranchStatus().catch((err) => {
        console.error('[BugWorkflowView] Failed to refresh main branch status:', err);
      });
    }
  }, [bugName, fetchBugAutoExecutionState, refreshMainBranchStatus]);

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
  // bugs-workflow-footer Task 6.3: Removed fix phase auto worktree creation
  // bug-deploy-phase: Requirements 4.1, 5.1, 6.1 - optimistic phase update
  // Use startAgent directly with appropriate command formatting
  const handleExecutePhase = useCallback(async (phase: BugWorkflowPhase) => {
    if (!selectedBug) return;

    const commandTemplate = BUG_PHASE_COMMANDS[phase];
    if (!commandTemplate) return; // Report phase has no command

    // bug-deploy-phase: Track previous phase for rollback on failure
    const previousPhase = selectedBug.phase;

    try {
      // bugs-workflow-footer Task 6.3: Removed auto worktree creation for fix phase
      // Worktree mode is now set via footer button (convertBugToWorktree)

      // bug-deploy-phase Task 3.1, 4.1: Optimistic phase update for deploy
      // Requirements: 4.1, 5.1, 6.1
      if (phase === 'deploy') {
        try {
          await window.electronAPI.updateBugPhase(selectedBug.name, 'deployed');
        } catch (phaseError) {
          console.error('[BugWorkflowView] Failed to update phase:', phaseError);
          // Continue with deploy even if phase update fails
        }
      }

      // bugs-worktree-support Task 12.3: Deployボタンの条件分岐
      // Requirements: 4.1
      // worktreeフィールドが存在する場合は/kiro:bug-merge、そうでない場合は/commit
      // bugs-workflow-footer: Check bugDetail.metadata.worktree (bug.json.worktree as SSOT)
      let command = commandTemplate;
      if (phase === 'deploy' && bugDetail?.metadata.worktree) {
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
      // bug-deploy-phase Task 3.2, 4.2: Rollback phase on failure
      // Requirements: 4.3, 5.3, 6.3
      if (phase === 'deploy' && previousPhase !== 'deployed') {
        try {
          await window.electronAPI.updateBugPhase(selectedBug.name, previousPhase);
          notify.error('デプロイ失敗：ロールバックしました');
        } catch (rollbackError) {
          console.error('[BugWorkflowView] Failed to rollback phase:', rollbackError);
          notify.error(error instanceof Error ? error.message : 'デプロイに失敗しました（ロールバック失敗）');
          return;
        }
      } else {
        notify.error(error instanceof Error ? error.message : 'フェーズの実行に失敗しました');
      }
    }
  }, [selectedBug, bugDetail]);

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

  // ============================================================
  // bugs-workflow-footer Task 6.4: Auto execution toggle handler for footer
  // Requirements: 6.3, 6.4
  // ============================================================
  const handleAutoExecutionToggle = useCallback(() => {
    if (isAutoExecuting) {
      handleStopAutoExecution();
    } else {
      handleStartAutoExecution();
    }
  }, [isAutoExecuting, handleStartAutoExecution, handleStopAutoExecution]);

  // bugs-workflow-footer Task 6.4: Convert to worktree handler
  const handleConvertToWorktree = useCallback(async () => {
    if (!bugName) return;
    const success = await handleConvert(bugName);
    if (success) {
      // Refresh bug detail to get updated worktree info
      await useBugStore.getState().selectBug(selectedBug!);
    }
  }, [bugName, selectedBug, handleConvert]);

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
      {/* bugs-workflow-footer Task 6.1: Removed auto-execution buttons from header */}
      {/* bugs-workflow-footer Task 6.2: Removed worktree checkbox */}
      {/* Auto execution controls moved to BugWorkflowFooter */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Bug Workflow
        </span>
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

      {/* bugs-workflow-footer Task 6.4: Footer with auto-execution and worktree conversion */}
      <BugWorkflowFooter
        isAutoExecuting={isAutoExecuting}
        hasRunningAgents={runningPhases.size > 0}
        onAutoExecution={handleAutoExecutionToggle}
        isOnMain={isOnMain}
        bugJson={bugDetail?.metadata ? {
          bug_name: bugDetail.metadata.name,
          created_at: bugDetail.metadata.reportedAt,
          updated_at: bugDetail.metadata.updatedAt,
          worktree: bugDetail.metadata.worktree,
        } : null}
        onConvertToWorktree={handleConvertToWorktree}
        isConverting={isConverting}
      />
    </div>
  );
}
