/**
 * useRemoteWorkflowState Hook
 *
 * Remote UI版向けWorkflowState取得フック
 * ApiClientとpropsから状態を収集し、WorkflowStateインターフェースに変換
 *
 * workflow-view-unification: ステート抽象化レイヤー
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useLaunchingState } from '@shared/hooks';
import { useParallelModeStore } from '@shared/stores/parallelModeStore';
import { parseTasksContent } from '@shared/utils/taskParallelParser';
import type {
  ApiClient,
  SpecMetadataWithPath,
  SpecDetail,
  WorkflowPhase,
  Phase,
  AutoExecutionOptions,
} from '@shared/api/types';
import type {
  WorkflowState,
  WorkflowHandlers,
  UseWorkflowStateReturn,
  PhaseStatus,
} from '@shared/types/workflowState';
import type {
  DocumentReviewState,
  InspectionState,
  DocumentReviewAutoExecutionFlag,
} from '@shared/types/review';
import type { ReviewerScheme } from '@shared/components/review';
import type { AutoExecutionStatus } from '@shared/types/execution';
import { hasWorktreePath } from '@renderer/types/worktree';

// =============================================================================
// Types
// =============================================================================

export interface UseRemoteWorkflowStateConfig {
  /** API client instance */
  apiClient: ApiClient;
  /** Selected spec metadata */
  spec: SpecMetadataWithPath | null;
  /** Pre-loaded spec detail (optional - if provided, won't load from apiClient) */
  initialSpecDetail?: SpecDetail | null;
  /** Callbacks */
  onPhaseExecuted?: (phase: WorkflowPhase, agentId: string) => void;
  onApprovalUpdated?: (phase: Phase, approved: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

const ALL_WORKFLOW_PHASES: readonly WorkflowPhase[] = [
  'requirements',
  'design',
  'tasks',
  'impl',
  'inspection',
  'deploy',
];

// =============================================================================
// Helper Functions
// =============================================================================

function getPhaseStatus(
  specDetail: SpecDetail | null,
  phase: WorkflowPhase
): PhaseStatus {
  if (!specDetail?.specJson?.approvals) return 'pending';

  const approval = specDetail.specJson.approvals[phase as Phase];
  if (!approval) return 'pending';

  if (approval.approved) return 'approved';
  if (approval.generated) return 'generated';
  return 'pending';
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Remote UI版WorkflowState取得フック
 *
 * ApiClientを使用して状態を管理し、統一されたWorkflowState形式で返す
 */
export function useRemoteWorkflowState(
  config: UseRemoteWorkflowStateConfig
): UseWorkflowStateReturn {
  const { apiClient, spec, initialSpecDetail, onPhaseExecuted, onApprovalUpdated } = config;

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------

  const [specDetail, setSpecDetail] = useState<SpecDetail | null>(initialSpecDetail ?? null);
  const [isLoading, setIsLoading] = useState(!initialSpecDetail);
  const [autoExecutionStatus, setAutoExecutionStatus] = useState<AutoExecutionStatus>('idle');
  const [currentAutoPhase, setCurrentAutoPhase] = useState<WorkflowPhase | null>(null);
  const [runningPhases, setRunningPhases] = useState<Set<string>>(new Set());

  // Optimistic UI
  const { launching, wrapExecution } = useLaunchingState();

  // Parallel Mode Store
  const parallelModeEnabled = useParallelModeStore((state) => state.parallelModeEnabled);
  const toggleParallelMode = useParallelModeStore((state) => state.toggleParallelMode);
  const hasParallelTasks = useParallelModeStore((state) => state.hasParallelTasks);
  const getParseResult = useParallelModeStore((state) => state.getParseResult);
  const setParseResult = useParallelModeStore((state) => state.setParseResult);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Update specDetail when initialSpecDetail changes (for pre-loaded data)
  useEffect(() => {
    if (initialSpecDetail) {
      setSpecDetail(initialSpecDetail);
      setIsLoading(false);
    }
  }, [initialSpecDetail]);

  // Load spec detail when spec changes (only if no initialSpecDetail)
  useEffect(() => {
    // Skip loading if initialSpecDetail is provided
    if (initialSpecDetail) return;

    if (!spec) {
      setSpecDetail(null);
      setIsLoading(false);
      return;
    }

    const loadSpecDetail = async () => {
      setIsLoading(true);
      const result = await apiClient.getSpecDetail(spec.name);
      if (result.ok) {
        setSpecDetail(result.value);
      }
      setIsLoading(false);
    };

    loadSpecDetail();
  }, [apiClient, spec?.name, initialSpecDetail]);

  // Parse tasks for parallel execution
  // This mirrors the useEffect in useElectronWorkflowState.ts
  useEffect(() => {
    const specName = spec?.name;
    if (!specName || !specDetail?.artifacts?.tasks?.content) return;

    // Skip if already parsed
    const cachedResult = getParseResult(specName);
    if (cachedResult) return;

    // Parse tasks.md content to detect parallel markers
    const parseResult = parseTasksContent(specDetail.artifacts.tasks.content);
    if (parseResult) {
      setParseResult(specName, {
        groups: parseResult.groups,
        totalTasks: parseResult.totalTasks,
        parallelTasks: parseResult.parallelTasks,
      });
    }
  }, [spec?.name, specDetail?.artifacts?.tasks?.content, getParseResult, setParseResult]);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  const phaseStatuses = useMemo(() => {
    const statuses: Record<WorkflowPhase, PhaseStatus> = {} as Record<WorkflowPhase, PhaseStatus>;
    for (const phase of ALL_WORKFLOW_PHASES) {
      statuses[phase] = getPhaseStatus(specDetail, phase);
    }
    // タスク進捗100%の場合、implフェーズをapprovedにする
    if (specDetail?.taskProgress?.percentage === 100) {
      statuses.impl = 'approved';
    }
    return statuses;
  }, [specDetail]);

  const documentReviewState = useMemo((): DocumentReviewState | null => {
    return (specDetail?.specJson as { documentReview?: DocumentReviewState })?.documentReview ?? null;
  }, [specDetail]);

  const documentReviewScheme = useMemo((): ReviewerScheme => {
    // scheme is not in shared type but may exist in actual data
    const state = documentReviewState as DocumentReviewState & { scheme?: ReviewerScheme } | null;
    return state?.scheme ?? 'claude-code';
  }, [documentReviewState]);

  const inspectionState = useMemo((): InspectionState | null => {
    const inspection = (specDetail?.specJson as { inspection?: InspectionState })?.inspection;
    return inspection ?? null;
  }, [specDetail]);

  const isWorktreeModeSelected = useMemo(() => {
    return hasWorktreePath({ worktree: specDetail?.specJson?.worktree });
  }, [specDetail?.specJson?.worktree]);

  const hasImplStarted = useMemo(() => {
    const worktree = specDetail?.specJson?.worktree as { impl_started?: boolean } | undefined;
    return worktree?.impl_started === true;
  }, [specDetail?.specJson?.worktree]);

  const hasExistingWorktree = useMemo(() => {
    return hasWorktreePath({ worktree: specDetail?.specJson?.worktree });
  }, [specDetail?.specJson?.worktree]);

  const specHasParallelTasks = useMemo(() => {
    const specName = spec?.name;
    if (!specName) return false;
    return hasParallelTasks(specName);
  }, [spec?.name, hasParallelTasks]);

  const parallelTaskCount = useMemo(() => {
    const specName = spec?.name;
    if (!specName) return 0;
    const result = getParseResult(specName);
    return result?.parallelTasks ?? 0;
  }, [spec?.name, getParseResult]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const refreshSpecDetail = useCallback(async () => {
    if (!spec) return;
    const result = await apiClient.getSpecDetail(spec.name);
    if (result.ok) {
      setSpecDetail(result.value);
    }
  }, [apiClient, spec?.name]);

  const handleExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!spec) return;

    await wrapExecution(async () => {
      const result = await apiClient.executePhase(spec.name, phase);
      if (result.ok) {
        onPhaseExecuted?.(phase, result.value.id);
        setRunningPhases((prev) => new Set([...prev, phase]));
        await refreshSpecDetail();
      }
    });
  }, [apiClient, spec, wrapExecution, onPhaseExecuted, refreshSpecDetail]);

  const handleApprovePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!spec) return;

    const result = await apiClient.updateApproval(spec.path, phase as Phase, true);
    if (result.ok) {
      onApprovalUpdated?.(phase as Phase, true);
      await refreshSpecDetail();
    }
  }, [apiClient, spec, onApprovalUpdated, refreshSpecDetail]);

  const handleApproveAndExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    const previousPhase = ALL_WORKFLOW_PHASES[ALL_WORKFLOW_PHASES.indexOf(phase) - 1];
    if (previousPhase) {
      await handleApprovePhase(previousPhase);
    }
    await handleExecutePhase(phase);
  }, [handleApprovePhase, handleExecutePhase]);

  const handleToggleAutoPermission = useCallback((_phase: WorkflowPhase) => {
    // Remote UI doesn't have local auto execution permissions
    // This would need to be stored in spec.json and synced
    console.log('Toggle auto permission - not implemented in Remote UI');
  }, []);

  const handleAutoExecution = useCallback(async () => {
    if (!spec || !specDetail) return;

    if (autoExecutionStatus === 'running') {
      const result = await apiClient.stopAutoExecution(spec.path);
      if (result.ok) {
        setAutoExecutionStatus('idle');
        setCurrentAutoPhase(null);
      }
    } else {
      const options: AutoExecutionOptions = {
        permissions: specDetail.specJson?.autoExecution?.permissions ?? {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
        documentReviewFlag: specDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run',
      };

      const result = await apiClient.startAutoExecution(spec.path, spec.name, options);
      if (result.ok) {
        setAutoExecutionStatus(result.value.status);
        setCurrentAutoPhase(result.value.currentPhase ?? null);
      }
    }
  }, [apiClient, spec, specDetail, autoExecutionStatus]);

  const handleStartDocumentReview = useCallback(async () => {
    if (!spec) return;

    await wrapExecution(async () => {
      const result = await apiClient.executeDocumentReview(spec.name);
      if (result.ok) {
        setRunningPhases((prev) => new Set([...prev, 'document-review']));
        await refreshSpecDetail();
      }
    });
  }, [apiClient, spec, wrapExecution, refreshSpecDetail]);

  const handleExecuteDocumentReviewReply = useCallback(async (_roundNumber: number) => {
    // Remote UI doesn't have this API yet
    console.log('Execute document review reply - not implemented in Remote UI');
  }, []);

  const handleApplyDocumentReviewFix = useCallback(async (_roundNumber: number) => {
    // Remote UI doesn't have this API yet
    console.log('Apply document review fix - not implemented in Remote UI');
  }, []);

  const handleSchemeChange = useCallback(async (_scheme: ReviewerScheme) => {
    // Remote UI would need API to update spec.json
    console.log('Scheme change - not implemented in Remote UI');
  }, []);

  const handleDocumentReviewAutoExecutionFlagChange = useCallback((_flag: DocumentReviewAutoExecutionFlag) => {
    // Remote UI doesn't have local settings
    console.log('Document review auto execution flag change - not implemented in Remote UI');
  }, []);

  const handleStartInspection = useCallback(async () => {
    if (!spec) return;

    await wrapExecution(async () => {
      const result = await apiClient.executeInspection(spec.name);
      if (result.ok) {
        setRunningPhases((prev) => new Set([...prev, 'inspection']));
        await refreshSpecDetail();
      }
    });
  }, [apiClient, spec, wrapExecution, refreshSpecDetail]);

  const handleExecuteInspectionFix = useCallback(async (_roundNumber: number) => {
    // Remote UI doesn't have this API yet
    console.log('Execute inspection fix - not implemented in Remote UI');
  }, []);

  const handleToggleInspectionAutoPermission = useCallback(() => {
    // Remote UI doesn't have local settings
    console.log('Toggle inspection auto permission - not implemented in Remote UI');
  }, []);

  const handleImplExecute = useCallback(async () => {
    if (!spec) return;

    await wrapExecution(async () => {
      const result = await apiClient.executePhase(spec.name, 'impl');
      if (result.ok) {
        setRunningPhases((prev) => new Set([...prev, 'impl']));
        await refreshSpecDetail();
      }
    });
  }, [apiClient, spec, wrapExecution, refreshSpecDetail]);

  const handleExecuteTask = useCallback(async (_taskId: string) => {
    // Remote UI doesn't have task-specific execution API yet
    console.log('Execute task - not implemented in Remote UI');
  }, []);

  const handleParallelExecute = useCallback(async () => {
    // Remote UI doesn't have parallel execution API yet
    console.log('Parallel execute - not implemented in Remote UI');
  }, []);

  const handleToggleParallelMode = useCallback(() => {
    toggleParallelMode();
  }, [toggleParallelMode]);

  const handleConvertToWorktree = useCallback(async () => {
    // Remote UI doesn't have worktree conversion API yet
    console.log('Convert to worktree - not implemented in Remote UI');
  }, []);

  const handleShowEventLog = useCallback(async () => {
    // Remote UI doesn't have event log API yet
    console.log('Show event log - not implemented in Remote UI');
  }, []);

  const handleShowAgentLog = useCallback((_phase: WorkflowPhase) => {
    console.log('Show agent log - not implemented in Remote UI');
  }, []);

  // ---------------------------------------------------------------------------
  // Build State Object
  // ---------------------------------------------------------------------------

  const state: WorkflowState = useMemo(() => ({
    // Spec State
    selectedSpec: spec?.name ?? null,
    specDetail,
    isLoading,

    // Phase Status
    phaseStatuses,
    runningPhases,

    // Auto Execution
    isAutoExecuting: autoExecutionStatus === 'running',
    currentAutoPhase,
    autoExecutionStatus,
    autoExecutionPermissions: specDetail?.specJson?.autoExecution?.permissions ?? {
      requirements: true,
      design: true,
      tasks: true,
      impl: false,
      inspection: false,
      deploy: false,
    },

    // Document Review
    documentReviewState,
    documentReviewScheme,
    documentReviewAutoExecutionFlag: specDetail?.specJson?.autoExecution?.documentReviewFlag ?? 'run',

    // Inspection
    inspectionState,

    // Worktree
    isWorktreeModeSelected,
    hasImplStarted,
    hasExistingWorktree,
    isOnMain: true, // Remote UI doesn't know about git state
    isConverting: false,

    // Parallel Execution
    parallelModeEnabled,
    hasParallelTasks: specHasParallelTasks,
    parallelTaskCount,

    // Metrics
    currentMetrics: null, // Not implemented in Remote UI

    // UI State
    launching,
    commandPrefix: 'kiro',
  }), [
    spec?.name,
    specDetail,
    isLoading,
    phaseStatuses,
    runningPhases,
    autoExecutionStatus,
    currentAutoPhase,
    documentReviewState,
    documentReviewScheme,
    inspectionState,
    isWorktreeModeSelected,
    hasImplStarted,
    hasExistingWorktree,
    parallelModeEnabled,
    specHasParallelTasks,
    parallelTaskCount,
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
