/**
 * SpecActionsView Component
 *
 * Task 13.3: Validation・Review・Inspection UIを実装する
 *
 * Spec詳細ビューのアクションセクション。
 * DocumentReviewPanel, InspectionPanel, Validationボタンを統合。
 *
 * Requirements: 7.1
 */

import React, { useState, useCallback } from 'react';
import { CheckSquare, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { DocumentReviewPanel } from '@shared/components/review/DocumentReviewPanel';
import { InspectionPanel } from '@shared/components/review/InspectionPanel';
import type { ApiClient, SpecDetail, AgentInfo, ValidationType } from '@shared/api/types';
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
  const documentReviewState: DocumentReviewState | null =
    specDetail.specJson?.documentReview ?? null;
  const inspectionState: InspectionState | null =
    specDetail.specJson?.inspection ?? null;

  // Extract auto execution flags
  const documentReviewFlag: DocumentReviewAutoExecutionFlag =
    specDetail.specJson?.autoExecution?.documentReviewFlag ?? 'run';
  const inspectionFlag: InspectionAutoExecutionFlag =
    (specDetail.specJson?.autoExecution?.permissions?.inspection as InspectionAutoExecutionFlag) ?? 'run';

  // Check if tasks are approved (required for some actions)
  const tasksApproved = specDetail.specJson?.approvals?.tasks?.approved ?? false;

  // Handle document review start
  const handleStartReview = useCallback(async () => {
    setExecutingAction('document-review');
    const result = await apiClient.executeDocumentReview(specDetail.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('document-review', result.value);
    }
  }, [apiClient, specDetail.name, onActionExecuted]);

  // Handle document review reply execution
  const handleExecuteReply = useCallback(async (_roundNumber: number) => {
    setExecutingAction('document-review-reply');
    // This would call a specific reply execution API
    // For now, we'll just call document review
    const result = await apiClient.executeDocumentReview(specDetail.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('document-review-reply', result.value);
    }
  }, [apiClient, specDetail.name, onActionExecuted]);

  // Handle document review fix application
  const handleApplyFix = useCallback(async (_roundNumber: number) => {
    setExecutingAction('document-review-fix');
    // This would call a specific fix application API
    const result = await apiClient.executeDocumentReview(specDetail.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('document-review-fix', result.value);
    }
  }, [apiClient, specDetail.name, onActionExecuted]);

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
    const result = await apiClient.executeInspection(specDetail.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('inspection', result.value);
    }
  }, [apiClient, specDetail.name, onActionExecuted]);

  // Handle inspection fix execution
  const handleExecuteFix = useCallback(async (_roundNumber: number) => {
    setExecutingAction('inspection-fix');
    // This would call a specific fix execution API
    const result = await apiClient.executeInspection(specDetail.name);
    setExecutingAction(null);

    if (result.ok) {
      onActionExecuted?.('inspection-fix', result.value);
    }
  }, [apiClient, specDetail.name, onActionExecuted]);

  // Handle inspection auto execution flag change
  const handleInspectionFlagChange = useCallback(
    async (_flag: InspectionAutoExecutionFlag) => {
      // This would update spec.json
    },
    []
  );

  // Handle validation execution
  const handleValidation = useCallback(
    async (type: ValidationType) => {
      setExecutingAction(`validation-${type}`);
      const result = await apiClient.executeValidation(specDetail.name, type);
      setExecutingAction(null);

      if (result.ok) {
        onActionExecuted?.(`validation-${type}`, result.value);
      }
    },
    [apiClient, specDetail.name, onActionExecuted]
  );

  const isAnyExecuting = isExecuting || executingAction !== null;

  return (
    <div className="space-y-4 p-4" data-testid="spec-actions-view">
      {/* Document Review Panel */}
      <DocumentReviewPanel
        reviewState={documentReviewState}
        isExecuting={executingAction === 'document-review' || executingAction === 'document-review-reply' || executingAction === 'document-review-fix'}
        isAutoExecuting={isExecuting}
        hasTasks={tasksApproved}
        autoExecutionFlag={documentReviewFlag}
        onStartReview={handleStartReview}
        onExecuteReply={handleExecuteReply}
        onApplyFix={handleApplyFix}
        onAutoExecutionFlagChange={handleDocumentReviewFlagChange}
      />

      {/* Inspection Panel */}
      <div data-testid="inspection-panel">
        <InspectionPanel
          inspectionState={inspectionState}
          isExecuting={executingAction === 'inspection' || executingAction === 'inspection-fix'}
          isAutoExecuting={isExecuting}
          autoExecutionFlag={inspectionFlag === 'skip' ? 'skip' : inspectionFlag === true ? 'run' : 'pause'}
          canExecuteInspection={tasksApproved}
          onStartInspection={handleStartInspection}
          onExecuteFix={handleExecuteFix}
          onAutoExecutionFlagChange={handleInspectionFlagChange}
        />
      </div>

      {/* Validation Section */}
      <div
        data-testid="validation-section"
        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
      >
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="w-5 h-5 text-orange-500" />
          <h3 className="font-medium text-gray-800 dark:text-gray-200">Validation</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            data-testid="validation-gap-button"
            onClick={() => handleValidation('gap')}
            disabled={isAnyExecuting}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              isAnyExecuting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            )}
          >
            <Play className="w-4 h-4" />
            Gap検証
          </button>

          <button
            data-testid="validation-design-button"
            onClick={() => handleValidation('design')}
            disabled={isAnyExecuting}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              isAnyExecuting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            )}
          >
            <Play className="w-4 h-4" />
            設計検証
          </button>

          <button
            data-testid="validation-impl-button"
            onClick={() => handleValidation('impl')}
            disabled={isAnyExecuting}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              isAnyExecuting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            )}
          >
            <Play className="w-4 h-4" />
            実装検証
          </button>
        </div>
      </div>
    </div>
  );
}

export default SpecActionsView;
