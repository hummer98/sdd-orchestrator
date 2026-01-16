/**
 * WorkflowView Component
 * Main workflow view showing 6 phases with controls
 * Requirements: 1.1-1.4, 3.1-3.5, 5.2-5.8, 6.1-6.6, 7.1-7.6, 9.1-9.9
 * Task 5.1: Use specStore.autoExecutionRuntime instead of workflowStore for auto execution state
 * Task 14.1, 14.4: Impl start UI with worktree options (git-worktree-support)
 */

import { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { ArrowDown, Play, Square, AlertCircle, RefreshCcw, Loader2, CheckCircle } from 'lucide-react';
import { useSpecStore, type ImplTaskStatus } from '../stores/specStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { notify } from '../stores';
import { PhaseItem } from './PhaseItem';
import { TaskProgressView, type TaskItem } from './TaskProgressView';
import { AutoExecutionStatusDisplay } from './AutoExecutionStatusDisplay';
import { DocumentReviewPanel } from './DocumentReviewPanel';
import { InspectionPanel } from './InspectionPanel';
import { ImplStartButtons } from '@shared/components/workflow';
import type { DocumentReviewState } from '../types/documentReview';
import type { InspectionState } from '../types/inspection';
import { normalizeInspectionState } from '../types/inspection';
import { useAutoExecution } from '../hooks/useAutoExecution';
import { useAutoExecutionStore } from '../stores/spec/autoExecutionStore';
import {
  WORKFLOW_PHASES,
  ALL_WORKFLOW_PHASES,
  PHASE_LABELS,
  getPhaseStatus,
  type WorkflowPhase,
  type PhaseStatus,
  type ExtendedSpecJson,
} from '../types/workflow';
import { isWorktreeConfig } from '../types/worktree';

/** Maximum continue retries - should match MAX_CONTINUE_RETRIES in specManagerService */
const MAX_CONTINUE_RETRIES = 2;

// ============================================================
// Task 7.1-7.6: WorkflowView Component
// Requirements: 1.1-1.4, 3.1-3.5, 6.1-6.6, 7.1-7.6, 9.1-9.3
// ============================================================

export function WorkflowView() {
  // Bug fix: inspection-auto-execution-toggle - removed refreshSpecs (no longer needed)
  const { specDetail, isLoading, selectedSpec, specManagerExecution, clearSpecManagerError } = useSpecStore();
  const workflowStore = useWorkflowStore();
  // agents をセレクタで取得（Zustand reactivity: store全体取得では変更検知されない）
  const agents = useAgentStore((state) => state.agents);
  const getAgentsForSpec = useAgentStore((state) => state.getAgentsForSpec);

  // Auto Execution Hook (Main Process IPC)
  const autoExecution = useAutoExecution();

  // Spec毎の自動実行runtime状態を取得
  const specId = specDetail?.metadata.name ?? '';
  const autoExecutionRuntimeMap = useSpecStore((state) => state.autoExecutionRuntimeMap);
  const autoExecutionRuntime = useMemo(() => {
    return autoExecutionRuntimeMap.get(specId) ?? {
      isAutoExecuting: false,
      currentAutoPhase: null,
      autoExecutionStatus: 'idle' as const,
    };
  }, [autoExecutionRuntimeMap, specId]);
  const { isAutoExecuting, currentAutoPhase, autoExecutionStatus } = autoExecutionRuntime;


  // All hooks must be called before any conditional returns
  const specJson = specDetail?.specJson as ExtendedSpecJson | undefined;

  // Get document review state from spec.json
  const documentReviewState = useMemo((): DocumentReviewState | null => {
    const reviewData = (specJson as ExtendedSpecJson & { documentReview?: DocumentReviewState })?.documentReview;
    return reviewData || null;
  }, [specJson]);

  // Get inspection state from spec.json (supports both new and legacy format)
  // Task 4: InspectionPanel integration (inspection-workflow-ui feature)
  // Bug fix: inspection-panel-display - normalize legacy format to multi-round structure
  // Bug fix: inspection-state-data-model - Updated to use new InspectionState structure
  const inspectionState = useMemo((): InspectionState | null => {
    const inspectionData = specJson?.inspection;
    return normalizeInspectionState(inspectionData);
  }, [specJson]);

  // Calculate phase statuses
  // Bug fix: Use ALL_WORKFLOW_PHASES instead of WORKFLOW_PHASES to include 'inspection'
  // This ensures phaseStatuses['inspection'] is set, which is required for canExecutePhase('deploy')
  const phaseStatuses = useMemo(() => {
    if (!specJson) return {} as Record<WorkflowPhase, PhaseStatus>;
    const statuses: Record<WorkflowPhase, PhaseStatus> = {} as Record<WorkflowPhase, PhaseStatus>;
    for (const phase of ALL_WORKFLOW_PHASES) {
      statuses[phase] = getPhaseStatus(phase, specJson);
    }
    // タスク進捗100%の場合、implフェーズをapprovedにする
    if (specDetail?.taskProgress?.percentage === 100) {
      statuses.impl = 'approved';
    }
    return statuses;
  }, [specJson, specDetail?.taskProgress?.percentage]);

  // 現在のspecで実行中のフェーズ/バリデーションを取得
  const runningPhases = useMemo(() => {
    if (!specDetail) return new Set<string>();
    const specAgents = getAgentsForSpec(specDetail.metadata.name);
    const running = specAgents
      .filter((a) => a.status === 'running')
      .map((a) => a.phase);
    return new Set(running);
  }, [agents, specDetail, getAgentsForSpec]);

  // フェーズが実行可能かどうかを判定
  const canExecutePhase = useCallback(
    (phase: WorkflowPhase): boolean => {
      // 同じspec内で既にAgentが実行中なら不可
      if (runningPhases.size > 0) return false;

      const index = ALL_WORKFLOW_PHASES.indexOf(phase);
      if (index === 0) return true; // requirements は常に実行可能

      // 前のフェーズが approved でなければ不可
      const prevPhase = ALL_WORKFLOW_PHASES[index - 1];
      return phaseStatuses[prevPhase] === 'approved';
    },
    [runningPhases, phaseStatuses]
  );

  // Parse tasks from tasks.md
  const parsedTasks: TaskItem[] = useMemo(() => {
    const content = specDetail?.artifacts.tasks?.content;
    if (!content) return [];

    const tasks: TaskItem[] = [];
    const lines = content.split('\n');
    const taskRegex = /^-\s*\[([ xX])\]\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(taskRegex);
      if (match) {
        const isCompleted = match[1].toLowerCase() === 'x';
        const title = match[2].trim();
        // Extract task ID if present (e.g., "1.1 Task name", "(P) Task name", or "FIX-1 Task name")
        const idMatch = title.match(/^(\d+\.?\d*|\(P\)|[A-Z]+-\d+)\s+(.+)$/);
        const id = idMatch ? idMatch[1] : `task-${tasks.length + 1}`;
        const taskTitle = idMatch ? idMatch[2] : title;

        tasks.push({
          id,
          title: taskTitle,
          status: isCompleted ? 'completed' : 'pending',
        });
      }
    }
    return tasks;
  }, [specDetail?.artifacts.tasks?.content]);

  // Get previous phase status
  const getPreviousStatus = (phase: WorkflowPhase): PhaseStatus | null => {
    const index = ALL_WORKFLOW_PHASES.indexOf(phase);
    if (index <= 0) return null;
    return phaseStatuses[ALL_WORKFLOW_PHASES[index - 1]];
  };

  // Handlers
  const handleExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;

    try {
      // Task 6.1 (git-worktree-support): Deploy button conditional branching
      // When spec.json.worktree is present: execute spec-merge
      // When spec.json.worktree is absent: execute /commit via normal phase execution
      if (phase === 'deploy' && specJson?.worktree) {
        await window.electronAPI.executeSpecMerge(
          specDetail.metadata.name,
          specDetail.metadata.name,
          workflowStore.commandPrefix
        );
        return;
      }

      // サービス層でコマンドを構築（commandPrefixをストアから取得）
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.executePhase(
        specDetail.metadata.name,
        phase,
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'フェーズの実行に失敗しました');
    }
  }, [specDetail, specJson?.worktree, workflowStore.commandPrefix]);

  const handleApprovePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;
    // Update approval in spec.json via IPC
    try {
      await window.electronAPI.updateApproval(
        specDetail.metadata.path,
        phase as 'requirements' | 'design' | 'tasks',
        true
      );
      // Note: File watcher will automatically trigger specStore.updateSpecJson()
      // No need to manually call selectSpec here
    } catch (error) {
      console.error('Failed to approve phase:', error);
    }
  }, [specDetail]);

  const handleApproveAndExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    const previousPhase = ALL_WORKFLOW_PHASES[ALL_WORKFLOW_PHASES.indexOf(phase) - 1];
    if (previousPhase) {
      await handleApprovePhase(previousPhase);
    }
    await handleExecutePhase(phase);
  }, [handleApprovePhase, handleExecutePhase]);

  // Task 10.1: Auto execution button handler
  // Requirements: 1.1, 1.2
  // Task 5.1: Use isAutoExecuting from specStore
  // Bug fix: deprecated-auto-execution-service-cleanup - Use Main Process IPC instead of old Renderer service
  const handleAutoExecution = useCallback(async () => {
    if (!specDetail) return;

    if (isAutoExecuting) {
      const result = await autoExecution.stopAutoExecution(specDetail.metadata.path);
      if (!result.ok) {
        notify.error('自動実行の停止に失敗しました。');
        // Bug Fix: NOT_EXECUTING エラーの場合、Main Processに状態がないので
        // Renderer側の状態もリセットする
        if (result.error.type === 'NOT_EXECUTING') {
          useAutoExecutionStore.getState().stopAutoExecution(specDetail.metadata.name);
        }
      }
    } else {
      // Bug Fix: approvals を渡して既に完了しているフェーズをスキップ
      const result = await autoExecution.startAutoExecution(
        specDetail.metadata.path,
        specDetail.metadata.name,
        {
          permissions: workflowStore.autoExecutionPermissions,
          documentReviewFlag: workflowStore.documentReviewOptions.autoExecutionFlag,
          approvals: specDetail.specJson.approvals,
        }
      );
      if (!result.ok) {
        notify.error('自動実行を開始できませんでした。許可フェーズを確認してください。');
      }
    }
  }, [isAutoExecuting, specDetail, autoExecution, workflowStore.autoExecutionPermissions, workflowStore.documentReviewOptions.autoExecutionFlag]);

  // Task 10.4: Retry handler
  // Requirements: 8.2, 8.3
  // Bug fix: deprecated-auto-execution-service-cleanup - Use Main Process IPC instead of old Renderer service
  const handleRetry = useCallback(async () => {
    if (!specDetail) return;

    const lastFailedPhase = workflowStore.lastFailedPhase;
    if (lastFailedPhase) {
      const result = await autoExecution.retryFromPhase(specDetail.metadata.path, lastFailedPhase);
      if (!result.ok) {
        notify.error('リトライできませんでした。');
      }
    }
  }, [workflowStore.lastFailedPhase, specDetail, autoExecution]);

  const handleShowAgentLog = useCallback((phase: WorkflowPhase) => {
    // TODO: Show agent log for this phase
    console.log('Show agent log for phase:', phase);
  }, []);

  // ============================================================
  // Task 6.3: Document Review Handlers
  // Requirements: 6.1
  // ============================================================
  const isReviewExecuting = useMemo(() => {
    return runningPhases.has('document-review') || runningPhases.has('document-review-reply') || runningPhases.has('document-review-fix');
  }, [runningPhases]);

  const handleStartDocumentReview = useCallback(async () => {
    if (!specDetail) return;

    try {
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.executeDocumentReview(
        specDetail.metadata.name,
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
      // Note: Manual document-review agent tracking was removed as part of
      // deprecated-auto-execution-service-cleanup. Main Process AutoExecutionCoordinator
      // now handles document-review workflow orchestration.
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'ドキュメントレビューの実行に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);

  // Handler for executing document-review-reply manually
  const handleExecuteDocumentReviewReply = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    try {
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.executeDocumentReviewReply(
        specDetail.metadata.name,
        specDetail.metadata.name,
        roundNumber,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'レビュー内容判定の実行に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);

  // Handler for applying fixes from document-review-reply (--fix option)
  const handleApplyDocumentReviewFix = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    try {
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.executeDocumentReviewFix(
        specDetail.metadata.name,
        specDetail.metadata.name,
        roundNumber,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'replyの適用に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);

  // ============================================================
  // Task 4: Inspection handlers (inspection-workflow-ui feature)
  // Requirements: 3.1, 3.2, 3.3, 4.2, 4.3
  // ============================================================

  // Check if inspection is currently executing
  const isInspectionExecuting = useMemo(() => {
    return runningPhases.has('inspection') || runningPhases.has('inspection-fix');
  }, [runningPhases]);

  // Handler for starting inspection
  const handleStartInspection = useCallback(async () => {
    if (!specDetail) return;

    try {
      await window.electronAPI.executeInspection(
        specDetail.metadata.name,
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Inspectionの実行に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);

  // Handler for executing inspection fix
  const handleExecuteInspectionFix = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    try {
      await window.electronAPI.executeInspectionFix(
        specDetail.metadata.name,
        specDetail.metadata.name,
        roundNumber,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Inspection Fixの実行に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);

  // Bug fix: inspection-auto-execution-toggle
  // Removed handleInspectionAutoExecutionFlagChange
  // Now using workflowStore.setInspectionAutoExecutionFlag directly
  // This follows the same pattern as DocumentReviewPanel

  // Bug fix: Removed Agent completion detection useEffect
  // File watcher now handles granular UI updates via specStore.onSpecsChanged
  // This eliminates unnecessary refreshSpecs() calls that caused:
  // 1. User edits being overwritten during Agent execution
  // 2. Redundant full reloads when single files changed

  const handleExecuteTask = useCallback(async (taskId: string) => {
    if (!specDetail) return;

    try {
      // サービス層でコマンドを構築（commandPrefixをストアから取得）
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.executeTaskImpl(
        specDetail.metadata.name,
        specDetail.metadata.name,
        taskId,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'タスク実装の実行に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);

  // ============================================================
  // Task 14.2, 14.3: Impl start button handlers (git-worktree-support)
  // Requirements: 9.4, 9.5, 9.6, 9.7
  // ============================================================

  /**
   * Handler for "カレントブランチで実装" button
   * Requirements: 9.4 - Execute impl on current branch/directory
   */
  const handleImplStartCurrentBranch = useCallback(async () => {
    if (!specDetail) return;

    try {
      // Execute impl phase on current branch using existing impl phase execution
      await window.electronAPI.executePhase(
        specDetail.metadata.name,
        'impl',
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '実装の開始に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);

  /**
   * Handler for "Worktreeで実装" and "Worktreeで実装（継続）" buttons
   * Requirements: 9.5, 9.6, 9.7 - Check main branch, create worktree, start impl
   */
  const handleImplStartWithWorktree = useCallback(async () => {
    if (!specDetail) return;

    // Get project path from the spec path
    // specDetail.metadata.path is like /path/to/project/.kiro/specs/feature-name
    const specPath = specDetail.metadata.path;
    const projectPath = specPath.replace(/\/.kiro\/specs\/[^/]+$/, '');
    const featureName = specDetail.metadata.name;

    try {
      // If worktree already exists, just execute impl phase in worktree context
      if (specJson?.worktree) {
        // Continue impl in existing worktree
        await window.electronAPI.executePhase(
          specDetail.metadata.name,
          'impl',
          specDetail.metadata.name,
          workflowStore.commandPrefix
        );
        return;
      }

      // Check if on main branch first
      const checkResult = await window.electronAPI.worktreeCheckMain(projectPath);
      if (!checkResult.ok) {
        notify.error(`ブランチ確認エラー: ${checkResult.error.message || checkResult.error.type}`);
        return;
      }

      if (!checkResult.value.isMain) {
        notify.error(
          `Worktreeモードはmainブランチでのみ使用できます。現在のブランチ: ${checkResult.value.currentBranch}`
        );
        return;
      }

      // Create worktree and update spec.json
      const implStartResult = await window.electronAPI.worktreeImplStart(
        projectPath,
        specPath,
        featureName
      );

      if (!implStartResult.ok) {
        const error = implStartResult.error;
        let message = 'Worktree作成に失敗しました';
        if (error.type === 'NOT_ON_MAIN_BRANCH') {
          message = `mainブランチではありません。現在: ${error.currentBranch}`;
        } else if (error.type === 'WORKTREE_EXISTS') {
          message = `Worktreeが既に存在します: ${error.path}`;
        } else if (error.message) {
          message = error.message;
        }
        notify.error(message);
        return;
      }

      notify.success(`Worktree作成完了: ${implStartResult.value.branch}`);

      // Now start impl in the worktree
      await window.electronAPI.executePhase(
        specDetail.metadata.name,
        'impl',
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Worktree実装の開始に失敗しました');
    }
  }, [specDetail, specJson?.worktree, workflowStore.commandPrefix]);

  // Check if spec has worktree configuration
  const hasWorktree = useMemo(() => {
    return isWorktreeConfig(specJson?.worktree);
  }, [specJson?.worktree]);

  // Check if impl phase is executing
  const isImplExecuting = useMemo(() => {
    return runningPhases.has('impl');
  }, [runningPhases]);

  // Check if impl phase can be started
  const canStartImpl = useMemo(() => {
    // Can start impl if tasks phase is approved and no agents are running
    return phaseStatuses.tasks === 'approved' && runningPhases.size === 0;
  }, [phaseStatuses.tasks, runningPhases.size]);

  // Handle empty and loading states (after all hooks)
  if (!selectedSpec) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        仕様を選択してください
      </div>
    );
  }

  if (isLoading || !specDetail || !specJson) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="workflow-view">
      {/* Workflow Phases */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="phase-execution-panel">
        {WORKFLOW_PHASES.map((phase, index) => (
          <div key={phase}>
            {/* Phase Item */}
            {/* Task 5.1: Use isAutoExecuting and currentAutoPhase from specStore */}
            <PhaseItem
              phase={phase}
              label={PHASE_LABELS[phase]}
              status={phaseStatuses[phase]}
              previousStatus={getPreviousStatus(phase)}
              autoExecutionPermitted={workflowStore.autoExecutionPermissions[phase]}
              isExecuting={runningPhases.has(phase)}
              canExecute={canExecutePhase(phase)}
              isAutoPhase={isAutoExecuting && currentAutoPhase === phase}
              onExecute={() => handleExecutePhase(phase)}
              onApprove={() => handleApprovePhase(phase)}
              onApproveAndExecute={() => handleApproveAndExecutePhase(phase)}
              onToggleAutoPermission={() => workflowStore.toggleAutoPermission(phase)}
              onShowAgentLog={() => handleShowAgentLog(phase)}
            />

            {/* Arrow to DocumentReviewPanel */}
            {phase === 'tasks' && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-gray-400" />
              </div>
            )}

            {/* Task 6.3: Document Review Panel (between tasks and impl) */}
            {/* Task 6.1: Progress indicator and auto execution flag control added */}
            {/* Requirements: 6.1, 6.4, 6.5, 6.6, 6.7, 6.8 */}
            {/* Task 5.1: Use isAutoExecuting from specStore */}
            {phase === 'tasks' && (
              <div className="my-3">
                <DocumentReviewPanel
                  reviewState={documentReviewState}
                  isExecuting={isReviewExecuting}
                  isAutoExecuting={isAutoExecuting}
                  hasTasks={!!specDetail?.artifacts.tasks?.content}
                  autoExecutionFlag={workflowStore.documentReviewOptions.autoExecutionFlag}
                  onStartReview={handleStartDocumentReview}
                  onExecuteReply={handleExecuteDocumentReviewReply}
                  onApplyFix={handleApplyDocumentReviewFix}
                  onAutoExecutionFlagChange={workflowStore.setDocumentReviewAutoExecutionFlag}
                />
              </div>
            )}

            {/* Task 14.1, 14.4: Impl start buttons (git-worktree-support) */}
            {/* Requirements: 9.1, 9.2, 9.3, 9.8, 9.9 */}
            {phase === 'impl' && (
              <div className="mt-2 ml-4">
                <ImplStartButtons
                  featureName={specDetail.metadata.name}
                  hasWorktree={hasWorktree}
                  isExecuting={isImplExecuting}
                  canExecute={canStartImpl}
                  onExecuteCurrentBranch={handleImplStartCurrentBranch}
                  onExecuteWithWorktree={handleImplStartWithWorktree}
                />
              </div>
            )}

            {/* Task Progress (for impl phase) */}
            {phase === 'impl' && specDetail.taskProgress && (
              <div className="mt-2 ml-4">
                <TaskProgressView
                  tasks={parsedTasks}
                  progress={specDetail.taskProgress}
                  onExecuteTask={handleExecuteTask}
                  canExecute={runningPhases.size === 0}
                />
              </div>
            )}

            {/* Arrow to InspectionPanel */}
            {phase === 'impl' && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-gray-400" />
              </div>
            )}

            {/* Task 4: InspectionPanel (after impl, before deploy) */}
            {/* Requirements: 3.1, 3.2, 3.3, 3.4, 3.5 */}
            {/* Bug fix: inspection-auto-execution-toggle - Use workflowStore.setInspectionAutoExecutionFlag */}
            {phase === 'impl' && (
              <div className="my-3">
                <InspectionPanel
                  inspectionState={inspectionState}
                  isExecuting={isInspectionExecuting}
                  isAutoExecuting={isAutoExecuting}
                  autoExecutionFlag={workflowStore.inspectionAutoExecutionFlag}
                  canExecuteInspection={phaseStatuses.tasks === 'approved' && specDetail.taskProgress?.percentage === 100}
                  onStartInspection={handleStartInspection}
                  onExecuteFix={handleExecuteInspectionFix}
                  onAutoExecutionFlagChange={workflowStore.setInspectionAutoExecutionFlag}
                />
              </div>
            )}

            {/* Connector Arrow */}
            {index < WORKFLOW_PHASES.length - 1 && (
              <div
                data-testid="phase-connector"
                className="flex justify-center py-1"
              >
                <ArrowDown className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {/* spec-manager Execution Status Display */}
        {/* Requirements: 5.2-5.8 */}
        <SpecManagerStatusDisplay
          execution={specManagerExecution}
          onClearError={clearSpecManagerError}
        />

        {/* Task 11.2: Auto Execution Status Display */}
        {/* Requirements: 5.1, 5.5, 8.2 */}
        {/* Task 5.1: Use autoExecutionStatus and currentAutoPhase from specStore */}
        {/* Bug fix: deprecated-auto-execution-service-cleanup - Use Main Process IPC for stop */}
        <AutoExecutionStatusDisplay
          status={autoExecutionStatus}
          currentPhase={currentAutoPhase}
          lastFailedPhase={workflowStore.lastFailedPhase}
          retryCount={workflowStore.failedRetryCount}
          onRetry={handleRetry}
          onStop={async () => {
            if (specDetail) {
              await autoExecution.stopAutoExecution(specDetail.metadata.path);
            }
          }}
        />

      </div>

      {/* Footer Buttons */}
      {/* Task 5.1: Use isAutoExecuting from specStore */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button
          data-testid="auto-execute-button"
          onClick={handleAutoExecution}
          disabled={!isAutoExecuting && runningPhases.size > 0}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded',
            'font-medium transition-colors',
            isAutoExecuting
              ? 'bg-red-500 text-white hover:bg-red-600'
              : runningPhases.size > 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                : 'bg-blue-500 text-white hover:bg-blue-600'
          )}
        >
          {isAutoExecuting ? (
            <>
              <Square className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              自動実行
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// spec-manager Status Display Component
// Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
// execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
// ============================================================

interface SpecManagerStatusDisplayProps {
  execution: {
    isRunning: boolean;
    currentPhase: string | null;
    currentSpecId: string | null;
    // execution-store-consolidation: lastCheckResult REMOVED (Req 6.5)
    error: string | null;
    implTaskStatus: ImplTaskStatus | null;
    retryCount: number;
    executionMode: 'auto' | 'manual' | null;
  };
  onClearError: () => void;
}

function SpecManagerStatusDisplay({ execution, onClearError }: SpecManagerStatusDisplayProps) {
  const { isRunning, implTaskStatus, error, retryCount } = execution;

  // No status to display
  if (!isRunning && !implTaskStatus && !error) {
    return null;
  }

  return (
    <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {/* Running State */}
      {isRunning && implTaskStatus === 'running' && (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>実行中...</span>
        </div>
      )}

      {/* Continuing State (Retry) */}
      {/* Requirements: 5.7 */}
      {implTaskStatus === 'continuing' && (
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <RefreshCcw className="w-4 h-4 animate-spin" />
          <span>継続処理中...(リトライ {retryCount}/{MAX_CONTINUE_RETRIES})</span>
        </div>
      )}

      {/* Success State */}
      {/* execution-store-consolidation: lastCheckResult REMOVED (Req 6.5) */}
      {/* Task completion state is now shown via TaskProgressView */}
      {implTaskStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>完了</span>
        </div>
      )}

      {/* Stalled State */}
      {/* Requirements: 5.8 */}
      {implTaskStatus === 'stalled' && (
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <AlertCircle className="w-4 h-4" />
          <span>完了確認できず - 手動確認が必要</span>
        </div>
      )}

      {/* Error State */}
      {/* Requirements: 5.5 */}
      {(implTaskStatus === 'error' || error) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>エラー</span>
          </div>
          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}
          <button
            onClick={onClearError}
            className={clsx(
              'flex items-center gap-2 px-3 py-1 text-sm rounded',
              'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50',
              'text-red-700 dark:text-red-400',
              'transition-colors'
            )}
          >
            <RefreshCcw className="w-3 h-3" />
            再実行
          </button>
        </div>
      )}
    </div>
  );
}
