/**
 * BugDetailView Component
 *
 * Task 13.6: Bug詳細・Phase実行UIを実装する
 *
 * Bug詳細表示とPhase実行UI。
 * Bug報告情報、分析結果、ワークフロー制御を提供。
 *
 * Requirements: 7.2
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bug, Play, Check, AlertCircle, FileText, Wrench, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '@shared/components/ui/Spinner';
import type { ApiClient, BugMetadataWithPath, BugDetail, BugAction, AgentInfo } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

// spec-path-ssot-refactor: Remote UI uses BugMetadataWithPath which includes path
export interface BugDetailViewProps {
  /** Bug metadata with path (from WebSocket API) */
  bug: BugMetadataWithPath;
  /** API client instance */
  apiClient: ApiClient;
  /** Called after phase execution starts */
  onPhaseExecuted?: (phase: BugAction, agent: AgentInfo) => void;
}

type BugPhase = 'reported' | 'analyzed' | 'fixed' | 'verified';

// Phase label mapping
const BUG_PHASE_LABELS: Record<BugAction, string> = {
  analyze: '分析',
  fix: '修正',
  verify: '検証',
};

const BUG_PHASE_ORDER: BugPhase[] = ['reported', 'analyzed', 'fixed', 'verified'];

// =============================================================================
// Helper Functions
// =============================================================================

function getPhaseIndex(phase: BugPhase): number {
  return BUG_PHASE_ORDER.indexOf(phase);
}

function canExecuteAction(currentPhase: BugPhase, action: BugAction): boolean {
  const currentIndex = getPhaseIndex(currentPhase);
  switch (action) {
    case 'analyze':
      return currentIndex === 0; // reported
    case 'fix':
      return currentIndex === 1; // analyzed
    case 'verify':
      return currentIndex === 2; // fixed
    default:
      return false;
  }
}

function isPhaseComplete(currentPhase: BugPhase, action: BugAction): boolean {
  const currentIndex = getPhaseIndex(currentPhase);
  switch (action) {
    case 'analyze':
      return currentIndex > 0;
    case 'fix':
      return currentIndex > 1;
    case 'verify':
      return currentIndex > 2;
    default:
      return false;
  }
}

// =============================================================================
// Component
// =============================================================================

export function BugDetailView({
  bug,
  apiClient,
  onPhaseExecuted,
}: BugDetailViewProps): React.ReactElement {
  // State
  const [bugDetail, setBugDetail] = useState<BugDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingPhase, setExecutingPhase] = useState<BugAction | null>(null);

  // Load bug detail on mount or bug change
  useEffect(() => {
    async function loadBugDetail() {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.getBugDetail(bug.path);

      if (result.ok) {
        setBugDetail(result.value);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    }

    loadBugDetail();
  }, [apiClient, bug.path]);

  // Handle phase execution
  const handleExecutePhase = useCallback(
    async (action: BugAction) => {
      setExecutingPhase(action);

      const result = await apiClient.executeBugPhase(bug.name, action);

      setExecutingPhase(null);

      if (result.ok) {
        onPhaseExecuted?.(action, result.value);
        // Reload bug detail to get updated state
        const detailResult = await apiClient.getBugDetail(bug.path);
        if (detailResult.ok) {
          setBugDetail(detailResult.value);
        }
      }
    },
    [apiClient, bug.name, bug.path, onPhaseExecuted]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div
        data-testid="bug-detail-loading"
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
        data-testid="bug-detail-error"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Render no detail state
  if (!bugDetail) {
    return (
      <div
        data-testid="bug-detail-empty"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <Bug className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Bug詳細を読み込めませんでした</p>
      </div>
    );
  }

  const currentPhase = bugDetail.metadata.phase as BugPhase;
  const actions: BugAction[] = ['analyze', 'fix', 'verify'];

  return (
    <div data-testid="bug-detail-view" className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {bugDetail.metadata.name}
          </h2>
          {/* remote-ui-vanilla-removal: Phase tag for E2E */}
          <span
            data-testid="remote-bug-phase-tag"
            className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700"
          >
            {currentPhase}
          </span>
        </div>
      </div>

      {/* Bug Report */}
      {bugDetail.artifacts.report?.exists && (
        <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-800 dark:text-gray-200">レポート</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {bugDetail.artifacts.report.content && (
              <p>{bugDetail.artifacts.report.content.slice(0, 200)}...</p>
            )}
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {bugDetail.artifacts.analysis?.exists && (
        <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-medium text-gray-800 dark:text-gray-200">分析結果</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {bugDetail.artifacts.analysis.content && (
              <p>{bugDetail.artifacts.analysis.content.slice(0, 200)}...</p>
            )}
          </div>
        </div>
      )}

      {/* Workflow Phases */}
      <div className="flex-1 p-4 space-y-3">
        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">ワークフロー</h3>
        {actions.map((action) => {
          const isComplete = isPhaseComplete(currentPhase, action);
          const canExecute = canExecuteAction(currentPhase, action);
          const isExecuting = executingPhase === action;

          return (
            <div
              key={action}
              data-testid={`bug-phase-${action}`}
              className={clsx(
                'flex items-center justify-between p-3 rounded-lg',
                'bg-gray-50 dark:bg-gray-800',
                'transition-colors'
              )}
            >
              {/* Left side: Icon + phase name */}
              <div className="flex items-center gap-2">
                <span className="p-1">
                  {isComplete ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : isExecuting ? (
                    <Spinner size="sm" />
                  ) : action === 'analyze' ? (
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  ) : action === 'fix' ? (
                    <Wrench className="w-4 h-4 text-gray-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                  )}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {BUG_PHASE_LABELS[action]}
                </span>
              </div>

              {/* Right side: Action button */}
              {/* Note: Keep bug-phase-{action}-button for existing unit tests, add remote-bug-action for E2E */}
              <div className="flex items-center gap-2">
                {!isComplete && (
                  <button
                    data-testid={`bug-phase-${action}-button`}
                    onClick={() => handleExecutePhase(action)}
                    disabled={!canExecute || isExecuting}
                    className={clsx(
                      'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                      canExecute && !isExecuting
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400',
                      'transition-colors'
                    )}
                  >
                    <Play className="w-4 h-4" />
                    実行
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BugDetailView;
