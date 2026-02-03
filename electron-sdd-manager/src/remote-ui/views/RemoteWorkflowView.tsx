/**
 * RemoteWorkflowView Component
 *
 * Remote UI版向けワークフロービューのラッパー
 * useRemoteWorkflowStateフックを使用して状態を取得し、
 * WorkflowViewCoreにpropsとして渡す
 *
 * workflow-view-unification: 統一されたワークフロービュー
 * remote-ui-task-display: Task 4.1 - TaskProgressBar integration
 */

import React from 'react';
import { WorkflowViewCore, TaskProgressBar } from '@shared/components/workflow';
import { useRemoteWorkflowState } from '../hooks/useRemoteWorkflowState';
import { useRemoteTaskProgress } from '../hooks/useRemoteTaskProgress';
import type { ApiClient, SpecMetadataWithPath, SpecDetail, WorkflowPhase, Phase } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface RemoteWorkflowViewProps {
  /** API client instance */
  apiClient: ApiClient;
  /** Selected spec metadata */
  spec: SpecMetadataWithPath | null;
  /** Pre-loaded spec detail (optional - if provided, won't load from apiClient) */
  specDetail?: SpecDetail | null;
  /** Called after phase execution starts */
  onPhaseExecuted?: (phase: WorkflowPhase, agentId: string) => void;
  /** Called after approval update */
  onApprovalUpdated?: (phase: Phase, approved: boolean) => void;
  /** フッターのセーフエリアパディングを無効化（親がセーフエリアを処理する場合） */
  disableFooterSafeArea?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function RemoteWorkflowView({
  apiClient,
  spec,
  specDetail: initialSpecDetail,
  onPhaseExecuted,
  onApprovalUpdated,
  disableFooterSafeArea = false,
}: RemoteWorkflowViewProps): React.ReactElement {
  const { state, handlers } = useRemoteWorkflowState({
    apiClient,
    spec,
    initialSpecDetail,
    onPhaseExecuted,
    onApprovalUpdated,
  });

  // remote-ui-task-display Task 4.1: Use useRemoteTaskProgress for task progress
  // Requirements: 3.1, 3.2, 3.3, 3.4, 5.3
  const { taskProgress, tasksContent, isLoading: isTaskProgressLoading } = useRemoteTaskProgress({
    apiClient,
    specId: spec?.name ?? null,
    specDetail: state.specDetail,
  });

  // Render task progress bar via renderTaskProgress prop
  const renderTaskProgress = () => (
    <TaskProgressBar
      taskProgress={taskProgress}
      tasksContent={tasksContent}
      isLoading={isTaskProgressLoading}
      testId="remote-task-progress"
    />
  );

  return (
    <WorkflowViewCore
      state={state}
      handlers={handlers}
      disableFooterSafeArea={disableFooterSafeArea}
      renderTaskProgress={renderTaskProgress}
    />
  );
}

export default RemoteWorkflowView;
