/**
 * SpecActionsView Component
 *
 * Task 13.3: Validation・Review・Inspection UIを実装する
 * inspection-permission-unification fix: Restored GO/NOGO toggle using permissions.inspection
 * remote-ui-artifact-editor: PhaseItemワークフローを統合（メインパネルから移動）
 *
 * 右ペインにワークフロー全体を表示：
 * - 6フェーズ（PhaseItem x 6）
 * - Document Review Panel
 * - Inspection Panel
 *
 * Requirements: 7.1
 */

import React, { useState, useCallback } from 'react';
import { PhaseItem } from '@shared/components/workflow/PhaseItem';
import { DocumentReviewPanel } from '@shared/components/review/DocumentReviewPanel';
import { InspectionPanel } from '@shared/components/review/InspectionPanel';
import type { ReviewerScheme } from '@shared/components/review/SchemeSelector';
import type { ApiClient, SpecDetail, AgentInfo, SpecJson, WorkflowPhase, Phase } from '@shared/api/types';
import type {
  DocumentReviewState,
  DocumentReviewAutoExecutionFlag,
  InspectionState,
} from '@shared/types';

// =============================================================================
// Types
// =============================================================================

export interface SpecActionsViewProps {
  /** Spec detail */
  specDetail: SpecDetail;
  /** Spec path for approval updates */
  specPath: string;
  /** API client instance */
  apiClient: ApiClient;
  /** Whether any agent is currently executing */
  isExecuting?: boolean;
  /** Called when an action is executed */
  onActionExecuted?: (action: string, agent: AgentInfo) => void;
  /** Called after phase execution */
  onPhaseExecuted?: (phase: WorkflowPhase, agent: AgentInfo) => void;
  /** Called after approval update */
  onApprovalUpdated?: (phase: Phase, approved: boolean) => void;
}

/**
 * Phase label mapping
 * document-review-phase Task 1.2: 'document-review' のラベルを追加
 * Requirements: 1.3
 */
const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
  'document-review': 'ドキュメントレビュー',
  impl: '実装',
  inspection: 'Inspection',
  deploy: 'デプロイ',
};

// =============================================================================
// Helper Functions for Workflow
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

export function SpecActionsView({
  specDetail,
  specPath,
  apiClient,
  isExecuting = false,
  onActionExecuted,
  onPhaseExecuted,
  onApprovalUpdated,
}: SpecActionsViewProps): React.ReactElement {
  // State for tracking execution
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [executingPhase, setExecutingPhase] = useState<WorkflowPhase | null>(null);

  // Extract states from spec.json
  const documentReviewRaw = specDetail.specJson?.documentReview;
  const documentReviewState: DocumentReviewState | null = documentReviewRaw
    ? {
        status: (documentReviewRaw.status ?? 'pending') as DocumentReviewState['status'],
        currentRound: documentReviewRaw.currentRound,
        roundDetails: documentReviewRaw.roundDetails?.map((rd) => ({
          roundNumber: rd.roundNumber,
          status: (rd.status ?? 'incomplete') as 'review_complete' | 'reply_complete' | 'incomplete',
          reviewCompletedAt: rd.reviewCompletedAt,
          replyCompletedAt: rd.replyCompletedAt,
          fixStatus: rd.fixStatus,
          fixRequired: rd.fixRequired,
          needsDiscussion: rd.needsDiscussion,
        })),
      }
    : null;

  const inspectionRaw = specDetail.specJson?.inspection;
  const inspectionState: InspectionState | null = inspectionRaw && 'rounds' in inspectionRaw && Array.isArray(inspectionRaw.rounds)
    ? { rounds: inspectionRaw.rounds }
    : null;

  // Extract auto execution flags
  // document-review-phase Task 7.2: documentReviewFlag derived from permissions['document-review']
  const documentReviewFlag: DocumentReviewAutoExecutionFlag =
    specDetail.specJson?.autoExecution?.permissions?.['document-review'] !== false ? 'run' : 'pause';
  // inspection-permission-unification fix: Get inspection permission from permissions.inspection
  const inspectionPermission = specDetail.specJson?.autoExecution?.permissions?.inspection ?? true;

  // Check if tasks are approved (required for some actions)
  const tasksApproved = specDetail.specJson?.approvals?.tasks?.approved ?? false;

  // gemini-document-review: Get scheme from spec.json
  const documentReviewScheme = documentReviewRaw?.scheme as ReviewerScheme | undefined;

  // gemini-document-review: State for optimistic scheme update
  const [optimisticScheme, setOptimisticScheme] = useState<ReviewerScheme | undefined>(documentReviewScheme);
  const [isSavingScheme, setIsSavingScheme] = useState(false);

  // =============================================================================
  // Phase Execution Handlers (remote-ui-artifact-editor)
  // =============================================================================

  // Handle phase execution
  const handleExecutePhase = useCallback(
    async (phase: WorkflowPhase) => {
      setExecutingPhase(phase);

      const result = await apiClient.executePhase(specDetail.metadata.name, phase);

      setExecutingPhase(null);

      if (result.ok) {
        onPhaseExecuted?.(phase, result.value);
      }
    },
    [apiClient, specDetail.metadata.name, onPhaseExecuted]
  );

  // Handle approval
  const handleApprove = useCallback(
    async (phase: WorkflowPhase) => {
      const phaseKey = phase as Phase;
      const result = await apiClient.updateApproval(specPath, phaseKey, true);

      if (result.ok) {
        onApprovalUpdated?.(phaseKey, true);
      }
    },
    [apiClient, specPath, onApprovalUpdated]
  );

  // Handle approve and execute next phase
  const handleApproveAndExecute = useCallback(
    async (phase: WorkflowPhase) => {
      // First approve the previous phase
      const phaseOrder: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];
      const currentIndex = phaseOrder.indexOf(phase);
      if (currentIndex > 0) {
        const previousPhase = phaseOrder[currentIndex - 1] as Phase;
        await apiClient.updateApproval(specPath, previousPhase, true);
      }

      // Then execute the current phase
      await handleExecutePhase(phase);
    },
    [apiClient, specPath, handleExecutePhase]
  );

  // Handle auto permission toggle
  const handleToggleAutoPermission = useCallback(
    async (_phase: WorkflowPhase) => {
      // Not fully supported in Remote UI - requires server-side API
      console.warn('[SpecActionsView] Auto permission toggle not fully supported in Remote UI');
    },
    []
  );

  // =============================================================================
  // Document Review Handlers
  // =============================================================================

  // Handle document review start
  const handleStartReview = useCallback(async () => {
    setExecutingAction('document-review');
    const result = await apiClient.executeDocumentReview(specDetail.metadata.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('document-review', result.value);
    }
  }, [apiClient, specDetail.metadata.name, onActionExecuted]);

  // Handle document review reply execution
  const handleExecuteReply = useCallback(async (_roundNumber: number) => {
    setExecutingAction('document-review-reply');
    // This would call a specific reply execution API
    // For now, we'll just call document review
    const result = await apiClient.executeDocumentReview(specDetail.metadata.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('document-review-reply', result.value);
    }
  }, [apiClient, specDetail.metadata.name, onActionExecuted]);

  // Handle document review fix application
  const handleApplyFix = useCallback(async (_roundNumber: number) => {
    setExecutingAction('document-review-fix');
    // This would call a specific fix application API
    const result = await apiClient.executeDocumentReview(specDetail.metadata.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('document-review-fix', result.value);
    }
  }, [apiClient, specDetail.metadata.name, onActionExecuted]);

  // Handle document review auto execution flag change
  const handleDocumentReviewFlagChange = useCallback(
    async (_flag: DocumentReviewAutoExecutionFlag) => {
      // This would update spec.json
    },
    []
  );

  // Handle inspection start
  const handleStartInspection = useCallback(async () => {
    setExecutingAction('inspection');
    const result = await apiClient.executeInspection(specDetail.metadata.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('inspection', result.value);
    }
  }, [apiClient, specDetail.metadata.name, onActionExecuted]);

  // Handle inspection fix execution
  const handleExecuteFix = useCallback(async (_roundNumber: number) => {
    setExecutingAction('inspection-fix');
    // This would call a specific fix execution API
    const result = await apiClient.executeInspection(specDetail.metadata.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('inspection-fix', result.value);
    }
  }, [apiClient, specDetail.metadata.name, onActionExecuted]);

  // inspection-permission-unification fix: Handle inspection permission toggle
  const handleToggleInspectionPermission = useCallback(async () => {
    // Toggle inspection permission via API
    // Note: This requires server-side API implementation to update spec.json
    console.warn('[SpecActionsView] Inspection permission toggle not fully supported in Remote UI');
    // TODO: Implement via apiClient.toggleAutoPermission('inspection')
  }, []);

  // gemini-document-review: Handle scheme change
  // Requirements: 7.2, 7.3, 7.4
  // spec-path-ssot-refactor: Remote UI doesn't have path in SpecMetadata
  // This feature is not fully supported in Remote UI - scheme changes need server-side API
  const handleSchemeChange = useCallback(
    async (newScheme: ReviewerScheme) => {
      const previousScheme = optimisticScheme;

      // Optimistic update
      setOptimisticScheme(newScheme);
      setIsSavingScheme(true);

      try {
        // spec-path-ssot-refactor: Remote UI scheme update requires server-side implementation
        // For now, log a warning and revert to previous scheme
        console.warn('[SpecActionsView] Scheme change not fully supported in Remote UI');

        // Create updated spec.json content (for future server-side API)
        const updatedSpecJson: SpecJson = {
          ...specDetail.specJson,
          documentReview: {
            ...specDetail.specJson.documentReview,
            status: specDetail.specJson.documentReview?.status ?? 'pending',
            scheme: newScheme,
          },
        };

        // TODO: Implement server-side API for scheme update
        // For now, just log the change
        console.log('[SpecActionsView] Scheme would be updated to:', newScheme, updatedSpecJson);

        // Rollback for now until server-side API is implemented
        setOptimisticScheme(previousScheme);
      } catch (err) {
        // Rollback on error
        setOptimisticScheme(previousScheme);
        console.error('Error saving scheme:', err);
      } finally {
        setIsSavingScheme(false);
      }
    },
    [apiClient, specDetail.specJson, optimisticScheme]
  );

  // Phase list for workflow
  const phases: WorkflowPhase[] = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];

  return (
    <div className="space-y-4 p-4" data-testid="spec-actions-view">
      {/* Workflow Phases - remote-ui-artifact-editor */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Workflow
        </h3>
        {phases.map((phase) => {
          const status = getPhaseStatus(specDetail, phase);
          const previousStatus = getPreviousPhaseStatus(specDetail, phase);
          const canExecute = canExecutePhase(specDetail, phase);
          const autoPermitted = getAutoExecutionPermitted(specDetail, phase);
          const isPhaseExecuting = executingPhase === phase;

          return (
            <PhaseItem
              key={phase}
              phase={phase}
              label={PHASE_LABELS[phase]}
              status={status}
              previousStatus={previousStatus}
              autoExecutionPermitted={autoPermitted}
              isExecuting={isPhaseExecuting}
              canExecute={canExecute}
              isAutoPhase={false}
              onExecute={() => handleExecutePhase(phase)}
              onApprove={() => handleApprove(phase)}
              onApproveAndExecute={() => handleApproveAndExecute(phase)}
              onToggleAutoPermission={() => handleToggleAutoPermission(phase)}
            />
          );
        })}
      </div>

      {/* Document Review Panel */}
      <DocumentReviewPanel
        reviewState={documentReviewState}
        isExecuting={isSavingScheme || executingAction === 'document-review' || executingAction === 'document-review-reply' || executingAction === 'document-review-fix'}
        isAutoExecuting={isExecuting}
        hasTasks={tasksApproved}
        autoExecutionFlag={documentReviewFlag}
        onStartReview={handleStartReview}
        onExecuteReply={handleExecuteReply}
        onApplyFix={handleApplyFix}
        onAutoExecutionFlagChange={handleDocumentReviewFlagChange}
        scheme={optimisticScheme}
        onSchemeChange={handleSchemeChange}
      />

      {/* Inspection Panel */}
      <InspectionPanel
          inspectionState={inspectionState}
          isExecuting={executingAction === 'inspection' || executingAction === 'inspection-fix'}
          isAutoExecuting={isExecuting}
          autoExecutionPermitted={inspectionPermission}
          canExecuteInspection={tasksApproved}
          onStartInspection={handleStartInspection}
          onExecuteFix={handleExecuteFix}
          onToggleAutoPermission={handleToggleInspectionPermission}
      />
    </div>
  );
}

export default SpecActionsView;
