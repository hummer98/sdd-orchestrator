/**
 * WorkflowView Component
 * Main workflow view showing 6 phases with controls
 * Requirements: 1.1-1.4, 3.1-3.5, 5.2-5.8, 6.1-6.6, 7.1-7.6, 9.1-9.9
 * Task 5.1: Use specStore.autoExecutionRuntime instead of workflowStore for auto execution state
 * impl-flow-hierarchy-fix: Task 3.1, 3.2, 3.3
 * - DISPLAY_PHASES loop for requirements/design/tasks
 * - ImplFlowFrame contains: ImplPhasePanel, TaskProgressView, InspectionPanel, deploy PhaseItem
 * - Deploy label dynamic change (worktree mode: "マージ", normal: "コミット")
 * debatex-document-review Inspection Fix 7.1: Use getResolvedScheme for SSOT compliance
 */

import { useCallback, useMemo, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useSpecStore } from '../stores/specStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import type { WorktreeConfig } from '../types/worktree';
import { notify } from '../stores';
// agent-launch-optimistic-ui: Optimistic UI hook
import { useLaunchingState } from '@shared/hooks';
import { PhaseItem, ImplPhasePanel } from '@shared/components/workflow';
import { TaskProgressView, type TaskItem } from './TaskProgressView';
import { SpecWorkflowFooter } from './SpecWorkflowFooter';
import { DocumentReviewPanel, InspectionPanel, type ReviewerScheme } from '@shared/components/review';
// spec-event-log: Task 8.1 - Event Log Modal import
import { EventLogViewerModal } from '@shared/components/eventLog';
import type { EventLogEntry, EventLogError } from '@shared/types';
import type { DocumentReviewState } from '../types/documentReview';
import type { InspectionState } from '../types/inspection';
import { normalizeInspectionState } from '../types/inspection';
import { useAutoExecution } from '../hooks/useAutoExecution';
import { useConvertToWorktree } from '../hooks/useConvertToWorktree';
import { useAutoExecutionStore } from '../stores/spec/autoExecutionStore';
// debatex-document-review Inspection Fix 7.1: Import getResolvedScheme for SSOT
import { useSpecDetailStore, getResolvedScheme } from '../stores/spec/specDetailStore';
import {
  ALL_WORKFLOW_PHASES,
  DISPLAY_PHASES,
  PHASE_LABELS,
  getPhaseStatus,
  type WorkflowPhase,
  type PhaseStatus,
  type ExtendedSpecJson,
} from '../types/workflow';
import { hasWorktreePath, isImplStarted } from '../types/worktree';

// SpecManagerStatusDisplay REMOVED - MAX_CONTINUE_RETRIES no longer needed

// ============================================================
// Task 7.1-7.6: WorkflowView Component
// Requirements: 1.1-1.4, 3.1-3.5, 6.1-6.6, 7.1-7.6, 9.1-9.3
// ============================================================

export function WorkflowView() {
  // Bug fix: inspection-auto-execution-toggle - removed refreshSpecs (no longer needed)
  // SpecManagerStatusDisplay REMOVED - Agent state is shown via AgentListPanel
  const { specDetail, isLoading, selectedSpec } = useSpecStore();
  const workflowStore = useWorkflowStore();
  // agents をセレクタで取得（Zustand reactivity: store全体取得では変更検知されない）
  const agents = useAgentStore((state) => state.agents);
  const getAgentsForSpec = useAgentStore((state) => state.getAgentsForSpec);

  // Auto Execution Hook (Main Process IPC)
  const autoExecution = useAutoExecution();

  // convert-spec-to-worktree: Task 3.3 - Convert to Worktree Hook
  const { isOnMain, isConverting, handleConvert: handleConvertToWorktree } = useConvertToWorktree();

  // agent-launch-optimistic-ui: Optimistic UI state management
  // Provides immediate visual feedback when buttons are clicked
  const { launching, wrapExecution } = useLaunchingState();

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
  // Bug fix: auto-execution-loading-redundant - autoExecutionStatus removed (unused after AutoExecutionStatusDisplay removal)
  const { isAutoExecuting, currentAutoPhase } = autoExecutionRuntime;

  // ============================================================
  // spec-event-log: Task 8.1 - Event Log Modal State Management
  // Requirements: 3.1, 3.3, 5.1, 5.2
  // ============================================================
  const [isEventLogModalOpen, setIsEventLogModalOpen] = useState(false);
  const [eventLogEntries, setEventLogEntries] = useState<EventLogEntry[]>([]);
  const [eventLogLoading, setEventLogLoading] = useState(false);
  const [eventLogError, setEventLogError] = useState<EventLogError | null>(null);

  // All hooks must be called before any conditional returns
  const specJson = specDetail?.specJson as ExtendedSpecJson | undefined;

  // Get document review state from spec.json
  const documentReviewState = useMemo((): DocumentReviewState | null => {
    const reviewData = (specJson as ExtendedSpecJson & { documentReview?: DocumentReviewState })?.documentReview;
    return reviewData || null;
  }, [specJson]);

  // debatex-document-review Inspection Fix 7.1: Use getResolvedScheme for SSOT compliance
  // Requirements: 4.2, 4.3, 4.4 - scheme priority: spec.json > sdd-orchestrator.json > 'claude-code'
  // Previous implementation directly read specJson.documentReview.scheme, bypassing projectDefaultScheme
  const documentReviewScheme = useMemo((): ReviewerScheme => {
    return getResolvedScheme(useSpecDetailStore.getState());
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
  // agent-launch-optimistic-ui: Wrapped with wrapExecution for Optimistic UI
  const handleExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      // Task 6.1 (git-worktree-support): Deploy button conditional branching
      // When spec has worktree path: execute spec-merge
      // When spec has no worktree path (normal mode or no impl): execute /commit via normal phase execution
      // execute-method-unification: Task 5.3 - Use unified execute API
      if (phase === 'deploy' && hasWorktreePath({ worktree: specJson?.worktree })) {
        await window.electronAPI.execute({
          type: 'spec-merge',
          specId: specDetail.metadata.name,
          featureName: specDetail.metadata.name,
          commandPrefix: workflowStore.commandPrefix,
        });
        return;
      }

      // サービス層でコマンドを構築（commandPrefixをストアから取得）
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      // execute-method-unification: Task 5.3 - Use unified execute API
      // Note: For phases that don't have specific options (requirements, design, tasks, deploy),
      // we cast to the appropriate type. Impl phase is handled separately above.
      await window.electronAPI.execute({
        type: phase as 'requirements' | 'design' | 'tasks' | 'deploy',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, specJson?.worktree, workflowStore.commandPrefix, wrapExecution]);

  // spec-path-ssot-refactor: Use spec.name instead of spec.path
  const handleApprovePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;
    // Update approval in spec.json via IPC
    try {
      await window.electronAPI.updateApproval(
        specDetail.metadata.name,
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

    // spec-path-ssot-refactor: Use spec.name instead of spec.path
    if (isAutoExecuting) {
      const result = await autoExecution.stopAutoExecution(specDetail.metadata.name);
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
        specDetail.metadata.name,
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

  // Bug fix: auto-execution-loading-redundant - handleRetry removed
  // リトライ機能はSpecManagerStatusDisplayのonClearError経由で提供

  const handleShowAgentLog = useCallback((phase: WorkflowPhase) => {
    // TODO: Show agent log for this phase
    console.log('Show agent log for phase:', phase);
  }, []);

  // ============================================================
  // spec-event-log: Task 8.1 - Event Log Handler
  // Requirements: 3.1, 3.3, 5.1, 5.2
  // ============================================================
  const handleShowEventLog = useCallback(async () => {
    if (!specDetail) return;

    setIsEventLogModalOpen(true);
    setEventLogLoading(true);
    setEventLogError(null);

    try {
      const result = await window.electronAPI.getEventLog(specDetail.metadata.name);
      if (result.ok) {
        setEventLogEntries(result.value);
      } else {
        setEventLogError(result.error);
      }
    } catch (error) {
      setEventLogError({
        type: 'IO_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setEventLogLoading(false);
    }
  }, [specDetail]);

  const handleCloseEventLog = useCallback(() => {
    setIsEventLogModalOpen(false);
  }, []);

  // ============================================================
  // Task 6.3: Document Review Handlers
  // Requirements: 6.1
  // ============================================================
  const isReviewExecuting = useMemo(() => {
    return runningPhases.has('document-review') || runningPhases.has('document-review-reply') || runningPhases.has('document-review-fix');
  }, [runningPhases]);

  // execute-method-unification: Task 5.3 - Use unified execute API
  // agent-launch-optimistic-ui: Wrapped with wrapExecution for Optimistic UI
  const handleStartDocumentReview = useCallback(async () => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.execute({
        type: 'document-review',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        commandPrefix: workflowStore.commandPrefix,
      });
      // Note: Manual document-review agent tracking was removed as part of
      // deprecated-auto-execution-service-cleanup. Main Process AutoExecutionCoordinator
      // now handles document-review workflow orchestration.
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  // Handler for executing document-review-reply manually
  // execute-method-unification: Task 5.3 - Use unified execute API
  // agent-launch-optimistic-ui: Wrapped with wrapExecution for Optimistic UI
  const handleExecuteDocumentReviewReply = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.execute({
        type: 'document-review-reply',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        reviewNumber: roundNumber,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  // Handler for applying fixes from document-review-reply (--fix option)
  // execute-method-unification: Task 5.3 - Use unified execute API
  // agent-launch-optimistic-ui: Wrapped with wrapExecution for Optimistic UI
  const handleApplyDocumentReviewFix = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.execute({
        type: 'document-review-fix',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        reviewNumber: roundNumber,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  // gemini-document-review: Handle scheme change
  // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
  // spec-path-ssot-refactor: Use spec.name instead of spec.path
  const handleSchemeChange = useCallback(async (newScheme: ReviewerScheme) => {
    if (!specDetail) return;

    try {
      // Update spec.json via IPC
      await window.electronAPI.updateSpecJson(specDetail.metadata.name, {
        documentReview: {
          ...specDetail.specJson.documentReview,
          scheme: newScheme,
        },
      });
      // Note: File watcher will automatically trigger UI update
    } catch (error) {
      console.error('Failed to update scheme:', error);
      notify.error('schemeの更新に失敗しました');
    }
  }, [specDetail]);

  // ============================================================
  // Task 4: Inspection handlers (inspection-workflow-ui feature)
  // Requirements: 3.1, 3.2, 3.3, 4.2, 4.3
  // ============================================================

  // Check if inspection is currently executing
  const isInspectionExecuting = useMemo(() => {
    return runningPhases.has('inspection') || runningPhases.has('inspection-fix');
  }, [runningPhases]);

  // Handler for starting inspection
  // execute-method-unification: Task 5.3 - Use unified execute API
  // agent-launch-optimistic-ui: Wrapped with wrapExecution for Optimistic UI
  const handleStartInspection = useCallback(async () => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      await window.electronAPI.execute({
        type: 'inspection',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  // Handler for executing inspection fix
  // execute-method-unification: Task 5.3 - Use unified execute API
  // agent-launch-optimistic-ui: Wrapped with wrapExecution for Optimistic UI
  const handleExecuteInspectionFix = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      await window.electronAPI.execute({
        type: 'inspection-fix',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        roundNumber,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  // Bug fix: inspection-auto-execution-toggle
  // Removed handleInspectionAutoExecutionFlagChange
  // Now using workflowStore.setInspectionAutoExecutionFlag directly
  // This follows the same pattern as DocumentReviewPanel

  // Bug fix: Removed Agent completion detection useEffect
  // File watcher now handles granular UI updates via specStore.onSpecsChanged
  // This eliminates unnecessary refreshSpecs() calls that caused:
  // 1. User edits being overwritten during Agent execution
  // 2. Redundant full reloads when single files changed

  // execute-method-unification: Task 5.3 - Use unified execute API
  // agent-launch-optimistic-ui: Wrapped with wrapExecution for Optimistic UI
  const handleExecuteTask = useCallback(async (taskId: string) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      // サービス層でコマンドを構築（commandPrefixをストアから取得）
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
      await window.electronAPI.execute({
        type: 'impl',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        taskId,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  // ============================================================
  // Task 14.2, 14.3: Impl start button handlers (git-worktree-support)
  // Requirements: 9.4, 9.5, 9.6, 9.7
  // ============================================================

  // Check if impl phase is executing
  const isImplExecuting = useMemo(() => {
    return runningPhases.has('impl');
  }, [runningPhases]);

  // Check if impl phase can be started
  const canStartImpl = useMemo(() => {
    // Can start impl if tasks phase is approved and no agents are running
    return phaseStatuses.tasks === 'approved' && runningPhases.size === 0;
  }, [phaseStatuses.tasks, runningPhases.size]);

  // ============================================================
  // worktree-mode-spec-scoped: ImplFlowFrame integration
  // Requirements: 3.1, 3.2, 3.3 (worktree-mode-spec-scoped)
  // worktree-execution-ui FIX-1: Original implementation
  // ============================================================

  // worktree-mode-spec-scoped Task 3.1: Read worktree mode from spec.json.worktree.enabled
  // Determine if worktree mode is selected
  // - If existing worktree (path exists), auto-select worktree mode
  // - Otherwise, use spec.json.worktree.enabled value
  const isWorktreeModeSelected = useMemo(() => {
    // If actual worktree exists (with path), always consider it worktree mode
    if (hasWorktreePath({ worktree: specJson?.worktree })) {
      return true;
    }
    // worktree-mode-spec-scoped: Use spec.json.worktree.enabled instead of workflowStore
    const worktree = specJson?.worktree as WorktreeConfig | undefined;
    return worktree?.enabled === true;
  }, [specJson?.worktree]);

  // Check if impl has started (for checkbox locking)
  const hasImplStarted = useMemo(() => {
    return isImplStarted({ worktree: specJson?.worktree });
  }, [specJson?.worktree]);

  // Check if actual worktree exists (with path)
  const hasExistingWorktree = useMemo(() => {
    return hasWorktreePath({ worktree: specJson?.worktree });
  }, [specJson?.worktree]);

  // spec-worktree-early-creation: handleWorktreeModeChange REMOVED
  // Worktree mode is now set at spec creation time via CreateSpecDialog

  // ============================================================
  // impl-start-unification Task 4.1: Simplified handleImplExecute
  // Requirements: 4.1, 4.3, 5.1, 5.2
  // All Worktree/normal mode logic moved to Main Process (startImplPhase)
  // ============================================================
  // spec-path-ssot-refactor: Use spec.name for startImpl
  const handleImplExecute = useCallback(async () => {
    if (!specDetail) return;

    const specName = specDetail.metadata.name;
    const featureName = specDetail.metadata.name;

    await wrapExecution(async () => {
      // Call unified startImpl IPC (handles both Worktree and normal mode)
      const result = await window.electronAPI.startImpl(
        specName,
        featureName,
        workflowStore.commandPrefix
      );

      if (!result.ok) {
        // Error handling (Requirement 4.3)
        let message = 'impl 開始に失敗しました';
        if (result.error.type === 'NOT_ON_MAIN_BRANCH') {
          message = `Worktreeモードはmainブランチでのみ使用できます。現在: ${result.error.currentBranch}`;
        } else if (result.error.type === 'WORKTREE_CREATE_FAILED') {
          message = result.error.message || 'Worktree作成に失敗しました';
        } else if (result.error.message) {
          message = result.error.message;
        }
        notify.error(message);
        return;
      }

      // Success: Agent is started (log display handled by existing mechanisms)
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

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

  // impl-flow-hierarchy-fix Task 3.3: Deploy label dynamic change
  // Requirement 4.1: worktree mode = "マージ", Requirement 4.2: normal mode = "コミット"
  const deployLabel = hasExistingWorktree ? 'マージ' : 'コミット';

  return (
    <div className="flex flex-col h-full" data-testid="workflow-view">
      {/* Workflow Phases */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="phase-execution-panel">
        {/* impl-flow-hierarchy-fix Task 3.1: Use DISPLAY_PHASES (requirements, design, tasks only) */}
        {DISPLAY_PHASES.map((phase, index) => (
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

            {/* Connector Arrow between DISPLAY_PHASES */}
            {index < DISPLAY_PHASES.length - 1 && (
              <div
                data-testid="phase-connector"
                className="flex justify-center py-1"
              >
                <ArrowDown className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {/* Arrow from tasks to DocumentReviewPanel */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Task 6.3: Document Review Panel (between tasks and impl) */}
        {/* Requirement 3.3: DocumentReviewPanel is outside ImplFlowFrame */}
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
            scheme={documentReviewScheme}
            onSchemeChange={handleSchemeChange}
            launching={launching}
          />
        </div>

        {/* Arrow from DocumentReviewPanel to impl phase */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* ImplPhasePanel - worktree-aware implementation phase */}
        <ImplPhasePanel
          worktreeModeSelected={isWorktreeModeSelected}
          isImplStarted={hasImplStarted}
          status={phaseStatuses.impl}
          autoExecutionPermitted={workflowStore.autoExecutionPermissions.impl}
          isExecuting={isImplExecuting}
          canExecute={canStartImpl}
          isAutoPhase={isAutoExecuting && currentAutoPhase === 'impl'}
          onExecute={handleImplExecute}
          onToggleAutoPermission={() => workflowStore.toggleAutoPermission('impl')}
        />

        {/* Task Progress (for impl phase) */}
        {specDetail.taskProgress && (
          <div className="mt-2">
            <TaskProgressView
              tasks={parsedTasks}
              progress={specDetail.taskProgress}
              onExecuteTask={handleExecuteTask}
              canExecute={runningPhases.size === 0}
            />
          </div>
        )}

        {/* Arrow to InspectionPanel */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* InspectionPanel (after impl, before deploy) */}
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
            launching={launching}
          />
        </div>

        {/* Arrow to deploy PhaseItem */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Deploy PhaseItem */}
        {/* Dynamic label: worktree mode = "マージ", normal mode = "コミット" */}
        <PhaseItem
          phase="deploy"
          label={deployLabel}
          status={phaseStatuses.deploy}
          previousStatus={phaseStatuses.inspection}
          autoExecutionPermitted={workflowStore.autoExecutionPermissions.deploy}
          isExecuting={runningPhases.has('deploy')}
          canExecute={canExecutePhase('deploy')}
          isAutoPhase={isAutoExecuting && currentAutoPhase === 'deploy'}
          onExecute={() => handleExecutePhase('deploy')}
          onApprove={() => handleApprovePhase('deploy')}
          onApproveAndExecute={() => handleApproveAndExecutePhase('deploy')}
          onToggleAutoPermission={() => workflowStore.toggleAutoPermission('deploy')}
          onShowAgentLog={() => handleShowAgentLog('deploy')}
        />

        {/* SpecManagerStatusDisplay REMOVED
            Agent execution state is now displayed via AgentListPanel
            (running/completed/failed/hang/interrupted status icons) */}

      </div>

      {/* Specワークフローフッター */}
      {/* Task 5.1: Use isAutoExecuting from specStore */}
      {/* convert-spec-to-worktree: Task 3.3 - Pass convert to worktree props */}
      {/* spec-event-log: Task 8.1 - Pass event log handler */}
      <SpecWorkflowFooter
        isAutoExecuting={isAutoExecuting}
        hasRunningAgents={runningPhases.size > 0}
        onAutoExecution={handleAutoExecution}
        isOnMain={isOnMain}
        specJson={specJson}
        onConvertToWorktree={handleConvertToWorktree}
        isConverting={isConverting}
        onShowEventLog={handleShowEventLog}
      />

      {/* spec-event-log: Task 8.1 - Event Log Viewer Modal */}
      <EventLogViewerModal
        isOpen={isEventLogModalOpen}
        onClose={handleCloseEventLog}
        events={eventLogEntries}
        isLoading={eventLogLoading}
        error={eventLogError}
      />
    </div>
  );
}

// ============================================================
// SpecManagerStatusDisplay REMOVED
// Agent execution state is now displayed via AgentListPanel
// (running/completed/failed/hang/interrupted status icons)
// ============================================================
