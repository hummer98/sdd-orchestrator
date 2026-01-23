/**
 * WorkflowViewCore Component
 *
 * Props駆動の共通ワークフローUI
 * Electron版とRemote UI版で共通のレンダリングロジックを提供
 *
 * workflow-view-unification: ステート抽象化後の共通コンポーネント
 */

import { useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import { PhaseItem } from './PhaseItem';
import { ImplPhasePanel } from './ImplPhasePanel';
import { SpecWorkflowFooter } from './SpecWorkflowFooter';
import { DocumentReviewPanel, InspectionPanel } from '@shared/components/review';
import type { WorkflowState, WorkflowHandlers } from '@shared/types/workflowState';
import type { WorkflowPhase } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface WorkflowViewCoreProps {
  /** ワークフロー状態 */
  state: WorkflowState;
  /** ワークフローハンドラー */
  handlers: WorkflowHandlers;
  /** タスク一覧（TaskProgressView用） */
  parsedTasks?: TaskItem[];
  /** イベントログモーダルの状態（オプション） */
  eventLogModal?: {
    isOpen: boolean;
    entries: unknown[];
    isLoading: boolean;
    error: unknown;
    onClose: () => void;
  };
  /** メトリクスパネルをレンダリングする関数（オプション） */
  renderMetrics?: () => React.ReactNode;
  /** TaskProgressViewをレンダリングする関数（オプション） */
  renderTaskProgress?: () => React.ReactNode;
  /** EventLogViewerModalをレンダリングする関数（オプション） */
  renderEventLogModal?: () => React.ReactNode;
}

export interface TaskItem {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// =============================================================================
// Constants
// =============================================================================

const DISPLAY_PHASES: WorkflowPhase[] = ['requirements', 'design', 'tasks'];

const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
  impl: '実装',
  inspection: 'Inspection',
  deploy: 'デプロイ',
};

const ALL_WORKFLOW_PHASES: WorkflowPhase[] = [
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

function canExecutePhase(
  state: WorkflowState,
  phase: WorkflowPhase
): boolean {
  // 同じspec内で既にAgentが実行中なら不可
  if (state.runningPhases.size > 0) return false;

  const index = ALL_WORKFLOW_PHASES.indexOf(phase);
  if (index === 0) return true; // requirements は常に実行可能

  // 前のフェーズが approved でなければ不可
  const prevPhase = ALL_WORKFLOW_PHASES[index - 1];
  return state.phaseStatuses[prevPhase] === 'approved';
}

function getPreviousStatus(
  state: WorkflowState,
  phase: WorkflowPhase
): 'pending' | 'generated' | 'approved' | null {
  const index = ALL_WORKFLOW_PHASES.indexOf(phase);
  if (index <= 0) return null;
  return state.phaseStatuses[ALL_WORKFLOW_PHASES[index - 1]];
}

// =============================================================================
// Component
// =============================================================================

export function WorkflowViewCore({
  state,
  handlers,
  renderMetrics,
  renderTaskProgress,
  renderEventLogModal,
}: WorkflowViewCoreProps): React.ReactElement {
  // Derived values
  const isReviewExecuting = useMemo(() => {
    return (
      state.runningPhases.has('document-review') ||
      state.runningPhases.has('document-review-reply') ||
      state.runningPhases.has('document-review-fix')
    );
  }, [state.runningPhases]);

  const isInspectionExecuting = useMemo(() => {
    return state.runningPhases.has('inspection') || state.runningPhases.has('inspection-fix');
  }, [state.runningPhases]);

  const isImplExecuting = useMemo(() => {
    return state.runningPhases.has('impl');
  }, [state.runningPhases]);

  const canStartImpl = useMemo(() => {
    return state.phaseStatuses.tasks === 'approved' && state.runningPhases.size === 0;
  }, [state.phaseStatuses.tasks, state.runningPhases.size]);

  const deployLabel = state.hasExistingWorktree ? 'マージ' : 'コミット';

  // Empty state
  if (!state.selectedSpec) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        仕様を選択してください
      </div>
    );
  }

  // Loading state
  if (state.isLoading || !state.specDetail) {
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
        {/* Metrics Summary Panel (custom render) */}
        {renderMetrics?.()}

        {/* Display Phases (requirements, design, tasks) */}
        {DISPLAY_PHASES.map((phase, index) => (
          <div key={phase}>
            <PhaseItem
              phase={phase}
              label={PHASE_LABELS[phase]}
              status={state.phaseStatuses[phase]}
              previousStatus={getPreviousStatus(state, phase)}
              autoExecutionPermitted={state.autoExecutionPermissions[phase]}
              isExecuting={state.runningPhases.has(phase)}
              canExecute={canExecutePhase(state, phase)}
              isAutoPhase={state.isAutoExecuting && state.currentAutoPhase === phase}
              onExecute={() => handlers.handleExecutePhase(phase)}
              onApprove={() => handlers.handleApprovePhase(phase)}
              onApproveAndExecute={() => handlers.handleApproveAndExecutePhase(phase)}
              onToggleAutoPermission={() => handlers.handleToggleAutoPermission(phase)}
              onShowAgentLog={() => handlers.handleShowAgentLog(phase)}
            />

            {/* Connector Arrow */}
            {index < DISPLAY_PHASES.length - 1 && (
              <div data-testid="phase-connector" className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {/* Arrow from tasks to DocumentReviewPanel */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Document Review Panel */}
        <div className="my-3">
          <DocumentReviewPanel
            reviewState={state.documentReviewState}
            isExecuting={isReviewExecuting}
            isAutoExecuting={state.isAutoExecuting}
            hasTasks={!!state.specDetail?.artifacts?.tasks?.content}
            autoExecutionFlag={state.documentReviewAutoExecutionFlag}
            onStartReview={handlers.handleStartDocumentReview}
            onExecuteReply={handlers.handleExecuteDocumentReviewReply}
            onApplyFix={handlers.handleApplyDocumentReviewFix}
            onAutoExecutionFlagChange={handlers.handleDocumentReviewAutoExecutionFlagChange}
            scheme={state.documentReviewScheme}
            onSchemeChange={handlers.handleSchemeChange}
            launching={state.launching}
          />
        </div>

        {/* Arrow from DocumentReviewPanel to impl phase */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* ImplPhasePanel */}
        <ImplPhasePanel
          worktreeModeSelected={state.isWorktreeModeSelected}
          isImplStarted={state.hasImplStarted}
          status={state.phaseStatuses.impl}
          autoExecutionPermitted={state.autoExecutionPermissions.impl}
          isExecuting={isImplExecuting}
          canExecute={canStartImpl}
          isAutoPhase={state.isAutoExecuting && state.currentAutoPhase === 'impl'}
          onExecute={handlers.handleImplExecute}
          onToggleAutoPermission={() => handlers.handleToggleAutoPermission('impl')}
          hasParallelTasks={state.hasParallelTasks}
          parallelTaskCount={state.parallelTaskCount}
          parallelModeEnabled={state.parallelModeEnabled}
          onToggleParallelMode={handlers.handleToggleParallelMode}
          onExecuteParallel={handlers.handleParallelExecute}
        />

        {/* Task Progress (custom render) */}
        {renderTaskProgress?.()}

        {/* Arrow to InspectionPanel */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* InspectionPanel */}
        <div className="my-3">
          <InspectionPanel
            inspectionState={state.inspectionState}
            isExecuting={isInspectionExecuting}
            isAutoExecuting={state.isAutoExecuting}
            autoExecutionPermitted={state.autoExecutionPermissions.inspection}
            canExecuteInspection={
              state.phaseStatuses.tasks === 'approved' &&
              state.specDetail?.taskProgress?.percentage === 100
            }
            onStartInspection={handlers.handleStartInspection}
            onExecuteFix={handlers.handleExecuteInspectionFix}
            onToggleAutoPermission={handlers.handleToggleInspectionAutoPermission}
            launching={state.launching}
          />
        </div>

        {/* Arrow to deploy PhaseItem */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Deploy PhaseItem */}
        <PhaseItem
          phase="deploy"
          label={deployLabel}
          status={state.phaseStatuses.deploy}
          previousStatus={state.phaseStatuses.inspection}
          autoExecutionPermitted={state.autoExecutionPermissions.deploy}
          isExecuting={state.runningPhases.has('deploy')}
          canExecute={canExecutePhase(state, 'deploy')}
          isAutoPhase={state.isAutoExecuting && state.currentAutoPhase === 'deploy'}
          onExecute={() => handlers.handleExecutePhase('deploy')}
          onApprove={() => handlers.handleApprovePhase('deploy')}
          onApproveAndExecute={() => handlers.handleApproveAndExecutePhase('deploy')}
          onToggleAutoPermission={() => handlers.handleToggleAutoPermission('deploy')}
          onShowAgentLog={() => handlers.handleShowAgentLog('deploy')}
        />
      </div>

      {/* Footer */}
      <SpecWorkflowFooter
        isAutoExecuting={state.isAutoExecuting}
        hasRunningAgents={state.runningPhases.size > 0}
        onAutoExecution={handlers.handleAutoExecution}
        isOnMain={state.isOnMain}
        specJson={state.specDetail?.specJson}
        onConvertToWorktree={handlers.handleConvertToWorktree}
        isConverting={state.isConverting}
        onShowEventLog={handlers.handleShowEventLog}
      />

      {/* Event Log Modal (custom render) */}
      {renderEventLogModal?.()}
    </div>
  );
}

export default WorkflowViewCore;
