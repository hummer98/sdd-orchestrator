/**
 * BugPane Component
 * Main + Right pane container for Bug workflow
 * Bug fix: bugs-tab-agent-list-missing
 * Bug fix: bugs-tab-spec-editing-feature (shared ArtifactEditor)
 */

import { useMemo } from 'react';
// bugs-view-unification Task 6.1: Use shared bugStore
import { useSharedBugStore } from '../../shared/stores/bugStore';
import {
  ArtifactEditor,
  AgentListPanel,
  BugWorkflowView,
  ResizeHandle,
} from './index';
import type { TabInfo, ArtifactInfo } from './ArtifactEditor';

/** Bug artifact tabs */
const BUG_TABS: TabInfo[] = [
  { key: 'report', label: 'report.md' },
  { key: 'analysis', label: 'analysis.md' },
  { key: 'fix', label: 'fix.md' },
  { key: 'verification', label: 'verification.md' },
];

interface BugPaneProps {
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
 * BugPane - Container for Bug workflow (Main + Right pane)
 * Renders ArtifactEditor + BugAgentListPanel + BugWorkflowView when a bug is selected,
 * or a placeholder when no bug is selected.
 */
export function BugPane({
  rightPaneWidth,
  agentListHeight,
  onRightResize,
  onAgentListResize,
  onResizeEnd,
}: BugPaneProps): React.ReactElement {
  // bugs-view-unification Task 6.1: Use shared bugStore
  // Compute selectedBug from bugs + selectedBugId
  const { bugs, selectedBugId, bugDetail } = useSharedBugStore();
  const selectedBug = selectedBugId ? bugs.find(b => b.name === selectedBugId) : null;

  // Convert artifacts to ArtifactInfo format
  const artifacts = useMemo((): Record<string, ArtifactInfo | null> | undefined => {
    if (!bugDetail?.artifacts) return undefined;
    return bugDetail.artifacts as Record<string, ArtifactInfo | null>;
  }, [bugDetail?.artifacts]);

  if (!selectedBug) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        バグを選択するか、新規作成してください
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center - Bug Document Editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* spec-path-ssot-refactor: Changed basePath to baseName */}
        {/* bug-artifact-content-not-displayed: Add entityType="bug" for correct path resolution */}
        <ArtifactEditor
          tabs={BUG_TABS}
          baseName={selectedBug.name}
          placeholder="バグを選択してエディターを開始"
          artifacts={artifacts}
          testId="bug-artifact-editor"
          entityType="bug"
        />
      </div>

      {/* Right resize handle */}
      <ResizeHandle direction="horizontal" onResize={onRightResize} onResizeEnd={onResizeEnd} />

      {/* Right sidebar - Bug Workflow View */}
      <aside
        style={{ width: rightPaneWidth }}
        className="shrink-0 flex flex-col overflow-hidden"
      >
        {/* Agent list panel for bugs */}
        <div style={{ height: agentListHeight }} className="shrink-0 overflow-hidden">
          <AgentListPanel
            specId={selectedBug ? `bug:${selectedBug.name}` : ''}
            testId="bug-agent-list-panel"
          />
        </div>
        {/* Agent一覧とワークフロー間のリサイズハンドル */}
        <ResizeHandle direction="vertical" onResize={onAgentListResize} onResizeEnd={onResizeEnd} />
        {/* Bug Workflow: 5フェーズワークフロービュー */}
        <div className="flex-1 overflow-hidden">
          <BugWorkflowView />
        </div>
      </aside>
    </div>
  );
}

export default BugPane;
