/**
 * SpecPane Component
 * Main + Right pane container for Spec workflow
 * Bug fix: bugs-tab-agent-list-missing
 * Bug fix: bugs-tab-spec-editing-feature (shared ArtifactEditor)
 * git-diff-viewer Task 9.1: CenterPaneContainer integration
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSpecStore } from '../stores';
import {
  AgentListPanel,
  ResizeHandle,
} from './index';
import { CenterPaneContainer } from './CenterPaneContainer';
// workflow-view-unification: Use unified workflow view
import { ElectronWorkflowView as WorkflowView } from './ElectronWorkflowView';
import type { TabInfo, ArtifactInfo } from './ArtifactEditor';
import type { ArtifactType } from '../stores/editorStore';
import { normalizeInspectionState } from '../types/inspection';

interface SpecPaneProps {
  /** Right pane width */
  rightPaneWidth: number;
  /** Agent list panel height */
  agentListHeight: number;
  /** Callback for right pane resize */
  onRightResize: (delta: number) => void;
  /** Callback for agent list resize */
  onAgentListResize: (delta: number) => void;
  /** Callback when resize ends (for saving layout) */
  onResizeEnd: () => void;
}

/**
 * SpecPane - Container for Spec workflow (Main + Right pane)
 * Renders ArtifactEditor + AgentListPanel + WorkflowView when a spec is selected,
 * or a placeholder when no spec is selected.
 */
export function SpecPane({
  rightPaneWidth,
  agentListHeight,
  onRightResize,
  onAgentListResize,
  onResizeEnd,
}: SpecPaneProps): React.ReactElement {
  const { selectedSpec, specDetail, isDetailLoading } = useSpecStore();

  // git-diff-viewer Task 9.1: View mode state (artifacts or git-diff)
  const [viewMode, setViewMode] = useState<'artifacts' | 'git-diff'>('artifacts');

  // Handle view mode change with layout persistence
  const handleViewModeChange = useCallback(async (mode: 'artifacts' | 'git-diff') => {
    setViewMode(mode);
    // Save to layout config (fire-and-forget for UX)
    // Read current config first, then update viewMode
    try {
      const currentConfig = await window.electronAPI?.loadLayoutConfig?.();
      if (currentConfig) {
        await window.electronAPI?.saveLayoutConfig?.({ ...currentConfig, viewMode: mode });
      }
    } catch (err) {
      console.error('[SpecPane] Failed to save viewMode:', err);
    }
  }, []);

  // Load view mode from layout config on mount
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const config = await window.electronAPI?.loadLayoutConfig?.();
        if (config?.viewMode) {
          setViewMode(config.viewMode);
        }
      } catch (err) {
        console.error('[SpecPane] Failed to load viewMode:', err);
      }
    };
    loadViewMode();
  }, []);

  // Build document review tabs from roundDetails
  const documentReviewTabs = useMemo((): TabInfo[] => {
    const reviewState = specDetail?.specJson?.documentReview;
    if (!reviewState?.roundDetails || reviewState.roundDetails.length === 0) {
      return [];
    }

    const tabs: TabInfo[] = [];
    const sortedDetails = [...reviewState.roundDetails].sort(
      (a, b) => a.roundNumber - b.roundNumber
    );

    for (const detail of sortedDetails) {
      const n = detail.roundNumber;
      tabs.push({
        key: `document-review-${n}` as ArtifactType,
        label: `Review-${n}`,
      });
      if (detail.status === 'reply_complete') {
        tabs.push({
          key: `document-review-${n}-reply` as ArtifactType,
          label: `Reply-${n}`,
        });
      }
    }

    return tabs;
  }, [specDetail?.specJson?.documentReview]);

  // Build inspection tabs from spec.json inspection field (InspectionState)
  // Bug fix: inspection-state-data-model - normalize inspection state before use
  // Bug fix: inspection-files-display-issue - show all inspection rounds (not just latest)
  const inspectionTabs = useMemo((): TabInfo[] => {
    const inspection = normalizeInspectionState(specDetail?.specJson?.inspection);
    if (!inspection?.rounds || inspection.rounds.length === 0) {
      return [];
    }

    // Sort by round number and create tabs for all rounds
    const sortedRounds = [...inspection.rounds].sort((a, b) => a.number - b.number);
    return sortedRounds.map(round => ({
      key: `inspection-${round.number}` as ArtifactType,
      label: `Inspection-${round.number}`,
    }));
  }, [specDetail?.specJson?.inspection]);

  // Combine dynamic tabs
  const dynamicTabs = useMemo(
    () => [...documentReviewTabs, ...inspectionTabs],
    [documentReviewTabs, inspectionTabs]
  );

  // Convert artifacts to ArtifactInfo format
  const artifacts = useMemo((): Record<string, ArtifactInfo | null> | undefined => {
    if (!specDetail?.artifacts) return undefined;
    return specDetail.artifacts as Record<string, ArtifactInfo | null>;
  }, [specDetail?.artifacts]);

  if (!selectedSpec) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        仕様を選択するか、新規作成してください
      </div>
    );
  }

  // Bug fix: spec-item-flash-wrong-content
  // Show loading state while specDetail is being loaded
  // This prevents showing old spec's artifacts during the transition
  if (isDetailLoading || !specDetail) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        仕様を読み込み中...
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center - CenterPaneContainer (ArtifactEditor / GitView switch) */}
      {/* git-diff-viewer Task 9.1: Replace direct ArtifactEditor with CenterPaneContainer */}
      <CenterPaneContainer
        dynamicTabs={dynamicTabs}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        baseName={selectedSpec.name}
        placeholder="仕様を選択してエディターを開始"
        artifacts={artifacts}
      />

      {/* Right resize handle */}
      <ResizeHandle direction="horizontal" onResize={onRightResize} onResizeEnd={onResizeEnd} />

      {/* Right sidebar - SDD Hybrid Workflow View */}
      <aside
        style={{ width: rightPaneWidth }}
        className="shrink-0 flex flex-col overflow-hidden"
      >
        {/* Agent list panel */}
        <div style={{ height: agentListHeight }} className="shrink-0 overflow-hidden">
          <AgentListPanel specId={selectedSpec?.name || ''} />
        </div>
        {/* Agent一覧とワークフロー間のリサイズハンドル */}
        <ResizeHandle direction="vertical" onResize={onAgentListResize} onResizeEnd={onResizeEnd} />
        {/* SDD Hybrid Workflow: 6フェーズワークフロービュー */}
        <div className="flex-1 overflow-hidden">
          <WorkflowView />
        </div>
      </aside>
    </div>
  );
}

export default SpecPane;
