/**
 * SpecDetailView Component
 *
 * Task 13.2: Spec詳細・Phase実行UIを実装する
 * git-worktree-support: Task 13.2 - worktree information display (Requirements: 4.1, 4.2)
 *
 * Spec詳細表示とPhase実行UI。PhaseItemを使用したワークフロー表示。
 * Phase実行ボタン、自動実行ボタンを提供。
 *
 * Requirements: 7.1
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Play, FileText, AlertCircle, GitBranch, FolderGit2, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { PhaseItem } from '@shared/components/workflow/PhaseItem';
import { AutoExecutionStatusDisplay } from '@shared/components/execution/AutoExecutionStatusDisplay';
import { Spinner } from '@shared/components/ui/Spinner';
import type {
  ApiClient,
  SpecMetadata,
  SpecDetail,
  WorkflowPhase,
  AgentInfo,
  Phase,
  AutoExecutionOptions,
} from '@shared/api/types';
import type { AutoExecutionStatus } from '@shared/types';

// =============================================================================
// Types
// =============================================================================

export interface SpecDetailViewProps {
  /** Spec metadata */
  spec: SpecMetadata;
  /** API client instance */
  apiClient: ApiClient;
  /** Called after phase execution starts */
  onPhaseExecuted?: (phase: WorkflowPhase, agent: AgentInfo) => void;
  /** Called after approval update */
  onApprovalUpdated?: (phase: Phase, approved: boolean) => void;
}

// Phase label mapping
const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
  impl: '実装',
  inspection: 'Inspection',
  deploy: 'デプロイ',
};

// Note: PHASE_TO_WORKFLOW is not currently used but kept for future extensibility
// const PHASE_TO_WORKFLOW: Record<Phase, WorkflowPhase> = {
//   requirements: 'requirements',
//   design: 'design',
//   tasks: 'tasks',
// };

// =============================================================================
// Helper Functions
// =============================================================================

function getPhaseStatus(
  specDetail: SpecDetail,
  phase: WorkflowPhase
): 'pending' | 'generated' | 'approved' {
  const approvals = specDetail.specJson?.approvals;
  if (!approvals) return 'pending';

  const phaseKey = phase as Phase;
  const approval = approvals[phaseKey];

  if (!approval) {
    // For impl, inspection, deploy - check if previous phases are approved
    if (phase === 'impl') {
      return approvals.tasks?.approved ? 'pending' : 'pending';
    }
    return 'pending';
  }

  if (approval.approved) return 'approved';
  if (approval.generated) return 'generated';
  return 'pending';
}

function getPreviousPhaseStatus(
  specDetail: SpecDetail,
  phase: WorkflowPhase
): 'pending' | 'generated' | 'approved' | null {
  const phaseOrder: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];
  const currentIndex = phaseOrder.indexOf(phase);
  if (currentIndex <= 0) return null;

  const previousPhase = phaseOrder[currentIndex - 1];
  return getPhaseStatus(specDetail, previousPhase);
}

function canExecutePhase(specDetail: SpecDetail, phase: WorkflowPhase): boolean {
  const currentStatus = getPhaseStatus(specDetail, phase);
  const previousStatus = getPreviousPhaseStatus(specDetail, phase);

  // Can execute if current is pending and previous is approved (or null for requirements)
  if (currentStatus !== 'pending') return false;
  if (previousStatus === null) return true; // requirements
  return previousStatus === 'approved';
}

function getAutoExecutionPermitted(specDetail: SpecDetail, phase: WorkflowPhase): boolean {
  const permissions = specDetail.specJson?.autoExecution?.permissions;
  if (!permissions) return false;

  const value = permissions[phase as keyof typeof permissions];
  return value === true;
}

// =============================================================================
// Component
// =============================================================================

export function SpecDetailView({
  spec,
  apiClient,
  onPhaseExecuted,
  onApprovalUpdated,
}: SpecDetailViewProps): React.ReactElement {
  // State
  const [specDetail, setSpecDetail] = useState<SpecDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingPhase, setExecutingPhase] = useState<WorkflowPhase | null>(null);
  const [autoExecutionStatus, setAutoExecutionStatus] = useState<AutoExecutionStatus>('idle');
  const [autoExecutionPhase, setAutoExecutionPhase] = useState<WorkflowPhase | null>(null);
  const [autoExecutionRetryCount, setAutoExecutionRetryCount] = useState(0);
  // Note: autoExecutionFailedPhase tracked for error recovery scenarios
  const [autoExecutionFailedPhase] = useState<WorkflowPhase | null>(null);

  // Load spec detail on mount or spec change
  useEffect(() => {
    async function loadSpecDetail() {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.getSpecDetail(spec.name);

      if (result.ok) {
        setSpecDetail(result.value);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    }

    loadSpecDetail();
  }, [apiClient, spec.name]);

  // Handle phase execution
  const handleExecutePhase = useCallback(
    async (phase: WorkflowPhase) => {
      setExecutingPhase(phase);

      const result = await apiClient.executePhase(spec.name, phase);

      setExecutingPhase(null);

      if (result.ok) {
        onPhaseExecuted?.(phase, result.value);
        // Reload spec detail to get updated state
        const detailResult = await apiClient.getSpecDetail(spec.name);
        if (detailResult.ok) {
          setSpecDetail(detailResult.value);
        }
      }
    },
    [apiClient, spec.name, onPhaseExecuted]
  );

  // Handle approval
  const handleApprove = useCallback(
    async (phase: WorkflowPhase) => {
      if (!specDetail) return;

      const phaseKey = phase as Phase;
      const result = await apiClient.updateApproval(spec.path, phaseKey, true);

      if (result.ok) {
        onApprovalUpdated?.(phaseKey, true);
        // Reload spec detail
        const detailResult = await apiClient.getSpecDetail(spec.name);
        if (detailResult.ok) {
          setSpecDetail(detailResult.value);
        }
      }
    },
    [apiClient, spec.path, spec.name, specDetail, onApprovalUpdated]
  );

  // Handle approve and execute
  const handleApproveAndExecute = useCallback(
    async (phase: WorkflowPhase) => {
      if (!specDetail) return;

      // First approve the previous phase
      const phaseOrder: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];
      const currentIndex = phaseOrder.indexOf(phase);
      if (currentIndex > 0) {
        const previousPhase = phaseOrder[currentIndex - 1] as Phase;
        await apiClient.updateApproval(spec.path, previousPhase, true);
      }

      // Then execute the current phase
      await handleExecutePhase(phase);
    },
    [apiClient, spec.path, specDetail, handleExecutePhase]
  );

  // Handle auto permission toggle
  const handleToggleAutoPermission = useCallback(
    async (_phase: WorkflowPhase) => {
      // This would typically update the spec.json autoExecution.permissions
      // For now, just reload the spec detail
      const detailResult = await apiClient.getSpecDetail(spec.name);
      if (detailResult.ok) {
        setSpecDetail(detailResult.value);
      }
    },
    [apiClient, spec.name]
  );

  // Handle auto execution start
  const handleStartAutoExecution = useCallback(async () => {
    if (!specDetail) return;

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
      validationOptions: specDetail.specJson?.autoExecution?.validationOptions ?? {
        gap: false,
        design: false,
        impl: false,
      },
    };

    const result = await apiClient.startAutoExecution(spec.path, spec.name, options);

    if (result.ok) {
      setAutoExecutionStatus(result.value.status);
      setAutoExecutionPhase(result.value.currentPhase ?? null);
    }
  }, [apiClient, spec.path, spec.name, specDetail]);

  // Handle auto execution stop
  const handleStopAutoExecution = useCallback(async () => {
    await apiClient.stopAutoExecution(spec.path);
    setAutoExecutionStatus('idle');
    setAutoExecutionPhase(null);
  }, [apiClient, spec.path]);

  // Handle auto execution retry
  const handleRetryAutoExecution = useCallback(async () => {
    setAutoExecutionRetryCount((c) => c + 1);
    await handleStartAutoExecution();
  }, [handleStartAutoExecution]);

  // Render loading state
  if (isLoading) {
    return (
      <div
        data-testid="spec-detail-loading"
        className="flex items-center justify-center h-full p-8"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        data-testid="spec-detail-error"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Render no detail state
  if (!specDetail) {
    return (
      <div
        data-testid="spec-detail-empty"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <FileText className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Spec詳細を読み込めませんでした</p>
      </div>
    );
  }

  const phases: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];

  return (
    <div data-testid="spec-detail-view" className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {specDetail.metadata.name}
            </h2>
          </div>
          <button
            data-testid="auto-execution-button"
            onClick={handleStartAutoExecution}
            disabled={autoExecutionStatus === 'running' || autoExecutionStatus === 'paused'}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-blue-500 text-white hover:bg-blue-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            <Play className="w-4 h-4" />
            Auto Execute All
          </button>
        </div>
      </div>

      {/* Auto Execution Status */}
      {autoExecutionStatus !== 'idle' && (
        <div className="flex-shrink-0 px-4">
          <AutoExecutionStatusDisplay
            status={autoExecutionStatus}
            currentPhase={autoExecutionPhase}
            lastFailedPhase={autoExecutionFailedPhase}
            retryCount={autoExecutionRetryCount}
            onRetry={handleRetryAutoExecution}
            onStop={handleStopAutoExecution}
          />
        </div>
      )}

      {/* git-worktree-support: Task 13.2 - Worktree Information Section */}
      {specDetail.specJson?.worktree && (
        <div className="flex-shrink-0 px-4">
          <WorktreeSection worktree={specDetail.specJson.worktree} />
        </div>
      )}

      {/* Workflow Phases */}
      <div className="flex-1 p-4 space-y-3">
        {phases.map((phase) => {
          const status = getPhaseStatus(specDetail, phase);
          const previousStatus = getPreviousPhaseStatus(specDetail, phase);
          const canExecute = canExecutePhase(specDetail, phase);
          const autoPermitted = getAutoExecutionPermitted(specDetail, phase);
          const isExecuting = executingPhase === phase;
          const isAutoPhase = autoExecutionPhase === phase;

          return (
            <PhaseItem
              key={phase}
              phase={phase}
              label={PHASE_LABELS[phase]}
              status={status}
              previousStatus={previousStatus}
              autoExecutionPermitted={autoPermitted}
              isExecuting={isExecuting}
              canExecute={canExecute}
              isAutoPhase={isAutoPhase}
              onExecute={() => handleExecutePhase(phase)}
              onApprove={() => handleApprove(phase)}
              onApproveAndExecute={() => handleApproveAndExecute(phase)}
              onToggleAutoPermission={() => handleToggleAutoPermission(phase)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default SpecDetailView;

// =============================================================================
// WorktreeSection Component
// git-worktree-support: Task 13.2
// Requirements: 4.1, 4.2
// =============================================================================

interface WorktreeSectionProps {
  worktree: {
    path: string;
    branch: string;
    created_at: string;
  };
}

function WorktreeSection({ worktree }: WorktreeSectionProps) {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      data-testid="worktree-section"
      className={clsx(
        'p-4 rounded-lg mb-4',
        'bg-violet-50 dark:bg-violet-900/20',
        'border border-violet-200 dark:border-violet-800'
      )}
    >
      <h3 className="text-base font-semibold text-violet-700 dark:text-violet-300 mb-3 flex items-center gap-2">
        <GitBranch className="w-5 h-5" />
        Worktree モード
      </h3>
      <div className="space-y-2">
        {/* Path */}
        <div className="flex items-start gap-2 text-sm">
          <FolderGit2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-500 dark:text-gray-400">パス:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-300 font-mono break-all">
              {worktree.path}
            </span>
          </div>
        </div>
        {/* Branch */}
        <div className="flex items-start gap-2 text-sm">
          <GitBranch className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-500 dark:text-gray-400">ブランチ:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-300 font-mono">
              {worktree.branch}
            </span>
          </div>
        </div>
        {/* Created At */}
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-500 dark:text-gray-400">作成日時:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-300">
              {formatDate(worktree.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
