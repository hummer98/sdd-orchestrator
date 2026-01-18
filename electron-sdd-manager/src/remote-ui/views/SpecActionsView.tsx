/**
 * SpecActionsView Component
 *
 * Task 13.3: Validation・Review・Inspection UIを実装する
 *
 * Spec詳細ビューのアクションセクション。
 * DocumentReviewPanel, InspectionPanelを統合。
 *
 * Requirements: 7.1
 */

import React, { useState, useCallback } from 'react';
import { DocumentReviewPanel } from '@shared/components/review/DocumentReviewPanel';
import { InspectionPanel } from '@shared/components/review/InspectionPanel';
import type { ReviewerScheme } from '@shared/components/review/SchemeSelector';
import type { ApiClient, SpecDetail, AgentInfo, SpecJson } from '@shared/api/types';
import type {
  DocumentReviewState,
  DocumentReviewAutoExecutionFlag,
  InspectionState,
  InspectionAutoExecutionFlag,
} from '@shared/types';

// =============================================================================
// Types
// =============================================================================

export interface SpecActionsViewProps {
  /** Spec detail */
  specDetail: SpecDetail;
  /** API client instance */
  apiClient: ApiClient;
  /** Whether any agent is currently executing */
  isExecuting?: boolean;
  /** Called when an action is executed */
  onActionExecuted?: (action: string, agent: AgentInfo) => void;
}

// =============================================================================
// Component
// =============================================================================

export function SpecActionsView({
  specDetail,
  apiClient,
  isExecuting = false,
  onActionExecuted,
}: SpecActionsViewProps): React.ReactElement {
  // State for tracking execution
  const [executingAction, setExecutingAction] = useState<string | null>(null);

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
  const documentReviewFlag: DocumentReviewAutoExecutionFlag =
    specDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run';
  const inspectionPermission = specDetail.specJson?.autoExecution?.permissions?.inspection;
  const inspectionFlag: InspectionAutoExecutionFlag =
    inspectionPermission === true ? 'run' : 'pause';

  // Check if tasks are approved (required for some actions)
  const tasksApproved = specDetail.specJson?.approvals?.tasks?.approved ?? false;

  // gemini-document-review: Get scheme from spec.json
  const documentReviewScheme = documentReviewRaw?.scheme as ReviewerScheme | undefined;

  // gemini-document-review: State for optimistic scheme update
  const [optimisticScheme, setOptimisticScheme] = useState<ReviewerScheme | undefined>(documentReviewScheme);
  const [isSavingScheme, setIsSavingScheme] = useState(false);

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

  // Handle inspection auto execution flag change
  const handleInspectionFlagChange = useCallback(
    async (_flag: InspectionAutoExecutionFlag) => {
      // This would update spec.json
    },
    []
  );

  // gemini-document-review: Handle scheme change
  // Requirements: 7.2, 7.3, 7.4
  const handleSchemeChange = useCallback(
    async (newScheme: ReviewerScheme) => {
      const previousScheme = optimisticScheme;

      // Optimistic update
      setOptimisticScheme(newScheme);
      setIsSavingScheme(true);

      try {
        // Build spec.json path from spec metadata
        const specJsonPath = `${specDetail.metadata.path}/spec.json`;

        // Create updated spec.json content
        const updatedSpecJson: SpecJson = {
          ...specDetail.specJson,
          documentReview: {
            ...specDetail.specJson.documentReview,
            status: specDetail.specJson.documentReview?.status ?? 'pending',
            scheme: newScheme,
          },
        };

        // Save via API
        const result = await apiClient.saveFile(specJsonPath, JSON.stringify(updatedSpecJson, null, 2));

        if (!result.ok) {
          // Rollback on error
          setOptimisticScheme(previousScheme);
          console.error('Failed to save scheme:', result.error);
        }
      } catch (err) {
        // Rollback on error
        setOptimisticScheme(previousScheme);
        console.error('Error saving scheme:', err);
      } finally {
        setIsSavingScheme(false);
      }
    },
    [apiClient, specDetail.metadata.path, specDetail.specJson, optimisticScheme]
  );

  return (
    <div className="space-y-4 p-4" data-testid="spec-actions-view">
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
      <div data-testid="inspection-panel">
        <InspectionPanel
          inspectionState={inspectionState}
          isExecuting={executingAction === 'inspection' || executingAction === 'inspection-fix'}
          isAutoExecuting={isExecuting}
          autoExecutionFlag={inspectionFlag}
          canExecuteInspection={tasksApproved}
          onStartInspection={handleStartInspection}
          onExecuteFix={handleExecuteFix}
          onAutoExecutionFlagChange={handleInspectionFlagChange}
        />
      </div>
    </div>
  );
}

export default SpecActionsView;
