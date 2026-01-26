/**
 * RemoteWorkflowView Component
 *
 * Remote UI版向けワークフロービューのラッパー
 * useRemoteWorkflowStateフックを使用して状態を取得し、
 * WorkflowViewCoreにpropsとして渡す
 *
 * workflow-view-unification: 統一されたワークフロービュー
 */

import React from 'react';
import { WorkflowViewCore } from '@shared/components/workflow';
import { useRemoteWorkflowState } from '../hooks/useRemoteWorkflowState';
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

  // Remote UI currently doesn't have metrics or task progress views
  // These can be added later when the APIs are implemented

  return (
    <WorkflowViewCore
      state={state}
      handlers={handlers}
      disableFooterSafeArea={disableFooterSafeArea}
    />
  );
}

export default RemoteWorkflowView;
