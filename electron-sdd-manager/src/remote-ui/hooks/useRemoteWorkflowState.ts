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
import { getImplMode } from '@renderer/types/implMode';
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
import { DEFAULT_AUTO_EXECUTION_PERMISSIONS } from '@renderer/stores/workflowStore';

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
  // Subscribe to parseResults changes to trigger re-render when tasks are parsed
  const parseResults = useParallelModeStore((state) => state.parseResults);

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

  const hasExistingWorktree = useMemo(() => {
    return hasWorktreePath({ worktree: specDetail?.specJson?.worktree });
  }, [specDetail?.specJson?.worktree]);

  const specHasParallelTasks = useMemo(() => {
    const specName = spec?.name;
    if (!specName) return false;
    return hasParallelTasks(specName);
  }, [spec?.name, hasParallelTasks, parseResults]);

  const parallelTaskCount = useMemo(() => {
    const specName = spec?.name;
    if (!specName) return 0;
    const result = getParseResult(specName);
    return result?.parallelTasks ?? 0;
  }, [spec?.name, getParseResult, parseResults]);

  // Implementation Mode (impl-mode-toggle: Task 1.2)
  // Requirements: 1.3 - デフォルト値 'sequential'
  const implMode = useMemo(() => {
    return getImplMode(specDetail?.specJson ?? {});
  }, [specDetail?.specJson]);

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

  // auto-execution-ssot: Update spec.json directly via ApiClient
  const handleToggleAutoPermission = useCallback(async (phase: WorkflowPhase) => {
    if (!spec || !apiClient.updateSpecJson) {
      console.warn('[useRemoteWorkflowState] updateSpecJson not available');
      return;
    }

    const currentPermissions = specDetail?.specJson?.autoExecution?.permissions ?? DEFAULT_AUTO_EXECUTION_PERMISSIONS;
    const newPermissions = {
      ...currentPermissions,
      [phase]: !currentPermissions[phase],
    };

    const result = await apiClient.updateSpecJson(spec.name, {
      autoExecution: {
        ...specDetail?.specJson?.autoExecution,
        permissions: newPermissions,
      },
    });

    if (result.ok) {
      // Refresh spec detail to get the updated permissions
      await refreshSpecDetail();
    } else {
      console.error('[useRemoteWorkflowState] Failed to toggle auto permission:', result.error);
    }
  }, [apiClient, spec, specDetail?.specJson?.autoExecution, refreshSpecDetail]);

  const handleAutoExecution = useCallback(async () => {
    if (!spec || !specDetail) return;

    if (autoExecutionStatus === 'running') {
      const result = await apiClient.stopAutoExecution(spec.path);
      if (result.ok) {
        setAutoExecutionStatus('idle');
        setCurrentAutoPhase(null);
      }
    } else {
      // document-review-phase Task 2.1: 'document-review' を追加
      const options: AutoExecutionOptions = {
        permissions: specDetail.specJson?.autoExecution?.permissions ?? {
          requirements: true,
          design: true,
          tasks: true,
          'document-review': true,
          impl: false,
          inspection: false,
          deploy: false,
        },
        // document-review-phase: documentReviewFlag removed - use permissions['document-review'] instead
      };

      // auto-execution-projectpath-fix Task 4.5: Get projectPath from API client
      const projectPath = apiClient.getProjectPath?.() ?? '';
      const result = await apiClient.startAutoExecution(projectPath, spec.path, spec.name, options);
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

  // auto-execution-ssot: Use handleToggleAutoPermission to update spec.json
  const handleDocumentReviewAutoExecutionFlagChange = useCallback((_flag: DocumentReviewAutoExecutionFlag) => {
    handleToggleAutoPermission('document-review');
  }, [handleToggleAutoPermission]);

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

  // auto-execution-ssot: Use handleToggleAutoPermission to update spec.json
  const handleToggleInspectionAutoPermission = useCallback(() => {
    handleToggleAutoPermission('inspection');
  }, [handleToggleAutoPermission]);

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
    // spec-auto-impl-command: Remote UI would use auto-impl when implemented
    // Currently stub - would call /kiro:spec-auto-impl for parallel batch execution
    console.log('Parallel execute (auto-impl) - not implemented in Remote UI');
  }, []);

  const handleToggleParallelMode = useCallback(() => {
    toggleParallelMode();
  }, [toggleParallelMode]);

  // impl-mode-toggle: Task 4.1 - Toggle impl mode handler
  // Remote UI would need API to update spec.json
  const handleToggleImplMode = useCallback(async () => {
    console.log('Toggle impl mode - not implemented in Remote UI');
  }, []);

  // isConverting state for worktree conversion
  const [isConverting, setIsConverting] = useState(false);

  const handleConvertToWorktree = useCallback(async () => {
    if (!spec || !apiClient.convertToWorktree) {
      console.log('Convert to worktree - API not available');
      return;
    }

    setIsConverting(true);
    try {
      const result = await apiClient.convertToWorktree(spec.name, spec.name);
      if (result.ok) {
        // Refresh spec detail after conversion
        await refreshSpecDetail();
      } else {
        console.error('Failed to convert to worktree:', result.error);
      }
    } finally {
      setIsConverting(false);
    }
  }, [apiClient, spec, refreshSpecDetail]);

  const handleShowEventLog = useCallback(async () => {
    // Remote UI doesn't have event log API yet
    console.log('Show event log - not implemented in Remote UI');
  }, []);

  const handleShowAgentLog = useCallback((_phase: WorkflowPhase) => {
    console.log('Show agent log - not implemented in Remote UI');
  }, []);

  // worktree-rebase-from-main: Task 8.1b - Rebase from main handler for Remote UI
  // Requirements: 8.1, 8.2, 8.3, 8.4
  const [isRebasing, setIsRebasing] = useState(false);

  const handleRebaseFromMain = useCallback(async () => {
    if (!spec || !apiClient.rebaseFromMain) {
      console.log('Rebase from main - API not available');
      return;
    }

    setIsRebasing(true);
    try {
      const result = await apiClient.rebaseFromMain(spec.path);

      if (result.ok) {
        // Remote UI displays notifications via WebSocket or local state
        // Success/error handling would be done in the UI layer
        await refreshSpecDetail();
      } else {
        console.error('Failed to rebase from main:', result.error);
      }
    } finally {
      setIsRebasing(false);
    }
  }, [apiClient, spec, refreshSpecDetail]);

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
    // document-review-phase Task 2.1: 'document-review' を追加
    autoExecutionPermissions: specDetail?.specJson?.autoExecution?.permissions ?? {
      requirements: true,
      design: true,
      tasks: true,
      'document-review': true,
      impl: false,
      inspection: false,
      deploy: false,
    },

    // Document Review
    documentReviewState,
    documentReviewScheme,
    // document-review-phase: documentReviewAutoExecutionFlag derived from permissions['document-review']
    documentReviewAutoExecutionFlag: specDetail?.specJson?.autoExecution?.permissions?.['document-review'] !== false ? 'run' : 'pause',

    // Inspection
    inspectionState,

    // Worktree
    isWorktreeModeSelected,
    hasExistingWorktree,
    isOnMain: true, // Remote UI doesn't know about git state
    isConverting,
    // worktree-rebase-from-main: Task 8.1b - Rebase state for Remote UI
    isRebasing,

    // Parallel Execution
    parallelModeEnabled,
    hasParallelTasks: specHasParallelTasks,
    parallelTaskCount,

    // Implementation Mode (impl-mode-toggle: Task 1.2)
    implMode,

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
    hasExistingWorktree,
    isConverting,
    parallelModeEnabled,
    specHasParallelTasks,
    parallelTaskCount,
    implMode,
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
    handleToggleImplMode,
    handleConvertToWorktree,
    // worktree-rebase-from-main: Task 8.1b - Rebase handler for Remote UI
    handleRebaseFromMain,
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
    handleToggleImplMode,
    handleConvertToWorktree,
    // worktree-rebase-from-main: Task 8.1b - Rebase handler dependency
    handleRebaseFromMain,
    handleShowEventLog,
    handleShowAgentLog,
  ]);

  return { state, handlers };
}
