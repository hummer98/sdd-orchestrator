/**
 * SpecPane Component
 * Main + Right pane container for Spec workflow
 * Bug fix: bugs-tab-agent-list-missing
 * Bug fix: bugs-tab-spec-editing-feature (shared ArtifactEditor)
 */

import { useMemo } from 'react';
import { useSpecStore } from '../stores';
import {
  ArtifactEditor,
  AgentListPanel,
  WorkflowView,
  ResizeHandle,
} from './index';
import type { TabInfo, ArtifactInfo } from './ArtifactEditor';
import type { ArtifactType } from '../stores/editorStore';
import { getLatestInspectionReportFile } from '../types/inspection';

/** Spec artifact tabs */
const SPEC_TABS: TabInfo[] = [
  { key: 'requirements', label: 'requirements.md' },
  { key: 'design', label: 'design.md' },
  { key: 'tasks', label: 'tasks.md' },
  { key: 'research', label: 'research.md' },
];

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
  const { selectedSpec, specDetail } = useSpecStore();

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

  // Build inspection tabs from spec.json inspection field (MultiRoundInspectionState)
  const inspectionTabs = useMemo((): TabInfo[] => {
    const inspection = specDetail?.specJson?.inspection;
    const reportFile = getLatestInspectionReportFile(inspection);
    if (!reportFile) {
      return [];
    }

    const match = reportFile.match(/inspection-(\d+)\.md/);
    if (!match) {
      return [];
    }

    const n = parseInt(match[1], 10);
    return [{
      key: `inspection-${n}` as ArtifactType,
      label: `Inspection-${n}`,
    }];
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

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath={selectedSpec.path}
          placeholder="仕様を選択してエディターを開始"
          dynamicTabs={dynamicTabs}
          artifacts={artifacts}
        />
      </div>

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
