/**
 * useElectronWorkflowState Hook
 *
 * Electron版向けWorkflowState取得フック
 * Zustandストアから状態を収集し、WorkflowStateインターフェースに変換
 *
 * workflow-view-unification: ステート抽象化レイヤー
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSpecStore } from '../stores/specStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useAutoExecutionStore } from '../stores/spec/autoExecutionStore';
import { useSpecDetailStore, getResolvedScheme } from '../stores/spec/specDetailStore';
import { useParallelModeStore } from '@shared/stores/parallelModeStore';
import { useMetricsStore } from '../stores/metricsStore';
import { useLaunchingState } from '@shared/hooks';
import { useAutoExecution } from './useAutoExecution';
import { useConvertToWorktree } from './useConvertToWorktree';
import { useHumanActivity } from './useHumanActivity';
import { notify } from '../stores';
import { hasWorktreePath } from '../types/worktree';
import { normalizeInspectionState } from '../types/inspection';
import {
  ALL_WORKFLOW_PHASES,
  getPhaseStatus,
  type WorkflowPhase,
  type ExtendedSpecJson,
} from '../types/workflow';
import type {
  WorkflowState,
  WorkflowHandlers,
  UseWorkflowStateReturn,
  PhaseStatus,
} from '@shared/types/workflowState';
import type { DocumentReviewState } from '@shared/types/review';
import type { ReviewerScheme } from '@shared/components/review';
import type { WorktreeConfig } from '../types/worktree';
import type { EventLogEntry, EventLogError } from '@shared/types';

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Electron版WorkflowState取得フック
 *
 * 全てのZustandストアから状態を収集し、統一されたWorkflowState形式で返す
 */
export function useElectronWorkflowState(): UseWorkflowStateReturn {
  // ---------------------------------------------------------------------------
  // Store Subscriptions
  // ---------------------------------------------------------------------------

  const { specDetail, isLoading, selectedSpec } = useSpecStore();
  const workflowStore = useWorkflowStore();
  const agents = useAgentStore((state) => state.agents);
  const getAgentsForSpec = useAgentStore((state) => state.getAgentsForSpec);

  // Auto Execution
  const autoExecution = useAutoExecution();
  const specId = specDetail?.metadata.name ?? '';
  const autoExecutionRuntimeMap = useSpecStore((state) => state.autoExecutionRuntimeMap);
  const autoExecutionRuntime = useMemo(() => {
    return autoExecutionRuntimeMap.get(specId) ?? {
      isAutoExecuting: false,
      currentAutoPhase: null,
      autoExecutionStatus: 'idle' as const,
    };
  }, [autoExecutionRuntimeMap, specId]);

  // Worktree
  const { isOnMain, isConverting, handleConvert: handleConvertToWorktree } = useConvertToWorktree();

  // Parallel Mode (only UI state, parallel task info comes from specDetail)
  const parallelModeEnabled = useParallelModeStore((state) => state.parallelModeEnabled);
  const toggleParallelMode = useParallelModeStore((state) => state.toggleParallelMode);

  // Metrics
  const currentMetrics = useMetricsStore((state) => state.currentMetrics);
  const loadMetrics = useMetricsStore((state) => state.loadMetrics);
  const { recordActivity, startTracking, stopTracking } = useHumanActivity();

  // Optimistic UI
  const { launching, wrapExecution } = useLaunchingState();

  // Event Log Modal State (used by handleShowEventLog)
  const [, setIsEventLogModalOpen] = useState(false);
  const [, setEventLogEntries] = useState<EventLogEntry[]>([]);
  const [, setEventLogLoading] = useState(false);
  const [, setEventLogError] = useState<EventLogError | null>(null);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  const specJson = specDetail?.specJson as ExtendedSpecJson | undefined;

  // Phase statuses
  const phaseStatuses = useMemo(() => {
    if (!specJson) return {} as Record<WorkflowPhase, PhaseStatus>;
    const statuses: Record<WorkflowPhase, PhaseStatus> = {} as Record<WorkflowPhase, PhaseStatus>;
    for (const phase of ALL_WORKFLOW_PHASES) {
      statuses[phase] = getPhaseStatus(phase, specJson);
    }
    if (specDetail?.taskProgress?.percentage === 100) {
      statuses.impl = 'approved';
    }
    return statuses;
  }, [specJson, specDetail?.taskProgress?.percentage]);

  // Running phases
  const runningPhases = useMemo(() => {
    if (!specDetail) return new Set<string>();
    const specAgents = getAgentsForSpec(specDetail.metadata.name);
    const running = specAgents
      .filter((a) => a.status === 'running')
      .map((a) => a.phase);
    return new Set(running);
  }, [agents, specDetail, getAgentsForSpec]);

  // Document Review State
  const documentReviewState = useMemo((): DocumentReviewState | null => {
    const reviewData = (specJson as ExtendedSpecJson & { documentReview?: DocumentReviewState })?.documentReview;
    return reviewData || null;
  }, [specJson]);

  const documentReviewScheme = useMemo((): ReviewerScheme => {
    return getResolvedScheme(useSpecDetailStore.getState());
  }, [specJson]);

  // Inspection State
  const inspectionState = useMemo(() => {
    const inspectionData = specJson?.inspection;
    return normalizeInspectionState(inspectionData);
  }, [specJson]);

  // Worktree State
  const isWorktreeModeSelected = useMemo(() => {
    if (hasWorktreePath({ worktree: specJson?.worktree })) {
      return true;
    }
    const worktree = specJson?.worktree as WorktreeConfig | undefined;
    return worktree?.enabled === true;
  }, [specJson?.worktree]);

  const hasExistingWorktree = useMemo(() => {
    return hasWorktreePath({ worktree: specJson?.worktree });
  }, [specJson?.worktree]);

  // Parallel Tasks (from specDetail.parallelTaskInfo - calculated in specDetailStore)
  const specHasParallelTasks = useMemo(() => {
    return (specDetail?.parallelTaskInfo?.parallelTasks ?? 0) > 0;
  }, [specDetail?.parallelTaskInfo?.parallelTasks]);

  const parallelTaskCount = useMemo(() => {
    return specDetail?.parallelTaskInfo?.parallelTasks ?? 0;
  }, [specDetail?.parallelTaskInfo?.parallelTasks]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load metrics and start activity tracking
  useEffect(() => {
    if (!specId) {
      stopTracking();
      return;
    }

    const apiClient = {
      getSpecMetrics: async (id: string) => {
        try {
          // IPC handler already returns { ok, value } or { ok, error } format
          const result = await window.electronAPI.getSpecMetrics(id);
          return result;
        } catch (error) {
          return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
        }
      },
      getProjectMetrics: async () => ({ ok: false as const, error: 'Not implemented' }),
    };
    loadMetrics(specId, apiClient);
    startTracking(specId);

    return () => {
      stopTracking();
    };
  }, [specId, loadMetrics, startTracking, stopTracking]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      if (phase === 'deploy' && hasWorktreePath({ worktree: specJson?.worktree })) {
        await window.electronAPI.execute({
          type: 'spec-merge',
          specId: specDetail.metadata.name,
          featureName: specDetail.metadata.name,
          commandPrefix: workflowStore.commandPrefix,
        });
        return;
      }

      await window.electronAPI.execute({
        type: phase as 'requirements' | 'design' | 'tasks' | 'deploy',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, specJson?.worktree, workflowStore.commandPrefix, wrapExecution]);

  const handleApprovePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;
    recordActivity('approval-button');
    try {
      await window.electronAPI.updateApproval(
        specDetail.metadata.name,
        phase as 'requirements' | 'design' | 'tasks',
        true
      );
    } catch (error) {
      console.error('Failed to approve phase:', error);
    }
  }, [specDetail, recordActivity]);

  const handleApproveAndExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    const previousPhase = ALL_WORKFLOW_PHASES[ALL_WORKFLOW_PHASES.indexOf(phase) - 1];
    if (previousPhase) {
      await handleApprovePhase(previousPhase);
    }
    await handleExecutePhase(phase);
  }, [handleApprovePhase, handleExecutePhase]);

  const handleToggleAutoPermission = useCallback((phase: WorkflowPhase) => {
    workflowStore.toggleAutoPermission(phase);
  }, [workflowStore]);

  const handleAutoExecution = useCallback(async () => {
    if (!specDetail) return;

    const { isAutoExecuting } = autoExecutionRuntime;

    if (isAutoExecuting) {
      const result = await autoExecution.stopAutoExecution(specDetail.metadata.name);
      if (!result.ok) {
        notify.error('自動実行の停止に失敗しました。');
        if (result.error.type === 'NOT_EXECUTING') {
          useAutoExecutionStore.getState().stopAutoExecution(specDetail.metadata.name);
        }
      }
    } else {
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
  }, [autoExecutionRuntime, specDetail, autoExecution, workflowStore.autoExecutionPermissions, workflowStore.documentReviewOptions.autoExecutionFlag]);

  const handleStartDocumentReview = useCallback(async () => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      await window.electronAPI.execute({
        type: 'document-review',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  const handleExecuteDocumentReviewReply = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      await window.electronAPI.execute({
        type: 'document-review-reply',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        reviewNumber: roundNumber,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  const handleApplyDocumentReviewFix = useCallback(async (roundNumber: number) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      await window.electronAPI.execute({
        type: 'document-review-fix',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        reviewNumber: roundNumber,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  const handleSchemeChange = useCallback(async (newScheme: ReviewerScheme) => {
    if (!specDetail) return;

    try {
      await window.electronAPI.updateSpecJson(specDetail.metadata.name, {
        documentReview: {
          ...specDetail.specJson.documentReview,
          scheme: newScheme,
        },
      });
    } catch (error) {
      console.error('Failed to update scheme:', error);
      notify.error('schemeの更新に失敗しました');
    }
  }, [specDetail]);

  const handleDocumentReviewAutoExecutionFlagChange = useCallback((flag: 'run' | 'pause') => {
    workflowStore.setDocumentReviewAutoExecutionFlag(flag);
  }, [workflowStore]);

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

  const handleToggleInspectionAutoPermission = useCallback(() => {
    workflowStore.toggleAutoPermission('inspection');
  }, [workflowStore]);

  const handleImplExecute = useCallback(async () => {
    if (!specDetail) return;

    const specName = specDetail.metadata.name;
    const featureName = specDetail.metadata.name;

    await wrapExecution(async () => {
      const result = await window.electronAPI.startImpl(
        specName,
        featureName,
        workflowStore.commandPrefix
      );

      if (!result.ok) {
        let message = 'impl 開始に失敗しました';
        if (result.error.type === 'NOT_ON_MAIN_BRANCH') {
          message = `Worktreeモードはmainブランチでのみ使用できます。現在: ${result.error.currentBranch}`;
        } else if (result.error.type === 'WORKTREE_CREATE_FAILED') {
          message = result.error.message || 'Worktree作成に失敗しました';
        } else if (result.error.message) {
          message = result.error.message;
        }
        notify.error(message);
      }
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  const handleExecuteTask = useCallback(async (taskId: string) => {
    if (!specDetail) return;

    await wrapExecution(async () => {
      await window.electronAPI.execute({
        type: 'impl',
        specId: specDetail.metadata.name,
        featureName: specDetail.metadata.name,
        taskId,
        commandPrefix: workflowStore.commandPrefix,
      });
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  const handleParallelExecute = useCallback(async () => {
    if (!specDetail) return;

    const specName = specDetail.metadata.name;
    const parallelTaskInfo = specDetail.parallelTaskInfo;

    if (!parallelTaskInfo || parallelTaskInfo.groups.length === 0) {
      notify.error('並列タスクが見つかりません');
      return;
    }

    await wrapExecution(async () => {
      const groups = parallelTaskInfo.groups;

      const pendingGroup = groups.find((group) =>
        group.tasks.some((task) => !task.completed)
      );

      if (!pendingGroup) {
        notify.info('全てのタスクが完了しています');
        return;
      }

      const pendingTasks = pendingGroup.tasks.filter((task) => !task.completed);

      if (pendingTasks.length === 0) {
        notify.info('実行可能なタスクがありません');
        return;
      }

      const executePromises = pendingTasks.map((task) =>
        window.electronAPI.execute({
          type: 'impl',
          specId: specName,
          featureName: specName,
          taskId: task.id,
          commandPrefix: workflowStore.commandPrefix,
        }).catch((error) => {
          console.error(`Failed to start task ${task.id}:`, error);
          return null;
        })
      );

      const results = await Promise.all(executePromises);
      const successCount = results.filter((r) => r !== null).length;

      if (successCount > 0) {
        notify.success(`${successCount}個のタスクを並列起動しました`);
      } else {
        notify.error('タスクの起動に失敗しました');
      }
    });
  }, [specDetail, workflowStore.commandPrefix, wrapExecution]);

  const handleToggleParallelMode = useCallback(() => {
    toggleParallelMode();
  }, [toggleParallelMode]);

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

  const handleShowAgentLog = useCallback((phase: WorkflowPhase) => {
    console.log('Show agent log for phase:', phase);
  }, []);

  // ---------------------------------------------------------------------------
  // Build State Object
  // ---------------------------------------------------------------------------

  const state: WorkflowState = useMemo(() => ({
    // Spec State
    selectedSpec: selectedSpec?.name ?? null,
    specDetail,
    isLoading,

    // Phase Status
    phaseStatuses,
    runningPhases,

    // Auto Execution
    isAutoExecuting: autoExecutionRuntime.isAutoExecuting,
    currentAutoPhase: autoExecutionRuntime.currentAutoPhase,
    autoExecutionStatus: autoExecutionRuntime.autoExecutionStatus,
    autoExecutionPermissions: workflowStore.autoExecutionPermissions,

    // Document Review
    documentReviewState,
    documentReviewScheme,
    documentReviewAutoExecutionFlag: workflowStore.documentReviewOptions.autoExecutionFlag,

    // Inspection
    inspectionState,

    // Worktree
    isWorktreeModeSelected,
    hasExistingWorktree,
    isOnMain,
    isConverting,

    // Parallel Execution
    parallelModeEnabled,
    hasParallelTasks: specHasParallelTasks,
    parallelTaskCount,

    // Metrics
    currentMetrics: currentMetrics ? {
      aiTimeSeconds: currentMetrics.totalAiTimeMs ? currentMetrics.totalAiTimeMs / 1000 : undefined,
      humanTimeSeconds: currentMetrics.totalHumanTimeMs ? currentMetrics.totalHumanTimeMs / 1000 : undefined,
      totalTimeSeconds: currentMetrics.totalElapsedMs ? currentMetrics.totalElapsedMs / 1000 : undefined,
      phaseMetrics: currentMetrics.phaseMetrics as Record<string, unknown>,
    } : null,

    // UI State
    launching,
    commandPrefix: workflowStore.commandPrefix,
  }), [
    selectedSpec,
    specDetail,
    isLoading,
    phaseStatuses,
    runningPhases,
    autoExecutionRuntime,
    workflowStore.autoExecutionPermissions,
    workflowStore.documentReviewOptions.autoExecutionFlag,
    workflowStore.commandPrefix,
    documentReviewState,
    documentReviewScheme,
    inspectionState,
    isWorktreeModeSelected,
    hasExistingWorktree,
    isOnMain,
    isConverting,
    parallelModeEnabled,
    specHasParallelTasks,
    parallelTaskCount,
    currentMetrics,
    launching,
  ]);

  // ---------------------------------------------------------------------------
  // Build Handlers Object
  // ---------------------------------------------------------------------------

  const handlers: WorkflowHandlers = useMemo(() => ({
    handleExecutePhase,
    handleApprovePhase,
    handleApproveAndExecutePhase,
    handleToggleAutoPermission,
    handleAutoExecution,
    handleStartDocumentReview,
    handleExecuteDocumentReviewReply,
    handleApplyDocumentReviewFix,
    handleSchemeChange,
    handleDocumentReviewAutoExecutionFlagChange,
    handleStartInspection,
    handleExecuteInspectionFix,
    handleToggleInspectionAutoPermission,
    handleImplExecute,
    handleExecuteTask,
    handleParallelExecute,
    handleToggleParallelMode,
    handleConvertToWorktree,
    handleShowEventLog,
    handleShowAgentLog,
  }), [
    handleExecutePhase,
    handleApprovePhase,
    handleApproveAndExecutePhase,
    handleToggleAutoPermission,
    handleAutoExecution,
    handleStartDocumentReview,
    handleExecuteDocumentReviewReply,
    handleApplyDocumentReviewFix,
    handleSchemeChange,
    handleDocumentReviewAutoExecutionFlagChange,
    handleStartInspection,
    handleExecuteInspectionFix,
    handleToggleInspectionAutoPermission,
    handleImplExecute,
    handleExecuteTask,
    handleParallelExecute,
    handleToggleParallelMode,
    handleConvertToWorktree,
    handleShowEventLog,
    handleShowAgentLog,
  ]);

  return { state, handlers };
}
